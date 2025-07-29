
<script>
  // รับ currentUser มาจาก App.svelte
  export let currentUser;
  let isCustomizeModalOpen = false;
  let isChangePasswordModalOpen = false;
  let isChangeAvatarModalOpen = false;
  import CustomizeModal from './CustomizeModal.svelte';
  import ChangePasswordModal from './ChangePasswordModal.svelte';
  import ChangeAvatarModal from './ChangeAvatarModal.svelte';

  function openCustomizeModal() {
    isCustomizeModalOpen = true;
  }
  function closeCustomizeModal() {
    isCustomizeModalOpen = false;
  }
  function openChangePasswordModal() {
    isChangePasswordModalOpen = true;
  }
  function closeChangePasswordModal() {
    isChangePasswordModalOpen = false;
  }
  function openChangeAvatarModal() {
    isChangeAvatarModalOpen = true;
  }
  function closeChangeAvatarModal() {
    isChangeAvatarModalOpen = false;
  }
</script>

<style>
.profile-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 2em 2em 1.5em 2em;
  margin: 0 auto 1.5em auto;
  max-width: 480px;
  gap: 2em;
}
.profile-card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.profile-avatar-frame {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-frame {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}
.profile-pic-main {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 4px solid #e0e0e0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  z-index: 1;
  position: relative;
}
.profile-card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.5em;
}
.profile-name-row {
  display: flex;
  align-items: center;
  gap: 0.7em;
}
.profile-name {
  font-size: 1.5em;
  font-weight: 700;
  color: #212529;
  margin: 0;
  letter-spacing: 0.5px;
}
.profile-grade {
  color: #007BFF;
  font-size: 1.1em;
  font-weight: 600;
}
.profile-username {
  color: #6C757D;
  font-size: 1em;
  margin-bottom: 0.2em;
}
.profile-exp-bar {
  margin-top: 0.5em;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  width: 100%;
}
.profile-exp-label {
  font-size: 1.1em;
  color: #2196f3;
  font-weight: bold;
}
.profile-exp-track {
  width: 100%;
  height: 10px;
  background: #e3f2fd;
  border-radius: 6px;
  overflow: hidden;
}
.profile-exp-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3 60%, #21cbf3 100%);
  border-radius: 6px;
  transition: width 0.3s;
}
.profile-stats-row {
  display: flex;
  justify-content: center;
  gap: 1.5em;
  margin: 1.2em 0 1.5em 0;
}
.stat-card {
  background: #f8fafc;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  padding: 1em 1.5em;
  min-width: 80px;
  text-align: center;
}
.stat-label {
  color: #6C757D;
  font-size: 1em;
  font-weight: 500;
  margin-bottom: 0.2em;
}
.stat-value {
  font-size: 1.3em;
  font-weight: 700;
  color: #007BFF;
}
.profile-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
  margin-top: 1.5em;
}
@media (max-width: 600px) {
  .profile-card {
    flex-direction: column;
    align-items: center;
    gap: 1.2em;
    padding: 1.2em 0.7em 1.2em 0.7em;
  }
  .profile-card-right {
    align-items: center;
    width: 100%;
  }
  .profile-name {
    font-size: 1.2em;
  }
  .profile-exp-bar {
    width: 100%;
  }
  .profile-stats-row {
    flex-direction: column;
    gap: 0.7em;
    margin: 1em 0 1.2em 0;
  }
}
</style>

<div id="profile-container" class="content-section active">
  {#if currentUser}
    <div class="profile-card">
      <div class="profile-card-left">
        <div class="profile-avatar-frame">
          {#if currentUser.equipped_frame_color}
            <img class="profile-frame" src={currentUser.equipped_frame_color} alt="frame" />
          {/if}
          <img 
            src={currentUser.avatar_url || `https://robohash.org/${currentUser.student_id || 'default'}.png?set=set4&size=90x90`} 
            alt="Profile" 
            class="profile-pic-main"
            style={currentUser.frame_color ? `border: 4px solid ${currentUser.frame_color}` : ''}
          >
        </div>
      </div>
      <div class="profile-card-right">
        <div class="profile-name-row">
          <span class="profile-name">{currentUser.full_name || 'ไม่ระบุชื่อ'}</span>
          {#if currentUser.grade}
            <span class="profile-grade">({currentUser.grade})</span>
          {/if}
        </div>
        <div class="profile-username">@{currentUser.username || '-'}</div>
        <div class="profile-exp-bar">
          <span class="profile-exp-label">EXP: {currentUser.points ?? 0}</span>
        </div>
        <!-- ปุ่มเมนูสำหรับนักเรียน -->
        <div class="profile-menu">
          <button class="menu-btn" on:click={openCustomizeModal}>แก้ไขโปรไฟล์</button>
          <button class="menu-btn" on:click={openChangePasswordModal}>เปลี่ยนรหัสผ่าน</button>
          <button class="menu-btn" on:click={openChangeAvatarModal}>เปลี่ยนรูปโปรไฟล์</button>
        </div>
      </div>
    </div>
    {#if isCustomizeModalOpen}
      <CustomizeModal currentUser={currentUser} on:close={closeCustomizeModal} />
    {/if}
    {#if isChangePasswordModalOpen}
      <ChangePasswordModal currentUser={currentUser} on:close={closeChangePasswordModal} />
    {/if}
    {#if isChangeAvatarModalOpen}
      <ChangeAvatarModal currentUser={currentUser} on:close={closeChangeAvatarModal} />
    {/if}
  {:else}
    <div class="card">
      <p>กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์และปรับแต่งของรางวัล</p>
    </div>
  {/if}
</div>