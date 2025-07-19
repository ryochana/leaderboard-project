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
const mainContent = document.getElementById('main-content'); // แก้จาก mainScreen
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

async function init() {
    currentGrade = getGradeFromHostname();
    classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;

    // Load public data for everyone
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
    
    // Check for a logged-in user from previous session
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        const userData = JSON.parse(storedSession);
        if (userData.role === 'admin' || userData.grade === currentGrade) {
            currentUser = userData;
        } else {
            localStorage.removeItem('app_user_session');
        }
    }
    
    updateHeaderUI();
    setupEventListeners();
}

function getGradeFromHostname() {
    const hostname = window.location.hostname;
    if (hostname.includes('m1')) return 1;
    if (hostname.includes('m2')) return 2;
    if (hostname.includes('m3')) return 3;
    return 2;
}

// ================================================================
// AUTHENTICATION
// ================================================================

async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username);

    if (error || !users || users.length === 0) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    const user = users[0];

    if (user.password !== password) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    if (user.role === 'student' && user.grade !== currentGrade) {
        loginError.textContent = `คุณเป็นนักเรียน ม.${user.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง`;
        return;
    }

    currentUser = user;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    
    hideLoginScreen();
    updateHeaderUI();
}

function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateHeaderUI();
}

// ================================================================
// UI & DISPLAY LOGIC
// ================================================================

function updateHeaderUI() {
    if (currentUser) {
        userProfile.innerHTML = `
            <span>สวัสดี, ${currentUser.full_name}</span>
            ${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        userProfile.style.display = 'block';
        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;
    } else {
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginScreen;
    }
}

function showLoginScreen() {
    loginError.textContent = ''; // Clear previous errors
    loginForm.reset(); // Clear form fields
    loginScreen.classList.add('active');
    appContainer.classList.add('blur-background');
}

function hideLoginScreen() {
    loginScreen.classList.remove('active');
    appContainer.classList.remove('blur-background');
}

/**
 * Fetches and displays the leaderboard.
 */
async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';

    // *** จุดที่เปลี่ยนแปลง: เรียกใช้ RPC function แทนการ select ตรงๆ ***
    const { data, error } = await supabase
        .rpc('get_leaderboard_data', {
            p_grade_id: currentGrade
        });

    if (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูล Leaderboard ได้</p>`;
        return;
    }
    
    // ข้อมูลที่ได้กลับมาจะถูกเรียงลำดับและคำนวณมาเรียบร้อยแล้ว
    renderLeaderboard(data);
}

function renderLeaderboard(leaderboardData) {
    leaderboardContainer.innerHTML = '';
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    leaderboardData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item clickable'; // เพิ่ม class 'clickable'
        item.dataset.studentId = student.student_id; // เก็บ student_id ไว้ใน element

        const profileImageUrl = student.profile_picture_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        
        // *** จุดที่เปลี่ยนแปลง: เพิ่มส่วนของ Progress Bar ***
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <div class="student-info">
                <div class="student-name">${student.full_name}</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${student.progress}%;"></div>
                </div>
            </div>
            <div class="score">${student.total_score} คะแนน</div>
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
