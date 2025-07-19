// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // --- NEW CORS HANDLING BLOCK ---
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  // --- END NEW CORS HANDLING BLOCK ---

  const { studentId, missionId, score, userToken } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', userToken)
    .single()
  
  if (userError || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers
      status: 403,
    })
  }

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
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, submission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers
    status: 200,
  })
})
