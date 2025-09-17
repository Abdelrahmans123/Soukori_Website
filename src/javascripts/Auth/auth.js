//   import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-app.js";
//   import { getAuth, createUserWithEmailAndPassword , signInWithEmailAndPassword  , onAuthStateChanged  } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

//   const firebaseConfig = {
//     apiKey: "AIzaSyDayr1DX9Azte0bQXT575V2pnrFzziBkxQ",
//     authDomain: "crud-7272a.firebaseapp.com",
//     databaseURL: "https://crud-7272a-default-rtdb.firebaseio.com",
//     projectId: "crud-7272a",
//     storageBucket: "crud-7272a.firebasestorage.app",
//     messagingSenderId: "850242405233",
//     appId: "1:850242405233:web:cfa736dc96338e21b2ecd0"
//   };

//   const app = initializeApp(firebaseConfig);
//   const auth = getAuth(app);
  


  onAuthStateChanged(auth, (user) => {
    if (user) {
      document.querySelector(".auth").style.display = "none ";
      document.querySelector(".user-dropdown").style.display = "block";
       console.log(" Logged in with UID: " + user.uid);
    } else {
      document.querySelector(".auth").style.display = "block";
      document.querySelector(".user-dropdown").style.display = "none";
    }
  });



document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert(" Logged in with UID: " + userCredential.user.uid);
    })
    .catch((error) => {
      alert(" Error: " + error.message);
    });
});

document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  createUserWithEmailAndPassword(auth,email, password)
    .then((userCredential) => {
      alert(" Registered with UID: " + userCredential.user.uid);
    })
    .catch((error) => {
      alert(" Error: " + error.message);
    });
});






