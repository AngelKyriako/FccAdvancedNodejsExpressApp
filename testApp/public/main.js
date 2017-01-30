var challengeIdInput = document.getElementById("challenge-id-input");
var challengeUrlInput = document.getElementById("challenge-url-input");
var consoleOutput = document.getElementById("console-output");

var testsInProgress = false;
challengeUrlInput.value = 'https://luminous-dart.gomix.me';
consoleOutput.value = '';

function logToConsole(log, isError) {
  consoleOutput.value += log + '\n';
  if (isError) {
    console.error(log);
  } else {
    console.info(log);
  }
}

logToConsole('you may open the browser console for more info...');

function assert(bool, text) {
  if (!bool) {
    return logToConsole('ASSERTION ERROR: ' + text, true);
  }
}

function runTests() {
  if (testsInProgress) {
    return logToConsole('CHILL: tests currently running, wait util they are finished');
  }

  testsInProgress = true;
  var appUrl = challengeUrlInput.value.trim();
  var challengeId = Number(challengeIdInput.options[challengeIdInput.selectedIndex].value);
  var currentTest = -1;

  logToConsole('\ninitializing challenge tester object...\n');
  eval(testSkeleton.before);

  function runNextTest() {
    var test = testSkeleton.tests[++currentTest];
    if (currentTest) {
      logToConsole('\tDone\n');
    }    
    if (test) {
      logToConsole('Running test #' + (currentTest+1) + ': ' + test.text);
      eval(test.testString);
    } else {
      logToConsole('');
      logToConsole('Tests finished, check for assertion logs');
      testsInProgress = false;
    }
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  runNextTest();
}