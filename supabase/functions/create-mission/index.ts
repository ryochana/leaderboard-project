// supabase/functions/create-mission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = { /* ... CORS headers as before ... */ }
  if (req.method === 'OPTIONS') { /* ... OPTIONS handler as before ... */ }

  const { missionData } = await req.json()

  const authHeader = req.headers.get('Authorization') || ''
  const adminStudentIdString = authHeader.split('Bearer ')[1]

  // --- START: DEBUGGING LOGIC ---
  // Read the secret variable
  const shouldBreak = Deno.env.get('SHOULD_BREAK_FOR_DEBUG');
  
  console.log('--- create-mission Function Log ---');
  console.log('Authorization Header:', authHeader);
  console.log('adminStudentIdString:', adminStudentIdString);

  if (shouldBreak === 'true' && adminStudentIdString !== '999') { // *** เงื่อนไขสำหรับ Debug ***
    // This will cause a controlled error to show debug info
    throw new Error(`DEBUG_INFO: Expected student_id '999', got '${adminStudentIdString}'. Current grade: ${missionData.grade}`);
  }
  // --- END: DEBUGGING LOGIC ---

  const adminStudentId = parseInt(adminStudentIdString, 10);
  if (isNaN(adminStudentId)) {
    console.error('Error: Parsed adminStudentId is NaN. Invalid token.');
    return new Response(JSON.stringify({ error: 'Invalid Authorization token.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', adminStudentId)
    .single()
  
  console.log('DB Query Result for Admin (user):', user);
  console.log('DB Query Error for Admin (userError):', userError);

  if (userError || !user || user.role !== 'admin') {
    console.error('Error: User not found, not admin, or DB error. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required or user not found.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403,
    })
  }

  const { data, error } = await supabaseAdmin
    .from('missions')
    .insert({
      topic: missionData.topic,
      detail: missionData.detail,
      assigned_date: missionData.assignedDate,
      due_date: missionData.dueDate,
      max_points: missionData.maxPoints,
      grade: missionData.grade,
    })
  
  if (error) {
    console.error('Error inserting mission:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, mission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200,
  })
})
