var os = require("os");

var self = {

  environment: process.env.NODE_ENV || 'development',

  hostname: os.hostname(),

  port: process.env.PORT || 3000,

  ssl: process.env.SSL != 'false',
  
  auth: {

    local: {
      saltRounds: 10
    },

    // not currently used
    //
    // difficult to be unit tested  & setup ...to be continued.
    //
    // facebook: {
    //   clientID: process.env.FACEBOOK_CLIENT_ID || '1078155265586289',
    //   clientSecret: process.env.FACEBOOK_SECRET || 'e96b7e79de093bd3e52566af32d93029',
    //   scopes: ['public_profile'],
    //   profileFields: ['id', 'displayName', 'photos']
    // },

    // google: {
    //   clientID: process.env.GOOGLE_CLIENT_ID || '241088503074-111odkquc7eoud4l6nnbh1b7v7afah9t.apps.googleusercontent.com',
    //   clientSecret: process.env.GOOGLE_SECRET || 'Ufs-cEDnX105gkuUbqfqbN7n',
    //   scopes: [],
    //   profileFields: []
    // }
  },

  db: {
    mongoUrl: process.env.MONGO_URL || 'mongodb://fccuser:fccuser123@ds033976.mlab.com:33976/fcc-node-advanced-challenges'
  },

  session: {
    secret: process.env.SESSION_SECRET || 'IamABadBadSessionSecret'
  }
};

self.serverUri = (self.ssl ? 'https://' : 'http://') + self.hostname + ':' + self.port;


module.exports = self;
