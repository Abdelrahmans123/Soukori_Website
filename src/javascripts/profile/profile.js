import { auth, db } from "../Auth/firebase-config.js";
import { onAuthStateChanged, sendEmailVerification, updateEmail, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";

const profileDataEl = document.querySelector(".profileData");

// Helper: render loading spinner
function showLoading() {
  profileDataEl.innerHTML = `
    <div class="d-flex justify-content-center align-items-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
}

// Helper: render "not logged in"
function showNotLoggedIn() {
  profileDataEl.innerHTML = `
    <div class="alert alert-warning mt-3">
      There is nothing to show here. Please log in.
    </div>
  `;
}

// Watch auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showNotLoggedIn();
    return;
  }

  showLoading(); // show spinner first

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      profileDataEl.innerHTML = `<div class="alert alert-danger">No profile data found.</div>`;
      return;
    }

    const userData = userSnap.data();
    if(user.email !== userData.email){
      const updatedData ={
        email : user.email,
        updatedAt : serverTimestamp(),
      }
      await updateDoc(userRef, updatedData);
    }
    profileDataEl.innerHTML = `
      <form id="profileForm" class="card p-4 shadow-sm">
        <div class="d-flex flex-column align-items-center mb-3">
          ${userData.avatar && userData.avatar !== "none"
        ? `<img src="${userData.avatar}" class="rounded-circle mb-2" width="120" height="120" id="profileAvatar" />`
        : `<i class="fas fa-user-circle fa-5x text-secondary mb-2" id="profileAvatarIcon"></i>`
      }
        </div>

        <div class="mb-3">
        <label class="form-label">Avatar Upload</label>
        <input type="file" id="avatarUpload" class="form-control mt-2" />
        </div>

        <div class="mb-3">
          <label class="form-label">Name</label>
          <input type="text" class="form-control" id="name" value="${userData.name || ""}" />
        </div>

        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="email" value="${user.email || ""}" />
        </div>

        <div class="mb-3">
          <label class="form-label">Phone</label>
          <input type="text" class="form-control" id="phone" value="${userData.phone || ""}" />
        </div>

        <div class="mb-3">
          <label class="form-label">Gender</label>
          <select class="form-control" id="gender">
            <option value="male" ${userData.gender === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${userData.gender === "female" ? "selected" : ""}>Female</option>
            <option value="other" ${userData.gender === "other" ? "selected" : ""}>Other</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Email Verified</label>
          <input type="text" class="form-control" id="emailVerifiedStatus" value="${user.emailVerified ? "Yes ✅" : "No ❌"
      }" disabled />
        </div>
        <div class="mb-3 d-none emailVerificationLink" id="emailVerificationDiv">
  <a class="btn btn-outline-secondary" id="verifyEmailBtn">Verify Your Email</a>
</div>

        <button type="submit" class="btn btn-dark rounded-pill w-50 mx-auto">Save Changes</button>
        <div id="statusMessage" class="alert d-none text-center" role="alert"></div>
      </form>
    `;

    const emailVerificationDiv = document.getElementById("emailVerificationDiv");
    if (!user.emailVerified) {
      emailVerificationDiv.classList.remove("d-none");

      document.getElementById("verifyEmailBtn").addEventListener("click", async () => {
        try {
          await sendEmailVerification(user);
          showStatus("📧 Verification email sent! Please check your inbox.", "success");
        } catch (err) {
          showStatus("❌ Failed to send verification email: " + err.message, "danger");
        }
      });
    }

    // Attach form handler
    const formEl = document.getElementById("profileForm");
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();

      const lastUpdate = userData.updatedAt ? userData.updatedAt.toDate() : null;
      const createdDate = userData.createdAt ? userData.createdAt.toDate() : null;
      if (lastUpdate) {
        const now = new Date();
        const diffMs_now_lastUpdate = now - lastUpdate;
        const diffHours_now_lastUpdate  = diffMs_now_lastUpdate / (1000 * 60 * 60);

        const diffMs_now_createdDate = now - createdDate;
        const diffHours_now_createdDate  = diffMs_now_createdDate / (1000 * 60 * 60);

        if (diffHours_now_lastUpdate < 24 && diffHours_now_createdDate > 72) {
          const remainingHours = Math.ceil(24 - diffHours_now_lastUpdate);
          showStatus(`⚠️ You can update your profile again in ${remainingHours} hour(s).`, "warning");
          return;
        }
      }

      const nameValue = document.getElementById("name").value.trim();
      const phoneValue = document.getElementById("phone").value.trim();

      if (!nameValue || !phoneValue) {
        showStatus("⚠️ Name and Phone cannot be empty.", "warning");
        return;
      }

      const emailValue = document.getElementById("email").value.trim();
      
      if (emailValue !== user.email) {
        try {
          await verifyBeforeUpdateEmail(user, emailValue);
          showStatus("📧 Verification email sent to " + emailValue + ". Please confirm to update.", "success");
        } catch (err) {
          showStatus("❌ Failed to update email: " + err.message, "danger");
          return;
        }
      }

      // Show loading spinner instead of button text
      const submitBtn = formEl.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...`;

      const oldAvatarLink = userData.avatar;
      const newAvatar = document.getElementById("avatarUpload");
      let updatedAvatarURL;
      if (newAvatar.files && newAvatar.files.length > 0) {
        const imageFile = newAvatar.files[0];
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
        updatedAvatarURL = uploadData.secure_url;
      } else {
        updatedAvatarURL = oldAvatarLink;
      }

      const updatedData = {
        name: document.getElementById("name").value.trim(),
        avatar: updatedAvatarURL,
        phone: document.getElementById("phone").value.trim(),
        gender: document.getElementById("gender").value.trim(),
        updatedAt: serverTimestamp(),
      };

      try {
        await updateDoc(userRef, updatedData);
      } catch (err) {
        showStatus("⚠️ Something wrong went on!", "warning");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        window.location.reload();
      }
    });
  } catch (err) {
    profileDataEl.innerHTML = `<div class="alert alert-danger">Error loading profile: ${err.message}</div>`;
  }
});


function showStatus(message, type = "info") {
  const statusEl = document.getElementById("statusMessage");
  statusEl.className = `alert alert-${type} text-center`;
  statusEl.textContent = message;
  statusEl.classList.remove("d-none");
  setTimeout(() => {
    statusEl.classList.add("d-none");
  }, 5000);
}
