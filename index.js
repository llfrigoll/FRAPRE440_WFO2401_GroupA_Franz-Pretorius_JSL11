//Import helper functions from utils
import {getTasks, createNewTask, putTask, deleteTask} from "/utils/taskFunctions.js"
//Import initialData
import {initialData} from "/initialData.js";

// Function checks if local storage already has data, if not it loads initialData to localStorage
function initializeData() {
  if (!localStorage.getItem('tasks')) {
    localStorage.setItem('tasks', JSON.stringify(initialData)); 
    localStorage.setItem('showSideBar', 'true')
  } else {
    console.log('Data already exists in localStorage');
  }
}

//Gets elements from the DOM
const elements = {
  headerBoardName: document.querySelector("#header-board-name"),
  columnDivs: document.querySelectorAll(".column-div"),
  editTaskModal: document.querySelector(".edit-task-modal-window"),
  filterDiv: document.querySelector("#filterDiv"),
  hideSideBarBtn: document.querySelector("#hide-side-bar-btn"),
  showSideBarBtn: document.querySelector("#show-side-bar-btn"),
  themeSwitch: document.querySelector("#switch"),
  createNewTaskBtn: document.querySelector("#add-new-task-btn"),
  modalWindow: document.querySelector(".modal-window")
};

//Variable for active board
let activeBoard = "";

//Variable for the current task being edited
let currentTask = {};

// Extracts unique board names from tasks
function fetchAndDisplayBoardsAndTasks() {
  //Gets the tasks from local storage
  const tasks = getTasks();
  //Creates a board array from the board key in each task, filtering out duplicates using set
  const boards = [...new Set(tasks.map(task => task.board).filter(Boolean))];
  displayBoards(boards);
  //Adds the boards to localstorage
  if (boards.length > 0) {
    const localStorageBoard = JSON.parse(localStorage.getItem("activeBoard"))
    activeBoard = localStorageBoard ? localStorageBoard :  boards[0]; 
    elements.headerBoardName.textContent = activeBoard
    styleActiveBoard(activeBoard)
    refreshTasksUI();
  }
}

// Creates different boards in the DOM
function displayBoards(boards) {
  //Grabs the board container from DOM
  const boardsContainer = document.getElementById("boards-nav-links-div");
  boardsContainer.innerHTML = ''; // Clears the container
  //Creates button for each board
  boards.forEach(board => {
    const boardElement = document.createElement("button");
    boardElement.textContent = board;
    boardElement.classList.add("board-btn");
    //Displays the tasks per board when it gets clicked
    boardElement.addEventListener('click', () => {
      elements.headerBoardName.textContent = board;
      filterAndDisplayTasksByBoard(board);
      activeBoard = board //assigns active board
      localStorage.setItem("activeBoard", JSON.stringify(activeBoard))
      styleActiveBoard(activeBoard)
    });
    boardsContainer.appendChild(boardElement);
  });

}

// Filters tasks corresponding to the board name and displays them on the DOM.
function filterAndDisplayTasksByBoard(boardName) {
  const tasks = getTasks(); // Fetch tasks from a simulated local storage function
  const filteredTasks = tasks.filter(task => task.board === boardName);

  elements.columnDivs.forEach(column => {
    const status = column.getAttribute("data-status");
    // Reset column content while preserving the column title
    column.innerHTML = `<div class="column-head-div">
                          <span class="dot" id="${status}-dot"></span>
                          <h4 class="columnHeader">${status.toUpperCase()}</h4>
                        </div>`;

    //Creates a container for the tasks
    const tasksContainer = document.createElement("div");
    tasksContainer.setAttribute("class", "tasks-container")
    column.appendChild(tasksContainer);

    //Filters the tasks per status and displays them accordingly
    filteredTasks.filter(task => task.status === status).forEach(task => { 
      const taskElement = document.createElement("div");
      taskElement.classList.add("task-div");
      taskElement.textContent = task.title;
      taskElement.setAttribute('data-task-id', task.id);

      // Listen for a click event on each task and open a modal
      taskElement.addEventListener('click', () => {
        //Sets the global task variable to the task being clicked
        currentTask = task
        openEditTaskModal();
      });

      tasksContainer.appendChild(taskElement);
    });
  });
}


function refreshTasksUI() {
  filterAndDisplayTasksByBoard(activeBoard);
}

// Styles the active board by adding an active class
function styleActiveBoard(boardName) {
  document.querySelectorAll('.board-btn').forEach(btn => { 
    
    if(btn.textContent === boardName) {
      btn.classList.add('active') 
    }
    else {
      btn.classList.remove('active'); 
    }
  });
}

//Adds the task's info to the DOM for displaying
function addTaskToUI(task) {
  //Checks whether the status exists and assigns the column to a variable if so
  const column = document.querySelector(`.column-div[data-status="${task.status}"]`); 
  if (!column) {
    console.error(`Column not found for status: ${task.status}`);
    return;
  }

  //Creates a container for the tasks from each column if there isn't already one
  let tasksContainer = column.querySelector('.tasks-container');
  if (!tasksContainer) {
    console.warn(`Tasks container not found for status: ${task.status}, creating one.`);
    tasksContainer = document.createElement('div');
    tasksContainer.className = 'tasks-container';
    column.appendChild(tasksContainer);
  }

  //Creates task element and updates its details
  const taskElement = document.createElement('div');
  taskElement.classList.add('task-div');
  taskElement.textContent = task.title; // Modify as needed
  taskElement.setAttribute('data-task-id', task.id);

  //Adds the element to the container
  tasksContainer.appendChild(taskElement);
  refreshTasksUI();
}

function setupEventListeners() {
  // Cancel editing task event listener
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  cancelEditBtn.addEventListener('click', () => {
    toggleModal(false, elements.editTaskModal)
    elements.filterDiv.style.display = 'none';
  });

  // Cancel adding new task event listener
  const cancelAddTaskBtn = document.getElementById('cancel-add-task-btn');
  cancelAddTaskBtn.addEventListener('click', () => {
    toggleModal(false);
    elements.filterDiv.style.display = 'none'; // Also hide the filter overlay
  });

  // Clicking outside the modal to close it
  elements.filterDiv.addEventListener('click', () => {
    toggleModal(false, elements.modalWindow);
    toggleModal(false, elements.editTaskModal);
    elements.filterDiv.style.display = 'none'; // Also hide the filter overlay
  });

  // Show and hide sidebar event listeners
  elements.hideSideBarBtn.addEventListener('click', () => toggleSidebar(false));
  elements.showSideBarBtn.addEventListener('click', () => toggleSidebar(true));

  // Theme switch event listener
  elements.themeSwitch.addEventListener('change', toggleTheme);

  // Show Add New Task Modal event listener
  elements.createNewTaskBtn.addEventListener('click', () => {
    toggleModal(true);
    elements.filterDiv.style.display = 'block'; // Also show the filter overlay
  });

  // Add new task form submission event listener
  elements.modalWindow.addEventListener('submit',  (event) => {
    addTask(event)
  });
}

// Toggles tasks modal
function toggleModal(show, modal = elements.modalWindow) {
  modal.style.display = show ? 'block' : 'none';
  //Grabs the save and delete button for the edit modal from the DOM
  const saveBtn = document.getElementById("save-task-changes-btn");
  const deleteBtn = document.getElementById("delete-task-btn");
  //If the edit modal is being closed it deletes the event listeners for the delete and save button
  //since otherwise the click event listeners would stack every time openEditTaskModal is run
  if((show === false) && (modal === elements.editTaskModal)){
    deleteClickEventListeners(saveBtn, saveEdit)
    deleteClickEventListeners(deleteBtn, deleteEdit)
  }
}

//Adds a new task
function addTask(event) {
  event.preventDefault();

  //Assign user input to the task object
    const task = {
      "title": document.getElementById("title-input").value,
      "description" : document.getElementById("desc-input").value,
      "status" : document.getElementById("select-status").value,
      "board" : activeBoard
    };
    
    //Adds the task to localstorage and updates the UI if the task is valid
    const newTask = createNewTask(task);
    if (newTask) {
      addTaskToUI(newTask);
      toggleModal(false);
      elements.filterDiv.style.display = 'none'; // Also hide the filter overlay
      event.target.reset();
      refreshTasksUI();
    }
}

//Toggles the sidebar
function toggleSidebar(show) {
  const sidebar = document.querySelector(".side-bar")
  //Either shows the sidebar and hides the button or hides the sidebar and shows the button
  sidebar.style.display = show ? 'block' : 'none';
  elements.showSideBarBtn.style.display = show ? 'none' : 'block';
}

//Toggles theme to the inactive one
function toggleTheme() {
  const logo = document.getElementById("logo")

  if(document.body.classList.toggle('light-theme') === true) {
    logo.setAttribute('src', "./assets/logo-light.svg")
  } else {
    logo.setAttribute('src', "./assets/logo-dark.svg")
  }
}

//NOTE: The following two functions needed to be outside openEditTaskModal in order for toggleModal and
//deleteClickEventListenersto recognize them

//Saves task changes for current task
function saveEdit() {
  saveTaskChanges(currentTask.id);
}

//Deletes current task
function deleteEdit() {
  deleteTask(currentTask.id);
  toggleModal(false, elements.editTaskModal);
  elements.filterDiv.style.display = 'none';
  refreshTasksUI();
}

//Deletes click event listeners for given element and function
function deleteClickEventListeners(element, func) {
  element.removeEventListener('click', func)
};

function openEditTaskModal() {
  // Set task details in modal inputs
  const title = document.getElementById("edit-task-title-input");
  const desc = document.getElementById("edit-task-desc-input");
  const status = document.getElementById("edit-select-status");

  //Sets the modal values to the given task's info
  title.value = currentTask.title;
  desc.value = currentTask.description;
  status.value = currentTask.status;

  // Get button elements from the task modal
  const saveBtn = document.getElementById("save-task-changes-btn");
  const deleteBtn = document.getElementById("delete-task-btn");

  // Call saveTaskChanges upon click of Save Changes button
  saveBtn.addEventListener('click', saveEdit);

    // Delete task using a helper function and close the task modal
  deleteBtn.addEventListener('click', deleteEdit)

  toggleModal(true, elements.editTaskModal);
  elements.filterDiv.style.display = 'block'; // Show the edit task modal

}

function saveTaskChanges(taskId) {
  // Get new user inputs
  let title = document.getElementById("edit-task-title-input").value;
  let desc = document.getElementById("edit-task-desc-input").value;
  let status = document.getElementById("edit-select-status").value;

  // Create an object with the updated task details
  const taskUpdated = {
    "id" : taskId,
    "title" : title,
    "description" : desc,
    "status" : status,
    "board" : activeBoard
  };

  // Update task using a hlper functoin
  putTask(taskId, taskUpdated);

  // Close the modal and refresh the UI to reflect the changes
  toggleModal(false, elements.editTaskModal);
  elements.filterDiv.style.display = 'none';
  refreshTasksUI();
}

document.addEventListener('DOMContentLoaded', function() {
  init(); // init is called after the DOM is fully loaded
});

function init() {
  //localStorage.clear()
  initializeData();
  setupEventListeners();
  const showSidebar = localStorage.getItem('showSideBar') === 'true';
  toggleSidebar(showSidebar);
  const isLightTheme = localStorage.getItem('light-theme') === 'enabled';
  document.body.classList.toggle('light-theme', isLightTheme);
  fetchAndDisplayBoardsAndTasks(); // Initial display of boards and tasks
}