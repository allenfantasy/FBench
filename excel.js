var xlsx = require('./lib/xlsx');
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/benchmark');

var Record = require('./models/record');

Record.find().exec(function(err, records) {
  //console.log(records);
  var rows = [];
  _.each(records, function(r) {
    var samples = r.samples.split(' ');
    var sampleRows = _.map(samples, function(s) {
      return [r.name, Number(s)];
    });
    rows = rows.concat(sampleRows);
  });
  rows.unshift(['方法', 'FPS']);

  var sheet = {
    name: 'Sheet1',
    data: rows
  }
  xlsx.writeFile(sheet, 'test.xlsx');
  process.exit(0);
});

//var output = xlsx.readFile('records.xlsx');
//var sheet = output[0];
//xlsx.writeFile(sheet, 'test.xlsx');
