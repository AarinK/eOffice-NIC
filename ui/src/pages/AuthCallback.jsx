import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();
const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) return navigate("/login");

    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/decrypt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (data.valid && data.jwt) {
          localStorage.setItem("auth_token", data.jwt);
          localStorage.setItem("user_name", data.payload.name);
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    })();
  }, [search, navigate]);

  return <div>Logging in...</div>;
}
