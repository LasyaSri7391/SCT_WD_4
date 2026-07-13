// State Management
let tasks = [];

// DOM Elements
const todoForm = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const taskDue = document.getElementById('task-due');
const tasksList = document.getElementById('tasks-list');
const emptyState = document.getElementById('empty-state');
const dateDisplay = document.getElementById('current-date-label');
const timeDisplay = document.getElementById('current-time-val');

// Set minimum allowed date-time for the picker to the current system time
const setMinDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  taskDue.min = now.toISOString().slice(0, 16);
};

// Update the dynamic live date and time display in the header
const updateLiveDateTime = () => {
  if (!dateDisplay || !timeDisplay) return;
  const now = new Date();
  dateDisplay.textContent = now.toLocaleDateString([], { month: 'long', day: 'numeric' });
  timeDisplay.textContent = now.toLocaleTimeString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
};

// Load tasks from Local Storage
const loadTasks = () => {
  const storedTasks = localStorage.getItem('tasks');
  tasks = storedTasks ? JSON.parse(storedTasks) : [];
  renderTasks();
};

// Save tasks to Local Storage
const saveTasks = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

// Format date and time for clean display
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  const dateObj = new Date(dateTimeStr);
  return isNaN(dateObj.getTime()) ? dateTimeStr : dateObj.toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// Check if a task is overdue (uncompleted tasks only)
const isOverdue = (dateTimeStr, isCompleted) => {
  if (!dateTimeStr || isCompleted) return false;
  return new Date(dateTimeStr) < new Date();
};

// Escapes special characters to prevent HTML injection XSS
const escapeHtml = (str) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerText = str;
  return tempDiv.innerHTML;
};

// Render tasks list in the DOM
const renderTasks = () => {
  tasksList.innerHTML = '';
  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  // Sort: Active first (by due date), completed last (by due date)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  sortedTasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.completed ? 'completed' : ''}`;
    card.id = `task-card-${task.id}`;

    if (task.isEditing) {
      card.innerHTML = `
        <div class="edit-form">
          <div class="edit-input-group">
            <label for="edit-input-${task.id}">Task Title</label>
            <input type="text" id="edit-input-${task.id}" value="${escapeHtml(task.title)}" required autocomplete="off">
          </div>
          <div class="edit-input-group">
            <label for="edit-due-${task.id}">Due Date & Time</label>
            <input type="datetime-local" id="edit-due-${task.id}" value="${task.dueDate}" required>
          </div>
          <div class="edit-buttons">
            <button class="btn btn-secondary btn-cancel" data-id="${task.id}">Cancel</button>
            <button class="btn btn-primary btn-save" data-id="${task.id}">Save</button>
          </div>
        </div>
      `;
    } else {
      const overdue = isOverdue(task.dueDate, task.completed);
      card.innerHTML = `
        <div class="task-main">
          <div class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
          </div>
          <div class="task-details">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <span class="task-due ${overdue ? 'overdue' : ''}">
              📅 Due: ${formatDateTime(task.dueDate)} ${overdue ? '(Overdue)' : ''}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-edit" data-id="${task.id}">Edit</button>
          <button class="btn btn-danger btn-delete" data-id="${task.id}">Delete</button>
        </div>
      `;
    }
    tasksList.appendChild(card);
  });
};

// Add New Task
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  const dueDate = taskDue.value;
  if (!title || !dueDate) return;

  tasks.push({
    id: Date.now().toString(),
    title,
    dueDate,
    completed: false,
    isEditing: false
  });
  saveTasks();
  renderTasks();

  taskInput.value = '';
  taskDue.value = ''; // Clear date & time field
  taskInput.focus();  // Cursor back to task input

  setMinDateTime();
});

// Event delegation
tasksList.addEventListener('click', (e) => {
  const target = e.target;
  const taskId = target.getAttribute('data-id');
  if (!taskId) return;

  if (target.classList.contains('task-checkbox')) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, completed: target.checked } : t);
    saveTasks();
    renderTasks();
  } else if (target.classList.contains('btn-edit')) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, isEditing: true } : t);
    renderTasks();
  } else if (target.classList.contains('btn-delete')) {
    if (confirm('Are you sure you want to delete this task?')) {
      tasks = tasks.filter(t => t.id !== taskId);
      saveTasks();
      renderTasks();
    }
  } else if (target.classList.contains('btn-cancel')) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, isEditing: false } : t);
    renderTasks();
  } else if (target.classList.contains('btn-save')) {
    const editInput = document.getElementById(`edit-input-${taskId}`);
    const editDue = document.getElementById(`edit-due-${taskId}`);
    const updatedTitle = editInput.value.trim();
    const updatedDue = editDue.value;
    if (!updatedTitle || !updatedDue) return;

    tasks = tasks.map(t =>
      t.id === taskId
        ? { ...t, title: updatedTitle, dueDate: updatedDue, isEditing: false }
        : t
    );

    saveTasks();
    renderTasks();
  }
});

// App Initialization
setMinDateTime();
updateLiveDateTime();
setInterval(updateLiveDateTime, 1000); // Update every second
loadTasks();