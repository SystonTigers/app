import type { Env } from '../env';

export const getLocale = async (req: any, env: Env) => {
  if (env.ALLOW_PUBLIC_APIS !== '1') {
    return new Response(
      JSON.stringify({ error: 'disabled' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  const ip = req.headers.get('cf-connecting-ip') || '';
  const r = await fetch(`https://ipinfo.io/${ip}/json`);

  return new Response(await r.text(), {
    headers: { 'content-type': 'application/json' },
  });
};
