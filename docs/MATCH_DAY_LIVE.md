# Match day: live video and match alerts

Checked against the code in September 2026.

Parents who can't get to a match can watch it live in the app and get goals
and the score as notifications. Parents at the ground get no notifications.
It costs nothing to run: the video is hosted by YouTube and notifications use
the free Web Push and Expo push services.

## How it works

| Piece | Where |
|---|---|
| Today's matches for the app (`GET /api/v1/matchday`) | `backend/src/routes/matchDay.ts`, `services/matchDay.ts` |
| Live video: pasted link or found on the club's YouTube channel | `services/stream/detect.ts`, `services/stream/youtube.ts`, `routes/stream.ts` |
| Match alerts (queue, undo window, who gets them) | `services/matchAlerts/` |
| Sending: Web Push (web app) and Expo (phone app) | `services/push/` |
| App: pop-up, location check, alert taps | `mobile/src/components/live/MatchDayHost.tsx`, `context/MatchDayContext.tsx` |
| App: video + "I'm at the match" on Live Match | `components/live/MatchDayPanel.tsx` |
| App: stream link + "the ground is here" in Match Centre | `components/live/StreamLinkCard.tsx` |
| Website: connect YouTube (Settings) | `web-app/src/components/LiveVideoSettings.tsx` |
| Web app notifications (service worker) | `mobile/web/sw.js` |

- **Alerts**: kick-off, our goals, their goals, half time, red cards and full
  time. They wait for the club's undo window (1 minute, the same setting as
  automatic posts), so an undone mistake never goes out; one that already went
  out is followed by a "Correction" with the right score. The once-a-minute
  cron sends them. Whoever recorded the update isn't notified.
- **At the ground**: from an hour before kick-off to 2½ hours after, the app
  compares the phone's location with the ground's (500 m) **on the phone** and
  sends only yes/no. Location never reaches the server. "I'm at the match" on
  Live Match overrides the phone. The ground's location comes from a UK
  postcode in the fixture's venue (postcodes.io), or a manager taps "The ground
  is here" in Match Centre. With no ground location, everyone gets alerts.
- **Live video**: a manager pastes the YouTube link in Match Centre, or the
  club connects its YouTube channel on the website (Settings → Live match
  video) and anything live on it from 45 minutes before kick-off is picked up
  within a minute. People away from the ground get "🔴 Live now" once per match
  and the video pops up in the app. After the stream ends it stays on Live Match
  to watch back.

## One-off setup (production)

1. **Web Push keys** (needed for any notifications in the web app):
   `cd backend && npm run push:keys:prod`. Run once: new keys mean everyone
   has to turn alerts on again.
2. **Deploy**: `npm run db:migrate:prod` (adds `0013_match_day.sql`), then
   `npm run deploy:prod`, then `cd ../mobile && npm run web:deploy` and
   `cd ../web-app && npm run cf:deploy`.
3. **YouTube connection** (optional; pasting links works without it):
   - Google Cloud console → new project → enable **YouTube Data API v3**.
   - OAuth consent screen: External, add the scope `.../auth/youtube.readonly`,
     then **Publish app** (in "Testing" Google expires the connection after 7
     days). Unverified is fine for this: admins see a warning screen once.
   - Credentials → OAuth client ID (Web application). Authorised redirect URI:
     `https://app-production.team-platform-2025.workers.dev/api/v1/stream/youtube/callback`
   - `npx wrangler secret put YT_CLIENT_ID --env production` and
     `npx wrangler secret put YT_CLIENT_SECRET --env production`.
   - On the website: Settings → Live match video → Connect YouTube, signing in
     with the Google account that owns the club's channel.
4. **Phone app (store builds only)**: `npx eas init` in `mobile/` so Expo
   push tokens work. The installable web app doesn't need this.

## The club's YouTube channel

- Verify the channel and switch on live streaming at least a day before the
  first match: YouTube can take 24 hours to enable it.
- In YouTube Studio set the default stream to **Unlisted** (not in search, but
  plays in the app), **No, it's not made for kids** (the audience is parents;
  "made for kids" turns off features), and **Allow embedding** on. If embedding
  is off the app shows "Watch on YouTube" instead of playing it.
- Only stream matches where parents have agreed to filming (FA safeguarding
  guidance). Turn chat off or moderate it.

## Camera setup (XbotGo Chameleon and Falcon)

Both stream from the XbotGo app to YouTube or any RTMP address for free.

1. YouTube Studio → Create → Go live → Stream: copy the **Stream URL** and
   **Stream key**. Create one reusable key per camera ("Chameleon", "Falcon").
2. XbotGo app → Live → Platform Streaming → **RTMP** → paste the URL and key.
   RTMP means nobody signs in to the club's Google account on a volunteer's phone.
3. Pick **720p** unless the ground has a strong signal (about 1.5 GB an hour
   of mobile data, against about 3 GB at 1080p). Bring a power bank.
4. On the day: start the stream. If YouTube is connected, the app picks it up
   within a minute; otherwise copy the stream's link (Share → Copy link) and
   paste it in Match Centre → Live video.
5. Don't pause the stream mid-match: XbotGo notes pausing can leave a black screen.

## Parents: turning alerts on

- **Web app on iPhone**: add it to the Home Screen first (Share → Add to Home
  Screen), open it from there, then tap **Turn on alerts** (Apple only allows
  notifications for installed web apps, iOS 16.4 and later).
- **Android / desktop**: tap **Turn on alerts** on the match day card or in
  Push Notifications.
- On match day the app asks once to use location, so it can keep quiet at the
  ground. Saying no just means alerts arrive even at the ground.

## Checking it works

- `cd backend && npm test`: `tests/e2e/match-alerts-journey.e2e.test.ts` runs
  a match (alerts skip the parent at the ground and the coach; an undone goal
  never notifies; a correction follows one that went out), the pasted link and
  the YouTube channel detection.
- Logs (`npx wrangler tail --env production`): `match_alert` (sent, device
  counts), `stream_detect` (failures), `youtube_connect`, `venue_geocode`.
