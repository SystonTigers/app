var InboxBot = InboxBot || {};

InboxBot.Tests = (function () {
  var registered = [];

  function register(name, fn) {
    registered.push({
      name: name,
      fn: fn,
    });
  }

  function runAll() {
    var results = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    registered.forEach(function (test) {
      try {
        test.fn();
        results.passed++;
      } catch (err) {
        results.failed++;
        results.errors.push(test.name + ': ' + err);
      }
    });
    var message = [
      'InboxBot test results',
      'Passed: ' + results.passed,
      'Failed: ' + results.failed,
    ].join('\n');
    if (results.failed) {
      message += '\nErrors:\n' + results.errors.join('\n');
      throw new Error(message);
    }
    Logger.log(message);
    return results;
  }

  return {
    register: register,
    runAll: runAll,
  };
})();

function runInboxBotTests() {
  return InboxBot.Tests.runAll();
}
