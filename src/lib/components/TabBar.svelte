<script>
  import { createEventDispatcher } from 'svelte';

  // รับค่า prop เพื่อบอกว่า tab ไหน active อยู่
  export let activeTab; 

  const dispatch = createEventDispatcher();

  function handleClick(tabName) {
    // ส่ง event ชื่อ 'switch' พร้อมกับข้อมูล `tabName` กลับไปโดยตรง
    dispatch('switch', tabName);
  }
</script>

<nav id="bottom-tab-bar">
    <!-- ใช้ `class:active` เพื่อเช็คว่า activeTab ตรงกับชื่อปุ่มหรือไม่ -->
    <button class:active={activeTab === 'feed'} on:click={() => handleClick('feed')}>
        <span class="tab-icon">🏠</span>
        <span class="tab-text">ฟีด</span>
    </button>
    <button class:active={activeTab === 'missions'} on:click={() => handleClick('missions')}>
        <span class="tab-icon">📜</span>
        <span class="tab-text">ภารกิจ</span>
    </button>
    <button class:active={activeTab === 'leaderboard'} on:click={() => handleClick('leaderboard')}>
        <span class="tab-icon">🏆</span>
        <span class="tab-text">อันดับ</span>
    </button>
    <button class:active={activeTab === 'profile'} on:click={() => handleClick('profile')}>
        <span class="tab-icon">👤</span>
        <span class="tab-text">โปรไฟล์</span>
    </button>
</nav>