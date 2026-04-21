import { useState, useEffect } from "react";
import API from "../services/api";
import { connectSocket } from "../services/socket";
import { useNavigate, Link } from "react-router-dom";
import ParticleBackground from "../components/ParticleBackground";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Mouse Tracking State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    // We calculate a relative offset from the center of the screen
    const x = (e.clientX - window.innerWidth / 2) * 0.15;
    const y = (e.clientY - window.innerHeight / 2) * 0.15;
    setMousePos({ x, y });
  };

  const handleLogin = async () => {
  setError("");

  if (!form.username || !form.password) {
    return setError("Please fill all fields");
  }

  try {
    setLoading(true);

    const res = await API.post("/auth/login", form);

    console.log("LOGIN SUCCESS:", res.data);

    // ✅ Save auth
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userId", res.data.userId);

    // ✅ Connect socket SAFELY
    try {
      connectSocket(res.data.token);
    } catch (e) {
      console.warn("Socket error:", e);
    }

    // ✅ FORCE navigation
    window.location.href = "/chat";

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    setError(
      err.response?.data?.message || "Login failed. Try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-bg" onMouseMove={handleMouseMove}>
      <ParticleBackground />
      <div 
        className="orb orb-1" 
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div 
        className="orb orb-2" 
        style={{ transform: `translate(${-mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` }}
      />
      <div 
        className="orb orb-3" 
        style={{ transform: `translate(${mousePos.x * 2.2}px, ${-mousePos.y * 0.8}px)` }}
      />
      <div 
        className="orb orb-4" 
        style={{ transform: `translate(${-mousePos.x * 0.8}px, ${mousePos.y * 2.5}px)` }}
      />

      <div className="auth-card">
        <h1 className="logo">
          <span className="interactive-bolt">⚡</span> Natter
        </h1>
        <p className="subtitle">Real-time chat, reimagined</p>

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

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="link">
          Don’t have an account? <Link to="/register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}