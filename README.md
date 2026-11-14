# BattleZone

Tournament booking site (React + Firebase + Razorpay).

## Run it

```bash
npm install
cp .env.example .env     # then paste your keys into .env
npm start
```

## Firebase setup (one time)

1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started → Sign-in method**, enable:
   - **Email/Password**
   - **Google** (pick a support email, Save)
3. **Authentication → Settings → Authorized domains**: `localhost` is there by default.
   Add your real domain when you deploy (otherwise Google login fails with `unauthorized-domain`).
4. **Build → Firestore Database → Create database** (production mode). Open the **Rules** tab and paste `firestore.rules`.
5. **Build → Storage → Get started**. Paste `storage.rules` in its Rules tab.
6. **Project settings (gear) → Your apps → Web `</>`** → register app → copy the config values into `.env`.
7. Restart `npm start` after editing `.env`.

## Make yourself admin

Sign up once, then in Firestore → `users` → your document → set `role` to `admin`. Refresh the site; an **Admin** link appears.

## Payments

Put your Razorpay key id (`rzp_test_...`) in `.env` as `REACT_APP_RAZORPAY_KEY_ID`. Free tournaments (entry 0) work without it.
