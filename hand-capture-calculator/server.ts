import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory / file-backed persistent data store
interface GestureEntry {
  id: string;
  sessionId: string;
  fingerCount: number;
  totalCount: number;
  gestureName: string;
  handType?: string;
  taskName?: string;
  createdAt: string;
}

interface ProductivityTask {
  id: string;
  title: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  createdAt: string;
}

interface AppState {
  currentSessionId: string;
  totalCount: number;
  lastFingerCount: number;
  history: GestureEntry[];
  tasks: ProductivityTask[];
}

const DATA_FILE = path.join(process.cwd(), "counter_db.json");

function loadData(): AppState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error loading DB file:", e);
  }
  return {
    currentSessionId: `session_${Date.now()}`,
    totalCount: 0,
    lastFingerCount: 0,
    history: [],
    tasks: [
      {
        id: "task_1",
        title: "Deep Work Sprint #1",
        targetCount: 10,
        currentCount: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "task_2",
        title: "Focus Units Completed",
        targetCount: 25,
        currentCount: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

let db = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving DB file:", e);
  }
}

// REST API ROUTES
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start new session
app.post("/api/session/start", (req, res) => {
  const newSessionId = `session_${Date.now()}`;
  db.currentSessionId = newSessionId;
  db.lastFingerCount = 0;
  if (req.body?.resetTotal) {
    db.totalCount = 0;
  }
  saveData();
  res.json({
    success: true,
    sessionId: db.currentSessionId,
    totalCount: db.totalCount,
  });
});

// Post gesture count
app.post("/api/count", (req, res) => {
  const { fingerCount, gestureName, handType, taskName, taskId } = req.body;
  const count = typeof fingerCount === "number" ? fingerCount : 0;
  
  db.totalCount += count;
  db.lastFingerCount = count;

  const entry: GestureEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sessionId: db.currentSessionId,
    fingerCount: count,
    totalCount: db.totalCount,
    gestureName: gestureName || `${count} Fingers`,
    handType: handType || "Right",
    taskName: taskName || undefined,
    createdAt: new Date().toISOString(),
  };

  db.history.unshift(entry);

  // If tied to a productivity task, increment task count
  if (taskId) {
    const task = db.tasks.find((t) => t.id === taskId);
    if (task) {
      task.currentCount += count;
      if (task.currentCount >= task.targetCount) {
        task.completed = true;
      }
    }
  }

  saveData();

  res.json({
    success: true,
    entry,
    totalCount: db.totalCount,
    history: db.history,
  });
});

// Get current totals
app.get("/api/current", (_req, res) => {
  res.json({
    sessionId: db.currentSessionId,
    totalCount: db.totalCount,
    lastFingerCount: db.lastFingerCount,
    historyCount: db.history.length,
  });
});

// Get history
app.get("/api/history", (_req, res) => {
  res.json({
    sessionId: db.currentSessionId,
    totalCount: db.totalCount,
    history: db.history,
  });
});

// Delete item from history
app.delete("/api/history/:id", (req, res) => {
  const { id } = req.params;
  const item = db.history.find((h) => h.id === id);
  if (item) {
    db.totalCount = Math.max(0, db.totalCount - item.fingerCount);
    db.history = db.history.filter((h) => h.id !== id);
    saveData();
  }
  res.json({ success: true, totalCount: db.totalCount, history: db.history });
});

// Reset counter
app.post("/api/reset", (_req, res) => {
  db.totalCount = 0;
  db.lastFingerCount = 0;
  db.history = [];
  saveData();
  res.json({
    success: true,
    message: "Counter and history reset successfully",
    totalCount: 0,
    history: [],
  });
});

// Tasks management API
app.get("/api/tasks", (_req, res) => {
  res.json({ tasks: db.tasks });
});

app.post("/api/tasks", (req, res) => {
  const { title, targetCount } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const newTask: ProductivityTask = {
    id: `task_${Date.now()}`,
    title,
    targetCount: parseInt(targetCount, 10) || 10,
    currentCount: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(newTask);
  saveData();
  res.json({ success: true, task: newTask, tasks: db.tasks });
});

app.delete("/api/tasks/:id", (req, res) => {
  db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
  saveData();
  res.json({ success: true, tasks: db.tasks });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
