const TPL = [
  "{TEAM} — Built Different",
  "All {CITY}. All Heart.",
  "{TEAM}: Grit. Pride. Relentless.",
  "No Fear. Just {TEAM}.",
  "Born to Roar — {TEAM}",
  "{TEAM} — Unstoppable Force",
  "One {CITY}. One {TEAM}.",
  "{TEAM}: Where Legends Are Made",
  "Fearless. Focused. {TEAM}.",
  "Pride of {CITY} — {TEAM}",
  "{TEAM} — Victory is Our Only Option",
  "Heart of {CITY}, Soul of {TEAM}",
  "{TEAM}: Champions by Choice",
  "Relentless {TEAM}, Limitless Potential",
  "Born in {CITY}, Bred for Glory — {TEAM}",
];

export const getSlogans = async (req: any) => {
  const u = new URL(req.url);
  const team = u.searchParams.get('team') || 'Your Team';
  const city = u.searchParams.get('city') || team.split(' ')[0];

  // Generate 5 random slogans
  const picks = Array.from({ length: 5 }).map((_, i) =>
    TPL[(Math.random() * TPL.length) | 0]
      .replaceAll('{TEAM}', team)
      .replaceAll('{CITY}', city)
  );

  return new Response(
    JSON.stringify({ options: picks }),
    { headers: { 'content-type': 'application/json' } }
  );
};
