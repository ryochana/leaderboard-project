<script>
  export let currentUser;
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // Mock selectable items
  const frames = [
    { id: 1, url: '/frame1.png', pts: 10 },
    { id: 2, url: '/frame2.png', pts: 20 },
    { id: 3, url: '/frame3.png', pts: 30 }
  ];
  const badges = [
    { id: 1, url: '/badge1.png', pts: 10 },
    { id: 2, url: '/badge2.png', pts: 20 }
  ];
  const effects = [
    { id: 1, url: '/effect1.png', pts: 10 },
    { id: 2, url: '/effect2.png', pts: 20 }
  ];
  const bgs = [
    { id: 1, url: '/bg1.png', pts: 10 },
    { id: 2, url: '/bg2.png', pts: 20 }
  ];

  let selectedFrame = null;
  let selectedBadge = null;
  let selectedEffect = null;
  let selectedBg = null;
  let isLoading = false;
  let success = '';

  function selectFrame(frame) {
    selectedFrame = frame;
  }
  function selectBadge(badge) {
    selectedBadge = badge;
  }
  function selectEffect(effect) {
    selectedEffect = effect;
  }
  function selectBg(bg) {
    selectedBg = bg;
  }

  import { supabase } from '../supabaseClient.js';
  import { user } from '../store.js';
  import { get } from 'svelte/store';

  // Sound effect (simple)
  function playSound(url) {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play();
  }

  // Randomize function
  function randomizeAll() {
    selectedFrame = frames[Math.floor(Math.random() * frames.length)];
    selectedBadge = badges[Math.floor(Math.random() * badges.length)];
    selectedEffect = effects[Math.floor(Math.random() * effects.length)];
    selectedBg = bgs[Math.floor(Math.random() * bgs.length)];
    playSound('/public/random.mp3');
  }

  // Tooltip helpers
  let tooltip = '';
  let tooltipX = 0;
  let tooltipY = 0;
  function showTooltip(text, e) {
    tooltip = text;
    tooltipX = e.clientX;
    tooltipY = e.clientY;
  }
  function hideTooltip() { tooltip = ''; }

  // Particle effect on save
  let showParticles = false;
  function triggerParticles() {
    showParticles = true;
    setTimeout(() => showParticles = false, 1200);
  }

  async function handleSave() {
    isLoading = true;
    success = '';
    let errorMsg = '';
    try {
      const current = get(user);
      const updates = {
        id: current.id,
        equipped_frame_color: selectedFrame ? selectedFrame.url : current.equipped_frame_color,
        equipped_badge_url: selectedBadge ? selectedBadge.url : current.equipped_badge_url,
        equipped_profile_effect: selectedEffect ? selectedEffect.url : current.equipped_profile_effect,
        equipped_card_bg: selectedBg ? selectedBg.url : current.equipped_card_bg
      };
      const { error } = await supabase.from('users').update(updates).eq('id', current.id);
      if (error) {
        errorMsg = error.message;
        success = '';
      } else {
        success = 'บันทึกการตกแต่งโปรไฟล์สำเร็จ!';
        // update store
        user.set({ ...current, ...updates });
        playSound('/public/success.mp3');
        triggerParticles();
      }
    } catch (e) {
      errorMsg = e.message || e;
      success = '';
    }
    isLoading = false;
    if (errorMsg) alert('เกิดข้อผิดพลาด: ' + errorMsg);
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
.modal-content.modal-lg {
  max-width: 900px;
  width: 90vw;
  min-height: 500px;
  display: flex;
  flex-direction: column;
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
.modal-title {
  text-align: center;
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 1.5em;
}
.customize-modal-body {
  display: flex;
  flex-direction: column;
  gap: 2em;
  align-items: center;
}
.customize-profile-card {
  background: #f8fafc;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 2em 1.5em 1.5em 1.5em;
  min-width: 260px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7em;
}
.profile-avatar-frame.big {
  width: 120px;
  height: 120px;
  position: relative;
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
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 4px solid #e0e0e0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  z-index: 1;
  position: relative;
}
.profile-name-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.profile-name {
  font-size: 1.3em;
  font-weight: bold;
  margin: 0;
}
.profile-grade {
  color: #888;
  font-size: 1em;
}
.profile-exp-bar {
  margin-top: 0.5em;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}
.profile-exp-label {
  font-size: 1em;
  color: #2196f3;
  font-weight: bold;
}
.profile-exp-track {
  width: 100%;
  height: 8px;
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
.setting-btn {
  margin-top: 1em;
  background: #607d8b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.7em 2em;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}
.setting-btn:hover {
  background: #455a64;
}
.customize-options {
  flex: 1;
  min-width: 220px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1.2em;
}
.customize-options h4 {
  margin: 0.5em 0 0.3em 0;
  font-size: 1.1em;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.2em;
}
.frame-list, .badge-list, .effect-list, .bg-list {
  display: flex;
  gap: 0.7em;
  flex-wrap: wrap;
}
.frame-item, .badge-item, .effect-item, .bg-item {
  background: #f3f3f3;
  border-radius: 10px;
  width: 80px;
  height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  position: relative;
  font-size: 0.95em;
  border: 2px solid transparent;
  transition: border 0.2s;
}
.frame-item.selected, .badge-item.selected, .effect-item.selected, .bg-item.selected {
  border: 2px solid #2196f3;
  background: #e3f2fd;
}
.frame-img, .badge-item img, .effect-item img, .bg-item img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  margin-bottom: 0.3em;
}
.frame-pts, .badge-pts, .effect-pts, .bg-pts {
  color: #e57373;
  font-weight: bold;
  font-size: 1em;
}
.success-message {
  color: #2196f3;
  font-weight: bold;
  text-align: center;
}
.error-message {
  color: #e74c3c;
  font-weight: bold;
  text-align: center;
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
.particles {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
}
@keyframes pop {
  0% { transform: scale(0.5) translateY(0); opacity: 1; }
  80% { transform: scale(1.2) translateY(-40px); opacity: 1; }
  100% { transform: scale(0.8) translateY(-60px); opacity: 0; }
}
</style>

<div class="modal" on:click={() => dispatch('close')}>
  <div class="modal-content modal-lg" on:click|stopPropagation>
    <span class="close-button" on:click={() => dispatch('close')}>×</span>
    <h2 class="modal-title">ตกแต่งโปรไฟล์</h2>
    <div class="customize-modal-body">
      <div class="customize-profile-card">
        <div class="profile-avatar-frame big">
          {#if selectedFrame}
            <img class="profile-frame" src={selectedFrame.url} alt="frame" />
          {:else if currentUser.equipped_frame_color}
            <img class="profile-frame" src={currentUser.equipped_frame_color} alt="frame" />
          {/if}
          <img 
            src={currentUser.avatar_url || `https://robohash.org/${currentUser.student_id || 'default'}.png?set=set4&size=90x90`} 
            alt="Profile" 
            class="profile-pic-main"
            style={currentUser.frame_color ? `border: 4px solid ${currentUser.frame_color}` : ''}
          >
        </div>
        <div class="profile-name-row">
          <h3 class="profile-name">{currentUser.display_name || 'ไม่มีชื่อ'}</h3>
          <span class="profile-grade">{currentUser.grade ? `(${currentUser.grade})` : ''}</span>
        </div>
        <div class="profile-exp-bar">
          <span class="profile-exp-label">{currentUser.points || 0} EXP</span>
          <div class="profile-exp-track">
            <div class="profile-exp-fill" style="width: {Math.min((currentUser.points || 0) / 100 * 100, 100)}%"></div>
          </div>
        </div>
      </div>
      <button class="setting-btn" style="margin:1em auto 0 auto;display:block;" on:click={randomizeAll}>สุ่มแต่งโปรไฟล์</button>
      <div class="customize-options" style="width:100%;max-width:600px;margin:2em auto 0 auto;">
        <h4>กรอบโปรไฟล์</h4>
        <div class="frame-list">
          {#each frames as frame}
            <div class="frame-item {selectedFrame && selectedFrame.id === frame.id ? 'selected' : ''}"
              on:click={() => { selectFrame(frame); playSound('/public/select.mp3'); }}
              on:mouseenter={(e) => showTooltip('กรอบโปรไฟล์: +' + frame.pts + ' pts', e)}
              on:mouseleave={hideTooltip}
              style="cursor:pointer;">
              <div class="frame-img"><img src={frame.url} alt="frame" /></div>
              <div class="frame-pts">{frame.pts} pts</div>
            </div>
          {/each}
        </div>
        <h4>ป้ายแสดง</h4>
        <div class="badge-list">
          {#each badges as badge}
            <div class="badge-item {selectedBadge && selectedBadge.id === badge.id ? 'selected' : ''}"
              on:click={() => { selectBadge(badge); playSound('/public/select.mp3'); }}
              on:mouseenter={(e) => showTooltip('ป้ายแสดง: +' + badge.pts + ' pts', e)}
              on:mouseleave={hideTooltip}
              style="cursor:pointer;">
              <img src={badge.url} alt="badge" />
              <div class="badge-pts">{badge.pts} pts</div>
            </div>
          {/each}
        </div>
        <h4>เอฟเฟกต์พิเศษ</h4>
        <div class="effect-list">
          {#each effects as effect}
            <div class="effect-item {selectedEffect && selectedEffect.id === effect.id ? 'selected' : ''}"
              on:click={() => { selectEffect(effect); playSound('/public/select.mp3'); }}
              on:mouseenter={(e) => showTooltip('เอฟเฟกต์: +' + effect.pts + ' pts', e)}
              on:mouseleave={hideTooltip}
              style="cursor:pointer;">
              <img src={effect.url} alt="effect" />
              <div class="effect-pts">{effect.pts} pts</div>
            </div>
          {/each}
        </div>
        <h4>พื้นหลังการ์ด</h4>
        <div class="bg-list">
          {#each bgs as bg}
            <div class="bg-item {selectedBg && selectedBg.id === bg.id ? 'selected' : ''}"
              on:click={() => { selectBg(bg); playSound('/public/select.mp3'); }}
              on:mouseenter={(e) => showTooltip('พื้นหลัง: +' + bg.pts + ' pts', e)}
              on:mouseleave={hideTooltip}
              style="cursor:pointer;">
              <img src={bg.url} alt="bg" />
              <div class="bg-pts">{bg.pts} pts</div>
            </div>
          {/each}
        </div>
        <div style="margin-top:1em;color:#e57373;font-weight:bold;">
          แต้มที่มี: {currentUser.points || 0} pts
          {#if (selectedFrame && (currentUser.points || 0) < selectedFrame.pts) ||
                (selectedBadge && (currentUser.points || 0) < selectedBadge.pts) ||
                (selectedEffect && (currentUser.points || 0) < selectedEffect.pts) ||
                (selectedBg && (currentUser.points || 0) < selectedBg.pts)}
            <span style="color:#e74c3c;"> (แต้มไม่พอสำหรับบางไอเท็ม!)</span>
          {/if}
        </div>
        <button class="setting-btn" style="margin-top:2em;" on:click={handleSave} disabled={isLoading}>
          {isLoading ? 'กำลังบันทึก...' : 'บันทึกการตกแต่ง'}
        </button>
        {#if success}
          <div class="success-message" style="margin-top:1em;">{success}</div>
        {/if}
      </div>
      {#if tooltip}
        <div class="tooltip" style="left:{tooltipX + 10}px;top:{tooltipY + 10}px;">{tooltip}</div>
      {/if}
      {#if showParticles}
        <div class="particles">
          {#each Array(20) as _,i}
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background: hsl({Math.random()*360},80%,60%);margin:2px;animation: pop 1s cubic-bezier(.5,2,.5,1) both;animation-delay:{i*0.05}s;"></span>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
