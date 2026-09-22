// app.js

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// 1. Load tasks from localStorage when the page loads
// If there's nothing saved, start with an empty array []
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];

// 2. Function to save our tasks array to localStorage
function saveTasks() {
    // localStorage only stores strings, so we convert our array to a JSON string
    localStorage.setItem('myTasks', JSON.stringify(tasks));
}

// 3. Function to draw all tasks on the screen
function renderTasks() {
    // Clear the current list in the HTML
    taskList.innerHTML = '';
    
    // Loop through our array of tasks and create HTML for each one
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        
        // If the task is marked completed in our data, add the CSS class
        if (task.completed) {
            li.classList.add('completed');
        }

        const span = document.createElement('span');
        span.textContent = task.text;
        
        // Toggle completion status
        span.addEventListener('click', () => {
            // Flip the boolean (true to false, or false to true)
            tasks[index].completed = !tasks[index].completed; 
            saveTasks();  // Save the change
            renderTasks(); // Redraw the list to show the strikethrough
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        
        // Delete task
        deleteBtn.addEventListener('click', () => {
            // Remove 1 item from the array at this specific index
            tasks.splice(index, 1); 
            saveTasks();   // Save the change
            renderTasks(); // Redraw the list
        });

        li.appendChild(span);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
    });
}

// 4. Function to add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        alert("Please enter a task!");
        return; 
    }

    // Add a new task object to our array
    tasks.push({
        text: taskText,
        completed: false
    });

    saveTasks();   // Save to localStorage
    renderTasks(); // Redraw the list so the new task appears

    taskInput.value = ''; // Clear the input field
}

// 5. Event Listeners
addTaskBtn.addEventListener('click', addTask);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// 6. Initial Setup: Draw the tasks immediately when the script runs
renderTasks();
