// challenge-2: pass arguments to the view engine
//
// Good job, now we are rendering our index page from the page. However, this have no value if we cannot tell the
// view engine what to render. We can do this by passing some arguments on the res.render function we created before.
//
// Lets pass some chat messages to render.
//
// Instructions:
//
// 1) on the index.pug file include the './partials/chatMessages.pug' partial template
//    look the code in it. It requires the messages variable in order to display them.
//
// 2) on the app.get('/') route query the database for messages and call
//    res.render('index') with the messages returned from the query as arguments on the 'messages' key
//
//    db query for messages:
//
//    var page = 0;
//    var pageCount = 10;
//
//    Message.find({})
//    .sort({'createdAt': '-1'})
//    .skip(page * pageCount)
//    .limit(pageCount)
//    .exec(function(err, messages) {
//      if (err) {
//        next(err);
//      } else {
//        var messageArgs = messages.reverse(); 
//        // TODO: render index.pug and pass messages as argument
//      }
//    });
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips: 
// res render docs: http://expressjs.com/en/api.html#res.render
// pug docs: https://pugjs.org/api/getting-started.html
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


/*
* #challenge: server side render the index page
*
* Only change code below this line.
*/

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
          messages: messages.reverse(),
        });
      }
    });
});

/*
* Only change code above this line.
*/

httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
