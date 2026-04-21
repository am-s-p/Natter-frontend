import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  // Mouse Tracking State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    // We calculate a relative offset from the center of the screen
    const x = (e.clientX - window.innerWidth / 2) * 0.15;
    const y = (e.clientY - window.innerHeight / 2) * 0.15;
    setMousePos({ x, y });
  };

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!form.username || !form.password) {
      return setError("Please fill all fields");
    }

    try {
      setLoading(true);

      await API.post("/auth/register", form);

      setSuccess("Account created successfully!");

      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg" onMouseMove={handleMouseMove}>
      <div 
        className="orb orb-1" 
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div 
        className="orb orb-2" 
        style={{ transform: `translate(${-mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` }}
      />

      <div className="auth-card">
        <h1 className="logo">
          <span className="interactive-bolt">⚡</span> Natter
        </h1>
        <p className="subtitle">Create your account</p>

        <input
          placeholder="Username"
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button onClick={handleRegister} disabled={loading}>
          {loading ? "Creating..." : "Register"}
        </button>

        <p className="link">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}