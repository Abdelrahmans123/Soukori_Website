import { auth, db } from "../../Auth/firebase-config.js";
import {
	doc,
	getDoc,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import {
	signInWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
	GoogleAuthProvider,
	signInWithPopup,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";
const googleProvider = new GoogleAuthProvider();

function updateAdminName() {
	const adminButton = document.getElementById("adminName");
	const userName = localStorage.getItem("userName");
	if (adminButton && userName) {
		adminButton.textContent = userName.toUpperCase();
	}
}

onAuthStateChanged(auth, async (user) => {
	if (user) {
		try {
			const userDoc = await getDoc(doc(db, "users", user.uid));
			if (userDoc.exists() && userDoc.data().role === "admin") {
				localStorage.setItem("adminLoggedIn", "true");
				localStorage.setItem("userRole", userDoc.data().role);
				localStorage.setItem("userName", userDoc.data().name);
				updateAdminName();
				if (
					window.location.pathname.includes("login.html") ||
					window.location.pathname.includes("register.html")
				) {
					window.location.href = "../../../pages/admin/dashboard.html";
				}
			} else {
				console.log("User is not an admin or document not found");
				window.location.href = "../../../index.html";
			}
		} catch (error) {
			console.error("Error checking admin status:", error);
		}
	} else {
		localStorage.removeItem("adminLoggedIn");
		localStorage.removeItem("userRole");
		localStorage.removeItem("userName");
		if (
			!window.location.pathname.includes("login.html") &&
			!window.location.pathname.includes("register.html")
		) {
			window.location.href = "../../auth/login.html";
		}
	}
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (validateForm()) {
		await loginAdmin();
	}
});

function validateForm() {
	let isValid = true;
	clearErrors();

	const email = document.getElementById("email")?.value.trim();
	const password = document.getElementById("password")?.value;

	if (!email || !password) {
		showError("Form fields are missing");
		return false;
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		showError("Please enter a valid email address");
		isValid = false;
	}

	if (password.length < 6) {
		showError("Password must be at least 6 characters");
		isValid = false;
	}

	return isValid;
}

async function loginAdmin() {
	const email = document.getElementById("email").value.trim();
	const password = document.getElementById("password").value;
	const loginBtn = document.querySelector(".btn-black");

	loginBtn.innerHTML =
		'<i class="fas fa-spinner fa-spin me-2"></i>SIGNING IN...';
	loginBtn.disabled = true;

	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			email,
			password
		);
		const user = userCredential.user;
		const userDoc = await getDoc(doc(db, "users", user.uid));

		if (userDoc.exists()) {
			const userData = userDoc.data();
			if (userData.role === "admin") {
				localStorage.setItem("adminLoggedIn", "true");
				localStorage.setItem("userRole", userData.role);
				localStorage.setItem("userName", userData.name);

				alert(
					`Welcome back, ${userData.name}! Redirecting to admin dashboard.`
				);
				window.location.href = "../../../pages/admin/dashboard.html";
			} else {
				throw new Error("Access denied. Admin privileges required.");
			}
		} else {
			throw new Error(
				"User profile not found. Please register or contact administrator."
			);
		}
	} catch (error) {
		console.error("Login error:", error);
		showError("Login failed: " + error.message);
		loginBtn.innerHTML = '<i class="fas fa-envelope me-2"></i>EMAIL LOGIN';
		loginBtn.disabled = false;
	}
}

async function loginWithGoogle() {
	try {
		const result = await signInWithPopup(auth, googleProvider);
		const user = result.user;
		const userDoc = await getDoc(doc(db, "users", user.uid));

		if (userDoc.exists()) {
			const userData = userDoc.data();
			if (userData.role === "admin") {
				localStorage.setItem("adminLoggedIn", "true");
				localStorage.setItem("userRole", userData.role);
				localStorage.setItem("userName", userData.name);
				alert(`Welcome back, ${userData.name}! Google login successful.`);
				window.location.href = "../../../pages/admin/dashboard.html";
			} else {
				throw new Error("Access denied. Admin privileges required.");
			}
		} else {
			throw new Error(
				"Account not found. Please register first or contact administrator."
			);
		}
	} catch (error) {
		console.error("Google login error:", error);
		showError("Google login failed: " + error.message);
	}
}

async function logout() {
	try {
		confirm("are you sure you want to logout?");
		await signOut(auth);
		localStorage.removeItem("adminLoggedIn");
		localStorage.removeItem("userRole");
		localStorage.removeItem("userName");
		console.log("User logged out successfully");
		window.location.href = "../../Auth/login.html";
	} catch (error) {
		console.error("Logout error:", error);
		showError("Logout failed: " + error.message);
	}
}

function showError(message) {
	const loginError = document.getElementById("loginError");
	loginError.textContent = message;
	loginError.classList.remove("d-none");
}

function clearErrors() {
	const errorDiv = document.getElementById("loginError");
	if (errorDiv) {
		errorDiv.classList.add("d-none");
	}
}

// Attach Event Listeners
document.addEventListener("DOMContentLoaded", () => {
	const googleLoginBtn = document.getElementById("googleLoginBtn");
	const logoutBtn = document.getElementById("logoutBtn");

	if (googleLoginBtn) {
		googleLoginBtn.addEventListener("click", loginWithGoogle);
	}
	if (logoutBtn) {
		logoutBtn.addEventListener("click", (e) => {
			e.preventDefault();
			logout();
		});
	}
	updateAdminName();
});
