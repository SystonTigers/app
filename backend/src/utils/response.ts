export const ok = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export const badRequest = (message: string) =>
  new Response(JSON.stringify({ error: message }), { status: 400, headers: { 'content-type': 'application/json' } });

export const notFound = (message: string) =>
  new Response(JSON.stringify({ error: message }), { status: 404, headers: { 'content-type': 'application/json' } });
