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
const modalCloseButton = document.querySelector('#student-detail-modal .close-button'); // Ensure it targets correct modal
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


// ================================================================
// STATE MANAGEMENT
// ================================================================
let currentUser = null;
let currentGrade = 0;
let currentlyOpenMission = null;


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
    
    // Check for a logged-in user from previous session
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
    // For local testing or if no grade is found
    console.warn("Could not determine grade from hostname, defaulting to 2.");
    return 2; 
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
        .select('*') // Get all user data at once
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

        // Display Admin Panel button if user is admin
        if (adminPanelButton && currentUser.role === 'admin') {
            adminPanelButton.style.display = 'block';
        } else if (adminPanelButton) {
            adminPanelButton.style.display = 'none';
        }

    } else {
        // Logged out state
        userProfile.style.display = 'none';
        logoutButton.textContent = 'เข้าสู่ระบบ';
        logoutButton.onclick = showLoginScreen;
        if (adminPanelButton) {
            adminPanelButton.style.display = 'none'; // Hide Admin Panel button
        }
    }
}

/**
 * Shows the login modal.
 */
function showLoginScreen() {
    loginError.textContent = ''; // Clear previous errors
    loginForm.reset(); // Clear form fields
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
    
    // Call the RPC function (Database function) for optimized leaderboard data
    const { data, error } = await supabase
        .rpc('get_leaderboard_data', {
            p_grade_id: currentGrade
        });

    if (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardContainer.innerHTML = `<p class="error-message">ไม่สามารถโหลดข้อมูล Leaderboard ได้</p>`;
        return;
    }
    
    // Data is already sorted and calculated by the database function
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
        item.dataset.studentId = student.student_id; // Store student_id for click event

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
    
    // 1. Fetch all missions for the current grade
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('grade', currentGrade)
        .order('due_date', { ascending: true }); // Sort by due date for sequential display

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
        const missionDueDate = new Date(mission.due_date);
        let statusClass = 'status-not-submitted'; // Default status
        let submission = null; // Declare submission outside the if block

        // Determine status if a user is logged in
        if (currentUser) {
            submission = submissionMap.get(mission.id); // Assign value here
            if (submission) {
                statusClass = submission.score !== null ? 'status-graded' : 'status-pending';
            } else {
                // Not submitted yet, check for urgency or if it's overdue
                if (now > missionDueDate) {
                    statusClass = 'status-overdue';
                } else if (missionDueDate <= twoDaysFromNow) {
                    statusClass = 'status-urgent';
                }
            }
        } else {
            // Public view, only check for overdue
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
        
        node.onclick = () => openMissionModal(mission, submission); // Pass mission and submission

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

/**
 * Shows the student detail modal.
 * @param {string} studentId The ID of the student to show details for.
 */
async function showStudentDetailModal(studentId) {
    studentDetailModal.style.display = 'block';
    modalHeader.innerHTML = '<div class="loader"></div>';
    modalBody.innerHTML = '';

    // 1. Fetch all missions for the current grade
    const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('id, topic, detail, max_points') // Only select necessary fields
        .eq('grade', currentGrade)
        .order('due_date', { ascending: false });
    
    if (missionsError) {
        modalHeader.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลภารกิจได้</p>';
        return;
    }

    // 2. Fetch all submissions for this specific student
    const { data: studentSubmissions, error: subsError } = await supabase
        .from('submissions')
        .select('mission_id, score, proof_url') // Select proof_url if needed for detail view
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
    modalBody.innerHTML = ''; // Clear previous content
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
// ADMIN PANEL FUNCTIONS
// ================================================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('คุณไม่มีสิทธิ์เข้าถึง Admin Panel');
        return;
    }
    adminModal.style.display = 'block';
    appContainer.classList.add('blur-background');

    // Populate dropdowns when modal is shown
    populateGradeSubmissionDropdowns();
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

    // Create Admin Token for Header (Base64 encoded)
    const adminToken = btoa(JSON.stringify({ student_id: currentUser.student_id, role: currentUser.role }));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-mission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`, 
            },
            body: JSON.stringify({
                missionData: { 
                    topic: topic,
                    detail: detail,
                    assignedDate: new Date().toISOString(),
                    dueDate: new Date(dueDate).toISOString(),
                    maxPoints: maxPoints,
                    grade: currentGrade,
                }
            })
        });

        const result = await response.json();

        if (response.ok) { // response.ok is true for 2xx status codes
            alert('เพิ่มภารกิจสำเร็จ!');
            addMissionForm.reset();
            fetchAndDisplayMissions(); // Refresh mission list
        } else {
            console.error('API Error Response:', result);
            throw new Error(result.error || response.statusText || 'Failed to add mission');
        }
    } catch (error) {
        console.error('Error adding mission:', error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มภารกิจ: ${error.message}`);
    }
}

async function populateGradeSubmissionDropdowns() {
    const studentDropdown = document.getElementById('grade-student-id');
    const missionDropdown = document.getElementById('grade-mission-topic');
    
    studentDropdown.innerHTML = '<option value="">เลือกนักเรียน</option>';
    missionDropdown.innerHTML = '<option value="">เลือกภารกิจ</option>';

    // Fetch students for the current grade
    const { data: students, error: studentError } = await supabase
        .from('users')
        .select('student_id, full_name')
        .eq('grade', currentGrade)
        .eq('role', 'student');
    
    if (studentError) { console.error('Error fetching students:', studentError); return; }
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.student_id;
        option.textContent = `${s.full_name} (${s.student_id})`;
        studentDropdown.appendChild(option);
    });

    // Fetch missions for the current grade
    const { data: missions, error: missionError } = await supabase
        .from('missions')
        .select('id, topic')
        .eq('grade', currentGrade);
    
    if (missionError) { console.error('Error fetching missions:', missionError); return; }
    missions.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id; // Use mission.id
        option.textContent = m.topic;
        missionDropdown.appendChild(option);
    });
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

    // Create Admin Token for Header (Base64 encoded)
    const adminToken = btoa(JSON.stringify({ student_id: currentUser.student_id, role: currentUser.role }));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/grade-submission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}` // Send the created token
            },
            body: JSON.stringify({
                studentId: parseInt(studentId, 10),
                missionId: parseInt(missionId, 10),
                score: score,
                userToken: adminToken // Send the token in body for admin verification in Edge Function
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('บันทึกคะแนนสำเร็จ!');
            gradeSubmissionForm.reset();
            // Refresh leaderboard and missions to show updated data
            fetchAndDisplayLeaderboard();
            fetchAndDisplayMissions();
        } else {
            console.error('API Error Response:', result);
            throw new Error(result.error || response.statusText || 'Failed to grade submission');
        }
    } catch (error) {
        console.error('Error grading submission:', error);
        alert(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
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
init();
