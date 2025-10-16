InboxBot.Tests.register('Utils conversions', function () {
  if (InboxBot.Utils.toBoolean('yes') !== true) {
    throw new Error('Expected yes -> true');
  }
  if (InboxBot.Utils.toBoolean('no') !== false) {
    throw new Error('Expected no -> false');
  }
  if (InboxBot.Utils.toNumber('10', 0) !== 10) {
    throw new Error('Expected "10" -> 10');
  }
  if (InboxBot.Utils.toNumber('abc', 5) !== 5) {
    throw new Error('Fallback number not respected');
  }
});
