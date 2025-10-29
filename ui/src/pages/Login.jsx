import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

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
const [showOTPForm, setShowOTPForm] = useState(false);
const [showTOTPForm, setShowTOTPForm] = useState(false);
const [totpToken, setTotpToken] = useState(""); // user input
const [totpUsername, setTotpUsername] = useState("");

  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;



  // QR login states
  const [qrStep, setQrStep] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [polling, setPolling] = useState(null);

  // Show login options after Next
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  // Read serviceKey from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sid = params.get("sid") || "portalA";
    if (!params.get("sid")) {
      params.set("sid", sid);
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    }
    setServiceKey(sid);
  }, []);

  // Countdown timer
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

  // LDAP username submit (Check User)
  const handleCheckLDAP = async () => {
    if (!username) return;

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
        setTimer(60); // 1 minute
        startTimer();
      } else {
        setError(data.error || "User not found");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while checking username");
    } finally {
      setLoading(false);
    }
  };

  // OTP verification
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
      localStorage.setItem(
        "user_name",
        decryptData.payload.name || otpData.name || username
      );
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError("Server error while verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
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
        setOtpData((prev) => ({ ...prev, otp_code: data.otp_code }));
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

  // OAuth login handlers
  const handleGoogleLogin = () => {
    localStorage.setItem("login_provider", "google");
    window.location.href = `${BASE_URL}/auth/google?service=${serviceKey}`;
  };
  const handleFacebookLogin = () => {
    localStorage.setItem("login_provider", "facebook");
    window.location.href = `${BASE_URL}/auth/facebook?service=${serviceKey}`;
  };
  const handleTwitterLogin = () =>
    (window.location.href = `${BASE_URL}/auth/twitter?service=${serviceKey}`);

const handleShowTOTP = async () => {
  if (!username) {
    setError("Enter your username first");
    console.log("[TOTP] No username entered");
    return;
  }

  setLoading(true);
  setError("");

  try {
    console.log("[TOTP] Sending request to checkUserTotpWeb");
    console.log("[TOTP] Payload:", { username, service_key: serviceKey });

    const res = await fetch(`${BASE_URL}/auth/checkUserTotpWeb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, service_key: serviceKey }),
    });

    console.log("[TOTP] Response status:", res.status, res.statusText);

    const data = await res.json();
    console.log("[TOTP] Response JSON:", data);

    if (!res.ok) {
      setError(`Server returned status ${res.status}`);
      console.error("[TOTP] Server error:", data);
      setLoading(false);
      return;
    }

    if (!data.userExists) {
      setError(data.error || "User not found in LDAP");
      console.warn("[TOTP] User not found:", data);
      setLoading(false);
      return;
    }

    console.log("[TOTP] LDAP verified. Setting username:", data.name || username);
    // Use the LDAP returned name/uid if available
    setTotpUsername(data.name || username);
    setShowTOTPForm(true);

  } catch (err) {
    console.error("[TOTP] Exception while checking username:", err);
    setError("Server error while checking username");
  } finally {
    setLoading(false);
  }
};



// Verify TOTP
const handleVerifyTOTP = async (e) => {
  e.preventDefault();

  if (!totpUsername || !totpToken) {
    setError("Enter username and TOTP code");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const res = await fetch(`${BASE_URL}/auth/verifyTotp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: totpUsername,
        service_key: serviceKey,
        token: totpToken,
      }),
    });

    const data = await res.json();
    console.log("[TOTP Verify Response]", data);

    if (!res.ok || !data.success || !data.redirectUrl) {
      setError(data.error || "Invalid TOTP code");
      setLoading(false);
      return;
    }

    // extract the encrypted token from redirectUrl
    const urlParams = new URL(data.redirectUrl);
    const encryptedToken = urlParams.searchParams.get("token");
    if (!encryptedToken) {
      setError("Token missing in server response");
      setLoading(false);
      return;
    }

    // decrypt token
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

    // save token + redirect
    localStorage.setItem("auth_token", decryptData.jwt);
    localStorage.setItem("user_name", totpUsername);
    window.location.href = "/dashboard";
  } catch (err) {
    console.error(err);
    setError("Server error while verifying TOTP");
  } finally {
    setLoading(false);
  }
};





  // QR login
  const handleShowQR = async () => {
    setQrStep(true);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/qr/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.loginId) {
        setError("Failed to initialize QR login");
        setLoading(false);
        return;
      }

      const qrPayload = `myapp://login?sessionId=${data.loginId}`;
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

  const startPolling = (sessionId) => {
    if (polling) clearInterval(polling);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/qr/status/${sessionId}`);
        const data = await res.json();
        if (data.loggedIn) {
          clearInterval(interval);
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
        console.error(err);
      }
    }, 3000);
    setPolling(interval);
  };

  const handleBackToInitial = () => {
  // Reset everything except username input
  setShowLoginOptions(false);
  setStep("username");
  setOtp("");
  setOtpData(null);
  setTotpStep(false);
  setQrStep(false);
  setTimer(0);
  if (timerRef.current) clearInterval(timerRef.current);
};




return (
  <div
    className="d-flex align-items-center justify-content-center vh-100"
    style={{
      background: "linear-gradient(135deg, #1b1f66ff 0%, #292c66ff 100%)",
    }}
  >
    <div
      className="card shadow-lg border-0 rounded-4 p-4 text-center"
      style={{ width: "380px", backgroundColor: "#fff" }}
    >
      <h3 className="mb-3 fw-bold text-primary">
        {step === "username" ? "Login with LDAP" : "Verify OTP"}
      </h3>
      <p className="text-center text-muted mb-3">
        Service: <strong>{serviceKey}</strong>
      </p>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Username input (always visible) */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control form-control-lg rounded-3"
          placeholder="Enter username or mobile or email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={showLoginOptions || showOTPForm || showTOTPForm} // disabled after Next
        />
      </div>

      {/* Initial / Next screen */}
      {!showLoginOptions && !showOTPForm && !showTOTPForm && (
        <>
          <button
            className="btn btn-primary w-100 mb-2"
            disabled={!username}
            onClick={() => setShowLoginOptions(true)}
          >
            Next →
          </button>

          <hr className="my-3" />

          <button
            onClick={handleShowQR}
            className="btn btn-warning w-100 text-dark mb-2"
          >
            Login via QR Code
          </button>

          <hr className="my-3" />

          <div className="d-flex flex-column gap-2">
            <button
              onClick={handleGoogleLogin}
              className="btn btn-danger w-100"
            >
              Google
            </button>
            <button
              onClick={handleFacebookLogin}
              className="btn btn-primary w-100"
            >
              Facebook
            </button>
            <button
              onClick={handleTwitterLogin}
              className="btn btn-info w-100"
            >
              Twitter
            </button>
          </div>
        </>
      )}

      {/* After Next → clicked */}
      {showLoginOptions && !showOTPForm && !showTOTPForm && (
        <div className="d-flex flex-column gap-2 mt-2">
          <button
            className="btn btn-secondary w-100"
            onClick={() => {
              handleBackToInitial();
              setShowLoginOptions(false);
            }}
          >
            ← Back
          </button>

          <button
            className="btn btn-success w-100"
            onClick={() => {
              handleCheckLDAP();
              setShowOTPForm(true);
              setShowLoginOptions(false);
            }}
            disabled={loading}
          >
            {loading ? "Sending OTP..." : "Login with OTP"}
          </button>

          <button
            className="btn btn-info w-100"
            onClick={() => {
              handleShowTOTP();
              setShowTOTPForm(true);
              setShowLoginOptions(false);
            }}
          >
            Login with TOTP
          </button>
        </div>
      )}

      {/* OTP form */}
      {showOTPForm && (
        <>
          {step === "otp" && otpData && !qrStep && (
            <>
              <p>
                OTP sent to <strong>{maskedNumber}</strong>
              </p>
              <p>Expires in: {formatTime(timer)}</p>
              {timer === 0 && (
                <button
                  onClick={handleResendOTP}
                  className="btn btn-warning w-100 mb-2"
                >
                  {loading ? "Resending..." : "Resend OTP"}
                </button>
              )}
              <form onSubmit={handleVerifyOTP}>
                <input
                  type="text"
                  className="form-control bg-light text-black border-secondary mb-3"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
                <button
                  className="btn btn-success w-100 mb-2"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>
              </form>
            </>
          )}

          {/* Bottom Back button */}
          <button
            className="btn btn-secondary w-100 mt-2"
            onClick={() => {
              setShowOTPForm(false);
              handleBackToInitial();
            }}
          >
            ← Back
          </button>
        </>
      )}

      {/* TOTP form */}
     {showTOTPForm && (
  <form onSubmit={handleVerifyTOTP}>
    <h5>Enter 6-digit TOTP code</h5>
    <input
      type="text"
      className="form-control mb-3"
      placeholder="Enter code"
      value={totpToken}
      onChange={(e) => setTotpToken(e.target.value)}
      maxLength={6}
      required
    />
    <button className="btn btn-info w-100" disabled={loading}>
      {loading ? "Verifying..." : "Verify TOTP"}
    </button>

    <button
      type="button"
      className="btn btn-secondary w-100 mt-2"
      onClick={() => {
        setShowTOTPForm(false);
        setTotpToken("");
      }}
    >
      ← Back
    </button>
  </form>
)}


      {/* QR login */}
      {qrStep && qrData && (
        <div className="text-center mt-3">
          <h5>Scan to Login</h5>
          <img
            src={qrData.qrUrl}
            alt="QR"
            className="img-fluid border rounded p-2 bg-white"
            width="220"
          />
          <p className="text-muted small mt-2">
            Scan using your phone to log in securely
          </p>
          <button
            onClick={() => setQrStep(false)}
            className="btn btn-outline-light mt-3"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  </div>
);







}
