<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabaseClient.js';

  const dispatch = createEventDispatcher();

  let username = '';
  let password = '';
  let error = '';
  let isLoading = false;

  async function handleLogin() {
    isLoading = true;
    error = '';

    // ถ้าเป็น admin ให้ใช้ Supabase Auth
    if (username === 'admin' || username === 'admin@npc.com') {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@npc.com',
        password
      });
      if (authError || !data.user) {
        error = 'อีเมลหรือรหัสผ่านแอดมินไม่ถูกต้อง';
        isLoading = false;
        return;
      }
      // ดึงข้อมูล users table เพิ่มเติม
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (userError || !userRow) {
        error = 'ไม่พบข้อมูลแอดมินในระบบ';
        isLoading = false;
        return;
      }
      dispatch('loginSuccess', { user: userRow });
      isLoading = false;
      return;
    }

    // นักเรียน: ใช้ logic เดิม
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError || !users) {
      error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      isLoading = false;
      return;
    }
    if (users.password !== password) {
      error = 'รหัสผ่านไม่ถูกต้อง';
      isLoading = false;
      return;
    }
    dispatch('loginSuccess', { user: users });
    isLoading = false;
  }
</script>

<div class="modal" style="display: flex;">
  <div class="modal-content login-card">
    <!-- ส่ง event 'close' เมื่อกดปุ่มกากบาท -->
    <span class="close-button" on:click={() => dispatch('close')}>×</span>
    <h2>กรุณาเข้าสู่ระบบ</h2>
    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="username">ชื่อผู้ใช้</label>
        <input type="text" id="username" bind:value={username} required>
      </div>
      <div class="form-group">
        <label for="password">รหัสผ่าน</label>
        <input type="password" id="password" bind:value={password} required>
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
    {#if error}
      <p class="error-message">{error}</p>
    {/if}
  </div>
</div>