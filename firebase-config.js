// Replace the placeholders below with your Firebase project values.
// Once configured, BudgetBuddy can connect to Firebase Authentication and Firestore.
const firebaseConfig = {
  apiKey: "<YOUR_API_KEY>",
  authDomain: "<YOUR_AUTH_DOMAIN>",
  projectId: "<YOUR_PROJECT_ID>",
  storageBucket: "<YOUR_STORAGE_BUCKET>",
  messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
  appId: "<YOUR_APP_ID>"
};

// Enable Firebase after inserting your real Firebase project values above
const FIREBASE_ENABLED = true;

// Expose globals for the frontend code
window.firebaseConfig = firebaseConfig;
window.FIREBASE_ENABLED = FIREBASE_ENABLED;
