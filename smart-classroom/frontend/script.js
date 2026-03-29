// 🔥 Backend URL (IMPORTANT)
const BASE_URL = "https://ai-smart-classroom-1.onrender.com";

// ───────── LOGIN ─────────
function login() {
  const role = document.getElementById("role").value;
  const username = document.getElementById("username").value;

  if (username === "") {
    alert("Enter Username");
    return;
  }

  // Save user locally
  localStorage.setItem("user", username);

  // ✅ FIXED ROUTING (Vercel safe)
  if (role === "student") {
    window.location.href = "/student.html";
  } 
  else if (role === "teacher") {
    window.location.href = "/teacher.html";
  } 
  else {
    window.location.href = "/admin.html";
  }
}

// ───────── LOGOUT ─────────
function logout() {
  localStorage.clear();
  window.location.href = "/index.html";
}

// ───────── HELPER (API CALL) ─────────
// Future use ke liye ready (optional but powerful)
async function api(url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    alert("Server error or backend sleeping (wait 30s)");
  }
}
