export const getConfig = async (req: any, env: Env) => {
  const key = `team:${req.tenant}:config`;
  const cfg = await env.KV.get(key, 'json');
  return new Response(JSON.stringify(cfg || { plan: 'starter', features: {} }), { headers: { 'content-type':'application/json' } });
};
