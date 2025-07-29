import { writable } from 'svelte/store';

// ตรวจสอบว่าโค้ดกำลังรันในเบราว์เซอร์หรือไม่ (ป้องกัน Error ตอน Build)
const isBrowser = typeof window !== 'undefined';

// 1. ลองหาข้อมูล user จาก localStorage ตอนเริ่มต้น
const storedUser = isBrowser ? localStorage.getItem('app_user_session') : null;

// 2. สร้าง writable store โดยใช้ข้อมูลที่เจอ (ถ้าไม่เจอก็เป็น null)
const initialUser = storedUser ? JSON.parse(storedUser) : null;
export const user = writable(initialUser);

// 3. ทุกครั้งที่ค่าใน user store เปลี่ยน (เช่น ตอน login/logout) ฟังก์ชันนี้จะทำงาน
if (isBrowser) {
  user.subscribe(value => {
    if (value) {
      // ถ้ามีข้อมูล (login) ให้บันทึกเป็นข้อความลง localStorage
      localStorage.setItem('app_user_session', JSON.stringify(value));
    } else {
      // ถ้าไม่มีข้อมูล (logout) ให้ลบข้อมูลออกจาก localStorage
      localStorage.removeItem('app_user_session');
    }
  });
}