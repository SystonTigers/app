InboxBot.Tests.register('Unsubscribe detection', function () {
  var metadata = {
    from: 'newsletter@example.com',
    headers: {
      listUnsubscribe: '<mailto:unsubscribe@example.com>, <https://example.com/unsub>',
    },
  };
  var result = InboxBot.Unsubscribe.detect(metadata);
  if (!result || result.candidates.length !== 2) {
    throw new Error('Expected two unsubscribe candidates');
  }
});
