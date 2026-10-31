# scotdance-challenge

Motivate your progress — [challenge.scotdance.app](https://challenge.scotdance.app)

Vue 3 + Vite + TypeScript + Pinia + Tailwind 4 + Reka UI, on Firebase (Firestore, anonymous auth, Cloud Functions). The web app is on Firebase Hosting.

The app icon's source is `assets/Challenge.icon` (Icon Composer); `public/icon.svg` and `public/touchicon.png` (180×180, rendered with Playwright) are made from its `steps.svg`.

## Setup

Use Node 22 (`nvm use`): the Functions emulator doesn't run on newer Node.

```sh
npm install
```

## Develop

```sh
npm run dev       # emulators (auth, firestore, functions) + functions watcher + Vite
npm run dev:prod  # Vite against the live Firebase project (careful: writes are real)
```

Signing in uses ScotDance.app's `embed.js` (from `VITE_SCOTDANCE_URL`; in dev, `http://localhost:5279`). Its passes are checked by the `signInWithScotDance` function with the shared `TOOL_PASS_SECRET`; locally the emulator reads it from `functions/.secret.local` (git-ignored, same value as ScotDance.app's local secret). `npm run test:e2e` adds a test-only value there if none is set.

Local emulator data lives in `.firebase/emulator-data` (git-ignored) and is saved on exit.

## Check

```sh
npm run lint
npm run type-check
npm run build
npm run test:e2e  # Playwright against fresh emulators
```

## Deploy

```sh
npm run deploy                       # web app to Firebase Hosting (also runs on push to main)
firebase deploy --only firestore     # rules + indexes
firebase deploy --only functions
curl https://us-central1-scotdance-challenge.cloudfunctions.net/syncAggregateStatistics  # rebuild all stats, e.g. after adding one
```

Function secrets, set once each with `firebase functions:secrets:set <NAME>`:

- `TOOL_PASS_SECRET`: same value as ScotDance.app's
- `ADMIN_EMAILS`: comma-separated ScotDance.app account emails that are admins here and get every alert
- `POSTMARK_SERVER_TOKEN`: for flag and compliment emails, sent from `challenge@scotdance.app` (scotdance.app is a verified Postmark domain)

### Rolling out private-challenge rules

The rules only list challenges with `private == false`, and only list groups, participants and entries of a named challenge. Ship them in this order so the live app never breaks:

1. `firebase deploy --only firestore:indexes` and wait for the indexes to build
2. `firebase deploy --only functions`
3. `node functions/scripts/backfill.mjs` (dry run), then with `--write`: flags old challenges public and seeds approved compliments
4. Push to main (deploys the web app), then run the backfill again for challenges made in between
5. `firebase deploy --only firestore:rules`
