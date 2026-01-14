import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const usersFile = join(dataDir, "users.json");

const defaultState = {
  bankroll: 2500,
  bet: 0,
  decks: 6,
  stats: { rounds: 0, win: 0, lose: 0, push: 0, streak: 0, bestStreak: 0 },
  audioOn: true
};

async function ensureDataFiles() {
  await mkdir(dataDir, { recursive: true });
  await ensureJsonFile(usersFile, {});
}

async function ensureJsonFile(path, fallback) {
  try {
    await readFile(path, "utf8");
  } catch {
    await writeFile(path, JSON.stringify(fallback, null, 2));
  }
}

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw || "{}");
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function handleLogin(req, res) {
  const { username, password } = await parseBody(req);
  if (!username || !password) {
    return sendJson(res, 400, { error: "Benutzername und Passwort erforderlich." });
  }
  const users = await readJson(usersFile);
  const user = users[username];
  if (!user || user.password !== password) {
    return sendJson(res, 401, { error: "Login fehlgeschlagen." });
  }
  return sendJson(res, 200, { ok: true, state: user.state || defaultState });
}

async function handleRegister(req, res) {
  const { username, password } = await parseBody(req);
  if (!username || !password) {
    return sendJson(res, 400, { error: "Benutzername und Passwort erforderlich." });
  }
  const users = await readJson(usersFile);
  if (users[username]) {
    return sendJson(res, 409, { error: "Benutzer existiert bereits." });
  }
  users[username] = {
    password,
    balance: defaultState.bankroll,
    state: { ...defaultState }
  };
  await writeJson(usersFile, users);
  return sendJson(res, 200, { ok: true, state: users[username].state });
}

async function handleGetState(req, res, url) {
  const username = url.searchParams.get("username");
  if (!username) {
    return sendJson(res, 400, { error: "Benutzername erforderlich." });
  }
  const users = await readJson(usersFile);
  const user = users[username];
  if (!user) {
    return sendJson(res, 404, { error: "Benutzer nicht gefunden." });
  }
  return sendJson(res, 200, { ok: true, state: user.state || defaultState });
}

async function handleSaveState(req, res) {
  const { username, state } = await parseBody(req);
  if (!username || !state) {
    return sendJson(res, 400, { error: "Benutzername und State erforderlich." });
  }
  const users = await readJson(usersFile);
  if (!users[username]) {
    return sendJson(res, 404, { error: "Benutzer nicht gefunden." });
  }
  users[username] = {
    ...users[username],
    balance: typeof state.bankroll === "number" ? state.bankroll : users[username].balance,
    state
  };
  await writeJson(usersFile, users);
  return sendJson(res, 200, { ok: true });
}

async function handleLeaderboard(req, res) {
  const users = await readJson(usersFile);
  const list = Object.entries(users).map(([username, data]) => ({
    username,
    balance: typeof data.balance === "number" ? data.balance : defaultState.bankroll,
    stats: data.state?.stats || defaultState.stats
  }));
  list.sort((a, b) => b.balance - a.balance);
  return sendJson(res, 200, { ok: true, users: list.slice(0, 5) });
}

async function handleStatic(req, res, url) {
  const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = join(__dirname, filePath);
  try {
    const data = await readFile(fullPath);
    const ext = filePath.split(".").pop();
    const contentType = ext === "html" ? "text/html" : "text/plain";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Nicht gefunden." });
  }
}

await ensureDataFiles();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "POST" && url.pathname === "/api/login") {
      return await handleLogin(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/register") {
      return await handleRegister(req, res);
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      return await handleGetState(req, res, url);
    }
    if (req.method === "POST" && url.pathname === "/api/state") {
      return await handleSaveState(req, res);
    }
    if (req.method === "GET" && url.pathname === "/api/leaderboard") {
      return await handleLeaderboard(req, res);
    }
    return await handleStatic(req, res, url);
  } catch {
    return sendJson(res, 500, { error: "Serverfehler." });
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});