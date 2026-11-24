import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";

const { PORT = 4000, ACCESS_SECRET, REFRESH_SECRET, CLIENT_ORIGIN = "*" } = process.env;
if (!ACCESS_SECRET || !REFRESH_SECRET) throw new Error("Set ACCESS_SECRET and REFRESH_SECRET in .env");

// --- Tiny JSON-file "database". Replace with MongoDB/PostgreSQL for production. ---
const DB_FILE = "./users.json";
const load = () => (fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, "utf8")) : []);
const save = (users) => fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

const signTokens = (user) => ({
  accessToken: jwt.sign({ sub: user.id }, ACCESS_SECRET, { expiresIn: "15m" }),
  refreshToken: jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: "7d" }),
});

function issue(user, users) {
  const tokens = signTokens(user);
  user.refreshHash = sha(tokens.refreshToken); // only the latest refresh token is valid
  save(users);
  return { user: publicUser(user), ...tokens };
}

const app = express();
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(",") }));
app.use(express.json({ limit: "10kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));

const emailOk = (e) => typeof e === "string" && /^\S+@\S+\.\S+$/.test(e);

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: "Enter your name." });
  if (!emailOk(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (typeof password !== "string" || password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  const users = load();
  const mail = email.toLowerCase();
  if (users.some((u) => u.email === mail)) return res.status(409).json({ error: "An account with this email already exists." });

  const user = { id: crypto.randomUUID(), name: name.trim(), email: mail, passwordHash: await bcrypt.hash(password, 12) };
  users.push(user);
  res.status(201).json(issue(user, users));
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const users = load();
  const user = users.find((u) => u.email === String(email).toLowerCase());
  // Same message for both failures so attackers can't discover which emails exist.
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  res.json(issue(user, users));
});

app.post("/api/auth/refresh", (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    const { sub } = jwt.verify(refreshToken, REFRESH_SECRET);
    const users = load();
    const user = users.find((u) => u.id === sub);
    if (!user || user.refreshHash !== sha(refreshToken)) throw new Error("revoked");
    res.json(issue(user, users));
  } catch {
    res.status(401).json({ error: "Session expired. Sign in again." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const { sub } = jwt.verify(req.body?.refreshToken, REFRESH_SECRET);
    const users = load();
    const user = users.find((u) => u.id === sub);
    if (user) { delete user.refreshHash; save(users); }
  } catch {}
  res.json({ ok: true });
});

// --- Auth middleware: protects any route you add below it ---
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  try {
    req.userId = jwt.verify(token, ACCESS_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/me", requireAuth, (req, res) => {
  const user = load().find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
