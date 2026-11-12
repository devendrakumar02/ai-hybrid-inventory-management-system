import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import Icon from "../components/Icon";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        username,
        password
      });

      if (response.data.success) {
        const u = response.data.username || username;
        const name = response.data.name || (u.charAt(0).toUpperCase() + u.slice(1));
        const role = response.data.role || (u.toLowerCase() === 'admin' ? 'Administrator' : 'Store Staff');
        localStorage.setItem(
          "hybridInventoryUser",
          JSON.stringify({
            username: u,
            name,
            role
          })
        );

        navigate("/dashboard", { replace: true });
      } else {
        setError(response.data.message || "Invalid username or password");
      }

    } catch (err) {
      console.error(err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(
          "Unable to connect to server. Please make sure the backend is running."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        padding: "20px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "40px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.08)"
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px"
          }}
        >
          <div
            style={{
              width: "95px",
              height: "58px",
              borderRadius: "14px",
              background: "#111827",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
              fontWeight: "700"
            }}
          >
            Login
          </div>
        </div>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "27px",
              color: "#111827"
            }}
          >
            Welcome Back
          </h1>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "14px"
            }}
          >
            Sign in to Hybrid Inventory Management
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              padding: "12px 14px",
              borderRadius: "9px",
              marginBottom: "18px",
              fontSize: "14px"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          {/* Username */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151"
              }}
            >
              Username
            </label>

            <div style={{ position: "relative" }}>
              <Icon
                name="users"
                size={18}
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af"
                }}
              />

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px 12px 42px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "22px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151"
              }}
            >
              Password
            </label>

            <div style={{ position: "relative" }}>
              <Icon
                name="settings"
                size={18}
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af"
                }}
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 45px 12px 42px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "14px"
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#6b7280"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "9px",
              padding: "13px",
              background: loading ? "#9ca3af" : "#111827",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Demo credentials
        <div
          style={{
            marginTop: "22px",
            padding: "12px",
            background: "#f9fafb",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280"
          }}
        >
          Admin login: <strong>admin</strong> / <strong>admin123</strong>
        </div> */}

      </div>
    </div>
  );
}