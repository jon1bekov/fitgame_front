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
/** Levelga qarab personajning tashqi ko‘rinishini (tier) yangilaydi va,
 *  agar daraja haqiqatan o'zgargan bo'lsa, qisqa "evolyutsiya portlashi"
 *  animatsiyasini ishga tushiradi. */
function updateHeroTier(level) {
    const hero = document.getElementById('game-hero');
    if (!hero) return;

    let tier = 'novice';
    if (level >= 10) tier = 'legend';
    else if (level >= 6) tier = 'warrior';
    else if (level >= 3) tier = 'fighter';

    const previousTier = hero.getAttribute('data-tier');
    hero.setAttribute('data-tier', tier);

    // Daraja birinchi marta emas, balki HAQIQATAN o'zgargan bo'lsagina portlash effektini ko'rsatamiz
    if (previousTier && previousTier !== tier) {
        hero.classList.remove('hero--evolving');
        // Reflow orqali animatsiyani qaytadan ishga tushiramiz (class qayta qo'shilganda ham ishlashi uchun)
        void hero.offsetWidth;
        hero.classList.add('hero--evolving');
        setTimeout(() => hero.classList.remove('hero--evolving'), 750);
    }
}

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

    updateHeroTier(level);
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