// supabase/functions/create-mission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
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

  const { missionData } = await req.json()

  // *** START: Corrected Admin Auth Check for NULL grade ***
  const authHeader = req.headers.get('Authorization') || ''
  const adminStudentId = authHeader.split('Bearer ')[1]

  if (!adminStudentId) {
    return new Response(JSON.stringify({ error: 'Authorization header missing or malformed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Fetch the user by student_id
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role') // Only need the role
    .eq('student_id', parseInt(adminStudentId, 10)) // Make sure to parse to INT
    .single()
  
  // Check if user exists and has admin role
  if (userError || !user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required or user not found.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403,
    })
  }
  // *** END: Corrected Admin Auth Check ***

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
