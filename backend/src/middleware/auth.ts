export const requireAuth = (req: any) => {
  const auth = req.headers.get('authorization');
  if (!auth) throw new Error('Unauthorized');
  // Optionally verify Supabase JWT here.
};
