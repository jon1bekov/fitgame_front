// ============================================
// SOZLAMALAR — loyihaning barcha "magic number"lari shu yerda
// Server manzilini yoki o'yin balanslarini o'zgartirish kerak bo'lsa,
// FAQAT shu faylni tahrirlang.
// ============================================

// Backend (Flask) API manzili. Ngrok qayta ishga tushirilsa, shu yerni yangilang.
export const API_BASE_URL = 'https://impound-encrypt-lullaby.ngrok-free.dev';

// O'yin balansi
export const XP_PER_REPETITION = 2; // Har bir to'g'ri squat uchun XP

// Level chegaralari (cumulative XP). Level 1 0 XP dan boshlanadi.
// 1000 XP -> Level 2, 2500 XP -> Level 3, 5000 XP -> Level 4, keyin har 2500 XP da 1 level.
export const LEVEL_THRESHOLDS = [1000, 2500, 5000];

/** XP ga qarab levelni hisoblaydi */
export function calculateLevel(xp) {
    if (xp < LEVEL_THRESHOLDS[0]) return 1;
    if (xp < LEVEL_THRESHOLDS[1]) return 2;
    if (xp < LEVEL_THRESHOLDS[2]) return 3;
    return 4 + Math.floor((xp - LEVEL_THRESHOLDS[2]) / 2500);
}

/** Joriy level ichidagi progress miqdorini qaytaradi */
export function getLevelProgress(xp, level) {
    let prevThreshold;
    let nextThreshold;

    if (level === 1) {
        prevThreshold = 0;
        nextThreshold = LEVEL_THRESHOLDS[0];
    } else if (level === 2) {
        prevThreshold = LEVEL_THRESHOLDS[0];
        nextThreshold = LEVEL_THRESHOLDS[1];
    } else if (level === 3) {
        prevThreshold = LEVEL_THRESHOLDS[1];
        nextThreshold = LEVEL_THRESHOLDS[2];
    } else {
        prevThreshold = LEVEL_THRESHOLDS[2] + (level - 4) * 2500;
        nextThreshold = prevThreshold + 2500;
    }

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