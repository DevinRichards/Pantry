# 🍃 PantryChef

**AI-powered recipe suggestions from your fridge & pantry.**  
Built with React Native (Expo), Claude AI, Spoonacular, and Firebase.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Fridge Scan** | Take a photo or pick from your library — Claude Vision identifies every ingredient automatically |
| 🤖 **AI Recipe Generation** | Claude generates 3 recipes per session (2 full matches + 1 partial match needing 1–3 extra items) |
| 🍳 **Hands-Free Cooking Mode** | Fullscreen step-by-step mode reads instructions aloud; say "next step", "repeat", or "done" to navigate |
| 🎙️ **Voice Commands** | Microphone toggle during cooking; built on `expo-speech-recognition` (requires a dev or production build) |
| 🥗 **Real Nutrition Data** | Recipes are enriched with calories, protein, carbs, fat, and a food photo via Spoonacular (AI fallback if unavailable) |
| 🗒️ **Needs Review** | After cooking, ingredients that couldn't be auto-deducted surface in the Pantry tab for manual review |
| 📖 **Cookbook** | Save, rate (1–5 stars), and comment on recipes; ratings sync across all devices via a Firestore transaction |
| 🛒 **Shopping List** | Add missing ingredients with one tap; items are grouped by supermarket category |
| 💾 **Recipe Cache** | Generated recipes persist across restarts via AsyncStorage; a stale-pantry warning appears if your pantry changes |
| 👩‍🍳 **Chef's Tips** | Tap any pantry ingredient for a quick storage or preparation tip (Claude Haiku) |
| 🔄 **Pantry Auto-Update** | Mark a recipe as cooked and PantryChef automatically deducts used ingredients |

---

## 🚀 Getting Started

### 1 — Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Expo Go](https://expo.dev/go) on your iOS or Android device (for basic testing)
- A development build via EAS is required for voice commands (`expo-speech-recognition` is a native module)

### 2 — Clone & Install

```bash
cd PantryChef        # this folder
npm install
```

### 3 — Set Up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. Enable **Authentication** → Email/Password.
3. Enable **Firestore Database** (start in test mode for development).
4. Click the **</>** (Web) icon to register a web app and copy your config.
5. Deploy the included Firestore and Storage rules before production use.

### 4 — Get API Keys

- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) — required behind a backend proxy for production.
- **Spoonacular**: [spoonacular.com/food-api](https://spoonacular.com/food-api) — optional, and should also be proxied in production. Without it, nutrition data is AI-estimated and recipe images won't appear.

### 5 — Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
# Anthropic proxy (required in production)
EXPO_PUBLIC_ANTHROPIC_PROXY_URL=https://your-api.example.com/anthropic/messages

# Anthropic direct key (development only)
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...

# Firebase (all required)
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# Spoonacular proxy (recommended in production)
EXPO_PUBLIC_SPOONACULAR_PROXY_BASE_URL=https://your-api.example.com/spoonacular

# Spoonacular direct key (development only)
EXPO_PUBLIC_SPOONACULAR_API_KEY=...
```

> ⚠️ **Security note:** Production builds now require proxy endpoints for Anthropic, and should proxy Spoonacular as well, so third-party provider keys are never bundled in the client app.

### 6 — Run the App

```bash
# Start the dev server (Expo Go — no voice commands)
npm start

# Or target a specific platform
npm run ios
npm run android
```

Scan the QR code with Expo Go on your device. Note: voice commands require a development build (see Building below).

---

## 🗂️ Project Structure

```
PantryChef/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (auth guard, StatusBar)
│   ├── scan.tsx                  # Camera / photo-library scan screen
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── index.tsx             # Pantry screen + Needs Review section
│   │   ├── recipes.tsx           # AI recipe generation + cache
│   │   ├── cookbook.tsx          # Saved recipes
│   │   ├── shopping.tsx          # Shopping list (grouped by category)
│   │   └── profile.tsx           # Profile & sign-out
│   └── recipe/
│       └── [id].tsx              # Recipe detail, cooking mode, voice control, ratings
├── constants/
│   └── Colors.ts                 # Green Material Design 3 theme
├── hooks/
│   ├── useAuth.ts                # Firebase Auth state + login/register/logout
│   └── usePantry.ts              # Firestore pantry CRUD with real-time listener
├── services/
│   ├── claude.ts                 # Claude API: detectIngredients, generateRecipes, generateChefTip
│   ├── spoonacular.ts            # Spoonacular: recipe search, nutrition, HD images
│   ├── recipeCache.ts            # AsyncStorage: recipe cache + pantry-hash staleness
│   ├── cookedRecipes.ts          # AsyncStorage: cooked records + Needs Review items
│   ├── firebase.ts               # Firebase v11 init (getAuth, Firestore)
│   ├── pantryService.ts          # Firestore: pantry item CRUD
│   ├── recipeService.ts          # Firestore: saved recipes + ratings (transaction-based)
│   └── shoppingService.ts        # Firestore: shopping list CRUD
├── types/
│   └── index.ts                  # All TypeScript interfaces
├── assets/
│   └── images/                   # icon.png, splash.png, adaptive-icon.png, favicon.png
├── store/
│   ├── app-store-listing.md      # Apple App Store Connect copy (ready to paste)
│   └── google-play-listing.md    # Google Play Console copy + Data Safety responses
└── eas.json                      # EAS Build profiles (development, preview, production)
```

---

## 🤖 Claude AI Integration

Three calls are made to the Anthropic API:

**`detectIngredientsFromPhoto`** — uses `claude-opus-4-6` with vision to analyse a base64-encoded JPEG (captured at 1280px width, quality 0.92) and return a JSON list of detected ingredients with name, quantity, category, confidence, and Material Symbol icon name.

**`generateRecipes`** — makes three sequential calls to `claude-opus-4-6`, each requesting one recipe (2 full matches, then 1 partial match needing ≤3 missing ingredients). Each call enforces variety by excluding prior recipe titles and cuisines. Recipes are normalised, then enriched with Spoonacular data in parallel. The full flow has a 45-second timeout per call.

**`generateChefTip`** — uses `claude-haiku-4-5-20251001` to generate a short storage or preparation tip for a selected pantry ingredient. Lightweight and fast.

---

## 🥗 Spoonacular Integration

After Claude generates a recipe, `enrichRecipeData` searches Spoonacular by recipe title and fetches full nutrition (calories, protein, carbs, fat, fiber, sugar, sodium) and a 636×393 food photo. If Spoonacular is unavailable or returns no match, the app silently falls back to Claude's estimated nutrition and no image. The free Spoonacular tier supports roughly 50 recipe lookups per day.

---

## 🔥 Firebase Firestore Collections

| Collection | Description |
|---|---|
| `pantryItems` | User's ingredients (`userId`, `name`, `quantity`, `category`, `addedAt`) |
| `savedRecipes` | Cookbook entries (`userId`, `recipeId`, `recipe`, `savedAt`) |
| `ratings` | Recipe ratings & comments (`recipeId`, `userId`, `rating`, `comment`, `createdAt`) |
| `shoppingLists` | Shopping lists with embedded items array |

Ratings are written via a Firestore `runTransaction` that atomically upserts the rating document and back-propagates the new average and count to every `savedRecipes` document for that recipe, so the Cookbook always shows live data.

**Recommended Firestore indexes:**
- `pantryItems`: `userId ASC, addedAt DESC`
- `savedRecipes`: `userId ASC, savedAt DESC`
- `ratings`: `recipeId ASC, createdAt DESC`

---

## 💾 Local AsyncStorage

Two services persist data on-device:

**`recipeCache.ts`** — stores the last generated recipe set along with the ISO timestamp and a pantry hash (sorted ingredient names joined with `|`). On the Recipes tab, if the current pantry hash differs from the cached hash, a stale-cache warning appears prompting regeneration.

**`cookedRecipes.ts`** — stores a rolling log of cooked recipe records (last 100) and a queue of "Needs Review" items (last 50): ingredients that couldn't be auto-deducted because their quantity was unknown. These surface in the Pantry tab until manually dismissed.

---

## 📱 Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Development build (includes native modules like voice recognition)
eas build --platform ios --profile development
eas build --platform android --profile development

# Preview build (signed, shareable via link — good for testers)
eas build --platform android --profile preview   # produces APK

# Production build
eas build --platform ios --profile production     # produces IPA for TestFlight
eas build --platform android --profile production # produces AAB for Play Store

# Submit
eas submit --platform ios      # uploads to App Store Connect
eas submit --platform android  # uploads to Play Store (internal track)
```

Before submitting, fill in the placeholder values in `eas.json`:
- `appleId` — your Apple ID email
- `ascAppId` — the numeric App Store Connect app ID
- `appleTeamId` — your Apple Developer Team ID
- `serviceAccountKeyPath` — path to your Google Play service account JSON

See `store/app-store-listing.md` and `store/google-play-listing.md` for ready-to-paste store listing copy and submission checklists.

---

## 🛣️ Roadmap

- [ ] Barcode scanning for packaged goods
- [ ] Expiry date tracking with push notifications
- [ ] Meal planning calendar
- [ ] Nutritional goal tracking
- [ ] Social features (follow friends, share cookbooks)

---

*Built with ❤️ using Claude AI + Expo + Firebase*
