import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDZuXLmSf3-rNHez9icGzWqQI0rwnTxNE",
  authDomain: "e-commerce-54d55.firebaseapp.com",
  projectId: "e-commerce-54d55",
  storageBucket: "e-commerce-54d55.firebasestorage.app",
  messagingSenderId: "595555916404",
  appId: "1:595555916404:web:2fc2d00bba24e58c59cf21",
  measurementId: "G-TNRTQCP63C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

