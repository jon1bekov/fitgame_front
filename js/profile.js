// ============================================
// PROFILE — profil sahifasini (LVL, RANK, XP progress) boshqaradi.
// ============================================

import { fetchUserProfile } from './api.js';
import { getTelegramUserId } from './telegram.js';
import { calculateLevel, getLevelProgress } from './config.js';

/**
 * Profil interfeysini berilgan XP/level qiymatlari bilan yangilaydi.
 * Bu funksiya boshqa modullardan ham chaqiriladi (masalan, mashq
 * tugagandan keyin workout.js dan) — shuning uchun alohida export qilingan.
 */
export function updateProfileUI(xp, level) {
    const { currentInLevel, neededForLevel, progressPercent } = getLevelProgress(xp, level);

    let rank = 'NOVICE';
    if (level >= 10) rank = 'LEGEND';
    else if (level >= 6) rank = 'WARRIOR';
    else if (level >= 3) rank = 'FIGHTER';

    document.getElementById('lvl-display').innerText = `LVL: ${String(level).padStart(2, '0')}`;
    document.getElementById('rank-display').innerText = `RANK: ${rank}`;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('xp-display').innerText = `XP: ${currentInLevel} / ${neededForLevel}`;
}

/** Profil ma'lumotini backend'dan yuklab, ekranga chiqaradi. */
export async function loadProfile() {
    const tgId = getTelegramUserId();
    if (!tgId) return; // Test rejimida (Telegram tashqarisida) jim o'tkazib yuboramiz

    const data = await fetchUserProfile(tgId);
    if (data) {
        // XP dan levelni qayta hisoblaymiz — bu DB'dagi eski level bilan mos kelmasligini oldini oladi
        const level = calculateLevel(data.xp);
        updateProfileUI(data.xp, level);
    }
}