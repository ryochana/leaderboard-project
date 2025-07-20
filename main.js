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
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const classTitle = document.getElementById('class-title');
const leaderboardContainer = document.getElementById('leaderboard-container');
const missionsContainer = document.getElementById('missions-container');
const userProfile = document.getElementById('user-profile');
const logoutButton = document.getElementById('logout-button');
const appContainer = document.getElementById('app-container');
const studentDetailModal = document.getElementById('student-detail-modal');
const modalCloseButton = document.querySelector('#student-detail-modal .close-button');
const modalHeader = document.getElementById('modal-header');
const modalBody = document.getElementById('modal-body');
const missionModal = document.getElementById('mission-modal');
const missionModalHeader = document.getElementById('mission-modal-header');
const missionModalBody = document.getElementById('mission-modal-body');
const submissionStatus = document.getElementById('submission-status');
const submissionForm = document.getElementById('submission-form');
const submitMissionButton = document.getElementById('submit-mission-button');
const fileUploadStatus = document.getElementById('file-upload-status');
const adminPanelButton = document.getElementById('admin-panel-button');
const adminModal = document.getElementById('admin-modal');
const adminModalCloseButton = adminModal ? adminModal.querySelector('.close-button') : null;
const addMissionForm = document.getElementById('add-mission-form');
const gradeSubmissionForm = document.getElementById('grade-submission-form');
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

function getGradeFromHostname() {
    const hostname = window.location.hostname;
    if (hostname.includes('m1')) return 1;
    if (hostname.includes('m2')) return 2;
    if (hostname.includes('m3')) return 3;
    console.warn("Could not determine grade from hostname, defaulting to 2.");
    return 2;
}

async function handleLogin(event) {
    event.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginError.textContent = 'Email หรือรหัสผ่านไม่ถูกต้อง';
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// ================================================================
// UI & DISPLAY LOGIC (Core & Modals)
// ================================================================

function updateHeaderUI() {
    if (currentUser) {
        const profileImageUrl = currentUser.avatar_url || `https://robohash.org/${currentUser.id}.png?set=set4&size=50x50`;

        userProfile.innerHTML = `
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <span>สวัสดี, ${currentUser.username}</span>
            ${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        userProfile.style.display = 'flex';
        userProfile.classList.add('clickable');
        userProfile.onclick = showProfileModal;

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

function showLoginScreen() {
    loginError.textContent = '';
    loginForm.reset();
    loginScreen.style.display = 'flex';
    mainContent.style.display = 'none';
}

function hideLoginScreen() {
    loginScreen.style.display = 'none';
    mainContent.style.display = 'flex';
}

function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
    appContainer.classList.add('blur-background');
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'none';
    const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
    if (openModals.length === 0) {
        appContainer.classList.remove('blur-background');
    }
}

// ================================================================
// DATA FETCHING & RENDERING (Leaderboard, Missions)
// ================================================================

async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';
    
    const { data, error } = await supabase.rpc('get_leaderboard_data');

    if (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลด Leaderboard ได้</p>`;
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
        item.dataset.userId = student.id;

        const profileImageUrl = student.avatar_url || `https://robohash.org/${student.id}.png?set=set4&size=50x50`;
        
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <div class="student-info">
                <div class="student-name">${student.username}</div>
            </div>
            <div class="score">${student.points || 0} คะแนน</div>
        `;
        leaderboardContainer.appendChild(item);
    });
}

async function fetchAndDisplayMissions() {
    missionsContainer.innerHTML = '<div class="loader"></div>';
    
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('created_at', { ascending: true });

    if (missionsError) {
        console.error('Error fetching missions:', missionsError);
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้: ${missionsError.message}</p>`;
        return;
    }

    let submissionMap = new Map();
    if (currentUser) {
        const { data: userSubmissions, error: subsError } = await supabase
            .from('submissions')
            .select('mission_id, status, grade')
            .eq('student_id', currentUser.id);
        
        if (subsError) {
            console.error("Could not fetch user submissions, statuses may be incorrect.", subsError);
        } else {
            submissionMap = new Map(userSubmissions.map(s => [s.mission_id, s]));
        }
    }
    
    renderMissions(allMissions, submissionMap);
}

function renderMissions(missions, submissionMap) {
    missionsContainer.innerHTML = '';
    if (!missions || missions.length === 0) {
        missionsContainer.innerHTML = '<p>ยังไม่มีภารกิจ</p>';
        return;
    }

    missions.forEach(mission => {
        let statusClass = 'status-not-submitted';
        const submission = currentUser ? submissionMap.get(mission.id) : null;
        if (submission) {
            statusClass = submission.status === 'graded' ? 'status-graded' : 'status-pending';
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'mission-node-wrapper';

        const node = document.createElement('div');
        node.className = `mission-node ${statusClass}`;
        
        node.innerHTML = `
            <div class="mission-node-topic">${mission.title}</div>
            <div class="mission-node-points">${mission.max_points || 0} pts</div>
        `;
        
        node.onclick = () => openMissionModal(mission, submission);

        wrapper.appendChild(node);
        missionsContainer.appendChild(wrapper);
    });
}


// ================================================================
// MODAL FUNCTIONS (Mission, Student Detail, Profile, Admin)
// ================================================================

function openMissionModal(mission, submission) {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อนส่งงาน");
        showLoginScreen();
        return;
    }
    
    currentlyOpenMission = mission;
    openModal(missionModal);

    missionModalHeader.innerHTML = `
        <h3>${mission.title}</h3>
        <p>${mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
    `;

    submissionForm.reset();
    fileUploadStatus.textContent = '';
    submitMissionButton.disabled = false;
    submitMissionButton.textContent = 'ส่งงาน';

    if (submission) {
        if (submission.status === 'graded') {
            submissionStatus.className = 'status-graded';
            submissionStatus.innerHTML = `ตรวจแล้ว! คุณได้ <b>${submission.grade}</b> คะแนน`;
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

// *** เพิ่มฟังก์ชันที่ขาดหายไป ***
function hideMissionModal() {
    closeModal(missionModal);
}

async function handleMissionSubmit(event) {
    event.preventDefault();
    submitMissionButton.disabled = true;
    submitMissionButton.textContent = 'กำลังส่ง...';
    fileUploadStatus.textContent = '';

    const submissionLink = document.getElementById('submission-link').value;
    const fileInput = document.getElementById('submission-file');
    const file = fileInput.files[0];
    let proofUrl = submissionLink || '';

    try {
        if (file) {
            fileUploadStatus.textContent = `กำลังอัปโหลด: ${file.name}`;
            const fileExtension = file.name.split('.').pop();
            const filePath = `submissions/${currentUser.id}/${currentlyOpenMission.id}-${Date.now()}.${fileExtension}`; 
            
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
                student_id: currentUser.id,
                mission_id: currentlyOpenMission.id,
                submitted_at: new Date().toISOString(),
                status: 'pending',
                proof_url: proofUrl 
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

async function showStudentDetailModal(userId) {
    openModal(studentDetailModal);
    modalHeader.innerHTML = '<div class="loader"></div>';
    modalBody.innerHTML = '';
    
    const { data: studentInfo, error: userError } = await supabase
        .from('users')
        .select('id, username, points, avatar_url')
        .eq('id', userId)
        .single();
    
    if (userError) {
        modalHeader.innerHTML = `<p class="error-message">ไม่พบข้อมูลนักเรียน</p>`;
        return;
    }

    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('id, title, max_points')
        .eq('grade', currentGrade)
        .order('created_at', { ascending: false });

    const { data: studentSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select('mission_id, status, grade, proof_url')
        .eq('student_id', userId);
        
    const submissionMap = new Map(studentSubmissions ? studentSubmissions.map(s => [s.mission_id, s]) : []);

    const profileImageUrl = studentInfo.avatar_url || `https://robohash.org/${userId}.png?set=set4&size=80x80`;
    modalHeader.innerHTML = `
        <img src="${profileImageUrl}" alt="Profile">
        <div class="student-summary">
            <h3>${studentInfo.username}</h3>
            <p>คะแนนรวม: ${studentInfo.points || 0}</p>
        </div>
    `;
    
    modalBody.innerHTML = '';
    (allMissions || []).forEach(mission => {
        const submission = submissionMap.get(mission.id);
        let status, scoreText, statusClass, proofLink = '';

        if (submission) {
            status = submission.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ';
            scoreText = submission.status === 'graded' ? `<b>${submission.grade}</b> / ${mission.max_points}` : `- / ${mission.max_points}`;
            statusClass = `status-${submission.status}`;
            if (submission.proof_url) {
                proofLink = `<a href="${submission.proof_url}" target="_blank" style="margin-left: 10px; color:#007bff;">ดูงาน</a>`;
            }
        } else {
            status = 'ยังไม่ส่ง';
            scoreText = `- / ${mission.max_points}`;
            statusClass = 'status-not-submitted';
        }

        const taskItem = document.createElement('div');
        taskItem.className = 'task-list-item';
        taskItem.innerHTML = `
            <span class="task-name">${mission.title}</span>
            <span class="task-status ${statusClass}">${status}</span>
            <span>${scoreText} ${proofLink}</span>
        `;
        modalBody.appendChild(taskItem);
    });
}

// *** เพิ่มฟังก์ชันที่ขาดหายไป ***
function hideStudentDetailModal() {
    closeModal(studentDetailModal);
}

function showProfileModal() {
    if (!currentUser) return;
    openModal(profileModal);
    profilePicDisplay.src = currentUser.avatar_url || `https://robohash.org/${currentUser.id}.png?set=set4&size=100x100`;
    profileFileInput.value = '';
    profileUploadStatus.textContent = '';
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = 'บันทึกรูปโปรไฟล์';
}

// *** เพิ่มฟังก์ชันที่ขาดหายไป ***
function hideProfileModal() {
    closeModal(profileModal);
}

async function handleProfilePicSubmit(event) {
    event.preventDefault();
    saveProfileButton.disabled = true;
    saveProfileButton.textContent = 'กำลังบันทึก...';

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
        const filePath = `avatars/${currentUser.id}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newProfileUrl = data.publicUrl;

        const { error: dbError } = await supabase
            .from('users')
            .update({ avatar_url: newProfileUrl })
            .eq('id', currentUser.id);

        if (dbError) throw dbError;

        currentUser.avatar_url = newProfileUrl;
        updateHeaderUI();
        alert('เปลี่ยนรูปโปรไฟล์สำเร็จ!');
        hideProfileModal();

    } catch (error) {
        console.error("Error uploading profile pic:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = 'ลองอีกครั้ง';
    }
}

// ================================================================
// ADMIN PANEL FUNCTIONS
// ================================================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') return;
    openModal(adminModal);
    populateGradeSubmissionDropdowns();
}

// *** เพิ่มฟังก์ชันที่ขาดหายไป ***
function hideAdminModal() {
    closeModal(adminModal);
}

async function handleAddMission(event) {
    event.preventDefault();
    const title = document.getElementById('add-mission-topic').value;
    const description = document.getElementById('add-mission-detail').value;
    const dueDate = document.getElementById('add-mission-due-date').value;
    const maxPoints = parseInt(document.getElementById('add-mission-max-points').value, 10);

    if (!title || !dueDate || isNaN(maxPoints)) {
        alert('กรุณากรอกข้อมูลภารกิจให้ครบถ้วน');
        return;
    }

    const { error } = await supabase.from('missions').insert({
        title: title,
        description: description,
        due_date: dueDate,
        max_points: maxPoints,
        grade: currentGrade,
        is_active: true
    });

    if (error) {
        alert(`เกิดข้อผิดพลาดในการเพิ่มภารกิจ: ${error.message}`);
    } else {
        alert('เพิ่มภารกิจสำเร็จ!');
        addMissionForm.reset();
        fetchAndDisplayMissions();
    }
}

async function populateGradeSubmissionDropdowns() {
    const studentSelect = document.getElementById('grade-student-id');
    const missionSelect = document.getElementById('grade-mission-topic');
    studentSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    missionSelect.innerHTML = '<option value="">กำลังโหลด...</option>';

    const { data: students, error: studentError } = await supabase
        .from('users')
        .select('id, username')
        .eq('role', 'student')
        .eq('grade', currentGrade);
    
    if (studentError) {
        studentSelect.innerHTML = '<option value="">ไม่สามารถโหลดนักเรียนได้</option>';
    } else {
        studentSelect.innerHTML = '<option value="">เลือกนักเรียน</option>';
        if(students) {
            students.forEach(s => {
                studentSelect.innerHTML += `<option value="${s.id}">${s.username}</option>`;
            });
        }
    }

    const { data: missions, error: missionError } = await supabase
        .from('missions')
        .select('id, title')
        .eq('grade', currentGrade);
        
    if (missionError) {
        missionSelect.innerHTML = '<option value="">ไม่สามารถโหลดภารกิจได้</option>';
    } else {
        missionSelect.innerHTML = '<option value="">เลือกภารกิจ</option>';
        if(missions) {
            missions.forEach(m => {
                missionSelect.innerHTML += `<option value="${m.id}">${m.title}</option>`;
            });
        }
    }
}

async function handleGradeSubmission(event) {
    event.preventDefault();
    const studentId = document.getElementById('grade-student-id').value;
    const missionId = document.getElementById('grade-mission-topic').value;
    const score = parseFloat(document.getElementById('grade-score').value);

    if (!studentId || !missionId || isNaN(score)) {
        alert('กรุณาเลือกนักเรียน ภารกิจ และใส่คะแนน');
        return;
    }

    const { error } = await supabase.rpc('grade_submission', {
        p_student_id: studentId,
        p_mission_id: missionId,
        p_score: score
    });

    if (error) {
        alert(`เกิดข้อผิดพลาดในการให้คะแนน: ${error.message}`);
    } else {
        alert('ให้คะแนนสำเร็จ!');
        gradeSubmissionForm.reset();
        fetchAndDisplayLeaderboard();
        fetchAndDisplayMissions();
    }
}

// ================================================================
// EVENT LISTENERS (Setup)
// ================================================================
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    modalCloseButton.addEventListener('click', hideStudentDetailModal);
    studentDetailModal.addEventListener('click', (event) => {
        if (event.target === studentDetailModal) hideStudentDetailModal();
    });

    leaderboardContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.leaderboard-item');
        if (item && item.dataset.userId) showStudentDetailModal(item.dataset.userId);
    });

    missionModal.querySelector('.close-button').addEventListener('click', hideMissionModal);
    missionModal.addEventListener('click', (event) => {
        if (event.target === missionModal) hideMissionModal();
    });
    submissionForm.addEventListener('submit', handleMissionSubmit);

    if (adminPanelButton) {
        adminPanelButton.addEventListener('click', showAdminModal);
    }
    if (adminModalCloseButton) {
        adminModalCloseButton.addEventListener('click', hideAdminModal);
    }
    if (adminModal) {
        adminModal.addEventListener('click', (event) => {
            if (event.target === adminModal) hideAdminModal();
        });
    }
    if (addMissionForm) {
        addMissionForm.addEventListener('submit', handleAddMission);
    }
    if (gradeSubmissionForm) {
        gradeSubmissionForm.addEventListener('submit', handleGradeSubmission);
    }

    if (profileModalCloseButton) {
        profileModalCloseButton.addEventListener('click', hideProfileModal);
    }
    if (profileModal) {
        profileModal.addEventListener('click', (event) => {
            if (event.target === profileModal) hideProfileModal();
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

async function init() {
    currentGrade = getGradeFromHostname();
    classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;
    setupEventListeners();

    const { data: { session } } = await supabase.auth.getSession();
    await handleSession(session);

    supabase.auth.onAuthStateChange(async (_event, session) => {
        await handleSession(session);
    });
}

// สร้างฟังก์ชันกลางเพื่อจัดการเซสชัน
async function handleSession(session) {
    if (session) {
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (userProfile && (userProfile.role === 'admin' || userProfile.grade === currentGrade)) {
            currentUser = userProfile;
            hideLoginScreen();
        } else {
            currentUser = null;
            await supabase.auth.signOut();
            if (userProfile) {
                 alert(`บัญชีนี้สำหรับ ม.${userProfile.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง.`);
            }
            showLoginScreen();
        }
    } else {
        currentUser = null;
        showLoginScreen();
    }
    updateHeaderUI();
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
}

init();
