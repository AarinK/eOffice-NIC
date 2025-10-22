import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loginProvider, setLoginProvider] = useState(null);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

  useEffect(() => {
    console.log("[Dashboard] useEffect triggered");

    const token = localStorage.getItem("auth_token");
    const provider = localStorage.getItem("login_provider");
    setLoginProvider(provider);
    console.log("[Dashboard] Token:", token);
    console.log("[Dashboard] Login Provider:", provider);

    if (!token) {
      console.log("[Dashboard] No token found, redirecting to /login");
      navigate("/login");
      return;
    }

    const fetchDashboard = async () => {
      try {
        console.log("[Dashboard] Fetching dashboard data...");
        const res = await fetch(`${BASE_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("[Dashboard] Dashboard response status:", res.status);

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        console.log("[Dashboard] Dashboard data received:", data);
        setUser(data.user);

        if (data.user?.email) {
          localStorage.setItem("user_email", data.user.email);
          console.log("[Dashboard] User email saved in localStorage");
        }
      } catch (err) {
        console.error("[Dashboard] Token invalid or expired", err);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("login_provider");
        navigate("/login");
      }
    };

    fetchDashboard();
  }, [navigate, BASE_URL]);

  
  // Logout handlers
const handleLogout = async () => {
  let token = localStorage.getItem("auth_token");
  console.log("[Logout] Token from localStorage:", token);

  if (!token) {
    console.log("[Logout] No token found, redirecting to login");
    navigate("/login");
    return;
  }

  try {
    // ✅ Encrypt the token before sending
    const resEncrypt = await fetch(`${BASE_URL}/auth/encrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: token }),
    });
    const dataEncrypt = await resEncrypt.json();
    if (!dataEncrypt.success) throw new Error("Encryption failed");

    const encryptedToken = dataEncrypt.encrypted;
    console.log("[Logout] Encrypted token:", encryptedToken);

    // ✅ Send encrypted token to logout API
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${encryptedToken}`, // send encrypted
      },
    });

    console.log("[Logout] Logout API response status:", res.status);
    const data = await res.json();
    console.log("[Logout] Logout API response data:", data);

  } catch (err) {
    console.error("[Logout] Logout API failed:", err);
  }

  // Clear localStorage and redirect
  console.log("[Logout] Clearing localStorage and navigating to /login");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  localStorage.removeItem("login_provider");
  navigate("/login");
};


  const handleGoogleLogout = async () => {
    console.log("[GoogleLogout] Triggered Google logout flow");
    await handleLogout();
    console.log("[GoogleLogout] Redirecting to Google logout URL...");
    window.location.href =
      "https://accounts.google.com/Logout?continue=https://www.youtube.com";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "20px",
        background: "#f5f5f5",
      }}
    >
      <h1 style={{ fontSize: "2rem" }}>Welcome {user?.name || "User"} 👋</h1>

      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "8px",
          cursor: "pointer",
          background: "#4caf50",
          color: "#fff",
          border: "none",
        }}
      >
        Logout (App Only)
      </button>

      {loginProvider === "google" && (
        <button
          onClick={handleGoogleLogout}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            cursor: "pointer",
            background: "#db4437",
            color: "#fff",
            border: "none",
          }}
        >
          Logout (Google Account)
        </button>
      )}
    </div>
  );
}
