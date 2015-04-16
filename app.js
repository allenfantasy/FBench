var express = require('express');
var app = express();
var mongoose = require('mongoose');
var path = require('path');
var bodyParser = require('body-parser');
var jade = require('jade');
var ua = require('ua_parser');
var _ = require('lodash');
var debug = require('debug')('http');

mongoose.connect('mongodb://localhost/benchmark');

var Record = require('./models/record');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());

// jade templating
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/records', function(req, res) {
  Record.find().exec(function(err, records) {
    if (err) {
      console.log(err);
      throw new Error("database query error");
      return;
    }

    records = _.sortBy(records, 'mean').reverse();

    res.render('records', { records: records });
  });  
});

app.post('/records', function(req, res) {
  var body = req.body;
  console.log(body);
  if (body.samples === '') {
    // Something is wrong, fix record's statistical data
    body.mean = 0;
    body.sem = 0;
    body.variance = 0;
    body.moe = 0;
    body.rme = 0;
  }
  
  var result = ua.userAgent(req.headers['user-agent']);
  body.browserName = result.browser.name;
  body.browserVer = result.browser.version.major + '.' + result.browser.version.minor;
  body.isMobile = (result.platform === 'mobile');
  body.os = result.os.name;

  var record = new Record(body);
  record.save(function(err, r) {
    if (err) throw err;
    res.json({ message: "OK" });
  });
});

app.delete('/records', function(req, res) {
  Record.remove(function(err) {
    if (err) throw err;
    console.log('All records removed!!!');
    res.json({ message: "All records removed!!!"});
  });
});

// Remove single item
app.delete('/records/:id', function(req, res) {
  var id = req.params.id;
  Record.remove({ _id: id }, function(err) {
    if (err) throw err;
    console.log('Removed ' + id + '!');
    res.json({ message: 'Removed ' + id + '!' });
  });
});

app.listen(3000);
console.log('app is running on 3000');
