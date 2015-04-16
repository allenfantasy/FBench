var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/benchmark');

var Record = require('./models/record');

Record.remove(function(err) {
  if (err) throw err;
  console.log('All records removed!!!');
  process.exit(0);
});
