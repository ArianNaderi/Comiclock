///<reference path='types/DefinitelyTyped/node/node.d.ts'/>
///<reference path='types/DefinitelyTyped/express/express.d.ts'/> 

interface Error {

  status?: number;

}

class Application {
  constructor(){
  
    var express = require('express');
    var path = require('path');
    var stylus = require('stylus');
    var nib = require('nib');
    var favicon = require('serve-favicon');
    var logger = require('morgan');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var session = require('express-session')
    
    var app = express();

    //Configuring Authentication w/ Passportjs
    var schemas = require('./routes/mongooseSchemas');
    var dbUser = schemas.User;
    var passport = require('passport');
    var LocalStrategy = require('passport-local').Strategy;
    passport.use(new LocalStrategy(
    function(username, password, done) {
        dbUser.findOne({ username : username }, function (err, user) {
          if (err) { return done(err); }
          if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
          }
          if (user.password != password) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
        });
      }
    ));
    passport.serializeUser(function(user, done) {
      done(null, user._id);
    });

    passport.deserializeUser(function(userid, done) {
      dbUser.findOne({ _id: userid }, function(err, user) {
        done(err, user);
      });
    });


    var routes = require('./routes/index');

    function compile(str, path) {
      return stylus(str)
        .set('filename', path)
        .use(nib())
    };
    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    // uncomment after placing your favicon in /public
    //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    //need connect-flash module for this!!!
    //app.use(flash());

    app.use(stylus.middleware(
    {
      src: __dirname + '/public'
      , compile: compile
    }
    ));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    /*
    app.use(function(req, res, next) {
      req.db = db;
      next(); 

  });
*/
    app.use('/', routes);

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
    };

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
  }

}

var application = new Application(); 