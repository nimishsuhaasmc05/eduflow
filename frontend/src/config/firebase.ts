import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Public browser configuration read safely from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-EduFlowPublicDevKeyPlaceholder",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "edu-flow-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "edu-flow-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "edu-flow-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "108529384729",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:108529384729:web:abcdef123456789"
};

// Initialize Firebase App for browser client auth
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);
