// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSplfIeCdHaXnAgH1WnmaY78uINeUHHeA",
  authDomain: "glyphmart.firebaseapp.com",
  projectId: "glyphmart",
  storageBucket: "glyphmart.firebasestorage.app",
  messagingSenderId: "582834377960",
  appId: "1:582834377960:web:2f844d65c9c0f92f93255d",
  measurementId: "G-1RC8D5PY66"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

export default app;
