// ============================================
// SOZLAMALAR — loyihaning barcha "magic number"lari shu yerda
// Server manzilini yoki o'yin balanslarini o'zgartirish kerak bo'lsa,
// FAQAT shu faylni tahrirlang.
// ============================================

// Backend (Flask) API manzili. Ngrok qayta ishga tushirilsa, shu yerni yangilang.
// export const API_BASE_URL = 'https://16.170.156.12.sslip.io';
export const API_BASE_URL = 'https://impound-encrypt-lullaby.ngrok-free.dev';

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

// Squat aniqlash va To'g'ri Forma sozlamalari (Anti-Cheat & Posture Check)
export const MIN_SQUAT_DURATION = 750;     // ms — mashqlar orasidagi minimal oraliq
export const SQUAT_KNEE_ANGLE = 95;        // To'liq o'tirish burchagi (95° dan kichik bo'lishi shart)
export const STAND_KNEE_ANGLE = 160;       // To'liq tik turish burchagi (160° dan katta bo'lishi shart)
export const MAX_HIP_DROP_RATIO = 0.35;    // Chanoq va tizza vertikal nisbati (son gorizontal bo'lishi shart)
export const MIN_HIP_ANGLE = 50;           // Belni haddan tashqari bukib yuborishni cheklash (Good Morning oldini olish)
export const VISIBILITY_THRESHOLD = 0.5;   // Tana a'zolari ko'rinish sharti