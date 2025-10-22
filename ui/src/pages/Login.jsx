import React, { useState, useEffect, useRef } from "react";

export default function Login() {
  const [serviceKey, setServiceKey] = useState("portalA");
  const [step, setStep] = useState("username"); // username → otp
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [maskedNumber, setMaskedNumber] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);
const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;
console.log("BASE_URL:", BASE_URL);
  // TOTP states
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpStep, setTotpStep] = useState(false);

  // QR login states
  const [qrStep, setQrStep] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [polling, setPolling] = useState(null);

  // ✅ Read serviceKey from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sid = params.get("sid") || "portalA";
    if (!params.get("sid")) {
      params.set("sid", sid);
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    }
    setServiceKey(sid);
  }, []);

  // ✅ LDAP username submit
  const handleCheckLDAP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/checkUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, service_key: serviceKey }),
      });
      const data = await res.json();
      if (res.ok && data.userExists) {
        setOtpData(data);
        const mob = data.mobilenumber;
        setMaskedNumber("*".repeat(mob.length - 3) + mob.slice(-3));
        setStep("otp");
        setTimer(1 * 60);
        startTimer();
      } else {
        setError(data.error || "User not found");
      }
    } catch (err) {
      setError("Server error while checking username");
      console.error(err);
    }
    setLoading(false);
  };

  // ✅ Countdown
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ✅ OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpData) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/auth/verifyOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: otpData.mobilenumber,
          service_id: otpData.service_id,
          otp_code: otp,
          service_key: serviceKey,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.redirectUrl) {
        setError(data.error || "Invalid OTP or server error");
        setLoading(false);
        return;
      }

      const urlParams = new URL(data.redirectUrl);
      const encryptedToken = urlParams.searchParams.get("token");

      if (!encryptedToken) {
        setError("Token missing in server response");
        setLoading(false);
        return;
      }

      const decryptRes = await fetch(`${BASE_URL}/auth/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: encryptedToken }),
      });

      const decryptData = await decryptRes.json();

      if (!decryptData.valid || !decryptData.jwt) {
        setError("Failed to decrypt token");
        setLoading(false);
        return;
      }

      localStorage.setItem("auth_token", decryptData.jwt);
      localStorage.setItem("user_name", decryptData.payload.name || otpData.name || username);

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("[handleVerifyOTP] Error:", err);
      setError("Server error while verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  // ✅ OAuth
const handleGoogleLogin = () => {
  localStorage.setItem("login_provider", "google");
  window.location.href = `${BASE_URL}/auth/google?service=${serviceKey}`;
};
const handleFacebookLogin = () => {
  localStorage.setItem("login_provider", "facebook");
  window.location.href = `http://localhost:5000/auth/facebook?service=${serviceKey}`;
};  const handleTwitterLogin = () => window.location.href = `${BASE_URL}/auth/twitter?service=${serviceKey}`;

  // ✅ TOTP setup
  const handleShowTOTP = async () => {
    if (!otpData) return setError("Complete LDAP login first");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/totp/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: otpData.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setTotpSetup(data);
        setTotpStep(true);
      } else {
        setError(data.error || "Failed to setup TOTP");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while setting up TOTP");
    }
    setLoading(false);
  };

  // ✅ TOTP verify
  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    if (!totpSetup || !totpToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/totp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: otpData.name, token: totpToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_name", otpData.name);
        localStorage.setItem("login_provider", "ldap"); // or "otp"

        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid TOTP code");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while verifying TOTP");
    }
    setLoading(false);
  };

  // ✅ QR Login (generate + poll)
const handleShowQR = async () => {
  setQrStep(true);
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`${BASE_URL}/auth/qr/init`, {
      method: "POST", // your backend might expect POST
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok || !data.loginId) {
      setError("Failed to initialize QR login");
      setLoading(false);
      return;
    }

    // Generate QR code URL pointing to a custom URL scheme or backend endpoint
    // Example: URL to poll: http://localhost:5000/auth/qr/status/<loginId>
    const qrPayload = `myapp://login?sessionId=${data.loginId}`; // you can customize the scheme
    // OR you can generate a QR image using an online service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      qrPayload
    )}&size=200x200`;

    setQrData({ sessionId: data.loginId, qrUrl });
    startPolling(data.loginId);
  } catch (err) {
    console.error(err);
    setError("Server error while initializing QR login");
  } finally {
    setLoading(false);
  }
};

// ✅ Resend OTP
const handleResendOTP = async () => {
  if (!otpData) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`${BASE_URL}/auth/resendOtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile_number: otpData.mobilenumber,
        service_id: otpData.service_id,
      }),
    });

    const data = await res.json();

    if (res.ok && data.otp_id) {
      // Update OTP data if needed
      setOtpData((prev) => ({ ...prev, otp_code: data.otp_code }));

      // Reset the timer to 1 minute
      setTimer(60);
      startTimer();
    } else {
      setError(data.error || "Failed to resend OTP");
    }
  } catch (err) {
    console.error(err);
    setError("Server error while resending OTP");
  } finally {
    setLoading(false);
  }
};




  const startPolling = (sessionId) => {
    if (polling) clearInterval(polling);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/qr/status/${sessionId}`);
        const data = await res.json();
        if (data.loggedIn) {
          clearInterval(interval);

          // decrypt token
          const decryptRes = await fetch(`${BASE_URL}/auth/decrypt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: data.token }),
          });
          const decryptData = await decryptRes.json();

          if (decryptData.valid && decryptData.jwt) {
            localStorage.setItem("auth_token", decryptData.jwt);
            window.location.href = "/dashboard";
          } else setError("Invalid token from QR login");
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
    setPolling(interval);
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
  };

    return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#000",
        color: "#fff",
      }}
    >
      <div
        style={{
          padding: "40px",
          borderRadius: "12px",
          background: "#111",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          textAlign: "center",
          width: "350px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          {step === "username" ? "Login with LDAP" : "Verify OTP"}
        </h2>

        <p style={{ marginBottom: "10px", color: "#aaa" }}>
          Service: <strong>{serviceKey}</strong>
        </p>

        {error && <p style={{ color: "red", marginBottom: "15px" }}>{error}</p>}

        {/* =============== LDAP USERNAME STEP =============== */}
        {step === "username" && !qrStep && (
          <>
            <form onSubmit={handleCheckLDAP}>
              <input
                type="text"
                placeholder="Enter Username or Mobile Number or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "#fff",
                }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  background: "#6c757d",
                  width: "100%",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Checking..." : "Send OTP"}
              </button>
            </form>

            <button
              onClick={handleShowQR}
              style={{
                ...buttonStyle,
                background: "#ffc107",
                width: "100%",
                color: "#000",
              }}
            >
              Login via QR Code
            </button>
          </>
        )}

        {/* =============== QR LOGIN =============== */}
        {qrStep && qrData && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ marginBottom: "10px" }}>Scan to Login</h3>
            <img
              src={qrData.qrUrl}
              alt="QR Login"
              style={{
                width: "220px",
                border: "2px solid #444",
                borderRadius: "8px",
                padding: "8px",
                background: "#fff",
                marginBottom: "10px",
              }}
            />
            <p style={{ color: "#bbb", fontSize: "14px" }}>
              Scan using your phone to log in securely
            </p>
            <button
              onClick={() => setQrStep(false)}
              style={{
                marginTop: "10px",
                background: "#444",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* =============== SMS OTP VERIFICATION =============== */}
        {step === "otp" && otpData && !totpStep && !qrStep && (
          <div>
            <p>OTP sent to {maskedNumber}</p>
<div style={{ marginTop: "10px" }}>
<div style={{ marginTop: "10px" }}>
  {timer > 0 ? (
    <p style={{ color: "#bbb" }}>Resend OTP in {formatTime(timer)}</p>
  ) : (
    <button
      type="button"
      onClick={handleResendOTP}
      disabled={loading} // disable button while request is in progress
      style={{
        background: "#ffc107",
        color: "#000",
        padding: "8px",
        borderRadius: "8px",
        border: "none",
        width: "100%",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Resending..." : "Resend OTP"}
    </button>
  )}
</div>

</div>


            <form onSubmit={handleVerifyOTP}>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "#fff",
                }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  background: "#28a745",
                  width: "100%",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Verifying..." : "Login"}
              </button>
            </form>

            <button
              onClick={handleShowTOTP}
              style={{
                marginTop: "20px",
                background: "#17a2b8",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                width: "100%",
                border: "none",
                cursor: "pointer",
              }}
            >
              Link Through Phone Device (TOTP)
            </button>
          </div>
        )}

        {/* =============== TOTP SETUP & VERIFY =============== */}
        {totpStep && totpSetup && (
          <div style={{ marginTop: "20px" }}>
            <h3>Scan QR Code with your Authenticator App</h3>
            <img
              src={totpSetup.qrCode}
              alt="TOTP QR Code"
              style={{
                width: "200px",
                margin: "10px 0",
                borderRadius: "8px",
                background: "#fff",
                padding: "6px",
              }}
            />
            <p>
              Or manually enter secret:{" "}
              <strong style={{ color: "#0ff" }}>{totpSetup.secret}</strong>
            </p>

            <form onSubmit={handleVerifyTOTP}>
              <input
                type="text"
                placeholder="Enter 6-digit code from app"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "#fff",
                }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  background: "#17a2b8",
                  width: "100%",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Verifying..." : "Verify TOTP"}
              </button>
            </form>
          </div>
        )}

        {/* =============== OAUTH LOGINS =============== */}
        {!qrStep && (
          <>
            <hr style={{ margin: "25px 0", borderColor: "#333" }} />
            <p style={{ marginBottom: "10px" }}>Or login using</p>

            <button
              onClick={handleGoogleLogin}
              style={{ ...buttonStyle, background: "#DB4437" }}
            >
              Google
            </button>
            <button
              onClick={handleFacebookLogin}
              style={{ ...buttonStyle, background: "#4267B2" }}
            >
              Facebook
            </button>
            <button
              onClick={handleTwitterLogin}
              style={{ ...buttonStyle, background: "#1DA1F2" }}
            >
              Twitter
            </button>
          </>
        )}
      </div>
    </div>
  );

}
