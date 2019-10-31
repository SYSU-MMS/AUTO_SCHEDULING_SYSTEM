var express = require('express');
var router = express.Router();
var fetch = require('node-fetch')
var fs = require('fs')
var auto_schedule = require('../methods/AutoSchedule')
var node_excel = require('excel-export')

var debug_controller = require('../methods/DebugController')

var basic_url = null;
if (debug_controller.test_mode == false)
  basic_url = 'http://moa.sysu.alau.top/index.php/DutySignUp';
else
  basic_url = "http://localhost:12345/index.php/DutySignUp";

var excel_data = null;

var download =  function(u, p) {
	return fetch(u, {
		method: 'GET',
		headers: { 'Content-Type': 'application/octet-stream' }
	}).then(res => res.buffer()).then(_ => {
		fs.writeFileSync(p, _, 'binary');
	});
}

function get_time_peroid(file) {
  var data = fs.readFileSync(file).toString().split("\r\n");
  var weekday_time = [];
  var weekend_time = [];
  var weekday = true;
  for(var i = 0; i < data.length; i++) {
    if (data[i] == '---') {
      weekday = false;
    }
    else if (data[i] == '') {
      continue;
    }
    else if (weekday) {
      weekday_time.push(data[i]);
    }
    else {
      weekend_time.push(data[i]);
    }
  }
  return {
    'weekday': weekday_time,
    'weekend': weekend_time
  }; 
}

function translate_auto_schedule_result(arrange_result, time_period) {
  var result = {}
  for (var key in time_period) {
    result[key] = []
    for (var i = 0; i < time_period[key].length - 1; i++) {
      var row = []
      row.push(time_period[key][i] + " ~ " + time_period[key][i+1])
      if (key == 'weekday') {
        for (var j = 0; j < 5; j++) {
          row.push(arrange_result['table'][j][i].split(',').join('\n'));
        }
      }
      else if (key == 'weekend') {
        for (var j = 5; j < 7; j++) {
          row.push(arrange_result['table'][j][i].split(',').join('\n'));
        }
      }
      result[key].push(row);
    }
  }
  // 添加每个人的工时，用在excel表中
  var work_time = []
  for (var i = 0; i < arrange_result['peopleList'].length; i++) {
    var arr = []
    arr.push(arrange_result['peopleList'][i].name);
    arr.push(arrange_result['peopleList'][i].totalWorkTime.toString());
    work_time.push(arr)
  }
  result['worktime'] = work_time;
  if (debug_controller.show_console) console.log(result);
  return result;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var signup_url = basic_url + "/exportToTxt";
  var time_url = basic_url + "/exportTimePeriodToTxt"
  var time_period = null;
  var result = null;
  download(signup_url, 'signup.txt').then(_ => {
    var data = fs.readFileSync('./signup.txt', 'utf-8')
    if (debug_controller.show_console) console.log(data)
  }).then(_ => {
    return download(time_url, "timeperiod.txt")
  }).then(_ => {
    time_period = get_time_peroid('timeperiod.txt')
    if (debug_controller.show_console) console.log(time_period)
  }).then(_ => {
    if (time_period == null || time_period['weekend'].length == 0) {
      throw new Error('发生错误，请从MOA登录后访问')
    }
    var arrange_result = auto_schedule('./signup.txt');
    result = translate_auto_schedule_result(arrange_result, time_period);
    excel_data = result;
    if (debug_controller.show_console) console.log(result)
  }).then(_ => {
    if (result == null) {
      throw new Error('发生错误，请从MOA登录后访问')
    }
    res.render('index', {
      weekday: result['weekday'],
      weekend: result['weekend']
    });
  }).catch(err => {
    res.render('error', {
      msg: err
    })
  })
});

/* Download the result in the Excel form */
router.get('/excel', function(req, res, next) {
  if (excel_data == null) {
    res.render('error', {
      msg: '请先返回主页生成排班结果'
    })
  }
  else {
    var confs = []
    // 工作日的sheet
    var workday_conf = {}
    workday_conf.name = "workday"
    workday_conf.cols = [{
      caption: '时段',
      type: 'string',
      width: 12
    }, {
      caption: '周一',
      type: 'string',
      width: 10
    }, {
      caption: '周二',
      type: 'string',
      width: 10
    }, {
      caption: '周三',
      type: 'string',
      width: 10
    }, {
      caption: '周四',
      type: 'string',
      width: 10
    }, {
      caption: '周五',
      type: 'string',
      width: 10
    }]
    workday_conf.rows = []
    for (var i = 0; i < excel_data['weekday'].length; i++) {
      if (i == 0 || i == excel_data['weekday'].length - 1) {
        // 早班和晚班有3个人值班，要3行
        var row_1 = []
        var row_2 = []
        var row_3 = []
        row_1.push(excel_data['weekday'][i][0])
        row_2.push('  ')
        row_3.push('  ')
        for (var j = 1; j < excel_data['weekday'][i].length; j++) {
          var arr = excel_data['weekday'][i][j].split('\n')
          if (0 < arr.length) row_1.push(arr[0])
          else row_1.push('  ')
          if (1 < arr.length) row_2.push(arr[1])
          else row_2.push('  ')
          if (2 < arr.length) row_3.push(arr[2])
          else row_3.push('  ')
        }
        workday_conf.rows.push(row_1)
        workday_conf.rows.push(row_2)
        workday_conf.rows.push(row_3)
      }
      else {
        // 其余时候2个人值班，要2行
        var row_1 = []
        var row_2 = []
        row_1.push(excel_data['weekday'][i][0])
        row_2.push('  ')
        for (var j = 1; j < excel_data['weekday'][i].length; j++) {
          var arr = excel_data['weekday'][i][j].split('\n')
          if (0 < arr.length) row_1.push(arr[0])
          else row_1.push('  ')
          if (1 < arr.length) row_2.push(arr[1])
          else row_2.push('  ')
        }
        workday_conf.rows.push(row_1)
        workday_conf.rows.push(row_2)
      }
    }
    // 周末的sheet
    var weekend_conf = {}
    weekend_conf.name = "weekend"
    weekend_conf.cols = [{
      caption: '时段',
      type: 'string',
      width: 12
    }, {
      caption: '周六',
      type: 'string',
      width: 10
    }, {
      caption: '周日',
      type: 'string',
      width: 10
    }]
    weekend_conf.rows = []
    for (var i = 0; i < excel_data['weekend'].length; i++) {
      if (i == excel_data['weekend'].length - 1) {
        // 晚班有3个人值班，要3行
        var row_1 = []
        var row_2 = []
        var row_3 = []
        row_1.push(excel_data['weekend'][i][0])
        row_2.push('  ')
        row_3.push('  ')
        for (var j = 1; j < excel_data['weekend'][i].length; j++) {
          var arr = excel_data['weekend'][i][j].split('\n')
          if (0 < arr.length) row_1.push(arr[0])
          else row_1.push('  ')
          if (1 < arr.length) row_2.push(arr[1])
          else row_2.push('  ')
          if (2 < arr.length) row_3.push(arr[2])
          else row_3.push('  ')
        }
        weekend_conf.rows.push(row_1)
        weekend_conf.rows.push(row_2)
        weekend_conf.rows.push(row_3)
      }
      else {
        // 其余时候2个人值班，要2行
        var row_1 = []
        var row_2 = []
        row_1.push(excel_data['weekend'][i][0])
        row_2.push('  ')
        for (var j = 1; j < excel_data['weekend'][i].length; j++) {
          var arr = excel_data['weekend'][i][j].split('\n')
          if (0 < arr.length) row_1.push(arr[0])
          else row_1.push('  ')
          if (1 < arr.length) row_2.push(arr[1])
          else row_2.push('  ')
        }
        weekend_conf.rows.push(row_1)
        weekend_conf.rows.push(row_2)
      }
    }
    if (debug_controller.show_console) console.log(weekend_conf)
    // 工时的sheet
    var worktime_conf = {}
    worktime_conf.name = "worktime";
    worktime_conf.cols = [{
      caption: '名字',
      type: 'string',
      width: 12
    }, {
      caption: '总工作时长',
      type: 'string',
      width: 12
    }]
    worktime_conf.rows = []
    for (var i = 0; i < excel_data['worktime'].length; i++) {
      worktime_conf.rows.push(excel_data['worktime'][i])
    }
    if (debug_controller.show_console) console.log(worktime_conf)
    confs.push(workday_conf)
    confs.push(weekend_conf)
    confs.push(worktime_conf)
    var result = node_excel.execute(confs)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
    var filename = encodeURI('MOA排班结果')
    res.setHeader("Content-Disposition", "attachment; filename=" + filename + ".xlsx");
    res.end(result, 'binary');
  }
})

module.exports = router;
