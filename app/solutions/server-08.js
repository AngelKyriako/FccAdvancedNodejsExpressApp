// #challenge-8: send a new message, part 3 (make the app realtime with websockets)
//
// So we were able to create a message and responde with its partial html so that it can directly
// be appanded in the page.
//
// But what about the other users that are into the page ?
// If you open two different browser windows and send a message from one of them, the other one will
// need to refresh the page to see the page. That's not cool, right ?
//
// This is where websockets come into the game to make the page look realtime.
//
// In this challenge you will emit a web socket event after a new message is created at 'api/message'
// so that all connected clients can update their dom.
//
// You will see a dublicate left aligned message on the sender's page. This is fine...for now
//
// Instructions:
//
// 1) include the socket.io package into the server package.json & initialize socket.io
//
// 2) include the socket.io library into the client at index.pug. The socket.io package
//    serves the client automatically at: '/socket.io/socket.io.js'
//
// 3) emit a socket event at id: 'chat.message' with data {model: messageJsonFromDB, view: htmlData}
//
// 4) For the html data, use the same method you used in the previous challenge.
//    However, in this case do not pass a user parameter so that the template can understand
//    that it has to generate a template for the receiver. (received messages are left alligned)
//
// The html data should be generated with the pug package and the compileFile method. The file you will need
// to compile is the chatMessage.pug which represents a single message. args required:
//                                                                            user: <session user>,
//                                                                            message: <message created>
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips:
//  socket.io docs: http://socket.io/docs/
//  pug docs :: compileFile: https://pugjs.org/api/getting-started.html
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
/*
* #challenge: initialize socket.io here
*
* Only change code below this line.
*/        
var io = require('socket.io');
var socketServer = io(httpServer);
/*
* Only change code above this line.
*/

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
        /*
        * #challenge: send a socket event with the message html for the receivers
        *
        * Only change code below this line.
        */        
        var recvHtml = messageView({
          message: message
        });

        socketServer.emit('chat.message', {
          model: message, view: recvHtml
        });

        /*
        * Only change code above this line.
        */
      }
    });
});


httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
