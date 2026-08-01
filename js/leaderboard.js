// ============================================
// LEADERBOARD — reyting sahifasini boshqaradi.
// ============================================

import { fetchLeaderboard } from './api.js';
import { getTelegramUserId } from './telegram.js';

/** Reyting ro'yxatini backend'dan yuklab, ekranga chiqaradi. */
export async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    listEl.innerHTML = '<p style="text-align: center; color: #555;">Yuklanmoqda...</p>';

    try {
        const players = await fetchLeaderboard();

        if (!players.length) {
            listEl.innerHTML = '<p style="text-align: center; color: #555;">Hali natijalar yo\'q</p>';
            return;
        }

        const currentTgId = String(getTelegramUserId());

        listEl.innerHTML = players
            .map((player, index) => {
                const isMe = String(player.telegram_id) === currentTgId;
                const nameColor = isMe ? 'var(--game-orange)' : '#e0e0e0';
                return `
                    <div>
                        <span style="color:${nameColor}; font-weight:${isMe ? 'bold' : 'normal'};">
                            ${index + 1}. ${player.full_name || 'Foydalanuvchi'}
                        </span>
                        <span style="color: var(--game-green); font-weight: 800;">${player.xp} XP · LVL ${player.level}</span>
                    </div>
                `;
            })
            .join('');
    } catch (err) {
        console.error('Reytingni yuklashda xatolik:', err);
        listEl.innerHTML = '<p style="text-align: center; color: red;">Yuklashda xatolik yuz berdi</p>';
    }
}