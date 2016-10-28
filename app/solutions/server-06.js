// #challenge-6: send a new message part 1, respond with model
//
// Lets continue by letting a user to send a message in the app.
//
// Instructions:
//
// 1) create a messaging route at POST '/api/message'
//
// message format expected from the database:
// var args = {
//   creator: {
//     id: sessionUser._id,
//     name: sessionUser.name,
//     avatarUrl: sessionUser.avatarUrl
//   },
//   text: body.text,
//   geo: body.geo || {}
// };
//
// Use the req.body for the request body and req.user for the session user data.
//
// 2) the route should be accessible only to authenticated users
//    check that req.isAuthenticated() returns true or that req.user is defined
//
// 3) if the user is not authenticated the route should respond with status 403
//    and {message: 'not authenticated'} in the body
//
// 4) the route should create a message with the Message.create method
//
// 5) on error, the route should respond with status 400
//    and the error in the body
//
// 6) on success, the route should respond with status 201 and
//    the message model as returned by the database in the body.
//
//    the response data should follow the following format: {model: messageJsonFromDB}
//    the client should do a dummy reload to display the change.
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips:

// res.redirect: https://expressjs.com/en/4x/api.html#res.redirect
//

// Native node.js modules
var http = require('http'); // http protocol
var path = require('path'); // path management
var fs = require('fs'); // file management

// custom modules
var config = require('./config.js');

var fccHelper = require('fcc-advanced-nodejs-express-helper');
var db = fccHelper.db;
var User = db.User;
var Message = db.Message;

db.init(config.db.mongoUrl);

// our core server helper
var express = require('express');

var app = express();
var httpServer = http.Server(app);

// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
  // Cors setup to make remote client testing possible
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, X-Requested-With');

  next();
});

// the request body parser (json & url params)
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// gzip compression when appropriate
var compression = require('compression');
app.use(compression());

// Static expiry middleware to help serve static resources efficiently
var expiry = require('static-expiry');
var staticDir = path.join(__dirname, 'public');
app.use(expiry(app, {
  dir: staticDir,
  debug: config.environment !== 'production'
}));
// Anything in ./public is served up as static content
app.use('/', express.static(staticDir));

// view engine configuration
var views = require('pug'); // reference pug for custom needs
app.set('view engine', 'pug');
var viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);

var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


app.use(session({
  secret: config.session.secret,
  resave: true,
  saveUninitialized: true,
}));

// Initialize Passport and restore authentication state,
// if any, from the session
app.use(passport.initialize());

app.use(passport.session());


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  console.info('serializing user to session: ', user);
  cb(null, user._id);
});

passport.deserializeUser(function(id, cb) {
  User.findOne({_id: id}).exec(cb);
});

passport.use(new LocalStrategy({
    passReqToCallback: true,
    usernameField: 'username',
    passwordField: 'password',
    session: true
  }, function(req, username, password, next) {
    User.findOne({ username: username }).exec(function (err, user) {
      if (err) {
        next(err);
      } else if (!user) {
        next(null, false);
      } else if (!user.verifyPasswordSync(password)) {
        next(null, false);
      } else {
        next(null, user);
      }
    });
  }
));

app.get('/',
  function (req, res, next) {
    var page = 0;
    var pageCount = 10;

    Message.find({})
    .sort({'createdAt': '-1'})
    .skip(page * pageCount)
    .limit(pageCount)
    .exec(function(err, messages) {
      if (err) {
        next(err);
      } else {
        res.render('index', {
          user: req.user,
          messages: messages.reverse(),
        });     
      }
    });
});


// Authorization related routes

app.post('/auth/local',
  passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res, next) { res.redirect('/'); }
);

app.get('/auth/logout',
  function(req, res, next) {
    // clean session
    req.logout();
    
    res.redirect('/');
  }
);

app.post('/auth/local/register',
  function(req, res, next) {
    var body = req.body;

    User.findOne({username: body.username}).exec(function(err, user) {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        var userData = {
          username: body.username,
          name: body.name || body.username,
          passports: [{
            type: 'local',
            password: body.password
          }]
        };
        User.create(userData, function(err, user) {
          if (err) res.redirect('/');
          else next(null, user);
        });
      }
    });
  },
  passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res, next) { res.redirect('/'); }
);


// Api related routes
/*
* #challenge: create a messaging route at POST /api/message
*
* Only change code below this line.
*/

function ensureAuthenticated(req, res, next) {
  // scenario: user session exists
  // action: allow
  if (req.isAuthenticated()) {
    next();
  // scenario: session not found
  // action: login is required
  } else {
    res.status(403).json({message: 'not authenticated'});
  }
}

// Messaging route
app.post('/api/message',
  ensureAuthenticated,
  function(req, res, next) {
    var user = req.user;
    var body = req.body;
    
    var args = {
      creator: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      text: body.text,
      geo: body.geo || {}
    };

    Message.create(args, function(err, message) {
      if (err) {
        res.status(400).json(err);
      } else {
        res.status(201).json({model: message});
      }
    });
});


/*
* Only change code above this line.
*/

httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
