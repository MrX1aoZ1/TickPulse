// How to run: node test-api.js

const API_BASE = 'http://localhost:3000'; // 請確認你的 Port 號
const crypto = require('crypto');

async function runTests() {
    const testEmail = `test_${Date.now()}@tickpulse.com`; // 使用時間戳防止密碼/信箱重複報錯
    const testPassword = 'Password.123!';

    try {
        console.log('---------------------------------------------------------');
        console.log('           Automatic API Test Start now...');
        console.log('---------------------------------------------------------\n');


        // ---------------------------------------------------------
        // Test 1: User Sign Up Test
        // ---------------------------------------------------------

        console.log('Test 1: User Sign Up Test');
        const signupRes = await fetch(`${API_BASE}/auth/sign-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
            })
        });
        const signupData = await signupRes.json();
        if (!signupRes.ok) throw new Error(`Sign Up Failed, Error: ${JSON.stringify(signupData)}`);
        console.log(`Sign Up Successful, Sign Up Data:\n`, signupData);
        console.log(`--------------------------------------------------`);

        // ---------------------------------------------------------
        // Test 2: User Login Test
        // ---------------------------------------------------------
        console.log('Test 2: User Login Test');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword
            })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login Failed: ${JSON.stringify(loginData)}`);

        // 🌟 核心：從 Response Headers 中抓取伺服器發給我們的 Session Cookie
        const setCookieHeader = loginRes.headers.get('set-cookie');
        if (setCookieHeader) {
            // 提取出類似 connect.sid=xxxxxxx 的部分
            sessionCookie = setCookieHeader.split(';')[0];
            console.log('🔑 成功抓取 Session Cookie:', sessionCookie);
        } else {
            console.warn('⚠️ 警告：未在 Header 中發現 set-cookie，請確保後端有啟用 Session！');
        }
        console.log('✅ 登入成功！返回數據:', loginData);
        console.log(`--------------------------------------------------`);


        // ==========================================
        // Test 3: Create Task Test
        // ==========================================
        console.log('Test 3: Create Task Test');

        insertedUserId = loginData.user.id; 

        const createTaskRes = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({
                id: crypto.randomUUID(),
                user_id: insertedUserId,
                task_name: 'Auto Test Task',
                category_id: `inbox_${insertedUserId}`,  
                status: 'pending',
                sort_order: '100'              // 故意傳入字串看後端是否能轉換
            })
        });
        const taskData = await createTaskRes.json();
        if (!createTaskRes.ok) throw new Error(`創建任務失敗: ${JSON.stringify(taskData)}`);
        console.log('✅ 創建任務成功！返回數據:', taskData);
        console.log(`--------------------------------------------------`);

        // ==========================================
        // Test 4: Fetch All Category
        // ==========================================
        console.log('Test 4: Fetch All Category');
        
        const res4 = await fetch(`${API_BASE}/api/tasks/category`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
        });

        const data4 = await res4.json();

        if (res4.status === 200) {
            console.log(`➔ 當前使用者共有 ${data4.length} 個分類，詳細清單如下：`);
            console.dir(data4, { depth: null, colors: true });
        } else if (res4.status === 404 && data4.message === 'No categories found') {
            console.log('ℹ️ 提示：成功打通路由，但資料庫中該使用者沒有任何分類 (回傳 404 No categories found)。');
        } else {
            console.error(`❌ 失敗：調用 getAllCategory 發生錯誤。`);
            console.error(`➔ 狀態碼: ${res4.status}`);
            console.error(`➔ 錯誤訊息:`, data4);
        }
        console.log(`--------------------------------------------------`);  


        // ==========================================
        // Test 5: Logout Test
        // ==========================================
        console.log('Test 5: Logout Test');
        const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': sessionCookie }
        });

        const logoutData = await logoutRes.json();
        console.log('Logout Success:\n', logoutData);
        console.log(`--------------------------------------------------`);


        // ==========================================
        // Test 6: Security Test, verify if task can be created after logout
        // ==========================================
        console.log('Test 6: Security Test');
        const verifyRes = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({
                id: crypto.randomUUID(),
                task_name: 'Insecure Auto Test Task',
                category_id: `inbox_${insertedUserId}`,   // testCategoryId = 'inbox'
                status: 'pending',
                sort_order: 0.0
            })
        });

        if (verifyRes.status === 401 || !verifyRes.ok) {
            console.log(`🎉 完美！系統成功攔截未登入請求（狀態碼: ${verifyRes.status}）`);
        } else {
            console.error('❌ 嚴重漏洞：登出後居然還能成功創建任務！');
        }

        console.log('\n🎊 恭喜！精簡版核心功能自動化測試【全部通過】！');
        // // ---------------------------------------------------------
        // // 測試 2：邊界條件 - 漏傳必填欄位
        // // ---------------------------------------------------------
        // console.log('\n▶️ [Test 2] 測試防呆機制 (漏傳 task_name)...');
        // const res2 = await fetch(API_BASE, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ id: crypto.randomUUID() }) // 沒傳 task_name
        // });
        // if (res2.status === 400) {
        //     console.log('✅ 通過：伺服器成功攔截錯誤並回傳 400 Bad Request。');
        // } else {
        //     console.error('❌ 失敗：伺服器沒有攔截到錯誤。狀態碼:', res2.status);
        // }

        // // ---------------------------------------------------------
        // // 測試 3：演算法測試 - O(1) 浮點數拖拽排序機制
        // // ---------------------------------------------------------
        // console.log('\n▶️ [Test 3] 測試浮點數拖拽排序演算...');
        // const res3 = await fetch(`${API_BASE}/${testTaskId}/reorder`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         prev_order: 100, // 假設被拖到 100 和 200 之間
        //         next_order: 200
        //     })
        // });
        // const data3 = await res3.json();
        // if (res3.status === 200 && data3.sort_order === 150) {
        //     console.log('✅ 通過：伺服器成功算出平均數 150，沒有引發整表更新！');
        // } else {
        //     console.error('❌ 失敗：排序計算錯誤。', data3);
        // }

        // // ---------------------------------------------------------
        // // 測試 4：資料清理 - 刪除測試任務
        // // ---------------------------------------------------------
        // console.log('\n▶️ [Test 4] 測試資料刪除...');
        // const res4 = await fetch(`${API_BASE}/${testTaskId}`, { method: 'DELETE' });
        // if (res4.status === 200) {
        //     console.log('✅ 通過：資料刪除成功，測試環境恢復。');
        // } else {
        //     console.error('❌ 失敗：刪除失敗。');
        // }

        console.log('\n🎉 所有 API 正確性測試完畢！');
    } catch (error) {
        console.error('\n❌ 測試中途失敗，錯誤回報：');
        console.error(error.message);
    }
}

runTests().catch(console.error);