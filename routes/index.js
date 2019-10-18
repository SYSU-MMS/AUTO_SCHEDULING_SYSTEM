var express = require('express');
var router = express.Router();
var fetch = require('node-fetch')
var fs = require('fs')
var auto_schedule = require('../methods/AutoSchedule')

var basic_url = 'http://localhost:12345/index.php/DutySignUp';

function download(u, p) {
	return fetch(u, {
		method: 'GET',
		headers: { 'Content-Type': 'application/octet-stream' }
	}).then(res => res.buffer()).then(_ => {
		fs.writeFile(p, _, 'binary', function(err) {
			console.log(err || p);
		});
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
  console.log(result);
  return result;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var signup_url = basic_url + "/exportToTxt";
  var time_url = basic_url + "/exportTimePeriodToTxt"
  // download(signup_url, 'signup.txt');
  download(time_url, "timeperiod.txt");
  var time_period = get_time_peroid("timeperiod.txt");
  console.log(time_period)
  console.log(time_period);
  if (time_period == false) {
    res.render('error', {
      msg: '请从MOA登录'
    });
  }
  else {
    arrange_result = auto_schedule('./signup.txt');
    result = translate_auto_schedule_result(arrange_result, time_period);
    console.log(result['weekend'])
    res.render('index', {
      weekday: result['weekday'],
      weekend: result['weekend']
    });
  }
});

module.exports = router;
