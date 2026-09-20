// time_test.js
// 執行方式：在終端機輸入 node time_test.js

// 1. 載入環境變數 (請確認 .env 的相對路徑是否正確)
require('dotenv').config({ path: '../.env' }); 

const connectDB = require('../src/config/db'); // 請確認指向你的 db.js 正確路徑

async function runTimeTest() {
    const userId = 8;
    const categoryId = 'inbox';

    console.log(`⏳ 開始效能測試 | User ID: ${userId} | Category: ${categoryId}...\n`);

    let connection;

    try {
        connection = await connectDB();

        // 這是 TickPulse 載入列表時最核心的高頻查詢
        const query = `
            SELECT * FROM tasks 
            WHERE user_id = ? AND category_id = ? AND status = 'pending' 
            ORDER BY sort_order ASC, created_at DESC
        `;
        const params = [userId, categoryId];

        // ==========================================
        // 測試一：Node.js 應用層真實耗時
        // ==========================================
        console.log('▶️ [測試 1] 執行真實查詢 (Node.js 應用層計時)...');
        
        console.time('⚡ 實際查詢耗時 (Query Time)');
        const [rows] = await connection.query(query, params);
        console.timeEnd('⚡ 實際查詢耗時 (Query Time)');
        
        console.log(`✅ 成功撈取 ${rows.length} 筆未完成任務。\n`);

        // ==========================================
        // 測試二：MySQL 底層執行計畫分析
        // ==========================================
        console.log('▶️ [測試 2] 執行 MySQL 底層效能分析 (EXPLAIN ANALYZE)...');
        
        const explainQuery = `EXPLAIN ANALYZE ${query}`;
        const [explainResult] = await connection.query(explainQuery, params);

        // 解析 EXPLAIN ANALYZE 的回傳結果
        const explainOutput = Object.values(explainResult[0])[0];
        console.log('📊 MySQL 底層分析報告：');
        console.log('--------------------------------------------------');
        console.log(explainOutput);
        console.log('--------------------------------------------------\n');

    } catch (error) {
        console.error('❌ 測試失敗：', error);
    } finally {
        if (connection && connection.end) {
            await connection.end();
        }
        process.exit(0);
    }
}

runTimeTest();