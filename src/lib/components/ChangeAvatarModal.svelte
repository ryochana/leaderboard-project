<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let file;
  let previewUrl = '';
  let error = '';
  let success = '';
  let isLoading = false;

  function handleFileChange(e) {
    file = e.target.files[0];
    error = '';
    success = '';
    if (file) {
      previewUrl = URL.createObjectURL(file);
    } else {
      previewUrl = '';
    }
  }

import { supabase } from '../supabaseClient.js';
import { user } from '../store.js';
  import { get } from 'svelte/store';

  async function handleUpload() {
    error = '';
    success = '';
    if (!file) {
      error = 'กรุณาเลือกไฟล์ภาพ';
      return;
    }
    isLoading = true;
    try {
      // 1. Upload to imgbb
      const formData = new FormData();
      formData.append('image', file);
      const imgbbKey = 'e5fca6e1e9823fa93eff7017fe015d54';
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error('อัปโหลดไป imgbb ไม่สำเร็จ');
      }
      const imageUrl = data.data.url;

      // 2. Update Supabase users table
      const currentUser = get(user);
      if (!currentUser) throw new Error('ไม่พบข้อมูลผู้ใช้');
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: imageUrl })
        .eq('id', currentUser.id);
      if (updateError) throw new Error('อัปเดตลิงก์รูปในฐานข้อมูลไม่สำเร็จ');

      // 3. Update local user store
      user.set({ ...currentUser, avatar_url: imageUrl });

      isLoading = false;
      success = 'อัปโหลดรูปโปรไฟล์สำเร็จ!';
      file = null;
      previewUrl = '';
    } catch (e) {
      isLoading = false;
      error = e.message || 'เกิดข้อผิดพลาด';
    }
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
input[type="file"] {
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
    <h2>เปลี่ยนรูปโปรไฟล์</h2>
    <form on:submit|preventDefault={handleUpload} style="margin-top:1em;">
      <div class="form-group">
        <input type="file" accept="image/*" on:change={handleFileChange} />
      </div>
      {#if previewUrl}
        <div style="margin:1em 0; text-align:center;">
          <img src={previewUrl} alt="preview" style="max-width:120px; max-height:120px; border-radius:50%; box-shadow:0 2px 8px #0002;" />
        </div>
      {/if}
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      {#if success}
        <div class="success-message">{success}</div>
      {/if}
      <button type="submit" disabled={isLoading} style="margin-top:1em;">{isLoading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}</button>
    </form>
  </div>
</div>
