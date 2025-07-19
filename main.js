// ================================================================
// CONFIGURATION
// ================================================================
const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE'; // *** ใส่ anon key ของคุณที่นี่ ***

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================================
// DOM ELEMENTS
// ================================================================
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const classTitle = document.getElementById('class-title');
const leaderboardContainer = document.getElementById('leaderboard-container');
const missionsContainer = document.getElementById('missions-container');
const userProfile = document.getElementById('user-profile');
const logoutButton = document.getElementById('logout-button');
const appContainer = document.getElementById('app-container');

// Student Detail Modal elements
const studentDetailModal = document.getElementById('student-detail-modal');
const modalCloseButton = document.querySelector('#student-detail-modal .close-button');
const modalHeader = document.getElementById('modal-header');
const modalBody = document.getElementById('modal-body');
// For Admin grading/deleting in student detail modal
// (No direct DOM element for this div, it's created and appended in JS)

// Mission Modal elements
const missionModal = document.getElementById('mission-modal');
const missionModalHeader = document.getElementById('mission-modal-header');
const missionModalBody = document.getElementById('mission-modal-body');
const submissionStatus = document.getElementById('submission-status');
const submissionForm = document.getElementById('submission-form');
const submitMissionButton = document.getElementById('submit-mission-button');
const fileUploadStatus = document.getElementById('file-upload-status');

// Admin Panel elements
const adminPanelButton = document.getElementById('admin-panel-button');
const adminModal = document.getElementById('admin-modal');
const adminModalCloseButton = adminModal ? adminModal.querySelector('.close-button') : null;
const addMissionForm = document.getElementById('add-mission-form');
const gradeSubmissionForm = document.getElementById('grade-submission-form');
const adminMissionList = document.getElementById('admin-mission-list'); 
const adminStudentList = document.getElementById('admin-student-list'); 


// ================================================================
// STATE MANAGEMENT
// ================================================================
let currentUser = null;
let currentGrade = 0;
let currentlyOpenMission = null;


// ================================================================
// HELPER FUNCTIONS (จัดเรียงใหม่เพื่อแก้ ReferenceError)
// ================================================================

/**
 * Determines the current grade based on the URL hostname.
 */
function getGradeFromHostname() {
    const hostname = window.location.hostname;
    if (hostname.includes('m1')) return 1;
    if (hostname.includes('m2')) return 2;
    if (hostname.includes('m3')) return 3;
    console.warn("Could not determine grade from hostname, defaulting to 2.");
    return 2; 
}

/**
 * Shows the login modal.
 */
function showLoginScreen() {
    loginError.textContent = '';
    loginForm.reset();
    document.getElementById('username').focus(); // Focus on username field
    loginScreen.classList.add('active');
    appContainer.classList.add('blur-background');
}

/**
 * Hides the login modal.
 */
function hideLoginScreen() {
    loginScreen.classList.remove('active');
    appContainer.classList.remove('blur-background');
}

/**
 * Updates UI to show main content and hides login screen.
 */
function showMainScreen() {
    loginScreen.classList.remove('active'); // Hide login modal
    appContainer.classList.remove('blur-background'); // Remove blur
    // mainContent is visible by default now.
}


/**
 * Renders the leaderboard data into HTML.
 */
function renderLeaderboard(leaderboardData) {
    leaderboardContainer.innerHTML = '';
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    leaderboardData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item clickable';
        item.dataset.studentId = student.student_id;

        const profileImageUrl = student.profile_picture_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        
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
 * Renders the mission data into HTML (Duolingo style nodes).
 */
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
        const missionDueDate = new Date(mission.due_date);
        let statusClass = 'status-not-submitted';
        let submission = null; 

        if (currentUser) {
            submission = submissionMap.get(mission.id);
            if (submission) {
                statusClass = submission.score !== null ? 'status-graded' : 'status-pending';
            } else {
                if (now > missionDueDate) {
                    statusClass = 'status-overdue';
                } else if (missionDueDate <= twoDaysFromNow) {
                    statusClass = 'status-urgent';
                }
            }
        } else {
            if (now > missionDueDate) {
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

/**
 * Opens the modal for a specific mission.
 */
function openMissionModal(mission, submission) {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อนส่งงาน");
        showLoginScreen();
        return;
    }
    currentlyOpenMission = mission;
    missionModal.style.display = 'block';

    missionModalHeader.innerHTML = `
        <h3>${mission.topic}</h3>
        <p>${mission.detail || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
    `;

    submissionForm.reset();
    fileUploadStatus.textContent = '';
    submitMissionButton.disabled = false;
    submitMissionButton.textContent = 'ส่งงาน';

    if (submission) {
        if (submission.score !== null) {
            submissionStatus.className = 'status-graded';
            submissionStatus.innerHTML = `ตรวจแล้ว! คุณได้ <b>${submission.score}</b> คะแนน`;
            submissionForm.style.display = 'none';
        } else {
            submissionStatus.className = 'status-pending';
            submissionStatus.innerHTML = `ส่งงานแล้ว - รอการตรวจ`;
            submissionForm.style.display = 'block';
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
 * Handles grading/updating a submission via RPC (from Student Detail Modal or Admin Panel).
 */
async function handleAdminGradeSubmission(studentId, missionId, score) { // Removed submissionId from here
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.student_id) {
        alert('คุณไม่มีสิทธิ์ดำเนินการนี้');
        return;
    }

    try {
        // RPC function takes student_id, mission_id, score, admin_student_id
        const { data, error } = await supabase.rpc('grade_submission', {
            p_student_id: parseInt(studentId, 10),
            p_mission_id: parseInt(missionId, 10),
            p_score: score,
            p_admin_student_id: currentUser.student_id
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) {
            alert('บันทึกคะแนนสำเร็จ!');
            fetchAndDisplayLeaderboard(); // Refresh data
            fetchAndDisplayMissions();
            // Re-fetch student details if modal is open and we graded from there
            if (studentDetailModal.style.display === 'block') {
                 // Re-open with updated data
                 await fetchStudentDetailsForModal(studentId); // Make sure this refreshes
            }
            // If grading from admin panel main form, reset it
            if (gradeSubmissionForm.contains(document.activeElement)) { // Check if focus is still on the form
                gradeSubmissionForm.reset();
            }
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error grading submission:', error);
        alert(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
    }
}

/**
 * Handles deleting a submission via RPC.
 */
async function handleAdminDeleteSubmission(submissionId, studentIdForModal) { // Add studentIdForModal
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.student_id) {
        alert('คุณไม่มีสิทธิ์ดำเนินการนี้');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('delete_submission', {
            p_submission_id: parseInt(submissionId, 10),
            p_admin_student_id: currentUser.student_id
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) {
            alert('ลบการส่งงานสำเร็จ!');
            fetchAndDisplayLeaderboard(); // Refresh data
            fetchAndDisplayMissions();
            // Re-fetch student details if modal is open
            if (studentDetailModal.style.display === 'block' && studentIdForModal) {
                 await fetchStudentDetailsForModal(studentIdForModal);
            }
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error deleting submission:', error);
        alert(`เกิดข้อผิดพลาดในการลบการส่งงาน: ${error.message}`);
    }
}


// ================================================================
// AUTHENTICATION FUNCTIONS (ย้ายขึ้นมาไว้ข้างบนเพื่อให้เรียกใช้ได้)
// ================================================================

/**
 * Handles the login form submission.
 */
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
    
    showMainScreen(); // Show main content after login
    updateHeaderUI();
}

/**
 * Handles logout.
 */
function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateHeaderUI();
    // No need to explicitly show login screen if main screen always visible.
    // Just reset header and public view will remain.
}


// ================================================================
// CORE DATA FETCHING & LOGIC FUNCTIONS
// ================================================================

/**
 * Fetches and displays the leaderboard.
 */
async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';
    
    const { data, error } = await supabase
        .rpc('get_leaderboard_data', {
            p_grade_id: currentGrade
        });

    if (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูล Leaderboard ได้</p>`;
        return;
    }
    
    renderLeaderboard(data);
}

/**
 * Fetches and displays all missions.
 */
async function fetchAndDisplayMissions() {
    missionsContainer.innerHTML = '<div class="loader"></div>';
    
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: true });

    if (missionsError) {
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
        return;
    }

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

/**
 * Fetches and renders student details for the modal.
 */
async function fetchStudentDetailsForModal(studentId) {
    // 1. Fetch all missions for the current grade
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('id, topic, detail, max_points')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });
    
    if (missionsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลภารกิจได้</p>';
        return;
    }

    // 2. Fetch all submissions for this specific student
    const { data: studentSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select('id, mission_id, score, proof_url') // Get submission ID too
        .eq('student_id', studentId);
    
    if (subsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลการส่งงานได้</p>';
        return;
    }
    
    // 3. Find the student's main info from the users table
    const { data: studentInfo, error: userError } = await supabase
        .from('users')
        .select('full_name, profile_picture_url')
        .eq('student_id', studentId)
        .single();
    
    if (userError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่พบข้อมูลนักเรียน</p>';
        return;
    }

    const submissionMap = new Map(studentSubmissions.map(s => [s.mission_id, s]));
    let totalScore = 0;
    studentSubmissions.forEach(s => totalScore += s.score || 0);

    const profileImageUrl = studentInfo.profile_picture_url || `https://robohash.org/${studentId}.png?set=set4&size=80x80`;
    modalHeader.innerHTML = `
        <img src="${profileImageUrl}" alt="Profile">
        <div class="student-summary">
            <h3>${studentInfo.full_name} (${studentId})</h3>
            <p>คะแนนรวม: ${totalScore} | ส่งงานแล้ว: ${studentSubmissions.length} / ${allMissions.length} ชิ้น</p>
        </div>
    `;
    
    modalBody.innerHTML = '';
    allMissions.forEach(mission => {
        const submission = submissionMap.get(mission.id);
        let status, statusClass, scoreText, proofLink = '';
        let adminActionsHtml = ''; // For admin buttons

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
            if (submission.proof_url) {
                proofLink = `<a href="${submission.proof_url}" target="_blank" style="margin-left: 10px; color:#007bff;">ดูงาน</a>`;
            }
            // Admin actions for submitted tasks
            if (currentUser && currentUser.role === 'admin') {
                adminActionsHtml = `
                    <input type="number" class="admin-score-input" value="${submission.score || ''}" placeholder="คะแนน">
                    <button class="admin-grade-btn" data-submission-id="${submission.id}" data-student-id="${studentId}" data-mission-id="${mission.id}">บันทึก</button>
                    <button class="admin-delete-btn" data-submission-id="${submission.id}" data-student-id="${studentId}">ลบ</button>
                `;
            }

        } else {
            status = 'ยังไม่ส่ง';
            statusClass = 'status-not-submitted';
            scoreText = `- / ${mission.max_points}`;
            // Admin actions for unsubmitted tasks (can't grade/delete, but can add score if needed)
            if (currentUser && currentUser.role === 'admin') {
                 adminActionsHtml = `
                    <input type="number" class="admin-score-input" value="" placeholder="คะแนน">
                    <button class="admin-grade-btn" data-submission-id="new" data-student-id="${studentId}" data-mission-id="${mission.id}">บันทึก</button>
                `;
            }
        }

        const taskItem = document.createElement('div');
        taskItem.className = 'task-list-item';
        taskItem.innerHTML = `
            <span class="task-name">${mission.topic}</span>
            <span class="task-status ${statusClass}">${status}</span>
            <span>${scoreText} ${proofLink}</span>
            <div class="admin-actions">${adminActionsHtml}</div>
        `;
        modalBody.appendChild(taskItem);
    });

    // Add event listeners for admin buttons within the modal
    if (currentUser && currentUser.role === 'admin') {
        // Since buttons are created dynamically, add event listeners after rendering
        const gradeButtons = modalBody.querySelectorAll('.admin-grade-btn');
        gradeButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                // Determine if it's a new submission or updating existing
                const submissionId = event.target.dataset.submissionId; // 'new' or actual ID
                const scoreInput = event.target.previousElementSibling; // The input field
                const score = parseInt(scoreInput.value, 10);
                
                // Get studentId and missionId from dataset
                const studentIdForSubmission = event.target.dataset.studentId;
                const missionIdForSubmission = event.target.dataset.missionId;
                
                if (isNaN(score)) { alert('กรุณาใส่คะแนนเป็นตัวเลข'); return; }
                await handleAdminGradeSubmission(studentIdForSubmission, missionIdForSubmission, score, submissionId);
            });
        });

        const deleteButtons = modalBody.querySelectorAll('.admin-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const submissionId = event.target.dataset.submissionId;
                const studentIdForDeletion = event.target.dataset.studentId; // Get studentId for re-opening modal
                if (confirm('คุณต้องการลบการส่งงานนี้ใช่หรือไม่?')) {
                    await handleAdminDeleteSubmission(submissionId, studentIdForDeletion);
                }
            });
        });
    }
}


// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    // Close login modal when clicking outside
    loginScreen.addEventListener('click', (event) => {
        if (event.target === loginScreen) {
            hideLoginScreen();
        }
    });

    // Student detail modal
    modalCloseButton.addEventListener('click', hideStudentDetailModal);
    studentDetailModal.addEventListener('click', (event) => {
        if (event.target === studentDetailModal) {
            hideStudentDetailModal();
        }
    });
    // Click on leaderboard item to show student detail
    leaderboardContainer.addEventListener('click', (event) => {
        const leaderboardItem = event.target.closest('.leaderboard-item');
        if (leaderboardItem) {
            const studentId = leaderboardItem.dataset.studentId;
            if (studentId) {
                fetchStudentDetailsForModal(studentId); // Use direct fetch call
            }
        }
    });

    // Mission submission modal
    const missionModalCloseButton = missionModal.querySelector('.close-button');
    missionModalCloseButton.addEventListener('click', hideMissionModal);
    missionModal.addEventListener('click', (event) => {
        if (event.target === missionModal) {
            hideMissionModal();
        }
    });
    submissionForm.addEventListener('submit', handleMissionSubmit);

    // Admin Panel
    if (adminPanelButton) {
        adminPanelButton.addEventListener('click', showAdminModal);
    }
    if (adminModalCloseButton) {
        adminModalCloseButton.addEventListener('click', hideAdminModal);
    }
    if (adminModal) {
        adminModal.addEventListener('click', (event) => {
            if (event.target === adminModal) {
                hideAdminModal();
            }
        });
    }
    if (addMissionForm) {
        addMissionForm.addEventListener('submit', handleAddMission);
    }
    if (gradeSubmissionForm) {
        gradeSubmissionForm.addEventListener('submit', handleGradeSubmission);
    }
}


// ================================================================
// APP START
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
    
    // Check for a logged-in user from previous session
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        const userData = JSON.parse(storedSession);
        if (userData.role === 'admin' || userData.grade === currentGrade) {
            currentUser = userData;
            // *** แก้ไข: เรียก showMainScreen() และ updateHeaderUI() ที่นี่เมื่อล็อกอินสำเร็จใน init() ***
            showMainScreen(); 
            updateHeaderUI();
        } else {
            localStorage.removeItem('app_user_session');
            // User is on wrong page, will remain on public view
            updateHeaderUI(); // Update header to show login button
        }
    } else {
        // No stored session, just remain on public view, header will show login button
        updateHeaderUI();
    }
    
    setupEventListeners(); // Setup event listeners regardless of login status
}

init(); // Call init to start the application
