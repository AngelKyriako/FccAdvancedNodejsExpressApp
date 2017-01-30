var challengeIdInput = document.getElementById("challenge-id-input");
var challengeUrlInput = document.getElementById("challenge-url-input");
var consoleOutput = document.getElementById("console-output");

challengeUrlInput.value = 'https://luminous-dart.gomix.me';
consoleOutput.value = 'you may open the browser console for more info...';

function logToConsole(log, isError) {
  consoleOutput.value += log + '\n';
  if (isError) {
    console.error(log);
  } else {
    console.info(log);
  }
}

function assert(bool, text) {
  if (!bool) {
    return logToConsole('ASSERTION ERROR: ' + text, true);
  }
}

function runTests() {
  var appUrl = challengeUrlInput.value.trim();
  var challengeId = Number(challengeIdInput.options[challengeIdInput.selectedIndex].value);
  var currentTest = -1;

  eval(testSkeleton.before);
  var count = 0;
  function runNextTest() {
    var test = testSkeleton.tests[++currentTest];
    if (test) {
      logToConsole('running test: ' + test.text);
      if (count++) {
        logToConsole('FINISHED');
      }
      eval(test.testString);
    } else {
      logToConsole('');
      logToConsole(count + ' TESTS FINISHED');
    }
  }

  logToConsole('\n');
  runNextTest();
}