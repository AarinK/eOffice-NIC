import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (token) {
      // Save the encrypted token in localStorage
      localStorage.setItem("auth_token", token);

      // Call backend to decrypt and validate
      (async () => {
        try {
          const res = await fetch("http://localhost:5000/auth/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const data = await res.json();
          console.log("Decryption response:", data);

          if (data.valid && data.payload) {
            localStorage.setItem("user_name", data.payload.name);
            navigate("/dashboard");
          } else {
            navigate("/login");
          }
        } catch (err) {
          console.error("Error during token decryption:", err);
          navigate("/login");
        }
      })();
    } else {
      navigate("/login");
    }
  }, [search, navigate]);

  return <div>Logging in...</div>;
}
