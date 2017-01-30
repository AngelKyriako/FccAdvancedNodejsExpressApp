// #challenge-11: Get the geo data from cookies
//
// Right now the client requests for the geolocation data by their ip and sends it
// to the server every time they are creating a message.
//
// That makes sense, but it would be better to cache the geolocation data so that we do
// not request all the time the external api. Geolocation data do not change that often after
// all.
//
// This can be done by setting a cookie on the response header. In express to do that
// we could use the res.cookie utility.
//
// Instructions:
//
// 1) update route GET '/api/geo' so that it will set a cookie before responding with json. You may use
//    res.cookie to do the job. 
//
// 2) include package cookie-parser on package.json
//
// 3) update route POST '/api/message' so that it will create the message withe the geolocation taken from the cookie
//    instead of the body of the request
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips:
//  express res.cookie: http://expressjs.com/en/api.html#res.cookie
//  express cookie parser: https://github.com/expressjs/cookie-parser

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


/*
 * #challenge: setup cookie parser middleware
 *
 * Only change code below this line.
 */         

// the request cookie parser
var cookieParser = require('cookie-parser');
app.use(cookieParser());

/*
 * Only change code above this line.
 */   


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
    
   /*
    * #challenge: set the geolocation data from the request cookie
    *
    * Only change code below this line.
    */      
    
    var args = {
      creator: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      text: body.text,
      geo: req.cookies.geo || body.geo || {}
    };

   /*
    * Only change code above this line.
    */   

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

app.get('/api/me', function(req, res, next) {
  var user = req.user;
  if (user) {
    res.json(user);
  } else {
    res.json({name: 'guest'});      
  }
});


// trust proxy so that req.ip is populated
app.enable('trust proxy');

var request = require('request');

function getGeolocationByIp(req, next) {
  request.get({
    url: 'http://freegeoip.net/json/' + req.ip
  }, function(err, response, body) {
    if (err)
      next(err);
    else if (response.statusCode !== 200)
      next({status: response.statusCode, message: body});
    else {
      var data;
      try {
        data = JSON.parse(body);
      } catch(e) {
        err = {
          status: 500,
          message: 'could not parse response body' + body
        };
      }
      next(err, data);
    }
  });
}

app.get('/api/geo', 
  ensureAuthenticated,
  function(req, res, next) {
    getGeolocationByIp(req, function(err, data) {
      if (err) {
        res.status(err.status || 500).json(err);
      } else {
       /*
        * #challenge: create a messaging route at POST /api/message
        *
        * Only change code below this line.
        */         
        
        // set cookie header
        // once the client receives this response, they will create a cookie with these data and options:
        //
        // domain	String	Domain name for the cookie. Defaults to the domain name of the app.
        // encode	Function	A synchronous function used for cookie value encoding. Defaults to encodeURIComponent.
        // expires	Date	Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie.
        // httpOnly	Boolean	Flags the cookie to be accessible only by the web server.
        // maxAge	Number	Convenient option for setting the expiry time relative to the current time in milliseconds.
        // path	String	Path for the cookie. Defaults to “/”.
        // secure	Boolean	Marks the cookie to be used with HTTPS only.
        // signed	Boolean	Indicates if the cookie should be signed.        
        //
        res.cookie('geo', data, {
          // 5 days is long enough even for frequent travelers 
          maxAge: 1000 * 60 * 60 * 24 * 5
          // https only
         ,secure: config.SSL
        });
        
        res.status(200).json(data);
        
       /*
        * Only change code above this line.
        */   
      }
    });
});


httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
