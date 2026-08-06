// ============================================
// NAVIGATION — sahifalar (Profile / Workout / Leaderboard) aro o'tishni boshqaradi.
// ============================================

import { stopTracking } from './pose-tracker.js';
import { loadProfile } from './profile.js';
import { loadLeaderboard } from './leaderboard.js';
import { loadShop } from './shop.js';

/** Pastki navigatsiya menyusidan chaqiriladi (HTML'dagi onclick orqali). */
export function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach((n) => n.classList.remove('active'));
    el.classList.add('active');

    // Boshqa sahifaga o'tilsa, kamerani o'chirib batareyani tejaymiz
    if (pageId !== 'workout') {
        stopTracking();
    }

    // Sahifaga kirganda ma'lumotni har doim yangilab turamiz
    if (pageId === 'profile') loadProfile();
    if (pageId === 'leaderboard') loadLeaderboard();
    if (pageId === 'shop') loadShop();
}