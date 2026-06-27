// seed.js
// 執行方式：在終端機輸入 node seed.js
require('dotenv').config({ path: '../.env' });

const connectDB = require('../src/config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function seedDatabase() {
    const userId = 18; // 對應你 mock 的測試帳號
    const categoryId = 'inbox_18';
    const totalTasks = 10000;
    const batchSize = 1000; // 每次批次寫入 1000 筆，避免記憶體溢出

    const getRandomStatus = () => {
        const rand = Math.random();
        if (rand < 0.6) return 'pending';    // 60% 機率是待辦
        if (rand < 0.8) return 'completed';  // 20% 機率是完成
        if (rand < 0.9) return 'cancelled';  // 10% 機率是取消
        return 'deleted';                    // 10% 機率是刪除
    };

    console.log(`🔥 開始對資料庫進行壓測播種，目標：${totalTasks} 筆任務...`);
    console.time('SeedingTime'); // 計時開始

    let connection;

    try {
        connection = await connectDB();


        // Create User 
        // await connection.beginTransaction();
        // const email = 'test@tickpulse.com';
        // const [userResult] = await connection.query(
        //     `INSERT INTO Users (email, username) VALUES (?, 'Tester')`,
        //     [email]
        // );
        // const insertedID = userResult.insertId;

        // const password = 'hashed_password_123';
        // const hashedPassword = await bcrypt.hash(password, 10);

        // const [authResult] = await connection.query(
        //     `INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, 'local', ?, ?)`,
        //     [insertedID, email, hashedPassword]
        // );

        // console.log(userResult);
        // console.log(authResult);

        // await connection.commit();

        // await connection.beginTransaction();
        // const [categoryResult] = await connection.query(
        //      `INSERT INTO Categories (id, user_id, category_name, color, sort_order) VALUES ('inbox', 8, 'inbox', '#000000', 100)`
        // );
        // await connection.commit();

        for (let i = 0; i < totalTasks; i += batchSize) {
            const values = [];

            // 2. 產生 1000 筆假資料
            for (let j = 0; j < batchSize; j++) {
                const id = crypto.randomUUID();
                const taskName = `壓力測試任務 #${i + j + 1}`;
                // 因為你最終版資料庫使用 ENUM，所以這裡直接塞字串
                const status = getRandomStatus();
                const sortOrder = Math.random() * 100000; // 隨機浮點數排序

                // 陣列順序必須對應下方 INSERT 語句的欄位
                values.push([id, categoryId, userId, taskName, status, sortOrder]);
            }

            // 3. MySQL 批次插入優化語法 (VALUES ?)
            await connection.query(
                `INSERT INTO tasks (id, category_id, user_id, task_name, status, sort_order) VALUES ?`,
                [values]
            );

            console.log(`...已寫入 ${i + batchSize} 筆資料`);
        }

        console.timeEnd('SeedingTime'); // 計時結束
        console.log('✅ 10,000 筆任務播種完畢！你可以去 MySQL 測試查詢速度了。');

    } catch (error) {
        console.error('❌ 播種失敗：', error);
    } finally {
        // 4. 確保執行完畢後關閉連線，否則終端機會一直卡住
        if (connection && connection.end) {
            await connection.end();
        }
        process.exit(0); // 關閉腳本
    }
}

seedDatabase();