<script>
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient.js';
  import MissionModal from './MissionModal.svelte';
  import MissionMap from './MissionMap.svelte';

  // รับข้อมูล user ที่ login อยู่จาก App.svelte
  export let currentUser;

  let missions = [];
  $: console.log('missions in Missions.svelte:', missions);
  let submissionMap = new Map();
  let isLoading = true;
  let error = null;

  // State สำหรับควบคุม Modal
  let isModalOpen = false;
  let selectedMission = null;

  // ฟังก์ชันเปิด Modal
  function openModal(mission) {
    if (!currentUser) {
      alert("กรุณาล็อกอินก่อน");
      return;
    }
    selectedMission = mission;
    isModalOpen = true;
  }

  // onMount จะดึงข้อมูล missions ที่ไม่ค่อยเปลี่ยนแค่ครั้งเดียว
  onMount(async () => {
    const currentGrade = 2; // สมมติ ม.2 ไปก่อน
    const { data, error: missionError } = await supabase.from('missions').select('*').eq('grade', currentGrade).order('created_at', { ascending: true });
    
    if (missionError) {
      error = "ไม่สามารถโหลดข้อมูลภารกิจได้";
    } else {
      missions = data;
    }
    isLoading = false;
  });

  // Reactive Statement ( $: )
  // บล็อกนี้จะรันใหม่ "ทุกครั้งที่ค่า currentUser เปลี่ยน"!
  $: {
    if (currentUser) {
      // เมื่อมีการ login (currentUser ไม่ใช่ null) ให้ดึงข้อมูล submission ใหม่
      isLoading = true; // แสดงการโหลดแป๊บนึง
      supabase.from('submissions').select('*').eq('student_id', currentUser.id)
        .then(({ data: userSubmissions }) => {
          if (userSubmissions) {
            submissionMap = new Map(userSubmissions.map(s => [s.mission_id, s]));
          }
          isLoading = false;
        });
    } else {
      // เมื่อ logout ให้ล้างข้อมูล submission
      submissionMap = new Map();
    }
  }

</script>

<!-- ถ้า Modal เปิดอยู่ ให้แสดง Component -->
{#if isModalOpen}
  <MissionModal 
    mission={selectedMission}
    submission={submissionMap.get(selectedMission.id)}
    {currentUser}
    on:close={() => isModalOpen = false}
  />
{/if}

<div id="missions-container" class="content-section active">
  <h2>บันทึกภารกิจ (Quest Log)</h2>
  {#if isLoading}
    <div class="loader"></div>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else}
    <MissionMap {missions} {submissionMap}
      on:open={e => openModal(e.detail)}
    />
  {/if}
</div>