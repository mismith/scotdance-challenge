# scotdance-challenge

Motivate your progress — [challenge.scotdance.app](https://challenge.scotdance.app)

Vue 3 + Vite + TypeScript + Pinia + Vuetify 3, on Firebase (Firestore, anonymous auth, Cloud Functions). The web app is on Firebase Hosting.

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
firebase functions:secrets:set TOOL_PASS_SECRET   # once; same value as ScotDance.app's
firebase deploy --only functions
```
