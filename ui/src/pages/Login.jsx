import React, { useState, useEffect, useRef } from "react";
  import QRCode from "qrcode.react";


export default function Login() {
  const [serviceKey, setServiceKey] = useState("portalA");
  const [step, setStep] = useState("username"); // steps: username → otp
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [maskedNumber, setMaskedNumber] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0); // seconds remaining
  const timerRef = useRef(null);


  const [showQR, setShowQR] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [qrStatus, setQrStatus] = useState("pending");

 const handleShowQR = async () => {
    const res = await fetch("http://localhost:5000/auth/qr-session");
    const data = await res.json();
    setSessionId(data.sessionId);
    setShowQR(true);
    pollStatus(data.sessionId);
  };

  const pollStatus = async (id) => {
    const interval = setInterval(async () => {
      const res = await fetch(`http://localhost:5000/auth/qr-status/${id}`);
      const data = await res.json();

      if (data.status === "linked") {
        clearInterval(interval);
        const decryptRes = await fetch("http://localhost:5000/auth/decrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.token }),
        });
        const decryptData = await decryptRes.json();
        if (decryptData.valid) {
          localStorage.setItem("auth_token", decryptData.jwt);
          window.location.href = "/dashboard";
        }
      } else if (data.status === "expired") {
        clearInterval(interval);
        setQrStatus("expired");
      }
    }, 3000);
  };

  // ✅ Read sid from URL or set default
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sid = params.get("sid") || "portalA";
    if (!params.get("sid")) {
      params.set("sid", sid);
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    }
    setServiceKey(sid);
  }, []);

  // ✅ Handle username submit → checkUser API
  const handleCheckLDAP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/checkUser", {
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
        setTimer(5 * 60); // 5 mins
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

  // ✅ Start countdown timer
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

  // ✅ Format timer
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ✅ Handle OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpData) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/verifyOtp", {
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

      if (data.success && data.redirectUrl) {
        const urlParams = new URL(data.redirectUrl);
        const encryptedToken = urlParams.searchParams.get("token");

        if (encryptedToken) {
          // ✅ Decrypt token via backend
          const decryptRes = await fetch("http://localhost:5000/auth/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: encryptedToken }),
          });
          const decryptData = await decryptRes.json();

          if (decryptData.valid && decryptData.jwt) {
            localStorage.setItem("auth_token", decryptData.jwt); // store decrypted JWT
            localStorage.setItem("user_name", decryptData.payload.name || username);
            window.location.href = "/dashboard";
            return;
          } else {
            setError("Failed to decrypt token");
          }
        } else {
          setError("Token missing in redirect URL");
        }
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while verifying OTP");
    }

    setLoading(false);
  };

  // ✅ OAuth Logins
  const handleGoogleLogin = () => {
    window.location.href = `http://localhost:5000/auth/google?service=${serviceKey}`;
  };
  const handleFacebookLogin = () => {
    window.location.href = `http://localhost:5000/auth/facebook?service=${serviceKey}`;
  };
  const handleTwitterLogin = () => {
    window.location.href = `http://localhost:5000/auth/twitter?service=${serviceKey}`;
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
        background: "#000",
      }}
    >
      <div
        style={{
          padding: "40px",
          borderRadius: "12px",
          background: "#000",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          textAlign: "center",
          width: "350px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>
          {step === "username" ? "Login with LDAP" : "Verify OTP"}
        </h2>
        <p style={{ marginBottom: "10px", color: "#777" }}>
          Service: <strong>{serviceKey}</strong>
        </p>

        {error && <p style={{ color: "red" }}>{error}</p>}

        {step === "username" && (
          <form onSubmit={handleCheckLDAP}>
            <input
              type="text"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "15px",
                borderRadius: "8px",
                border: "1px solid #ccc",
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
        )}

        {step === "otp" && (
          <div>
            <p>OTP sent to {maskedNumber}</p>
            <p>Expires in: {formatTime(timer)}</p>
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
                  border: "1px solid #000",
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
          </div>
        )}

        <hr style={{ margin: "20px 0" }} />
        <p style={{ marginBottom: "10px" }}>Or login using</p>
        <button onClick={handleGoogleLogin} style={{ ...buttonStyle, background: "#DB4437" }}>
          Google
        </button>
        <button onClick={handleFacebookLogin} style={{ ...buttonStyle, background: "#4267B2" }}>
          Facebook
        </button>
        <button onClick={handleTwitterLogin} style={{ ...buttonStyle, background: "#1DA1F2" }}>
          Twitter
        </button>
        <hr style={{ margin: "20px 0" }} />
  <button
        onClick={handleShowQR}
        style={{ marginTop: "20px", background: "#17a2b8", color: "#fff", padding: "10px", borderRadius: "8px" }}
      >
        Link Phone Device
      </button>

      {showQR && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          {qrStatus === "expired" ? (
            <p>QR Expired. Please refresh.</p>
          ) : (
            <>
              <p>Scan this QR with your mobile app</p>
              <QRCode value={sessionId} size={200} />
            </>
          )}
        </div>
      )}


      </div>
    </div>
  );
}
