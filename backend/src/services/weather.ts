export const getWeather = async (req: any) => {
  const u = new URL(req.url);
  const lat = u.searchParams.get('lat');
  const lon = u.searchParams.get('lon');

  if (!lat || !lon) {
    return new Response(
      JSON.stringify({ error: 'lat/lon required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
  );

  return new Response(await r.text(), {
    headers: { 'content-type': 'application/json' },
  });
};
