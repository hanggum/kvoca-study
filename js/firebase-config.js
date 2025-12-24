// Firebase Configuration
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project
// 3. Go to Project Settings > General > Your apps > Web app (</>)
// 4. Copy the "firebaseConfig" object and paste it below

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Make it available globally
window.firebaseConfig = firebaseConfig;
