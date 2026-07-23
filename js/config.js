// ============================================
// SOZLAMALAR — loyihaning barcha "magic number"lari shu yerda
// Server manzilini yoki o'yin balanslarini o'zgartirish kerak bo'lsa,
// FAQAT shu faylni tahrirlang.
// ============================================

// Backend (Flask) API manzili. Ngrok qayta ishga tushirilsa, shu yerni yangilang.
export const API_BASE_URL = 'https://impound-encrypt-lullaby.ngrok-free.dev';

// O'yin balansi
export const XP_PER_REPETITION = 50; // Har bir to'g'ri squat uchun XP
export const XP_PER_LEVEL = 500;     // Har bir levelga kerakli XP miqdori

// Squat aniqlash sozlamalari (Anti-Hack)
export const MIN_SQUAT_DURATION = 1200;   // ms — juda tez harakatni rad etish
export const SQUAT_ANGLE_LIMIT = 100;     // O'tirish burchagi (shundan kichik)
export const STAND_ANGLE_LIMIT = 160;     // Turish burchagi (shundan katta)
export const VISIBILITY_THRESHOLD = 0.5;  // Tana a'zolari ko'rinish sharti (real qurilmalarda 0.8 juda qattiq edi)