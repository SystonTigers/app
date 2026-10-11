# Notes for the reviewer: Boost Huddle privacy policy and terms

These drafts replace the live pages at boosthuddle-legal.pages.dev. They were written from the product as it actually works (September 2026) and are **not legal advice**. Please review them before they are published.

## What Boost Huddle is

A multi-club platform for UK grassroots football: each club gets an installable web app for parents, players and coaches, and a public club web page. Many players are children (for example under-16 teams). Clubs pay a monthly subscription after a free trial.

## Main changes from the current live pages

- **UK law, not US law.** The live pages are built around COPPA (a US law) and a California section. The drafts are based on UK GDPR, the Data Protection Act 2018 and the ICO Children's Code.
- **Controller and processor roles.** The live pages treat Boost Huddle as responsible for everything. The drafts make the club the controller of its members' and players' data, with Boost Huddle as processor under Article 28 Data Processing Terms (Part C of the terms). Boost Huddle is the controller for club-owner accounts, billing and security.
- **Removed claims that aren't true:**
  - location tracking (the app doesn't collect location);
  - AI video analysis consent;
  - "verifiable parental consent" (there is no such process);
  - analytics tracking;
  - emails at boosthuddle.com (there is no domain yet).
- **Added what is true:**
  - exactly what the public club page shows about children;
  - how account deletion works (instant, in App Settings);
  - the providers used;
  - Man of the Match voting rules;
  - a plain-language summary for young players.

## Update, October 2026: adult teams and newer features

The privacy policy draft was updated to match the product as it is now:

- **Adult teams.** Clubs are now either junior or adult teams. For adult teams, photos and videos are used unless the player says no in the app (opt-out), instead of needing a parent's yes. The draft gives the lawful basis as the club's legitimate interests, with the right to object made easy (one switch in the app, from then on photos aren't shown publicly). Players answer for themselves, and fixtures, kick-off times and grounds are public. New sections: 6 (Adult teams) and a short version for adult players.
- **Medical notes and allergies** (signing on, optional) are now described. They are special category health data, which the earlier draft said the service didn't collect.
- **"At the match" location check:** done on the phone; only yes/no is sent. The earlier draft said location isn't collected; the draft now explains this.
- **Also added:** Facebook/Instagram posting and YouTube live streams (Meta and Google as independent recipients), push notification services, the fixture-photo reader (Cloudflare, photo not kept), things done only on the device (photo cut-outs, highlight videos), and the 90-day fixture email log.

**Please confirm:**

- Legitimate interests (with opt-out) is a sound basis for adult players' photos and video, including on social media, and whether clubs should also mention it in their own sign-up or membership terms.
- The Article 9 condition for medical notes (explicit consent, plus vital interests in an emergency), and whether clubs need an appropriate policy document.
- A retention period for signing-on forms.

## Decisions for the owner

These have to be settled before publishing. Each one is marked in [brackets] in the drafts.

1. **Operator identity.** This means a legal name, a postal address and a contact email (ideally on the new domain). Is this a sole trader or a limited company? Is there an ICO data protection fee registration? Most organisations processing personal data need one.
2. **Retention periods.** These are the club deletion window (90 days proposed), deleting inactive accounts (2 years proposed) and how long logs are kept.
3. **Notice periods and numbers.** These cover the trial length (currently 14 days in the product), price-change and sub-processor notice (30 days proposed), the breach notice to clubs (48 hours proposed), the liability cap (£100 floor proposed) and the failed-payment grace period (14 days proposed).
4. **VAT status.**
5. **Club payments and shop.** Confirm the money flow and any platform fee before these features are switched on.

## Product gaps to fix before launch

These were found while writing the drafts. The owner decides on each; the drafts describe the product as it is now.

1. **Age check at registration: done.** Sign-up in the app now asks people to confirm they're 13 or over, or a parent or carer, and the time of that confirmation is recorded.
2. **Children on the public club page: done.** Players now appear as first name and initial with no photos by default. A club can turn on full names and photos in its settings.
3. **No club-closure or export process.** The drafts promise deletion within 90 days of closure and a chance to download data first. Today this would be done by hand. A self-service export and close option should be built before there are many clubs.
4. **Inactive-account deletion** (if 2 years is adopted) needs a scheduled job and a warning email.
5. **Emergency contact data** is visible to club staff (owner, admin, manager, coach) in their club. Consider limiting it to named roles.
6. **Medical notes consent tick (new, October 2026).** The signing-on form takes medical notes and allergies but has no separate explicit consent tick for them. Add an "I agree to the club keeping these medical notes so the coaches can look after [name]" tick, required whenever medical notes or allergies are filled in, before the policy is published.
7. **Signing-on retention (new).** Forms are kept per season with no automatic deletion. Decide a period and add a clean-up job or a "delete past seasons" option.

## For the reviewer to confirm

- The transfer mechanism for each provider (Cloudflare, Resend, Stripe, Printify).
- Whether legitimate interests is the right basis for clubs to put forward for player data, and whether a template club privacy notice should be provided.
- Consumer-law wording in Part A, since parents use the service free of charge through their club.
- That the Part C Data Processing Terms meet UK GDPR Article 28(3) in full.
- Whether any children's-data processing needs a DPIA (data protection impact assessment). Boost Huddle's own DPIA is very likely advisable given the scale of children's data.
