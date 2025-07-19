// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// *** จุดที่แก้ไข: เปลี่ยน => เป็น from ***
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' 

serve(async (req) => {
  const corsHeaders = { /* ... CORS headers as before ... */ }
  if (req.method === 'OPTIONS') { /* ... OPTIONS handler as before ... */ }

  const { studentId, missionId, score, userToken } = await req.json()

  // --- START: Admin Authentication Logic ---
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const adminStudentId = parseInt(userToken, 10);
  if (isNaN(adminStudentId)) {
    console.error('Error: Parsed adminStudentId is NaN in grade-submission. Invalid userToken.');
    return new Response(JSON.stringify({ error: 'Invalid userToken provided.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    })
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', adminStudentId)
    .single()
  
  console.log('--- grade-submission Function Log ---');
  console.log('userToken received:', userToken);
  console.log('Parsed adminStudentId (integer):', adminStudentId);
  console.log('DB Query Result for Admin (user):', user);
  console.log('DB Query Error for Admin (userError):', userError);

  if (userError || !user || user.role !== 'admin') {
    console.error('Error: User not found, not admin, or DB error in grade-submission. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required or user not found.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403,
    })
  }
  // --- END: Admin Authentication Logic ---

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .upsert({
      student_id: studentId,
      mission_id: missionId,
      score: score,
    }, {
      onConflict: 'student_id,mission_id'
    })
  
  if (error) {
    console.error('Error upserting submission:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, submission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200,
  })
})
