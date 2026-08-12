export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  // Pulled dynamically at runtime from backend .env via GET /api/v1/config/public
  facebookAppId: '647915904409904',


  // ... KEEP ALL YOUR EXISTING ENVIRONMENT KEYS HERE (e.g. apiUrl) ...

  // ADD THIS FIREBASE BLOCK:
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  // ⚠️ Ensure NO extra spaces or hidden characters in this string!
  vapidKey: "BElx...YOUR_ACTUAL_LONG_VAPID_KEY_FROM_FIREBASE..."
};
