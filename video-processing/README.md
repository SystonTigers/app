# Video processing (older tools, not used by the app)

Checked October 2026. Match highlights in the app don't use anything in this
folder: they are clips of the match's YouTube video made from Match Centre
taps, and the video to post is cut on the manager's phone (see `CLAUDE.md` →
Match highlights). Nothing here is deployed, built by CI or called by the
Worker. Keep it as reference for a future server-side editor, or delete it.

| Folder | What it is |
|---|---|
| `highlights_bot/` | Python auto-editor: cuts clips around events, zoom, slow-motion, captions, vertical crops. Its own README and phase notes describe it; its webhook mode was built for Make.com, which the system no longer uses. |
| `football-highlights-processor/` | Node/Docker job processor (queues, Google Drive storage) from the earlier Apps Script era. Not wired to the current backend. |

The server-side render pipeline (orchestrator Worker, GitHub Actions render
job, Node render script) was removed in October 2026: nothing triggered it
any more.

If you revive any of this, check it against the current API first: the
backend no longer has the queues, Make.com hooks or Google Sheets it expected.
