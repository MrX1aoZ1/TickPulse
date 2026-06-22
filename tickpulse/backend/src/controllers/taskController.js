// ./backend/controllers/taskController.js
const connectDB = require('../config/db');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
    try {
        const connection = await connectDB();
        const [tasks] = await connection.query(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC',
            [req.user.id]
        );
        
        res.status(200).json(tasks);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
    try {
        const connection = await connectDB();
        const [tasks] = await connection.query(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.id]
        );
        
        if (tasks.length === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.status(200).json(tasks[0]);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get tasks by category ID
// @route   GET /api/tasks/category/:category_id
// @access  Private
const getTasksByCategory = async (req, res) => {
    try {
        const connection = await connectDB();
        const [tasks] = await connection.query(
            'SELECT * FROM tasks WHERE category_id = ? AND user_id = ? ORDER BY sort_order ASC',
            [req.params.category_id, req.user.id]
        );
        
        if (tasks.length === 0) {
            await connection.end();
            return res.status(404).json({ message: 'No tasks found for this category' });
        }
        
        res.status(200).json(tasks);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all categories for the user
// @route   GET /api/tasks/category
// @access  Private
const getAllCategory = async (req, res) => {
    try {
        console.log(req.user.id);

        const connection = await connectDB();   
        const [categories] = await connection.query(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order ASC',
            [req.user.id]
        );
        
        if (categories.length === 0) {  
            await connection.end();
            return res.status(404).json({ message: 'No categories found' });
        }
        
        res.status(200).json(categories);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
    // Exact mapping to Database.md schema fields
    const { 
        id,
        user_id, 
        task_name, 
        category_id, 
        content, 
        status, 
        priority, 
        deadline, 
        start_time, 
        end_time, 
        is_all_day, 
        reminder_type, 
        reminder_time, 
        is_recurring, 
        recurrence_rule, 
        sort_order
    } = req.body;

    const default_category_id = `inbox_${req.user_id}`; 

    if (!id || !user_id|| !task_name ) {
        return res.status(400).json({ message: 'Missing required fields: id and task_name are mandatory.' });
    }

    try {
        const connection = await connectDB();

        // Default floating point order weight if omitted
        const calculatedSortOrder = sort_order !== undefined ? parseFloat(sort_order) : Date.now();
        const targetCategoryID = category_id || default_category_id;

        await connection.query(
            `INSERT INTO tasks (
                id, user_id, category_id, task_name, content, status, priority, 
                deadline, start_time, end_time, is_all_day, reminder_type, reminder_time, 
                is_recurring, recurrence_rule, sort_order
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                user_id, 
                targetCategoryID,
                task_name,
                content || null, 
                status || 'pending', // Directly using ENUM string
                priority || 'none',
                deadline || null, 
                start_time || null, 
                end_time || null,
                is_all_day !== undefined ? is_all_day : true,
                reminder_type !== undefined ? reminder_type : 1, // TINYINT logic
                reminder_time || null, 
                is_recurring !== undefined ? is_recurring : false, 
                recurrence_rule || null, 
                calculatedSortOrder
            ]
        );
       
        res.status(201).json({ 
            id, 
            user_id, 
            category_id: targetCategoryID, 
            task_name, 
            content: content || null, 
            status: status || 'pending', 
            priority: priority || 'none', 
            deadline: deadline || null, 
            sort_order: calculatedSortOrder 
        });

        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a new category
// @route   POST /api/tasks/category
// @access  Private
const createCategory = async (req, res) => {
    const { id, name, color, sort_order } = req.body; 
    const user_id = req.user.id;

    if (!id || !name) {
        return res.status(400).json({ message: 'Missing required fields: id and name' });
    }

    try {
        const connection = await connectDB();
        await connection.query(
            'INSERT INTO categories (id, user_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)',
            [id, user_id, name, color || '#FFFFFF', sort_order || 0.0]
        );
        
        res.status(201).json({ id, name, color: color || '#FFFFFF', user_id });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Dynamic update for any task property
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
    const updates = { ...req.body };
    const user_id = req.user.id;
    const task_id = req.params.id;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided for updates' });
    }

    // Safety mapping for frontend compatibility if they still send category_name
    if ('category_name' in updates) {
        updates.category_id = updates.category_name;
        delete updates.category_name;
    }

    try {
        const connection = await connectDB();
        
        const fieldAssignments = Object.keys(updates).map(key => `\`${key}\` = ?`).join(', ');
        const bindingValues = Object.values(updates);

        const dynamicQuery = `UPDATE tasks SET ${fieldAssignments} WHERE id = ? AND user_id = ?`;
        const [result] = await connection.query(dynamicQuery, [...bindingValues, task_id, user_id]);

        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Task not found or access denied' });
        }
        
        res.status(200).json({ id: task_id, ...req.body });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    O(1) Drag and Drop Sorting Handler via Floating Point Math
// @route   PUT /api/tasks/:id/reorder
// @access  Private
const updateTaskOrder = async (req, res) => {
    const user_id = req.user.id;
    const task_id = req.params.id;
    const { prev_order, next_order } = req.body;

    let newSortOrder;

    if (prev_order !== undefined && next_order !== undefined) {
        newSortOrder = (parseFloat(prev_order) + parseFloat(next_order)) / 2;
    } else if (prev_order !== undefined) {
        newSortOrder = parseFloat(prev_order) + 1.0;
    } else if (next_order !== undefined) {
        newSortOrder = parseFloat(next_order) - 1.0;
    } else {
        return res.status(400).json({ message: 'Reorder bounds omitted' });
    }

    try {
        const connection = await connectDB();
        const [result] = await connection.query(
            'UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?',
            [newSortOrder, task_id, user_id]
        );

        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Task reordering failed' });
        }

        res.status(200).json({ id: task_id, sort_order: newSortOrder });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a task by ID
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
    const user_id = req.user.id;

    try {
        const connection = await connectDB();
        const [result] = await connection.query(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?', 
            [req.params.id, user_id]
        );
        
        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Task not found or unauthorized' });
        }
        
        res.status(200).json({ message: 'Task deleted successfully' });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskOrder,
    deleteTask,
    getTasksByCategory,
    createCategory,
    getAllCategory
};