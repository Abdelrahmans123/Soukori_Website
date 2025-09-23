import { auth, db } from "../../Auth/firebase-config.js";
import {
	doc,
	setDoc,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import {
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithPopup,
} from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";
const googleProvider = new GoogleAuthProvider();

if (localStorage.getItem("adminLoggedIn") === "true") {
	if (
		window.location.pathname.includes("login.html") ||
		window.location.pathname.includes("register.html") ||
		window.location.pathname.includes("forgot-password.html")
	) {
		window.location.href = "../../../pages/admin/dashboard.html";
	}
}

// Form validation and submission
document
	.getElementById("registerForm")
	.addEventListener("submit", async function (e) {
		e.preventDefault();

		if (validateForm()) {
			await registerAdmin();
		}
	});

function validateForm() {
	let isValid = true;
	clearErrors();

	const name = document.getElementById("name").value.trim();
	const email = document.getElementById("email").value.trim();
	const phone = document.getElementById("phone").value.trim();
	const gender = document.getElementById("gender").value;
	const password = document.getElementById("password").value;
	const confirmPassword = document.getElementById("confirmPassword").value;

	// Name validation
	if (name.length < 2) {
		showError("nameError", "Name must be at least 2 characters");
		isValid = false;
	} else if (/\d/.test(name)) {
		showError("nameError", "Name cannot contain numbers");
		isValid = false;
	}

	// Email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		showError("emailError", "Please enter a valid email address");
		isValid = false;
	}

	// Phone validation
	const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
	if (!phoneRegex.test(phone)) {
		showError("phoneError", "Please enter a valid phone number");
		isValid = false;
	}

	// Gender validation
	if (!gender) {
		showError("genderError", "Please select your gender");
		isValid = false;
	}

	// Password validation
	if (password.length < 6) {
		showError("passwordError", "Password must be at least 6 characters");
		isValid = false;
	} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
		showError(
			"passwordError",
			"Password must contain uppercase, lowercase, and number"
		);
		isValid = false;
	}

	// Confirm password validation
	if (password !== confirmPassword) {
		showError("confirmPasswordError", "Passwords do not match");
		isValid = false;
	}

	return isValid;
}

async function registerAdmin() {
	const name = document.getElementById("name").value.trim();
	const email = document.getElementById("email").value.trim();
	const phone = document.getElementById("phone").value.trim();
	const gender = document.getElementById("gender").value;
	const role = "admin"; // Default role for manual sign-up
	const password = document.getElementById("password").value;

	const registerBtn = document.querySelector(".btn-black");
	registerBtn.innerHTML =
		'<i class="fas fa-spinner fa-spin me-2"></i>CREATING ACCOUNT...';
	registerBtn.disabled = true;

	try {
		// Create user with Firebase Authentication
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password
		);
		const user = userCredential.user;

		// Save admin data to Firestore
		await setDoc(doc(db, "users", user.uid), {
			name: name,
			email: email,
			phone: phone,
			gender: gender,
			role: role,
			status: "active",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		alert("Admin registration successful! Welcome to SOUKORI Admin Panel.");
		localStorage.setItem("adminLoggedIn", "true");
		window.location.href = "../../../pages/admin/dashboard.html";
	} catch (error) {
		console.error("Registration error:", error);
		const errorDiv = document.getElementById("registerError");
		errorDiv.textContent = "Registration failed: " + error.message;
		errorDiv.classList.remove("d-none");

		registerBtn.innerHTML =
			'<i class="fas fa-user-plus me-2"></i>CREATE ADMIN ACCOUNT';
		registerBtn.disabled = false;
	}
}

document
	.getElementById("googleRegister")
	.addEventListener("click", async function () {
		try {
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;
			await setDoc(doc(db, "users", user.uid), {
				name: user.displayName || "Google Admin",
				email: user.email,
				phone: user.phoneNumber || "",
				gender: "other",
				role: "admin",
				status: "active",
				avatar: user.photoURL || "",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			alert("Google registration successful! Welcome to SOUKORI Admin.");
			localStorage.setItem("adminLoggedIn", "true");
			window.location.href = "../../../pages/admin/dashboard.html";
		} catch (error) {
			console.error("Google registration error:", error);
			const errorDiv = document.getElementById("registerError");
			errorDiv.textContent = "Google registration failed: " + error.message;
			errorDiv.classList.remove("d-none");
		}
	});

function showError(elementId, message) {
	document.getElementById(elementId).textContent = message;
}

function clearErrors() {
	const errorElements = document.querySelectorAll(".error-message");
	errorElements.forEach((element) => (element.textContent = ""));

	const errorDiv = document.getElementById("registerError");
	errorDiv.classList.add("d-none");
}
document
	.getElementById("confirmPassword")
	.addEventListener("input", function () {
		const password = document.getElementById("password").value;
		const confirmPassword = this.value;

		if (password === confirmPassword && confirmPassword.length > 0) {
			document.getElementById("confirmPasswordError").textContent = "";
		} else if (confirmPassword.length > 0) {
			document.getElementById("confirmPasswordError").textContent =
				"Passwords do not match";
		}
	});
