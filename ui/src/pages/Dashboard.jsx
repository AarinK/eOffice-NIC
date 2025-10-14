import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGoogleSessionCheck from "../hooks/useGoogleSessionCheck";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const encryptedToken = localStorage.getItem("auth_token");
    if (!encryptedToken) {
      navigate("/login");
      return;
    }

    // ✅ Decrypt token first
    const decryptToken = async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/decrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: encryptedToken }),
        });

        const data = await res.json();

        if (!data.valid || !data.jwt) {
          throw new Error("Token invalid or expired");
        }

        localStorage.setItem("auth_token", data.jwt); // store decrypted JWT

        // ✅ Now fetch dashboard info
        const dashRes = await fetch("http://localhost:5000/dashboard", {
          headers: { Authorization: `Bearer ${data.jwt}` },
        });

        if (!dashRes.ok) throw new Error("Unauthorized");

        const dashData = await dashRes.json();
        setUser(dashData.user);
        if (dashData.user?.email) localStorage.setItem("user_email", dashData.user.email);

      } catch (err) {
        console.error("[Dashboard] Token invalid or blacklisted", err);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        navigate("/login");
      }
    };

    decryptToken();
  }, [navigate]);

  // Logout handlers (unchanged)
  const handleLogout = () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch(`http://localhost:5000/auth/logout?token=${token}`).finally(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        navigate("/login");
      });
    } else {
      navigate("/login");
    }
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
    </div>
  );
}
