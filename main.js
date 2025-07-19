// ================================================================
// CONFIGURATION
// ================================================================
const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE';

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
const appContainer = document.getElementById('app-container');

// ================================================================
// STATE MANAGEMENT
// ================================================================
let currentUser = null;
let currentGrade = 0;

// ================================================================
// INITIALIZATION & ROUTING
// ================================================================

/**
 * Main initialization function. Runs on page load.
 */
async function init() {
    currentGrade = getGradeFromHostname();
    classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;

    // Load public data immediately
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
    
    // Check for a logged-in user and update the UI accordingly
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        const userData = JSON.parse(storedSession);
        // If user is admin, they can be on any page.
        // If user is student, check if they are on the correct grade's website.
        if (userData.role === 'admin' || userData.grade === currentGrade) {
            currentUser = userData;
        } else {
            // Student is on the wrong page, clear their session
            localStorage.removeItem('app_user_session');
        }
    }
    
    updateHeaderUI();
    setupEventListeners();
}

/**
 * Determines the current grade based on the URL hostname.
 */
function getGradeFromHostname() {
    const hostname = window.location.hostname;
    if (hostname.includes('m1')) return 1;
    if (hostname.includes('m2')) return 2;
    if (hostname.includes('m3')) return 3;
    return 2; // Default to M.2 if no match
}

// ================================================================
// AUTHENTICATION
// ================================================================

/**
 * Handles the login form submission.
 */
async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Find the user by username, without filtering by grade yet.
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username);

    if (error || !users || users.length === 0) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    const user = users[0];

    // Check password
    if (user.password !== password) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    // Check role and grade
    if (user.role === 'student' && user.grade !== currentGrade) {
        loginError.textContent = `คุณเป็นนักเรียน ม.${user.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง`;
        return;
    }

    // Login success!
    currentUser = user;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    
    // Hide the login screen and update the header
    loginScreen.classList.remove('active');
    appContainer.classList.remove('blur-background');
    updateHeaderUI();
}

/**
 * Handles logout.
 */
function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateHeaderUI();
}

// ================================================================
// UI & DISPLAY LOGIC
// ================================================================

/**
 * Updates the header based on whether a user is logged in.
 */
function updateHeaderUI() {
    if (currentUser) {
        // Logged in state
        userProfile.innerHTML = `
            <span>สวัสดี, ${currentUser.full_name}</span>
            ${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        userProfile.style.display = 'block';
        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;
    } else {
        // Logged out state
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginScreen;
    }
}

/**
 * Shows the login modal.
 */
function showLoginScreen() {
    loginScreen.classList.add('active');
    appContainer.classList.add('blur-background');
}

/**
 * Fetches and displays the leaderboard.
 */
async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';
    
    // For now, we will use the same client-side calculation.
    // In the next phase, we will switch to a faster RPC function.
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('student_id, full_name, profile_picture_url')
        .eq('grade', currentGrade)
        .eq('role', 'student');
    if (userError) return leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูลนักเรียนได้</p>`;
    
    const studentIds = users.map(u => u.student_id);
    if (studentIds.length === 0) return leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูลนักเรียนในชั้นเรียนนี้</p>';

    const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('student_id, score')
        .in('student_id', studentIds);
    if (subError) return leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูลการส่งงานได้</p>`;

    const studentScores = {};
    for (const sub of submissions) {
        studentScores[sub.student_id] = (studentScores[sub.student_id] || 0) + (sub.score || 0);
    }

    const leaderboardData = users
        .map(user => ({ ...user, totalScore: studentScores[user.student_id] || 0 }))
        .sort((a, b) => b.totalScore - a.totalScore);

    renderLeaderboard(leaderboardData);
}

function renderLeaderboard(leaderboardData) {
    leaderboardContainer.innerHTML = '';
    if (leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    leaderboardData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        const profileImageUrl = student.profile_picture_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <div class="student-info">
                <div class="student-name">${student.full_name}</div>
            </div>
            <div class="score">${student.totalScore} คะแนน</div>
        `;
        leaderboardContainer.appendChild(item);
    });
}

/**
 * Fetches and displays all missions.
 */
async function fetchAndDisplayMissions() {
    missionsContainer.innerHTML = '<div class="loader"></div>';
    const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });
    if (error) return missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
    renderMissions(data);
}

function renderMissions(missions) {
    missionsContainer.innerHTML = '';
    if (missions.length === 0) {
        missionsContainer.innerHTML = '<p>ยังไม่มีภารกิจ</p>';
        return;
    }
    missions.forEach(mission => {
        const item = document.createElement('div');
        item.className = 'mission-item';
        const dueDate = new Date(mission.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        item.innerHTML = `
            <div class="mission-info">
                <div class="mission-topic">${mission.topic}</div>
                <div class="mission-details">
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
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    // Add event listener to close login screen if user clicks outside the card
    loginScreen.addEventListener('click', (event) => {
        if (event.target === loginScreen) {
            loginScreen.classList.remove('active');
            appContainer.classList.remove('blur-background');
        }
    });
}

// ================================================================
// APP START
// ================================================================
init();
