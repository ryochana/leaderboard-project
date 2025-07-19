// supabase/functions/create-mission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // --- CORS HANDLING BLOCK (สำคัญมาก ต้องอยู่ตรงนี้เป๊ะๆ) ---
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
  const { missionData } = requestBody;

  // --- START: Admin Authentication Logic (แก้ไขตรงนี้) ---
  // *** จุดที่แก้ไข: ดึง Token จาก 'X-Admin-Auth' Header แทน 'Authorization' ***
  const base64Token = req.headers.get('X-Admin-Auth'); // ดึง custom token

  console.log('--- create-mission Function Log ---');
  console.log('X-Admin-Auth Header received (Base64 Token):', base64Token); // เปลี่ยน Log message

  if (!base64Token) {
    console.error('Error: X-Admin-Auth token missing. Returning 401.');
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

  const shouldBreak = Deno.env.get('SHOULD_BREAK_FOR_DEBUG');
  if (shouldBreak === 'true' && adminStudentId !== 999) {
    throw new Error(`DEBUG_INFO: Expected student_id 999, got ${adminStudentId}. Role: ${adminRole}. Mission data grade: ${missionData?.grade}`);
  }

  if (isNaN(adminStudentId) || adminRole !== 'admin') {
    console.error('Error: Invalid Admin ID or Role. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Invalid Admin credentials.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403,
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  // --- END: Admin Authentication Logic ---

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
  
  if (error) { /* ... handle error ... */ }
  return new Response(JSON.stringify({ success: true, mission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200,
  })
})
