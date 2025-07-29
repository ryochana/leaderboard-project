<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  import { user } from '../store.js';
  import './AdminModal.css';

  const dispatch = createEventDispatcher();

  // --- State สำหรับแท็บ ---
  let adminTab = 'add'; // 'add', 'edit', 'grade'

  // --- State สำหรับฟอร์มเพิ่มภารกิจ ---
  let selectedGrade = "1";
  let selectedStudentId = "";
  let selectedMissionId = "";
  let score = "";
  let missionTitle = '';
  let missionDescription = '';
  let missionDueDate = '';
  let missionMaxPoints = 10;
  let isMissionLoading = false;
  let missionStatusMessage = '';

  // --- State สำหรับข้อมูลที่ใช้ใน admin panel ---
  let missions = [];
  let students = [];
  let isLoadingData = false;
  let loadError = '';
  let selectedSubmissionId = '';
  let selectedMissionMaxPoints = null;
  let isGradingLoading = false;
  let gradeStatusMessage = '';

  // --- Toast State ---
  let toastMessage = '';
  let showToast = false;
  function showToastMsg(msg) {
    toastMessage = msg;
    showToast = true;
    setTimeout(() => showToast = false, 2500);
  }

  // --- State สำหรับแก้ไขภารกิจ ---
  let editingMission = null;
  let editTitle = '';
  let editDescription = '';
  let editDueDate = '';
  let editMaxPoints = 1;

  function startEditMission(m) {
    editingMission = m;
    editTitle = m.title;
    editDescription = m.description || '';
    editDueDate = m.due_date ? m.due_date.slice(0,10) : '';
    editMaxPoints = m.max_points;
  }
  function cancelEditMission() {
    editingMission = null;
  }

  // --- ฟังก์ชันดึงข้อมูล ---
  async function fetchMissions() {
    const gradeNum = parseInt(selectedGrade);
    console.log('Fetching missions for grade:', gradeNum);
    
    const { data, error } = await supabase.from('missions').select('*').eq('grade_id', gradeNum);
    if (!error) {
      missions = data || [];
      console.log('Filtered missions for grade', gradeNum, ':', missions);
    } else {
      console.error('Error fetching missions:', error);
      missions = [];
    }
  }

  async function fetchStudents() {
    const gradeNum = parseInt(selectedGrade);
    console.log('Fetching students for grade:', gradeNum);
    
    const { data, error } = await supabase.from('students').select('*').eq('grade_id', gradeNum);
    if (!error) {
      students = data || [];
      console.log('Filtered students for grade', gradeNum, ':', students);
    } else {
      console.error('Error fetching students:', error);
      students = [];
    }
  }

  // --- ฟังก์ชันการทำงาน ---
  async function handleAddMission() {
    if (!missionTitle.trim() || !missionDueDate || !missionMaxPoints) {
      showToastMsg('กรุณากรอกข้อมูลภารกิจให้ครบถ้วน');
      return;
    }
    isMissionLoading = true;
    missionStatusMessage = '';
    try {
      const { error } = await supabase.from('missions').insert({
        title: missionTitle.trim(),
        description: missionDescription.trim(),
        due_date: missionDueDate,
        max_points: missionMaxPoints,
        grade_id: parseInt(selectedGrade)
      });
      if (error) {
        showToastMsg('เกิดข้อผิดพลาด: ' + error.message);
      } else {
        showToastMsg('เพิ่มภารกิจสำเร็จ!');
        missionTitle = '';
        missionDescription = '';
        missionDueDate = '';
        missionMaxPoints = 10;
        await fetchMissions();
      }
    } catch (err) {
      showToastMsg('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      isMissionLoading = false;
    }
  }

  async function handleEditMission() {
    if (!editingMission) return;
    isMissionLoading = true;
    const { error } = await supabase.from('missions').update({
      title: editTitle.trim(),
      description: editDescription.trim(),
      due_date: editDueDate,
      max_points: editMaxPoints
    }).eq('id', editingMission.id);
    if (error) {
      showToastMsg('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      showToastMsg('บันทึกการแก้ไขสำเร็จ!');
      await fetchMissions();
      editingMission = null;
    }
    isMissionLoading = false;
  }

  async function handleGradeSubmission() {
    if (!selectedStudentId || !selectedMissionId || score === '' || isNaN(Number(score))) {
      showToastMsg('กรุณาเลือกข้อมูลให้ครบถ้วนและกรอกคะแนน');
      return;
    }
    if (!Number.isInteger(Number(score))) {
      showToastMsg('กรุณากรอกคะแนนเป็นจำนวนเต็ม');
      return;
    }
    if (Number(score) < 0) {
      showToastMsg('คะแนนต้องไม่ติดลบ');
      return;
    }
    if (selectedMissionMaxPoints !== null && Number(score) > selectedMissionMaxPoints) {
      showToastMsg(`คะแนนต้องไม่เกิน ${selectedMissionMaxPoints}`);
      return;
    }

    isGradingLoading = true;
    gradeStatusMessage = '';

    try {
      const { error: submissionError } = await supabase.from('submissions')
        .upsert({
          student_id: selectedStudentId,
          mission_id: selectedMissionId,
          grade: Number(score),
          status: 'graded',
          submitted_at: new Date().toISOString()
        }, { onConflict: 'student_id,mission_id' });
      if (submissionError) throw submissionError;

      const { error: rpcError } = await supabase.rpc('update_single_student_points', { p_user_id: selectedStudentId });
      if (rpcError) throw rpcError;

      gradeStatusMessage = 'บันทึกคะแนนสำเร็จ!';
      showToastMsg(gradeStatusMessage);

      selectedStudentId = '';
      selectedMissionId = '';
      score = '';
      selectedSubmissionId = '';
    } catch (error) {
      gradeStatusMessage = `เกิดข้อผิดพลาด: ${error.message}`;
      showToastMsg(gradeStatusMessage);
    } finally {
      isGradingLoading = false;
    }
  }

  // onMount จะทำงานเมื่อ Modal ถูกเปิดขึ้นมา
  onMount(async () => {
    if (!$user) return;
    isLoadingData = true;
    loadError = '';
    try {
      await fetchStudents();
      await fetchMissions();
    } catch (err) {
      loadError = 'โหลดข้อมูลล้มเหลว: ' + err.message;
      showToastMsg(loadError);
    } finally {
      isLoadingData = false;
    }
  });

  // อัปเดตข้อมูลเมื่อเปลี่ยนเกรด
  let prevSelectedGrade = selectedGrade;
  let debounceTimer;
  $: if ($user?.role === 'admin' && selectedGrade !== prevSelectedGrade) {
    console.log('Grade changed from', prevSelectedGrade, 'to', selectedGrade);
    prevSelectedGrade = selectedGrade;
    selectedStudentId = '';
    selectedMissionId = '';
    score = '';
    selectedSubmissionId = '';
    isLoadingData = true;
    loadError = '';
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('Starting to fetch data for grade:', selectedGrade);
      Promise.all([fetchStudents(), fetchMissions()])
        .catch(err => {
          console.error('Error loading data:', err);
          loadError = 'โหลดข้อมูลล้มเหลว: ' + err.message;
          showToastMsg(loadError);
        })
        .finally(() => { isLoadingData = false; });
    }, 300);
  }

  // อัปเดต selectedMissionMaxPoints เมื่อเลือก mission
  $: if (selectedMissionId) {
    const selectedMission = missions.find(m => m.id === selectedMissionId);
    selectedMissionMaxPoints = selectedMission ? selectedMission.max_points : null;
  } else {
    selectedMissionMaxPoints = null;
  }
</script>

<div class="modal">
  <div class="modal-content">
    <button class="close-button" on:click={() => dispatch('close')}>×</button>
    <h2 class="admin-title">Admin Panel</h2>
    {#if showToast}
      <div class="toast">{toastMessage}</div>
    {/if}
    
    <!-- Tab buttons -->
    <div class="admin-tabs">
      <button class:active={adminTab === 'add'} on:click={() => adminTab = 'add'}>เพิ่มภารกิจ</button>
      <button class:active={adminTab === 'edit'} on:click={() => adminTab = 'edit'}>แก้ไข</button>
      <button class:active={adminTab === 'grade'} on:click={() => adminTab = 'grade'}>ให้คะแนน</button>
    </div>

    <!-- เพิ่มภารกิจใหม่ -->
    {#if adminTab === 'add'}
      <div class="admin-section">
        <h3>เพิ่มภารกิจใหม่</h3>
        <form class="admin-form" on:submit|preventDefault={handleAddMission}>
          <div class="form-group">
            <label for="add-mission-grade">เลือกระดับชั้น</label>
            <select id="add-mission-grade" bind:value={selectedGrade} required>
              <option value="1">ม.1</option>
              <option value="2">ม.2</option>
              <option value="3">ม.3</option>
            </select>
          </div>
          <div class="form-group">
            <label for="add-mission-topic">หัวข้อภารกิจ</label>
            <input type="text" id="add-mission-topic" bind:value={missionTitle} required>
          </div>
          <div class="form-group">
            <label for="add-mission-detail">รายละเอียด</label>
            <textarea id="add-mission-detail" bind:value={missionDescription}></textarea>
          </div>
          <div class="form-group">
            <label for="add-mission-due-date">วันที่ส่ง</label>
            <input type="date" id="add-mission-due-date" bind:value={missionDueDate} required>
          </div>
          <div class="form-group">
            <label for="add-mission-max-points">คะแนนเต็ม</label>
            <input type="number" id="add-mission-max-points" min="1" bind:value={missionMaxPoints} required>
          </div>
          <button type="submit" class="primary" disabled={isMissionLoading}>
            {isMissionLoading ? 'กำลังบันทึก...' : `เพิ่มภารกิจสำหรับ ม.${selectedGrade}`}
          </button>
        </form>
        {#if missionStatusMessage}<p class="status">{missionStatusMessage}</p>{/if}
      </div>

    <!-- แก้ไขภารกิจเดิม -->
    {:else if adminTab === 'edit'}
      <div class="admin-section">
        <h3>แก้ไขภารกิจเดิม</h3>
        <div class="form-group">
          <label for="edit-grade-select">เลือกระดับชั้น</label>
          <select id="edit-grade-select" bind:value={selectedGrade}>
            <option value="1">ม.1</option>
            <option value="2">ม.2</option>
            <option value="3">ม.3</option>
          </select>
        </div>
        
        {#if isLoadingData}
          <p class="loading">กำลังโหลดข้อมูลภารกิจ...</p>
        {:else if missions.length === 0}
          <p class="no-data">ไม่มีภารกิจสำหรับชั้น ม.{selectedGrade}</p>
        {:else}
          <div class="mission-list">
            {#each missions as m}
              <div class="mission-item">
                <div>
                  <b>{m.title}</b> <small>({m.due_date})</small> คะแนนเต็ม: {m.max_points}
                </div>
                <button type="button" class="edit-btn" on:click={() => startEditMission(m)}>แก้ไข</button>
              </div>
              {#if editingMission && editingMission.id === m.id}
                <form class="admin-form edit-form" on:submit|preventDefault={handleEditMission}>
                  <h4>แก้ไขภารกิจ: {editingMission.title}</h4>
                  <div class="form-group">
                    <label for="edit-title">หัวข้อภารกิจ</label>
                    <input id="edit-title" type="text" bind:value={editTitle} required>
                  </div>
                  <div class="form-group">
                    <label for="edit-description">รายละเอียด</label>
                    <textarea id="edit-description" bind:value={editDescription}></textarea>
                  </div>
                  <div class="form-group">
                    <label for="edit-due-date">วันที่ส่ง</label>
                    <input id="edit-due-date" type="date" bind:value={editDueDate} required>
                  </div>
                  <div class="form-group">
                    <label for="edit-max-points">คะแนนเต็ม</label>
                    <input id="edit-max-points" type="number" min="1" bind:value={editMaxPoints} required>
                  </div>
                  <button type="submit" class="primary" disabled={isMissionLoading}>บันทึกการแก้ไข</button>
                  <button type="button" on:click={cancelEditMission}>ยกเลิก</button>
                </form>
              {/if}
            {/each}
          </div>
        {/if}
      </div>

    <!-- บันทึกคะแนนงาน -->
    {:else if adminTab === 'grade'}
      <div class="admin-section">
        <h3>บันทึกคะแนนงาน</h3>
        <div class="form-group">
          <label for="select-grade">เลือกเกรด</label>
          <select id="select-grade" bind:value={selectedGrade}>
            <option value="1">ม.1</option>
            <option value="2">ม.2</option>
            <option value="3">ม.3</option>
          </select>
        </div>
        {#if isLoadingData}
          <div class="loading">กำลังโหลดข้อมูล...</div>
        {:else if loadError}
          <div class="error">{loadError}</div>
        {:else}
          <form class="admin-form" on:submit|preventDefault={handleGradeSubmission}>
            <div class="form-group">
              <label for="grade-student-id">นักเรียน</label>
              {#if students.length === 0}
                <div class="empty-info">ไม่พบนักเรียนในเกรดนี้</div>
              {:else}
                <select id="grade-student-id" bind:value={selectedStudentId} required>
                  <option value="" disabled>-- เลือกนักเรียน --</option>
                  {#each students as student}
                    <option value={student.id}>{student.display_name}</option>
                  {/each}
                </select>
              {/if}
            </div>
            <div class="form-group">
              <label for="grade-mission-topic">ภารกิจ</label>
              {#if missions.length === 0}
                <div class="empty-info">ไม่พบภารกิจในเกรดนี้</div>
              {:else}
                <select id="grade-mission-topic" bind:value={selectedMissionId} required>
                  <option value="" disabled>-- เลือกภารกิจ --</option>
                  {#each missions as mission}
                    <option value={mission.id}>{mission.title}</option>
                  {/each}
                </select>
              {/if}
              {#if selectedMissionMaxPoints !== null}
                <small>คะแนนเต็ม: {selectedMissionMaxPoints}</small>
              {/if}
            </div>
            <div class="form-group">
              <label for="grade-score">คะแนน</label>
              <input
                type="number"
                id="grade-score"
                min="0"
                max={selectedMissionMaxPoints ?? undefined}
                bind:value={score}
                required
                disabled={!selectedMissionId}
              >
            </div>
            <button type="submit" class="primary" disabled={isGradingLoading || !selectedStudentId || !selectedMissionId}>
              {isGradingLoading ? 'กำลังบันทึก...' : (selectedSubmissionId ? 'แก้ไขคะแนน' : 'บันทึกคะแนน')}
            </button>
          </form>
          {#if gradeStatusMessage}<p class="status">{gradeStatusMessage}</p>{/if}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: #fff;
    padding: 2em;
    border-radius: 12px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  }
  
  .close-button {
    position: absolute;
    top: 1em;
    right: 1em;
    background: transparent;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
  }
  
  .admin-title {
    margin-bottom: 1em;
    color: #1976d2;
  }
  
  .admin-tabs {
    display: flex;
    gap: 1em;
    margin-bottom: 1.5em;
    justify-content: flex-start;
  }
  
  .admin-tabs button {
    background: #e3f2fd;
    border: none;
    border-radius: 7px 7px 0 0;
    padding: 0.7em 1.5em;
    font-size: 1.1em;
    color: #1976d2;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;
    outline: none;
  }
  
  .admin-tabs button.active, .admin-tabs button:focus {
    background: #1976d2;
    color: #fff;
  }
  
  .admin-form {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  
  .form-group label {
    font-weight: bold;
    color: #333;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 0.5em;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1em;
  }
  
  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  button.primary {
    background: #1976d2;
    color: #fff;
    border: none;
    padding: 0.7em 1.5em;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
  }
  
  button.primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .toast {
    background: #4caf50;
    color: #fff;
    padding: 0.7em 1em;
    border-radius: 5px;
    margin-bottom: 1em;
    text-align: center;
  }
  
  .loading {
    color: #1976d2;
    font-style: italic;
    text-align: center;
    padding: 1em;
  }
  
  .no-data {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 1em;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px dashed #ddd;
  }
  
  .empty-info {
    color: #666;
    font-style: italic;
    padding: 0.5em;
    background: #f5f5f5;
    border-radius: 4px;
    text-align: center;
  }
  
  .mission-list {
    margin-top: 1em;
  }
  
  .mission-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5em 0.2em;
    border-bottom: 1px solid #eee;
  }
  
  .edit-btn {
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 0.2em 1em;
    cursor: pointer;
    font-size: 0.95em;
  }
  
  .edit-form {
    margin: 0.5em 0 1em 0;
    background: #f8f8f8;
    padding: 1em;
    border-radius: 8px;
  }
  
  .status {
    color: #4caf50;
    font-weight: bold;
    text-align: center;
  }
  
  .error {
    color: #f44336;
    font-weight: bold;
    text-align: center;
  }
</style>
