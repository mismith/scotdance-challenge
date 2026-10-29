# scotdance-challenge

Motivate your progress — [challenge.scotdance.app](https://challenge.scotdance.app)

Vue 3 + Vite + TypeScript + Pinia + Vuetify 3, on Firebase (Firestore, anonymous auth, Cloud Functions). The web app is hosted on Cloudflare (static assets via Wrangler).

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
npm run deploy                       # web app to Cloudflare
firebase deploy --only firestore     # rules + indexes
firebase deploy --only functions
```
