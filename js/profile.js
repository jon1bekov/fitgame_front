// ============================================
// PROFILE — profil sahifasini (LVL, RANK, XP progress, Coins, Kiyimlar) boshqaradi.
// ============================================

import { fetchUserProfile, fetchShopItems } from './api.js';
import { getTelegramUserId } from './telegram.js';
import { calculateLevel, getLevelProgress } from './config.js';

// Do'kon katalogini bir marta yuklab keshda saqlaymiz (har safar qayta so'ramaslik uchun)
let shopItemsCache = null;

async function getShopItemsCached() {
    if (!shopItemsCache) {
        shopItemsCache = await fetchShopItems();
    }
    return shopItemsCache;
}

/** Kiyilgan (equipped) narsalarning rangini personajga (SVG CSS o'zgaruvchilari orqali) qo'llaydi. */
export async function applyEquippedItems(equippedItems) {
    const hero = document.getElementById('game-hero');
    if (!hero || !equippedItems) return;

    const items = await getShopItemsCached();

    for (const slot in equippedItems) {
        const itemId = equippedItems[slot];
        const item = items.find((i) => i.id === itemId);
        if (item) {
            hero.style.setProperty(`--${slot}-color`, item.color);
        }
    }
}

/** Levelga qarab personajning tashqi ko‘rinishini (tier) yangilaydi va,
 *  agar daraja haqiqatan o'zgargan bo'lsa, qisqa "evolyutsiya portlashi"
 *  animatsiyasini ishga tushiradi. */
function updateHeroTier(level) {
    const hero = document.getElementById('game-hero');
    if (!hero) return;

    let tier = 'novice';
    if (level >= 15) tier = 'legend';
    else if (level >= 7) tier = 'warrior';
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

export function updateProfileUI(xp, level, coins) {
    const { currentInLevel, neededForLevel, progressPercent } = getLevelProgress(xp, level);

    let rank = 'NOVICE';
    if (level >= 15) rank = 'LEGEND';
    else if (level >= 7) rank = 'WARRIOR';
    else if (level >= 3) rank = 'FIGHTER';

    document.getElementById('lvl-display').innerText = `LVL: ${String(level).padStart(2, '0')}`;
    document.getElementById('rank-display').innerText = `RANK: ${rank}`;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('xp-display').innerText = `XP: ${currentInLevel} / ${neededForLevel}`;

    // Coins ixtiyoriy parametr — chaqirilgan joyda hali mavjud bo'lmasligi mumkin
    if (typeof coins === 'number') {
        const coinsEl = document.getElementById('coins-display');
        if (coinsEl) coinsEl.innerText = `🪙 ${coins}`;
    }

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
        updateProfileUI(data.xp, level, data.coins || 0);
        applyEquippedItems(data.equipped_items);
    }
}