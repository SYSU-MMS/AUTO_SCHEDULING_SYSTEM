const TimePeriod = [
	'MON1', 'MON2', 'MON3', 'MON4', 'MON5', 'MON6',
    'TUE1', 'TUE2', 'TUE3', 'TUE4', 'TUE5', 'TUE6',
    'WED1', 'WED2', 'WED3', 'WED4', 'WED5', 'WED6',
    'THU1', 'THU2', 'THU3', 'THU4', 'THU5', 'THU6',
    'FRI1', 'FRI2', 'FRI3', 'FRI4', 'FRI5', 'FRI6',
	'SAT1', 'SAT2', 'SAT3', 'SAT4', 'SAT5', 'SAT6',
	'SUN1', 'SUN2', 'SUN3', 'SUN4', 'SUN5', 'SUN6'
]; 

const AGroupCannotTime = [0, 5, 12, 17, 24, 29];
const BGroupCannotTime = [6, 11, 18, 23];
const cannotConnectTime = [2, 3, 8, 9, 14, 15, 20, 21, 26, 27];

const weekdayEachTimeUpperbound = [2.5, 2.5, 2.0, 2.0, 2.0, 4.0];
const weekdayEachTimePeopleNum = [3, 2, 2, 2, 2, 3];
const weekendEachTimeUpperbound = [2.5, 2.5, 2.0, 1.5, 2.0, 4.0];
const weekendEachTimePeopleNum = [2, 2, 2, 2, 2, 3];

const remainedTimeList = {
	"A": 2.5,
	"B": 4.5,
	"C": 10.0
};

var personList;

function Person(name, groupType, remainedTime, validTimePeriod) {
	this.name = name;
	this.groupType = groupType;
	this.remainedTime = remainedTime;
	this.validTimePeriod = validTimePeriod;
	this.Aweight = 0;
	this.Bweight = 0;
	this.workTime = [];

	this.costTime = function(cost) {
		if(this.remainedTime - cost < 0) return false;
		this.remainedTime = this.remainedTime - cost;
		return true;
	}
}

function Cell(cid, numOfPerson, time) {
	this.cid = cid;
	this.numOfPerson = numOfPerson;
	this.time = time;
	this.candidate = [];
	this.currentList = [];

	this.isFull = function() {
		return this.currentList.length == numOfPerson;
	}
}

function Table() {
	this.table = [];
	if (this.table.length === 0 && personList !== null) {
		this.table = [];
		for(let i = 0; i < 7; i++) {
			let day = [];
			let eachTimePeopleNum = [], eachTimeUpperbound = [];
			if(i < 5) {
				eachTimePeopleNum = weekdayEachTimePeopleNum;
				eachTimeUpperbound = weekdayEachTimeUpperbound;
			} else {
				eachTimePeopleNum = weekendEachTimePeopleNum;
				eachTimeUpperbound = weekendEachTimeUpperbound;
			}
			for (let j = 0; j < 6; j++) {
				let cell = new Cell(i * 6 + j, eachTimePeopleNum[j], eachTimeUpperbound[j]);
				for (let k = 0; k < personList.length; k++) {
					for (let m = 0; m < personList[k].validTimePeriod.length; m++) {
						if (personList[k].validTimePeriod[m] == cell.cid) {
							cell.candidate.push(personList[k]);
						}
					}
				}
				day.push(cell);
			}
			this.table.push(day);
		}
	}
	return this.table;
}

function readFile(fileName) {
	let fs = require('fs');
	let data = fs.readFileSync(fileName, 'utf8');
	data = data.split('\n');
	for (let index = 0; index < data.length; index++) {
		if(data[index] != '') {
			let infoStr = data[index].split(',');
			let validTimePeriod = [];
			for (let i = 2; i < infoStr.length; i++) {
				if(infoStr[i] == "1") {
					validTimePeriod.push(i - 2);
				}
			}
			let person = new Person(infoStr[0], infoStr[1], remainedTimeList[infoStr[1]], validTimePeriod);
			personList.push(person);
		}
	}
	personList = personList.sort(function (a, b) {
		return a.validTimePeriod.length > b.validTimePeriod.length;
	});
}

function NPersionPartition() {
	let Nlist = [];
	let AList = [];
	let BList = [];
	let CList = [];
	let curA = 0, curB = 0;
	personList.forEach(p => {
		switch (p.groupType) {
			case 'N':
				Nlist.push(p);
				p.validTimePeriod.forEach(ele => {
					if(AGroupCannotTime.includes(ele)) {
						p.Aweight++;
					} else if(BGroupCannotTime.includes(ele)) {
						p.Bweight++;
					}
				});
				break;
			case 'A':
				AList.push(p);
				curA++;
				break;
			case 'B':
				BList.push(p);
				curB++;
				break;
			case 'C':
				CList.push(p);
				break;
			default:
				break;
		}
	});
	Nlist = Nlist.sort(function (a, b) {
		if (a.validTimePeriod.length < b.validTimePeriod.length) return false;
		else if (a.validTimePeriod.length == b.validTimePeriod.length) {
			if (a.Aweight == 0 && b.Aweight == 0 && (a.Bweight > b.Bweight)) return false;
			else if (a.Bweight == 0 && b.Bweight == 0 && (a.Aweight > b.Aweight)) return false;
			else return true;
		} else return true;
	});
	Nlist.forEach(p => {
		if (p.Aweight <= p.Bweight) {
			if (curA < 18) {
				curA++;
				p.groupType = 'A';
				p.remainedTime = remainedTimeList['A'];
			} else {
				p.groupType = 'B';
				p.remainedTime = remainedTimeList['B'];
			}
		} else {
			if(curB < 18) {
				curB++;
				p.groupType = 'B';
				p.remainedTime = remainedTimeList['B'];
			} else {
				p.groupType = 'A';
				p.remainedTime = remainedTimeList['A'];
			}
		}
	});
	// 建立新的名单
	personList.splice(0, personList.length);

	personList.push(...AList);
	personList.push(...BList);
	personList.push(...Nlist);
	personList.push(...CList);
}

function isValuable(proc) {
	let invalidList = [];
	proc.forEach(day => {
		day.forEach(element => {
			if (element.cid < 30) {
				if (element.currentList.length != weekdayEachTimePeopleNum[element.cid % 6]) invalidList.push(TimePeriod[element.cid]);
			} else {
				if (element.currentList.length != weekendEachTimePeopleNum[(element.cid - 30) % 6]) invalidList.push(TimePeriod[element.cid]);
			}
		});
	});
	return invalidList;
}

function groupScheduling(list, proc, groupType) {
	let cannotTime = [];
	if(groupType == 'A') cannotTime = AGroupCannotTime;
	if(groupType == 'B') cannotTime = BGroupCannotTime;
	for(let i = 0; i < list.length; i++) {
		// let validTime = [];
		// let tempCellList = [];
		// for (let j = 0; j < list[i].validTimePeriod.length; j++) {
		// 	let time = list[i].validTimePeriod[j];
		// 	let x = parseInt(time / 6), y = parseInt(time % 6);
		// 	tempCellList.push(proc[x][y]);
		// }
		// tempCellList = tempCellList.sort(function (a, b) {
		// 	return a.candidate.length > b.candidate.length;
		// });

		// tempCellList.forEach(ele => {
		// 	validTime.push(ele.cid);
		// });

		let validTime = list[i].validTimePeriod;
		for (let j = 0; j < validTime.length; j++) {
			let time = validTime[j];
			if(cannotTime.includes(time)) continue;

			let valid = true;
			for(let k = 0; k < cannotConnectTime.length; k = k + 2) {
				if(time == cannotConnectTime[k] && list[i].workTime.includes(cannotConnectTime[k+1])) {
					valid = false;
				}
			}
			for (let k = 1; k < cannotConnectTime.length; k = k + 2) {
				if (time == cannotConnectTime[k] && list[i].workTime.includes(cannotConnectTime[k - 1])) {
					valid = false;
				}
			}
			if(!valid || list[i].workTime.includes(time)) continue;
			let x = parseInt(time/6), y = parseInt(time%6);
			if(!proc[x][y].isFull() && list[i].costTime(proc[x][y].time)) {
				proc[x][y].currentList.push(list[i]);
				list[i].workTime.push(time);
			}
		}
	}
}

function scheduling(list, proc) {
	let AList = [];
	let BList = [];
	let CList = [];
	for (let i = 0; i < list.length; i++) {
		switch (list[i].groupType) {
			case "A":
				AList.push(list[i]);
				break;
			case "B":
				BList.push(list[i]);
				break;
			case "C":
				CList.push(list[i]);
				break;
			default:
				break;
		}
	}

	groupScheduling(BList, proc, 'B');
	groupScheduling(AList, proc, 'A');
	groupScheduling(CList, proc, 'C');
	list.splice(0, list.length);
	list.push(...AList);
	list.push(...BList);
	list.push(...CList);
}

function tableToJson(table) {
	let result = [];
	// const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	for(let i = 0; i < table.length; i++) {
		let timeList = [];
		for(let j = 0; j < table[i].length; j++) {
			let curCell = table[i][j];
			let peopleStr =[];
			for(let k = 0; k < curCell.currentList.length; k++) {
				peopleStr.push(curCell.currentList[k].name + '(' + curCell.currentList[k].groupType + ')');
			}
			timeList.push(peopleStr.join(','));
		}
		result.push(timeList);
	}
	return result;
}

function peopleToJson() {
	let result = [];
	for(let i = 0; i < personList.length; i++) {
		let workTimeList = [];
		for(let j = 0; j < personList[i].workTime.length; j++) {
			workTimeList.push(TimePeriod[personList[i].workTime[j]]);
		}
		result.push({
			'name' : personList[i].name + '(' + personList[i].groupType + ')',
			'timePeriod' : workTimeList.join(','),
			'totalWorkTime' : remainedTimeList[personList[i].groupType] - personList[i].remainedTime
		});
	}
	return result;
}

function main(fileName) {
	personList = [];
	readFile(fileName);
	NPersionPartition();
	let table = Table();
	if (table == null) {
		console.log('generating table failed!');
		return;
	}
	scheduling(personList, table);
	let invalidTimeList = isValuable(table);

	let result = {
		'table' : tableToJson(table),
		'peopleList' : peopleToJson(),
		'invalidTimeList' : invalidTimeList.join(',')
	};
	console.log(result);

	return result;
}

// main('./signup.txt');
module.exports = main;