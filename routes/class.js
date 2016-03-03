'use strict';
var express = require('express');
var fs = require('fs');
var router = express.Router();
var db = require('../db');

var loadData = function(set) {
  if (db.config[set] && !db[set]) {
    db[set] = {};
    let root = db.config[set]['root'];
    let listfile = db.config[set]['listfile'];
    let labelfile = db.config[set]['labelfile'];

    let list = [];
    fs.readFileSync(listfile, 'utf8').split("\n").forEach(function(line) {
      if (line.trim().length > 0) {
        list.push(line);
      }
    });
    db[set]['list'] = list;

    db[set]['label'] = {};
    fs.readFileSync(labelfile, 'utf8').split("\n").forEach(function(line) {
      let parts = line.split(" ");
      db[set]['label'][parts[0]] = parts[1];
    });
  }
};

var getImage = function(req, res, next) {
  let set = req.params.set;
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[set] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[set]['list'].length) {
      res.sendStatus(404);
    }

    var options = {
      root: db.config[set]['root'],
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };

    res.sendFile(db[set].list[id], options, function (err) {
      if (err) {
        console.log(err);
        res.status(err.status).end();
      } else {
        console.log('Sent: ', db[set].list[id]);
      }
    });
  }
};

var getLabel = function(req, res, next) {
  let set = req.params.set;
  if (db.config[set] === undefined) {
    res.sendStatus(404);
  } else {
    res.send({
      label: db.config[set]['label']
    });
  }
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/:set', function(req, res, next) {
  let set = req.params.set;
  if (db.config[set] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    let list = [];
    db[set]['list'].forEach(function (e) {
      list.push(`${e} ${db[set]['label'][e]}`);
    });
    res.render('label', { title: set, list: list });
  }
});

router.get('/:set/:id', function(req, res, next) {
  let set = req.params.set;
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[set] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[set]['list'].length) {
      res.sendStatus(404);
    }
    let name = db[set]['list'][id];
    res.render('setlabel', {
      title: name,
      url: `/class/${set}/image/${id+1}`,
      action: `/class/${set}/${id+1}`,
      labels: db.config[set]['labels']
    });
  }
});
router.post('/:set/:id', function(req, res, next) {
  let set = req.params.set;
  let id = Number.parseInt(req.params.id, 10) - 1;
  if (db.config[set] === undefined) {
    res.sendStatus(404);
  } else {
    loadData(set);
    if (Number.isNaN(id) || id < 0 || id >= db[set]['list'].length) {
      res.sendStatus(404);
    }
    let name = db[set]['list'][id];
    db[set]['label'][name] = req.body.label;
    fs.appendFile(db.config[set]['labelfile'], `${name} ${req.body.label}\n`, function (err) {
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
