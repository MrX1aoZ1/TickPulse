// ./backend/routes/taskRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasks, getTaskById, getTasksByCategory, getAllCategory, createCategory, createTask, updateTask, deleteTask, updateTaskOrder } = require('../controllers/taskController');

const router = express.Router();
    
// Task Routes

router.get('/', protect, getTasks); 
router.post('/', protect, createTask); 

router.post('/category', protect, createCategory); 
router.get('/category', protect, getAllCategory); 

router.get('/category/:category_name', protect, getTasksByCategory); 

router.get('/:id', protect, getTaskById); 
router.put('/:id', protect, updateTask); 
router.delete('/:id', protect, deleteTask); 
router.put('/:id/reorder', protect, updateTaskOrder);


module.exports = router;