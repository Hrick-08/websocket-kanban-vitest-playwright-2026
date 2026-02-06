import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard.jsx";

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

describe("KanbanBoard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders Kanban board title", async () => {
    render(<KanbanBoard />);
    
    // Simulate socket sync to load the board
    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    });
  });

  test("displays loading state initially", () => {
    render(<KanbanBoard />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  test("renders all three columns after loading", async () => {
    render(<KanbanBoard />);

    // Simulate socket connection and sync
    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    syncHandler([
      {
        id: "1",
        title: "Test Task",
        description: "Test Description",
        status: "todo",
        priority: "medium",
        category: "feature",
        attachments: [],
      },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId("column-todo")).toBeInTheDocument();
      expect(screen.getByTestId("column-inprogress")).toBeInTheDocument();
      expect(screen.getByTestId("column-done")).toBeInTheDocument();
    });
  });

  test("displays new task button", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByTestId("new-task-button")).toBeInTheDocument();
    });
  });

  test("shows new task form when new task button is clicked", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler([]);

    await waitFor(() => {
      const newTaskButton = screen.getByTestId("new-task-button");
      fireEvent.click(newTaskButton);
    });

    expect(screen.getByTestId("new-task-form")).toBeInTheDocument();
    expect(screen.getByTestId("new-task-title")).toBeInTheDocument();
    expect(screen.getByTestId("new-task-description")).toBeInTheDocument();
  });

  test("creates a new task when form is submitted", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler([]);

    await waitFor(() => {
      const newTaskButton = screen.getByTestId("new-task-button");
      fireEvent.click(newTaskButton);
    });

    const titleInput = screen.getByTestId("new-task-title");
    const descriptionInput = screen.getByTestId("new-task-description");
    const createButton = screen.getByTestId("create-task-button");

    fireEvent.change(titleInput, { target: { value: "New Task" } });
    fireEvent.change(descriptionInput, {
      target: { value: "New Description" },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "task:create",
        expect.objectContaining({
          title: "New Task",
          description: "New Description",
          status: "todo",
          priority: "medium",
          category: "feature",
        })
      );
    });
  });

  test("renders tasks in correct columns", async () => {
    render(<KanbanBoard />);

    const tasks = [
      {
        id: "1",
        title: "Todo Task",
        description: "Todo Description",
        status: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
      {
        id: "2",
        title: "In Progress Task",
        description: "In Progress Description",
        status: "inprogress",
        priority: "medium",
        category: "feature",
        attachments: [],
      },
      {
        id: "3",
        title: "Done Task",
        description: "Done Description",
        status: "done",
        priority: "high",
        category: "enhancement",
        attachments: [],
      },
    ];

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler(tasks);

    await waitFor(() => {
      expect(screen.getByText("Todo Task")).toBeInTheDocument();
      expect(screen.getByText("In Progress Task")).toBeInTheDocument();
      expect(screen.getByText("Done Task")).toBeInTheDocument();
    });
  });

  test("displays task count in column headers", async () => {
    render(<KanbanBoard />);

    const tasks = [
      {
        id: "1",
        title: "Task 1",
        description: "Description 1",
        status: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
      {
        id: "2",
        title: "Task 2",
        description: "Description 2",
        status: "todo",
        priority: "medium",
        category: "feature",
        attachments: [],
      },
    ];

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler(tasks);

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  test("deletes a task when delete button is clicked", async () => {
    render(<KanbanBoard />);

    const tasks = [
      {
        id: "1",
        title: "Task to Delete",
        description: "Description",
        status: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler(tasks);

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    await waitFor(() => {
      const deleteButton = screen.getByTestId("delete-task");
      fireEvent.click(deleteButton);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", "1");
  });

  test("displays progress chart", async () => {
    render(<KanbanBoard />);

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler([]);

    await waitFor(() => {
      expect(screen.getByTestId("progress-chart")).toBeInTheDocument();
      expect(screen.getByText("Task Progress")).toBeInTheDocument();
    });
  });

  test("displays correct completion percentage", async () => {
    render(<KanbanBoard />);

    const tasks = [
      {
        id: "1",
        title: "Task 1",
        description: "Description",
        status: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
      {
        id: "2",
        title: "Task 2",
        description: "Description",
        status: "done",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler(tasks);

    await waitFor(() => {
      expect(screen.getByText("50.0%")).toBeInTheDocument();
    });
  });

  test("handles file upload", async () => {
    render(<KanbanBoard />);

    const tasks = [
      {
        id: "1",
        title: "Task with Upload",
        description: "Description",
        status: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    const syncHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    syncHandler(tasks);

    await waitFor(() => {
      const uploadButton = screen.getByTestId("upload-button");
      expect(uploadButton).toBeInTheDocument();
    });
  });

  test("listens to WebSocket events", () => {
    render(<KanbanBoard />);

    expect(mockSocket.on).toHaveBeenCalledWith("sync:tasks", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:created", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:updated", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:moved", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("task:deleted", expect.any(Function));
  });

  test("disconnects socket on unmount", () => {
    const { unmount } = render(<KanbanBoard />);
    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
