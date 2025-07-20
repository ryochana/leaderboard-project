// main.js (V5.0 - Tabbed Layout "Classroom Hub")
// Last Updated: 2025-07-20

const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const appContainer = document.getElementById('app-container');
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const classTitle = document.getElementById('class-title');
const userProfile = document.getElementById('user-profile');
const logoutButton = document.getElementById('logout-button');
const adminPanelButton = document.getElementById('admin-panel-button');

// Tab and Content Sections
const tabButtons = document.querySelectorAll('.tab-button');
const contentSections = document.querySelectorAll('.content-section');
const feedContainer = document.getElementById('feed-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const missionsContainer = document.getElementById('missions-container');

// Modals
const studentDetailModal = document.getElementById('student-detail-modal');
const missionModal = document.getElementById('mission-modal');
const adminModal = document.getElementById('admin-modal');
const profileModal = document.getElementById('profile-modal');
const customizationModal = document.getElementById('customization-modal');
const changePasswordModal = document.getElementById('change-password-modal');

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
    loginError.textContent = '';
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const { data: users, error } = await supabase.from('users').select('*').eq('username', usernameInput);
    if (error || !users || users.length === 0) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'; return;
    }
    const user = users[0];
    if (user.password !== passwordInput) {
        loginError.textContent = 'รหัสผ่านไม่ถูกต้อง'; return;
    }
    if (user.role === 'student' && user.grade !== currentGrade) {
        loginError.textContent = `คุณเป็นนักเรียน ม.${user.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง`; return;
    }
    currentUser = user;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    closeModal(loginScreen);
    updateAfterLogin();
}

function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateAfterLogout();
}

function updateAfterLogin() {
    updateHeaderUI();
    fetchAndDisplayFeed();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
}

function updateAfterLogout() {
    updateHeaderUI();
    fetchAndDisplayFeed();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
}

function updateHeaderUI() {
    if (currentUser) {
        const profileImageUrl = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
        userProfile.innerHTML = `<img src="${profileImageUrl}" alt="Profile" class="profile-pic"><span class="student-name">${currentUser.display_name}</span>${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}`;
        userProfile.style.display = 'flex';
        userProfile.onclick = showCustomizationModal;
        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;
        if (adminPanelButton) adminPanelButton.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    } else {
        userProfile.innerHTML = '';
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginModal;
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

    const { data: upcomingMissions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .gte('due_date', now.toISOString())
        .lte('due_date', threeDaysFromNow.toISOString())
        .order('due_date', { ascending: true });

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
    leaderboardContainer.innerHTML = '<div class="loader"></div>';
    const { data, error } = await supabase.rpc('get_leaderboard_data', { p_grade_id: currentGrade });
    if (error) {
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลด Leaderboard ได้</p>`;
        return;
    }
    renderLeaderboard(data);
}

function renderLeaderboard(leaderboardData) {
    if(!leaderboardContainer) return;
    leaderboardContainer.innerHTML = '';
    if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = '<p>ยังไม่มีข้อมูล</p>';
        return;
    }
    leaderboardData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item clickable';
        item.dataset.userId = student.id;
        const profileImageUrl = student.avatar_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        const studentProgress = student.progress || 0;
        const frameStyle = student.equipped_frame_color && student.equipped_frame_color.startsWith('linear-gradient')
            ? `border-image: ${student.equipped_frame_color} 1; background-image: ${student.equipped_frame_color};`
            : `border-color: ${student.equipped_frame_color || '#cccccc'};`;
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="profile-pic-wrapper ${student.equipped_profile_effect || ''}" style="${frameStyle}">
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
        leaderboardContainer.appendChild(item);
    });
}

async function fetchAndDisplayMissions() {
    if(!missionsContainer) return;
    missionsContainer.innerHTML = '<div class="loader"></div>';
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
        const node = document.createElement('div');
        node.className = `mission-node ${statusClass}`;
        node.innerHTML = `<div class="mission-node-topic">${mission.title}</div><div class="mission-node-points">${mission.max_points || 0} pts</div>`;
        node.onclick = () => openMissionModal(mission, submission);
        missionsContainer.appendChild(node);
    });
}

function openMissionModal(mission, submission) {
    if (!currentUser) { alert("กรุณาล็อกอินก่อนส่งงาน"); showLoginModal(); return; }
    currentlyOpenMission = mission;
    openModal(missionModal);
    const modalHeader = missionModal.querySelector('#mission-modal-header');
    const submissionForm = missionModal.querySelector('#submission-form');
    const fileStatus = missionModal.querySelector('#file-upload-status');
    const submitBtn = missionModal.querySelector('#submit-mission-button');
    const statusDiv = missionModal.querySelector('#submission-status');
    modalHeader.innerHTML = `<h3>${mission.title}</h3><p>${mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>`;
    submissionForm.reset();
    fileStatus.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'ส่งงาน';
    if (submission) {
        if (submission.status === 'graded') {
            statusDiv.className = 'status-graded';
            statusDiv.innerHTML = `ตรวจแล้ว! คุณได้ <b>${submission.grade}</b> คะแนน`;
            submissionForm.style.display = 'none';
        } else {
            statusDiv.className = 'status-pending';
            statusDiv.innerHTML = `ส่งงานแล้ว - รอการตรวจ`;
            submissionForm.style.display = 'block';
            submitBtn.textContent = 'ส่งงานอีกครั้ง';
        }
    } else {
        statusDiv.innerHTML = '';
        statusDiv.className = '';
        submissionForm.style.display = 'block';
    }
}
function hideMissionModal() { closeModal(missionModal); }

async function handleMissionSubmit(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('#submit-mission-button');
    const fileStatus = document.getElementById('file-upload-status');
    const submissionLink = document.getElementById('submission-link').value;
    const fileInput = document.getElementById('submission-file');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง...';
    fileStatus.textContent = '';
    const file = fileInput.files[0];
    let proofUrl = submissionLink || '';
    try {
        if (file) {
            fileStatus.textContent = `กำลังอัปโหลดไฟล์...`;
            const IMGBB_API_KEY = 'e5fca6e1e9823fa93eff7017fe015d54';
            const formData = new FormData();
            formData.append('key', IMGBB_API_KEY);
            formData.append('image', file);
            const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error.message || 'ImgBB upload failed');
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
        alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'ลองอีกครั้ง';
    }
}

async function showStudentDetailModal(userId) {
    openModal(studentDetailModal);
    const modalHeader = studentDetailModal.querySelector('#modal-header');
    const modalBody = studentDetailModal.querySelector('#modal-body');
    modalHeader.innerHTML = '<div class="loader"></div>';
    modalBody.innerHTML = '';
    const { data: studentInfo, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userError) {
        modalHeader.innerHTML = `<p class="error-message">ไม่พบข้อมูลนักเรียน</p>`;
        return;
    }
    const { data: allMissions } = await supabase.from('missions').select('id, title, max_points').eq('grade', currentGrade).order('created_at', { ascending: false });
    const { data: studentSubmissions } = await supabase.from('submissions').select('mission_id, status, grade, proof_url').eq('student_id', userId);
    const submissionMap = new Map(studentSubmissions ? studentSubmissions.map(s => [s.mission_id, s]) : []);
    const profileImageUrl = studentInfo.avatar_url || `https://robohash.org/${studentInfo.student_id}.png?set=set4&size=80x80`;
    studentDetailModal.querySelector('.modal-content').style.background = studentInfo.equipped_card_bg || '#fefefe';
    modalHeader.innerHTML = `<img src="${profileImageUrl}" alt="Profile"><div class="student-summary"><h3>${studentInfo.display_name}</h3><p>คะแนนรวม: ${studentInfo.points || 0} EXP</p></div>`;
    modalBody.innerHTML = '';
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
        modalBody.appendChild(taskItem);
    });
}

function showAdminModal() { if (!currentUser || currentUser.role !== 'admin') return; openModal(adminModal); populateGradeSubmissionDropdowns(); }
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
    studentSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    missionSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    const { data: students } = await supabase.from('users').select('id, display_name').eq('role', 'student').eq('grade', currentGrade);
    studentSelect.innerHTML = '<option value="">เลือกนักเรียน</option>';
    if (students) students.forEach(s => { studentSelect.innerHTML += `<option value="${s.id}">${s.display_name}</option>`; });
    const { data: missions } = await supabase.from('missions').select('id, title').eq('grade', currentGrade);
    missionSelect.innerHTML = '<option value="">เลือกภารกิจ</option>';
    if (missions) missions.forEach(m => { missionSelect.innerHTML += `<option value="${m.id}">${m.title}</option>`; });
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
    let settingsBtn = previewContainer.querySelector('#settings-btn');
    if (!settingsBtn) {
        settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.textContent = 'ตั้งค่า (รูปโปรไฟล์ / รหัสผ่าน)';
        settingsBtn.onclick = showProfileModal;
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

    previewProfileImage.src = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
    previewUsername.textContent = currentUser.display_name;
    previewPoints.textContent = `${currentUser.points || 0} EXP`;
    const frameStyle = currentUser.equipped_frame_color && currentUser.equipped_frame_color.startsWith('linear-gradient')
        ? `border-image: ${currentUser.equipped_frame_color} 1; background-image: ${currentUser.equipped_frame_color};`
        : `border-color: ${currentUser.equipped_frame_color || '#555'};`;
    previewProfileEffect.style = frameStyle;
    previewProfileEffect.className = `profile-pic-wrapper ${currentUser.equipped_profile_effect || ''}`;
    previewCardBackground.style.background = currentUser.equipped_card_bg || '#f8f9fa';
    if (currentUser.equipped_badge_url) {
        previewBadge.src = currentUser.equipped_badge_url;
        previewBadge.style.display = 'inline-block';
    } else {
        previewBadge.style.display = 'none';
    }
}

async function handleItemClick(item, locked, equipped) {
    if (locked) {
        alert(`คุณต้องมี ${item.unlock_points} คะแนนเพื่อปลดล็อกไอเทมนี้!`);
        return;
    }
    if (equipped) return;
    try {
        const { data, error } = await supabase.rpc('equip_cosmetic_item_simple', { p_user_id: currentUser.id, p_item_id: item.id });
        if (error) throw error;
        const { data: updatedUser, error: userError } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (userError) throw userError;
        currentUser = updatedUser;
        localStorage.setItem('app_user_session', JSON.stringify(currentUser));
        alert(data);
        showCustomizationModal();
        fetchAndDisplayLeaderboard();
    } catch (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}

function showProfileModal() {
    if (!currentUser) return;
    closeModal(customizationModal);
    openModal(profileModal);
    
    const profilePicDisplay = profileModal.querySelector('#profile-pic-display');
    const profileFileInput = profileModal.querySelector('#profile-file-input');
    const profileUploadStatus = profileModal.querySelector('#profile-upload-status');
    const saveProfileButton = profileModal.querySelector('#save-profile-button');
    
    profilePicDisplay.src = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=100x100`;
    profileFileInput.value = '';
    profileUploadStatus.textContent = '';
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = 'บันทึกรูปโปรไฟล์';
    
    const profileEditArea = profileModal.querySelector('.profile-edit-area');
    let changePassBtn = profileEditArea.querySelector('#go-to-change-password-btn');
    if (!changePassBtn) {
        changePassBtn = document.createElement('button');
        changePassBtn.id = 'go-to-change-password-btn';
        changePassBtn.textContent = 'ต้องการเปลี่ยนรหัสผ่าน?';
        changePassBtn.onclick = () => {
            closeModal(profileModal);
            openModal(changePasswordModal);
            if(passwordError) passwordError.textContent = '';
            if(changePasswordForm) changePasswordForm.reset();
        };
        profileEditArea.appendChild(changePassBtn);
    }
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
        statusEl.textContent = `กำลังอัปโหลด...`;
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error.message || 'ImgBB upload failed');
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
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'ลองอีกครั้ง';
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    passwordError.textContent = '';
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
        passwordError.textContent = 'รหัสผ่านใหม่ไม่ตรงกัน'; return;
    }
    if (newPassword.length < 6) {
        passwordError.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'; return;
    }
    if (currentUser.password !== currentPassword) {
        passwordError.textContent = 'รหัสผ่านปัจจุบันไม่ถูกต้อง'; return;
    }
    const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id).select().single();
    if (error) {
        passwordError.textContent = `เกิดข้อผิดพลาด: ${error.message}`; return;
    }
    currentUser = data;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    alert('เปลี่ยนรหัสผ่านสำเร็จ!');
    closeModal(changePasswordModal);
}

function setupEventListeners() {
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (leaderboardContainer) leaderboardContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.leaderboard-item');
        if (item && item.dataset.userId) showStudentDetailModal(item.dataset.userId);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal(modal);
        });
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.content);
        });
    });

    const submissionFormEl = missionModal ? missionModal.querySelector('#submission-form') : null;
    if (submissionFormEl) submissionFormEl.addEventListener('submit', handleMissionSubmit);

    if (adminPanelButton) adminPanelButton.addEventListener('click', showAdminModal);
    if (adminModal) {
        const addMissionFormEl = adminModal.querySelector('#add-mission-form');
        if (addMissionFormEl) addMissionFormEl.addEventListener('submit', handleAddMission);
        const gradeSubmissionFormEl = adminModal.querySelector('#grade-submission-form');
        if (gradeSubmissionFormEl) gradeSubmissionFormEl.addEventListener('submit', handleGradeSubmission);
    }
    if (profileModal) {
        const saveProfileButton = profileModal.querySelector('#save-profile-button');
        if (saveProfileButton) saveProfileButton.addEventListener('click', handleProfilePicSubmit);
    }
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
}

function init() {
    currentGrade = getGradeFromHostname();
    
    if (classTitle) classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;
    
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        currentUser = JSON.parse(storedSession);
    }
    
    setupEventListeners();
    updateHeaderUI();
    
    switchTab('feed-container'); // Start on the feed tab
    fetchAndDisplayFeed();
    fetchAndDisplayMissions();
    fetchAndDisplayLeaderboard();
}

init();
