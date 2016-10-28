// use this: http://www.freeformatter.com/javascript-escape.html to escape the script for the fcc production site

function TestManager(serverUrl, challengeId, assert) {
  
  var hostUrl = location.protocol + '//' + location.hostname;
  
  var CHALLENGE = {
    SERVER_SIDE_INDEX_PAGE: 1,
    MESSAGES_IN_VIEW: 2,
    SIGNIN: 3,
    LOGOUT: 4,
    SIGNUP: 5,
    CREATE_MESSAGE: 6,
    CREATE_MESSAGE_WITH_VIEW: 7,
    CREATE_MESSAGE_WITH_SOCKETS: 8,
    GET_SESSION: 9,
    GET_GEO: 10,
    GET_GEO_AND_SET_COOKIE: 11,
    GET_DEFAULT_AVATAR: 12
  };
  
  var ROUTE = {
    INDEX: getServerRoute(),
    LOGIN: getServerRoute('/auth/local'),
    REGISTER: getServerRoute('/auth/local/register'),
    LOGOUT: getServerRoute('/auth/logout'),
    MESSAGE: getServerRoute('/api/message'),
    ME: getServerRoute('/api/me'),
    GEO: getServerRoute('/api/geo')
  };
  
  var GUEST = new User({username: 'guestuser', password: 'guestuser', name: 'guest'});
  
  function User(json) {
    
    var self = json;
    
    this.toParams = function toParams() {
      var str = '';
      for (var key in self) {
        if (self.hasOwnProperty(key)) {
          str += '&'+key+'='+self[key];
        }  
      }
      
      return str;
    };
    
    this.shouldEqual = function shouldEqual(user) {
      assert(user, 'the server session user should be passed into the view before compilation');
      assert(user.username === self.username, 'session user username should equal to "'+self.username+'", got "' + user.username + '" instead');
      assert(user.name === self.name, 'session user name should equal to "'+self.name+'", got "' + user.name + '" instead');
      assert(user.passports, 'session user should have a passports array property');
      assert(user.passports.length === 1, 'session user should have a passports array of one element');
      assert(user.passports[0].type === 'local', 'session user should have a a passport of type local attached, got "' + user.passports[0].type + '" instead');
      assert(user.passports[0].password !== self.password, 'the passport password should be encrypted');
    }
  }
  
  function Message(json) {
    this.text = json.text;
    this.geo = json.geo;
    
    this.toParams = function toParams() {
      var str = 'text='+this.text;
      if (this.geo) {
        //@TODO
      }
      
      return str;
    };
  }
  
  function request(method, route, testHandler, dataToSent, opts) {
    if (!opts) {
      opts = {};
    }
    
    var req = new XMLHttpRequest();
    
    req.onload = testHandler;
    
    req.open(method, route, true);
    
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    
    req.withCredentials = true;
    
    req.send(dataToSent);        
  }
  
  function getServerRoute(route) {
    if (!route) route = '';
    
    return serverUrl + route;
  }
  
  function signInViewExists(html) {
    return html.indexOf('<div id="signin-local">') !== -1 &&
           html.indexOf('<div id="signup-local">') !== -1;
  }
  
  function signOutViewExists(html) {
    return html.indexOf('<div class="row" id="signout">') !== -1;
  }
  
  function getHiddenUser(html) {
    var hiddenUserDiv = '<div class="hidden" id="user">';
    var divIndex = html.indexOf(hiddenUserDiv);
    if (divIndex !== -1) {
      var userHtml = '';
      var str = html.substring(divIndex + hiddenUserDiv.length, html.length);
      for(var i in str) {
        var c = str[i];
        if (c === '<') {
          break;
        }
        userHtml += c;
      }
      var user;
      try {
       var userStr = userHtml.replace(new RegExp('&quot;', 'g'), '"');
       var userJson = JSON.stringify(eval('('+userStr+')'));
       user = JSON.parse(userJson);
      } catch(e) { }
      return user;
    } else {
      return;
    }
  }
  
  function testIndexView(res, opts, done) {
    assert(res.status === 200, 'the server should return a 200 response ' + this.status + ' instead');

    var html = res.responseText
    assert(html, 'the server should return the index html page in the response');
    
    if (!opts.context) {
      opts.context = '';
    }
    
    // append a console log into the done callback for debugging purposes
    var superDone = done || function(){};
    done = function doneOverride() {
      console.info(opts.context + ' index view tests passed');
      
      superDone();
    };
    
    var user = getHiddenUser(html);
    if (opts.expectedAuthed) {
      
      var expectedUser = opts.expectedUser;
      
      assert(signOutViewExists(html), opts.context + ': logout sub view should be part of the page on an authenticated view');
      assert(!signInViewExists(html), opts.context + ': login & register sub views should not be part of the page on an authenticated view');
      
      expectedUser.shouldEqual(user);
      
      if (opts.autoLogout) {
        var logoutRoute = getServerRoute('/auth/logout');  
        request('GET', logoutRoute, done);
      } else {
        done()
      };
    } else {
      assert(!signOutViewExists(html), opts.context +': logout sub view should not be part of the page on a non authenticated view');
      assert(signInViewExists(html), opts.context +': login & register sub views should be part of the page on a non authenticated view');
      
      assert(!user, opts.context +': session user should not exist on a non authenticated view');
      
      done();
    }
  }

  function testSessionUser(res, isLoggedIn) {
    assert(res.status === 200, '/api/me: should respond with status 200, got: ' + res.status + ' instead');
    
    var response = res.responseText;
    
    // json response assertion
    var user;
    try {
      user = JSON.parse(response); 
    } catch(e) { }
    assert(user, '/api/me: the server should return a json object, got: ' + response + ' instead');
    assert(typeof(user) === 'object', '/api/me: the server should return a json object, got: ' + response + ' instead');
    
    if (isLoggedIn) {
      GUEST.shouldEqual(user);
    } else {
      assert(user.name ==='guest', '/api/me: the server should response with {name: "guest"} when no session exists, got: ' + response + ' instead');
    }
  }
  
  function testGeolocation(res) {
    assert(res.status === 200, '/api/geo: should respond with status 200, got: ' + res.status + ' instead');  
    
    var response = res.responseText;
    
    // json response assertion
    var geo;
    try {
      geo = JSON.parse(response); 
    } catch(e) { }
    assert(geo, '/api/geo: the server should return a json object, got: ' + response + ' instead');
    assert(typeof(geo) === 'object', '/api/geo: the server should return a json object, got: ' + response + ' instead');
    
    var errPostfix = ', make sure to use the url in the description for the request to the geolocation api';
    
    assert(geo.hasOwnProperty('ip'), '/api/geo: the server should return a json object that includes the "ip" property' + errPostfix);
    assert(geo.hasOwnProperty('city'), '/api/geo: the server should return a json object that includes the "city" property' + errPostfix);
    assert(geo.hasOwnProperty('latitude'), '/api/geo: the server should return a json object that includes the "latitude" property' + errPostfix);
    assert(geo.hasOwnProperty('longitude'), '/api/geo: the server should return a json object that includes the "longitude" property' + errPostfix);
    assert(geo.hasOwnProperty('metro_code'), '/api/geo: the server should return a json object that includes the "metro_code" property' + errPostfix);
    assert(geo.hasOwnProperty('country_code'), '/api/geo: the server should return a json object that includes the "country_code" property' + errPostfix);
    assert(geo.hasOwnProperty('country_name'), '/api/geo: the server should return a json object that includes the "country_name" property' + errPostfix);
    assert(geo.hasOwnProperty('region_code'), '/api/geo: the server should return a json object that includes the "region_code" property' + errPostfix);
    assert(geo.hasOwnProperty('region_name'), '/api/geo: the server should return a json object that includes the "region_name" property' + errPostfix);
    assert(geo.hasOwnProperty('time_zone'), '/api/geo: the server should return a json object that includes the "time_zone" property' + errPostfix);
    assert(geo.hasOwnProperty('zip_code'), '/api/geo: the server should return a json object that includes the "zip_code" property' + errPostfix);

    // there is no way to test the cookie saved from a cross origin response
    // the cookie based geolocation is tested on the .testMessage function
  }    
  
  this.testProjectUrl = function testProjectUrl(done) {
    assert(serverUrl, 'server url should be set');
    assert(serverUrl.length > 0, 'server url should be set');
    
    console.info('server url tests passed');
    
    if (done) done();
  };
  
  this.testIndexPage = function testIndexPage(done) {
    request('GET', ROUTE.INDEX, function onResponse() {
      assert(this.status === 200, 'the server should return a 200 response ' + this.status + ' instead');
      var html = this.responseText;

      assert(html, 'index page could not be retrieved');
      
      if (challengeId >= CHALLENGE.MESSAGES_IN_VIEW) {
        var chatViewExists = html.indexOf('<div class="col-sm-8 col-sm-offset-2" id="chat-messages">') !== -1;
        
        var atLeastOneMessageExists = html.indexOf('<div class="message') !== -1;
        
        assert(chatViewExists, '/: chat messages sub view should exist in index page');
        
        assert(atLeastOneMessageExists, '/: no messages should exist in the chat messages sub view');
      }
      
      if (challengeId >= CHALLENGE.SIGNIN) {
        assert(signInViewExists(html) || signOutViewExists(html), '/: authentication sub view could not be found in index page');
      }
      
      console.info('/ tests passed');
      if (done) done();
    });
  };
  
  this.testSignInBadUsername = function testSignInBadUsername(done) {
    if (challengeId >= CHALLENGE.SIGNIN) {
      request('POST', ROUTE.LOGIN, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          autoLogout: false,
          context: '/auth/local fail, bad username'
        }, done);        
      }, 'password='+GUEST.password);  
      
    } else if (done){
      done();
    }    
  };
  
    
  this.testSignInBadPassword = function testSignInBadPassword(done) {
    if (challengeId >= CHALLENGE.SIGNIN) {
      request('POST', ROUTE.LOGIN, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          autoLogout: false,
          context: '/auth/local fail, bad password'
        }, done);        
      }, 'username='+GUEST.username);  
      
    } else if (done){
      done();
    }    
  };
  
  this.testSignInNoParams = function testSignInNoParams(done) {
    if (challengeId >= CHALLENGE.SIGNIN) {
      request('POST', ROUTE.LOGIN, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          autoLogout: false,
          context: '/auth/local fail, no params'
        }, done);        
      });  
      
    } else if (done){
      done();
    }    
  };
  
  this.testSignInSuccess = function testSignInSuccess(done) {
    if (challengeId >= CHALLENGE.SIGNIN) {

      request('POST', ROUTE.LOGIN, function() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: challengeId >= CHALLENGE.LOGOUT,
          context: '/auth/local success'
        }, done);        
      }, GUEST.toParams());  
      
    } else if (done){
      done();
    }    
  };
  
  this.testLogout = function testLogoutRoute(done) {
    if (challengeId >= CHALLENGE.LOGOUT) {
      
      request('POST', ROUTE.LOGIN, function onLogin() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: false,
          context: 'sign in before /auth/logout'
        });
        
        request('GET', ROUTE.LOGOUT, function onResponse() {
          testIndexView(this, {
            expectedAuthed: false,
            context: '/auth/logout'
          }, done);
          
        });
        
      }, GUEST.toParams());
      
    } else if (done){
      done();
    }
  };
  
  
  this.testSignupUsernameExists = function testSignupUsernameExists(done) {
    if (challengeId >= CHALLENGE.SIGNUP) {
      
      var user = new User({
        username: 'guestuser', //already exists
        password: 'testUserPass',
        name: 'test user'
      });
      
      request('POST', ROUTE.REGISTER, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          context: '/auth/local/register fail, username exists'
        }, done);
      }, user.toParams());
      
    } else if (done){
      done();
    }
  };    
  
  this.testSignupBadUsername = function testSignupBadUsername(done) {
    if (challengeId >= CHALLENGE.SIGNUP) {
      
      var user = new User({
        password: 'testUserPass',
        name: 'test user'
      });
      
      request('POST', ROUTE.REGISTER, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          context: '/auth/local/register fail, bad username'
        }, done);
      }, user.toParams());
      
    } else if (done){
      done();
    }
  };    
  
  this.testSignupBadPassword = function testSignupBadPassword(done) {
    if (challengeId >= CHALLENGE.SIGNUP) {
      
      var user = new User({
        username: 'testUser'+Date.now(),
        name: 'test user'
      });
      
      request('POST', ROUTE.REGISTER, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          context: '/auth/local/register fail, bad password'
        }, done);
      }, user.toParams());
      
    } else if (done){
      done();
    }
  };  
  
  this.testSignupNoParams = function testSignupNoParams(done) {
    if (challengeId >= CHALLENGE.SIGNUP) {

      request('POST', ROUTE.REGISTER, function onResponse() {
        testIndexView(this, {
          expectedAuthed: false,
          context: '/auth/local/register fail, no params'
        }, done);
      });
      
    } else if (done){
      done();
    }
  };    
  
  this.testSignupSuccess = function testSignupSuccess(done) {
    if (challengeId >= CHALLENGE.SIGNUP) {
      
      var user = new User({
        username: 'testUser'+Date.now(),
        password: 'testUserPass',
        name: 'test user'
      });
      
      request('POST', ROUTE.REGISTER, function onResponse() {
        testIndexView(this, {
          expectedUser: user,
          expectedAuthed: true,
          autoLogout: true,
          context: '/auth/local/register success'
        }, done);
      }, user.toParams());
      
    } else if (done){
      done();
    }
  };
  
  this.testApiMessage403 = function testApiMessage403(done) {
    if (challengeId >= CHALLENGE.CREATE_MESSAGE) {
      request('POST', ROUTE.MESSAGE, function onPermissionDenied() {
        assert(this.status === 403, '/api/message: the server should return a 403 response when the user is not authenticated, got ' + this.status + ' instead');
        console.info('/api/message 403 tests passed');
        if(done) done();
      });
      
    } else if (done) {
      done();
    }
  };
  
  this.testApiMessage400 = function testApiMessage400(done) {
    if (challengeId >= CHALLENGE.CREATE_MESSAGE) {

      // setup
      request('POST', ROUTE.LOGIN, function onLogin() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: false,
          context: 'sign in before /api/message 400'
        });
        
        // test
        request('POST', ROUTE.MESSAGE, function onBadRequest() {
          assert(this.status === 400, '/api/message: the server should return a 400 response when the db service callbacks with error, got ' + this.status + ' instead');
          
          // cleaup
          request('GET', ROUTE.LOGOUT, function onResponse() {
            testIndexView(this, {
              expectedAuthed: false,
              context: '/api/message 400'
            }, done);
          });
        });
      }, GUEST.toParams());
      
    } else if (done) {
      done();
    }
  };  
  
  this.testApiMessage201 = function testApiMessage201(done) {
    if (challengeId >= CHALLENGE.CREATE_MESSAGE) {
      
      var self = this;
      
      var message = new Message({text: 'Hello!'});
      
      // cleanup
      var doneSuper = done;
      done = function doneOverride() {
        request('GET', ROUTE.LOGOUT, function onResponse() {
          testIndexView(this, {
            expectedAuthed: false,
            context: '/api/message 201'
          }, doneSuper);
        });
      };

      function testJsonResponse(response, isSocket) {
        // json response assertion
        var jsonResponse;
        try {
          // http response will be a string, but socket.io will be an object
          if (!isSocket) {
            jsonResponse = JSON.parse(response); 
          } else {
            jsonResponse = response;
          }
        } catch(e) { }
        
        var resLabel = !isSocket ? 'response' : 'socket message';
        
        assert(jsonResponse, '/api/message: the server '+resLabel+' should be a json object, got: ' + response + ' instead');
        assert(typeof(jsonResponse) === 'object', '/api/message: the server '+resLabel+' should be a json object, got: ' + response + ' instead');
        
        // model assertion
        var model = jsonResponse.model;
        assert(model, '/api/message: the server '+resLabel+' should include a model property, got ' + model + ' instead');
        assert(message.text === model.text, '/api/message: the server '+resLabel+', text property should equal with "'+message.text+'" got ' + model.text + ' instead');
        
        // view assertion
        if (challengeId >= CHALLENGE.CREATE_MESSAGE_WITH_VIEW) {
          var view = jsonResponse.view;
          
          assert(view, '/api/message: the server '+resLabel+' should include a view property, got ' + view + ' instead');
          
          // check message element class
          var messageElemClassTag = '<div class="message row"><div class="col-xs-12"><div class="message-'+(isSocket ? 'received' : 'sent')+'">';
          assert(view.indexOf(messageElemClassTag) !== -1, '/api/message: the server '+resLabel+' view should be a partially compiled messageMixin with the message-sent class');
          
          // check message text value
          var messageTextTag = '<p class="message-text'+(isSocket ? '' : ' pull-right')+'">Hello!</p>';
          assert(view.indexOf(messageTextTag) !== -1, '/api/message: the server '+resLabel+' view should include the message\'s text tag: ' + messageTextTag);
          
          // check the message footer value, it is based on the geolocation cookie existence
          // (created on GET /api/geo after challenge GET_GEO_AND_SET_COOKIE)
          var messageFooterTag = '<p class="message-footer'+ (isSocket ? '' : ' pull-right') + '">';
          var footerIndex = view.indexOf(messageFooterTag);
          assert(footerIndex !== -1, '/api/message: the server '+resLabel+' view should include the message\'s footer tag: ' + messageFooterTag);
        
          // when a cookie exists in the browser the footer should be something like 'just now, Europe/Athens'
          // when it does not, it should just be 'just now'
          //
          // the cookie existence is based on if CHALLENGE.GET_GEO_AND_SET_COOKIE is paseed
          var expectedFooterPrefix = challengeId >= CHALLENGE.GET_GEO_AND_SET_COOKIE ? 'just now, ' : 'just now';
          
          var startsAt = footerIndex + messageFooterTag.length;
          var endsAt = startsAt + expectedFooterPrefix.length;
          var footerPrefix = view.substring(startsAt, endsAt);
          
          assert(footerPrefix === expectedFooterPrefix, '/api/message: the server '+resLabel+' view should include the location in the message footer, '
                                                       +'make sure that the cookie parser works properly & that the cookie is set on /api/geo');
        }
      }

      // setup
      request('POST', ROUTE.LOGIN, function onLogin() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: false,
          context: 'sign in before /api/message 200'
        });
        
        // test
        var socketResponse;
        if (challengeId >= CHALLENGE.CREATE_MESSAGE_WITH_SOCKETS) {
          var socket = io(ROUTE.INDEX);
          socket.on('chat.message', function(messageReceived) {
            socketResponse = messageReceived;
          });
        }
        
        // request the geolocation so that the cookie is set, in case we are testing after CHALLENGE.GET_GEO_AND_SET_COOKIE
        request('GET', ROUTE.GEO, function onResponse() {
        
          request('POST', ROUTE.MESSAGE, function onSuccessRequest() {
            assert(this.status === 201, '/api/message: the server should return a 201 response when the db service creates an entry, got ' + this.status + ' instead');
            testJsonResponse(this.responseText, false);
            
            if (challengeId >= CHALLENGE.CREATE_MESSAGE_WITH_SOCKETS) {
              setTimeout(function waitForSocketEvent() {
                assert(socketResponse, '/api/message::socket: the server did not emit a socket event upon message creation');
                
                testJsonResponse(socketResponse, true);
                
                done();
              }, 500);
            } else {
              done();
            }
            
          }, message.toParams());
        
        }, 'noTextKey=someMessage');
        
      }, GUEST.toParams());
      
    } else if (done){
      done();
    }
  };
  
  this.testApiMeGuest = function testApiMeGuest(done) {
    if (challengeId >= CHALLENGE.GET_SESSION) {
      request('GET', ROUTE.ME, function onResponse() {
        testSessionUser(this, false);
        console.info('/api/me guest tests passed');
        if(done) done();
      });
    } else if (done) {
      done();
    }
  };
  
  this.testApiMe = function testApiMe(done) {
    if (challengeId >= CHALLENGE.GET_SESSION) {
      
      // setup
      request('POST', ROUTE.LOGIN, function onLogin() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: false,
          context: 'sign in before /api/me'
        });

        // test
        request('GET', ROUTE.ME, function onResponse() {
          testSessionUser(this, true);
          
          // cleanup
          request('GET', ROUTE.LOGOUT, function onResponse() {
            testIndexView(this, {
              expectedAuthed: false,
              context: '/api/me'
            }, done);
            
          });
        });
        
      }, GUEST.toParams());

    } else if (done) {
      done();
    }
  };
  
  this.testApiGeo403 = function testApiGeo403(done) {
    if (challengeId >= CHALLENGE.GET_GEO) {
      request('GET', ROUTE.GEO, function onResponse() {
        assert(this.status === 403, '/api/geo: should respond with status 403 on non authenticated users, got: ' + this.status + ' instead');  
        console.info('/api/geo 403 tests passed');
        if(done) done();
      });
    } else if (done) {
      done();
    }
  }
  
  this.testApiGeo200 = function testApiGeo200(done) {
    if (challengeId >= CHALLENGE.GET_GEO) {
      
      // setup
      request('POST', ROUTE.LOGIN, function onLogin() {
        testIndexView(this, {
          expectedUser: GUEST,
          expectedAuthed: true,
          autoLogout: false,
          context: 'sign in before /api/geo 200'
        });
        
        // test
        request('GET', ROUTE.GEO, function onResponse() {
          testGeolocation(this);
          
          //cleanup
          request('GET', ROUTE.LOGOUT, function onResponse() {
            testIndexView(this, {
              expectedAuthed: false,
              context: '/api/geo 200'
            }, done);
          });
          
        });
        
      }, GUEST.toParams());

    } else if (done) {
      done();
    }
  };

  this.testDefaultAvatar = function testDefaultAvatar(done) {
    if (challengeId >= CHALLENGE.GET_DEFAULT_AVATAR) {
      assert(false, 'can be tested only if internal server code is packaged to a fcc repo'); 
      
      if (done) done();
      
    } else if (done){
      done();
    }
  };
  
};