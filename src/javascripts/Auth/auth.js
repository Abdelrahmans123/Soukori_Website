import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";


import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDayr1DX9Azte0bQXT575V2pnrFzziBkxQ",
  authDomain: "crud-7272a.firebaseapp.com",
  databaseURL: "https://crud-7272a-default-rtdb.firebaseio.com",
  projectId: "crud-7272a",
  storageBucket: "crud-7272a.firebasestorage.app",
  messagingSenderId: "850242405233",
  appId: "1:850242405233:web:cfa736dc96338e21b2ecd0",
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firestore instance
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

const authEl = document.querySelector(".authButtons");
const userDropdownEl = document.querySelector(".user-dropdown");




function showAuth() {
  authEl.classList.remove("d-none");
  authEl.classList.add("d-lg-flex");
  userDropdownEl.classList.add("d-none");
}

function showUserDropdown() {
  authEl.classList.add("d-none");
  userDropdownEl.classList.remove("d-none");
}

// Shows quickly before Firebase responds
if (localStorage.getItem("userLoggedIn") === "true") {
  showUserDropdown(); 
   if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html") || window.location.pathname.includes("forgot-password.html")) {
        window.location.href = "../../index.html";
      }
} else {
  showAuth();
}

//  onAuthStateChanged for confirmation
onAuthStateChanged(auth, (user) => {
  if (user) {
    showUserDropdown();
    localStorage.setItem("userLoggedIn", "true"); // Store the login state
    console.log("Logged in with UID: " + user.uid);
  } else {
    showAuth();
    localStorage.removeItem("userLoggedIn"); // Remove state if no user
  }
});

//  login
document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      window.location.href = "../../index.html";
      localStorage.setItem("userLoggedIn", "true"); // Store the login state
      showUserDropdown();
    })
    .catch((error) => {
      const errorDiv = document.getElementById("loginError");
    errorDiv.innerText = error.message;
    errorDiv.style.display = "block"; 
    });
});

//  register
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const gender = document.getElementById("gender").value;
  const avatar = document.getElementById("avatar").value;
  const password = document.getElementById("password").value;

  try {
    // Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      phone: phone,
      gender: gender,
      avatar: avatar,
      createdAt: new Date()
    });

     window.location.href = "../../index.html";
      localStorage.setItem("userLoggedIn", "true"); 
  } catch (error) {
    alert(" Error: " + error.message);
  }
});

//  logout
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Logging out...");
  signOut(auth)
    .then(() => {
      localStorage.removeItem("userLoggedIn");
      showAuth();
      if (window.location.pathname.includes("index.html")) {
        window.location.href = "pages/Auth/login.html"; // Redirect from index to login page
      } else if (window.location.pathname.includes("pages")) {
        window.location.href = "../Auth/login.html"; // Redirect from pages product to login page
      }
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
});

// Google Login
document.getElementById("googleLogin")?.addEventListener("click", (e) => {
  e.preventDefault();

  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log("Google User:", user);

      localStorage.setItem("userLoggedIn", "true");
      showUserDropdown();
      window.location.href = "../../index.html"; // Redirect
    })
    .catch((error) => {
      const errorDiv = document.getElementById("loginError");
      errorDiv.innerText = error.message;
      errorDiv.style.display = "block";
    });
});

// forgot password
document.getElementById("forgotPasswordForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  sendPasswordResetEmail(auth, email)
    .then(() => {
      const sendEmailDiv = document.getElementById("sendEmail");
      sendEmailDiv.innerText = " Reset link sent to your email. Check your inbox.";
      sendEmailDiv.style.display = "block";
    })
    .catch((error) => {
      const errorDiv = document.getElementById("loginError");
      if (errorDiv) {
        errorDiv.innerText = error.message;
        errorDiv.style.display = "block";
      } else {
        alert("Error: " + error.message);
      }
    });
});
