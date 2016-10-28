var tests = [
  {
    text: "project url is valid",
    testString: "testManager.testProjectUrl(runNextTest);"
  },
  {
    text: "/ success",
    testString: "testManager.testIndexPage(runNextTest);"
  },
  {
    text: "/auth/logout success",
    testString: "testManager.testLogout(runNextTest);"
  },
  {
    text: "/auth/local fail, bad username",
    testString: "testManager.testSignInBadUsername(runNextTest);"
  },
  {
    text: "/auth/local fail, bad password",
    testString: "testManager.testSignInBadPassword(runNextTest);"
  },
  {
    text: "/auth/local fail, no params",
    testString: "testManager.testSignInNoParams(runNextTest);"
  },
  {
    text: "/auth/local success",
    testString: "testManager.testSignInSuccess(runNextTest);"
  },
  {
    text: "/auth/local/register fail, username exists",
    testString: "testManager.testSignupUsernameExists(runNextTest);"
  },
  {
    text: "/auth/local/register fail, bad username",
    testString: "testManager.testSignupBadUsername(runNextTest);"
  },
  {
    text: "/auth/local/register fail, bad password",
    testString: "testManager.testSignupBadPassword(runNextTest);"
  },
  {
    text: "/auth/local/register fail, no params",
    testString: "testManager.testSignupNoParams(runNextTest);"
  },
  {
    text: "/auth/local/register success",
    testString: "testManager.testSignupSuccess(runNextTest);"
  },
  {
    text: "/api/me 200 guest",
    testString: "testManager.testApiMeGuest(runNextTest);"
  },
  {
    text: "/api/me 200",
    testString: "testManager.testApiMe(runNextTest);"
  },
  {
    text: "/api/geo 403",
    testString: "testManager.testApiGeo403(runNextTest);"
  },
  {
    text: "/api/geo 200",
    testString: "testManager.testApiGeo200(runNextTest);"
  },
  {
    text: "/api/message 403",
    testString: "testManager.testApiMessage403(runNextTest);"
  },
  {
    text: "/api/message 400",
    testString: "testManager.testApiMessage400(runNextTest);"
  },
  {
    text: "/api/message 201",
    testString: "testManager.testApiMessage201(runNextTest);"
  },
  {
    text: "/avatar/default success",
    testString: "testManager.testDefaultAvatar(runNextTest);"
  }
];