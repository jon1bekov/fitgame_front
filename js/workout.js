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

let isSubmitting = false; // Qayta-qayta yuborishning (double-submit) oldini olish uchun

/** "BOSHLASH" tugmasi bosilganda chaqiriladi */
export function startWorkout() {
    isSubmitting = false;
    finishBtn.disabled = false;

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
    // MUHIM TUZATISH: avvalgi versiyada tugma natija saqlanayotgan vaqtda ham
    // bosilishi mumkin edi — har bosishda bir xil natija QAYTA yuborilib,
    // XP bir necha marta qo'shilib ketardi. Endi funksiya ishlab turgan
    // paytda qayta chaqirilishning oldi olinadi.
    if (isSubmitting) return;
    isSubmitting = true;
    finishBtn.disabled = true;

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
        const data = await submitWorkoutResult(totalXpEarned, count);

        hapticNotify('success');
        updateProfileUI(data.total_xp, data.level, data.coins); // Profilni qayta so'rovsiz darhol yangilaymiz

        alert(
            `Daxshat natija! 🏆\n\n` +
                `Mashq turi: Squat (O'tirish)\n` +
                `Mashq miqdori: ${count} ta\n` +
                `Siz yutdingiz: +${totalXpEarned} XP va +${count} 🪙 tanga\n\n` +
                `Jami yangi balingiz: ${data.total_xp} XP\n` +
                `Hozirgi Darajangiz (Level): ${data.level}\n` +
                `Tangalar: ${data.coins} 🪙`
        );

        // Mini app ni YOPMAYMIZ, bosh sahifaga qaytib profilni yangilaymiz
        // MUHIM TUZATISH: avvalgi versiyada document.querySelector('.nav-link')
        // ishlatilgan edi — bu HTML'dagi BIRINCHI nav-link elementini tanlaydi,
        // hozircha tasodifan Profil bo'lgani uchun ishlaydi, lekin navigatsiya
        // tartibi o'zgarsa jimgina buziladi. ID orqali ishonchli tanlaymiz.
        const profileNav = document.getElementById('nav-profile');
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