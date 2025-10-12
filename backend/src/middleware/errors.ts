export const jsonError = (err: any) =>
  new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
    status: err.message === 'Unauthorized' ? 401 : 500,
    headers: { 'content-type': 'application/json' }
  });
