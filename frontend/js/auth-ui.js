function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch (error) {
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  closeAuthDropdown();
  alert("Bạn đã đăng xuất");
  window.location.href = "index.html";
}

function goToAccount() {
  closeAuthDropdown();
  window.location.href = "account.html";
}

function goToOrders() {
  closeAuthDropdown();
  window.location.href = "orders.html";
}

function goToAdmin() {
  closeAuthDropdown();
  window.location.href = "admin.html";
}

function goToLogin() {
  window.location.href = "login.html";
}

function getDisplayName(user) {
  if (!user) return "User";

  const fullName = (user.full_name || "").trim();
  if (!fullName) return user.email || "User";

  const parts = fullName.split(" ").filter(Boolean);
  const lastName = parts[parts.length - 1] || fullName;

  return lastName.length > 10 ? lastName.slice(0, 10) + "…" : lastName;
}

function getInitial(user) {
  const fullName = (user?.full_name || "").trim();
  const email = (user?.email || "").trim();

  if (fullName) return fullName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

function isMobileView() {
  return window.innerWidth <= 768;
}

function closeAuthDropdown() {
  const dropdown = document.getElementById("auth-mobile-dropdown");
  if (dropdown) {
    dropdown.style.display = "none";
  }
}

function toggleAuthDropdown() {
  const dropdown = document.getElementById("auth-mobile-dropdown");
  if (!dropdown) return;

  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function renderDesktopAuth(user, isAdmin) {
  const displayName = getDisplayName(user);
  const initial = getInitial(user);

  return `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <button
        onclick="goToAccount()"
        title="Tài khoản của tôi"
        style="
          display:flex;
          align-items:center;
          gap:8px;
          padding:6px 12px 6px 6px;
          border:1px solid #ddd;
          border-radius:999px;
          background:#fff;
          cursor:pointer;
          height:44px;
        "
      >
        <span
          style="
            width:30px;
            height:30px;
            border-radius:999px;
            background:#111;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:13px;
            font-weight:700;
            flex-shrink:0;
          "
        >
          ${initial}
        </span>
        <span
          style="
            font-size:14px;
            font-weight:700;
            color:#111;
            white-space:nowrap;
            line-height:1;
          "
        >
          ${displayName}
        </span>
      </button>

      <button
        onclick="goToOrders()"
        title="Đơn hàng của tôi"
        style="
          padding:0 14px;
          height:44px;
          border:1px solid #ddd;
          border-radius:999px;
          background:#fff;
          color:#111;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          white-space:nowrap;
        "
      >
        Đơn hàng
      </button>

      ${isAdmin ? `
        <button
          onclick="goToAdmin()"
          title="Trang quản trị"
          style="
            padding:0 14px;
            height:44px;
            border:1px solid #ddd;
            border-radius:999px;
            background:#fff;
            color:#111;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
            white-space:nowrap;
          "
        >
          Admin
        </button>
      ` : ""}

      <button
        onclick="logout()"
        title="Đăng xuất"
        style="
          width:44px;
          height:44px;
          border:none;
          border-radius:999px;
          background:#111;
          color:#fff;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        ⎋
      </button>
    </div>
  `;
}

function renderMobileAuth(user, isAdmin) {
  const initial = getInitial(user);

  return `
    <div style="position:relative;">
      <button
        onclick="toggleAuthDropdown()"
        title="Tài khoản"
        style="
          width:44px;
          height:44px;
          border:none;
          border-radius:999px;
          background:#111;
          color:#fff;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        ${initial}
      </button>

      <div
        id="auth-mobile-dropdown"
        style="
          display:none;
          position:absolute;
          top:54px;
          right:0;
          min-width:190px;
          background:#fff;
          border:1px solid #eaeaea;
          border-radius:18px;
          box-shadow:0 14px 36px rgba(0,0,0,0.12);
          padding:10px;
          z-index:2000;
        "
      >
        <div
          style="
            padding:10px 12px 12px;
            border-bottom:1px solid #f0f0f0;
            margin-bottom:8px;
          "
        >
          <div style="font-size:13px; color:#666; margin-bottom:4px;">Đã đăng nhập</div>
          <div style="font-size:14px; font-weight:700; color:#111;">
            ${user.full_name || user.email || "User"}
          </div>
        </div>

        <button
          onclick="goToAccount()"
          style="
            width:100%;
            text-align:left;
            padding:12px 12px;
            border-radius:12px;
            background:#fff;
            color:#111;
            font-size:14px;
            font-weight:700;
          "
        >
          Tài khoản
        </button>

        <button
          onclick="goToOrders()"
          style="
            width:100%;
            text-align:left;
            padding:12px 12px;
            border-radius:12px;
            background:#fff;
            color:#111;
            font-size:14px;
            font-weight:700;
          "
        >
          Đơn hàng
        </button>

        ${isAdmin ? `
          <button
            onclick="goToAdmin()"
            style="
              width:100%;
              text-align:left;
              padding:12px 12px;
              border-radius:12px;
              background:#fff;
              color:#111;
              font-size:14px;
              font-weight:700;
            "
          >
            Admin
          </button>
        ` : ""}

        <button
          onclick="logout()"
          style="
            width:100%;
            text-align:left;
            padding:12px 12px;
            border-radius:12px;
            background:#fff5f5;
            color:#b42318;
            font-size:14px;
            font-weight:700;
            margin-top:4px;
          "
        >
          Đăng xuất
        </button>
      </div>
    </div>
  `;
}

function renderAuthHeader() {
  const authArea = document.getElementById("auth-area");
  if (!authArea) return;

  const token = getStoredToken();
  const user = getStoredUser();

  if (token && user) {
    const isAdmin = user.role === "admin";

    if (isMobileView()) {
      authArea.innerHTML = renderMobileAuth(user, isAdmin);
    } else {
      authArea.innerHTML = renderDesktopAuth(user, isAdmin);
    }
  } else {
    authArea.innerHTML = `
      <button
        onclick="goToLogin()"
        title="Đăng nhập"
        style="
          width:44px;
          height:44px;
          border:1px solid #ddd;
          border-radius:999px;
          background:#fff;
          cursor:pointer;
          font-size:18px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        👤
      </button>
    `;
  }
}

document.addEventListener("DOMContentLoaded", renderAuthHeader);

window.addEventListener("resize", () => {
  closeAuthDropdown();
  renderAuthHeader();
});

document.addEventListener("click", (e) => {
  const authArea = document.getElementById("auth-area");
  const dropdown = document.getElementById("auth-mobile-dropdown");

  if (!authArea || !dropdown) return;

  const clickedInside = authArea.contains(e.target);
  if (!clickedInside) {
    closeAuthDropdown();
  }
});