// ============================================
// MAIN — ilovaning kirish nuqtasi.
// Boshqa hech bir fayl bevosita ishga tushmaydi — hammasi shu yerdan boshlanadi.
// ============================================

import { tg } from './telegram.js';
import { showPage } from './navigation.js';
import { startWorkout, endWorkout } from './workout.js';
import { loadProfile } from './profile.js';

// ES modul ichidagi funksiyalar avtomatik global bo'lmaydi, lekin index.html
// da onclick="showPage(...)" kabi atributlar global funksiyalarni talab qiladi.
// Shuning uchun faqat shu 3 tasini ataylab window'ga ulaymiz.
window.showPage = showPage;
window.startGame = startWorkout;
window.endGame = endWorkout;

// Ilova ishga tushganda:
tg?.ready();       // Telegram'ga WebApp tayyor ekanini bildiramiz
loadProfile();     // Profil ma'lumotini darhol yuklaymiz