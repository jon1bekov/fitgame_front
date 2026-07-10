// Telegram WebApp obyektini xavfsiz va global aniqlash
const tg = window.Telegram?.WebApp;

// MUHIM TUZATISH: avvalgi versiyada bu funksiya IKKI marta e'lon qilingan edi
// (ikkinchisi birinchisini "bekor qilardi") va aslida hech qayerda
// chaqirilmasdi ham. Ikkala usulni birlashtirib, bitta ishlaydigan
// funksiyaga aylantirdik: avval Telegram'ning o'zidan ID olishga harakat
// qilamiz, topilmasa — URL'dagi ?user_id= parametridan olamiz.
function getTelegramUserId() {
    if (tg?.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('user_id');
    if (tgId) {
        console.log("ID linkdan muvaffaqiyatli olindi:", tgId);
        return tgId;
    }
    return null;
}

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

// O'yin o'zgaruvchilari
let count = 0;
let stage = "up";
let isActive = false;
let lastSquatTime = 0;

// API Sozlamalari (Production'da buni o'zingizning server domeningizga o'zgartiring)
// MUHIM TUZATISH: qo'shtirnoqdan keyin bo'sh joy bor edi (' https://...'),
// bu fetch() so'rovlarini "Failed to fetch" xatoligi bilan buzardi.
const API_BASE_URL = 'https://impound-encrypt-lullaby.ngrok-free.dev';
const XP_PER_REPETITION = 50; // Har bir to'g'ri squat uchun beriladigan XP balli

// Sozlamalar (Anti-Hack)
const MIN_SQUAT_DURATION = 1200;  // 1.2 soniya (juda tez harakat qilib aldashni oldini olish)
const SQUAT_ANGLE_LIMIT = 100;    // O'tirish burchagi (shundan kichik bo'lishi kerak)
const STAND_ANGLE_LIMIT = 160;    // Turish burchagi (shundan katta bo'lishi kerak)
const VISIBILITY_THRESHOLD = 0.8; // 80% tana a'zolari ko'rinish sharti

// --- 2. BURCHAKNI HISOBLASH FUNKSIYASI ---
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// --- 3. SUN'IY INTELLEKT (MEDIAPIPE) NATIJALARINI QAYTA ISHLASH ---
function onResults(results) {
    if (!isActive) return;

    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Agar ekranda odam kadrda bo'lmasa
    if (!results.poseLandmarks) {
        statusElement.innerText = "ODAM TOPILMADI 👤";
        statusElement.style.color = "red";
        canvasCtx.restore();
        return;
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];   // Bel (Hip)
    const knee = landmarks[25];  // Tizza (Knee)
    const ankle = landmarks[27]; // To'piq (Ankle)

    // --- ANTI-HACK: KO'RINISHNI QAT'IY TEKSHIRISH ---
    const isVisible = hip.visibility > VISIBILITY_THRESHOLD &&
                      knee.visibility > VISIBILITY_THRESHOLD &&
                      ankle.visibility > VISIBILITY_THRESHOLD;

    if (!isVisible) {
        statusElement.innerText = "TO'LIQ KO'RINMAYAPSIZ! ⚠️";
        statusElement.style.color = "orange";
        canvasCtx.restore();
        return;
    }

    // Skeleton chizish (Faqat odam to'liq kadrda bo'lsa)
    drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, {color: '#00f2ff', lineWidth: 4});
    drawLandmarks(canvasCtx, landmarks, {color: '#bc13fe', lineWidth: 1, radius: 3});

    const angle = calculateAngle(hip, knee, ankle);
    const hipY = hip.y;

    document.getElementById('angle-text').innerText = `Angle: ${Math.round(angle)}° | Status: OK`;

    // --- MASHQ MANTIQI (FULL CYCLE SQUAT) ---

    // A) Pastga o'tirish bosqichi
    if (angle < SQUAT_ANGLE_LIMIT && hipY > 0.65) {
        if (stage === "up") {
            stage = "down";
            statusElement.innerText = "YAXSHI, ENDI TEPAGA! ⬆️";
            statusElement.style.color = "#bc13fe";
            tg?.HapticFeedback?.impactOccurred('light'); // Telefonda yengil vibratsiya
        }
    }

    // B) Tepaga qayta turish va natijani hisoblash bosqichi
    if (angle > STAND_ANGLE_LIMIT && hipY < 0.6) {
        if (stage === "down") {
            let currentTime = Date.now();

            // Vaqt filtri: Siltab aldashga (hack) yo'l qo'ymaydi
            if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
                count++;
                stage = "up";
                lastSquatTime = currentTime;

                // UI dagi hisoblagichni yangilash va animatsiya qo'shish
                const countEl = document.getElementById('count');
                countEl.innerText = count;
                countEl.classList.add('count-bump');
                setTimeout(() => countEl.classList.remove('count-bump'), 200);

                statusElement.innerText = "BARAKALLA! 🔥";
                statusElement.style.color = "#00f2ff";
                tg?.HapticFeedback?.notificationOccurred('success'); // Muvaffaqiyatli vibratsiya
            } else {
                // Agar o'ta tez va xato harakat bo'lsa
                stage = "up";
                statusElement.innerText = "JUDA TEZ! SEKINROQ... ⚠️";
                statusElement.style.color = "yellow";
            }
        }
    }
    canvasCtx.restore();
}

// --- 4. MEDIAPIPE POSE MODELINI SOZLANMALARI ---
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

pose.onResults(onResults);

// --- 5. KAMERA BOSHQARUVI ---
const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isActive) {
            await pose.send({image: videoElement});
        }
    },
    width: 640,
    height: 480
});

// --- 6. MINI APP SAHIFALARINI BOSHQARISH ---
function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    if (pageId !== 'workout') {
        isActive = false;
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// --- 7. O'YINNI BOSHLASH (START GAME) ---
function startGame() {
    tg?.expand(); // Telegram oynasini to'liq ochish
    isActive = true;
    count = 0;
    stage = "up";
    document.getElementById('count').innerText = "0";
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    statusElement.innerText = "KAMERADAN 2 METR ORQAGA SURILING";
    statusElement.style.color = "white";

    camera.start().catch(err => {
        alert("Kameraga ruxsat berishda xatolik yuz berdi!");
    });
}

// --- 8. O'YINNI TUGATISH VA FLASK API ORQALI BAZANI YANGILASH ---
function endGame() {
    isActive = false;

    // Telefon qizib ketmasligi uchun kamerani o'chiramiz
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }

    if (count > 0) {
        statusElement.innerText = "NATIJA SAQLANMOQDA... ⏳";
        statusElement.style.color = "yellow";

        // Telegram foydalanuvchi ma'lumotlarini olish (endi yagona funksiyadan)
        const tgId = getTelegramUserId();

        // Agar foydalanuvchi Telegram ichida emas, oddiy brauzerda test qilayotgan bo'lsa
        if (!tgId) {
            alert(`[Test Rejimi] Haqiqiy Telegram ID topilmadi.\nBajarildi: ${count} ta o'tirish.`);
            location.reload();
            return;
        }

        // To'plangan umumiy XP miqdorini hisoblaymiz
        const totalXpEarned = count * XP_PER_REPETITION;

        // Flask API'ga xavfsiz POST so'rovi yuborish
        fetch(`${API_BASE_URL}/api/user/add_xp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // MUHIM TUZATISH: ngrok bepul domenlar ba'zan birinchi so'rovda
                // JSON o'rniga HTML "ogohlantirish" sahifasini qaytaradi, bu esa
                // response.json() da "Unexpected token '<'" xatoligiga olib keladi.
                // Bu header shu ogohlantirish sahifasini chetlab o'tadi.
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                telegram_id: tgId,
                xp: totalXpEarned
            })
        })
        .then(response => {
            if (!response.ok) throw new Error("API xatoligi");
            return response.json();
        })
        .then(res => {
            if (res.status === "success") {
                tg?.HapticFeedback?.notificationOccurred('success');

                // Muvaffaqiyatli yakuniy xabar
                alert(
                    `Daxshat natija! 🏆\n\n` +
                    `Mashq turi: Squat (O'tirish)\n` +
                    `Miqdori: ${count} ta\n` +
                    `Siz yutdingiz: +${totalXpEarned} XP\n\n` +
                    `Jami yangi balingiz: ${res.data.total_xp} XP\n` +
                    `Hozirgi Darajangiz (Level): ${res.data.level}`
                );

                tg?.close(); // Mini App'ni avtomatik yopish
            } else {
                alert("Xatolik: " + res.message);
                location.reload();
            }
        })
        .catch(err => {
            console.error("Server bilan aloqa uzildi:", err);
            alert("Aloqa xatosi: Natijangiz bazada saqlana olmadi.");
            location.reload();
        });

    } else {
        alert("Siz hali birorta ham to'g'ri mashq bajarmadingiz!");
        location.reload();
    }
}

// Telegram WebApp yuklanganini bildirish
tg?.ready();