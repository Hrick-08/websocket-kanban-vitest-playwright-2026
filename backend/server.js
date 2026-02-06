const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

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

  // Send all tasks to newly connected client
  socket.emit("sync:tasks", tasks);

  // Create a new task
  socket.on("task:create", (task) => {
    console.log("Creating task:", task);
    const newTask = {
      ...task,
      id: task.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    io.emit("task:created", newTask);
  });

  // Update an existing task
  socket.on("task:update", (updatedTask) => {
    console.log("Updating task:", updatedTask);
    const index = tasks.findIndex((t) => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updatedTask };
      io.emit("task:updated", tasks[index]);
    }
  });

  // Move task between columns
  socket.on("task:move", ({ taskId, newStatus }) => {
    console.log("Moving task:", taskId, "to", newStatus);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
      io.emit("task:moved", { taskId, newStatus });
    }
  });

  // Delete a task
  socket.on("task:delete", (taskId) => {
    console.log("Deleting task:", taskId);
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

// Serve Vite build
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

server.listen(5000, () => console.log("Server running on port 5000"));
