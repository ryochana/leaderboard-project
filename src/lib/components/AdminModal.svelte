<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  import { user } from '../store.js';
  import './AdminModal.css';

  const dispatch = createEventDispatcher();

  // --- State สำหรับแท็บ ---
  let adminTab = 'add'; // 'add', 'edit', 'grade'

  // --- ตรวจจับ grade จาก URL อัตโนมัติ (เหมือน Leaderboard) ---
  let currentGrade = 1; // default
  const hostname = window.location.hostname;
  
  if (hostname.includes('eng-m1') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    currentGrade = 1;
  } else if (hostname.includes('eng-m2')) {
    currentGrade = 2;
  } else if (hostname.includes('eng-m3')) {
    currentGrade = 3;
  }

  // --- State สำหรับฟอร์มเพิ่มภารกิจ ---
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
    console.log('Fetching missions for grade:', currentGrade);
    
    try {
      const { data, error } = await supabase.from('missions').select('*').eq('grade', currentGrade).order('id', { ascending: false });
      if (error) {
        console.error('Error fetching missions:', error);
        missions = [];
        throw new Error(`ไม่สามารถโหลดภารกิจได้: ${error.message}`);
      } else {
        missions = data || [];
        console.log('Filtered missions for grade', currentGrade, ':', missions);
      }
    } catch (err) {
      console.error('Error in fetchMissions:', err);
      missions = [];
      throw err;
    }
  }

  async function fetchStudents() {
    console.log('Fetching students for grade:', currentGrade);
    
    try {
      const { data, error } = await supabase.from('users').select('*').eq('grade', currentGrade).order('display_name', { ascending: true });
      if (error) {
        console.error('Error fetching students:', error);
        students = [];
        throw new Error(`ไม่สามารถโหลดรายชื่อนักเรียนได้: ${error.message}`);
      } else {
        students = data || [];
        console.log('Filtered students for grade', currentGrade, ':', students);
      }
    } catch (err) {
      console.error('Error in fetchStudents:', err);
      students = [];
      throw err;
    }
  }

  // --- ฟังก์ชันการทำงาน ---
  async function handleAddMission() {
    if (!missionTitle.trim()) {
      showToastMsg('กรุณากรอกหัวข้อภารกิจ');
      return;
    }
    if (!missionDueDate) {
      showToastMsg('กรุณาเลือกวันที่ส่งงาน');
      return;
    }
    if (!missionMaxPoints || missionMaxPoints < 1) {
      showToastMsg('กรุณากรอกคะแนนเต็มที่ถูกต้อง (ต้องมากกว่า 0)');
      return;
    }
    
    // ตรวจสอบวันที่ไม่ให้เป็นอดีต
    const selectedDate = new Date(missionDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      showToastMsg('วันที่ส่งงานต้องเป็นวันนี้หรือในอนาคต');
      return;
    }
    
    isMissionLoading = true;
    missionStatusMessage = '';
    try {
      const { error } = await supabase.from('missions').insert({
        title: missionTitle.trim(),
        description: missionDescription.trim() || null,
        due_date: missionDueDate,
        max_points: Number(missionMaxPoints),
        grade: currentGrade
      });
      
      if (error) {
        console.error('Insert mission error:', error);
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
      console.error('Error in handleAddMission:', err);
      showToastMsg('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่ทราบสาเหตุ'));
    } finally {
      isMissionLoading = false;
    }
  }

  async function handleEditMission() {
    if (!editingMission) return;
    
    if (!editTitle.trim()) {
      showToastMsg('กรุณากรอกหัวข้อภารกิจ');
      return;
    }
    if (!editDueDate) {
      showToastMsg('กรุณาเลือกวันที่ส่งงาน');
      return;
    }
    if (!editMaxPoints || editMaxPoints < 1) {
      showToastMsg('กรุณากรอกคะแนนเต็มที่ถูกต้อง (ต้องมากกว่า 0)');
      return;
    }
    
    isMissionLoading = true;
    try {
      const { error } = await supabase.from('missions').update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate,
        max_points: Number(editMaxPoints)
      }).eq('id', editingMission.id);
      
      if (error) {
        console.error('Update mission error:', error);
        showToastMsg('เกิดข้อผิดพลาด: ' + error.message);
      } else {
        showToastMsg('บันทึกการแก้ไขสำเร็จ!');
        await fetchMissions();
        editingMission = null;
      }
    } catch (err) {
      console.error('Error in handleEditMission:', err);
      showToastMsg('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่ทราบสาเหตุ'));
    } finally {
      isMissionLoading = false;
    }
  }

  async function handleDeleteMission(missionId) {
    if (!confirm('แน่ใจหรือไม่ที่จะลบภารกิจนี้? การลบจะไม่สามารถย้อนกลับได้')) {
      return;
    }
    
    try {
      // ลบ submissions ที่เกี่ยวข้องก่อน
      const { error: submissionError } = await supabase
        .from('submissions')
        .delete()
        .eq('mission_id', missionId);
      
      if (submissionError) {
        console.warn('Warning deleting submissions:', submissionError);
      }
      
      // ลบภารกิจ
      const { error: missionError } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);
        
      if (missionError) {
        showToastMsg('เกิดข้อผิดพลาดในการลบภารกิจ: ' + missionError.message);
      } else {
        showToastMsg('ลบภารกิจสำเร็จ!');
        await fetchMissions();
      }
    } catch (err) {
      showToastMsg('เกิดข้อผิดพลาด: ' + err.message);
    }
  }

  async function handleGradeSubmission() {
    if (!selectedStudentId) {
      showToastMsg('กรุณาเลือกนักเรียน');
      return;
    }
    if (!selectedMissionId) {
      showToastMsg('กรุณาเลือกภารกิจ');
      return;
    }
    if (score === '' || score === null || score === undefined) {
      showToastMsg('กรุณากรอกคะแนน');
      return;
    }
    if (isNaN(Number(score))) {
      showToastMsg('กรุณากรอกคะแนนเป็นตัวเลข');
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
      // บันทึกคะแนนในตาราง submissions
      const { error: submissionError } = await supabase.from('submissions')
        .upsert({
          student_id: selectedStudentId,
          mission_id: selectedMissionId,
          grade: Number(score),
          status: 'graded',
          submitted_at: new Date().toISOString()
        }, { onConflict: 'student_id,mission_id' });
      
      if (submissionError) {
        console.error('Submission error:', submissionError);
        throw new Error('ไม่สามารถบันทึกคะแนนได้: ' + submissionError.message);
      }

      // อัปเดตคะแนนรวมของนักเรียน
      const { error: rpcError } = await supabase.rpc('update_single_student_points', { 
        p_user_id: selectedStudentId 
      });
      
      if (rpcError) {
        console.error('RPC error:', rpcError);
        // แม้ RPC ล้มเหลว แต่การบันทึกคะแนนสำเร็จแล้ว
        console.warn('Points update failed but grade was saved:', rpcError.message);
      }

      gradeStatusMessage = 'บันทึกคะแนนสำเร็จ!';
      showToastMsg(gradeStatusMessage);

      // รีเซ็ตฟอร์ม
      selectedStudentId = '';
      selectedMissionId = '';
      score = '';
      selectedSubmissionId = '';
      selectedMissionMaxPoints = null;
      
    } catch (error) {
      console.error('Error in handleGradeSubmission:', error);
      gradeStatusMessage = `เกิดข้อผิดพลาด: ${error.message || 'ไม่ทราบสาเหตุ'}`;
      showToastMsg(gradeStatusMessage);
    } finally {
      isGradingLoading = false;
    }
  }

  // onMount จะทำงานเมื่อ Modal ถูกเปิดขึ้นมา
  onMount(async () => {
    if (!$user) {
      loadError = 'กรุณาเข้าสู่ระบบก่อนใช้งาน Admin Panel';
      return;
    }
    if ($user.role !== 'admin') {
      loadError = 'คุณไม่มีสิทธิ์เข้าถึง Admin Panel';
      return;
    }
    
    isLoadingData = true;
    loadError = '';
    try {
      console.log('Loading admin data for grade:', currentGrade);
      await Promise.all([fetchStudents(), fetchMissions()]);
    } catch (err) {
      console.error('Error loading admin data:', err);
      loadError = 'โหลดข้อมูลล้มเหลว: ' + (err.message || 'ไม่ทราบสาเหตุ');
      showToastMsg(loadError);
    } finally {
      isLoadingData = false;
    }
  });

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
        <h3>เพิ่มภารกิจใหม่ (ม.{currentGrade})</h3>
        <form class="admin-form" on:submit|preventDefault={handleAddMission}>
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
            {isMissionLoading ? 'กำลังบันทึก...' : `เพิ่มภารกิจสำหรับ ม.${currentGrade}`}
          </button>
        </form>
        {#if missionStatusMessage}<p class="status">{missionStatusMessage}</p>{/if}
      </div>

    <!-- แก้ไขภารกิจเดิม -->
    {:else if adminTab === 'edit'}
      <div class="admin-section">
        <h3>แก้ไขภารกิจเดิม (ม.{currentGrade})</h3>
        
        {#if isLoadingData}
          <p class="loading">กำลังโหลดข้อมูลภารกิจ...</p>
        {:else if missions.length === 0}
          <p class="no-data">ไม่มีภารกิจสำหรับชั้น ม.{currentGrade}</p>
        {:else}
          <div class="mission-list">
            {#each missions as m}
              <div class="mission-item">
                <div>
                  <b>{m.title}</b> <small>({m.due_date})</small> คะแนนเต็ม: {m.max_points}
                </div>
                <div class="mission-actions">
                  <button type="button" class="edit-btn" on:click={() => startEditMission(m)}>แก้ไข</button>
                  <button type="button" class="delete-btn" on:click={() => handleDeleteMission(m.id)}>ลบ</button>
                </div>
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
        <h3>บันทึกคะแนนงาน (ม.{currentGrade})</h3>
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
  
  .mission-actions {
    display: flex;
    gap: 0.5em;
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
  
  .edit-btn:hover {
    background: #1565c0;
  }
  
  .delete-btn {
    background: #d32f2f;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 0.2em 1em;
    cursor: pointer;
    font-size: 0.95em;
  }
  
  .delete-btn:hover {
    background: #c62828;
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
