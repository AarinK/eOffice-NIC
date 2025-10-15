import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (token) {
      // Store the JWT directly
      localStorage.setItem("auth_token", token);

      // Optional: if backend sends user name in query or payload, store it
      const name = params.get("name") || "User"; 
      localStorage.setItem("user_name", name);

      // Redirect to dashboard
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [search, navigate]);

  return <div>Logging in...</div>;
}
