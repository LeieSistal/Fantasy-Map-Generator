# 🔧 FIXING GITHUB PAGES CACHE ISSUE

## 🎯 THE PROBLEM

Your GitHub Pages site is showing an **old broken version** even after pulling updates. This happens because:

### 1. **Aggressive Service Worker**
The app uses a Service Worker (`sw.js`) that caches everything for **30 DAYS**:
- Scripts (StaleWhileRevalidate strategy)
- Libraries (CacheFirst strategy)
- HTML, CSS, images, JSON - all aggressively cached
- Even after pushing new code, browsers serve the old cached version

### 2. **Browser Cache**
Browsers cache static files aggressively on GitHub Pages

### 3. **GitHub Pages CDN Cache**
GitHub's CDN also caches files for performance

---

## ✅ SOLUTION - STEP BY STEP

### 🚨 IMMEDIATE FIX (Do this NOW)

#### **Step 1: Clear the Service Worker Cache**

**Option A - Use the Cache Cleaner Tool:**
```bash
# Your GitHub Pages URL would be something like:
https://<your-username>.github.io/Fantasy-Map-Generator/CLEAR-CACHE.html
```

1. Go to: `https://YOUR-USERNAME.github.io/Fantasy-Map-Generator/CLEAR-CACHE.html`
2. Click **"Clear All Cache"** button
3. Wait for confirmation
4. Do a **Hard Refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

**Option B - Manual Method:**
1. Open your GitHub Pages site
2. Press `F12` to open DevTools
3. Go to **"Application"** tab
4. In left sidebar, click **"Service Workers"**
5. Click **"Unregister"** on all service workers
6. Click **"Storage"** in left sidebar
7. Click **"Clear site data"** button
8. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

### 🔍 STEP 2: VERIFY WHICH BRANCH IS DEPLOYED

Check your GitHub repository settings:

1. Go to: `https://github.com/<your-username>/Fantasy-Map-Generator/settings/pages`
2. Look for **"Source"** section
3. Note which branch is being deployed (usually `main`, `master`, or `gh-pages`)

**Common scenarios:**

**Scenario A: Deploying from `main` branch**
```bash
# Make sure your main branch is up to date
git checkout main
git pull upstream main  # Pull from original repo
git push origin main    # Push to your fork
```

**Scenario B: Deploying from `gh-pages` branch**
```bash
# You need to update gh-pages
git checkout gh-pages
git merge main  # Or merge the branch with your fixes
git push origin gh-pages
```

**Scenario C: Using GitHub Actions**
- Check `.github/workflows/` folder
- Trigger a manual workflow run from GitHub Actions tab

---

### 🔄 STEP 3: FORCE GITHUB PAGES REBUILD

After updating the deployed branch:

1. Go to your repo: `https://github.com/<your-username>/Fantasy-Map-Generator`
2. Make a small change to trigger rebuild:
   ```bash
   # Option 1: Touch a file
   echo " " >> README.md
   git add README.md
   git commit -m "Force GitHub Pages rebuild"
   git push origin <your-deployed-branch>

   # Option 2: Create empty commit
   git commit --allow-empty -m "Trigger GitHub Pages rebuild"
   git push origin <your-deployed-branch>
   ```

---

### ⏱️ STEP 4: WAIT FOR DEPLOYMENT

1. Go to: `https://github.com/<your-username>/Fantasy-Map-Generator/actions`
2. Wait for the "pages build and deployment" workflow to complete (usually 1-2 minutes)
3. You'll see a green checkmark when done

---

### 🧪 STEP 5: TEST WITH CACHE-BUSTING URL

To verify the new version is deployed, add `?nocache=` with a timestamp:

```
https://<your-username>.github.io/Fantasy-Map-Generator/?nocache=20251105
```

Change the number each time you test.

---

## 🛠️ PERMANENT FIX OPTIONS

### Option 1: Disable Service Worker (Recommended for development)

Edit `main.js` around line 27-34:

```javascript
// Comment out or remove this block:
/*
if (PRODUCTION && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.error("ServiceWorker registration failed: ", err);
    });
  });
}
*/
```

### Option 2: Update Service Worker Version

When you make changes, increment the cache version in `sw.js`:

```javascript
// Add a version to all cache names:
cacheName: "fmg-scripts-v2",  // Increment v2 → v3 on each deploy
cacheName: "fmg-html-v2",
cacheName: "fmg-libs-v2",
// etc.
```

### Option 3: Shorter Cache Duration

In `sw.js`, reduce cache time from 30 days to 1 day:

```javascript
const DAY = 24 * 60 * 60;

// Change from:
maxAgeSeconds: 30 * DAY

// To:
maxAgeSeconds: 1 * DAY  // Cache for only 1 day
```

---

## 🎯 CHECKLIST

Use this to track your progress:

- [ ] **Cleared Service Worker** using CLEAR-CACHE.html or manually
- [ ] **Cleared browser cache** with hard refresh (Ctrl+Shift+R)
- [ ] **Verified deployed branch** in GitHub Pages settings
- [ ] **Updated the correct branch** with latest code
- [ ] **Triggered rebuild** with a new commit
- [ ] **Waited for deployment** (check Actions tab)
- [ ] **Tested with cache-busting URL** (?nocache=timestamp)
- [ ] **Verified map loads correctly** with land + ocean + countries
- [ ] **(Optional) Disabled Service Worker** for easier testing

---

## 🐛 TROUBLESHOOTING

### "Still seeing old version after clearing cache"

1. **Try a different browser** - Chrome, Firefox, Safari
2. **Try Incognito/Private mode** - Opens without any cache
3. **Check browser console** (F12) for errors
4. **Verify the version**: Type `VERSION` in console, should show `1.108.12`

### "GitHub Pages shows 404"

1. Wait 5-10 minutes after pushing
2. Check if GitHub Pages is enabled in Settings
3. Verify the branch exists and has index.html
4. Check Actions tab for deployment errors

### "Map still only shows ocean"

This means the old broken version is still cached:

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Refresh page
5. Look for draw-features.js in the list
6. Click on it and verify it loads correctly

### "Service Worker won't unregister"

```javascript
// Run this in browser console:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
    console.log('Unregistered:', registration.scope);
  }
});
```

---

## 📊 VERIFY THE FIX

Once everything is done, verify:

1. **Open your GitHub Pages URL** in a fresh incognito window
2. **Open DevTools Console** (F12)
3. **Type these commands:**
   ```javascript
   VERSION                // Should show: "1.108.12"
   typeof drawFeatures    // Should show: "function"
   ```
4. **Click the "►" button** to generate a map
5. **Verify you see**: Ocean + Land + Countries + Cities (not just ocean!)

---

## 🚀 QUICK REFERENCE

**Your repo:** `https://github.com/LeieSistal/Fantasy-Map-Generator`

**Your GitHub Pages (probably):** `https://leiesistal.github.io/Fantasy-Map-Generator/`

**Cache cleaner:** `https://leiesistal.github.io/Fantasy-Map-Generator/CLEAR-CACHE.html`

**Settings:** `https://github.com/LeieSistal/Fantasy-Map-Generator/settings/pages`

**Actions:** `https://github.com/LeieSistal/Fantasy-Map-Generator/actions`

---

## 💡 NEED MORE HELP?

If none of this works, provide:
1. Your GitHub username
2. Your GitHub Pages URL
3. Screenshot of browser console errors
4. Screenshot of GitHub Pages settings
5. Result of running `git branch -a` in your local repo

---

**Created:** 2025-11-05
**Issue:** GitHub Pages serving old cached version
**Status:** Ready to fix! Follow steps above.
