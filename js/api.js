// ============================================
// API — Flask backend bilan bo'ladigan BARCHA aloqa shu yerda markazlashgan.
// Boshqa fayllarda hech qayerda to'g'ridan-to'g'ri fetch() chaqirilmaydi —
// shunda backend manzili yoki formati o'zgarsa, faqat shu faylni tuzatasiz.
// ============================================

import { API_BASE_URL } from './config.js';

// Ngrok bepul domenlar ba'zan JSON o'rniga HTML ogohlantirish sahifasini
// qaytaradi — bu header shu holatni oldini oladi.
const DEFAULT_HEADERS = {
    'ngrok-skip-browser-warning': 'true',
};

/**
 * Foydalanuvchi profilini oladi.
 * @returns {object|null} — foydalanuvchi topilmasa yoki xatolik bo'lsa null
 */
export async function fetchUserProfile(tgId) {
    const response = await fetch(`${API_BASE_URL}/api/user/${tgId}`, {
        headers: DEFAULT_HEADERS,
    });

    if (!response.ok) return null; // masalan, hali /start bosilmagan

    const res = await response.json();
    return res.status === 'success' ? res.data : null;
}

/**
 * Reyting (leaderboard) ro'yxatini oladi.
 * @returns {Array} — o'yinchilar ro'yxati
 * @throws {Error} — server xatoligi bo'lsa
 */
export async function fetchLeaderboard() {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
        throw new Error(`Server xatoligi: ${response.status}`);
    }

    const res = await response.json();
    if (res.status !== 'success') {
        throw new Error(res.message || "Noma'lum xatolik");
    }

    return res.data;
}

/**
 * Bajarilgan mashq natijasini (XP + reps) bazaga yuboradi.
 * @returns {object} — { telegram_id, total_xp, level, coins }
 * @throws {Error} — server xatoligi yoki tarmoq muammosi bo'lsa,
 *                    xabar ichida aniq status kodi va server javobi bo'ladi
 */
export async function submitWorkoutResult(tgId, xp, reps) {
    const response = await fetch(`${API_BASE_URL}/api/user/add_xp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...DEFAULT_HEADERS,
        },
        body: JSON.stringify({ telegram_id: tgId, xp, reps }),
    });

    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Status: ${response.status}. Javob: ${bodyText}`);
    }

    const res = await response.json();
    if (res.status !== 'success') {
        throw new Error(res.message || "Noma'lum xatolik");
    }

    return res.data;
}

/**
 * Do'kondagi barcha mahsulotlar katalogini oladi.
 * @returns {Array} — [{ id, name, slot, price, color }, ...]
 */
export async function fetchShopItems() {
    const response = await fetch(`${API_BASE_URL}/api/shop/items`, {
        headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
        throw new Error(`Server xatoligi: ${response.status}`);
    }

    const res = await response.json();
    if (res.status !== 'success') {
        throw new Error(res.message || "Noma'lum xatolik");
    }

    return res.data;
}

/**
 * Tangalarga mahsulot sotib oladi.
 * @returns {object} — { coins, owned_items }
 * @throws {Error} — tangalar yetmasa yoki boshqa xatolik bo'lsa
 */
export async function buyShopItem(tgId, itemId) {
    const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...DEFAULT_HEADERS,
        },
        body: JSON.stringify({ telegram_id: tgId, item_id: itemId }),
    });

    const res = await response.json();
    if (!response.ok || res.status !== 'success') {
        throw new Error(res.message || "Noma'lum xatolik");
    }

    return res.data;
}

/**
 * Sotib olingan mahsulotni personajga kiydiradi.
 * @returns {object} — { equipped_items }
 * @throws {Error} — mahsulot sotib olinmagan bo'lsa yoki boshqa xatolik
 */
export async function equipShopItem(tgId, itemId) {
    const response = await fetch(`${API_BASE_URL}/api/shop/equip`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...DEFAULT_HEADERS,
        },
        body: JSON.stringify({ telegram_id: tgId, item_id: itemId }),
    });

    const res = await response.json();
    if (!response.ok || res.status !== 'success') {
        throw new Error(res.message || "Noma'lum xatolik");
    }

    return res.data;
}