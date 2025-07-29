<script>
  // --- State สำหรับแท็บ ---
  let adminTab = 'add'; // 'add', 'edit', 'grade'
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  import { user } from '../store.js';
  import './AdminModal.css';

  const dispatch = createEventDispatcher();

  // --- State สำหรับฟอร์มเพิ่มภารกิจ ---
  let selectedGrade = "1";
  let selectedStudentId = "";
  let selectedMissionId = "";
  let score = "";
  // $: console.log('$user', $user); // Debug เท่านั้น
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

  // --- ฟังก์ชันดึงข้อมูล (mock/fetch จริง) ---
  async function fetchMissions() {
    // ตัวอย่าง mock: สามารถแก้ไขให้ดึงจาก supabase จริงได้
    const { data, error } = await supabase.from('missions').select('*');
    if (!error) {
      missions = data || [];
    } else {
      missions = [];
    }
  }

  async function fetchStudents() {
    // ตัวอย่าง mock: สามารถแก้ไขให้ดึงจาก supabase จริงได้
    const { data, error } = await supabase.from('students').select('*');
    if (!error) {
      students = data || [];
    } else {
      students = [];
    }
  }

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
        max_points: missionMaxPoints
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
      missions = [];
      throw err;
    } finally {
      isMissionLoading = false;
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

  // อัปเดตข้อมูลเมื่อเปลี่ยนเกรด (admin)
  let prevSelectedGrade = selectedGrade;
  // debounce การโหลดข้อมูลเมื่อเปลี่ยนเกรด (admin)
  let debounceTimer;
  $: if ($user?.role === 'admin' && selectedGrade !== prevSelectedGrade) {
    prevSelectedGrade = selectedGrade;
    selectedStudentId = '';
    selectedMissionId = '';
    score = '';
    selectedSubmissionId = '';
    isLoadingData = true;
    loadError = '';
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      Promise.all([fetchStudents(), fetchMissions()])
        .catch(err => {
          loadError = 'โหลดข้อมูลล้มเหลว: ' + err.message;
          showToastMsg(loadError);
        })
        .finally(() => { isLoadingData = false; });
    }, 300); // 300ms debounce
  }

  async function handleGradeSubmission() {
    // Validation เพิ่มเติม
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
    let gradeNum = selectedGrade;
    if (typeof gradeNum === 'string') gradeNum = gradeNum.trim();
    if (gradeNum === '' || typeof gradeNum === 'undefined' || gradeNum === null || isNaN(Number(gradeNum))) {
      showToastMsg('ไม่พบข้อมูลระดับชั้นของผู้ใช้');
      return;
    }
    gradeNum = Number(gradeNum);
    isGradingLoading = true;
    gradeStatusMessage = '';

    try {
      // upsert โดยใช้ student_id + mission_id เป็น key
      // แก้ชื่อฟิลด์ submitted_at ให้ตรงกับฐานข้อมูล
      const { error: submissionError } = await supabase.from('submissions')
        .upsert({
          student_id: selectedStudentId,
          mission_id: selectedMissionId,
          grade: Number(score),
          status: 'graded',
          submitted_at: new Date().toISOString()
        }, { onConflict: ['student_id', 'mission_id'] });
      if (submissionError) throw submissionError;

      // อัปเดตคะแนนรวม
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

  // เพิ่มฟังก์ชันลบคะแนน
  async function handleDeleteSubmission() {
    if (!selectedSubmissionId) {
      showToastMsg('กรุณาเลือก submission ที่ต้องการลบ');
      return;
    }
    isGradingLoading = true;
    try {
      const { error } = await supabase.from('submissions').delete().eq('id', selectedSubmissionId);
      if (error) throw error;
      showToastMsg('ลบคะแนนสำเร็จ!');
      // รีเฟรชคะแนนในฟอร์ม
      score = '';
      selectedSubmissionId = '';
    } catch (error) {
      showToastMsg('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      isGradingLoading = false;
    }
  }

  // ดึงคะแนนเดิมเมื่อเลือกนักเรียน+ภารกิจ
  let submissions = [];
  async function fetchSubmissions() {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, student_id, mission_id, grade')
      .eq('student_id', selectedStudentId)
      .eq('mission_id', selectedMissionId);
    if (!error && data && data.length > 0) {
      score = data[0].grade !== null ? data[0].grade : '';
      selectedSubmissionId = data[0].id;
    } else {
      score = '';
      selectedSubmissionId = '';
    }
  }

  // ป้องกัน fetch ซ้อนด้วย debounce
  let fetchSubmissionsTimer;
  $: if (selectedStudentId && selectedMissionId) {
    if (fetchSubmissionsTimer) clearTimeout(fetchSubmissionsTimer);
    fetchSubmissionsTimer = setTimeout(async () => {
      try {
        await fetchSubmissions();
      } catch (err) {
        showToastMsg('โหลดคะแนนล้มเหลว: ' + err.message);
      }
    }, 200); // 200ms debounce
  }

// --- แนะนำ: สามารถแยกฟอร์มเพิ่มภารกิจ, ฟอร์มให้คะแนน, Toast, Loading, Error เป็นคอมโพเนนต์ย่อยได้ ---
// เช่น <AddMissionForm /> <GradeForm /> <Toast /> <LoadingSpinner /> เพื่อให้ดูแลรักษาง่ายขึ้น
</script>


<div class="modal">
  <div class="modal-content" tabindex="0">
    <span class="close-button" on:click={() => dispatch('close')}>×</span>
    <h2 class="admin-title">Admin Panel</h2>
    {#if showToast}
      <div class="toast">{toastMessage}</div>
    {/if}
    <div class="admin-section">
      <h3>เพิ่มภารกิจใหม่</h3>
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
          {isMissionLoading ? 'กำลังบันทึก...' : 'เพิ่มภารกิจ'}
        </button>
      </form>
      {#if missionStatusMessage}<p class="status">{missionStatusMessage}</p>{/if}

      <hr class="admin-divider">
      <h3>แก้ไขภารกิจเดิม</h3>
      <div class="mission-list">
        {#each missions as m}
          <div class="mission-item">
            <div>
              <b>{m.title}</b> <small>({m.due_date})</small> คะแนนเต็ม: {m.max_points}
            </div>
            <button type="button" class="edit-btn" on:click={() => startEditMission(m)}>แก้ไข</button>
          </div>
          {#if editingMission && editingMission.id === m.id}
            <form class="admin-form" on:submit|preventDefault={handleEditMission} style="margin:0.5em 0 1em 0;background:#f8f8f8;padding:1em;border-radius:8px;">
              <h4>แก้ไขภารกิจ</h4>
              <div class="form-group">
                <label>หัวข้อภารกิจ</label>
                <input type="text" bind:value={editTitle} required>
              </div>
              <div class="form-group">
                <label>รายละเอียด</label>
                <textarea bind:value={editDescription}></textarea>
              </div>
              <div class="form-group">
                <label>วันที่ส่ง</label>
                <input type="date" bind:value={editDueDate} required>
              </div>
              <div class="form-group">
                <label>คะแนนเต็ม</label>
                <input type="number" min="1" bind:value={editMaxPoints} required>
              </div>
              <button type="submit" class="primary" disabled={isMissionLoading}>บันทึกการแก้ไข</button>
              <button type="button" on:click={cancelEditMission} style="margin-left:1em;">ยกเลิก</button>
            </form>
          {/if}
        {/each}

      </div>
    </div>

<style>
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
  .mission-list {
    margin-top: 1em;
    margin-bottom: 1em;
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
    transition: background 0.2s;
  }
  .edit-btn:hover {
    background: #1565c0;
  }
</style>
    <hr class="admin-divider">
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
            />
          </div>
          <button type="submit" class="primary" disabled={isGradingLoading || !selectedStudentId || !selectedMissionId}>
            {isGradingLoading ? 'กำลังบันทึก...' : (selectedSubmissionId ? 'แก้ไขคะแนน' : 'บันทึกคะแนน')}
          </button>
          {#if selectedSubmissionId}
            <button type="button" class="danger" on:click={handleDeleteSubmission} disabled={isGradingLoading}>ลบคะแนน</button>
          {/if}
        </form>
        {#if gradeStatusMessage}<p class="status">{gradeStatusMessage}</p>{/if}
      {/if}
    </div>
  </div>
</div>

