# Development & Deployment Guide

This guide covers local development setup, environment configuration, and deployment options.

## Prerequisites

- Node.js 18+
- Google Cloud API keys (Gemini, Maps)
- (Optional) Firebase project for login & cloud sync

## Local Development

### 1. Install dependencies

```bash
cd trippilot
npm install
```

### 2. Configure environment

Copy the example file and fill in your API keys:

```bash
cp .env.example .env.local
```

Required variables:

- `VITE_GEMINI_API_KEY` - Your Gemini API key (exposed to browser in dev mode)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps JavaScript API key

> **Note:** After editing `.env*` files, restart the dev server (Vite does not hot-reload env vars).

### 3. Run the app

```bash
npm run dev
# Opens http://localhost:5173
```

## Deploy on Vercel (Recommended)

### Server-side Gemini Key (Secure)

For production, use server-side API keys to avoid exposing them in the browser:

1. Create a new Vercel project with **Root Directory** set to `trippilot/`
2. Add environment variables in Project Settings:
   - `GEMINI_API_KEY` - Server-side, used by `/api/gemini` proxy
   - `VITE_GOOGLE_MAPS_API_KEY` - Client-side Maps key
   - (Optional) `GOOGLE_MAPS_WEB_SERVICE_KEY` - For server-side routing

> **Important:** Do NOT set `VITE_GEMINI_API_KEY` on Vercel for production - it will be bundled into the client and exposed.

### Route API

The Vercel Function at `GET /api/route` supports:

| Parameter  | Description                          |
| ---------- | ------------------------------------ |
| `from`     | Origin coordinates `lat,lng`         |
| `to`       | Destination coordinates `lat,lng`    |
| `mode`     | `DRIVING`, `WALKING`, or `TRANSIT`   |
| `country`  | Set to `JP` to prefer Japan provider |
| `provider` | Force `navitime` or `google`         |

## Firebase Setup (Optional)

Firebase enables user authentication and cloud sync for saved trips.

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Project Settings > General > Add app > Web app
3. Copy the config values

### 2. Enable Sign-in Methods

Firebase Console > Authentication > Sign-in method:

- Enable **Google**
- (Optional) Enable **Anonymous**

### 3. Add Environment Variables

Add these to Vercel Environment Variables (and `.env.local` for local dev):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4. Configure Firestore

The app stores data in these collections:

- **My Trips (private):** `users/{uid}/tripoptimizer_routePlans_v1/{planId}`
- **Community (public):** `tripoptimizer_communityTrips_v1/{communityTripId}`

Recommended Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // My Trips (private)
    match /users/{uid}/trippilot_routePlans_v1/{planId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Community (public read, author-only write/delete)
    match /trippilot_communityTrips_v1/{postId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.ownerUid == request.auth.uid;
    }
  }
}
```

## Git Workflow (For Collaborators)

### Branching Strategy

- Create feature branches: `feature-<name>` or `fix-<name>`
- Merge into `develop` after testing

```bash
# Create feature branch
git checkout -b feature-yourname

# Make changes and commit
git add .
git commit -m "feat: your feature description"
git push origin feature-yourname

# Merge to develop
git checkout develop
git pull origin develop
git merge feature-yourname
git push origin develop
```
