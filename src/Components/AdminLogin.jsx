import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [pass, setPass] = useState("");
  const nav = useNavigate();
  const LOCAL_ADMIN_KEY = "adminLoggedIn";
  const LOCAL_ADMIN_PASSWORD = "admin123";

  useEffect(() => {
    const localAdmin = localStorage.getItem(LOCAL_ADMIN_KEY) === "true";
    if (localAdmin) {
      nav("/admin");
    }
  }, [nav]);

  const login = () => {
    if (!pass) {
      alert("Enter your password.");
      return;
    }

    if (pass === LOCAL_ADMIN_PASSWORD) {
      localStorage.setItem(LOCAL_ADMIN_KEY, "true");
      nav("/admin");
    } else {
      alert("Wrong password");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 420 }}>
      <h3>Admin Login</h3>
      <p className="text-muted">Leave email blank and enter the admin password to login.</p>

      <input
        type="password"
        className="form-control mb-3"
        placeholder="Enter password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
      />

      <button className="btn btn-primary" onClick={login}>
        Login
      </button>
    </div>
  );
}