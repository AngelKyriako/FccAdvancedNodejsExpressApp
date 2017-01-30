Free Code Camp
============================

Advanced node.js/express challenges
------------

\ ゜o゜)ノ

## App

The app directory contains the application. A camper will receive a [gomix](https://gomix.com) url of this application for each challenge.

That means that the ```server.js``` & ```views/index.pug``` should be updated with the previous challenge's recommended solution.

Usage: 
```sh
cd app
export SSL=false

# optionally
cp solutions/server-#.js server.js
cp solutions/index-#.pug views/index.pug

npm start
```

#### config.js 

  This is the server side configuration, the camper does not need to update this.
  However, it is recommended to change the database URL so that each individual app does not point to the same default [mongolab](https://mlab.com/) database.

#### package.json  

  The node.js server side dependencies needed through out the challenges are already included from the start.

  The most important line here is the following:

#### server.js  

  The server side code is in this script. This is where the camper will do most of their changes to complete their challenges.

#### views

  The server side rendering templates are included here. In some challenges the camper will have to do changes in the ```index.pug``` file to see the results of their effort.

  .eg challenge 2 requires the camper to ```include partials/chatMessages.pug```, in order for the app to render the chat messages retrieved from the database.

  ```json
  "fcc-advanced-nodejs-express-helper": "git+https://github.com/AngelKyriako/FccAdvancedNodejsExpressHelper.git",
  ```
  This is a custom module made for the challenges to abstract out:

  - database calls 
  - the default avatar path needed in the end of the challenges
    - needed since [gomix](https://gomix.com) does not allow writting to the filesystem with fs

#### public
  This director contains the web client of the application. The .js & .css files are included in the [views](#### views)```index.pug``` from the server side.
  
  The camper does not have to mess with the code in this folder, it is there so that the web client can interact with the server. That way the camper can see quick results when they update their server side code.


#### solutions
  All ```solutions/server#.js``` files correspond to each challenge's server script in its solved state.
  
  - The comments on top in each script describe the challenge is about & has tips to help the camper where to look. It is recommended to be put directly on the description rather than at the HINT section.
  - The recommended code blocks, needed to be changed in order to complete the challenge are labeled by comments like below:
  
    ```js
    /*
    * #challenge: set pug as the expresss' view engine
    *             server side render the index page
    *
    * Only change code below this line.
    */

    // no code or previews challenge's code will be here.

    /*
    * Only change code above this line.
    */
    ```
  - Copy a ```solutions/server#.js``` script into the server.js to check the state of the app after every challenge.

  There are challenges that require changes to be server-side rendering templates. All ```solutions/index#.pug``` files correspond to each challenge's index page template in its solved state.

  - The camper will be pointed towards the ```views/index.pug``` from the comment on top the related ```server.js``` script.


## TestApp

The testApp directory contains the corresponding unit testing application.

This is another node.js project that servers a web client which unit tests the application in the [app](## app).

Usage: 
```sh
cd testApp
npm start
```
A gomix server runs the final state of the app at: [https://luminous-dart.gomix.me/](https://luminous-dart.gomix.me/)

On the testing site, set the gomix server URL, select challenge number to test and checkout the results.
If the tests fail when they should not, make sure to restart the app's node.js server (in gomix edit and revert a change for it to restart).

### ChallengeTester.js

  This file includes the ChallengeTester object to be used to run the unit tests for any challenge.
  
  Its constructed with 3 arguments:
  - ```serverUrl```: the url where from the campers app is served.
  - ```challengeId```: the challenge number starting from 1.
  - ```assert```: the assertion callback, called with two arguments from the tester (<boolean to assert>, <string message on failure>).


### unit-tests.js

  The skeleton of the unit tests(to be run in a serial manner) setup as strings like in the free code camp web client.
  
  They are dependent on the ```ChallengeTester.js``` file which should be initialized with its three parameters based on the the campers server url, current challenge & assertion function.
  The ```before``` key contains a string version of the file made with [free formatter](http://www.freeformatter.com/javascript-escape.html).

### main.js

  The main script which will parse the ```unit-tests.js``` file and will perform a serial execution of the unit tests.
  Steps:
  - initialize ```serverUrl```, ```challengeId``` & ```assert``` function.
  - evaluate the ```before``` key of the unit tests skeleton so that the **ChallengeTester** is initialized.
  - define a ```runNextTest``` function which is called by each unit test after its finished its job.
  - recursively run all unit tests.

### default-avatar.png

  The default avatar is needed to test the avatar related challenge where the camper has to pipe this exact file located in the [FccAdvancedNodejsExpressHelper](https://github.com/AngelKyriako/FccAdvancedNodejsExpressHelper/blob/master/img/default-avatar.png) module.
