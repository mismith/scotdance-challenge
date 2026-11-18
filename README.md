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

Signing in uses ScotDance.app's `embed.js` (from `VITE_SCOTDANCE_URL`; in dev, `http://localhost:5279`). Its passes are signed with ScotDance.app's private key and checked by the `signInWithScotDance` function with the public keys in `functions/src/passKeys.ts` (no secret held here); on the emulators a fixed, public test key stands in. ScotDance.app's server calls `unlinkScotDance` with a Google service identity token in `data.service`. When a ScotDance.app account is deleted its server calls `deleteScotDanceAccount` (service proof): the sign-in and the person's pending compliment submissions are deleted and their name is taken off what they made; challenges, groups, participants, entries and approved compliments stay. Admin access also needs a verified email. `npm run test:e2e` adds test-only secret values to `functions/.secret.local` (git-ignored) if none are set.

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

- `COMPLIMENT_LINK_SECRET`: signs the emailed approve/reject links
- `TOOL_PASS_SECRET`: same value as ScotDance.app's. `LEGACY(tool-pass-secret)`: only for the old passes, accepted during the transition; delete with `grep LEGACY` once ScotDance.app signs with its key. Old compliment links signed with it still work until then
- `ADMIN_EMAILS`: comma-separated ScotDance.app account emails that are admins here and get every alert
- `POSTMARK_SERVER_TOKEN`: for flag and compliment emails, sent from `challenge@scotdance.app` (scotdance.app is a verified Postmark domain)

### Rolling out private-challenge rules

The rules only list challenges with `private == false`, and only list groups, participants and entries of a named challenge. Ship them in this order so the live app never breaks:

1. `firebase deploy --only firestore:indexes` and wait for the indexes to build
2. `firebase deploy --only functions`
3. `node functions/scripts/backfill.mjs` (dry run), then with `--write`: flags old challenges public and seeds approved compliments
4. Push to main (deploys the web app), then run the backfill again for challenges made in between
5. `firebase deploy --only firestore:rules`
