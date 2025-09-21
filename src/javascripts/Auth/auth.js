import { auth, db } from "./firebase-config.js"
import { doc, writeBatch, collection, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";


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

 async function getUserCartToLocal(user) {
   const userRef = doc(db, "users", user.uid);
   const userSnap = await getDoc(userRef);
   if (userSnap.exists()) {
     const userData = userSnap.data();
     const cartId = userData.cartID;
     const cartRef = doc(db, "carts", cartId);
     const cartSnap = await getDoc(cartRef);
     const cartData = cartSnap.data();
     const cartItems = cartData.items || [];
     localStorage.setItem("carts", JSON.stringify(cartItems));
     window.location.href = "../../index.html";
     return;
   }
 }

//  login
document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  const loginBUtton = document.getElementById("loggingInBtn");
  loginBUtton.innerHTML=`Logging in... <span class="spinner"></span>`;
  loginBUtton.style.background = 'grey';
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      getUserCartToLocal(user);
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

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const gender = document.getElementById("gender").value;
  const avatar = document.getElementById("avatar");
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;



  console.log(name)
  // Check if passwords match
  if (password !== confirmPassword) {
    showMessage("warning", "❌ Error: Passwords do not match");
    return;
  }

  try {
    // Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Handle avatar upload to Cloudinary
    let avatarUrl = "none";
    if (avatar.files && avatar.files.length > 0) {
      const imageFile = avatar.files[0];
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', 'users_avatars');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/dhpeof9u7/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      avatarUrl = uploadData.secure_url;
    }

    //batch to write user and cart documents
    const batch = writeBatch(db);

    // Create cart document with a unique ID
    const cartRef = doc(collection(db, "carts")); // Generates a random ID
    batch.set(cartRef, {
      status: "active",
      userId: user.uid,
      items: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Firestore
    // Create user document
    const userRef = doc(db, "users", user.uid);
    batch.set(userRef, {
      name: name,
      email: email,
      phone: phone,
      gender: gender,
      avatar: avatarUrl,
      createdAt: serverTimestamp(),
      cartID: cartRef.id, // Store the unique cart ID
      role: 'customer',
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();
    showMessage("success", "✅ Account created successfully! Redirecting...");
    window.location.href = "../../index.html";
    localStorage.setItem("userLoggedIn", "true");
  } catch (error) {
    showMessage("warning", "❌ Error: " + error.message);
  }
});

//  logout
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("Logging out...");
  signOut(auth)
    .then(() => {
      localStorage.removeItem("userLoggedIn");
      localStorage.removeItem("carts");
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
document.getElementById("googleLogin")?.addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Google User:", user);

    // Check if Firestore user doc exists
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Batch to create user + cart
      const batch = writeBatch(db);

      // Create cart
      const cartRef = doc(collection(db, "carts"));
      batch.set(cartRef, {
        status: "active",
        userId: user.uid,
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create user doc
      batch.set(userRef, {
        name: user.displayName || "Google User",
        email: user.email,
        phone: user.phoneNumber || "",
        gender: "other",
        avatar: user.photoURL || "none",
        createdAt: serverTimestamp(),
        cartID: cartRef.id,
        role: "customer",
        status: "active",
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      console.log("New Google user added to Firestore.");
    }
    window.location.href = "../../index.html";
    localStorage.setItem("userLoggedIn", "true");

  } catch (error) {
    console.error("Google Login Error:", error);
    const errorDiv = document.getElementById("loginError");
    errorDiv.innerText = error.message;
    errorDiv.style.display = "block";
  }
});

// forgot password
document.getElementById("forgotPasswordForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

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



function showMessage(type = "info", message) {
  const messageDiv = document.getElementById("showUpdateMessages");

  messageDiv.className = `alert alert-${type} text-center`;
  messageDiv.textContent = message;
  messageDiv.classList.remove("d-none");
  setTimeout(() => {
    messageDiv.classList.add("d-none");
  }, 3000);
}