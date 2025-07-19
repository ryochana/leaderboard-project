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
const studentDetailModal = document.getElementById('student-detail-modal');
const modalCloseButton = document.querySelector('.close-button');
const modalHeader = document.getElementById('modal-header');
const modalBody = document.getElementById('modal-body');
const missionModal = document.getElementById('mission-modal');
const missionModalHeader = document.getElementById('mission-modal-header');
const missionModalBody = document.getElementById('mission-modal-body');
const submissionStatus = document.getElementById('submission-status');
const submissionForm = document.getElementById('submission-form');
const submitMissionButton = document.getElementById('submit-mission-button');
const fileUploadStatus = document.getElementById('file-upload-status');

// ================================================================
// STATE MANAGEMENT
// ================================================================
let currentUser = null;
let currentGrade = 0;
let currentlyOpenMission = null;

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

function openMissionModal(mission, submission) {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อนส่งงาน");
        showLoginScreen();
        return;
    }
    
    currentlyOpenMission = mission; // Store the currently open mission
    missionModal.style.display = 'block';

    // 1. Render Header
    missionModalHeader.innerHTML = `
        <h3>${mission.topic}</h3>
        <p>${mission.detail || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
    `;

    // 2. Reset form
    submissionForm.reset();
    fileUploadStatus.textContent = '';
    submitMissionButton.disabled = false;
    submitMissionButton.textContent = 'ส่งงาน';

    // 3. Render Status and control form visibility
    if (submission) {
        if (submission.score !== null) {
            submissionStatus.className = 'status-graded';
            submissionStatus.innerHTML = `ตรวจแล้ว! คุณได้ <b>${submission.score}</b> คะแนน`;
            submissionForm.style.display = 'none'; // Hide form if graded
        } else {
            submissionStatus.className = 'status-pending';
            submissionStatus.innerHTML = `ส่งงานแล้ว - รอการตรวจ`;
            submissionForm.style.display = 'block'; // Allow re-submission
            submitMissionButton.textContent = 'ส่งงานอีกครั้ง';
        }
    } else {
        submissionStatus.innerHTML = '';
        submissionStatus.className = '';
        submissionForm.style.display = 'block';
    }
}

/**
 * Hides the mission modal.
 */
function hideMissionModal() {
    missionModal.style.display = 'none';
    currentlyOpenMission = null;
}

/**
 * Handles the submission form.
 */
async function handleMissionSubmit(event) {
    event.preventDefault();
    submitMissionButton.disabled = true;
    submitMissionButton.textContent = 'กำลังส่ง...';
    fileUploadStatus.textContent = '';
    
    const submissionLink = document.getElementById('submission-link').value;
    const fileInput = document.getElementById('submission-file');
    const file = fileInput.files[0];
    let proofUrl = '';

    try {
        // Step 1: Upload file if it exists
        if (file) {
            fileUploadStatus.textContent = `กำลังอัปโหลด: ${file.name}`;
            const filePath = `${currentUser.grade}/${currentUser.student_id}/${currentlyOpenMission.id}-${file.name}`;
            
            const { error: uploadError } = await supabase.storage
                .from('submissions') // The name of your storage bucket
                .upload(filePath, file, { upsert: true }); // upsert: true allows overwriting

            if (uploadError) throw uploadError;

            // Get public URL of the uploaded file
            const { data } = supabase.storage
                .from('submissions')
                .getPublicUrl(filePath);
            
            proofUrl = data.publicUrl;
            fileUploadStatus.textContent = 'อัปโหลดไฟล์สำเร็จ!';
        }

        // Step 2: Upsert submission record in the database
        const { error: dbError } = await supabase
            .from('submissions')
            .upsert({
                student_id: currentUser.student_id,
                mission_id: currentlyOpenMission.id,
                submission_date: new Date().toISOString(),
                proof_url: proofUrl || submissionLink || '' // Use file URL first, then link
            }, {
                onConflict: 'student_id, mission_id'
            });

        if (dbError) throw dbError;

        // Step 3: Success!
        alert('ส่งงานสำเร็จ!');
        hideMissionModal();
        // Refresh missions to show updated status
        fetchAndDisplayMissions();

    } catch (error) {
        console.error('Submission Error:', error);
        alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`);
        submitMissionButton.disabled = false;
        submitMissionButton.textContent = 'ลองอีกครั้ง';
    }
}
 
async function showStudentDetailModal(studentId) {
    studentDetailModal.style.display = 'block';
    modalHeader.innerHTML = '<div class="loader"></div>';
    modalBody.innerHTML = '';

    // 1. Fetch all missions for the current grade
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });
    
    if (missionsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลภารกิจได้</p>';
        return;
    }

    // 2. Fetch all submissions for this specific student
    const { data: studentSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select('mission_id, score')
        .eq('student_id', studentId);
    
    if (subsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลการส่งงานได้</p>';
        return;
    }
    
    // 3. Find the student's main info from the leaderboard data we already have (or fetch again)
    const { data: studentInfo, error: userError } = await supabase
        .from('users')
        .select('full_name, profile_picture_url')
        .eq('student_id', studentId)
        .single();
    
    if (userError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่พบข้อมูลนักเรียน</p>';
        return;
    }

    // Create a map for easy lookup of submissions
    const submissionMap = new Map(studentSubmissions.map(s => [s.mission_id, s]));
    let totalScore = 0;
    studentSubmissions.forEach(s => totalScore += s.score || 0);

    // 4. Render the modal header
    const profileImageUrl = studentInfo.profile_picture_url || `https://robohash.org/${studentId}.png?set=set4&size=80x80`;
    modalHeader.innerHTML = `
        <img src="${profileImageUrl}" alt="Profile">
        <div class="student-summary">
            <h3>${studentInfo.full_name}</h3>
            <p>คะแนนรวม: ${totalScore} | ส่งงานแล้ว: ${studentSubmissions.length} / ${allMissions.length} ชิ้น</p>
        </div>
    `;
    
    // 5. Render the modal body (task list)
    allMissions.forEach(mission => {
        const submission = submissionMap.get(mission.id);
        let status, statusClass, scoreText;

        if (submission) {
            if (submission.score !== null && submission.score !== undefined) {
                status = 'ตรวจแล้ว';
                statusClass = 'status-graded';
                scoreText = `<b>${submission.score}</b> / ${mission.max_points}`;
            } else {
                status = 'รอตรวจ';
                statusClass = 'status-pending';
                scoreText = `- / ${mission.max_points}`;
            }
        } else {
            status = 'ยังไม่ส่ง';
            statusClass = 'status-not-submitted';
            scoreText = `- / ${mission.max_points}`;
        }

        const taskItem = document.createElement('div');
        taskItem.className = 'task-list-item';
        taskItem.innerHTML = `
            <span class="task-name">${mission.topic}</span>
            <span class="task-status ${statusClass}">${status}</span>
            <span>${scoreText}</span>
        `;
        modalBody.appendChild(taskItem);
    });
}

/**
 * Hides the student detail modal.
 */
function hideStudentDetailModal() {
    studentDetailModal.style.display = 'none';
}

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
    
    // 1. Fetch all missions for the current grade
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: true }); // เรียงจากเก่าไปใหม่ เพื่อให้แสดงผลถูกต้อง

    if (missionsError) {
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
        return;
    }

    // 2. If a user is logged in, fetch their submissions to determine status
    let submissionMap = new Map();
    if (currentUser) {
        const { data: userSubmissions, error: subsError } = await supabase
            .from('submissions')
            .select('mission_id, score')
            .eq('student_id', currentUser.student_id);
        
        if (subsError) {
            console.error("Could not fetch user submissions, statuses may be incorrect.");
        } else {
            submissionMap = new Map(userSubmissions.map(s => [s.mission_id, s]));
        }
    }
    
    renderMissions(allMissions, submissionMap);
}

function renderMissions(missions, submissionMap) {
    missionsContainer.innerHTML = '';
    if (missions.length === 0) {
        missionsContainer.innerHTML = '<p>ยังไม่มีภารกิจ</p>';
        return;
    }

    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);

    missions.forEach(mission => {
        // *** จุดแก้ไข: ย้ายการประกาศ dueDate เข้ามาใน loop ***
        const missionDueDate = new Date(mission.due_date); // ใช้ชื่อตัวแปรใหม่เพื่อไม่ให้ซ้ำกับ dueDate ใน console.log
        let statusClass = 'status-not-submitted'; // Default status

        // Determine status if a user is logged in
        if (currentUser) {
            const submission = submissionMap.get(mission.id);
            if (submission) {
                statusClass = submission.score !== null ? 'status-graded' : 'status-pending';
            } else {
                // Not submitted yet, check for urgency or if it's overdue
                if (now > missionDueDate) { // ใช้ missionDueDate
                    statusClass = 'status-overdue';
                } else if (missionDueDate <= twoDaysFromNow) { // ใช้ missionDueDate
                    statusClass = 'status-urgent';
                }
            }
        } else {
            // Public view, only check for overdue
             if (now > missionDueDate) { // ใช้ missionDueDate
                statusClass = 'status-overdue';
            }
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'mission-node-wrapper';

        const node = document.createElement('div');
        node.className = `mission-node ${statusClass}`;
        
        node.innerHTML = `
            <div class="mission-node-topic">${mission.topic}</div>
            <div class="mission-node-points">${mission.max_points} pts</div>
        `;
        
        node.onclick = () => openMissionModal(mission, submission);

        wrapper.appendChild(node);
        missionsContainer.appendChild(wrapper);
    });
}

// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    loginScreen.addEventListener('click', (event) => {
        if (event.target === loginScreen) {
            hideLoginScreen();
        }
    });

    // *** ADD THIS PART ***
    modalCloseButton.addEventListener('click', hideStudentDetailModal);
    window.addEventListener('click', (event) => {
        if (event.target === studentDetailModal) {
            hideStudentDetailModal();
        }
    });
    
    leaderboardContainer.addEventListener('click', (event) => {
        // Find the closest parent with the class 'leaderboard-item'
        const leaderboardItem = event.target.closest('.leaderboard-item');
        if (leaderboardItem) {
            const studentId = leaderboardItem.dataset.studentId;
            if (studentId) {
                showStudentDetailModal(studentId);
            }
        }
    });

    const missionModalCloseButton = missionModal.querySelector('.close-button');
    missionModalCloseButton.addEventListener('click', hideMissionModal);
    missionModal.addEventListener('click', (event) => {
        if (event.target === missionModal) {
            hideMissionModal();
        }
    });
    submissionForm.addEventListener('submit', handleMissionSubmit);
}

// ================================================================
// APP START
// ================================================================
init();
