// main.js (V6.4 - Final Bug Fixes)
// Last Updated: 2025-07-20

const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements (All declared at the top for clarity and accessibility)
const appContainer = document.getElementById('app-container');
const topHeader = document.getElementById('top-header');
const classTitleMain = document.getElementById('class-title-main');
const schoolName = document.getElementById('school-name');
const headerUserControls = document.querySelector('.header-user-controls');
const userProfile = document.getElementById('user-profile');
const logoutButton = document.getElementById('logout-button');
const adminPanelButton = document.getElementById('admin-panel-button'); 

const bottomTabBar = document.getElementById('bottom-tab-bar');
const tabButtons = document.querySelectorAll('.tab-button');

const mainContent = document.getElementById('main-content');
const contentSections = document.querySelectorAll('.content-section');
const feedContainer = document.getElementById('feed-container');
const missionsContainer = document.getElementById('missions-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const profileContainer = document.getElementById('profile-container');

// Modals (and their internal elements for direct access)
const loginScreen = document.getElementById('login-screen');
const loginForm = loginScreen ? loginScreen.querySelector('#login-form') : null;
const loginError = loginScreen ? loginScreen.querySelector('#login-error') : null;

const studentDetailModal = document.getElementById('student-detail-modal');
const studentDetailModalHeader = studentDetailModal ? studentDetailModal.querySelector('#modal-header') : null;
const studentDetailModalBody = studentDetailModal ? studentDetailModal.querySelector('#modal-body') : null;

const missionModal = document.getElementById('mission-modal');
const missionModalHeader = missionModal ? missionModal.querySelector('#mission-modal-header') : null;
const submissionForm = missionModal ? missionModal.querySelector('#submission-form') : null;
const submissionStatus = missionModal ? missionModal.querySelector('#submission-status') : null;
const submitMissionButton = missionModal ? missionModal.querySelector('#submit-mission-button') : null;
const fileUploadStatus = missionModal ? missionModal.querySelector('#file-upload-status') : null;

const adminModal = document.getElementById('admin-modal');
const addMissionForm = adminModal ? adminModal.querySelector('#add-mission-form') : null;
const gradeSubmissionForm = adminModal ? adminModal.querySelector('#grade-submission-form') : null;

const profileModal = document.getElementById('profile-modal');
const profilePicDisplay = profileModal ? profileModal.querySelector('#profile-pic-display') : null;
const profileFileInput = profileModal ? profileModal.querySelector('#profile-file-input') : null;
const saveProfileButton = profileModal ? profileModal.querySelector('#save-profile-button') : null;
const profileUploadStatus = profileModal ? profileModal.querySelector('#profile-upload-status') : null;

const customizationModal = document.getElementById('customization-modal');
const previewCardBackground = customizationModal ? customizationModal.querySelector('#preview-card-background') : null;
const previewProfileEffect = customizationModal ? customizationModal.querySelector('#preview-profile-effect') : null;
const previewProfileImage = customizationModal ? customizationModal.querySelector('#preview-profile-image') : null;
const previewUsername = customizationModal ? customizationModal.querySelector('#preview-username') : null;
const previewBadge = customizationModal ? customizationModal.querySelector('#preview-badge') : null;
const previewPoints = customizationModal ? customizationModal.querySelector('#preview-points') : null;

const changePasswordModal = document.getElementById('change-password-modal');
const changePasswordForm = changePasswordModal ? changePasswordModal.querySelector('#change-password-form') : null;
const passwordError = changePasswordModal ? changePasswordModal.querySelector('#password-error') : null;

// State
let currentUser = null;
let currentGrade = 0;
let currentlyOpenMission = null;

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
    if(loginError) loginError.textContent = '';
    const usernameInput = loginForm ? loginForm.querySelector('#username').value : '';
    const passwordInput = loginForm ? loginForm.querySelector('#password').value : '';
    const { data: users, error } = await supabase.from('users').select('*').eq('username', usernameInput);
    if (error || !users || users.length === 0) {
        if(loginError) loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'; return;
    }
    const user = users[0];
    if (user.password !== passwordInput) {
        if(loginError) loginError.textContent = 'รหัสผ่านไม่ถูกต้อง'; return;
    }
    if (user.role === 'student' && user.grade !== currentGrade) {
        if(loginError) loginError.textContent = `คุณเป็นนักเรียน ม.${user.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง`; return;
    }
    currentUser = user;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    closeModal(loginScreen);
    updateAfterLoginOrLogout();
}

function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateAfterLoginOrLogout();
}

function updateAfterLoginOrLogout() {
    updateHeaderUI();
    // Re-fetch all data to ensure latest state after login/logout
    fetchAndDisplayFeed();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
    renderProfilePage(); 
}

function updateHeaderUI() {
    if (currentUser) {
        const profileImageUrl = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
        if(userProfile) userProfile.innerHTML = `<img src="${profileImageUrl}" alt="Profile" class="profile-pic"><span class="student-name">${currentUser.display_name}</span>`;
        if(userProfile) userProfile.style.display = 'flex';
        if(userProfile) userProfile.onclick = showCustomizationModal; 
        if(logoutButton) logoutButton.textContent = 'ออกจากระบบ';
        if(logoutButton) logoutButton.onclick = handleLogout;
        if (adminPanelButton) adminPanelButton.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    } else {
        if(userProfile) userProfile.innerHTML = '';
        if(userProfile) userProfile.style.display = 'none';
        if(logoutButton) logoutButton.textContent = 'เข้าสู่ระบบ';
        if(logoutButton) logoutButton.onclick = showLoginModal;
        if (adminPanelButton) adminPanelButton.style.display = 'none';
    }
}

function showLoginModal() {
    if(loginForm) loginForm.reset();
    if(loginError) loginError.textContent = '';
    openModal(loginScreen);
}

function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'flex';
    if(appContainer) appContainer.classList.add('blur-background');
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.style.display = 'none';
    const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
    if (openModals.length === 0 && appContainer) {
        appContainer.classList.remove('blur-background');
    }
}

function switchTab(targetId) {
    contentSections.forEach(section => {
        section.classList.toggle('active', section.id === targetId);
    });
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.content === targetId);
    });
}

async function fetchAndDisplayFeed() {
    if(!feedContainer) return;
    feedContainer.innerHTML = '<h2>ฟีดข่าวสาร</h2><div class="loader"></div>';
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const { data: upcomingMissions, error } = await supabase.from('missions').select('*').eq('grade', currentGrade).gte('due_date', now.toISOString()).lte('due_date', threeDaysFromNow.toISOString()).order('due_date', { ascending: true });
    if (error) {
        feedContainer.innerHTML += '<p class="error-message">ไม่สามารถโหลดข้อมูลฟีดได้</p>';
        return;
    }
    feedContainer.innerHTML = '<h2>ฟีดข่าวสาร</h2>';
    if (upcomingMissions.length === 0) {
        feedContainer.innerHTML += '<div class="card"><p>ยอดเยี่ยม! ไม่มีภารกิจที่ใกล้ครบกำหนดส่งใน 3 วันนี้</p></div>';
    } else {
        const feedContent = document.createElement('div');
        feedContent.className = 'card';
        feedContent.innerHTML = '<h3>⚠️ ภารกิจที่ใกล้ครบกำหนดส่ง</h3>';
        upcomingMissions.forEach(mission => {
            const dueDate = new Date(mission.due_date);
            feedContent.innerHTML += `<p><strong>${mission.title}</strong> - กำหนดส่งวันที่ ${dueDate.toLocaleDateString('th-TH')}</p>`;
        });
        feedContainer.appendChild(feedContent);
    }
}

async function fetchAndDisplayLeaderboard() {
    if(!leaderboardContainer) return;
    leaderboardContainer.innerHTML = '<h2>หอเกียรติยศ (Leaderboard)</h2><div class="loader"></div>';
    const { data, error } = await supabase.rpc('get_leaderboard_data', { p_grade_id: currentGrade });
    if (error) {
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลด Leaderboard ได้</p>`;
        return;
    }
    renderLeaderboard(data);
}

function renderLeaderboard(leaderboardData) {
    if(!leaderboardContainer) return;
    leaderboardContainer.innerHTML = '<h2>หอเกียรติยศ (Leaderboard)</h2>';
    const leaderboardCard = document.createElement('div');
    leaderboardCard.className = 'card';
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardCard.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
    } else {
        leaderboardData.forEach((student, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item clickable';
            item.dataset.userId = student.id;
            const profileImageUrl = student.avatar_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
            const studentProgress = student.progress || 0;
            let frameStyle = student.equipped_frame_color && student.equipped_frame_color.startsWith('linear-gradient')
                ? `border-image: ${student.equipped_frame_color} 1; background-image: ${student.equipped_frame_color};`
                : `border-color: ${student.equipped_frame_color || '#cccccc'};`;
            
            let rankIcon = '';
            let profileSizeClass = '';
            if (index === 0) {
                rankIcon = '👑';
                profileSizeClass = 'rank-1';
                frameStyle = `border-image: linear-gradient(45deg, #FFD700, #FFA500) 1; background-image: linear-gradient(45deg, #FFD700, #FFA500);`;
            } else if (index === 1) {
                rankIcon = '🥈';
                profileSizeClass = 'rank-2';
                frameStyle = `border-image: linear-gradient(45deg, #C0C0C0, #A9A9A9) 1; background-image: linear-gradient(45deg, #C0C0C0, #A9A9A9);`;
            } else if (index === 2) {
                rankIcon = '🥉';
                profileSizeClass = 'rank-3';
                frameStyle = `border-image: linear-gradient(45deg, #CD7F32, #B87333) 1; background-image: linear-gradient(45deg, #CD7F32, #B87333);`;
            }

            item.innerHTML = `
                <div class="rank">${index + 1}${rankIcon}</div>
                <div class="profile-pic-wrapper ${profileSizeClass} ${student.equipped_profile_effect || ''}" style="${frameStyle}">
                    <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
                </div>
                <div class="student-info">
                    <div class="student-name-wrapper">
                        <div class="student-name">${student.display_name}</div>
                        ${student.equipped_badge_url ? `<img src="${student.equipped_badge_url}" alt="Badge" class="equipped-badge">` : ''}
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${studentProgress}%;"></div>
                    </div>
                </div>
                <div class="score">${student.points || 0} EXP</div>`;
            leaderboardCard.appendChild(item);
        });
    }
    leaderboardContainer.appendChild(leaderboardCard);
}

async function fetchAndDisplayMissions() {
    if(!missionsContainer) return;
    missionsContainer.innerHTML = '<h2>บันทึกภารกิจ (Quest Log)</h2><div class="loader"></div>';
    const { data: allMissions, error: missionsError } = await supabase.from('missions').select('*').eq('grade', currentGrade).order('created_at', { ascending: true });
    if (missionsError) {
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้</p>`;
        return;
    }
    let submissionMap = new Map();
    if (currentUser) {
        const { data: userSubmissions } = await supabase.from('submissions').select('mission_id, status, grade').eq('student_id', currentUser.id);
        if (userSubmissions) {
            submissionMap = new Map(userSubmissions.map(s => [s.mission_id, s]));
        }
    }
    renderMissions(allMissions, submissionMap);
}

function renderMissions(missions, submissionMap) {
    if(!missionsContainer) return;
    missionsContainer.innerHTML = '<h2>บันทึกภารกิจ (Quest Log)</h2>';
    const missionsGrid = document.createElement('div');
    missionsGrid.className = 'missions-grid';
    if (!missions || missions.length === 0) {
        missionsGrid.innerHTML = '<p>ยังไม่มีภารกิจ</p>';
    } else {
        missions.forEach(mission => {
            let statusClass = 'status-not-submitted';
            let statusText = 'ยังไม่ส่ง';
            const submission = currentUser ? submissionMap.get(mission.id) : null;
            if (submission) {
                statusClass = submission.status === 'graded' ? 'status-graded' : 'status-pending';
                statusText = submission.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ';
            }
            const node = document.createElement('div');
            node.className = `mission-node ${statusClass}`;
            node.onclick = () => openMissionModal(mission, submission);
            
            node.innerHTML = `
                <div class="mission-header">
                    <div class="mission-topic">${mission.title}</div>
                    <span class="mission-status-indicator ${statusClass}">${statusText}</span>
                </div>
                <div class="mission-details">
                    <p class="mission-desc">${mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
                    <div class="mission-points">${mission.max_points || 0} pts</div>
                </div>
            `;
            missionsGrid.appendChild(node);
        });
    }
    missionsContainer.appendChild(missionsGrid);
}

function renderProfilePage() {
    if (!profileContainer) return;
    profileContainer.innerHTML = ''; // Clear existing content
    if (!currentUser) {
        profileContainer.innerHTML = '<div class="card"><p>กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์และปรับแต่งของรางวัล</p></div>';
        return;
    }
    const profileImageUrl = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
    profileContainer.innerHTML = `
        <div class="profile-header">
            <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            <h2>${currentUser.display_name}</h2>
            <p>${currentUser.username}</p>
        </div>
        <div class="profile-stats">
            <div class="card stat-item">
                <h3>${currentUser.points || 0}</h3>
                <p>EXP</p>
            </div>
        </div>
        <div class="profile-menu">
            <div id="customize-button" class="menu-item">
                <span>🎨 ตกแต่งโปรไฟล์</span>
                <span>></span>
            </div>
            <div id="change-password-button-in-profile" class="menu-item">
                <span>🔑 เปลี่ยนรหัสผ่าน</span>
                <span>></span>
            </div>
            <div id="profile-picture-button-in-profile" class="menu-item">
                <span>🖼️ เปลี่ยนรูปโปรไฟล์</span>
                <span>></span>
            </div>
        </div>
    `;
    // Event listeners for the new buttons within the profile page (dynamically added)
    const customizeBtn = document.getElementById('customize-button');
    if(customizeBtn) customizeBtn.addEventListener('click', showCustomizationModal);
    const changePassBtn = document.getElementById('change-password-button-in-profile');
    if(changePassBtn) changePassBtn.addEventListener('click', showChangePasswordModal);
    const profilePicBtn = document.getElementById('profile-picture-button-in-profile');
    if(profilePicBtn) profilePicBtn.addEventListener('click', showProfileModalActual);
}

// main.js (V6.3 - Final Integration & Bug Fixes) - Part 3/3

function openMissionModal(mission, submission) {
    if (!currentUser) { alert("กรุณาล็อกอินก่อนส่งงาน"); showLoginModal(); return; }
    currentlyOpenMission = mission;
    openModal(missionModal);
    if(missionModalHeader) missionModalHeader.innerHTML = `<h3>${mission.title}</h3><p>${mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>`;
    if(submissionForm) submissionForm.reset();
    if(fileUploadStatus) fileUploadStatus.textContent = '';
    if(submitMissionButton) submitMissionButton.disabled = false;
    if(submitMissionButton) submitMissionButton.textContent = 'ส่งงาน';
    if(submissionStatus) {
        if (submission) {
            if (submission.status === 'graded') {
                submissionStatus.className = 'status-graded';
                submissionStatus.innerHTML = `ตรวจแล้ว! คุณได้ <b>${submission.grade}</b> คะแนน`;
                if(submissionForm) submissionForm.style.display = 'none';
            } else {
                submissionStatus.className = 'status-pending';
                submissionStatus.innerHTML = `ส่งงานแล้ว - รอการตรวจ`;
                if(submissionForm) submissionForm.style.display = 'block';
                if(submitMissionButton) submitMissionButton.textContent = 'ส่งงานอีกครั้ง';
            }
        } else {
            submissionStatus.innerHTML = '';
            submissionStatus.className = '';
            if(submissionForm) submissionForm.style.display = 'block';
        }
    }
}
function hideMissionModal() { closeModal(missionModal); }

async function handleMissionSubmit(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('#submit-mission-button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง...';
    const fileStatus = document.getElementById('file-upload-status');
    fileStatus.textContent = '';
    const submissionLink = document.getElementById('submission-link').value;
    const fileInput = document.getElementById('submission-file');
    const file = fileInput.files[0];
    let proofUrl = submissionLink || '';
    try {
        if (file) {
            fileStatus.textContent = `กำลังอัปโหลดไฟล์ไปที่ ImgBB: ${file.name}`;
            const IMGBB_API_KEY = 'e5fca6e1e9823fa93eff7017fe015d54';
            const formData = new FormData();
            formData.append('key', IMGBB_API_KEY);
            formData.append('image', file);
            const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error.message || 'ImgBB upload failed');
            }
            proofUrl = result.data.url;
            fileStatus.textContent = 'อัปโหลดไฟล์สำเร็จ!';
        }
        if (!proofUrl) {
             alert('กรุณาแนบลิงก์ส่งงาน หรือ อัปโหลดไฟล์อย่างใดอย่างหนึ่ง');
             submitBtn.disabled = false;
             submitBtn.textContent = 'ส่งงาน';
             return;
        }
        const { error: dbError } = await supabase.from('submissions').upsert({ student_id: currentUser.id, mission_id: currentlyOpenMission.id, submitted_at: new Date().toISOString(), status: 'pending', proof_url: proofUrl }, { onConflict: 'student_id, mission_id' });
        if (dbError) throw dbError;
        alert('ส่งงานสำเร็จ!');
        hideMissionModal();
        fetchAndDisplayMissions();
    } catch (error) {
        console.error('Submission Error:', error);
        alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'ลองอีกครั้ง';
    }
}

async function showStudentDetailModal(userId) {
    openModal(studentDetailModal);
    const modalHeader = studentDetailModal.querySelector('#modal-header');
    const modalBody = studentDetailModal.querySelector('#modal-body');
    if(modalHeader) modalHeader.innerHTML = '<div class="loader"></div>';
    if(modalBody) modalBody.innerHTML = '';
    const { data: studentInfo, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userError) {
        if(modalHeader) modalHeader.innerHTML = `<p class="error-message">ไม่พบข้อมูลนักเรียน</p>`;
        return;
    }
    const { data: allMissions } = await supabase.from('missions').select('id, title, max_points').eq('grade', currentGrade).order('created_at', { ascending: false });
    const { data: studentSubmissions } = await supabase.from('submissions').select('mission_id, status, grade, proof_url').eq('student_id', userId);
    const submissionMap = new Map(studentSubmissions ? studentSubmissions.map(s => [s.mission_id, s]) : []);
    const profileImageUrl = studentInfo.avatar_url || `https://robohash.org/${studentInfo.student_id}.png?set=set4&size=80x80`;
    if(studentDetailModal) studentDetailModal.querySelector('.modal-content').style.background = studentInfo.equipped_card_bg || '#fefefe';
    if(modalHeader) modalHeader.innerHTML = `<img src="${profileImageUrl}" alt="Profile"><div class="student-summary"><h3>${studentInfo.display_name}</h3><p>คะแนนรวม: ${studentInfo.points || 0} EXP</p></div>`;
    if(modalBody) modalBody.innerHTML = '';
    (allMissions || []).forEach(mission => {
        const submission = submissionMap.get(mission.id);
        let status, scoreText, statusClass, proofLink = '';
        if (submission) {
            status = submission.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ';
            scoreText = submission.status === 'graded' ? `<b>${submission.grade}</b> / ${mission.max_points}` : `- / ${mission.max_points}`;
            statusClass = `status-${submission.status}`;
            if (submission.proof_url) proofLink = `<a href="${submission.proof_url}" target="_blank">ดูงาน</a>`;
        } else {
            status = 'ยังไม่ส่ง';
            scoreText = `- / ${mission.max_points}`;
            statusClass = 'status-not-submitted';
        }
        const taskItem = document.createElement('div');
        taskItem.className = 'task-list-item';
        taskItem.innerHTML = `<span class="task-name">${mission.title}</span><span class="task-status ${statusClass}">${status}</span><span>${scoreText} ${proofLink}</span>`;
        if(modalBody) modalBody.appendChild(taskItem);
    });
}
function hideStudentDetailModal() { closeModal(studentDetailModal); }

function showAdminModal() { if (!currentUser || currentUser.role !== 'admin') return; openModal(adminModal); populateGradeSubmissionDropdowns(); }
function hideAdminModal() { closeModal(adminModal); }

async function handleAddMission(event) {
    event.preventDefault();
    const form = event.target;
    const title = form.querySelector('#add-mission-topic').value;
    const description = form.querySelector('#add-mission-detail').value;
    const dueDate = form.querySelector('#add-mission-due-date').value;
    const maxPoints = parseInt(form.querySelector('#add-mission-max-points').value, 10);
    if (!title || !dueDate || isNaN(maxPoints)) {
        alert('กรุณากรอกข้อมูลภารกิจให้ครบถ้วน'); return;
    }
    const { error } = await supabase.from('missions').insert({ title, description, due_date: dueDate, max_points: maxPoints, grade: currentGrade, is_active: true });
    if (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } else {
        alert('เพิ่มภารกิจสำเร็จ!');
        form.reset();
        fetchAndDisplayMissions();
    }
}
async function populateGradeSubmissionDropdowns() {
    const studentSelect = document.getElementById('grade-student-id');
    const missionSelect = document.getElementById('grade-mission-topic');
    if(studentSelect) studentSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    if(missionSelect) missionSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    const { data: students } = await supabase.from('users').select('id, display_name').eq('role', 'student').eq('grade', currentGrade);
    if(studentSelect) studentSelect.innerHTML = '<option value="">เลือกนักเรียน</option>';
    if (students) students.forEach(s => { if(studentSelect) studentSelect.innerHTML += `<option value="${s.id}">${s.display_name}</option>`; });
    const { data: missions } = await supabase.from('missions').select('id, title').eq('grade', currentGrade);
    if(missionSelect) missionSelect.innerHTML = '<option value="">เลือกภารกิจ</option>';
    if (missions) missions.forEach(m => { if(missionSelect) missionSelect.innerHTML += `<option value="${m.id}">${m.title}</option>`; });
}
async function handleGradeSubmission(event) {
    event.preventDefault();
    const form = event.target;
    const studentId = form.querySelector('#grade-student-id').value;
    const missionId = form.querySelector('#grade-mission-topic').value;
    const score = parseFloat(form.querySelector('#grade-score').value);
    if (!studentId || !missionId || isNaN(score)) {
        alert('กรุณาเลือกข้อมูลให้ครบถ้วน'); return;
    }
    const { error } = await supabase.rpc('grade_submission', { p_student_id: studentId, p_mission_id: missionId, p_score: score });
    if (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } else {
        alert('ให้คะแนนสำเร็จ!');
        form.reset();
        fetchAndDisplayLeaderboard();
        fetchAndDisplayMissions();
    }
}

async function showCustomizationModal() {
    if (!currentUser) { alert("กรุณาล็อกอินก่อน"); showLoginModal(); return; }
    openModal(customizationModal);
    const previewContainer = customizationModal.querySelector('.customization-preview');
    let settingsBtn = previewContainer ? previewContainer.querySelector('#settings-btn') : null;
    if (previewContainer && !settingsBtn) {
        settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.textContent = 'ตั้งค่า (รูปโปรไฟล์ / รหัสผ่าน)';
        settingsBtn.onclick = showProfileModalActual; // Changed to actual profile modal
        previewContainer.appendChild(settingsBtn);
    }
    updatePreview();
    const { data: allItems } = await supabase.from('cosmetic_items').select('*').order('unlock_points', { ascending: true });
    const { data: userInventory } = await supabase.from('user_inventory').select('item_id, equipped').eq('user_id', currentUser.id);
    if (!allItems || !userInventory) return;
    const inventoryMap = new Map(userInventory.map(item => [item.item_id, { equipped: item.equipped }]));
    const groupedItems = allItems.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {});
    for (const type in groupedItems) {
        const container = document.getElementById(`shop-${type}`);
        if (container) {
            container.innerHTML = '';
            groupedItems[type].forEach(item => {
                const owned = inventoryMap.has(item.id);
                const equipped = owned && inventoryMap.get(item.id).equipped;
                const locked = !owned && currentUser.points < item.unlock_points;
                const itemEl = document.createElement('div');
                itemEl.className = 'shop-item';
                if (equipped) itemEl.classList.add('equipped');
                if (locked) itemEl.classList.add('locked');
                itemEl.innerHTML = `<img src="${item.icon_url || 'https://via.placeholder.com/40'}" alt="${item.name}"><span class="shop-item-points">${item.unlock_points} pts</span>${locked ? '<span class="lock-icon">🔒</span>' : ''}`;
                itemEl.onclick = () => handleItemClick(item, locked, equipped);
                container.appendChild(itemEl);
            });
        }
    }
}

function updatePreview() {
    if (!currentUser) return;
    const previewProfileImage = customizationModal.querySelector('#preview-profile-image');
    const previewUsername = customizationModal.querySelector('#preview-username');
    const previewPoints = customizationModal.querySelector('#preview-points');
    const previewProfileEffect = customizationModal.querySelector('#preview-profile-effect');
    const previewCardBackground = customizationModal.querySelector('#preview-card-background');
    const previewBadge = customizationModal.querySelector('#preview-badge');

    if(previewProfileImage) previewProfileImage.src = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
    if(previewUsername) previewUsername.textContent = currentUser.display_name;
    if(previewPoints) previewPoints.textContent = `${currentUser.points || 0} EXP`;
    const frameStyle = currentUser.equipped_frame_color && currentUser.equipped_frame_color.startsWith('linear-gradient')
        ? `border-image: ${currentUser.equipped_frame_color} 1; background-image: ${currentUser.equipped_frame_color};`
        : `border-color: ${currentUser.equipped_frame_color || '#555'};`;
    if(previewProfileEffect) previewProfileEffect.style = frameStyle;
    if(previewProfileEffect) previewProfileEffect.className = `profile-pic-wrapper ${currentUser.equipped_profile_effect || ''}`;
    if(previewCardBackground) previewCardBackground.style.background = currentUser.equipped_card_bg || '#f8f9fa';
    if (previewBadge) {
        if (currentUser.equipped_badge_url) {
            previewBadge.src = currentUser.equipped_badge_url;
            previewBadge.style.display = 'inline-block';
        } else {
            previewBadge.style.display = 'none';
        }
    }
}

async function handleItemClick(item, locked, equipped) {
    if (!currentUser) { alert("กรุณาล็อกอินก่อน"); showLoginModal(); return; }
    if (locked) {
        alert(`คุณต้องมี ${item.unlock_points} คะแนนเพื่อปลดล็อกไอเทมนี้!`);
        return;
    }
    if (equipped) return;
    try {
        const { data, error } = await supabase.rpc('equip_cosmetic_item_simple', { p_user_id: currentUser.id, p_item_id: item.id });
        if (error) throw error;
        const { data: updatedUser } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (!updatedUser) throw new Error("ไม่พบข้อมูลผู้ใช้หลังอัปเดต");
        currentUser = updatedUser;
        localStorage.setItem('app_user_session', JSON.stringify(currentUser));
        alert(data);
        showCustomizationModal(); // Re-render the shop
        fetchAndDisplayLeaderboard(); // Update the main leaderboard
    } catch (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}

function showProfileModalActual() { // Actual Profile Picture & Password Change settings
    if (!currentUser) return;
    closeModal(customizationModal); // Close customization modal
    openModal(profileModal); // Open profile modal
    
    if(profilePicDisplay) profilePicDisplay.src = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=100x100`;
    if(profileFileInput) profileFileInput.value = '';
    if(profileUploadStatus) profileUploadStatus.textContent = '';
    if(saveProfileButton) saveProfileButton.disabled = false;
    if(saveProfileButton) saveProfileButton.textContent = 'บันทึกรูปโปรไฟล์';
    
    const profileEditArea = profileModal.querySelector('.profile-edit-area');
    let changePassBtn = profileEditArea ? profileEditArea.querySelector('#go-to-change-password-btn') : null;
    if (profileEditArea && !changePassBtn) {
        changePassBtn = document.createElement('button');
        changePassBtn.id = 'go-to-change-password-btn';
        changePassBtn.textContent = 'ต้องการเปลี่ยนรหัสผ่าน?';
        changePassBtn.onclick = () => {
            closeModal(profileModal);
            showChangePasswordModal();
        };
        profileEditArea.appendChild(changePassBtn);
    }
}

function showChangePasswordModal() {
    openModal(changePasswordModal);
    if(passwordError) passwordError.textContent = '';
    if(changePasswordForm) changePasswordForm.reset();
}

async function handleProfilePicSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-profile-button');
    const statusEl = document.getElementById('profile-upload-status');
    const fileInput = document.getElementById('profile-file-input');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    const file = fileInput.files[0];
    if (!file) {
        statusEl.textContent = 'กรุณาเลือกรูปภาพ';
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึกรูปโปรไฟล์';
        return;
    }
    const IMGBB_API_KEY = 'e5fca6e1e9823fa93eff7017fe015d54';
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', file);
    try {
        statusEl.textContent = `กำลังอัปโหลดไปที่ ImgBB...`;
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData, });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error.message || 'ImgBB upload failed');
        }
        const newProfileUrl = result.data.url;
        statusEl.textContent = 'อัปโหลดสำเร็จ! กำลังบันทึก...';
        const { data: updatedUser, error: dbError } = await supabase.from('users').update({ avatar_url: newProfileUrl }).eq('id', currentUser.id).select().single();
        if (dbError) throw dbError;
        currentUser = updatedUser;
        localStorage.setItem('app_user_session', JSON.stringify(currentUser));
        updateHeaderUI();
        alert('เปลี่ยนรูปโปรไฟล์สำเร็จ!');
        closeModal(profileModal);
    } catch (error) {
        console.error("Error uploading profile pic:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'ลองอีกครั้ง';
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    if(passwordError) passwordError.textContent = '';
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
        if(passwordError) passwordError.textContent = 'รหัสผ่านใหม่ไม่ตรงกัน'; return;
    }
    if (newPassword.length < 6) {
        if(passwordError) passwordError.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'; return;
    }
    if (currentUser.password !== currentPassword) {
        if(passwordError) passwordError.textContent = 'รหัสผ่านปัจจุบันไม่ถูกต้อง'; return;
    }
    const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id).select().single();
    if (error) {
        if(passwordError) passwordError.textContent = `เกิดข้อผิดพลาด: ${error.message}`; return;
    }
    currentUser = data;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    alert('เปลี่ยนรหัสผ่านสำเร็จ!');
    closeModal(changePasswordModal);
}

function setupEventListeners() {
    // Top-level DOM elements
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    // Admin Panel Button Listener
    if (adminPanelButton) adminPanelButton.addEventListener('click', showAdminModal);

    // General modal close listeners for ALL modals
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        // Clicking outside the modal content should close it
        modal.addEventListener('click', (event) => {
            const modalContent = modal.querySelector('.modal-content');
            // Check if the click is outside the content and not on the close button itself
            if (modalContent && !modalContent.contains(event.target) && event.target !== closeBtn) {
                closeModal(modal);
            }
        });
    });

    // Tab button listeners (handle switching sections)
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.content;
            switchTab(targetId);
            // Re-fetch and render content for the newly active tab
            if (targetId === 'feed-container') fetchAndDisplayFeed();
            else if (targetId === 'missions-container') fetchAndDisplayMissions();
            else if (targetId === 'leaderboard-container') fetchAndDisplayLeaderboard();
            else if (targetId === 'profile-container') renderProfilePage();
        });
    });

    // Specific listeners for forms and buttons inside modals
    // Mission Modal (Submit form)
    if (submissionForm) { // missionModal is checked above in DOM element declarations
        submissionForm.addEventListener('submit', handleMissionSubmit);
    }
    
    // Admin Modal (Add Mission & Grade Submission forms)
    if (adminModal) {
        if (addMissionForm) addMissionForm.addEventListener('submit', handleAddMission);
        if (gradeSubmissionForm) gradeSubmissionForm.addEventListener('submit', handleGradeSubmission);
    }

    // Profile Modal (for changing profile pic)
    if (profileModal) {
        const saveProfileButton = profileModal.querySelector('#save-profile-button');
        if (saveProfileButton) saveProfileButton.addEventListener('click', handleProfilePicSubmit);
        const profileFileInput = profileModal.querySelector('#profile-file-input');
        if(profileFileInput) profileFileInput.addEventListener('change', (event) => {
            const profilePicDisplay = profileModal.querySelector('#profile-pic-display');
            const file = event.target.files[0];
            if (file && profilePicDisplay) { // Check if file and display element exist
                const reader = new FileReader();
                reader.onload = (e) => { profilePicDisplay.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
        const goToChangePassBtn = profileModal.querySelector('#go-to-change-password-btn');
        if(goToChangePassBtn) goToChangePassBtn.addEventListener('click', () => {
            closeModal(profileModal);
            showChangePasswordModal();
        });
    }

    // Change Password Modal (Change Password form)
    if (changePasswordModal && changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Customization Modal specific buttons (Dynamically added, so check existence)
    if (customizationModal) {
        const settingsBtn = customizationModal.querySelector('#settings-btn');
        if(settingsBtn) settingsBtn.onclick = () => { closeModal(customizationModal); showProfileModalActual(); };
    }

    // Leaderboard item clicks (to show student detail modal)
    if (leaderboardContainer) {
        leaderboardContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.leaderboard-item');
            if (item && item.dataset.userId) showStudentDetailModal(item.dataset.userId);
        });
    }
}

async function init() {
    currentGrade = getGradeFromHostname();
    if (classTitleMain) classTitleMain.textContent = `ENGLISH QUEST M.${currentGrade}`;
    if (schoolName) schoolName.textContent = `NONPAKCHEE SCHOOL 2568`; 

    // Initial display setup (main content visible, modals hidden)
    if (mainContent) mainContent.style.display = 'block';
    if (loginScreen) loginScreen.style.display = 'none';

    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        currentUser = JSON.parse(storedSession);
    }
    
    setupEventListeners(); // Set up all event listeners once
    updateHeaderUI(); // Update header based on initial user status
    
    // Set initial active tab and fetch its content
    switchTab('leaderboard-container'); // Start on Leaderboard as requested
    fetchAndDisplayLeaderboard(); // Fetch content for the default tab

    // Pre-fetch/render other tab contents in background
    fetchAndDisplayFeed();
    fetchAndDisplayMissions();
    renderProfilePage(); // Render profile page initially

    // If no user is logged in, show login modal (only if NOT on a tab that requires login yet)
    // No direct showLoginModal() on init anymore. Login is now triggered by specific actions (e.g., mission click).
}

init();
