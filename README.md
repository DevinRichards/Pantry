# 🍃 PantryChef

**AI-powered recipe suggestions from your fridge & pantry.**
Built with React Native (Expo), Claude AI, and Firebase.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Scan Ingredients** | Take a photo of your fridge/pantry — Claude Vision identifies every item |
| 🤖 **AI Recipes** | Claude generates personalized recipes from your available ingredients |
| ✅ **Full & Partial Match** | See what you can cook *right now* vs. what needs one or two extra items |
| 🍳 **Cooking Mode** | Step-by-step fullscreen instructions with pro tips |
| 📖 **Cookbook** | Save, rate, and comment on your favourite recipes |
| 🛒 **Smart Shopping List** | Auto-fill missing ingredients from any recipe; group by supermarket category |
| ↗️ **Share Recipes** | Share any recipe with friends via the native share sheet |
| 🔖 **Pantry Database** | Track all your ingredients with quantity, category, and low-stock alerts |

---

## 🚀 Getting Started

### 1 — Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
  `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) on your iOS or Android device

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

### 4 — Set Up Claude API

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an API key.

### 5 — Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
# Anthropic
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

> ⚠️ **Security note:** For production, move the Claude API calls to a Firebase Cloud Function or backend server so your API key is never exposed in the client app.

### 6 — Add Assets

Place these images in `assets/images/`:
- `icon.png` — 1024×1024 app icon
- `splash.png` — 1242×2436 splash screen
- `adaptive-icon.png` — 1024×1024 Android adaptive icon
- `favicon.png` — 48×48 web favicon

You can use any green-themed placeholder images for development.

### 7 — Run the App

```bash
# Start the dev server
npm start

# Or target a specific platform
npm run ios
npm run android
```

Scan the QR code with Expo Go on your device.

---

## 🗂️ Project Structure

```
PantryChef/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout (StatusBar, Stack)
│   ├── scan.tsx                # Camera scan screen
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── index.tsx           # Pantry screen
│   │   ├── recipes.tsx         # Recipe discovery
│   │   ├── cookbook.tsx        # Saved recipes
│   │   ├── shopping.tsx        # Shopping list
│   │   └── profile.tsx         # Profile & settings
│   └── recipe/
│       └── [id].tsx            # Recipe detail + cooking mode
├── constants/
│   └── Colors.ts               # Full Material Design 3 green theme
├── hooks/
│   ├── useAuth.ts
│   └── usePantry.ts
├── services/
│   ├── claude.ts               # Claude Vision + Recipe generation
│   ├── firebase.ts             # Firebase init
│   ├── pantryService.ts        # Pantry CRUD (Firestore)
│   ├── recipeService.ts        # Saved recipes + ratings
│   └── shoppingService.ts      # Shopping list CRUD
└── types/
    └── index.ts                # All TypeScript interfaces
```

---

## 🔥 Firebase Firestore Collections

| Collection | Description |
|---|---|
| `pantryItems` | User's ingredients (`userId`, `name`, `quantity`, `category`, `addedAt`) |
| `savedRecipes` | Cookbook entries (`userId`, `recipeId`, `recipe`, `userRating`, `notes`) |
| `ratings` | Recipe ratings & comments (`recipeId`, `userId`, `rating`, `comment`) |
| `shoppingLists` | Shopping lists with embedded items array |

**Recommended Firestore indexes:**
- `pantryItems`: `userId ASC, addedAt DESC`
- `savedRecipes`: `userId ASC, savedAt DESC`
- `ratings`: `recipeId ASC, createdAt DESC`

---

## 🤖 Claude AI Integration

Two main calls are made to the Anthropic API:

### Image → Ingredients (`detectIngredientsFromPhoto`)
Uses **claude-opus-4-6** with vision to analyse a base64-encoded JPEG and return a structured JSON list of detected ingredients with categories and confidence scores.

### Pantry → Recipes (`generateRecipes`)
Uses **claude-opus-4-6** to generate 6 diverse recipes (2–3 full matches, 3–4 partial matches) with complete ingredients, step-by-step instructions, and nutrition info, formatted as JSON.

---

## 📱 Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

See [Expo EAS docs](https://docs.expo.dev/build/introduction/) for full instructions.

---

## 🛣️ Roadmap

- [ ] Barcode scanning for packaged goods
- [ ] Expiry date tracking with push notifications
- [ ] Meal planning calendar
- [ ] Nutritional goal tracking
- [ ] Social features (follow friends, share cookbooks)
- [ ] Offline recipe caching
- [ ] Voice-guided cooking mode

---

*Built with ❤️ using Claude AI + Expo + Firebase*
