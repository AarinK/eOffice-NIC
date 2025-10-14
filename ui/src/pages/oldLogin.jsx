import React, { useState } from "react";
import axios from "axios";

export default function Login() {
  const [ldapUsername, setLdapUsername] = useState("");
  const [userExists, setUserExists] = useState(null);
  const [userMobile, setUserMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OAuth redirects
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google?service=portalA";
  };
  const handleFacebookLogin = () => {
    window.location.href = "http://localhost:5000/auth/facebook";
  };
  const handleTwitterLogin = () => {
    window.location.href = "http://localhost:5000/auth/twitter";
  };

  // 🔹 Check if LDAP user exists (without password)
  const handleLDAPCheck = async (username) => {
    if (!username) {
      setUserExists(null);
      setUserMobile("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `http://localhost:5000/auth/checkUser?username=${encodeURIComponent(username)}`
      );

      setUserExists(res.data.exists);
      setUserMobile(res.data.mobile || "");
    } catch (err) {
      console.error("LDAP check failed:", err);
      setError("Failed to check user");
      setUserExists(null);
      setUserMobile("");
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "10px 20px",
    margin: "10px 0",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    width: "250px",
    boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          padding: "40px",
          borderRadius: "12px",
          background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>Login to Your Account</h2>

        {/* OAuth buttons */}
        <button
          onClick={handleGoogleLogin}
          style={{ ...buttonStyle, background: "#DB4437" }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png"
            alt="Google"
            width="20"
          />
          Login with Google
        </button>

        <button
          onClick={handleFacebookLogin}
          style={{ ...buttonStyle, background: "#4267B2" }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png"
            alt="Facebook"
            width="20"
          />
          Login with Facebook
        </button>

        <button
          onClick={handleTwitterLogin}
          style={{ ...buttonStyle, background: "#1DA1F2" }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/en/9/9f/Twitter_bird_logo_2012.svg"
            alt="Twitter"
            width="20"
          />
          Login with Twitter
        </button>

        {/* LDAP Username input */}
        <div style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Enter LDAP Username"
            value={ldapUsername}
            onChange={(e) => {
              setLdapUsername(e.target.value);
              handleLDAPCheck(e.target.value); // check on every change
            }}
            style={{
              padding: "10px",
              width: "230px",
              marginBottom: "10px",
              borderRadius: "6px",
              background:"red"
            }}
          />
        </div>

        {/* Show user existence and phone */}
        {loading && <p>Checking user...</p>}
        {userExists === true && (
          <p style={{ color: "green" }}>
            ✅ User exists. Mobile: {userMobile || "N/A"}
          </p>
        )}
        {userExists === false && (
          <p style={{ color: "red" }}>❌ User does not exist</p>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
}

