# DealPost Frontend

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create env file:

```bash
copy .env.example .env
```

3. Configure API and Firebase keys in `.env`:

```bash
VITE_API_URL=http://localhost:5000/api

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
```

4. Run frontend:

```bash
npm run dev
```

## Auth Flow

- Email/password: SQL backend via `/api/auth/register` and `/api/auth/login`
- Google login: Firebase Web SDK (popup) -> send Firebase ID token to `/api/auth/firebase`
- Phone OTP login/signup: Firebase Phone Auth -> send Firebase ID token to `/api/auth/firebase`

The backend verifies Firebase ID tokens using Firebase Admin SDK and issues DealPost JWT for app sessions.
