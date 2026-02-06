<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ntGgMBleI0Xk4DZHq3sFLwMK2mqOKsfn

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Local dev: set `VITE_GEMINI_API_KEY` in `.env.local` (note: `VITE_*` vars are exposed to the browser)
   - After editing `.env*` files, restart the dev server (Vite does not hot-reload env vars).
3. Run the app:
   `npm run dev`

## Deploy on Vercel (recommended: server-side Gemini key)

- Set `GEMINI_API_KEY` in Vercel Environment Variables (server-side, used by `/api/gemini`).
- Do NOT set `VITE_GEMINI_API_KEY` on Vercel for production deployments, because it will be bundled into the client and exposed.

## Firebase (Login + Cloud Sync)

This app can use Firebase Authentication + Firestore to enable real login and cloud sync for your trip.

### 1) Create Firebase project

1. Go to Firebase Console → Add project.
2. Project settings → General → Add app → Web app.
3. Copy the config values into a local env file.

Create `trippilot/.env` (or `.env.local`) by copying from `trippilot/.env.example`, then fill:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Restart `npm run dev` after editing env files.

### 2) Enable sign-in methods

Firebase Console → Authentication → Sign-in method:

- Enable **Google**
- (Optional) Enable **Anonymous**

### 3) Create Firestore

This app stores data in:

- **My Trips (private):** `users/{uid}/tripoptimizer_routePlans_v1/{planId}`
- **Community (public list):** `tripoptimizer_communityTrips_v1/{communityTripId}`

Recommended Firestore rules (start simple, but includes Community):

```js
rules_version = '2';
service cloud.firestore {
   match /databases/{database}/documents {
      // My Trips (private)
      match /users/{uid}/tripoptimizer_routePlans_v1/{planId} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      // Community (public read, author-only write/delete)
      match /tripoptimizer_communityTrips_v1/{postId} {
         allow read: if true;

         // Only signed-in users can create, and ownerUid must match the caller.
         allow create: if request.auth != null
           && request.resource.data.ownerUid == request.auth.uid;

         // Only the author can update/delete.
         allow update, delete: if request.auth != null
           && resource.data.ownerUid == request.auth.uid;
      }
   }
}
```

## Deploy on Vercel (recommended)

This project supports Vercel Functions so you can proxy routing providers (e.g. NAVITIME in Japan) without exposing API keys in the browser.

1. Create a new Vercel project
   - Set **Root Directory** to `trippilot/`.
2. Add environment variables (Project Settings → Environment Variables)
   - Optional (Google Directions Web Service fallback): `GOOGLE_MAPS_WEB_SERVICE_KEY`
   - Future (NAVITIME placeholder): add your `NAVITIME_*` vars once you have credentials.
3. Deploy.

### Route API

Vercel Function: `GET /api/route`

Query params:

- `from`: `lat,lng`
- `to`: `lat,lng`
- `mode`: `DRIVING|WALKING|TRANSIT` (optional)
- `country`: `JP` to force Japan provider (optional)
- `provider`: `navitime|google` (optional)

Notes:

- If `country=JP` (or both points are in Japan), the function prefers `navitime` (currently a stub).
- Outside Japan, the function can call Google Directions Web Service if `GOOGLE_MAPS_WEB_SERVICE_KEY` is set.
