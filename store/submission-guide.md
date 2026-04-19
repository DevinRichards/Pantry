# PantryChef — App Store & Google Play Submission Guide

This document covers every step required to get PantryChef live on both stores, in the order you should do them.

---

## Phase 1 — Accounts & Credentials (one-time setup)

### Apple
1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/) — $99/year. Use the same Apple ID you'll put in `eas.json`.
2. In [App Store Connect](https://appstoreconnect.apple.com), create a new app:
   - Platform: iOS
   - Bundle ID: `com.pantrychef.app`
   - SKU: anything unique, e.g. `pantrychef2026`
3. Note down your **ASC App ID** (the 10-digit number in the URL after you create the app) and your **Team ID** (visible in Certificates, Identifiers & Profiles → top-right).
4. Fill these into `eas.json`:
   ```json
   "appleId": "your@apple-id.com",
   "ascAppId": "1234567890",
   "appleTeamId": "ABC1234XYZ"
   ```

### Google
1. Create a [Google Play Developer account](https://play.google.com/console) — $25 one-time fee.
2. In Play Console → Create app → App name: **PantryChef – AI Recipe Finder**.
3. Create a service account for automated uploads:
   - Play Console → Setup → API access → Link to a Google Cloud project → Create service account
   - Grant the service account **Release manager** role
   - Download the JSON key and save it as `google-play-service-account.json` in the project root (it's already in `.gitignore`)
4. Fill the path into `eas.json`:
   ```json
   "serviceAccountKeyPath": "./google-play-service-account.json"
   ```

---

## Phase 2 — Privacy Policy Hosting

Both stores require a publicly accessible privacy policy URL before you can submit.

1. The policy file is already written at `assets/privacy-policy.html`.
2. Host it at a stable URL. Easiest options:
   - **GitHub Pages**: push the repo to GitHub, enable Pages, your URL will be `https://yourusername.github.io/pantrychef/assets/privacy-policy.html`
   - **Netlify**: drag and drop the `assets/` folder at netlify.com, get an instant URL
3. Once hosted, update the placeholder in two places:
   - `store/app-store-listing.md` — Privacy Policy URL field
   - `store/google-play-listing.md` — Contact Details section
4. Also update `app.json` if you added the URL anywhere there.

---

## Phase 3 — Demo Account

Both stores require a working test account so reviewers can log in.

1. In [Firebase Console](https://console.firebase.google.com) → Authentication → Users → Add user:
   - Email: `testreviewer@pantrychef.app`
   - Password: `Review2026!`
2. In Firestore, add a few pantry items to this account so reviewers can immediately test recipe generation.

---

## Phase 4 — Store Assets

### Screenshots (required for both stores)
You need at least 2–3 screenshots per device class. Recommended screens to capture:
- Pantry tab (showing some ingredients)
- Recipes tab (showing generated recipe cards)
- Recipe detail / cooking mode
- Cookbook

**Apple required sizes** (capture on a real device or simulator):
- 6.9" display (iPhone 16 Plus): 1320×2868 px
- 6.5" display (iPhone 11 Pro Max): 1242×2688 px
- 12.9" iPad Pro (if supporting tablet): 2048×2732 px

**Google Play required:**
- Phone screenshots: at least 2, between 320px and 3840px on the short side
- 7-inch tablet: optional but recommended

### Feature Graphic (Google Play only)
- Size: 1024×500 px
- Format: JPG or 24-bit PNG (no alpha)
- Content: app name + a food/pantry visual — no device frames required

### App Icon
- Already generated at `assets/images/icon.png` (1024×1024, RGB, no alpha — Apple compliant)
- `assets/images/adaptive-icon.png` (1024×1024, RGBA — Android compliant)

---

## Phase 5 — Production Build

```bash
# Install EAS CLI if you haven't already
npm install -g eas-cli
eas login   # log in with your Expo account

# iOS production build (creates a signed IPA)
eas build --platform ios --profile production

# Android production build (creates a signed AAB)
eas build --platform android --profile production
```

EAS handles code signing automatically — it will prompt you to create or use existing certificates on your first iOS build. The builds run on Expo's servers and take 15–30 minutes.

---

## Phase 6 — Submit to Apple (TestFlight first)

1. Once your iOS build completes, submit it to App Store Connect:
   ```bash
   eas submit --platform ios
   ```
2. In App Store Connect → TestFlight → Internal Testing → Add the build.
3. Add yourself (and any internal testers with Apple IDs on your team) as internal testers — no review required, available within minutes.
4. For **external beta testing** (anyone with a link), add testers under External Groups — Apple does a brief beta review (usually under 24 hours).
5. Once beta testing is complete and you're ready for the App Store, go to **App Store Connect → App Store tab** and fill in all the fields from `store/app-store-listing.md`.

---

## Phase 7 — Submit to Google Play

1. Submit the AAB:
   ```bash
   eas submit --platform android
   ```
   This uploads to the **internal testing track** (as configured in `eas.json`).
2. In Play Console → Testing → Internal testing → promote testers by adding their Gmail addresses.
3. Complete the required pre-launch setup (Play Console will guide you through each):

   **App content section** (Play Console → App content):
   - **Privacy policy**: paste your hosted URL
   - **App access**: select "All functionality is available without special access" — then add the demo account credentials from Phase 3
   - **Content ratings**: start the IARC questionnaire. All answers are in `store/google-play-listing.md` → Content Rating section. Resulting rating: **Everyone**
   - **Data safety**: fill in the form using the field-by-field guide in `store/google-play-listing.md` → Data Safety section
   - **Target audience**: 18+
   - **News apps**: No

4. Fill in the store listing from `store/google-play-listing.md`:
   - App name, short description, full description
   - Screenshots and feature graphic (from Phase 4)
   - Category: Food & Drink

5. When ready for public release: Testing → Internal testing → Promote to Production.

---

## Phase 8 — App Review Checklist

### Apple specific
- [ ] Privacy policy URL is live and accessible
- [ ] Demo account created in Firebase and pre-loaded with pantry items
- [ ] Privacy Manifest is in `app.json` (already done — `NSPrivacyAccessedAPITypes`)
- [ ] Camera, Photo Library, and Microphone usage descriptions are in `app.json` (already done)
- [ ] Age rating completed in App Store Connect (all None → 4+)
- [ ] App Store listing copy pasted from `store/app-store-listing.md`

### Google specific
- [ ] Privacy policy URL is live and accessible
- [ ] Demo account created in Firebase and pre-loaded with pantry items
- [ ] Data Safety form completed in Play Console
- [ ] IARC content rating questionnaire completed (→ Everyone)
- [ ] Feature graphic uploaded (1024×500 px)
- [ ] Store listing copy pasted from `store/google-play-listing.md`

---

## Estimated Timeline

| Phase | Time |
|-------|------|
| Accounts & credentials | 1–2 days (Apple enrolment can take up to 48 hours) |
| Privacy policy hosting | 30 minutes |
| Demo account + screenshots | 1–2 hours |
| Production builds (EAS) | 30–60 minutes |
| TestFlight internal testing | Available within minutes |
| Apple App Store review | 1–3 business days |
| Google Play internal testing | Available within hours |
| Google Play production review | 1–7 business days (first submission) |

---

## Useful Links

- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Expo EAS Build docs](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit docs](https://docs.expo.dev/submit/introduction/)
- [Firebase Console](https://console.firebase.google.com)
- [Spoonacular API dashboard](https://spoonacular.com/food-api/console)
