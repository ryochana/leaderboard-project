// ================================================================
// CONFIGURATION
// ================================================================
const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImexCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE'; // *** ใส่ anon key ของคุณที่นี่ ***

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

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const profileModalCloseButton = profileModal ? profileModal.querySelector('.close-button') : null;
const profilePicDisplay = document.getElementById('profile-pic-display');
const profileFileInput = document.getElementById('profile-file-input');
const saveProfileButton = document.getElementById('save-profile-button');
const profileUploadStatus = document.getElementById('profile-upload-status');


// ================================================================
// STATE MANAGEMENT
// ================================================================
let currentUser = null;
let currentGrade = 0;
let currentlyOpenMission = null;


// ================================================================
// INITIALIZATION & AUTHENTICATION
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
    
    // *** แก้ไข: ซ่อนหน้า Login และแสดง Main Content ***
    hideLoginScreen();
    updateHeaderUI();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
}

/**
 * Handles logout.
 */
function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateHeaderUI();
    // *** แก้ไข: แสดงหน้า Login และซ่อน Main Content ***
    showLoginScreen();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
}


// ================================================================
// ADMIN PANEL FUNCTIONS
// ================================================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('คุณไม่มีสิทธิ์เข้าถึง Admin Panel');
        return;
    }
    // *** ใช้ฟังก์ชัน openModal กลาง ***
    openModal(adminModal);
    populateGradeSubmissionDropdowns(); 
}

function hideAdminModal() {
    // *** ใช้ฟังก์ชัน closeModal กลาง ***
    closeModal(adminModal);
}

async function populateGradeSubmissionDropdowns() {
    const studentSelect = document.getElementById('grade-student-id');
    const missionSelect = document.getElementById('grade-mission-topic');

    studentSelect.innerHTML = '<option value="">เลือกนักเรียน</option>';
    missionSelect.innerHTML = '<option value="">เลือกภารกิจ</option>';

    // Fetch students
    const { data: students, error: studentError } = await supabase
        .from('users')
        .select('student_id, full_name')
        .eq('role', 'student')
        .eq('grade', currentGrade)
        .order('full_name', { ascending: true });

    if (studentError) {
        console.error('Error fetching students for grading:', studentError);
    } else {
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.student_id;
            option.textContent = student.full_name;
            studentSelect.appendChild(option);
        });
    }

    // Fetch missions
    const { data: missions, error: missionError } = await supabase
        .from('missions')
        .select('id, topic, due_date')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: true });

    if (missionError) {
        console.error('Error fetching missions for grading:', missionError);
    } else {
        missions.forEach(mission => {
            const option = document.createElement('option');
            option.value = mission.id;
            option.textContent = `${mission.topic} (กำหนดส่ง: ${new Date(mission.due_date).toLocaleDateString()})`;
            missionSelect.appendChild(option);
        });
    }
}

async function handleAddMission(event) {
    event.preventDefault();
    const topic = document.getElementById('add-mission-topic').value;
    const detail = document.getElementById('add-mission-detail').value;
    const dueDate = document.getElementById('add-mission-due-date').value;
    const maxPoints = parseInt(document.getElementById('add-mission-max-points').value, 10);

    if (!topic || !dueDate || isNaN(maxPoints)) {
        alert('กรุณากรอกข้อมูลภารกิจให้ครบถ้วน');
        return;
    }

    if (!currentUser || !currentUser.student_id) {
        alert('กรุณาล็อกอินด้วยบัญชี Admin ที่ถูกต้องก่อนดำเนินการ');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('add_mission', {
            p_topic: topic,
            p_detail: detail,
            p_assigned_date: new Date().toISOString(),
            p_due_date: new Date(dueDate).toISOString(),
            p_max_points: maxPoints,
            p_grade: currentGrade,
            p_admin_student_id: currentUser.student_id
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data && data.success) {
            alert('เพิ่มภารกิจสำเร็จ!');
            addMissionForm.reset();
            fetchAndDisplayMissions();
            populateGradeSubmissionDropdowns();
        } else {
            console.error('API Error Response:', data ? data.error : 'Unknown error');
            throw new Error(data ? data.error : 'Failed to add mission.');
        }
    } catch (error) {
        console.error('Error adding mission:', error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มภารกิจ: ${error.message}`);
    }
}

async function handleGradeSubmission(event) {
    event.preventDefault();
    const studentId = document.getElementById('grade-student-id').value;
    const missionId = document.getElementById('grade-mission-topic').value;
    const score = parseInt(document.getElementById('grade-score').value, 10);

    if (!studentId || !missionId || isNaN(score)) {
        alert('กรุณาเลือกนักเรียน ภารกิจ และใส่คะแนน');
        return;
    }

    if (!currentUser || !currentUser.student_id) {
        alert('กรุณาล็อกอินด้วยบัญชี Admin ที่ถูกต้องก่อนดำเนินการ');
        return;
    }

    try {
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

        if (data && data.success) {
            alert('บันทึกคะแนนสำเร็จ!');
            gradeSubmissionForm.reset();
            fetchAndDisplayLeaderboard();
            fetchAndDisplayMissions();
        } else {
            console.error('API Error Response:', data ? data.error : 'Unknown error');
            throw new Error(data ? data.error : 'Failed to grade submission.');
        }
    } catch (error) {
        console.error('Error grading submission:', error);
        alert(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
    }
}


// ================================================================
// UI & DISPLAY LOGIC (Core Data Fetching & Rendering)
// ================================================================

/**
 * Updates the header based on whether a user is logged in.
 */
function updateHeaderUI() {
    if (currentUser) {
        const profileImageUrl = currentUser.profile_picture_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;

        userProfile.innerHTML = `
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <span>สวัสดี, ${currentUser.full_name}</span>
            ${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        userProfile.style.display = 'flex';
        userProfile.classList.add('clickable');
        userProfile.onclick = showProfileModal; // Assign click handler

        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;

        if (adminPanelButton && currentUser.role === 'admin') {
            adminPanelButton.style.display = 'block';
        } else if (adminPanelButton) {
            adminPanelButton.style.display = 'none';
        }

    } else {
        userProfile.innerHTML = '';
        userProfile.style.display = 'none';
        userProfile.classList.remove('clickable');
        userProfile.onclick = null; // Remove click handler if not logged in

        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginScreen;
        if (adminPanelButton) {
            adminPanelButton.style.display = 'none';
        }
    }
}

/**
 * Shows the login screen and hides main content.
 */
function showLoginScreen() {
    loginError.textContent = '';
    loginForm.reset();
    loginScreen.style.display = 'flex'; // แสดง login screen
    mainContent.style.display = 'none';  // ซ่อน main content
    // ไม่ต้องเพิ่ม blur-background ที่นี่ เพราะเป็นหน้าหลัก
}

/**
 * Hides the login screen and shows main content.
 */
function hideLoginScreen() {
    loginScreen.style.display = 'none'; // ซ่อน login screen
    mainContent.style.display = 'flex'; // แสดง main content
    // ไม่ต้องลบ blur-background ที่นี่
}

/**
 * Opens a modal and blurs the background.
 * @param {HTMLElement} modalElement The modal DOM element to show.
 */
function openModal(modalElement) {
    modalElement.style.display = 'flex'; // Make it visible
    appContainer.classList.add('blur-background'); // Apply blur
}

/**
 * Hides a modal and removes background blur if no other modals are open.
 * @param {HTMLElement} modalElement The modal DOM element to hide.
 */
function closeModal(modalElement) {
    modalElement.style.display = 'none'; // Hide it
    // Check if any other modal is still open before removing blur
    // ใช้ querySelectorAll เพื่อหา modal ที่ยังมี display: flex หรือ display: block อยู่
    const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
    if (openModals.length === 0) {
        appContainer.classList.remove('blur-background'); // Remove blur only if no modals are open
    }
}

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

function renderLeaderboard(leaderboardData) {
    leaderboardContainer.innerHTML = '';
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    leaderboardData.forEach((student, index) => {
        const profileImageUrl = student.profile_picture_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        
        const item = document.createElement('div');
        item.className = 'leaderboard-item clickable';
        item.dataset.studentId = student.student_id;

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
            // If not logged in, just show overdue or default
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
 * @param {object} mission The mission object to display.
 * @param {object|null} submission The existing submission for this mission, if any.
 */
function openMissionModal(mission, submission) {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อนส่งงาน");
        showLoginScreen();
        return;
    }
    
    currentlyOpenMission = mission;
    // *** ใช้ฟังก์ชัน openModal กลาง ***
    openModal(missionModal);

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
    // *** ใช้ฟังก์ชัน closeModal กลาง ***
    closeModal(missionModal);
    currentlyOpenMission = null;
}

/**
 * Handles the mission submission form.
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
        if (file) {
            fileUploadStatus.textContent = `กำลังอัปโหลด: ${file.name}`;
            const fileExtension = file.name.split('.').pop();
            const filePath = `${currentUser.grade}/${currentUser.student_id}/${currentlyOpenMission.id}-${Date.now()}.${fileExtension}`; 
            
            const { error: uploadError } = await supabase.storage
                .from('submissions')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('submissions')
                .getPublicUrl(filePath);
            
            proofUrl = data.publicUrl;
            fileUploadStatus.textContent = 'อัปโหลดไฟล์สำเร็จ!';
        }

        const { error: dbError } = await supabase
            .from('submissions')
            .upsert({
                student_id: currentUser.student_id,
                mission_id: currentlyOpenMission.id,
                submission_date: new Date().toISOString(),
                proof_url: proofUrl || submissionLink || ''
            }, {
                onConflict: 'student_id, mission_id'
            });

        if (dbError) throw dbError;

        alert('ส่งงานสำเร็จ!');
        hideMissionModal();
        fetchAndDisplayMissions();

    } catch (error) {
        console.error('Submission Error:', error);
        alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`);
        submitMissionButton.disabled = false;
        submitMissionButton.textContent = 'ลองอีกครั้ง';
    }
}

/**
 * Shows the student detail modal.
 * @param {string} studentId The ID of the student to show details for.
 */
async function showStudentDetailModal(studentId) {
    // *** ใช้ฟังก์ชัน openModal กลาง ***
    openModal(studentDetailModal);
    modalHeader.innerHTML = '<div class="loader"></div>';
    modalBody.innerHTML = '';

    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('id, topic, detail, max_points')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });
    
    if (missionsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลภารกิจได้</p>';
        return;
    }

    const { data: studentSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select('mission_id, score, proof_url')
        .eq('student_id', studentId);
    
    if (subsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลการส่งงานได้</p>';
        return;
    }
    
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
            <h3>${studentInfo.full_name}</h3>
            <p>คะแนนรวม: ${totalScore} | ส่งงานแล้ว: ${studentSubmissions.length} / ${allMissions.length} ชิ้น</p>
        </div>
    `;
    
    modalBody.innerHTML = '';
    allMissions.forEach(mission => {
        const submission = submissionMap.get(mission.id);
        let status, statusClass, scoreText, proofLink = '';

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
            <span>${scoreText} ${proofLink}</span>
        `;
        modalBody.appendChild(taskItem);
    });
}

/**
 * Hides the student detail modal.
 */
function hideStudentDetailModal() {
    // *** ใช้ฟังก์ชัน closeModal กลาง ***
    closeModal(studentDetailModal);
}

// Profile Modal Functions
function showProfileModal() {
    if (!currentUser) return;

    // *** ใช้ฟังก์ชัน openModal กลาง ***
    openModal(profileModal);

    profilePicDisplay.src = currentUser.profile_picture_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=100x100`;
    profileFileInput.value = ''; // Clear file input
    profileUploadStatus.textContent = '';
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = 'บันทึกรูปโปรไฟล์';
}

function hideProfileModal() {
    // *** ใช้ฟังก์ชัน closeModal กลาง ***
    closeModal(profileModal);
}

async function handleProfilePicSubmit(event) {
    event.preventDefault();
    saveProfileButton.disabled = true;
    saveProfileButton.textContent = 'กำลังบันทึก...';
    profileUploadStatus.textContent = '';

    const file = profileFileInput.files[0];

    if (!file) {
        profileUploadStatus.textContent = 'กรุณาเลือกรูปภาพ';
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = 'บันทึกรูปโปรไฟล์';
        return;
    }

    try {
        profileUploadStatus.textContent = `กำลังอัปโหลด: ${file.name}`;
        const fileExtension = file.name.split('.').pop();
        const filePath = `avatars/${currentUser.student_id}.${fileExtension}`; 
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { 
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        const newProfileUrl = data.publicUrl;
        profileUploadStatus.textContent = 'อัปโหลดรูปสำเร็จ!';

        const { error: dbError } = await supabase
            .from('users')
            .update({ profile_picture_url: newProfileUrl })
            .eq('student_id', currentUser.student_id);

        if (dbError) throw dbError;

        currentUser.profile_picture_url = newProfileUrl;
        localStorage.setItem('app_user_session', JSON.stringify(currentUser));
        
        updateHeaderUI();
        fetchAndDisplayLeaderboard();
        alert('เปลี่ยนรูปโปรไฟล์สำเร็จ!');
        hideProfileModal();

    } catch (error) {
        console.error('Profile Picture Update Error:', error);
        alert(`เกิดข้อผิดพลาดในการเปลี่ยนรูปโปรไฟล์: ${error.message}`);
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = 'ลองอีกครั้ง';
    }
}


// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    // Close login modal when clicking outside (login-screen.style.display = 'none' will hide it)
    loginScreen.addEventListener('click', (event) => {
        if (event.target === loginScreen) {
            //showLoginScreen(); // If you want to allow clicking outside to re-open login, though it should always be visible if not logged in
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
                showStudentDetailModal(studentId);
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

    // Profile Modal Event Listeners
    if (profileModalCloseButton) {
        profileModalCloseButton.addEventListener('click', hideProfileModal);
    }
    if (profileModal) {
        profileModal.addEventListener('click', (event) => {
            if (event.target === profileModal) {
                hideProfileModal();
            }
        });
    }
    if (saveProfileButton) {
        saveProfileButton.addEventListener('click', handleProfilePicSubmit);
    }
    if (profileFileInput) {
        profileFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePicDisplay.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
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

    setupEventListeners(); // Setup listeners first

    // Check for a logged-in user from previous session
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        const userData = JSON.parse(storedSession);
        if (userData.role === 'admin' || userData.grade === currentGrade) {
            currentUser = userData;
            hideLoginScreen(); // User logged in, show main content
        } else {
            // If student from wrong grade, clear session and show login
            localStorage.removeItem('app_user_session');
            alert(`บัญชีนี้สำหรับ ม.${userData.grade} กรุณาเข้าสู่ระบบในห้องเรียนที่ถูกต้อง.`);
            showLoginScreen();
        }
    } else {
        // No session, show login screen
        showLoginScreen(); 
    }
    
    updateHeaderUI();
    // Load public data regardless of login status
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
}

init(); // Call init to start the application
