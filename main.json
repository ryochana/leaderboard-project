// ================================================================
// CONFIGURATION
// ================================================================

// *** แก้ไข 2 บรรทัดนี้ด้วยข้อมูลของคุณ ***
const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE'; // เอา anon key มาใส่แทนที่นี่

// สร้าง Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================================
// DOM ELEMENTS
// ================================================================

const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const classTitle = document.getElementById('class-title');
const leaderboardContainer = document.getElementById('leaderboard-container');
const missionsContainer = document.getElementById('missions-container');
const userProfile = document.getElementById('user-profile');
const logoutButton = document.getElementById('logout-button');

// ================================================================
// STATE MANAGEMENT & CORE LOGIC
// ================================================================

let currentUser = null;
let currentGrade = 0;

/**
 * определяет текущий класс на основе URL-адреса
 * This function determines the current grade based on the URL.
 * It's a simple way to manage M1, M2, M3 from the same codebase.
 * You can set up your Netlify sites like:
 * - eng-m1.netlify.app
 * - eng-m2.netlify.app
 * - eng-m3.netlify.app
 * This code will automatically detect the grade.
 */
function getGradeFromHostname() {
    const hostname = window.location.hostname;
    if (hostname.includes('m1') || hostname.includes('eng-m1')) return 1;
    if (hostname.includes('m2') || hostname.includes('eng-m2')) return 2;
    if (hostname.includes('m3') || hostname.includes('eng-m3')) return 3;
    return 2; // Default to M.2 if no match
}

/**
 * Initializes the application
 */
async function init() {
    currentGrade = getGradeFromHostname();
    classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;
    
    // Check if user is already logged in (from a previous session)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // If there's a session, fetch full user details from our 'users' table
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('student_id', session.user.user_metadata.student_id)
            .single();

        if (data) {
            currentUser = data;
            showMainScreen();
        } else {
            // Session exists but user not in our table, or error
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

/**
 * Handles the login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // We need a custom function to handle login because Supabase Auth doesn't know about our 'username' and 'grade'.
    // We will create a Supabase Edge Function for this. FOR NOW, we'll do it less securely on the client to get started.
    // THIS IS NOT RECOMMENDED FOR PRODUCTION.
    
    // 1. Find the user in our 'users' table
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('student_id, password, role') // Select only what's needed for login
        .eq('username', username)
        .eq('grade', currentGrade)
        .single();
    
    if (userError || !user) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }
    
    // 2. In a real app, you would hash passwords. Here we are comparing plain text (as in the sheet).
    // This is very insecure but matches the old system.
    if (user.password !== password) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }
    
    // 3. Since we can't use Supabase's built-in login directly with username/password from our table,
    // we will simulate a "session" by storing user data in localStorage.
    // A better way is to use a custom Edge Function to log the user in properly.
    currentUser = user; // We need more user data, let's fetch it all
    const { data: fullUser } = await supabase.from('users').select('*').eq('student_id', user.student_id).single();
    currentUser = fullUser;
    
    // Store session info in localStorage
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    
    showMainScreen();
}

/**
 * Handles logout
 */
function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    showLoginScreen();
}

// Check for stored session on page load
function checkStoredSession() {
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        currentUser = JSON.parse(storedSession);
        // Make sure the stored user is for the correct grade
        if (currentUser.grade === getGradeFromHostname()) {
            showMainScreen();
        } else {
            // Log out if they are on the wrong grade's site
            handleLogout();
        }
    } else {
        showLoginScreen();
    }
}


// ================================================================
// UI & DISPLAY LOGIC
// ================================================================

function showLoginScreen() {
    mainScreen.classList.remove('active');
    loginScreen.classList.add('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    // Update UI with user info
    userProfile.textContent = `สวัสดี, ${currentUser.full_name}`;
    
    // Fetch and display data
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
}

async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';

    // 1. Get all students for the current grade
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('student_id, full_name, profile_picture_url')
        .eq('grade', currentGrade)
        .eq('role', 'student');

    if (userError) {
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูลนักเรียนได้</p>`;
        return;
    }
    
    // 2. Get all submissions for those students
    const studentIds = users.map(u => u.student_id);
    const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('student_id, score')
        .in('student_id', studentIds);

    if (subError) {
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูลการส่งงานได้</p>`;
        return;
    }
    
    // 3. Calculate scores in JavaScript
    const studentScores = {};
    for (const sub of submissions) {
        if (!studentScores[sub.student_id]) {
            studentScores[sub.student_id] = 0;
        }
        studentScores[sub.student_id] += sub.score || 0;
    }
    
    // 4. Combine data and sort
    const leaderboardData = users.map(user => ({
        ...user,
        totalScore: studentScores[user.student_id] || 0
    })).sort((a, b) => b.totalScore - a.totalScore);

    // 5. Render to HTML
    renderLeaderboard(leaderboardData);
}

function renderLeaderboard(leaderboardData) {
    if (leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    
    leaderboardContainer.innerHTML = ''; // Clear loader
    leaderboardData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <img src="${student.profile_picture_url || 'https://via.placeholder.com/40'}" alt="Profile" class="profile-pic">
            <div class="student-info">
                <div class="student-name">${student.full_name}</div>
            </div>
            <div class="score">${student.totalScore} คะแนน</div>
        `;
        leaderboardContainer.appendChild(item);
    });
}


async function fetchAndDisplayMissions() {
    missionsContainer.innerHTML = '<div class="loader"></div>';
    
    const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });

    if (error) {
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
        return;
    }
    
    renderMissions(data);
}

function renderMissions(missions) {
    if (missions.length === 0) {
        missionsContainer.innerHTML = '<p>ยังไม่มีภารกิจ</p>';
        return;
    }
    
    missionsContainer.innerHTML = ''; // Clear loader
    missions.forEach(mission => {
        const item = document.createElement('div');
        item.className = 'mission-item';
        const dueDate = new Date(mission.due_date).toLocaleDateString('th-TH');
        
        item.innerHTML = `
            <div class="mission-info" style="flex-grow:1;">
                <div class="mission-topic" style="font-weight:bold;">${mission.topic}</div>
                <div class="mission-details" style="font-size:0.9em; color:#666;">
                    ส่งภายในวันที่: ${dueDate} | คะแนนเต็ม: ${mission.max_points}
                </div>
            </div>
        `;
        missionsContainer.appendChild(item);
    });
}


// ================================================================
// EVENT LISTENERS
// ================================================================

loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);

// Start the app
// init(); // Using localStorage based session for now
checkStoredSession();
