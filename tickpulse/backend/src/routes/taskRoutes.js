// ./backend/routes/taskRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasks, getTaskById, getTasksByCategory, getAllCategory, createCategory, createTask, updateTask, deleteTask, updateTaskOrder } = require('../controllers/taskController');

const router = express.Router();
    
// Task Routes

router.get('/', protect, getTasks); // Get all tasks
router.get('/:id', protect, getTaskById); // Get task by ID

router.post('/', protect, createTask); // Create a new task
router.put('/:id', protect, updateTask); // Update a task by ID
router.delete('/:id', protect, deleteTask); // Delete a task by ID
router.put('/:id', protect, updateTaskOrder);

// router.get('/category/:category_name', protect, getTasksByCategory); // Get tasks by category
// router.post('/category', protect, createCategory); // Create a new category
// router.get('/category', protect, getAllCategory); // Get tasks by category


module.exports = router;