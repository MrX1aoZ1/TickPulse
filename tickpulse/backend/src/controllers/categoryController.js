const connectDB = require('../config/db');

// @desc    Get tasks by category ID
// @route   GET /api/categories/:categoryId
// @access  Private
const getTasksByCategory = async (req, res) => {
    try {
        const connection = await connectDB();
        const [tasks] = await connection.query(
            'SELECT * FROM tasks WHERE category_id = ? AND user_id = ? ORDER BY sort_order ASC',
            [req.category_id, req.user.id]
        );
        
        if (tasks.length === 0) {
            await connection.end();
            return res.status(200).json({ message: 'No tasks found for this category' });
        }
        
        res.status(200).json(tasks);
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all categories for the user
// @route   GET /api/categories
// @access  Private
const getAllCategory = async (req, res) => {
    try {
        console.log(req.user.id);

        const connection = await connectDB();   
        const [categories] = await connection.query(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
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

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
    const { name, color } = req.body; 
    const userId = req.user.id;
    const categoryId = crypto.randomUUID();

    if (!name) {
        return res.status(400).json({ message: 'Missing required fields: id' });
    }

    try {
        const connection = await connectDB();

        const [maxOrderResult] = await connection.query(
            'SELECT MAX(sort_order) as max_order FROM categories WHERE user_id = ?',
            [userId]
        );
        const currentMax = maxOrderResult[0].max_order;

        console.log(currentMax);

        const nextOrder = currentMax !== null ? currentMax + 100 : 100;

        console.log(nextOrder);

        await connection.query(
            'INSERT INTO categories (id, user_id, category_name, color, sort_order) VALUES (?, ?, ?, ?, ?)',
            [categoryId, userId, name, color || '#FFFFFF', nextOrder]
        );
        

        res.status(201).json({ 
            category_id: categoryId, 
            user_id: userId, 
            name: name, 
            color: color || '#FFFFFF', 
            sort_order: nextOrder
        });

        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update a category (name and color)
// @route   PUT /api/categories/:categoryId
// @access  Private
const updateCategory = async (req, res) => {
    const categoryId = req.params.categoryId;
    const userId = req.user.id;
    console.log(req.body);
    const { name, color } = req.body; 

    try {
        const connection = await connectDB();
        
        // 1. 先確認該分類存在且屬於該使用者
        const [existing] = await connection.query(
            'SELECT * FROM categories WHERE id = ? AND user_id = ?',
            [categoryId, userId]
        );

        if (existing.length === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Category not found or unauthorized' });
        }

        // 2. 動態組合更新欄位（傳什麼才改什麼，沒傳就維持原樣）
        const updatedName = name !== undefined ? name : existing[0].category_name;
        const updatedColor = color !== undefined ? color : existing[0].color;

        await connection.query(
            'UPDATE categories SET category_name = ?, color = ? WHERE id = ? AND user_id = ?',
            [updatedName, updatedColor, categoryId, userId]
        );

        res.status(200).json({ 
            message: 'Category updated successfully',
            category_id: categoryId,
            name: updatedName,
            color: updatedColor
        });
        
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update category sort order (Drag and Drop)
// @route   PUT /api/categories/:categoryId/order
// @access  Private
const updateCategoryOrder = async (req, res) => {
    const categoryId = req.params.categoryId;
    const userId = req.user.id;
    const sort_order = req.body.order; // 接收新的 double 權重值

    console.log(sort_order);

    if (sort_order === undefined) {
        return res.status(400).json({ message: 'Missing sort_order field' });
    }

    try {
        const connection = await connectDB();
        
        const [result] = await connection.query(
            'UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?',
            [sort_order, categoryId, userId]
        );

        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Category not found or unauthorized' });
        }

        res.status(200).json({ message: 'Order updated successfully', sort_order });
        await connection.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc    Delete a category safely and move its tasks to Inbox
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
    const categoryId = req.params.categoryId;
    const userId = req.user.id;
    
    if (categoryId.startsWith('inbox_')) {
        return res.status(400).json({ message: 'System default list cannot be deleted' });
    }

    let connection;
    try {
        connection = await connectDB();
        
        await connection.beginTransaction();

        // 1. 定義預設的 Inbox ID (需配合你前端/後端的 Inbox 命名規範)
        const defaultInboxId = `inbox_${userId}`; 

        // 2. 遷移任務：把原本屬於該分類、且還沒被刪除的任務，通通歸類到 Inbox
        await connection.query(
            'UPDATE tasks SET category_id = ? WHERE category_id = ? AND user_id = ?',
            [defaultInboxId, categoryId, userId]
        );

        // 3. 刪除該分類
        const [result] = await connection.query(
            'DELETE FROM categories WHERE id = ? AND user_id = ?', 
            [categoryId, userId]
        );
        
        if (result.affectedRows === 0) {
            await connection.rollback(); // 復原改動
            await connection.end();
            return res.status(404).json({ message: 'Category not found or unauthorized' });
        }
        
        // 🎯 提交事務
        await connection.commit();
        res.status(200).json({ message: 'Category deleted successfully, tasks moved to Inbox' });
        await connection.end();

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Delete Category Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getTasksByCategory,
    createCategory,
    getAllCategory,
    updateCategory,
    updateCategoryOrder,
    deleteCategory
}