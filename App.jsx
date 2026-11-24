import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";

function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      isLogin ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="card">
      <h1>{isLogin ? "Sign in" : "Create your account"}</h1>
      <form onSubmit={submit}>
        {!isLogin && (
          <label>Name<input value={form.name} onChange={set("name")} autoComplete="name" required /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set("email")} autoComplete="email" required /></label>
        <label>Password
          <input type="password" value={form.password} onChange={set("password")} minLength={8}
                 autoComplete={isLogin ? "current-password" : "new-password"} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</button>
      </form>
      <p className="switch">
        {isLogin ? "New here?" : "Already registered?"}{" "}
        <button className="link" onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); }}>
          {isLogin ? "Create an account" : "Sign in"}
        </button>
      </p>
    </main>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="card">
      <h1>Welcome, {user.name}</h1>
      <p>You’re signed in as <strong>{user.email}</strong>. This page loaded from a protected API route.</p>
      <button onClick={logout}>Sign out</button>
    </main>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <main className="card"><p>Loading…</p></main>;
  return user ? <Dashboard /> : <AuthForm />;
}
