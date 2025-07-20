// main.js (V3.1 - Simple Username/Password Auth)

const SUPABASE_URL = 'https://nmykdendjmttjvvtsuxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teWtkZW5kam10dGp2dnRzdXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Mzk4MTksImV4cCI6MjA2ODMxNTgxOX0.gp1hzku2fDBH_9PvMsDCIwlkM0mssuke40smgU4-paE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const adminPanelButton = document.getElementById('admin-panel-button');
const adminModal = document.getElementById('admin-modal');
const profileModal = document.getElementById('profile-modal');
const customizationModal = document.getElementById('customization-modal');
const previewCardBackground = document.getElementById('preview-card-background');
const previewProfileEffect = document.getElementById('preview-profile-effect');
const previewProfileImage = document.getElementById('preview-profile-image');
const previewUsername = document.getElementById('preview-username');
const previewBadge = document.getElementById('preview-badge');
const previewPoints = document.getElementById('preview-points');

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

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', usernameInput);
    
    if (error || !users || users.length === 0) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    const user = users[0];

    if (user.password !== passwordInput) {
        loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        return;
    }

    if (user.role === 'student' && user.grade !== currentGrade) {
        loginError.textContent = `คุณเป็นนักเรียน ม.${user.grade} กรุณาไปที่เว็บของชั้นเรียนให้ถูกต้อง`;
        return;
    }

    currentUser = user;
    localStorage.setItem('app_user_session', JSON.stringify(currentUser));
    
    closeModal(loginScreen);
    updateHeaderUI();
    fetchAndDisplayMissions();
}

function handleLogout() {
    localStorage.removeItem('app_user_session');
    currentUser = null;
    updateHeaderUI();
    fetchAndDisplayMissions();
}

function updateHeaderUI() {
    if (currentUser) {
        const profileImageUrl = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
        userProfile.innerHTML = `<img src="${profileImageUrl}" alt="Profile" class="profile-pic"><span>สวัสดี, ${currentUser.username}</span>${currentUser.role === 'admin' ? '<span class="admin-badge">Admin</span>' : ''}`;
        userProfile.style.display = 'flex';
        userProfile.classList.add('clickable');
        userProfile.onclick = showCustomizationModal;
        logoutButton.textContent = 'ออกจากระบบ';
        logoutButton.onclick = handleLogout;
        logoutButton.style.display = 'inline-block';
        if (adminPanelButton) adminPanelButton.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    } else {
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginModal;
        logoutButton.style.display = 'inline-block';
        if (adminPanelButton) adminPanelButton.style.display = 'none';
    }
}

function showLoginModal() {
    loginError.textContent = '';
    document.getElementById('login-form').reset();
    openModal(loginScreen);
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

async function fetchAndDisplayLeaderboard() {
    leaderboardContainer.innerHTML = '<div class="loader"></div>';
    const { data, error } = await supabase.rpc('get_leaderboard_data', { p_grade_id: currentGrade });
    if (error) {
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
        const profileImageUrl = student.avatar_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`;
        const studentProgress = student.progress || 0;
        const frameStyle = student.equipped_frame_color && student.equipped_frame_color.startsWith('linear-gradient')
            ? `border-image: ${student.equipped_frame_color} 1; background-image: ${student.equipped_frame_color};`
            : `border-color: ${student.equipped_frame_color || '#555'};`;
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="profile-pic-wrapper ${student.equipped_profile_effect || ''}" style="${frameStyle}">
                <img src="${profileImageUrl}" alt="Profile" class="profile-pic">
            </div>
            <div class="student-info">
                <div class="student-name-wrapper">
                    <div class="student-name">${student.username}</div>
                    ${student.equipped_badge_url ? `<img src="${student.equipped_badge_url}" alt="Badge" class="equipped-badge">` : ''}
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${studentProgress}%;"></div>
                </div>
            </div>
            <div class="score">${student.points || 0} คะแนน</div>`;
        leaderboardContainer.appendChild(item);
    });
}

async function fetchAndDisplayMissions() {
    missionsContainer.innerHTML = '<div class="loader"></div>';
    const { data: allMissions, error: missionsError } = await supabase.from('missions').select('*').eq('grade', currentGrade).order('created_at', { ascending: true });
    if (missionsError) {
        missionsContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดภารกิจได้: ${missionsError.message}</p>`;
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
        node.innerHTML = `<div class="mission-node-topic">${mission.title}</div><div class="mission-node-points">${mission.max_points || 0} pts</div>`;
        node.onclick = () => openMissionModal(mission, submission);
        wrapper.appendChild(node);
        missionsContainer.appendChild(wrapper);
    });
}

function openMissionModal(mission, submission) {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อนส่งงาน");
        showLoginModal();
        return;
    }
    currentlyOpenMission = mission;
    openModal(missionModal);
    missionModal.querySelector('#mission-modal-header').innerHTML = `<h3>${mission.title}</h3><p>${mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>`;
    const submissionForm = missionModal.querySelector('#submission-form');
    submissionForm.reset();
    missionModal.querySelector('#file-upload-status').textContent = '';
    const submitBtn = missionModal.querySelector('#submit-mission-button');
    submitBtn.disabled = false;
    submitBtn.textContent = 'ส่งงาน';
    const statusDiv = missionModal.querySelector('#submission-status');
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
            fileStatus.textContent = `กำลังอัปโหลด: ${file.name}`;
            const fileExtension = file.name.split('.').pop();
            const filePath = `submissions/${currentUser.id}/${currentlyOpenMission.id}-${Date.now()}.${fileExtension}`;
            const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);
            proofUrl = data.publicUrl;
            fileStatus.textContent = 'อัปโหลดไฟล์สำเร็จ!';
        }
        const { error: dbError } = await supabase.from('submissions').upsert({
            student_id: currentUser.id,
            mission_id: currentlyOpenMission.id,
            submitted_at: new Date().toISOString(),
            status: 'pending',
            proof_url: proofUrl
        }, { onConflict: 'student_id, mission_id' });
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
    modalHeader.innerHTML = `<img src="${profileImageUrl}" alt="Profile"><div class="student-summary"><h3>${studentInfo.username}</h3><p>คะแนนรวม: ${studentInfo.points || 0}</p></div>`;
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
        taskItem.innerHTML = `<span class="task-name">${mission.title}</span><span class="task-status ${statusClass}">${status}</span><span>${scoreText} ${proofLink}</span>`;
        modalBody.appendChild(taskItem);
    });
}
function hideStudentDetailModal() { closeModal(studentDetailModal); }

function showProfileModal() {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อน");
        showLoginModal();
        return;
    }
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
}
function hideProfileModal() { closeModal(profileModal); }

async function handleProfilePicSubmit(event) {
    event.preventDefault();
    const saveBtn = event.target.closest('.modal-content').querySelector('#save-profile-button');
    const statusEl = event.target.closest('.modal-content').querySelector('#profile-upload-status');
    const fileInput = event.target.closest('.modal-content').querySelector('#profile-file-input');
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';
    const file = fileInput.files[0];
    if (!file) {
        statusEl.textContent = 'กรุณาเลือกรูปภาพ';
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึกรูปโปรไฟล์';
        return;
    }
    try {
        statusEl.textContent = `กำลังอัปโหลด: ${file.name}`;
        const fileExtension = file.name.split('.').pop();
        const filePath = `avatars/${currentUser.id}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newProfileUrl = data.publicUrl;
        const { error: dbError } = await supabase.from('users').update({ avatar_url: newProfileUrl }).eq('id', currentUser.id);
        if (dbError) throw dbError;
        currentUser.avatar_url = newProfileUrl;
        updateHeaderUI();
        alert('เปลี่ยนรูปโปรไฟล์สำเร็จ!');
        hideProfileModal();
    } catch (error) {
        console.error("Error uploading profile pic:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'ลองอีกครั้ง';
    }
}

function showAdminModal() { if (!currentUser || currentUser.role !== 'admin') return; openModal(adminModal); populateGradeSubmissionDropdowns(); }
function hideAdminModal() { closeModal(adminModal); }

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
    const { error } = await supabase.from('missions').insert({ title, description, due_date: dueDate, max_points: maxPoints, grade: currentGrade, is_active: true });
    if (error) {
        alert(`เกิดข้อผิดพลาดในการเพิ่มภารกิจ: ${error.message}`);
    } else {
        alert('เพิ่มภารกิจสำเร็จ!');
        document.getElementById('add-mission-form').reset();
        fetchAndDisplayMissions();
    }
}

async function populateGradeSubmissionDropdowns() {
    const studentSelect = document.getElementById('grade-student-id');
    const missionSelect = document.getElementById('grade-mission-topic');
    studentSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    missionSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    const { data: students, error: studentError } = await supabase.from('users').select('id, username').eq('role', 'student').eq('grade', currentGrade);
    if (studentError) {
        studentSelect.innerHTML = '<option value="">ไม่สามารถโหลดนักเรียนได้</option>';
    } else {
        studentSelect.innerHTML = '<option value="">เลือกนักเรียน</option>';
        if (students) students.forEach(s => { studentSelect.innerHTML += `<option value="${s.id}">${s.username}</option>`; });
    }
    const { data: missions, error: missionError } = await supabase.from('missions').select('id, title').eq('grade', currentGrade);
    if (missionError) {
        missionSelect.innerHTML = '<option value="">ไม่สามารถโหลดภารกิจได้</option>';
    } else {
        missionSelect.innerHTML = '<option value="">เลือกภารกิจ</option>';
        if (missions) missions.forEach(m => { missionSelect.innerHTML += `<option value="${m.id}">${m.title}</option>`; });
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
    const { error } = await supabase.rpc('grade_submission', { p_student_id: studentId, p_mission_id: missionId, p_score: score });
    if (error) {
        alert(`เกิดข้อผิดพลาดในการให้คะแนน: ${error.message}`);
    } else {
        alert('ให้คะแนนสำเร็จ!');
        document.getElementById('grade-submission-form').reset();
        fetchAndDisplayLeaderboard();
        fetchAndDisplayMissions();
    }
}

async function showCustomizationModal() {
    if (!currentUser) {
        alert("กรุณาล็อกอินก่อน");
        showLoginModal();
        return;
    }
    openModal(customizationModal);
    updatePreview();
    const { data: allItems, error: itemsError } = await supabase.from('cosmetic_items').select('*').order('unlock_points', { ascending: true });
    const { data: userInventory, error: inventoryError } = await supabase.from('user_inventory').select('item_id, equipped').eq('user_id', currentUser.id);
    if (itemsError || inventoryError) {
        console.error("Error fetching cosmetic data");
        return;
    }
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
    previewProfileImage.src = currentUser.avatar_url || `https://robohash.org/${currentUser.student_id}.png?set=set4&size=50x50`;
    previewUsername.textContent = currentUser.username;
    previewPoints.textContent = `${currentUser.points || 0} คะแนน`;
    const frameStyle = currentUser.equipped_frame_color && currentUser.equipped_frame_color.startsWith('linear-gradient')
        ? `border-image: ${currentUser.equipped_frame_color} 1; background-image: ${currentUser.equipped_frame_color};`
        : `border-color: ${currentUser.equipped_frame_color || '#555'};`;
    previewProfileEffect.style = frameStyle;
    previewProfileEffect.className = `profile-pic-wrapper ${currentUser.equipped_profile_effect || ''}`;
    previewCardBackground.style.background = currentUser.equipped_card_bg || '#444';
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
        const { data, error } = await supabase.rpc('equip_cosmetic_item', { p_item_id: item.id });
        if (error) throw error;
        const { data: updatedUser, error: userError } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (userError) throw userError;
        currentUser = updatedUser;
        alert(data);
        showCustomizationModal();
        fetchAndDisplayLeaderboard();
    } catch (error) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}

function setupEventListeners() {
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (modalCloseButton) modalCloseButton.addEventListener('click', hideStudentDetailModal);
    if (studentDetailModal) studentDetailModal.addEventListener('click', (event) => { if (event.target === studentDetailModal) hideStudentDetailModal(); });
    if (leaderboardContainer) leaderboardContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.leaderboard-item');
        if (item && item.dataset.userId) showStudentDetailModal(item.dataset.userId);
    });
    if (missionModal) {
        const closeBtn = missionModal.querySelector('.close-button');
        if (closeBtn) closeBtn.addEventListener('click', hideMissionModal);
        missionModal.addEventListener('click', (event) => { if (event.target === missionModal) hideMissionModal(); });
        const submissionFormEl = missionModal.querySelector('#submission-form');
        if (submissionFormEl) submissionFormEl.addEventListener('submit', handleMissionSubmit);
    }
    if (adminPanelButton) adminPanelButton.addEventListener('click', showAdminModal);
    if (adminModal) {
        const closeBtn = adminModal.querySelector('.close-button');
        if(closeBtn) closeBtn.addEventListener('click', hideAdminModal);
        adminModal.addEventListener('click', (event) => { if (event.target === adminModal) hideAdminModal(); });
        const addMissionFormEl = adminModal.querySelector('#add-mission-form');
        if (addMissionFormEl) addMissionFormEl.addEventListener('submit', handleAddMission);
        const gradeSubmissionFormEl = adminModal.querySelector('#grade-submission-form');
        if (gradeSubmissionFormEl) gradeSubmissionFormEl.addEventListener('submit', handleGradeSubmission);
    }
    if (profileModal) {
        const closeBtn = profileModal.querySelector('.close-button');
        if (closeBtn) closeBtn.addEventListener('click', hideProfileModal);
        profileModal.addEventListener('click', (event) => { if (event.target === profileModal) hideProfileModal(); });
        const saveBtn = profileModal.querySelector('#save-profile-button');
        if (saveBtn) saveBtn.addEventListener('click', handleProfilePicSubmit);
        const fileInput = profileModal.querySelector('#profile-file-input');
        if(fileInput) fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { profileModal.querySelector('#profile-pic-display').src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
    if (customizationModal) {
        const closeBtn = customizationModal.querySelector('.close-button');
        if(closeBtn) closeBtn.addEventListener('click', () => closeModal(customizationModal));
        customizationModal.addEventListener('click', (event) => { if (event.target === customizationModal) closeModal(customizationModal); });
    }
    if (loginScreen) {
        const closeBtn = loginScreen.querySelector('.close-button');
        if(closeBtn) closeBtn.addEventListener('click', () => closeModal(loginScreen));
    }
}

async function init() {
    currentGrade = getGradeFromHostname();
    classTitle.textContent = `ห้องเรียน ม.${currentGrade}`;
    document.getElementById('main-content').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    
    const storedSession = localStorage.getItem('app_user_session');
    if (storedSession) {
        currentUser = JSON.parse(storedSession);
    }

    setupEventListeners();
    updateHeaderUI();
    fetchAndDisplayLeaderboard();
    fetchAndDisplayMissions();
}

init();
