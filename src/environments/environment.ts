export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  // Pulled dynamically at runtime from backend .env via GET /api/v1/config/public
  facebookAppId: '647915904409904',

  firebase: {
    apiKey: "AIzaSyCHJ_KFIuSFrk2ytXoIysz15np5MsfLook",
    authDomain: "pace-crm-fadc8.firebaseapp.com",
    projectId: "pace-crm-fadc8",
    storageBucket: "pace-crm-fadc8.firebasestorage.app",
    messagingSenderId: "846502996207",
    appId: "1:846502996207:web:1c7f7f15e506ac8803131a",
    measurementId: "G-V0VRT7SMNS"
  }
};
