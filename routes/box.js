'use strict';
var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();
var db = require('../db');

var getSetKey = function(set) {
  return 'box/' + set;
};

var loadData = function(set) {
  let setKey = getSetKey(set);
  if (db.config[setKey] && !db[setKey]) {
    db[setKey] = {};
    let listfile = db.config[setKey]['listfile'];
    let imgdir = db.config[setKey]['imgdir'];
    let boxdir = db.config[setKey]['boxdir'];

    let list = [];
    fs.readFileSync(listfile, 'utf8').split("\n").forEach(function(line) {
      if (line.trim().length > 0) {
        list.push(line);
      }
    });
    db[setKey]['list'] = list;
    db[setKey]['box'] = {};
  }
};

var getImage = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[setKey]['list'].length) {
      res.sendStatus(404);
      return;
    }

    var options = {
      root: db.config[setKey]['imgdir'],
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };

    res.sendFile(db[setKey].list[id], options, function (err) {
      if (err) {
        console.log(err);
        res.status(err.status).end();
      } else {
        console.log('Sent: ', db[setKey].list[id]);
      }
    });
  }
};

var getBox = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  let config = db.config[setKey];
  if (!config || Number.isNaN(id) || id < 0) {
    res.sendStatus(404);
  } else {
    loadData(set);
    let data = db[setKey];
    if (id >= data['list'].length) {
      res.sendStatus(404);
      return;
    }
    let name = data['list'][id];
    if (!data['box'][name]) {
      data['box'][name] = [];
      let boxfile = path.join(config['boxdir'], name + '.box');
      if (fs.existsSync(boxfile)) {
        console.log('Loading ' + boxfile);
        let boxes = [];
        fs.readFileSync(boxfile, 'utf8').split("\n").forEach(function(line) {
          if (line.trim().length > 0) {
            boxes.push(line.split(/\s/).map(e => Number.parseInt(e)));
          }
        });
        data['box'][name] = boxes;
      }
    }

    res.send({
      boxes: data['box'][name]
    });
  }
};

var saveBox = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  let config = db.config[setKey];
  if (!config || Number.isNaN(id) || id < 0) {
    res.sendStatus(404);
  } else {
    loadData(set);
    let data = db[setKey];
    if (id >= data['list'].length) {
      res.sendStatus(404);
      return;
    }
    let name = data['list'][id];
    let boxes = req.body.boxes;
    if (Array.isArray(boxes)) {
      data['box'][name] = boxes;
      let boxfile = path.join(config['boxdir'], name + '.box');
      for (let i = 0; i < boxes.length; i++) {
        if (!Array.isArray(boxes[i]) || boxes[i].length != 4) {
          res.sendStatus(403);
          return;
        }
      }
      let content = boxes.map(arr => arr.join("\t")).join("\n");
      fs.writeFileSync(boxfile, content, 'utf8');
      res.sendStatus(200);
    } else {
      res.sendStatus(403);
    }
  }
};

router.get('/:set/image/:id', getImage);
router.get('/:set/api/boxes/:id', getBox);
router.post('/:set/api/boxes/:id', saveBox);

module.exports = router;
