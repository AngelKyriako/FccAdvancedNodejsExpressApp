var http = require('http');
var path = require('path');

var express = require('express');
var app = express();
var httpServer = http.Server(app);

// Static expiry middleware to help serve static resources efficiently
var expiry = require('static-expiry');
var staticDir = path.join(__dirname, 'public');
app.use(expiry(app, {
  dir: staticDir,
  debug: true
}));

// Anything in ./public is served up as static content
app.use('/', express.static(staticDir));


httpServer.listen(3334, '0.0.0.0', function onStart(req, res) {
  console.info('test application is listening at uri: http://localhost:3334');
});
