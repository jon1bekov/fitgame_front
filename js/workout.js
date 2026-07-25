// ============================================
// WORKOUT — mashqni boshlash/tugatish oqimi.
// Kamera mantig'ini (pose-tracker) va serverga yuborishni (api) bog'laydi.
// ============================================

import { startTracking, stopTracking, getRepCount } from './pose-tracker.js';
import { submitWorkoutResult } from './api.js';
import { getTelegramUserId, tg, hapticNotify } from './telegram.js';
import { updateProfileUI } from './profile.js';
import { XP_PER_REPETITION } from './config.js';

const statusElement = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
const finishBtn = document.getElementById('finish-btn');

/** "BOSHLASH" tugmasi bosilganda chaqiriladi */
export function startWorkout() {
    tg?.expand();
    startBtn.style.display = 'none';
    finishBtn.style.display = 'block';
    statusElement.innerText = 'KAMERADAN 2 METR ORQAGA SURILING';
    statusElement.style.color = 'white';

    startTracking().catch(() => {
        alert('Kameraga ruxsat berishda xatolik yuz berdi!');
    });
}

/** "TUGATISH & SAQLASH" tugmasi bosilganda chaqiriladi */
export async function endWorkout() {
    stopTracking();
    const count = getRepCount();

    if (count <= 0) {
        alert("Siz hali birorta ham to'g'ri mashq bajarmadingiz!");
        location.reload();
        return;
    }

    statusElement.innerText = 'NATIJA SAQLANMOQDA... ⏳';
    statusElement.style.color = 'yellow';

    const tgId = getTelegramUserId();

    // Telegram tashqarisida (test rejimida) ID topilmasa, bazaga yozmasdan xabar beramiz
    if (!tgId) {
        alert(`[Test Rejimi] Haqiqiy Telegram ID topilmadi.\nBajarildi: ${count} ta o'tirish.`);
        location.reload();
        return;
    }

    const totalXpEarned = count * XP_PER_REPETITION;

    try {
        const data = await submitWorkoutResult(tgId, totalXpEarned);

        hapticNotify('success');
        updateProfileUI(data.total_xp, data.level); // Profilni qayta so'rovsiz darhol yangilaymiz

        alert(
            `Daxshat natija! 🏆\n\n` +
                `Mashq turi: Squat (O'tirish)\n` +
                `Mashq miqdori: ${count} ta\n` +
                `Siz yutdingiz: +${totalXpEarned} XP\n\n` +
                `Jami yangi balingiz: ${data.total_xp} XP\n` +
                `Hozirgi Darajangiz (Level): ${data.level}`
        );

        // Mini app ni YOPMAYMIZ, bosh sahifaga qaytib profilni yangilaymiz
        const profileNav = document.querySelector('.nav-link');
        window.showPage('profile', profileNav);

        // Workout sahifasini keyingi mashq uchun boshlang'ich holatga qaytamiz
        startBtn.style.display = 'block';
        finishBtn.style.display = 'none';
        statusElement.innerText = 'AI QIDIRILMOQDA...';
        statusElement.style.color = '#888';
    } catch (err) {
        console.error('Server bilan aloqa uzildi:', err);
        alert('Aloqa xatosi: Natijangiz bazada saqlana olmadi.\n' + err.message);
        location.reload();
    }
}