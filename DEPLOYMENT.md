# Deployment Guide — TUGGA NIN Portal

## Overview

This guide covers deploying the TUGGA NIN Portal to GitHub Pages with automatic CI/CD via GitHub Actions. Every push to the `main` branch triggers an automatic deployment.

---

## Prerequisites

- GitHub account
- Firebase project configured (see `FIREBASE_FREE_PLAN_SETUP.md`)
- Git installed on your computer

---

## Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: Choose a unique name (e.g. `tugga-nin-portal`)
3. **Visibility**: Set to **Public** (required for free GitHub Pages)
4. **Do NOT** initialize with README (you already have files)
5. Click **"Create repository"**

---

## Step 2: Push Your Code to GitHub

Open a terminal in the `tugga-nin` folder and run:

```bash
git init
git add .
git commit -m "Initial commit: TUGGA NIN Portal with Firebase integration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values.

---

## Step 3: Add Firebase Secrets to GitHub

This keeps your Firebase credentials secure — they are never stored in code.

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each of the following:

| Secret Name | Where to Find It |
|-------------|-----------------|
| `FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps → Config |
| `FIREBASE_AUTH_DOMAIN` | Same location (e.g. `your-project.firebaseapp.com`) |
| `FIREBASE_PROJECT_ID` | Same location (e.g. `your-project-id`) |
| `FIREBASE_STORAGE_BUCKET` | Same location (e.g. `your-project.appspot.com`) |
| `FIREBASE_MESSAGING_SENDER_ID` | Same location |
| `FIREBASE_APP_ID` | Same location |
| `PAYSTACK_PUBLIC_KEY` | [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API Keys |

> **Tip**: Copy each value exactly from Firebase Console — no quotes needed.

---

## Step 4: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **"Deploy from a branch"**
4. Branch: select **`gh-pages`** → folder: **`/ (root)`**
5. Click **Save**

> The `gh-pages` branch is created automatically by the GitHub Actions workflow on first deploy.

---

## Step 5: Trigger First Deployment

The workflow runs automatically on every push to `main`. To trigger manually:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click **"Deploy TUGGA NIN Portal"** workflow
4. Click **"Run workflow"** → **"Run workflow"**

---

## Step 6: Verify Deployment

After the workflow completes (usually 2–3 minutes):

1. Go to **Settings** → **Pages**
2. Your site URL will be shown: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
3. Open the URL in your browser
4. Test login and registration

---

## Deployment Workflow Details

The GitHub Actions workflow (`.github/workflows/deploy.yml`) does the following on every push to `main`:

1. ✅ Checks out the code
2. ✅ Sets up Node.js and installs dependencies
3. ✅ Runs tests (`npm test`)
4. ✅ Validates HTML and JS files exist
5. ✅ Injects Firebase config from GitHub Secrets
6. ✅ Injects Paystack key from GitHub Secrets
7. ✅ Adds deployment timestamp
8. ✅ Deploys to `gh-pages` branch
9. ✅ App is live at GitHub Pages URL

---

## Deploying Security Rules

After setting up Firebase CLI, deploy the security rules:

```bash
# Install Firebase CLI (one time)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the tugga-nin folder
firebase init

# Select: Firestore, Storage
# Choose your Firebase project
# Use existing files when prompted

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

## Making Updates

To update the live app:

```bash
# Make your changes, then:
git add .
git commit -m "Your update description"
git push origin main
```

GitHub Actions will automatically deploy within 2–3 minutes.

---

## Troubleshooting

### Workflow fails at "Run tests"
- Check `package.json` has a `test` script
- Or add `--if-present` flag to skip if no tests

### Firebase config not injected
- Verify all 6 Firebase secrets are added in GitHub Settings
- Secret names must match exactly (case-sensitive)
- Re-run the workflow after adding secrets

### GitHub Pages shows 404
- Ensure `gh-pages` branch exists (created after first successful deploy)
- Check Settings → Pages is set to `gh-pages` branch
- Wait 5–10 minutes after first deploy for DNS propagation

### App loads but Firebase not working
- Open browser console (F12) and check for errors
- Verify Firebase secrets were correctly added
- Check Firebase Console that services are enabled

### "Permission denied" errors in app
- Deploy Firestore security rules (see above)
- Ensure user is authenticated before accessing data

---

## Environment Summary

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME` | `gh-pages` |
| Development | `file:///path/to/tugga-nin/index.html` | `main` |

---

## Security Checklist

Before going live, ensure:

- [ ] Firebase secrets added to GitHub (not hardcoded in files)
- [ ] Paystack key added to GitHub Secrets
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Firebase Authentication enabled
- [ ] Test accounts removed from production
- [ ] Admin account created in Firebase Console

---

## Cost

- **GitHub Pages**: Free (public repositories)
- **GitHub Actions**: Free (2,000 minutes/month on free plan)
- **Firebase**: Free (Spark plan — see `FIREBASE_FREE_PLAN_SETUP.md`)
- **Total**: $0/month for typical usage

---

## Support

- Firebase issues: `FIREBASE_FREE_PLAN_SETUP.md`
- GitHub Actions docs: https://docs.github.com/en/actions
- GitHub Pages docs: https://docs.github.com/en/pages
