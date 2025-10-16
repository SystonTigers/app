InboxBot.Tests.register('ML classifier finance detection', function () {
  var metadata = {
    subject: 'Invoice for October services',
    bodyPreview: 'Please find attached the invoice for your subscription.',
    headers: {
      listUnsubscribe: null,
    },
    messageId: 'test',
  };
  var result = InboxBot.ML.classify(metadata);
  if (!result || result.category !== 'Finance') {
    throw new Error('Expected Finance classification');
  }
});
