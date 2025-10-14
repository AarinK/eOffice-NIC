// src/components/GoogleLogin.jsx
import React from "react";

export default function GoogleLogin() {
  const login = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  return <button onClick={login}>Login with Google</button>;
}