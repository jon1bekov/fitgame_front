const tg = window.Telegram.WebApp;
tg.expand();

// Mashq o'zgaruvchilari
let squatCount = 0;
let isActive = false;
let stage = "up"; // "up" yoki "down"
let lastStepTime = 0; 

// Sozlamalar (Anti-cheat)
const MIN_SQUAT_TIME = 800; // 0.8 soniyadan tez harakatlar hisoblanmaydi
const GO_DOWN_LIMIT = 75;   // Pastga tushish burchagi
const GO_UP_LIMIT = 35;     // Yuqoriga chiqish burchagi

// Sahifalar navigatsiyasi
function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    if (pageId !== 'workout') stopMotion();
}

// Mashqni boshlash
function startGame() {
    squatCount = 0;
    document.getElementById('count').innerText = 0;
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    isActive = true;
    stage = "up";
    
    // Sensorlarga ruxsat olish (iOS uchun muhim)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(res => {
                if (res === 'granted') {
                    window.addEventListener('deviceorientation', handleSquat);
                } else {
                    alert("Sensorlarga ruxsat berilmadi!");
                }
            })
            .catch(e => console.error(e));
    } else {
        window.addEventListener('deviceorientation', handleSquat);
    }
}

// Sensorni to'xtatish
function stopMotion() {
    isActive = false;
    window.removeEventListener('deviceorientation', handleSquat);
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('finish-btn').style.display = 'none';
    document.getElementById('status').innerText = "TAYYORMISIZ?";
    document.getElementById('status').style.color = "#888";
}

// Harakatni qayta ishlash (Asosiy mantiq)
function handleSquat(event) {
    if (!isActive) return;

    let beta = event.beta; // Telefonning egilish burchagi
    let currentTime = new Date().getTime();

    // 1. PASTGA HARAKAT (Checkpoint)
    if (beta > GO_DOWN_LIMIT) {
        if (stage === "up") {
            stage = "down";
            document.getElementById('status').innerText = "PASTGA... ✅";
            document.getElementById('status').style.color = "#00f2ff";
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    // 2. YUQORIGA HARAKAT (Hisoblash)
    if (beta < GO_UP_LIMIT && stage === "down") {
        // ANTI-CHEAT: Vaqtni tekshiramiz
        if (currentTime - lastStepTime > MIN_SQUAT_TIME) {
            squatCount++;
            stage = "up";
            lastStepTime = currentTime;

            // UI ni yangilash
            document.getElementById('count').innerText = squatCount;
            document.getElementById('status').innerText = "BARAKALLA! 🔥";
            document.getElementById('status').style.color = "#00ff88";

            // Vibratsiya (Muvaffaqiyatli takrorlash)
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            // Agar juda tez siltalsa (Cheat harakati)
            document.getElementById('status').innerText = "JUDA TEZ! SEKINROQ... ⚠️";
            document.getElementById('status').style.color = "#ff9900";
            tg.HapticFeedback.notificationOccurred('error');
            stage = "up"; // Ochko bermasdan holatni qaytaramiz
        }
    }
}

// Mashqni tugatish va ma'lumotni BOTga yuborish
function endGame() {
    if (squatCount > 0) {
        // Botga JSON formatida ma'lumot ketadi
        const resultData = {
            type: 'squat',
            reps: squatCount,
            xp: squatCount * 10, // Har biriga 10 XP
            timestamp: new Date().toISOString()
        };

        // Telegramga yuborish
        tg.sendData(JSON.stringify(resultData));
        
        // Ilovani yopish
        tg.close();
    } else {
        alert("Siz hali birorta ham takrorlash bajarmadingiz!");
    }
}

// Ilova yuklanganda URL parametrlarini o'qish (Agar botdan ma'lumot kelsa)
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userXP = urlParams.get('xp') || 0;
    const userLVL = urlParams.get('lvl') || 1;

    // Profil sahifasidagi ma'lumotlarni yangilash
    const xpText = document.querySelector('p[style*="color: #888"]');
    if (xpText) xpText.innerText = `XP: ${userXP} / 1000`;
    
    const lvlText = document.querySelector('.stats-card span:nth-child(1)');
    if (lvlText) lvlText.innerText = `LVL: ${userLVL}`;
};