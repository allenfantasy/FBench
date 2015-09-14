var express = require('express');
var app = express();
var mongoose = require('mongoose');
var path = require('path');
var bodyParser = require('body-parser');
var jade = require('jade');
var ua = require('ua_parser');
var _ = require('lodash');
var debug = require('debug')('http');

var MONGODB_URI = process.env.MONGOLAB_URI || 'mongodb://localhost/benchmark';
mongoose.connect(MONGODB_URI);

var Record = require('./models/record');
var Utils = require('./lib/utils');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());

// jade templating
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.set('dotSizes', [25,50,100,200,300,400,500,750,1000,1250,1500,2000,2500,3000]);
app.set('durations', [0.5, 0.75, 1, 5]);
app.set('aniMethods', ["zepto", "zeptotransform", "jquery", "tweenjs", "famous", "gsap", "gsaptransform", "gsaptransform3d", "webanimations", "webanimations3d", "velocity", "velocity3d"]);
app.set('systems', ['mac', 'windows', 'ios', 'android']);

var DEFAULT_DOTSIZE = 1000;
var DEFAULT_METHOD = "zepto";
var DEFAULT_OS = 'windows';

app.get('/', function(req, res) {
  res.render('index', {
    title: 'HTML5 Animation Speed Test',

    dotSize: DEFAULT_DOTSIZE,
    duration: 0.75,
    aniMethod: DEFAULT_METHOD,

    dotSizes: app.get('dotSizes'),
    durations: app.get('durations'),
    aniMethods: app.get('aniMethods'),
  });
});

app.get('/records', function(req, res) {
  Record.find().exec(function(err, records) {
    if (err) {
      console.log(err);
      throw new Error("database query error");
      return;
    }
    res.render('records', {
      records: records,

      dotSize: DEFAULT_DOTSIZE,
      system: DEFAULT_OS,
      //duration: 0.75,

      dotSizes: app.get('dotSizes'),
      aniMethods: app.get('aniMethods'),
      systems: app.get('systems'),
      //durations: app.get('durations'),
    });
  });
});

// API service
app.get('/api/records', function(req, res) {
  var cond = _.assign({
    aniMethods: []
  }, req.query);

  // TODO 返回某个(或任意个) animation method 在 dotSize 变化时的 FPS 表现

  var os = cond.os;
  if (os && app.get('systems').indexOf(os) > -1) {
    cond.os = os;
  } else if (os) { // invalid input
    return res.json({ code: 400, msg: 'bad input' });
  }

  cond.name = { $in: cond.aniMethods };
  delete cond.aniMethods;

  Record.find(cond).exec(function(err, records) {
    if (err) {
      console.log(err);
      throw new Error("database query error");
      return;
    }

    var aniMethods = [];
    var origRecords = _.sortByAll(records, ['browserName', 'name']);

    var results = Utils.groupByBrowser(records);

    res.json({ records: results.records, categories: results.categories, origRecords: origRecords });
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

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('app is running on 3000');
});
