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

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());

// jade templating
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.set('dotSizes', [25,50,100,200,300,400,500,750,1000,1250,1500,2000,2500,3000]);
app.set('durations', [0.5, 0.75, 1, 5]);
app.set('aniMethods', ["zepto", "zeptotransform", "jquery", "tweenjs", "famous", "gsap", "gsaptransform", "gsaptransform3d", "webanimations", "webanimations3d", "velocity", "velocity3d"]);

app.get('/', function(req, res) {
  res.render('index', {
    title: 'HTML5 Animation Speed Test',

    dotSize: 300,
    duration: 0.75,
    aniMethod: "jquery",

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

      dotSize: 300,
      //duration: 0.75,

      dotSizes: app.get('dotSizes'),
      //durations: app.get('durations'),
    });
  });
});

// API service
app.get('/api/records', function(req, res) {
  var VALID_SYSTEMS = ['mac', 'windows', 'ios', 'android'];
  var cond = _.assign({}, req.query);
  var os = cond.os;

  if (os && VALID_SYSTEMS.indexOf(os) > -1) {
    cond.os = os;
  } else if (os) { // invalid input
    return res.json({ code: 400, msg: 'bad input' });
  }

  //Record.find(cond).exec(function(err, records) {
  Record.find(cond).exec(function(err, records) {
    if (err) {
      console.log(err);
      throw new Error("database query error");
      return;
    }

    var aniMethods = [];
    var origRecords = records;

    //records = _.sortBy(records, 'mean').reverse();
    records = records.map(function(r) {
      if (aniMethods.indexOf(r.name) === -1) aniMethods.push(r.name); 
      return {
        name: r.name,
        mean: r.mean,
        sem: r.sem,
        variance: r.variance,
        moe: r.moe,
        rme: r.rme,
        dotSize: r.dotSize,
        browser: r.browserName + ' ' + r.browserVer,
        os: r.os
      };
    });
    records = _.groupBy(records, function(r) {
      return r.browser;
    });

    _.each(records, function(data, key) {
      var arr = [];
      _.each(aniMethods, function(m) {
        var d = _.find(data, { 'name' : m });
        if (d) {
          arr.push(d.mean);
        } else {
          arr.push(0);
        }
      });
      records[key] = arr;
    });
    records = _.map(records, function(r, name) {
      return {
        name: name,
        data: r 
      };
    });

    res.json({ records: records, aniMethods: aniMethods, origRecords: origRecords });
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
