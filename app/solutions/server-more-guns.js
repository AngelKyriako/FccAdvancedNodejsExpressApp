// Extras:
// fb and google authentication (requires db.js upgrade to not require a local passport)
// custom file upload / pipe

// Native node.js modules
var http = require('http'); // http protocol
var path = require('path'); // path management
var fs = require('fs'); // file management

// custom modules
var config = require('./config.js');

var db = require('./db.js');
var User = db.User;
var Message = db.Message;

// our core server helper
var express = require('express');
// taking care of realtime web socket events
var io = require('socket.io');

// bind the http and socket server together
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
// does not support multipart requests, thats why we will use multer
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var multer = require('multer');
var uploadsDir = path.join('public', '.tmp');
var contextDirs = {
  avatar: path.join(uploadsDir, 'avatar')
};

function ensureDir(path, next) {
  fs.stat(path, function(err, stats) {
    // scenario: dir not created yet
    // action: create it
    if (!stats) {
      fs.mkdir(path, function(err) {
        if (err) {
          console.error('directory ' + path + ' creation failed with error: ', err);
        } else {
          console.info('directory ' + path + ' created');
        }
        if (next) next();
      });
    } else {
      if (next) next();
    }
  });
}

// ensureDir(uploadsDir, function() {
//   for (var context in contextDirs) {
//     ensureDir(contextDirs[context]);
//   }
// });

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var context = req.params.context;
    if (context && contextDirs.hasOwnProperty(context)) {
      cb(null, contextDirs[context]);
    } else {
      cb(null, uploadsDir);
    }
  },
  // default filename
  // filename: function (req, file, cb) {
  //   cb(null, file.fieldname + '-' + Date.now())
  // }
});
var fileParser = multer({ storage: storage });

// the request cookie parser
var cookieParser = require('cookie-parser');
app.use(cookieParser());

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

// trust proxy so that req.ip is populated
app.enable('trust proxy');

// request for handling calls to other servers
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
          statusCode: 500,
          message: 'could not parse response body' + body
        };
      }
      next(err, data);
    }
  });
}

// AUTH MIDDLEWARE INITIALIZATION
// http://stackoverflow.com/questions/11142882/how-do-cookies-and-sessions-work
var session = require('express-session');
app.use(session({
  secret: config.session.secret,
  resave: true,
  saveUninitialized: true
}));

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;

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

// For simplicity, this handler will create seperate a user per social media
// account.
//
// A better practice would be to ask for an email from the third party via scope
// and assign that as a username instead.
// That way social media accounts with the same email will be mapped
// to the same application user
//
// Note: for this change to apply, the first query should look
// for the profile's email and even if it finds the user, it should upsert
// a passport entriy
function oauth2Callback(type, accessToken, refreshToken, profile, next) {

  console.info('\n\nsocial media profile: ', profile);

  User.findOne({
    'username': profile._json.id
  }).exec(function(err, user) {
    if (err) {
      next(err);
    } else if (user) {
      next(null, user);
    } else {
      var userData = {
        username: profile._json.id,
        passports: [{
          type: type,
          accessToken: accessToken,
          profileId: profile._json.id
        }]
      };

      switch(type) {
        case 'google':
        userData.name = profile._json.displayName;
        if (profile._json.image &&
            profile._json.image.url) {
          userData.avatarUrl = profile._json.image.url;
        }
          break;
        case 'facebook':
        userData.name = profile._json.name;
        if (profile._json.picture &&
            profile._json.picture.data &&
            profile._json.picture.data.url) {
          userData.avatarUrl = profile._json.picture.data.url;
        }
          break;
        default:
          console.error('unrecognized third party: ', type);
          return next('unrecognized third party \'' + type + '\'');
      }

      User.create(userData, next);
    }
  });
}

console.info(config.serverUri+'/auth/facebook/callback');

passport.use(new FacebookStrategy({
    passReqToCallback: true,
    clientID: config.auth.facebook.clientID,
    clientSecret: config.auth.facebook.clientSecret,
    callbackURL: config.serverUri+'/auth/facebook/callback',
    scope: ['email', 'public_profile'],
    profileFields: ['id', 'email', 'displayName', 'photos']
  },
  function facebookAuth(req, accessToken, refreshToken, profile, cb) {
    oauth2Callback('facebook', accessToken, refreshToken, profile, cb);
  }
));

passport.use(new GoogleStrategy({
    passReqToCallback: true,
    clientID: config.auth.google.clientID,
    clientSecret: config.auth.google.clientSecret,
    callbackURL: config.serverUri+'/auth/google/callback'
    // google-auth module requires the scope and profile fields
    // as an arg in passport.authenticate instead
  },
  function googleAuth(req, accessToken, refreshToken, profile, cb) {
    oauth2Callback('google', accessToken, refreshToken, profile, cb);
  }
));


function ensureAuthenticated(req, res, next) {
  // scenario: user session exists
  // action: allow
  if (req.isAuthenticated()) {
    next();
  // scenario: session not found
  // action: login is required
  } else {
    res.redirect('/login');
  }
}

// SERVER ROUTES

// Authorization related routes
app.post('/auth/local',
  // authenticate and set session/cookie
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res, next) { res.redirect('/'); }
);

app.post('/auth/local/register',
  function(req, res, next) {
    var body = req.body;

    User.findOne({username: body.username}).exec(function(err, user) {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/login');
      } else {
        var userData = {
          username: body.username,
          name: body.name || body.username,
          passports: [{
            type: 'local',
            password: body.password
          }]
        };
        User.create(userData, next);
      }
    });
  },
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res, next) { res.redirect('/'); }
);

app.get('/auth/facebook',
  passport.authenticate('facebook')
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res, next) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['email']
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res, next) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.get('/auth/logout',
  function(req, res, next){
    // clean session
    req.logout();
    
    res.clearCookie('user');
    
    res.redirect('/');
  }
);

app.post('/file/:context?', // optional context specification
  ensureAuthenticated,      // authenticated users only can upload files
  fileParser.single('file'),// specify the form key expected for the file
  function(req, res, next) {
  var context = req.params.context;
  var file = req.file;
  if (file) {
    // properties
    //
    // fieldname	Field name specified in the form
    // originalname	Name of the file on the user's computer
    // encoding	Encoding type of the file
    // mimetype	Mime type of the file
    // size	Size of the file in bytes
    // destination	The folder to which the file has been saved	DiskStorage
    // filename	The name of the file within the destination	DiskStorage
    // path	The full path to the uploaded file	DiskStorage
    // buffer
    var fileRoute;
    if (context && contextDirs.hasOwnProperty(context)) {
      fileRoute = path.join('file', context, file.filename);
    } else {
      fileRoute = path.join('file', file.filename);
    }
    res.json({
      uri: config.serverUri + '/' + fileRoute,
      route: fileRoute,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    });
  } else {
    next({status: 404, message: 'file not found or not allowed'});
  }
});

// File piper
//
// This functionality is very helpful for apps that files come
// with different permissions per user or for apps that do not want to
// allow non authenticated users to read uploaded files
app.get('/file/*', function(req, res, next) {
  var fileRoute = req.path.split('/');
  // create absolute file uri
  // better done with regex :)
  var absFileUri = path.join(uploadsDir, fileRoute.reduce((curr, next) => {
                                          // ignore empty or file strings
                                          if (next === '' || next === 'file') {
                                            return curr;
                                          } else {
                                            return curr + '/' + next;
                                          }
                                         }, ''));

  // check if file exists
  fs.stat(absFileUri, function(err, stats) {
    console.info(absFileUri, err, stats);
    if (stats && stats.isFile()) {
      // file exists, create a read stream of the file data
      var readStream = fs.createReadStream(absFileUri);
      // pipe file data to response
      readStream.pipe(res);
    } else {
      next({status: 404, message: 'file not found'});
    }
  });
});

// index view with user data
// the client page will display a insert message at the bottom
app.get('/',
  function (req, res, next) {
    // check this answer for pagination mechanism without skip
    // http://stackoverflow.com/questions/5539955/how-to-paginate-with-mongoose-in-node-js
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

app.get('/api/me', function(req, res, next) {
  var user = req.user;
  res.status(200);
  if (user) {
    res.json(user);
  } else {
    res.json({name: 'guest'});      
  }
});

app.get('/api/geo', 
  ensureAuthenticated,
  function(req, res, next) {
    getGeolocationByIp(req, function(err, data) {
      if (err) {
        next(err);
      } else {
        if (req.query.hasOwnProperty('setcookie')) {
          // options
          //
          // domain	String	Domain name for the cookie. Defaults to the domain name of the app.
          // encode	Function	A synchronous function used for cookie value encoding. Defaults to encodeURIComponent.
          // expires	Date	Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie.
          // httpOnly	Boolean	Flags the cookie to be accessible only by the web server.
          // maxAge	Number	Convenient option for setting the expiry time relative to the current time in milliseconds.
          // path	String	Path for the cookie. Defaults to “/”.
          // secure	Boolean	Marks the cookie to be used with HTTPS only.
          // signed	Boolean	Indicates if the cookie should be signed.
          res.cookie('geo', JSON.stringify(data), {
            maxAge: 1000 * 60 * 60 * 24 * 5 // 5 days
            , secure: true
          });
        }
        res.status(200).json(data);
      }
    });
});

// Messaging route
app.post('/api/message',
  ensureAuthenticated,
  function(req, res, next) {
    var user = req.user;
    var body = req.body;
    var geo = req.cookies.geo ? JSON.parse(req.cookies.geo) : body.geo;
    
    var args = {
      creator: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      text: body.text,
      geo: geo || {}
    };

    Message.create(args, function(err, message) {
      if (err) {
        next(err);
      } else {

        var messageView = views.compileFile(path.join(viewsDir, 'partials', 'chatMessage.pug'));

        var sentHtml = messageView({
          user: user,
          message: message
        });
        res.status(201).json({
          model: message, view: sentHtml
        });

        var receivedHtml = messageView({
          user: undefined,
          message: message
        });

        socketServer.emit('chat.message', {
          model: message, view: receivedHtml
        });
      }
    });
});

// error handling
app.use(function errorTranformation(err, req, res, next) {
  
  // scenario: headers set before error was emitted
  // action: just callback
  if (res.headersSent) {
    return next(err);
  } else {
  // otherwise: transform error
   
    console.error('handling error: ', err);
    
    res.status(err.status || 500);

    err = {
      message: err.message || 'whoops something went wrong',
      error: true
    };
    
    console.error('transformed error to: ', err)

    next(err);
  }
});

httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});

// SOCKET EVENTS
socketServer.on('connection', function onSocketConnect(client) {
  console.info('connection ' + client.id + ' was opened');

  client.on('disconnect', function onSocketDisconnect() {
    console.info('connection ' + client.id + ' was closed');
  });
});
