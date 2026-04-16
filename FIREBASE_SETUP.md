# Firebase Setup Guide

This guide will help you set up Firebase for the TUGGA IT SOLUTIONS NIN portal.

## Prerequisites

- Google account
- Modern web browser
- Internet connection

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or "Create a project"
3. Enter project name: Choose a unique name since "tugga-nin" already exists
   
   **Suggested names:**
   - `tugga-nin-portal-v2`
   - `tugga-identity-services`
   - `tugga-nin-app`
   - `majia-nin-portal`
   - Or any unique name you prefer
   
4. Click "Continue"
5. Disable Google Analytics (optional) or configure it
6. Click "Create project"
7. Wait for project creation to complete
8. Click "Continue" to go to project dashboard

## Step 2: Enable Authentication

1. In the Firebase Console, click "Authentication" in the left sidebar
2. Click "Get started"
3. Click on "Email/Password" in the Sign-in method tab
4. Toggle "Enable" to ON
5. Click "Save"

## Step 3: Enable Firestore Database

1. In the Firebase Console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in **production mode**" (we'll add security rules later)
4. Click "Next"
5. Choose your Cloud Firestore location (select closest to your users)
6. Click "Enable"
7. Wait for database creation to complete

## Step 4: Enable Storage

1. In the Firebase Console, click "Storage" in the left sidebar
2. Click "Get started"
3. Click "Next" (keep default security rules for now)
4. Choose your storage location (same as Firestore)
5. Click "Done"

## Step 5: Get Firebase Configuration

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Enter app nickname: `TUGGA NIN Portal`
6. Check "Also set up Firebase Hosting" (optional)
7. Click "Register app"
8. Copy the `firebaseConfig` object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

9. Click "Continue to console"

## Step 6: Update Firebase Configuration in Code

1. Open `tugga-nin/js/firebase-config.js`
2. Find the `firebaseConfig` object (around line 23)
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",           // Replace this
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",   // Replace this
  projectId: "YOUR_ACTUAL_PROJECT_ID",     // Replace this
  storageBucket: "YOUR_ACTUAL_BUCKET",     // Replace this
  messagingSenderId: "YOUR_ACTUAL_ID",     // Replace this
  appId: "YOUR_ACTUAL_APP_ID"              // Replace this
};
```

4. Save the file

## Step 7: Test Firebase Connection

1. Open your application in a web browser
2. Open the browser console (F12 or Right-click → Inspect → Console)
3. Look for these messages:
   - ✅ "Firebase app initialized"
   - ✅ "Firebase Auth initialized"
   - ✅ "Firestore initialized"
   - ✅ "Firebase Storage initialized"
   - ✅ "Firebase connected successfully"

4. If you see errors, check:
   - Firebase config values are correct
   - No typos in the configuration
   - Internet connection is working
   - Firebase services are enabled in console

## Step 8: Create Initial Admin User

Since Firebase Authentication is now enabled, you need to create an admin user:

### Option A: Using Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter email: `admin@tugga.com` (or your preferred email)
4. Enter password: (choose a strong password)
5. Click "Add user"
6. Note the User UID

### Option B: Using the Application
1. Open your application
2. Go to the registration page
3. Register with your admin email
4. The user will be created in Firebase Auth

### Set Admin Role in Firestore
1. Go to Firebase Console → Firestore Database
2. Click "Start collection"
3. Collection ID: `users`
4. Click "Next"
5. Document ID: (use the User UID from Authentication)
6. Add fields:
   - `email`: (string) admin@tugga.com
   - `name`: (string) Admin User
   - `role`: (string) admin
   - `wallet`: (number) 0
   - `status`: (string) Active
   - `registeredAt`: (timestamp) (current time)
7. Click "Save"

## Step 9: Deploy Security Rules (After Implementation)

After all code is implemented, you'll need to deploy security rules:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore
# - Storage
# - Choose your Firebase project

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Troubleshooting

### "Firebase not configured" warning
- Check that you've replaced ALL placeholder values in firebase-config.js
- Ensure apiKey is not "YOUR_API_KEY"

### "Invalid API key" error
- Double-check your API key from Firebase Console
- Make sure there are no extra spaces or quotes

### "Network request failed" error
- Check your internet connection
- Check if Firebase services are down: https://status.firebase.google.com

### "Permission denied" errors
- Security rules haven't been deployed yet (this is normal during development)
- You can temporarily use test mode rules in Firebase Console

### Application still uses localStorage
- Clear browser cache and reload
- Check console for Firebase initialization messages
- Verify firebaseConfig.apiKey !== "YOUR_API_KEY"

## Next Steps

After Firebase is set up:
1. Test user registration and login
2. Test wallet funding
3. Test service requests
4. Deploy security rules
5. Set up GitHub Actions for deployment

## Support

If you encounter issues:
1. Check Firebase Console for service status
2. Review browser console for error messages
3. Verify all configuration steps were completed
4. Check Firebase documentation: https://firebase.google.com/docs

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit Firebase config to public repositories** if it contains sensitive data
2. **Always deploy security rules** before going to production
3. **Use environment variables** for sensitive configuration in production
4. **Enable App Check** for additional security (optional but recommended)
5. **Monitor Firebase usage** to detect unusual activity

## Cost Considerations

Firebase offers a generous free tier (Spark Plan):
- **Authentication**: 50,000 monthly active users (free)
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day (free)
- **Storage**: 5 GB storage, 1 GB/day downloads (free)

For production use, consider upgrading to Blaze Plan (pay-as-you-go) for better limits.

Monitor your usage at: Firebase Console → Usage and billing
