const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasksByCategory, getAllCategory, createCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', protect, getAllCategory); 
router.post('/', protect, createCategory); 

router.get('/:categoryId', getTasksByCategory);

router.delete('/:categoryId', deleteCategory);

module.exports = router;