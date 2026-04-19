import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const requiredConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

for (const [key, value] of Object.entries(requiredConfig)) {
  if (!value) {
    throw new Error(`Missing required Firebase configuration: ${key}`);
  }
}

const firebaseConfig = {
  apiKey: requiredConfig.apiKey,
  authDomain: requiredConfig.authDomain,
  projectId: requiredConfig.projectId,
  storageBucket: requiredConfig.storageBucket,
  messagingSenderId: requiredConfig.messagingSenderId,
  appId: requiredConfig.appId,
};

// Initialize Firebase (only once — safe across hot reloads)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase 11 handles React Native auth persistence automatically
const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
