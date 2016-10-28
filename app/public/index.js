var chatElems = {};

var user;
var geoByIp = Cookies.getJSON("geo");

// initialization
$.get('/api/me').done(function(usr) {
  user = usr;
  console.info('user: ', user);
}).fail(function(err){
  console.error('/api/me: ', err);
});

if (!geoByIp) {
 $.get('/api/geo').done(function(geo) {
    geoByIp = geo;
    console.info('geolocation by ip: ', geoByIp);
  }).fail(function(err) {
    console.error('/api/geo: ', err);
  }); 
} else {
  console.info('cookie geolocation: ', geoByIp);
  // cookie exists, set to undefined so that we can manually test
  // that the data are set from the cookie
  geoByIp = undefined;
}

// input management
$('document').ready(function onReady() {

  chatElems.form = $("#chat-input");
  chatElems.inputText = $("#message-text-input");
  chatElems.messages = $("#chat-messages");
  chatElems.maxWordLength = 35;
  chatElems.wordSplitRegex = new RegExp('[\r\n ]');

  function submitForm() {
    $.ajax({
      type: "POST",
      url: '/api/message',
      data: {
        text: chatElems.inputText.val(),
        geo: geoByIp
      },
      dataType: 'json'
    }).done(function(messageSent) {
      if (messageSent.view) {
        chatElems.messages.append(messageSent.view); 
      } else {
        window.location.replace('/');
      }
    })
    .fail(function(err) {
      console.warn('failed with error: ', err);
    });

    chatElems.inputText.val('');
  }

  chatElems.inputText.on('input', function(e) {
    var text = $(this).val();
    var words = text.split(chatElems.wordSplitRegex);
    var lastWord = words[words.length - 1];
    if (lastWord.length > chatElems.maxWordLength) {
      $(this).val(text + ' ');
    }
  });

  chatElems.inputText.keydown(function(e) {
    // Enter key is hit
    if (e.keyCode === 13) {
      // new line support is out of scope of those challenges
      // if (!e.shiftKey) {
      //   // prevent default behavior
      //   e.preventDefault();
      //   submitForm();
      // } else {
      //
      // }

      // prevent default behavior
      e.preventDefault();
      submitForm();
    }
  });

  chatElems.form.on("submit", function(e) {
      e.preventDefault();

      submitForm();
  });

});

// socket events
if (io) {
  var socket = io();
  socket.on('chat.message', function(messageReceived) {
  
    // append if not sender
    if (!user ||
        (messageReceived.model.creator.id !== user.id &&
         messageReceived.model.creator.id !== user._id)) {
      chatElems.messages.append(messageReceived.view);
    }
  });
}