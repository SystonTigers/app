export const withJSON = async (req: any) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try { req.json = await req.json(); } catch { req.json = {}; }
  }
};
