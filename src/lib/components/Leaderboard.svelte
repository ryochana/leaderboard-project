<script>
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  import StudentDetailModal from './StudentDetailModal.svelte';
  import { fly } from 'svelte/transition';

  // สร้างตัวแปร "State" เพื่อเก็บสถานะต่างๆ
  let leaderboardData = [];
  let isLoading = true;
  let error = null;
  let selectedStudentId = '';

  let showConfetti = false;
  let tooltip = '';
  let tooltipX = 0;
  let tooltipY = 0;

  function showTooltip(text, e) {
    tooltip = text;
    tooltipX = e.clientX;
    tooltipY = e.clientY;
  }

  function hideTooltip() { tooltip = ''; }

  function triggerConfetti() {
    showConfetti = true;
    setTimeout(() => showConfetti = false, 1200);
  }

  // onMount คือฟังก์ชันที่จะรันแค่ครั้งเดียว ตอนที่ Component นี้ถูกแสดงผลครั้งแรก
  // เหมือนฟังก์ชัน init() หรือ document.addEventListener('DOMContentLoaded', ...)
  onMount(async () => {
    // นี่คือ Logic จากฟังก์ชัน fetchAndDisplayLeaderboard ของคุณ
    // ตรวจจับ grade จาก URL อัตโนมัติ
    let currentGrade = 1; // default
    const hostname = window.location.hostname;
    
    if (hostname.includes('eng-m1') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      currentGrade = 1;
    } else if (hostname.includes('eng-m2')) {
      currentGrade = 2;
    } else if (hostname.includes('eng-m3')) {
      currentGrade = 3;
    }
    
    const { data, error: rpcError } = await supabase.rpc('get_leaderboard_data', { p_grade_id: currentGrade });

    if (rpcError) {
      console.error('Error fetching leaderboard:', rpcError);
      error = "ไม่สามารถโหลด Leaderboard ได้";
    } else {
      leaderboardData = data;
    }
    
    // เมื่อเสร็จแล้ว ให้ปิดการโหลด
    isLoading = false;
  });
</script>

<div id="leaderboard-container" class="content-section active">
  <h2>หอเกียรติยศ (Leaderboard)</h2>
  {#if isLoading}
    <!-- ถ้ากำลังโหลด ให้แสดง Loader -->
    <div class="loader"></div>
  {:else if error}
    <!-- ถ้ามี Error ให้แสดงข้อความ Error -->
    <p class="error-message">{error}</p>
  {:else}
    <!-- ถ้าโหลดเสร็จและไม่มี Error ให้แสดง Leaderboard -->
    <div class="card glass-bg">
      <!-- นี่คือวิธีวนลูปแสดงผลของ Svelte สะอาดและอ่านง่ายมาก! -->
      {#each leaderboardData as student, index (student.id)}
        <div class="leaderboard-item clickable {index < 3 ? 'top3' : ''}"
          on:click={() => {
            selectedStudentId = student.id;
            if(index === 0) triggerConfetti();
          }}
          on:mouseenter={(e) => showTooltip(`${student.display_name} - อันดับ ${index+1} (${student.points} EXP)`, e)}
          on:mouseleave={hideTooltip}
          in:fly={{ y: 30, duration: 400, delay: index*60 }}
          style="background:{student.equipped_card_bg ? `url('${student.equipped_card_bg}') center/cover` : ''}; position:relative;"
        >
          <div class="rank">
            {index + 1}
            {#if index === 0}👑{:else if index === 1}🥈{:else if index === 2}🥉{/if}
          </div>

          <div class="profile-pic-wrapper avatar-anim {index === 0 ? 'gold-glow' : index === 1 ? 'silver-glow' : index === 2 ? 'bronze-glow' : ''}" style="position:relative;">
            {#if student.equipped_frame_color}
              <img class="profile-frame" src={student.equipped_frame_color} alt="frame" style="position:absolute;z-index:2;width:100%;height:100%;left:0;top:0;pointer-events:none;" />
            {/if}
            <img 
              src={student.avatar_url || `https://robohash.org/${student.student_id}.png?set=set4&size=50x50`} 
              alt="Profile" 
              class="profile-pic"
              style="animation-delay:{index*0.1}s;z-index:1;position:relative;"
            >
            {#if student.equipped_profile_effect}
              <img class="profile-effect" src={student.equipped_profile_effect} alt="effect" style="position:absolute;z-index:3;width:110%;height:110%;left:-5%;top:-5%;pointer-events:none;opacity:0.7;" />
            {/if}
          </div>

          <div class="student-info">
            <div class="student-name-wrapper">
              <div class="student-name">{student.display_name}</div>
              {#if student.equipped_badge_url}
                <img src={student.equipped_badge_url} alt="Badge" class="equipped-badge">
              {/if}
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: {student.progress || 0}%; transition: width 1s cubic-bezier(.5,1.5,.5,1);"></div>
            </div>
          </div>

          <div class="score">{student.points || 0} EXP</div>
        </div>
      {/each}
      {#if tooltip}
        <div class="tooltip" style="left:{tooltipX + 10}px;top:{tooltipY + 10}px;">{tooltip}</div>
      {/if}
      {#if showConfetti}
        <div class="confetti">
          {#each Array(30) as _,i}
            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background: hsl({Math.random()*360},80%,60%);margin:2px;animation: pop 1s cubic-bezier(.5,2,.5,1) both;animation-delay:{i*0.03}s;"></span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  {#if selectedStudentId}
    <StudentDetailModal studentId={selectedStudentId} onClose={() => selectedStudentId = ''} />
  {/if}
</div>

<style>
  #leaderboard-container {
    padding: 1em;
    background: linear-gradient(120deg, #e0e7ff 0%, #f0f4ff 100%);
    min-height: 100vh;
  }

  .glass-bg {
    background: rgba(255,255,255,0.7);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    backdrop-filter: blur(8px);
    border-radius: 18px;
    border: 1.5px solid rgba(255,255,255,0.25);
  }

  .loader {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #007bff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    color: red;
    text-align: center;
  }

  .card {
    background: #fff;
    border-radius: 12px;
    padding: 1em;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    padding: 0.5em;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background 0.2s;
  }

  .leaderboard-item:last-child {
    border-bottom: none;
  }

  .leaderboard-item:hover {
    background: #f5faff;
  }

  .rank {
    font-size: 1.2em;
    width: 2em;
    text-align: center;
  }

  .profile-pic-wrapper {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 0.5em;
    border: 2px solid #ccc;
  }

  .profile-pic {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .student-info {
    flex: 1;
  }

  .student-name-wrapper {
    display: flex;
    align-items: center;
    margin-bottom: 0.2em;
  }

  .student-name {
    font-weight: bold;
    font-size: 1em;
    margin-right: 0.5em;
  }

  .equipped-badge {
    width: 20px;
    height: 20px;
  }

  .progress-bar-container {
    background: #eee;
    border-radius: 10px;
    overflow: hidden;
    height: 8px;
    width: 100%;
  }

  .progress-bar {
    background: linear-gradient(90deg, #4caf50 40%, #81c784 60%, #4caf50 100%);
    height: 100%;
    position: relative;
    overflow: hidden;
    animation: moveBar 1.2s linear infinite;
    background-size: 200% 100%;
  }
  @keyframes moveBar {
    0% { background-position: 0% 0; }
    100% { background-position: 100% 0; }
  }

  .score {
    font-weight: bold;
    color: #2196f3;
  }

  .tooltip {
    position: fixed;
    background: #222;
    color: #fff;
    padding: 0.4em 1em;
    border-radius: 8px;
    font-size: 0.95em;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.95;
  }

  .confetti {
    position: absolute;
    left: 50%;
    top: 10%;
    transform: translate(-50%, 0);
    pointer-events: none;
    z-index: 1000;
  }

  @keyframes pop {
    0% { transform: scale(0.5) translateY(0); opacity: 1; }
    80% { transform: scale(1.2) translateY(-40px); opacity: 1; }
    100% { transform: scale(0.8) translateY(-60px); opacity: 0; }
  }

  .top3 {
    background: linear-gradient(90deg, #fffbe7 60%, #e3f2fd 100%);
    box-shadow: 0 2px 16px 0 rgba(255,215,0,0.08);
    animation: scaleTop3 1.2s cubic-bezier(.5,1.5,.5,1) both;
  }

  @keyframes scaleTop3 {
    0% { transform: scale(0.95); }
    60% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .gold-glow {
    box-shadow: 0 0 16px 4px #ffd70099;
    animation: glowGold 2s infinite alternate;
  }

  .silver-glow {
    box-shadow: 0 0 12px 2px #b0c4de99;
    animation: glowSilver 2s infinite alternate;
  }

  .bronze-glow {
    box-shadow: 0 0 12px 2px #cd7f3299;
    animation: glowBronze 2s infinite alternate;
  }

  @keyframes glowGold {
    0% { box-shadow: 0 0 8px 2px #ffd70055; }
    100% { box-shadow: 0 0 24px 8px #ffd700cc; }
  }

  @keyframes glowSilver {
    0% { box-shadow: 0 0 6px 1px #b0c4de55; }
    100% { box-shadow: 0 0 18px 6px #b0c4decc; }
  }

  @keyframes glowBronze {
    0% { box-shadow: 0 0 6px 1px #cd7f3255; }
    100% { box-shadow: 0 0 18px 6px #cd7f32cc; }
  }

  .avatar-anim img {
    transition: transform 0.3s cubic-bezier(.5,1.5,.5,1);
  }

  .avatar-anim:hover img {
    transform: scale(1.12) rotate(-6deg);
  }

  /* Styles for the StudentDetailModal */
  .modal-content {
    padding: 2em;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  }

  .close-button {
    background: transparent;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
    position: absolute;
    top: 1em;
    right: 1em;
  }

  .student-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .student-detail h3 {
    margin-bottom: 0.5em;
  }

  .student-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    margin-bottom: 1em;
    border: 4px solid #4caf50;
  }

  .student-info-item {
    margin-bottom: 0.5em;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .student-info-item label {
    font-weight: bold;
  }

  .student-info-item div {
    text-align: right;
  }
</style>