// supabase/functions/create-mission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // --- CORS HANDLING BLOCK (สำคัญมาก ต้องอยู่ตรงนี้เป๊ะๆ) ---
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*', // อนุญาต Origin ที่ร้องขอมา (Netlify)
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // อนุญาต Method POST และ OPTIONS
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // อนุญาต Headers ที่จำเป็น
  }

  // จัดการคำขอ OPTIONS (Preflight Request) ของเบราว์เซอร์
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // Status 204 (No Content) บอกเบราว์เซอร์ว่าผ่าน CORS
      headers: corsHeaders,
    })
  }
  // --- END CORS HANDLING BLOCK ---

  let requestBody;
  try {
      requestBody = await req.json(); // พยายามอ่าน JSON จาก Request Body
  } catch (jsonError) {
      console.error("Failed to parse request body as JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
      });
  }
  const { missionData } = requestBody; // ดึง missionData ออกจาก Request Body ที่อ่านได้

  // --- START: Admin Authentication Logic ---
  const authHeader = req.headers.get('Authorization') || ''
  const base64Token = authHeader.split('Bearer ')[1] // ดึง Base64 token จาก Authorization Header

  // Debugging logs (จะปรากฏใน Supabase Dashboard -> Edge Functions -> Logs)
  console.log('--- create-mission Function Log ---');
  console.log('Authorization Header received:', authHeader);
  console.log('Base64 Token:', base64Token);

  if (!base64Token) { // ถ้าไม่มี Token
    console.error('Error: Base64 token missing. Returning 401.');
    return new Response(JSON.stringify({ error: 'Authorization token missing.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // ใส่ CORS headers ใน Response Error ด้วย
      status: 401, // Unauthorized
    })
  }

  let decodedToken;
  try {
    decodedToken = JSON.parse(atob(base64Token)); // ถอดรหัส Base64 และแปลงเป็น JSON
  } catch (decodeError) { // ถ้าถอดรหัสไม่ได้ หรือ JSON ไม่ถูกต้อง
    console.error('Error decoding or parsing token:', decodeError);
    return new Response(JSON.stringify({ error: 'Invalid token format.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401, // Unauthorized
    })
  }

  const adminStudentId = parseInt(decodedToken.student_id, 10); // ดึง student_id
  const adminRole = decodedToken.role; // ดึง role

  console.log('Decoded Token:', decodedToken);
  console.log('Parsed adminStudentId:', adminStudentId);
  console.log('Parsed adminRole:', adminRole);

  // Optional debug break (ใช้สำหรับ Debug โดยเฉพาะ สามารถลบออกได้เมื่อใช้งานได้แล้ว)
  const shouldBreak = Deno.env.get('SHOULD_BREAK_FOR_DEBUG');
  if (shouldBreak === 'true' && adminStudentId !== 999) { // ตรวจสอบว่า student_id เป็น 999 หรือไม่ (สำหรับ Admin)
    throw new Error(`DEBUG_INFO: Expected student_id 999, got ${adminStudentId}. Role: ${adminRole}. Mission data grade: ${missionData?.grade}`); // โยน Error ที่เราควบคุมได้
  }


  if (isNaN(adminStudentId) || adminRole !== 'admin') { // ตรวจสอบ ID และ Role ต้องเป็นตัวเลขและ Admin
    console.error('Error: Invalid Admin ID or Role. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Invalid Admin credentials.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403, // Forbidden
    })
  }

  // สร้าง Supabase client ด้วย SERVICE_ROLE_KEY (จาก Secrets)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // --- END: Admin Authentication Logic ---

  // Insert the new mission into the database
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
      status: 400, // Bad Request
    })
  }

  // Success response
  return new Response(JSON.stringify({ success: true, mission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200, // OK
  })
})
