import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) return navigate("/login");

    (async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/decrypt", {
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
