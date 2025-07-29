<script>
  // ===============================================================
  // 1. IMPORTS
  // ===============================================================
  import { user } from './lib/store.js'; // Global user state

  // Page Components
  import Leaderboard from './lib/components/Leaderboard.svelte';
  import Missions from './lib/components/Missions.svelte';
  import Feed from './lib/components/Feed.svelte';
  import Profile from './lib/components/Profile.svelte';
  
  // UI Components
  import TabBar from './lib/components/TabBar.svelte';
  
  // Modal Components (เราจะสร้างไฟล์เปล่าๆ รอไว้)
  import LoginModal from './lib/components/LoginModal.svelte';
  import AdminModal from './lib/components/AdminModal.svelte';
  // MissionModal จะถูกเรียกใช้จากข้างใน Missions.svelte เอง

  // ===============================================================
  // 2. STATE MANAGEMENT
  // ===============================================================
  let activeTab = 'leaderboard'; // หน้าเริ่มต้น
  let currentGrade = 2; // ค่าเริ่มต้น สามารถเปลี่ยนตามที่ต้องการ
  
  // State สำหรับควบคุมการเปิด/ปิด Modals
  let isLoginModalOpen = false;
  let isAdminModalOpen = false;

  // ===============================================================
  // 3. FUNCTIONS
  // ===============================================================
  function switchTab(event) {
    // event.detail คือค่าที่ส่งมาจาก dispatch ใน TabBar
    activeTab = event.detail; 
  }
  
  function handleLoginSuccess(event) {
    // อัปเดตข้อมูล user ใน store ของเรา
    $user = event.detail.user; 
    isLoginModalOpen = false; // ปิด Modal
  }

  function handleLogout() {
    // แค่ตั้งค่าใน store เป็น null ทุกอย่างที่ผูกกับ $user จะ update ตามเอง
    $user = null; 
  }
</script>

<!-- ถ้ามี Modal ใดๆ เปิดอยู่ ให้ใส่ class 'blur-background' -->
<div id="app-container" class:blur-background={isLoginModalOpen || isAdminModalOpen}>
  
  <!-- =============================================================== -->
  <!-- HEADER SECTION -->
  <!-- =============================================================== -->
  <header id="top-header">
    <div class="header-title">
      <h1 id="class-title-main">ENGLISH QUEST M.{currentGrade}</h1>
      <p id="school-name">NONPAKCHEE SCHOOL 2568</p>
    </div>
    <div class="header-user-controls">
      {#if $user}
        <!-- ปุ่มโปรไฟล์ใหม่ (ขวาบน) -->
        <button id="profile-header-btn" on:click={() => activeTab = 'profile'} title="โปรไฟล์ของฉัน">
          <img class="profile-pic-header" src={$user.avatar_url || `https://robohash.org/${$user.student_id}.png`} alt="Profile" />
          <span class="profile-points">{$user.points ?? 0} EXP</span>
        </button>
        <button on:click={handleLogout}>ออกจากระบบ</button>
      {:else}
        <button on:click={() => isLoginModalOpen = true}>เข้าสู่ระบบ</button>
      {/if}
    </div>
  </header>

  <!-- =============================================================== -->
  <!-- MAIN CONTENT SECTION (SWITCHES BETWEEN PAGES) -->
  <!-- =============================================================== -->
  <main id="main-content">
      {#if activeTab === 'leaderboard'}
        <Leaderboard {currentGrade} />
      {:else if activeTab === 'feed'}
        <Feed />
      {:else if activeTab === 'missions'}
        <!-- ส่งข้อมูล user ที่ login อยู่ลงไปให้ Missions component -->
        <Missions currentUser={$user} />
      {:else if activeTab === 'profile'}
        <!-- ส่งข้อมูล user ที่ login อยู่ลงไปให้ Profile component -->
        <Profile currentUser={$user} />
      {/if}
  </main>

  <!-- =============================================================== -->
  <!-- BOTTOM TAB BAR -->
  <!-- =============================================================== -->
  <TabBar {activeTab} on:switch={(event) => (activeTab = event.detail)} />

</div>

<!-- =============================================================== -->
<!-- FLOATING BUTTONS & MODALS (อยู่ข้างนอก app-container) -->
<!-- =============================================================== -->

<!-- ปุ่ม Admin จะแสดงเมื่อ login เป็น admin เท่านั้น -->
{#if $user && $user.role === 'admin'}
  <button id="admin-panel-button" style="display: block;" on:click={() => isAdminModalOpen = true}>
    Admin Panel
  </button>
{/if}

<!-- Login Modal -->
{#if isLoginModalOpen}
  <LoginModal 
    on:close={() => isLoginModalOpen = false}
    on:loginSuccess={handleLoginSuccess}
  />
{/if}

<!-- Admin Modal -->
{#if isAdminModalOpen}
  <AdminModal on:close={() => isAdminModalOpen = false} />
{/if}