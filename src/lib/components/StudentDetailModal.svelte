<script>
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  export let studentId = '';
  export let onClose = () => {};

  let submissions = [];
  let student = null;
  let isLoading = true;
  let modalContent;

  // ดึงข้อมูลเมื่อ studentId เปลี่ยน
  $: if (studentId) loadData();

  async function loadData() {
    isLoading = true;
    const { data: stu } = await supabase.from('users').select('*').eq('id', studentId).single();
    student = stu;
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, missions(*)')
      .eq('student_id', studentId);
    submissions = subs || [];
    isLoading = false;
  }

  $: total = submissions?.reduce((sum, s) => sum + (s.grade || 0), 0);

  onMount(() => {
    modalContent && modalContent.focus();
  });
</script>

<div class="modal" on:click|self={onClose}>
  <div
    class="modal-content"
    tabindex="0"
    bind:this={modalContent}
    on:keydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="modal-header modal-header-center">
      <div class="profile-pic-wrapper">
        {#if student?.equipped_frame_color}
          <img class="profile-frame" src={student.equipped_frame_color} alt="frame" />
        {/if}
        <img
          class="profile-avatar"
          src={student?.avatar_url || '/default-avatar.png'}
          alt="avatar"
          style={student?.frame_color ? `border: 4px solid ${student.frame_color}` : ''}
        />
      </div>
      <div class="profile-name">
        <h2>{student?.display_name}</h2>
        <span class="profile-grade">({student?.grade})</span>
      </div>
      <span class="close-button" on:click={onClose}>×</span>
    </div>
    <div class="modal-body">
      {#if isLoading}
        <div class="loading">กำลังโหลด...</div>
      {:else}
        <div class="summary-row">
          <span>คะแนนรวม:</span>
          <span class="total-score">{total}</span>
        </div>
        <table class="task-table">
          <thead>
            <tr>
              <th>ภารกิจ</th>
              <th>คะแนน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {#each submissions as s}
              <tr>
                <td>{s.missions.title}</td>
                <td>{s.grade ?? '-'}</td>
                <td>
                  <span class="status-badge {s.status}">
                    {s.status === 'graded' ? 'ตรวจแล้ว' : s.status === 'pending' ? 'รอตรวจ' : 'ยังไม่ส่ง'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>

<style>
.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1em;
}
.modal-content {
  background: #fff;
  padding: 2em 2.5em;
  border-radius: 16px;
  min-width: 320px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  outline: none;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5em;
  gap: 1em;
}
.modal-header-center {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: none;
  gap: 0.5em;
  margin-bottom: 0.5em;
  padding-bottom: 0;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.2em;
  font-weight: bold;
  flex: 1;
  word-break: break-word;
}
.profile-pic-wrapper {
  position: relative;
  width: 110px;
  height: 110px;
  margin-bottom: 0.5em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-frame {
  position: absolute;
  width: 110px;
  height: 110px;
  top: 0; left: 0;
  z-index: 2;
  pointer-events: none;
}
.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  border: 4px solid #e0e0e0;
  z-index: 1;
  position: relative;
}
.profile-name {
  text-align: center;
  margin-top: 0.3em;
}
.profile-name h2 {
  margin: 0;
  font-size: 1.3em;
  font-weight: bold;
}
.profile-grade {
  color: #888;
  font-size: 1em;
  margin-left: 0.3em;
}
.close-button {
  position: absolute;
  top: 1em;
  right: 1em;
  font-size: 2em;
  cursor: pointer;
  color: #888;
  transition: color 0.2s;
}
.close-button:hover { color: #e74c3c; }
.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}
.summary-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 1.1em;
  font-weight: 500;
  margin-bottom: 0.5em;
  gap: 0.5em;
}
.total-score {
  color: #2196f3;
  font-size: 1.2em;
  font-weight: bold;
}
.task-table {
  width: 100%;
  border-collapse: collapse;
  background: #fafbfc;
  border-radius: 8px;
  overflow: hidden;
  font-size: 1em;
}
.task-table th, .task-table td {
  padding: 0.7em 1em;
  text-align: left;
}
.task-table th {
  background: #f0f4f8;
  font-weight: 700;
  border-bottom: 2px solid #e0e0e0;
}
.task-table tr:not(:last-child) td {
  border-bottom: 1px solid #e0e0e0;
}
.status-badge {
  display: inline-block;
  padding: 0.2em 0.8em;
  border-radius: 999px;
  font-size: 0.95em;
  font-weight: 600;
  background: #eee;
  color: #555;
}
.status-badge.graded {
  background: #4caf50;
  color: #fff;
}
.status-badge.pending {
  background: #ffc107;
  color: #333;
}
.status-badge.not_submitted {
  background: #bdbdbd;
  color: #fff;
}
.loading {
  text-align: center;
  color: #888;
  font-size: 1.1em;
  padding: 2em 0;
}
@media (max-width: 600px) {
  .modal-content {
    padding: 1em 0.5em;
    min-width: 0;
    max-width: 98vw;
  }
  .task-table th, .task-table td {
    padding: 0.5em 0.3em;
    font-size: 0.95em;
  }
  .avatar {
    width: 40px;
    height: 40px;
  }
  .profile-pic-wrapper {
    width: 70px;
    height: 70px;
  }
  .profile-frame {
    width: 70px;
    height: 70px;
  }
  .profile-avatar {
    width: 56px;
    height: 56px;
  }
}
</style>