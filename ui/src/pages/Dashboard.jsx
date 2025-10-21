import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loginProvider, setLoginProvider] = useState(null);
  const navigate = useNavigate();
const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const provider = localStorage.getItem("login_provider");
    setLoginProvider(provider);

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${BASE_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        setUser(data.user);
        if (data.user?.email) localStorage.setItem("user_email", data.user.email);
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
  }, [navigate]);

  // Logout handlers
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("login_provider");
    navigate("/login");
  };

  const handleGoogleLogout = () => {
    handleLogout();
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

      {/* ✅ Show Google logout only if logged in via Google */}
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
