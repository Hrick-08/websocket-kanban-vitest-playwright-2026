import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";

// Mock socket.io-client
let mockSocketHandlers = {};
const mockSocket = {
  on: vi.fn((event, handler) => {
    mockSocketHandlers[event] = handler;
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

describe("WebSocket Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketHandlers = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("WebSocket receives task update and updates UI", async () => {
    render(<KanbanBoard />);

    // Initial sync with empty tasks
    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    });

    // Simulate receiving a new task from another client
    const createdHandler = mockSocketHandlers["task:created"];
    const newTask = {
      id: "test-1",
      title: "New Task from Server",
      description: "This task came from WebSocket",
      status: "todo",
      priority: "high",
      category: "bug",
      attachments: [],
    };

    createdHandler(newTask);

    await waitFor(() => {
      expect(screen.getByText("New Task from Server")).toBeInTheDocument();
      expect(screen.getByText("This task came from WebSocket")).toBeInTheDocument();
    });
  });

  test("WebSocket handles task update event", async () => {
    render(<KanbanBoard />);

    const initialTask = {
      id: "1",
      title: "Original Title",
      description: "Original Description",
      status: "todo",
      priority: "low",
      category: "feature",
      attachments: [],
    };

    // Initial sync with one task
    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([initialTask]);

    await waitFor(() => {
      expect(screen.getByText("Original Title")).toBeInTheDocument();
    });

    // Simulate task update from server
    const updatedHandler = mockSocketHandlers["task:updated"];
    const updatedTask = {
      ...initialTask,
      title: "Updated Title",
      description: "Updated Description",
    };

    updatedHandler(updatedTask);

    await waitFor(() => {
      expect(screen.getByText("Updated Title")).toBeInTheDocument();
      expect(screen.queryByText("Original Title")).not.toBeInTheDocument();
    });
  });

  test("WebSocket handles task move event", async () => {
    render(<KanbanBoard />);

    const task = {
      id: "1",
      title: "Task to Move",
      description: "Description",
      status: "todo",
      priority: "medium",
      category: "feature",
      attachments: [],
    };

    // Initial sync
    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([task]);

    await waitFor(() => {
      expect(screen.getByText("Task to Move")).toBeInTheDocument();
    });

    // Simulate task move from server
    const movedHandler = mockSocketHandlers["task:moved"];
    movedHandler({ taskId: "1", newStatus: "done" });

    await waitFor(() => {
      // Task should still be visible but in the done column
      expect(screen.getByText("Task to Move")).toBeInTheDocument();
    });
  });

  test("WebSocket handles task delete event", async () => {
    render(<KanbanBoard />);

    const task = {
      id: "1",
      title: "Task to Delete",
      description: "Description",
      status: "todo",
      priority: "low",
      category: "bug",
      attachments: [],
    };

    // Initial sync
    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([task]);

    await waitFor(() => {
      expect(screen.getByText("Task to Delete")).toBeInTheDocument();
    });

    // Simulate task delete from server
    const deletedHandler = mockSocketHandlers["task:deleted"];
    deletedHandler("1");

    await waitFor(() => {
      expect(screen.queryByText("Task to Delete")).not.toBeInTheDocument();
    });
  });

  test("WebSocket synchronizes multiple task updates", async () => {
    render(<KanbanBoard />);

    // Initial sync with empty tasks
    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    });

    // Add multiple tasks
    const createdHandler = mockSocketHandlers["task:created"];
    
    const task1 = {
      id: "1",
      title: "Task 1",
      description: "Description 1",
      status: "todo",
      priority: "high",
      category: "bug",
      attachments: [],
    };

    const task2 = {
      id: "2",
      title: "Task 2",
      description: "Description 2",
      status: "inprogress",
      priority: "medium",
      category: "feature",
      attachments: [],
    };

    const task3 = {
      id: "3",
      title: "Task 3",
      description: "Description 3",
      status: "done",
      priority: "low",
      category: "enhancement",
      attachments: [],
    };

    createdHandler(task1);
    createdHandler(task2);
    createdHandler(task3);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });
  });

  test("Client emits task:create event on form submission", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([]);

    await waitFor(() => {
      const newTaskButton = screen.getByTestId("new-task-button");
      fireEvent.click(newTaskButton);
    });

    const titleInput = screen.getByTestId("new-task-title");
    const descriptionInput = screen.getByTestId("new-task-description");
    const createButton = screen.getByTestId("create-task-button");

    fireEvent.change(titleInput, { target: { value: "Emitted Task" } });
    fireEvent.change(descriptionInput, {
      target: { value: "Emitted Description" },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "task:create",
        expect.objectContaining({
          title: "Emitted Task",
          description: "Emitted Description",
        })
      );
    });
  });

  test("Client emits task:delete event on delete", async () => {
    render(<KanbanBoard />);

    const task = {
      id: "delete-me",
      title: "Task to Delete",
      description: "Description",
      status: "todo",
      priority: "low",
      category: "bug",
      attachments: [],
    };

    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([task]);

    window.confirm = vi.fn(() => true);

    await waitFor(() => {
      const deleteButton = screen.getByTestId("delete-task");
      fireEvent.click(deleteButton);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", "delete-me");
  });

  test("WebSocket connection is established on mount", () => {
    render(<KanbanBoard />);

    expect(mockSocket.on).toHaveBeenCalledWith("sync:tasks", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:created", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:updated", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:moved", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:deleted", expect.any(Function));
  });

  test("WebSocket disconnects on component unmount", () => {
    const { unmount } = render(<KanbanBoard />);

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  test("Multiple clients can see real-time updates", async () => {
    // Simulate first client
    const { rerender } = render(<KanbanBoard />);

    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    });

    // Simulate second client creating a task (received via WebSocket)
    const createdHandler = mockSocketHandlers["task:created"];
    const taskFromClient2 = {
      id: "client2-task",
      title: "Task from Client 2",
      description: "This was created by another user",
      status: "todo",
      priority: "high",
      category: "bug",
      attachments: [],
    };

    createdHandler(taskFromClient2);

    await waitFor(() => {
      expect(screen.getByText("Task from Client 2")).toBeInTheDocument();
    });
  });

  test("WebSocket handles rapid task updates", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocketHandlers["sync:tasks"];
    syncHandler([]);

    const createdHandler = mockSocketHandlers["task:created"];

    // Rapidly create multiple tasks
    for (let i = 1; i <= 5; i++) {
      createdHandler({
        id: `rapid-${i}`,
        title: `Rapid Task ${i}`,
        description: `Description ${i}`,
        status: "todo",
        priority: "medium",
        category: "feature",
        attachments: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Rapid Task 1")).toBeInTheDocument();
      expect(screen.getByText("Rapid Task 5")).toBeInTheDocument();
    });
  });
});
