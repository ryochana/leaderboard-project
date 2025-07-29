<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabaseClient.js';

  export let mission;
  export let submission;
  export let currentUser;

  const dispatch = createEventDispatcher();

  let submissionLink = submission?.proof_url || '';
  let fileInput;
  let statusMessage = '';
  let isLoading = false;
  
  // ฟังก์ชันส่งงานจริง
  async function handleSubmit() {
    statusMessage = '';
    if (!currentUser) {
      statusMessage = 'กรุณาเข้าสู่ระบบ';
      return;
    }
    if (!mission) {
      statusMessage = 'ไม่พบข้อมูลภารกิจ';
      return;
    }
    if (!submissionLink && !fileInput?.files[0]) {
      statusMessage = 'กรุณาแนบลิงก์หรืออัปโหลดไฟล์';
      return;
    }
    isLoading = true;
    let proof_url = submissionLink;
    // ถ้ามีไฟล์ ให้ upload ไป storage
    if (fileInput?.files[0]) {
      const file = fileInput.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `submissions/${currentUser.id}_${mission.id}_${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage.from('files').upload(filePath, file);
      if (uploadError) {
        statusMessage = 'อัปโหลดไฟล์ล้มเหลว: ' + uploadError.message;
        isLoading = false;
        return;
      }
      // get public url
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath);
      proof_url = urlData?.publicUrl || '';
    }
    // upsert submission
    const { error } = await supabase.from('submissions').upsert({
      student_id: currentUser.id,
      mission_id: mission.id,
      proof_url,
      status: 'pending',
      submitted_at: new Date().toISOString()
    }, { onConflict: ['student_id', 'mission_id'] });
    if (error) {
      statusMessage = 'ส่งงานล้มเหลว: ' + error.message;
    } else {
      statusMessage = 'ส่งงานสำเร็จ!';
      dispatch('close'); // ปิด modal หลังส่งงาน
    }
    isLoading = false;
  }
</script>

<div class="modal" style="display: flex;">
  <div class="modal-content">
    <span class="close-button" on:click={() => dispatch('close')}>×</span>
    <div id="mission-modal-header">
      <h3>{mission.title}</h3>
      <p>{mission.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
    </div>
    <div id="mission-modal-body">
      <div id="submission-status">
        {#if submission}
          {#if submission.status === 'graded'}
            <p class="status-graded">ตรวจแล้ว! คุณได้ <b>{submission.grade}</b> คะแนน</p>
          {:else}
            <p class="status-pending">ส่งงานแล้ว - รอการตรวจ</p>
          {/if}
        {/if}
      </div>
      <!-- เราจะแสดงฟอร์มเฉพาะเมื่อยังไม่เคยส่ง หรือยังไม่ตรวจ -->
      {#if !submission || submission.status === 'pending'}
      <form on:submit|preventDefault={handleSubmit}>
        <p>ส่งงานโดยแนบลิงก์ (เช่น Google Docs) หรืออัปโหลดไฟล์</p>
        <div class="form-group">
            <label for="submission-link">ลิงก์ส่งงาน (ถ้ามี)</label>
            <input type="url" id="submission-link" placeholder="https://..." bind:value={submissionLink}>
        </div>
        <div class="form-group">
            <label for="submission-file">อัปโหลดไฟล์ (ถ้ามี)</label>
            <input type="file" id="submission-file" bind:this={fileInput}>
            <small>{statusMessage}</small>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'กำลังส่ง...' : (submission ? 'ส่งงานอีกครั้ง' : 'ส่งงาน')}
        </button>
      </form>
      {/if}
    </div>
  </div>
</div>