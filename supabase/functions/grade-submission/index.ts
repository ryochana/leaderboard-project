// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // *** จุดที่แก้ไข: อนุญาต 'X-Admin-Auth' Header ***
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-auth',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  let requestBody;
  try { requestBody = await req.json(); } catch (jsonError) { /* ... handle JSON error ... */ }
  const { studentId, missionId, score, userToken } = requestBody; // userToken คือ Base64 token จาก Frontend

  // --- START: Admin Authentication Logic (แก้ไขตรงนี้) ---
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const base64Token = req.headers.get('X-Admin-Auth') || userToken; // ดึงจาก Header ก่อน ถ้าไม่มี ให้ดึงจาก Body (userToken)

  console.log('--- grade-submission Function Log ---');
  console.log('Base64 Token:', base64Token);

  if (!base64Token) {
    console.error('Error: Base64 token missing. Returning 401.');
    return new Response(JSON.stringify({ error: 'Authorization token missing.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    })
  }

  let decodedToken;
  try {
    decodedToken = JSON.parse(atob(base64Token));
  } catch (decodeError) {
    console.error('Error decoding or parsing token:', decodeError);
    return new Response(JSON.stringify({ error: 'Invalid token format.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    })
  }

  const adminStudentId = parseInt(decodedToken.student_id, 10);
  const adminRole = decodedToken.role;

  console.log('Decoded Token:', decodedToken);
  console.log('Parsed adminStudentId:', adminStudentId);
  console.log('Parsed adminRole:', adminRole);

  if (isNaN(adminStudentId) || adminRole !== 'admin') {
    console.error('Error: Invalid Admin ID or Role. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Invalid Admin credentials.' }), {
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
  
  if (error) { /* ... handle error ... */ }
  return new Response(JSON.stringify({ success: true, submission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200,
  })
})
