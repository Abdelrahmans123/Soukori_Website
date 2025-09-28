import { auth, db } from "./firebase-config.js";
import {
    doc,
    writeBatch,
    collection,
    serverTimestamp,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";


const provider = new GoogleAuthProvider();
const authEl = document.querySelector(".authButtons");
const userDropdownEl = document.querySelector(".user-dropdown");
const loginBUtton = document.getElementById("loggingInBtn");
const registerBTN = document.getElementById("registerBTN");
const cartBadge = document.querySelector(".badge.rounded-pill.bg-danger");


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
    if (
        window.location.pathname.includes("login.html") ||
        window.location.pathname.includes("register.html") ||
        window.location.pathname.includes("forgot-password.html")
    ) {
        window.location.href = "../../index.html";
    }
} else {
    showAuth();
}

// Update cart counter
function updateCartBadge() {
    const carts = JSON.parse(localStorage.getItem("carts")) || [];

    if (carts.length > 0) {
        cartBadge.textContent = `${carts.length}`; // make sure it's visible
    } else {
        cartBadge.textContent = "";
    }
}

//  onAuthStateChanged for confirmation
onAuthStateChanged(auth, (user) => {
    updateCartBadge();
    if (user) {
        showUserDropdown();
        localStorage.setItem("userLoggedIn", "true"); // Store the login state
        localStorage.setItem("userId", user.uid); // Store the user ID
    } else {
        showAuth();
        localStorage.removeItem("userLoggedIn"); // Remove state if no user
    }
});

// redirects admins & loads user cart from firestore to local storage
async function afterLogin(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            // Check if user is admin and redirect accordingly
            if (userData.role === "admin") {
                localStorage.setItem("adminLoggedIn", "true");
                localStorage.setItem("userRole", userData.role);
                localStorage.setItem("userName", userData.name);
                window.location.href = "../admin/dashboard.html";
                return;
            }

            await mergeCart(user, userData.cartID);
            window.location.href = "../../index.html";
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        window.location.href = "../../index.html";
    }
}

//  login
document.getElementById("loginForm")?.addEventListener("submit", (e) => {
    const loginBUtton = document.getElementById("loggingInBtn");
    loginBUtton.innerHTML = `Logging in... <span class="spinner"></span>`;
    loginBUtton.style.background = "grey";
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            await afterLogin(user);
            localStorage.setItem("userLoggedIn", "true"); // Store the login state
            showUserDropdown();
        })
        .catch((error) => {
            const errorDiv = document.getElementById("loginError");
            errorDiv.innerText = error.message;
            errorDiv.style.display = "block";
            loginBUtton.innerHTML = `Log in`;
            loginBUtton.style.background = "black";
        });
});

//  register   -> cart done
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const gender = document.getElementById("gender").value;
    const avatar = document.getElementById("avatar");
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (password !== confirmPassword) {
        showMessage("warning", "❌ Error: Passwords do not match");
        return;
    }
    registerBTN.innerHTML = `Registering... <span class="spinner"></span>`;
    registerBTN.style.background = "grey";

    try {
        // Authentication
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;

        // Handle avatar upload to Cloudinary
        let avatarUrl = "none";
        if (avatar.files && avatar.files.length > 0) {
            const imageFile = avatar.files[0];
            const formData = new FormData();
            formData.append("file", imageFile);
            formData.append("upload_preset", "users_avatars");

            const uploadResponse = await fetch(
                `https://api.cloudinary.com/v1_1/dhpeof9u7/image/upload`,
                {
                    method: "POST",
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

        const cartData = JSON.parse(localStorage.getItem('carts'));
        // get the cart from local storage 
        //      => Save the cart in his cart document
        //          => load the cart from the local storage

        // Create cart document with a unique ID
        const cartRef = doc(collection(db, "carts")); // Generates a random ID
        batch.set(cartRef, {
            status: "active",
            userId: user.uid,
            items: cartData,
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
            role: "customer",
            status: "active",
            updatedAt: serverTimestamp(),
        });

        // Commit the batch
        await batch.commit();
        await sendEmailVerification(user);
        showMessage("success", "✅ Account created successfully! Please check your email for verifcation");
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem('cartId',cartRef.id);
        registerBTN.innerHTML = `Redirecting... <span class="spinner"></span>`;
        setTimeout(()=>{window.location.href = "../../index.html";},2500)
    } catch (error) {
        registerBTN.innerHTML = `Register`;
        registerBTN.style.background = "black";
        showMessage("warning", "❌ Error: " + error.message);
    }
});

// Google Login
document.getElementById("googleLogin")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const loginButton = document.getElementById("loggingInBtn") || document.getElementById("googleLogin");
    loginButton.innerHTML = `Logging in... <span class="spinner"></span>`;
    loginButton.style.background = "grey";

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            // Batch to create user + cart
            const batch = writeBatch(db);

            // Create cart
            const cartRef = doc(collection(db, "carts"));
            const cartData = JSON.parse(localStorage.getItem('carts'));
            batch.set(cartRef, {
                status: "active",
                userId: user.uid,
                items: cartData,
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
        } 

        // After login, check role and redirect appropriately
        await afterLogin(user);
        localStorage.setItem("userLoggedIn", "true");
    } catch (error) {
        loginButton.innerHTML = `Log in`;
        loginButton.style.background = "black";
        console.error("Google Login Error:", error);
        const errorDiv = document.getElementById("loginError");
        errorDiv.innerText = error.message;
        errorDiv.style.display = "block";
    }
});

//  logout
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
        .then(() => {
            localStorage.removeItem("userLoggedIn");
            localStorage.removeItem("adminLoggedIn");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userName");
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

// forgot password
document.getElementById("forgotPasswordForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();

    sendPasswordResetEmail(auth, email)
        .then(() => {
            const sendEmailDiv = document.getElementById("sendEmail");
            sendEmailDiv.innerText =
                " Reset link sent to your email. Check your inbox.";
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

// show messages
function showMessage(type = "info", message) {
  let config = {
    position: "top-end",
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 2000,
    toast: true,
    customClass: {
      popup: "colored-toast",
    },
  };

  // Custom background/text colors depending on type
  if (type === "success") {
    config.background = "#d4edda";
    config.color = "#155724";
  } else if (type === "error") {
    config.background = "#f8d7da";
    config.color = "#721c24";
  } else if (type === "warning") {
    config.background = "#fff3cd";
    config.color = "#856404";
  } else if (type === "info") {
    config.background = "#d1ecf1";
    config.color = "#0c5460";
  }

  Swal.fire(config);
}

// cart updates when user logs in
async function mergeCart(user, cartIdFromUserDoc) {
    const localCart = JSON.parse(localStorage.getItem("carts")) || [];
    console.log('local cart: ',localCart);
    
    let firestoreCart = [];
    let cartRef;
    localStorage.setItem('cartId',cartIdFromUserDoc);

    if (cartIdFromUserDoc) {
        // Existing cart in Firestore
        cartRef = doc(db, "carts", cartIdFromUserDoc);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
            firestoreCart = cartSnap.data().items || [];
        }
        console.log('firestoreCart: ',firestoreCart);

    }

    // --- Merge Logic ---
    const merged = [];

    // Start with Firestore items
    firestoreCart.forEach((item) => merged.push({ ...item }));

    // Add local items with merge rules
    localCart.forEach((localItem) => {
        const matchIndex = merged.findIndex(
            (m) =>
                m.id === localItem.id &&
                m.color === localItem.color &&
                m.size === localItem.size
        );

        if (matchIndex > -1) {
            // Same product, same color & size → sum quantities
            merged[matchIndex].quantity =
                (merged[matchIndex].quantity || 0) +
                (localItem.quantity || 0);
        } else {
            // Unique item → just add it
            merged.push(localItem);
        }
    });
    console.log('merged: ',merged)
    // --- Update Firestore ---
    await updateDoc(cartRef, {
        items: merged,
        updatedAt: serverTimestamp(),
    });

    // --- Update LocalStorage ---
    localStorage.setItem("carts", JSON.stringify(merged));

    return merged;
}