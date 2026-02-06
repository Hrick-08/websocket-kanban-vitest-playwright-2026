import React from "react";
import KanbanBoard from "./components/KanbanBoard";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>Real-time Kanban Board</h1>
        <p className="app-subtitle">
          Collaborate in real-time with WebSocket-powered task management
        </p>
      </header>
      <main className="app-main">
        <KanbanBoard />
      </main>
      <footer className="app-footer">
        <p>Built with React, Socket.IO, and modern web technologies</p>
      </footer>
    </div>
  );
}

export default App;
