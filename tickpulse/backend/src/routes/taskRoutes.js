// ./backend/routes/taskRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasks, getTaskById, createTask, updateTask, deleteTask, updateTaskOrder } = require('../controllers/taskController');

const router = express.Router();
    
// Task Routes

router.get('/', protect, getTasks); 
router.post('/', protect, createTask); 

router.get('/:taskId', protect, getTaskById); 
router.put('/:taskId', protect, updateTask); 
router.delete('/:taskId', protect, deleteTask); 
router.put('/:taskId/reorder', protect, updateTaskOrder);


module.exports = router;