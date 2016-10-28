// #challenge-9: authenticated user retrieve route
//
// Let's get rid of that duplicate message, shall we ?
// 
// The client will look at the message model's creator emitted with the websocket and
// compare them with themselves. If they are not the creator they will append the message
// into their page.
//
// However, the way we authenticated with passport only sends a httpOnly cookie to the client
// The deal with httlOnly cookies, is that they are not readable from javascript for security reasons.
// Therefore the client has no way of know its data, unless we server them for them.
//
// In this challenge we will create a route where the client can retrieve their user data.
//
// Instructions:
//
// 1) Create route GET '/api/me'
//
// 2) The route should always respond with status 200
//
// 3) The route should return {name: 'guest'} when the user is not authenticated
//
// 4) Otherwise it should return the authenticated user from the session
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips: you've done this before mate
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
// taking care of realtime web socket events
var io = require('socket.io');

var app = express();
var httpServer = http.Server(app);
var socketServer = io(httpServer);

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
  function(req, res, next){
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

function ensureAuthenticated(req, res, next) {
  // scenario: user session exists
  // action: allow
  if (req.isAuthenticated()) {
    next();
  // scenario: session not found
  // action: login is required
  } else {
    next({status: 403, message: 'not authenticated'});
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

        var messageView = views.compileFile(path.join(viewsDir, 'partials', 'chatMessage.pug'));

        var sentHtml = messageView({
          user: user,
          message: message
        });

        res.status(201).json({
          model: message,
          view: sentHtml
        });
     
        var recvHtml = messageView({
          message: message
        });

        socketServer.emit('chat.message', {
          model: message, view: recvHtml
        });

      }
    });
});

/*
* #challenge: create a route at GET /api/message to retrieve the session user
*
* Only change code below this line.
*/   

app.get('/api/me', function(req, res, next) {
  var user = req.user;
  if (user) {
    res.json(user);
  } else {
    res.json({name: 'guest'});      
  }
});

/*
* Only change code above this line.
*/


httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
