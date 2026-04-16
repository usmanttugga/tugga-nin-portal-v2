# Project Naming Guide

## ⚠️ Important: Unique Names Required

Since "tugga-nin" already exists as a project name, you need to choose unique names for both Firebase and GitHub.

## 🔥 Firebase Project Name

When creating your Firebase project, use one of these suggested names:

### Option 1: Version-based
- `tugga-nin-portal-v2`
- `tugga-nin-app-v2`
- `tugga-nin-2024`

### Option 2: Service-based
- `tugga-identity-services`
- `tugga-nin-verification`
- `tugga-digital-identity`

### Option 3: Company-based
- `majia-nin-portal`
- `majia-identity-services`
- `majia-digital-services`

### Option 4: Custom
- Choose any unique name you prefer
- Must be globally unique across all Firebase projects
- Can only contain lowercase letters, numbers, and hyphens
- Must be between 6-30 characters

**Example Firebase URLs after creation:**
- Project ID: `tugga-nin-portal-v2`
- Auth Domain: `tugga-nin-portal-v2.firebaseapp.com`
- Storage Bucket: `tugga-nin-portal-v2.appspot.com`

## 🐙 GitHub Repository Name

When creating your GitHub repository, use one of these suggested names:

### Option 1: Descriptive
- `tugga-nin-portal`
- `tugga-identity-portal`
- `nin-verification-portal`

### Option 2: Project-based
- `majia-nin-services`
- `tugga-digital-identity`
- `nin-verification-app`

### Option 3: Technical
- `tugga-nin-webapp`
- `nin-portal-frontend`
- `identity-verification-system`

**Example GitHub URLs after creation:**
- Repository: `https://github.com/YOUR_USERNAME/tugga-nin-portal`
- GitHub Pages: `https://YOUR_USERNAME.github.io/tugga-nin-portal`

## 📝 Configuration Steps

### 1. Choose Your Names
Write down your chosen names:
```
Firebase Project Name: ___________________________
GitHub Repository Name: ___________________________
```

### 2. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter your chosen Firebase project name
4. If name is taken, try another from the list above
5. Complete the setup wizard

### 3. Create GitHub Repository
1. Go to https://github.com/new
2. Enter your chosen repository name
3. Set to Public (required for GitHub Pages)
4. Don't initialize with README (you already have files)
5. Click "Create repository"

### 4. Update Configuration Files

After creating both projects, update these files:

#### A. Firebase Configuration
Edit `tugga-nin/js/firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_FROM_FIREBASE",
  authDomain: "YOUR-PROJECT-NAME.firebaseapp.com",  // Use your Firebase project name
  projectId: "YOUR-PROJECT-NAME",                    // Use your Firebase project name
  storageBucket: "YOUR-PROJECT-NAME.appspot.com",    // Use your Firebase project name
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### B. GitHub Repository
After creating the repository, push your code:
```bash
cd tugga-nin
git init
git add .
git commit -m "Initial commit with Firebase integration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

## ✅ Verification Checklist

After setup, verify:
- [ ] Firebase project created with unique name
- [ ] Firebase services enabled (Auth, Firestore, Storage)
- [ ] Firebase config updated in `firebase-config.js`
- [ ] GitHub repository created with unique name
- [ ] Code pushed to GitHub
- [ ] GitHub Pages enabled in repository settings

## 🔍 Name Availability Check

### Check Firebase Name
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Type your desired name
4. Firebase will show if it's available or suggest alternatives

### Check GitHub Name
1. Go to https://github.com/YOUR_USERNAME/DESIRED-NAME
2. If you see "404 Not Found" - name is available
3. If you see a repository - name is taken, choose another

## 💡 Pro Tips

1. **Keep names consistent** - Use similar names for Firebase and GitHub for easy identification
2. **Use lowercase** - Avoid uppercase letters and spaces
3. **Be descriptive** - Choose names that clearly indicate the project purpose
4. **Check availability first** - Verify names are available before starting setup
5. **Document your choice** - Write down the names you chose for future reference

## 📞 Need Help?

If you're having trouble choosing names:
1. Try adding your company name: `majia-nin-portal`
2. Add a version number: `tugga-nin-v2`
3. Add the year: `tugga-nin-2024`
4. Use a descriptive suffix: `tugga-nin-webapp`

## 🎯 Recommended Combinations

Here are some good name combinations:

### Combination 1
- Firebase: `tugga-nin-portal-v2`
- GitHub: `tugga-nin-portal`

### Combination 2
- Firebase: `majia-identity-services`
- GitHub: `majia-nin-portal`

### Combination 3
- Firebase: `tugga-digital-identity`
- GitHub: `tugga-identity-portal`

Choose the combination that best fits your project!
