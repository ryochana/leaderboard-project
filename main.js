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
    
    hideLoginScreen();
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
// ADMIN PANEL FUNCTIONS (ย้ายขึ้นมาไว้ข้างบนเพื่อให้ populateGradeSubmissionDropdowns ถูกเรียกได้)
// ================================================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('คุณไม่มีสิทธิ์เข้าถึง Admin Panel');
        return;
    }
    adminModal.style.display = 'block';
    appContainer.classList.add('blur-background');

    populateGradeSubmissionDropdowns(); // Function is now declared below
    populateAdminMissionList();
}

function hideAdminModal() {
    adminModal.style.display = 'none';
    appContainer.classList.remove('blur-background');
}

async function handleAddMission(event) {
    event.preventDefault();
    const topic = document.getElementById('add-mission-topic').value;
    const detail = document.getElementById('add-mission-detail').value;
    const dueDate = document.getElementById('add-mission-due-date').value;
    const maxPoints = parseInt(document.getElementById('add-mission-max-points').value, 10);

    console.log('Form data:', { topic, detail, dueDate, maxPoints }); 

    if (!topic || !dueDate || isNaN(maxPoints)) {
        alert('กรุณากรอกข้อมูลภารกิจให้ครบถ้วน');
        return;
    }

    if (!currentUser || !currentUser.student_id) {
        alert('กรุณาล็อกอินด้วยบัญชี Admin ที่ถูกต้องก่อนดำเนินการ');
        return;
    }

    try {
        // *** จุดที่แก้ไข: เรียกใช้ supabase.rpc() แทน fetch() ***
        const { data, error } = await supabase.rpc('add_mission', {
            p_topic: topic,
            p_detail: detail,
            p_assigned_date: new Date().toISOString(), // assigned_date เป็นวันที่ปัจจุบัน
            p_due_date: new Date(dueDate).toISOString(),
            p_max_points: maxPoints,
            p_grade: currentGrade,
            p_admin_student_id: currentUser.student_id // ส่ง student_id ของ admin ไปด้วย
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) { // ตรวจสอบจาก success flag ใน response JSON
            alert('เพิ่มภารกิจสำเร็จ!');
            addMissionForm.reset();
            fetchAndDisplayMissions();
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
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
        // *** จุดที่แก้ไข: เรียกใช้ supabase.rpc() แทน fetch() ***
        const { data, error } = await supabase.rpc('grade_submission', {
            p_student_id: parseInt(studentId, 10),
            p_mission_id: parseInt(missionId, 10),
            p_score: score,
            p_admin_student_id: currentUser.student_id // ส่ง student_id ของ admin ไปด้วย
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) { // ตรวจสอบจาก success flag ใน response JSON
            alert('บันทึกคะแนนสำเร็จ!');
            gradeSubmissionForm.reset();
            fetchAndDisplayLeaderboard();
            fetchAndDisplayMissions();
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error grading submission:', error);
        alert(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
    }
}

async function handleAdminEditMission(missionId, newTopic, newDetail, newDueDate, newMaxPoints, newGrade) {
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.student_id) {
        alert('คุณไม่มีสิทธิ์ดำเนินการนี้');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('edit_mission', {
            p_mission_id: missionId,
            p_topic: newTopic,
            p_detail: newDetail,
            p_due_date: new Date(newDueDate).toISOString(),
            p_max_points: newMaxPoints,
            p_grade: newGrade, // สามารถแก้ไข grade ของภารกิจได้
            p_admin_student_id: currentUser.student_id
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) {
            alert('แก้ไขภารกิจสำเร็จ!');
            fetchAndDisplayMissions(); // Refresh mission list
            if (adminModal.style.display === 'block') {
                populateAdminMissionList(); // Refresh admin mission list if modal is open
            }
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error editing mission:', error);
        alert(`เกิดข้อผิดพลาดในการแก้ไขภารกิจ: ${error.message}`);
    }
}

/**
 * Handles deleting a mission via RPC.
 */
async function handleAdminDeleteMission(missionId) {
    if (!currentUser || currentUser.role !== 'admin' || !currentUser.student_id) {
        alert('คุณไม่มีสิทธิ์ดำเนินการนี้');
        return;
    }

    if (!confirm('คุณต้องการลบภารกิจนี้ใช่หรือไม่? การส่งงานทั้งหมดที่เกี่ยวข้องจะถูกลบด้วย!')) {
        return;
    }

    try {
        const { data, error } = await supabase.rpc('delete_mission', {
            p_mission_id: missionId,
            p_admin_student_id: currentUser.student_id
        });

        if (error) {
            console.error('RPC Error:', error);
            throw new Error(error.message);
        }

        if (data.success) {
            alert('ลบภารกิจสำเร็จ!');
            fetchAndDisplayMissions(); // Refresh mission list
            if (adminModal.style.display === 'block') {
                populateAdminMissionList(); // Refresh admin mission list if modal is open
            }
        } else {
            console.error('API Error Response:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error deleting mission:', error);
        alert(`เกิดข้อผิดพลาดในการลบภารกิจ: ${error.message}`);
    }
}

/**
 * Populates mission list for admin editing/deleting.
 */
async function populateAdminMissionList() {
    if (!adminMissionList) return;
    adminMissionList.innerHTML = '<p>กำลังโหลดภารกิจ...</p>';

    const { data: allMissions, error } = await supabase
        .from('missions')
        .select('*')
        .order('grade', { ascending: true })
        .order('due_date', { ascending: true });

    if (error) {
        adminMissionList.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
        console.error('Error fetching admin missions:', error);
        return;
    }

    if (allMissions.length === 0) {
        adminMissionList.innerHTML = '<p>ยังไม่มีภารกิจในระบบ</p>';
        return;
    }

    adminMissionList.innerHTML = '';
    allMissions.forEach(mission => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';
        const dueDate = new Date(mission.due_date).toISOString().split('T')[0]; // Format to YYYY-MM-DD for date input

        item.innerHTML = `
            <span><b>ม.${mission.grade}</b> - ${mission.topic} (${mission.max_points} คะแนน)</span>
            <div class="admin-actions">
                <button class="admin-edit-mission-btn" 
                        data-mission-id="${mission.id}" 
                        data-topic="${mission.topic}" 
                        data-detail="${mission.detail || ''}" 
                        data-due-date="${dueDate}" 
                        data-max-points="${mission.max_points}"
                        data-grade="${mission.grade}">แก้ไข</button>
                <button class="admin-delete-mission-btn" data-mission-id="${mission.id}">ลบ</button>
            </div>
        `;
        adminMissionList.appendChild(item);
    });

    // Add event listeners for edit/delete buttons
    adminMissionList.querySelectorAll('.admin-edit-mission-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const { missionId, topic, detail, dueDate, maxPoints, grade } = event.target.dataset;
            // Populate "Add Mission" form for editing
            document.getElementById('add-mission-topic').value = topic;
            document.getElementById('add-mission-detail').value = detail;
            document.getElementById('add-mission-due-date').value = dueDate;
            document.getElementById('add-mission-max-points').value = maxPoints;
            // How to handle grade for editing? Maybe add a dropdown for grade in edit mode
            // For now, assume it's just topic, detail, date, points
            
            // Change button text and add listener for update
            const originalAddButton = addMissionForm.querySelector('button[type="submit"]');
            originalAddButton.textContent = 'บันทึกการแก้ไขภารกิจ';
            originalAddButton.onclick = async (e) => {
                e.preventDefault();
                const newTopic = document.getElementById('add-mission-topic').value;
                const newDetail = document.getElementById('add-mission-detail').value;
                const newDueDate = document.getElementById('add-mission-due-date').value;
                const newMaxPoints = parseInt(document.getElementById('add-mission-max-points').value, 10);
                const newGrade = parseInt(grade, 10); // Keep original grade for now, or add an input

                if (!newTopic || !newDueDate || isNaN(newMaxPoints)) {
                    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return;
                }
                await handleAdminEditMission(parseInt(missionId, 10), newTopic, newDetail, newDueDate, newMaxPoints, newGrade);
                // Reset form and button
                addMissionForm.reset();
                originalAddButton.textContent = 'เพิ่มภารกิจ';
                originalAddButton.onclick = handleAddMission; // Re-assign original handler
            };
        });
    });

    adminMissionList.querySelectorAll('.admin-delete-mission-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const missionId = parseInt(event.target.dataset.missionId, 10);
            handleAdminDeleteMission(missionId);
        });
    });
}

// ================================================================
// UI & DISPLAY LOGIC (Core Data Fetching & Rendering)
// ================================================================

/**
 * Updates the header based on whether a user is logged in.
 */
function updateHeaderUI() {
    if (currentUser) {
        userProfile.innerHTML = `
            <span>สวัสดี, ${currentUser.full_name}</span>
            ${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        userProfile.style.display = 'block';
        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;

        if (adminPanelButton && currentUser.role === 'admin') {
            adminPanelButton.style.display = 'block';
        } else if (adminPanelButton) {
            adminPanelButton.style.display = 'none';
        }

    } else {
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginScreen;
        if (adminPanelButton) {
            adminPanelButton.style.display = 'none';
        }
    }
}

/**
 * Shows the login modal.
 */
function showLoginScreen() {
    loginError.textContent = '';
    loginForm.reset();
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
            const filePath = `${currentUser.grade}/${currentUser.student_id}/${currentlyOpenMission.id}-${file.name}`;
            
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
    studentDetailModal.style.display = 'block';
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
    studentDetailModal.style.display = 'none';
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
        } else {
            localStorage.removeItem('app_user_session');
        }
    }
    
    updateHeaderUI();
    setupEventListeners();
}

init(); // Call init to start the application
