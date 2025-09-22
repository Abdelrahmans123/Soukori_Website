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
/*
const firebaseConfig = {

  apiKey: "AIzaSyBPMm10y_JNozktz4YB2G4ch5WU5bIAjIU",

  authDomain: "soukori-69ce1.firebaseapp.com",

  projectId: "soukori-69ce1",

  storageBucket: "soukori-69ce1.firebasestorage.app",

  messagingSenderId: "882848613423",

  appId: "1:882848613423:web:c895a313881d39f8b6b2da"

};*/


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

