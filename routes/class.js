'use strict';
var express = require('express');
var fs = require('fs');
var router = express.Router();
var db = require('../db');

var getSetKey = function(set) {
  return 'class/' + set;
};

var loadData = function(set) {
  let setKey = getSetKey(set);
  if (db.config[setKey] && !db[setKey]) {
    db[setKey] = {};
    let root = db.config[setKey]['root'];
    let listfile = db.config[setKey]['listfile'];
    let labelfile = db.config[setKey]['labelfile'];

    let list = [];
    fs.readFileSync(listfile, 'utf8').split("\n").forEach(function(line) {
      if (line.trim().length > 0) {
        list.push(line);
      }
    });
    db[setKey]['list'] = list;

    db[setKey]['label'] = {};
    fs.readFileSync(labelfile, 'utf8').split("\n").forEach(function(line) {
      let parts = line.split(" ");
      db[setKey]['label'][parts[0]] = parts[1];
    });
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
    }

    var options = {
      root: db.config[setKey]['root'],
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

var getLabel = function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    res.send({
      label: db.config[setKey]['label']
    });
  }
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/:set', function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    let list = [];
    db[setKey]['list'].forEach(function (e) {
      list.push(`${e} ${db[setKey]['label'][e]}`);
    });
    res.render('label', { title: set, list: list });
  }
});

router.get('/:set/:id', function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[setKey]['list'].length) {
      res.sendStatus(404);
    }
    let name = db[setKey]['list'][id];
    res.render('setlabel', {
      title: name,
      url: `/class/${set}/image/${id+1}`,
      action: `/class/${set}/${id+1}`,
      labels: db.config[setKey]['labels']
    });
  }
});
router.post('/:set/:id', function(req, res, next) {
  let set = req.params.set;
  let setKey = getSetKey(set);
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[setKey] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[setKey]['list'].length) {
      res.sendStatus(404);
    }
    let name = db[setKey]['list'][id];
    db[setKey]['label'][name] = req.body.label;
    fs.appendFile(db.config[setKey]['labelfile'], `${name} ${req.body.label}\n`, function (err) {
      if (err) {
        console.log(err);
      }
    });
    res.redirect(`/class/${set}/${id+2}`);
  }
});
router.get('/:set/image/:id', getImage);
router.get('/:set/api/label', getLabel);

module.exports = router;
