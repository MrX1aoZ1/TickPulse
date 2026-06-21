const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getTimerRecord, createTimerRecord } = require('../controllers/timerController');

const router = express.Router();  

// Timer Routes
router.get('/', protect, getTimerRecord); // Get all timer records
router.post('/', protect, createTimerRecord); // Create a new timer record

module.exports = router;