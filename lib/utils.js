var _ = require('lodash');

module.exports = {
  groupByBrowser: function(inputRecords) {
    var records;
    var aniMethods = [];

    records = inputRecords.map(function(r) {
      if (aniMethods.indexOf(r.name) === -1) aniMethods.push(r.name); 

      return _.assign(
        { browser: r.browserName + ' ' + r.browserVer },
        _.pick(r, ['name', 'mean', 'sem', 'variance', 'moe', 'rme', 'dotSize', 'os'])
      );
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

    records = _.sortBy(records, 'name');

    return {
      records: records,
      categories: aniMethods
    };
  }
}
