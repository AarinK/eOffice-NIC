import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    // If no token present in URL → redirect to login
    if (!token) return navigate("/login");

    (async () => {
      try {
        // 1️⃣ Decrypt the token using backend
        const res = await fetch(`${BASE_URL}/auth/decrypt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.valid && data.jwt) {
          // 2️⃣ Save JWT in localStorage
          localStorage.setItem("auth_token", data.jwt);

          // 3️⃣ Save user info
          localStorage.setItem("user_name", data.payload.name || "User");

          // 4️⃣ Save login provider
          localStorage.setItem("login_provider", data.payload.provider || "ldap");

          // 5️⃣ Optional: save email if present
          if (data.payload.email) localStorage.setItem("user_email", data.payload.email);

          // 6️⃣ Redirect to dashboard
          navigate("/dashboard");
        } else {
          console.error("Invalid token or decryption failed", data);
          navigate("/login");
        }
      } catch (err) {
        console.error("[AuthCallback] Error decrypting token:", err);
        navigate("/login");
      }
    })();
  }, [search, navigate]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "1.2rem",
        color: "#444",
      }}
    >
      Logging in...
    </div>
  );
}
