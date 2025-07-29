<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let oldPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let error = '';
  let success = '';
  let isLoading = false;

  import { supabase } from '../supabaseClient.js';
  import { user } from '../store.js';
  import { get } from 'svelte/store';

  async function handleChangePassword() {
    error = '';
    success = '';
    if (!oldPassword || !newPassword || !confirmPassword) {
      error = 'กรุณากรอกข้อมูลให้ครบถ้วน';
      return;
    }
    if (newPassword !== confirmPassword) {
      error = 'รหัสผ่านใหม่ไม่ตรงกัน';
      return;
    }
    isLoading = true;
    try {
      // ต้อง login ใหม่เพื่อยืนยัน oldPassword (supabase ไม่รองรับเปลี่ยนรหัสผ่านด้วยรหัสผ่านเดิม)
      const currentUser = get(user);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword
      });
      if (signInError) {
        error = 'รหัสผ่านเดิมไม่ถูกต้อง';
        isLoading = false;
        return;
      }
      // เปลี่ยนรหัสผ่านใหม่
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        error = 'เปลี่ยนรหัสผ่านล้มเหลว: ' + updateError.message;
      } else {
        success = 'เปลี่ยนรหัสผ่านสำเร็จ!';
        oldPassword = newPassword = confirmPassword = '';
      }
    } catch (e) {
      error = 'เกิดข้อผิดพลาด: ' + (e.message || e);
    }
    isLoading = false;
  }
</script>
<style>
.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  padding: 2em 2.5em;
  border-radius: 16px;
  min-width: 320px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  outline: none;
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
.form-group {
  margin-bottom: 1.2em;
}
input[type="password"] {
  width: 100%;
  padding: 0.5em;
  margin-top: 0.2em;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1em;
}
button[type="submit"] {
  background: #607d8b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.7em 2em;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}
button[type="submit"]:hover:enabled {
  background: #455a64;
}
button[disabled] {
  background: #aaa;
  cursor: not-allowed;
}
.error-message {
  color: #e74c3c;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5em;
}
.success-message {
  color: #2196f3;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5em;
}
</style>
<div class="modal" on:click={() => dispatch('close')}>
  <div class="modal-content" on:click|stopPropagation>
    <span class="close-button" on:click={() => dispatch('close')}>×</span>
    <h2>เปลี่ยนรหัสผ่าน</h2>
    <form on:submit|preventDefault={handleChangePassword} style="margin-top:1em;">
      <div class="form-group">
        <label>รหัสผ่านเดิม</label>
        <input type="password" bind:value={oldPassword} required />
      </div>
      <div class="form-group">
        <label>รหัสผ่านใหม่</label>
        <input type="password" bind:value={newPassword} required />
      </div>
      <div class="form-group">
        <label>ยืนยันรหัสผ่านใหม่</label>
        <input type="password" bind:value={confirmPassword} required />
      </div>
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      {#if success}
        <div class="success-message">{success}</div>
      {/if}
      <button type="submit" disabled={isLoading} style="margin-top:1em;">{isLoading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </form>
  </div>
</div>
