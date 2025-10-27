import { DateTime } from 'luxon';

export const nowUTC = () => DateTime.utc();

export const mapLink = (req: any) => {
  const url = new URL(req.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const q = url.searchParams.get('q') || '';
  const g = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : `https://maps.google.com/?q=${encodeURIComponent(q)}`;
  return new Response(JSON.stringify({ url: g }), { headers: { 'content-type': 'application/json' } });
};
