/** FPS Record **/
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var RecordSchema = new Schema({
  dotSize: Number,
  name: String, // name of implementation
  mean: Number,
  sem: Number,
  df: Number,
  variance: Number,
  moe: Number,
  rme: Number,
  samples: String, // 用空格将每个数据隔开, 导出的时候需要重新分割成数据
  browserName: String,
  browserVer: String,
  isMobile: Boolean,
  os: String,
});

module.exports = mongoose.model('Record', RecordSchema);
