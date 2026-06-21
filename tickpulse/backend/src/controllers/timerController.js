const mysql = require('mysql2/promise');
const connectDB = require('../config/db'); // Assuming you have a connectDB function to establish a connection

// @desc    Get all timer records
// @route   GET /api/timer
// @access  Private
const getTimerRecord = async (req, res) => {
    try {
        console.log('getTimerRecord called');
        const connection = await connectDB();
        const [timerRecords] = await connection.query(
            'SELECT * FROM timer WHERE user_id = ?',
            [req.user.id]
        );
        console.log('Timer records fetched');
        res.status(200).json(timerRecords);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc    Get all timer records
// @route   post /api/timer
// @access  Private
const createTimerRecord = async (req, res) => {
    const { user_id, date, timer_duration } = req.body;

    try {
        const connection = await connectDB();
        const [result] = await connection.query(
            `INSERT INTO timer (user_id, date, timer_duration) VALUES (?, ?, ?)`,
            [user_id, date, timer_duration]
        );
        console.log('createTimerRecord called');
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Timer record not found or not authorized' });
        }

        res.status(200).json({ message: 'Timer record created successfully' });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getTimerRecord,
    createTimerRecord
};