// ============================================
// SOZLAMALAR — loyihaning barcha "magic number"lari shu yerda
// Server manzilini yoki o'yin balanslarini o'zgartirish kerak bo'lsa,
// FAQAT shu faylni tahrirlang.
// ============================================

// Backend (Flask) API manzili. Ngrok qayta ishga tushirilsa, shu yerni yangilang.
export const API_BASE_URL = 'https://16.170.156.12.sslip.io';

// O'yin balansi
export const XP_PER_REPETITION = 2; // Har bir to'g'ri squat uchun XP

// Level tizimi: kvadratik XP egri chizig'i.
// Level L ga yetish uchun kerakli JAMI XP = LEVEL_XP_FACTOR * L * (L - 1)
// Boshida tez (Level 2 — bir sessiyada), keyin asta-sekin qiyinlashadi.
// MUHIM: bu formula backend'dagi (main.py) calculate_level bilan AYNAN bir xil bo'lishi kerak.
export const LEVEL_XP_FACTOR = 100;

/** Berilgan levelga yetish uchun kerakli JAMI (cumulative) XP */
export function xpForLevel(level) {
    return LEVEL_XP_FACTOR * level * (level - 1);
}

/** XP ga qarab levelni hisoblaydi (yuqoridagi formulaning teskarisi) */
export function calculateLevel(xp) {
    const level = Math.floor((1 + Math.sqrt(1 + (4 * xp) / LEVEL_XP_FACTOR)) / 2);
    return Math.max(1, level);
}

/** Joriy level ichidagi progress miqdorini qaytaradi */
export function getLevelProgress(xp, level) {
    const prevThreshold = xpForLevel(level);
    const nextThreshold = xpForLevel(level + 1);

    const currentInLevel = xp - prevThreshold;
    const neededForLevel = nextThreshold - prevThreshold;
    const progressPercent = Math.min(100, Math.round((currentInLevel / neededForLevel) * 100));

    return { currentInLevel, neededForLevel, progressPercent };
}

// Squat aniqlash sozlamalari (Anti-Hack)
export const MIN_SQUAT_DURATION = 1200;   // ms — juda tez harakatni rad etish
export const SQUAT_ANGLE_LIMIT = 100;     // O'tirish burchagi (shundan kichik)
export const STAND_ANGLE_LIMIT = 160;     // Turish burchagi (shundan katta)
export const VISIBILITY_THRESHOLD = 0.5;  // Tana a'zolari ko'rinish sharti (real qurilmalarda 0.8 juda qattiq edi)