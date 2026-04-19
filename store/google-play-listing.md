# Google Play Listing — Google Play Console
# Copy-paste these values directly into Google Play Console

---

## App Name (50 chars max)
PantryChef – AI Recipe Finder

## Short Description (80 chars max)
Cook what you already have. AI recipes from your fridge & pantry.

---

## Full Description (4000 chars max)

PantryChef turns your fridge and pantry into a personal chef.

Snap a photo of your ingredients, and Claude AI instantly suggests delicious recipes you can make right now — with real nutrition data from Spoonacular and step-by-step cooking guidance built right in.

HOW IT WORKS

1. Scan your fridge or pantry with your camera — or add items manually
2. Tap "Generate Recipes" and Claude AI creates 3 personalised suggestions in seconds
3. Choose a recipe, cook hands-free with voice commands, and your pantry updates automatically when you're done

KEY FEATURES

🤖 AI-Powered Recipe Generation
Claude AI analyses your exact pantry and suggests full recipes you can make with what you have, plus partial matches with just 1–3 missing ingredients.

📸 Fridge Scan
Point your camera at your fridge or pantry — Claude Vision identifies every ingredient automatically. No typing required.

🍳 Hands-Free Cooking Mode
Step-by-step cooking mode reads each instruction aloud. Say "next step", "repeat", or "finished" to navigate without touching your phone.

🥗 Real Nutrition Data
Calories, protein, carbs and fat are pulled from Spoonacular's food database — not estimated — so you can trust the numbers.

🛒 Smart Shopping Lists
Missing an ingredient? Add it to your shopping list with one tap. PantryChef tracks what you need across all your saved recipes.

📖 Cookbook
Save your favourite recipes and rate them. Your ratings update in real time across all your devices.

🔄 Pantry Auto-Update
Mark a recipe as cooked and PantryChef automatically deducts the ingredients you used — keeping your pantry accurate without any manual effort.

Whether you're trying to reduce food waste, eat healthier, or just figure out dinner with whatever's in the fridge — PantryChef has you covered.

---

## What's New (Release Notes — shown on "What's new" tab)

Welcome to PantryChef! First release.

• AI recipe generation from your pantry contents
• Fridge scanning with Claude Vision
• Hands-free cooking mode with voice commands
• Real nutrition data via Spoonacular
• Automatic pantry updates after cooking
• Smart shopping list management

---

## App Category
Primary: Food & Drink

## Tags (up to 5)
recipe, meal planner, AI cooking, pantry, food waste

---

## Contact Details (shown on Play Store listing)
Email: devinmrichards95@gmail.com
Privacy Policy URL: https://YOUR_HOSTING_URL/privacy-policy.html
(host assets/privacy-policy.html on GitHub Pages, Netlify, etc.)

---

## Content Rating — IARC Questionnaire

Answer these in Play Console → App content → Content ratings → Start questionnaire
Select app type: **App** (not Game)

| Question | Answer |
|----------|--------|
| Does the app contain violence? | No |
| Does the app contain sexual content? | No |
| Does the app contain profanity? | No |
| Does the app contain controlled substances? | No |
| Does the app contain references to tobacco, alcohol, or drugs? | No |
| Does the app facilitate gambling? | No |
| Does the app allow user-generated content shared with others? | No |
| Does the app contain social features (chat, forums, user interaction)? | No |
| Does the app share location with other users? | No |
| Does the app contain simulated gambling? | No |
| Is the app primarily directed at children? | No |

**Resulting Rating: Everyone (E) / PEGI 3**

---

## Data Safety Section
(Play Console → App content → Data safety)

### Does your app collect or share any of the required user data types?
**Yes**

---

### Data types collected and their details

#### 1. Personal Info — Email address
- **Collected:** Yes
- **Shared with third parties:** No
- **Required or optional:** Required (needed for account creation)
- **Purpose:** Account management
- **Encrypted in transit:** Yes
- **Users can request deletion:** Yes

#### 2. App Activity — App interactions
- **Collected:** Yes (pantry items, saved recipes, shopping lists, cooking history, ratings)
- **Shared with third parties:** No (stored in Firebase Firestore linked to your account)
- **Required or optional:** Required (core app functionality)
- **Purpose:** App functionality
- **Encrypted in transit:** Yes
- **Users can request deletion:** Yes

#### 3. Photos and videos — Photos
- **Collected:** No — photos taken for ingredient scanning are sent directly to the Anthropic Claude API and are NOT stored on our servers
- **Note in form:** Select "Not collected" — add an explanation in the "Safety practices" section below

#### 4. Audio — Voice or sound recordings
- **Collected:** No — voice commands are processed entirely on-device by Android's SpeechRecognizer and are never sent to our servers
- **Note in form:** Select "Not collected"

---

### Data sharing (third-party disclosure)

#### Anthropic Claude API
- Data shared: Pantry item names and (optionally) fridge photos
- Purpose: App functionality (ingredient detection, recipe generation)
- Select: "Shared with third parties" → App functionality

#### Spoonacular API
- Data shared: Recipe titles only (to look up nutrition info and food photos)
- Purpose: App functionality
- Select: "Shared with third parties" → App functionality

#### Google Firebase (Authentication + Firestore)
- This is a **service provider** (Google's own infrastructure), not a third party
- Play Console treats Google services differently — you typically do NOT need to disclose Firebase as a separate third-party share

---

### Safety practices

In the Data Safety form, under **Security practices**, select:

| Practice | Answer |
|----------|--------|
| Data is encrypted in transit | ✅ Yes |
| You provide a way for users to request that their data be deleted | ✅ Yes |

In the free-text area for additional context (if provided), you can optionally add:
> "Photos used for ingredient scanning are transmitted directly to our AI provider (Anthropic) and are never stored on PantryChef servers. Voice commands are processed on-device only."

---

### Completed Data Safety summary card
(How it will appear on your Play Store listing)

**Data collected**
- Email address — Personal info — Required — Account management
- App interactions — App activity — Required — App functionality

**Data shared**
- Pantry item names and optional photos — App activity/Photos — App functionality (Anthropic Claude API for recipe generation)
- Recipe titles — App activity — App functionality (Spoonacular for nutrition data)

**Security**
- Data encrypted in transit ✅
- You can request data deletion ✅

---

## App Review Information

### Demo Account
Email: testreviewer@pantrychef.app
Password: Review2026!
(Create this account in Firebase Console before submitting)

### Sign-In Required
Yes — account required to save pantry items and recipes across sessions.

### Notes for Google Reviewer
PantryChef uses:
- Firebase Authentication for user accounts (use the demo credentials above)
- Camera permission for scanning ingredients — tap "Scan Fridge" on the Pantry tab
- Microphone permission for optional hands-free voice commands in cooking mode — start cooking a recipe to test
- The Anthropic Claude API and Spoonacular API for recipe generation (live API keys are configured in the build)
- Internet permission for API calls and Firebase sync

---

## Permissions Declared in AndroidManifest
(These will be shown to users on install — make sure your Play Console declaration matches)

| Permission | Reason shown to user |
|------------|----------------------|
| CAMERA | Scan fridge and pantry ingredients |
| READ_EXTERNAL_STORAGE | Choose a photo from your gallery for ingredient scanning |
| RECORD_AUDIO | Hands-free voice commands during cooking mode |
| INTERNET | Required for AI recipe generation and account sync |
| ACCESS_NETWORK_STATE | Check connectivity before API calls |

---

## Pre-Launch Checklist

- [ ] Host `assets/privacy-policy.html` and add real URL to Play Console + app.json
- [ ] Create demo Firebase account `testreviewer@pantrychef.app` with some pantry items pre-loaded
- [ ] Run `eas build --platform android --profile production` to generate a signed AAB
- [ ] Run `eas submit --platform android` (or upload AAB manually via Play Console)
- [ ] Fill out Data Safety form in Play Console → App content → Data safety
- [ ] Complete IARC content rating questionnaire
- [ ] Add at least 2 screenshots (phone) and optionally a 7-inch tablet screenshot
- [ ] Add a 1024×500 feature graphic (JPG or 24-bit PNG, no alpha)
- [ ] Set `eas.json` submit → android → `serviceAccountKeyPath` to your real service account JSON
