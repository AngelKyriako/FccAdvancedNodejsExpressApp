// #challenge-1: server side render the index page
//
// The current index page is served from node.js since its the index page on its static directory at './public' path.
// code sample: app.use('/', express.static(staticDir));
//
// It could include a react, angular, ember or other client side rendering framework or communicate with the server
// via a REST api, just like on some of the front-end projects (.eg weather app, wikipedia viewer and twitch viewer projects).
//
// Let's try something different now. We will generate the html of our page on the server side and respond with it so that the
// browser can render it directly with no client side calculations. This is called server side rendering. To achieve that we
// need to use what is called a view engine. There are many options out there(.ejs, .hbs .pug and more) and you could expiriment
// with them in the following projects but fo now we will use the pug (old jage) view engine. We have created all the files you
// will need for these challenges in .pug files under the views directory. All you will need to do is small tweaks here and there later on.
//
// Instructions:
//
// 1) add the pug module into the package.json file
// 2) set pug as express's view engine
// 3) use app.get to set the './views' directory as express's views directory
// 4) use res.render to respond with the index.pug template file to the client
//
// ctrl-f '#challenge' in this file to fill in the missing code to complete this challenge
//
// Tips:
// pug docs: https://pugjs.org/api/getting-started.html
// res render docs: http://expressjs.com/en/api.html#res.render
// express pug integration doc: https://expressjs.com/en/guide/using-template-engines.html

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

/*
* #challenge: set pug as the expresss' view engine
*
* Only change code below this line.
*/

// view engine configuration
var views = require('pug'); // reference pug for custom needs
app.set('view engine', 'pug');
var viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);

/*
* Only change code above this line.
*/


/*
* #challenge: server side render the index page
*
* Only change code below this line.
*/

app.get('/',
  function (req, res, next) {
    res.render('index');
});

/*
* Only change code above this line.
*/

httpServer.listen(config.port, '0.0.0.0', function onStart(req, res) {
  console.info('application is listening at uri: ', config.serverUri);
});
