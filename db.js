'use strict';

var fs = require('fs');

var db = {};
var configFile = './config.json'

var loadConfig = function() {
  db.config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

loadConfig();
console.info('Config is loaded');

fs.watchFile(configFile, function (curr, prev) {
  loadConfig();
  console.info('Config is reloaded!');
});

module.exports = db;
