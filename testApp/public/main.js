var challengeIdInput = document.getElementById("challenge-id-input");
var challengeUrlInput = document.getElementById("challenge-url-input");
var consoleOutput = document.getElementById("console-output");

challengeUrlInput.value = 'http://localhost:3000';
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

  var tester = new ChallengeTester(appUrl, challengeId, assert);

  function runNextTest() {
    var test = tests[++currentTest];
    if (test) {
      logToConsole('running test: ' + test.text);
      eval(test.testString);
    } else {
      logToConsole('');
      logToConsole('tests finished');
    }
  }

  consoleOutput.value += '\n\n';
  runNextTest();
}