import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Select from 'react-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './KanbanBoard.css';

const COLUMNS = {
  todo: { id: 'todo', title: 'To Do' },
  inprogress: { id: 'inprogress', title: 'In Progress' },
  done: { id: 'done', title: 'Done' },
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
];

const CATEGORY_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
];

const COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

// Task Card Component
function TaskCard({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const fileInputRef = useRef(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleSave = () => {
    onUpdate(editedTask);
    setIsEditing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload an image (JPEG, PNG, GIF) or PDF.');
        return;
      }

      // Simulate file upload (in real app, would upload to server)
      const fileUrl = URL.createObjectURL(file);
      const newAttachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        url: fileUrl,
      };
      
      const updatedTask = {
        ...editedTask,
        attachments: [...(editedTask.attachments || []), newAttachment],
      };
      setEditedTask(updatedTask);
      onUpdate(updatedTask);
    }
  };

  const removeAttachment = (attachmentId) => {
    const updatedTask = {
      ...editedTask,
      attachments: editedTask.attachments.filter((a) => a.id !== attachmentId),
    };
    setEditedTask(updatedTask);
    onUpdate(updatedTask);
  };

  const priorityColor = PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color || '#gray';

  return (
    <div
      ref={drag}
      className="task-card"
      style={{
        opacity: isDragging ? 0.5 : 1,
        borderLeft: `4px solid ${priorityColor}`,
      }}
      data-testid={`task-${task.id}`}
    >
      {isEditing ? (
        <div className="task-edit">
          <input
            type="text"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            placeholder="Task title"
            className="task-input"
          />
          <textarea
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            placeholder="Task description"
            className="task-textarea"
          />
          <div className="task-selects">
            <Select
              value={PRIORITY_OPTIONS.find((p) => p.value === editedTask.priority)}
              onChange={(option) => setEditedTask({ ...editedTask, priority: option.value })}
              options={PRIORITY_OPTIONS}
              placeholder="Priority"
              className="task-select"
              data-testid="priority-select"
            />
            <Select
              value={CATEGORY_OPTIONS.find((c) => c.value === editedTask.category)}
              onChange={(option) => setEditedTask({ ...editedTask, category: option.value })}
              options={CATEGORY_OPTIONS}
              placeholder="Category"
              className="task-select"
              data-testid="category-select"
            />
          </div>
          <div className="task-actions">
            <button onClick={handleSave} className="btn-save">Save</button>
            <button onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="task-view">
          <div className="task-header">
            <h3 className="task-title">{task.title}</h3>
            <div className="task-badges">
              <span className="badge badge-priority" style={{ backgroundColor: priorityColor }}>
                {task.priority}
              </span>
              <span className="badge badge-category">{task.category}</span>
            </div>
          </div>
          <p className="task-description">{task.description}</p>
          
          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="task-attachments">
              <h4>Attachments:</h4>
              {task.attachments.map((attachment) => (
                <div key={attachment.id} className="attachment">
                  {attachment.type.startsWith('image/') ? (
                    <img src={attachment.url} alt={attachment.name} className="attachment-preview" />
                  ) : (
                    <span>📎 {attachment.name}</span>
                  )}
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="btn-remove-attachment"
                    data-testid="remove-attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="task-actions">
            <button onClick={() => setIsEditing(true)} className="btn-edit">Edit</button>
            <button onClick={() => onDelete(task.id)} className="btn-delete" data-testid="delete-task">
              Delete
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept="image/*,.pdf"
              data-testid="file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-upload"
              data-testid="upload-button"
            >
              📎 Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Column Component
function Column({ column, tasks, onDrop, onUpdate, onDelete }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item) => onDrop(item.id, column.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className="column"
      style={{ backgroundColor: isOver ? '#f0f9ff' : '#f9fafb' }}
      data-testid={`column-${column.id}`}
    >
      <h2 className="column-title">
        {column.title}
        <span className="task-count">({tasks.length})</span>
      </h2>
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// Progress Chart Component
function ProgressChart({ tasks }) {
  const tasksByStatus = {
    'To Do': tasks.filter((t) => t.status === 'todo').length,
    'In Progress': tasks.filter((t) => t.status === 'inprogress').length,
    'Done': tasks.filter((t) => t.status === 'done').length,
  };

  const barData = Object.entries(tasksByStatus).map(([name, value]) => ({
    name,
    tasks: value,
  }));

  const pieData = Object.entries(tasksByStatus)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
    }));

  const totalTasks = tasks.length;
  const completedTasks = tasksByStatus['Done'];
  const completionPercentage = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

  return (
    <div className="progress-chart" data-testid="progress-chart">
      <h2>Task Progress</h2>
      <div className="chart-stats">
        <div className="stat">
          <span className="stat-label">Total Tasks:</span>
          <span className="stat-value">{totalTasks}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Completed:</span>
          <span className="stat-value">{completedTasks}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Completion:</span>
          <span className="stat-value">{completionPercentage}%</span>
        </div>
      </div>
      
      <div className="charts-container">
        <div className="chart">
          <h3>Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart">
          <h3>Task Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Main Kanban Board Component
function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    category: 'feature',
    attachments: [],
  });
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io();

    // Listen for initial task sync
    socketRef.current.on('sync:tasks', (initialTasks) => {
      setTasks(initialTasks);
      setIsLoading(false);
    });

    // Listen for task created
    socketRef.current.on('task:created', (task) => {
      setTasks((prev) => [...prev, task]);
    });

    // Listen for task updated
    socketRef.current.on('task:updated', (updatedTask) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );
    });

    // Listen for task moved
    socketRef.current.on('task:moved', ({ taskId, newStatus }) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
      );
    });

    // Listen for task deleted
    socketRef.current.on('task:deleted', (taskId) => {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    const task = {
      ...newTask,
      id: uuidv4(),
    };

    socketRef.current.emit('task:create', task);
    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      category: 'feature',
      attachments: [],
    });
    setShowNewTaskForm(false);
  };

  const handleUpdateTask = (updatedTask) => {
    socketRef.current.emit('task:update', updatedTask);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      socketRef.current.emit('task:delete', taskId);
    }
  };

  const handleDrop = (taskId, newStatus) => {
    socketRef.current.emit('task:move', { taskId, newStatus });
  };

  if (isLoading) {
    return <div className="loading" data-testid="loading">Loading tasks...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="kanban-board">
        <div className="board-header">
          <h2>Kanban Board</h2>
          <button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="btn-new-task"
            data-testid="new-task-button"
          >
            + New Task
          </button>
        </div>

        {showNewTaskForm && (
          <div className="new-task-form" data-testid="new-task-form">
            <h3>Create New Task</h3>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title"
              className="task-input"
              data-testid="new-task-title"
            />
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Task description"
              className="task-textarea"
              data-testid="new-task-description"
            />
            <div className="task-selects">
              <Select
                value={PRIORITY_OPTIONS.find((p) => p.value === newTask.priority)}
                onChange={(option) => setNewTask({ ...newTask, priority: option.value })}
                options={PRIORITY_OPTIONS}
                placeholder="Priority"
                className="task-select"
              />
              <Select
                value={CATEGORY_OPTIONS.find((c) => c.value === newTask.category)}
                onChange={(option) => setNewTask({ ...newTask, category: option.value })}
                options={CATEGORY_OPTIONS}
                placeholder="Category"
                className="task-select"
              />
            </div>
            <div className="task-actions">
              <button onClick={handleCreateTask} className="btn-save" data-testid="create-task-button">
                Create Task
              </button>
              <button onClick={() => setShowNewTaskForm(false)} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="columns-container">
          {Object.values(COLUMNS).map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={tasks.filter((task) => task.status === column.id)}
              onDrop={handleDrop}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>

        <ProgressChart tasks={tasks} />
      </div>
    </DndProvider>
  );
}

export default KanbanBoard;
