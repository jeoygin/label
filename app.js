'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require('fs');
var FileStreamRotator = require('file-stream-rotator');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');

var claxx = require('./routes/class');
var box = require('./routes/box');

var app = express();

var env = process.env.NODE_ENV || 'development';

if ('production' == env) {
  app.use(errorhandler());
  require('console-stamp')(console, 'yyyy-mm-dd HH:MM:ss.l');
} else if ('development' == env) {
  app.use(errorhandler({dumpExceptions: true, showStack: true}));
}

process.on('uncaughtException', function(err) {
  console.error(err.stack);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

logger.format('combined', ':remote-addr - :remote-user [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms');
if (app.get('env') === 'production') {
  let logDirectory = __dirname + '/logs';
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

  var accessLogStream = FileStreamRotator.getStream({
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false,
    date_format: "YYYYMMDD"
  })

  app.use(logger('combined', {stream: accessLogStream}));

  app.set('trust proxy', true);
} else if (app.get('env') === 'development') {
  app.use(logger('dev'));
}

app.use('/class', claxx);
app.use('/box', box);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
