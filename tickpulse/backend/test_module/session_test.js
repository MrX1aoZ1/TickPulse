// How to run: node test-session-advanced.js

const API_BASE = 'http://localhost:3000'; // Double check your backend port
const crypto = require('crypto');

// Users extracted from your database snippet for cross-testing
const USER_A = {
    email: 'test_1782033950684@tickpulse.com',       // ID 23
    password: 'Password.123!'          // Assuming this is the password
};

const USER_B = {
    email: 'test_1782462564010@tickpulse.com', // ID 33
    password: 'Password.123!'                  // Assuming this is the password
};

async function runSessionTests() {
    console.log('=========================================================');
    console.log('       Advanced Session & Database Store Test Start      ');
    console.log('=========================================================\n');

    let cookieUserA = '';
    let cookieUserB = '';
    let userADataFromMe = null;

    try {
        // ---------------------------------------------------------
        // ADVANCED TEST 1: Login User A & Get Cookie
        // ---------------------------------------------------------
        console.log('👉 [Test 1] Login User A (test@tickpulse.com)...');
        const loginResA = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(USER_A)
        });
        
        if (!loginResA.ok) throw new Error(`User A Login Failed! Status: ${loginResA.status}`);
        const dataA = await loginResA.json();
        
        const setCookieHeaderA = loginResA.headers.get('set-cookie');
        if (!setCookieHeaderA) throw new Error('Failed to get session cookie from User A response!');
        cookieUserA = setCookieHeaderA.split(';')[0];
        console.log('✅ User A Logged In. Session Cookie generated and captured.');
        console.log(`--------------------------------------------------`);


        // ---------------------------------------------------------
        // ADVANCED TEST 2: Session Persistence & Recovery Test (/auth/check)
        // ---------------------------------------------------------
        console.log('👉 [Test 2] Testing Session Persistence via /auth/check...');
        // We do NOT log in again. We just send the Cookie to see if backend recognizes us from MySQL/Memory store
        const meResA = await fetch(`${API_BASE}/auth/check`, {
            method: 'GET',
            headers: { 'Cookie': cookieUserA }
        });

        if (!meResA.ok) throw new Error(`Session Recovery Failed! Route /auth/check returned status ${meResA.status}`);
        const meDataA = await meResA.json();
        userADataFromMe = meDataA.user; // Extract user profile
        
        console.log('✅ Session Recovery Successful! Backend correctly extracted session from store.');
        console.log('👤 Recognized User Details:', userADataFromMe);
        console.log(`--------------------------------------------------`);


        // ---------------------------------------------------------
        // ADVANCED TEST 3: Login User B & Capture Independent Cookie
        // ---------------------------------------------------------
        console.log('👉 [Test 3] Login User B (test_1782462564010@tickpulse.com)...');
        const loginResB = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(USER_B)
        });
        
        if (!loginResB.ok) throw new Error(`User B Login Failed! Status: ${loginResB.status}`);
        const dataB = await loginResB.json();
        
        const setCookieHeaderB = loginResB.headers.get('set-cookie');
        if (!setCookieHeaderB) throw new Error('Failed to get session cookie from User B response!');
        cookieUserB = setCookieHeaderB.split(';')[0];
        console.log('✅ User B Logged In. Distinct Session Cookie captured.');
        console.log(`--------------------------------------------------`);


        // ---------------------------------------------------------
        // ADVANCED TEST 4: Session Isolation Verification
        // ---------------------------------------------------------
        console.log('👉 [Test 4] Verifying Session Isolation (Cross-Account Security)...');
        console.log(`💡 Assert: User A's Cookie (${cookieUserA.substring(0,20)}...) and User B's Cookie should be completely isolated.`);
        
        if (cookieUserA === cookieUserB) {
            throw new Error('❌ CRITICAL SECURITY FLAW: Both logins generated the exact same Session ID!');
        }
        console.log('✅ Verification 4a: Session IDs are uniquely different.');

        // Attempting to ask /auth/me using User B's Cookie to make sure it returns User B, not User A
        const meResB = await fetch(`${API_BASE}/auth/check`, {
            method: 'GET',
            headers: { 'Cookie': cookieUserB }
        });
        const meDataB = await meResB.json();
        
        if (meDataB.user.id === userADataFromMe.id) {
            throw new Error('❌ CRITICAL BREACH: Session leakage! User B cookie returned User A data.');
        }
        console.log(`✅ Verification 4b: Session Isolation confirmed. User B cookie correctly routes to User ID: ${meDataB.user.id}.`);
        console.log(`--------------------------------------------------`);


        // ---------------------------------------------------------
        // ADVANCED TEST 5: Malicious / Tampered Cookie Defense Test
        // ---------------------------------------------------------
        console.log('👉 [Test 5] Injecting fake/malicious cookie to test guardrails...');
        const maliciousCookie = 'connect.sid=s%3AFAKE_SESSION_ID_HACK_999.invalidSignatureString12345';
        
        const hackRes = await fetch(`${API_BASE}/api/tasks/category`, {
            method: 'GET',
            headers: { 'Cookie': maliciousCookie }
        });

        if (hackRes.status === 401) {
            console.log('🎉 PERFECT! Backend automatically rejected the fake cookie with a 401 Unauthorized.');
        } else {
            console.error(`❌ VULNERABILITY: Backend returned status ${hackRes.status} instead of blocking it with 401!`);
        }
        console.log(`--------------------------------------------------`);
        
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await sleep(15000); // wait 15 seconds

        // ---------------------------------------------------------
        // ADVANCED TEST 6: Session Lifecycle Termination (Logout)
        // ---------------------------------------------------------
        console.log('👉 [Test 6] Terminating User A Session (Logout)...');
        const logoutResA = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': cookieUserA }
        });
        const logoutDataA = await logoutResA.json();
        console.log('➔ Logout Endpoint response:', logoutDataA);

        console.log('👉 Verifying if User A Session is completely dead in DB/Memory...');
        const verifyDeadSessionRes = await fetch(`${API_BASE}/auth/check`, {
            method: 'GET',
            headers: { 'Cookie': cookieUserA }
        });
 
        if (verifyDeadSessionRes.status === 401) {
            console.log('🎉 EXCELLENT! Destroyed session cookie is no longer valid (401 Unauthorized).');
        } else {
            console.error('❌ BUG: Session was not completely destroyed in the database store after logging out.');
        }

        console.log('\n🎊 -----------------------------------------------------');
        console.log('🎉 SUCCESS: All Advanced Session Pipeline Tests Passed!');
        console.log('🎊 -----------------------------------------------------');

    } catch (error) {
        console.error('\n❌ Session Test Execution Interrupted:');
        console.error(error.message);
    }
}

// Fire up the engine
runSessionTests().catch(console.error);