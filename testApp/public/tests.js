var tests = [
  {
    text: "project url is valid",
    testString: "tester.testProjectUrl(runNextTest);"
  },
  {
    text: "/ success",
    testString: "tester.testIndexPage(runNextTest);"
  },
  {
    text: "/auth/logout success",
    testString: "tester.testLogout(runNextTest);"
  },
  {
    text: "/auth/local fail, bad username",
    testString: "tester.testSignInBadUsername(runNextTest);"
  },
  {
    text: "/auth/local fail, bad password",
    testString: "tester.testSignInBadPassword(runNextTest);"
  },
  {
    text: "/auth/local fail, no params",
    testString: "tester.testSignInNoParams(runNextTest);"
  },
  {
    text: "/auth/local success",
    testString: "tester.testSignInSuccess(runNextTest);"
  },
  {
    text: "/auth/local/register fail, username exists",
    testString: "tester.testSignupUsernameExists(runNextTest);"
  },
  {
    text: "/auth/local/register fail, bad username",
    testString: "tester.testSignupBadUsername(runNextTest);"
  },
  {
    text: "/auth/local/register fail, bad password",
    testString: "tester.testSignupBadPassword(runNextTest);"
  },
  {
    text: "/auth/local/register fail, no params",
    testString: "tester.testSignupNoParams(runNextTest);"
  },
  {
    text: "/auth/local/register success",
    testString: "tester.testSignupSuccess(runNextTest);"
  },
  {
    text: "/api/me 200 guest",
    testString: "tester.testApiMeGuest(runNextTest);"
  },
  {
    text: "/api/me 200",
    testString: "tester.testApiMe(runNextTest);"
  },
  {
    text: "/api/geo 403",
    testString: "tester.testApiGeo403(runNextTest);"
  },
  {
    text: "/api/geo 200",
    testString: "tester.testApiGeo200(runNextTest);"
  },
  {
    text: "/api/message 403",
    testString: "tester.testApiMessage403(runNextTest);"
  },
  {
    text: "/api/message 400",
    testString: "tester.testApiMessage400(runNextTest);"
  },
  {
    text: "/api/message 201",
    testString: "tester.testApiMessage201(runNextTest);"
  },
  {
    text: "/avatar/default success",
    testString: "tester.testDefaultAvatar(runNextTest);"
  }
];