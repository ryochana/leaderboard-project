<script>
  // ตัวอย่างข้อมูลภารกิจ

  // รับ missions จริงจาก props (ต้องส่งเข้ามาจาก Missions.svelte)
  export let missions = [];
  export let submissionMap = new Map();

  // Debug: log missions to check if data is received
  console.log('missions in MissionMap:', missions);

  // สร้าง array สำหรับแผนที่ (แปลง mission + สถานะ submission)
  $: missionNodes = Array.isArray(missions) ? missions.map((mission, i) => {
    const submission = submissionMap.get(mission.id);
    // สมมติ: ถ้าส่งแล้ว graded = 3 ดาว, pending = 2 ดาว, ยังไม่ส่ง = 0 ดาว
    let stars = 0;
    let unlocked = i === 0 || (missions[i-1] && submissionMap.get(missions[i-1].id));
    if (submission) {
      if (submission.status === 'graded') stars = 3;
      else if (submission.status === 'pending') stars = 2;
      else stars = 1;
      unlocked = true;
    }
    return {
      id: mission.id,
      name: mission.title || mission.name || `M${i+1}`,
      stars,
      unlocked,
      mission
    };
  }) : [];

  // สำหรับ scroll/drag
  let mapContainer;
  let isDragging = false;
  let startX, scrollLeft;
  function handleMouseDown(e) {
    isDragging = true;
    startX = e.pageX - mapContainer.offsetLeft;
    scrollLeft = mapContainer.scrollLeft;
  }
  function handleMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - mapContainer.offsetLeft;
    const walk = (x - startX) * 1.2;
    mapContainer.scrollLeft = scrollLeft - walk;
  }
  function handleMouseUp() { isDragging = false; }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  $: verticalNodes = [...missionNodes].reverse();

  // ฟังก์ชันคำนวณตำแหน่งซิกแซก (ซ้าย-ขวา)
  function zigzagX(i) {
    const left = 120;
    const right = window.innerWidth - 120 - 120; // 120 = node width
    return i % 2 === 0 ? left : right;
  }
  // คำนวณตำแหน่งเส้นโยงให้ปลายเส้นตรงกับกึ่งกลาง node
  function connectorPath(i) {
    const y1 = 40 + i * 120 + 60; // 60 = กึ่งกลาง node
    const y2 = 40 + (i+1) * 120;
    const x1 = zigzagX(i) + 60; // 60 = กึ่งกลาง node
    const x2 = zigzagX(i+1) + 60;
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} Q${mx},${(y1+y2)/2} ${x2},${y2}`;
  }

  // สร้าง grid: แถวละ 4 node
  $: gridRows = Array.isArray(missionNodes)
    ? Array.from({length: Math.ceil(missionNodes.length / 4)}, (_, i) => missionNodes.slice(i * 4, i * 4 + 4))
    : [];
</script>

<style>
.mission-map-bg {
  width: 100vw;
  min-width: 600px;
  height: 220px;
  background: url(''); /* ใส่ url พื้นหลังทีหลัง */
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: visible;
}
.mission-map-scroll {
  width: 100vw;
  overflow-x: auto;
  overflow-y: visible;
  white-space: nowrap;
  cursor: grab;
  padding-bottom: 1em;
}
.mission-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  width: 64px;
  top: 70px;
  z-index: 2;
}
.mission-badge {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  box-shadow: 0 2px 8px #0002;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  font-weight: bold;
  color: #ff9800;
  border: 3px solid #ffe082;
  margin-bottom: 0.1em;
  position: relative;
}
.mission-badge.locked {
  background: #eee;
  color: #aaa;
  border: 3px solid #ccc;
}
.stars {
  display: flex;
  gap: 0.05em;
  margin-top: 0.1em;
}
.star {
  width: 16px;
  height: 16px;
  filter: drop-shadow(0 1px 2px #0002);
}
.mission-action-btn {
  margin-top: 0.2em;
  background: linear-gradient(90deg, #4caf50 60%, #81c784 100%);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.2em 0.7em;
  font-size: 0.95em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px #4caf5022;
  transition: background 0.2s, transform 0.15s;
}
.mission-action-btn:hover {
  background: linear-gradient(90deg, #388e3c 60%, #43a047 100%);
  transform: scale(1.07);
}
.mission-label {
  font-size: 0.95em;
  color: #888;
  margin-top: 0.1em;
  font-weight: 600;
  text-align: center;
}
.mission-map-scroll-vertical {
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: none;
}
.mission-map-bg-vertical {
  width: 100vw;
  min-width: 0;
  min-height: 100vh;
  position: relative;
}
.mission-node-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  width: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
.mission-badge {
  width: 120px;
  height: 120px;
  border-radius: 18px;
  box-shadow: 0 2px 8px #0002;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
  font-weight: bold;
  color: #ff9800;
  border: 4px solid #ffe082;
  margin-bottom: 0.1em;
  position: relative;
  text-align: center;
  padding: 0 10px;
  overflow: hidden;
}
.mission-badge-text {
  display: block;
  width: 100%;
  word-break: break-word;
  white-space: pre-line;
  text-align: center;
  font-size: 1.1em;
  line-height: 1.2;
}
.stars {
  display: flex;
  gap: 0.1em;
  margin-top: 0.2em;
}
.star {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px #0002);
}
.mission-action-btn {
  margin-top: 0.3em;
  background: linear-gradient(90deg, #4caf50 60%, #81c784 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.4em 1.2em;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px #4caf5022;
  transition: background 0.2s, transform 0.15s;
}
.mission-action-btn:hover {
  background: linear-gradient(90deg, #388e3c 60%, #43a047 100%);
  transform: scale(1.07);
}
.mission-label {
  font-size: 1.1em;
  color: #888;
  margin-top: 0.1em;
  font-weight: 600;
  text-align: center;
}
.mission-connector {
  pointer-events: none;
}
.mission-map-scroll-grid {
  width: 100vw;
  min-height: 400px;
  overflow-x: auto;
  overflow-y: auto;
  position: relative;
  background: none;
}
.mission-map-bg-grid {
  width: 100vw;
  min-width: 0;
  min-height: 400px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2em;
}
.mission-row {
  display: grid;
  grid-template-columns: repeat(4, 140px);
  gap: 2em;
  margin-bottom: 1.5em;
}
.mission-node-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
}
.mission-badge {
  width: 120px;
  height: 120px;
  border-radius: 18px;
  box-shadow: 0 2px 8px #0002;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
  font-weight: bold;
  color: #ff9800;
  border: 4px solid #ffe082;
  margin-bottom: 0.1em;
  position: relative;
  text-align: center;
  padding: 0 10px;
  overflow: hidden;
}
.mission-badge-text {
  display: block;
  width: 100%;
  word-break: break-word;
  white-space: pre-line;
  text-align: center;
  font-size: 1.1em;
  line-height: 1.2;
}
.stars {
  display: flex;
  gap: 0.1em;
  margin-top: 0.2em;
}
.star {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px #0002);
}
.mission-action-btn {
  margin-top: 0.3em;
  background: linear-gradient(90deg, #4caf50 60%, #81c784 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.4em 1.2em;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px #4caf5022;
  transition: background 0.2s, transform 0.15s;
}
.mission-action-btn:hover {
  background: linear-gradient(90deg, #388e3c 60%, #43a047 100%);
  transform: scale(1.07);
}
.mission-label {
  font-size: 1.1em;
  color: #888;
  margin-top: 0.1em;
  font-weight: 600;
  text-align: center;
}
@media (max-width: 900px) {
  .mission-row { grid-template-columns: repeat(2, 120px); gap: 1em; }
}
@media (max-width: 600px) {
  .mission-row { grid-template-columns: repeat(1, 100px); gap: 0.5em; }
  .mission-node-grid, .mission-badge { width: 80px; height: 80px; font-size: 0.9em; }
  .star { width: 12px; height: 12px; }
}
</style>

<div class="mission-map-scroll-grid"
  bind:this={mapContainer}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
>
  {#if !gridRows || gridRows.length === 0}
    <div class="no-missions">ยังไม่มีภารกิจ</div>
  {:else}
  <div class="mission-map-bg-grid">
    {#each gridRows as row, rowIdx}
      <div class="mission-row">
        {#each row as node, colIdx}
          <div class="mission-node-grid"
            style="grid-column: {colIdx+1}; grid-row: {rowIdx+1};"
            title={node.mission.description || ''}
          >
            <div class="mission-badge {node.unlocked ? '' : 'locked'}">
              <span class="mission-badge-text">{#if node.unlocked}{node.name}{:else}<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 17v.01" stroke="#888" stroke-width="2" stroke-linecap="round"/><rect x="5" y="11" width="14" height="8" rx="2" fill="#fff" stroke="#888" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#888" stroke-width="2"/></svg>{/if}</span>
            </div>
            <div class="stars">
              {#each Array(3) as _, s}
                {#if node.unlocked && s < node.stars}
                  <img class="star" src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png" alt="star" />
                {:else if node.unlocked}
                  <img class="star" src="https://cdn-icons-png.flaticon.com/512/1828/1828970.png" alt="star-empty" />
                {/if}
              {/each}
            </div>
            {#if node.unlocked}
              <button class="mission-action-btn" on:click={() => dispatch('open', node.mission)}>ทำภารกิจ</button>
            {:else}
              <div class="mission-label">ล็อก</div>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
    </div>
  {/if}
</div>
