export const getFX = async (req: any) => {
  const u = new URL(req.url);
  const from = u.searchParams.get('from') || 'GBP';
  const to = u.searchParams.get('to') || 'EUR';

  const r = await fetch(
    `https://api.exchangerate.host/convert?from=${from}&to=${to}`
  );

  return new Response(await r.text(), {
    headers: { 'content-type': 'application/json' },
  });
};
