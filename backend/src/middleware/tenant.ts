export const withTenant = (req: any) => {
  req.tenant = req.headers.get('x-tenant') || new URL(req.url).searchParams.get('tenant') || 'default';
};
