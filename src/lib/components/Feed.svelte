<script>
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient.js';

  let upcomingMissions = [];
  let isLoading = true;
  let error = null;
  
  onMount(async () => {
    // ตรวจจับ grade จาก URL อัตโนมัติ (เหมือน Leaderboard)
    let currentGrade = 1; // default
    const hostname = window.location.hostname;
    
    if (hostname.includes('eng-m1') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      currentGrade = 1;
    } else if (hostname.includes('eng-m2')) {
      currentGrade = 2;
    } else if (hostname.includes('eng-m3')) {
      currentGrade = 3;
    }
    
    // สร้าง object วันที่สำหรับ query
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Logic จากฟังก์ชัน fetchAndDisplayFeed ของคุณ
    const { data, error: fetchError } = await supabase
      .from('missions')
      .select('*')
      .eq('grade', currentGrade)
      .gte('due_date', now.toISOString()) // มากกว่าหรือเท่ากับวันนี้
      .lte('due_date', threeDaysFromNow.toISOString()) // น้อยกว่าหรือเท่ากับ 3 วันข้างหน้า
      .order('due_date', { ascending: true });

    if (fetchError) {
      console.error("Error fetching feed:", fetchError);
      error = "ไม่สามารถโหลดข้อมูลฟีดได้";
    } else {
      upcomingMissions = data;
    }
    
    isLoading = false;
  });
</script>

<div id="feed-container" class="content-section active">
  <h2>ฟีดข่าวสาร</h2>

  {#if isLoading}
    <div class="loader"></div>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else}
    <!-- ตรวจสอบว่ามีภารกิจใกล้ถึงกำหนดส่งหรือไม่ -->
    {#if upcomingMissions.length === 0}
      <div class="card">
        <p>ยอดเยี่ยม! ไม่มีภารกิจที่ใกล้ครบกำหนดส่งใน 3 วันนี้</p>
      </div>
    {:else}
      <div class="card">
        <h3>⚠️ ภารกิจที่ใกล้ครบกำหนดส่ง</h3>
        {#each upcomingMissions as mission}
          <p>
            <strong>{mission.title}</strong> - 
            กำหนดส่งวันที่ {new Date(mission.due_date).toLocaleDateString('th-TH')}
          </p>
        {/each}
      </div>
    {/if}

    <!-- สามารถเพิ่ม Card อื่นๆ ในฟีดได้ที่นี่ เช่น ประกาศจากครู -->
    <div class="card">
      <h3>ประกาศทั่วไป</h3>
      <p>ยินดีต้อนรับสู่ English Quest ปีการศึกษา 2568!</p>
    </div>
  {/if}
</div>