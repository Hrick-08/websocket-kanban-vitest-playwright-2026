const express = require("express");
const http = require("http");
const path = require("path");          // ❗ MISSING BEFORE
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

// In-memory task storage
let tasks = [
  {
    id: "1",
    title: "Sample Task 1",
    description: "This is a sample task",
    status: "todo",
    priority: "medium",
    category: "feature",
    attachments: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Sample Task 2",
    description: "Another sample task",
    status: "inprogress",
    priority: "high",
    category: "bug",
    attachments: [],
    createdAt: new Date().toISOString(),
  },
];

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.emit("sync:tasks", tasks);

  socket.on("task:create", (task) => {
    const newTask = {
      ...task,
      id: task.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    io.emit("task:created", newTask);
  });

  socket.on("task:update", (updatedTask) => {
    const index = tasks.findIndex((t) => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updatedTask };
      io.emit("task:updated", tasks[index]);
    }
  });

  socket.on("task:move", ({ taskId, newStatus }) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
      io.emit("task:moved", { taskId, newStatus });
    }
  });

  socket.on("task:delete", (taskId) => {
    tasks = tasks.filter((t) => t.id !== taskId);
    io.emit("task:deleted", taskId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// API
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// === SERVE FRONTEND ===
const ROOT_DIR = path.resolve(__dirname, "..");

app.use(express.static(path.join(ROOT_DIR, "frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "frontend/dist/index.html"));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
