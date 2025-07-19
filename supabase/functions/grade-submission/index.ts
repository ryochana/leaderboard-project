// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } => 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = { /* ... CORS headers as before ... */ }
  if (req.method === 'OPTIONS') { /* ... OPTIONS handler as before ... */ }

  const { studentId, missionId, score, userToken } = await req.json()

  // *** START: Corrected Admin Auth Check for NULL grade ***
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', parseInt(userToken, 10))
    .single()
  
  if (userError || !user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required or user not found.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403,
    })
  }
  // *** END: Corrected Admin Auth Check ***

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
