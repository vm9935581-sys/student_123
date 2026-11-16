import { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "admin" && password === "admin123") {
      setError("");
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background:
          "linear-gradient(135deg, #0d6efd, #6f42c1)",
      }}
    >
      <div
        className="card shadow-lg border-0"
        style={{
          width: "420px",
          borderRadius: "20px",
        }}
      >
        <div className="card-body p-5">

          <div className="text-center mb-4">

            <div style={{ fontSize: "60px" }}>
              🎓
            </div>

            <h2 className="fw-bold text-primary">
              Student Performance
            </h2>

            <p className="text-muted">
              Admin Login
            </p>

          </div>

          <form onSubmit={handleLogin}>

            <div className="mb-3">

              <label className="form-label fw-bold">
                👤 Username
              </label>

              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Enter username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
              />

            </div>

            <div className="mb-3">

              <label className="form-label fw-bold">
                🔑 Password
              </label>

              <input
                type="password"
                className="form-control form-control-lg"
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

            </div>

            {error && (
              <div className="alert alert-danger">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
            >
              🔐 Login
            </button>

          </form>

          <div className="text-center mt-4">

            <small className="text-muted">
              Student Performance Prediction System
            </small>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;