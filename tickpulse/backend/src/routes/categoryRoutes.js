const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTasksByCategory, getAllCategory, createCategory, updateCategory, updateCategoryOrder, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', protect, getAllCategory); 
router.post('/', protect, createCategory); 

router.get('/:categoryId', getTasksByCategory);

router.put('/:categoryId', protect, updateCategory);
router.put('/:categoryId/order', protect, updateCategoryOrder);

router.delete('/:categoryId', deleteCategory);

module.exports = router;