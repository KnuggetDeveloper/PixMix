# Complete Testing Guide - Authentication Flow

## Architecture Overview

```
User → Frontend App → Google Identity Token → Auth Service → Cloud Run Token → Backend Service
```

## How The Flow Works

### 1. User Opens the App
- Frontend initializes Firebase Auth
- User is signed in anonymously (no UI needed)
- App requests notification permissions

### 2. User Selects a Filter and Image
- Frontend needs to call the backend
- First, it needs authentication

### 3. Authentication Flow
- Frontend has a manual Google Identity token (from `gcloud auth print-identity-token`)
- Frontend calls auth service at `/auth/public-token` with the identity token
- Auth service validates the request (Cloud Run IAM) and generates a Cloud Run access token
- Frontend receives and caches this token (valid for 1 hour)

### 4. Image Processing
- Frontend sends image + filter + FCM token to backend with the Cloud Run token
- Backend validates the token
- Backend processes the image with OpenAI
- Backend sends a notification when complete
- Frontend receives the processed image URL

## Setup Requirements

### Prerequisites
1. Google Cloud Project with billing enabled
2. Firebase project linked to the Google Cloud project
3. OpenAI API key
4. Local development environment with Node.js

### Required APIs to Enable in Google Cloud Console
1. Cloud Run API
2. Cloud Storage API
3. Firebase Admin API
4. Identity and Access Management (IAM) API
5. Firebase Cloud Messaging API

## Step-by-Step Setup

### 1. Set Up Environment Variables

Create `.env.production` files for both services:

**gcloud-authentication/.env.production**
```env
# Firebase credentials (from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=pixmix-6a12e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pixmix-6a12e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Cloud Run service account (from Google Cloud Console > IAM > Service Accounts)
CLOUD_RUN_SERVICE_ACCOUNT_EMAIL=493914627855-compute@developer.gserviceaccount.com
CLOUD_RUN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**filter-backend/.env.production**
```env
# OpenAI API key
OPENAI_API_KEY=sk-...

# Firebase credentials (same as auth service)
FIREBASE_PROJECT_ID=pixmix-6a12e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pixmix-6a12e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Google Cloud Storage
GCS_BUCKET_NAME=pixmix-6a12e.firebasestorage.app
```

### 2. Generate a Google Identity Token

Since your organization has domain-restricted sharing, you need to authenticate to access Cloud Run services:

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login to your Google account
gcloud auth login

# Set your project
gcloud config set project pixmix-6a12e

# Generate an identity token
gcloud auth print-identity-token
```

Copy this token - you'll use it in the frontend for now.

### 3. Deploy the Services

**Deploy gcloud-authentication:**
```bash
cd gcloud-authentication

# Build the project
npm run build

# Deploy to Cloud Run (authenticated)
gcloud run deploy gcloud-authentication \
  --source . \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated
```

**Deploy filter-backend:**
```bash
cd filter-backend

# Build the project
npm run build

# Deploy to Cloud Run (can be public since it validates tokens)
gcloud run deploy filter-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Set Up IAM Permissions

```bash
# Allow the auth service to be invoked by your account
gcloud run services add-iam-policy-binding gcloud-authentication \
  --member="user:your-email@company.com" \
  --role="roles/run.invoker" \
  --region=us-central1

# Allow the service accounts to access necessary resources
gcloud projects add-iam-policy-binding pixmix-6a12e \
  --member="serviceAccount:firebase-adminsdk-fbsvc@pixmix-6a12e.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 5. Configure the Frontend

**Update filter-frontend/services/authService.ts:**
```typescript
// Replace with your identity token
const GOOGLE_IDENTITY_TOKEN = "eyJhbGciOiJSUzI1NiIs..."; // From gcloud auth print-identity-token

async function getGoogleIdentityToken(): Promise<string> {
  return GOOGLE_IDENTITY_TOKEN;
}
```

**Update filter-frontend/scripts/api.ts with your URLs:**
```typescript
const BACKEND_URL = "https://filter-backend-493914627855.us-central1.run.app";
```

### 6. Test the Complete Flow

**Local Testing First:**

1. Run the auth service locally:
```bash
cd gcloud-authentication
npm run dev
# Runs on http://localhost:8080
```

2. Run the backend service locally:
```bash
cd filter-backend
npm run dev
# Runs on http://localhost:8080
```

3. Test the auth flow with curl:
```bash
# Get a Cloud Run token
curl -H "Authorization: Bearer YOUR_IDENTITY_TOKEN" \
  http://localhost:8080/auth/public-token

# Use the token to call the backend
curl -X POST \
  -H "Authorization: Bearer CLOUD_RUN_TOKEN" \
  -F "image=@test.jpg" \
  -F "filter=Ghibli" \
  http://localhost:8080/generate
```

**Production Testing:**

1. Get a fresh identity token:
```bash
gcloud auth print-identity-token
```

2. Test the auth service:
```bash
curl -H "Authorization: Bearer YOUR_IDENTITY_TOKEN" \
  https://gcloud-authentication-493914627855.us-central1.run.app/auth/public-token
```

3. Test the complete flow from the frontend app

## Debugging Common Issues

### 1. Authentication Failures
- Check if the identity token is fresh (they expire after 1 hour)
- Verify IAM permissions are correctly set
- Check Cloud Run logs: `gcloud run logs read --service=gcloud-authentication`

### 2. Image Processing Failures
- Verify OpenAI API key is valid
- Check file size limits (50MB max)
- Ensure the image format is supported (PNG, JPG)

### 3. Notification Issues
- Verify FCM is properly configured in Firebase Console
- Check if the app has notification permissions
- Verify the FCM token is being sent correctly

## Monitoring and Logs

View logs for debugging:
```bash
# Auth service logs
gcloud run logs read --service=gcloud-authentication --region=us-central1

# Backend service logs
gcloud run logs read --service=filter-backend --region=us-central1
```

## Security Checklist

- [ ] Never expose service account private keys
- [ ] Rotate the manual identity token regularly
- [ ] Monitor API usage in Google Cloud Console
- [ ] Set up alerts for unusual activity
- [ ] Implement rate limiting in production

## Future Improvements

1. **Replace Manual Token**: Build a token provider service
2. **Add Monitoring**: Set up Cloud Monitoring and alerts
3. **Implement Caching**: Add Redis for token caching
4. **Add Rate Limiting**: Protect against abuse
5. **Enhanced Error Handling**: Better error messages for users

## Testing Checklist

- [ ] Generate fresh Google Identity token
- [ ] Deploy both services to Cloud Run
- [ ] Set up IAM permissions correctly
- [ ] Test auth service endpoint
- [ ] Test backend image processing
- [ ] Verify notifications work
- [ ] Check error handling
- [ ] Monitor logs for issues