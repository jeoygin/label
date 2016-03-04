'use strict';
var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();
var db = require('../db');

var pathPrefix = '/box';

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

    if (!fs.existsSync(listfile)) {
      console.log('[loadData] No such file ' + listfile)
      return;
    }

    if (!fs.existsSync(boxdir)) {
      console.info('[loadData] Create directory ' + boxdir);
      fs.mkdirSync(boxdir);
    }

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
  if (db.config[setKey] === undefined || Number.isNaN(id) || id < 0) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (!db[setKey]) {
      res.sendStatus(500, 'No data');
      return;
    }
    if (id >= db[setKey]['list'].length) {
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
    if (!data) {
      res.sendStatus(500, 'No data');
      return;
    }
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
    if (!data) {
      res.sendStatus(500, 'No data');
      return;
    }
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

var showList = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (!db[setKey]) {
      res.sendStatus(500, 'No data');
      return;
    }
    let list = db[setKey]['list'].map((e, i) => {
      return {name: e, url: `${pathPrefix}/${set}/${i+1}`}
    });
    res.render('box', { title: set, list: list });
  }
};

var showBox = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[setKey] === undefined || Number.isNaN(id) || id < 0) {
    res.sendStatus(404);
  } else {
    loadData(set);
    let data = db[setKey];
    if (!data) {
      res.sendStatus(500, 'No data');
      return;
    } else if (id >= data['list'].length) {
      res.sendStatus(404);
      return;
    }
    let name = data['list'][id];
    res.render('showbox', {
      title: name,
      id: id + 1,
      img: `${pathPrefix}/${set}/image/${id+1}`,
      boxapi: `${pathPrefix}/${set}/api/boxes/${id+1}`
    });
  }
};

router.get('/:set', showList);
router.get('/:set/:id', showBox);
router.get('/:set/image/:id', getImage);
router.get('/:set/api/boxes/:id', getBox);
router.post('/:set/api/boxes/:id', saveBox);

module.exports = router;
