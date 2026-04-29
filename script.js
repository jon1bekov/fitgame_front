const tg = window.Telegram.WebApp;
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

// O'yin o'zgaruvchilari
let count = 0;
let stage = "up"; 
let isActive = false;
let lastSquatTime = 0;

// Sozlamalar
const MIN_SQUAT_DURATION = 1100; // 1.1 soniyadan tez harakatlar "cheat" hisoblanadi
const SQUAT_ANGLE_LIMIT = 100;   // O'tirish burchagi (100 darajadan past bo'lishi kerak)
const STAND_ANGLE_LIMIT = 160;   // Turish burchagi (160 darajadan yuqori bo'lishi kerak)

// 1. Burchakni hisoblash funksiyasi
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// 2. AI natijalarini qayta ishlash
function onResults(results) {
    if (!results.poseLandmarks || !isActive) return;

    // Canvasni tozalash va kamerani chizish
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Karkasni (skeleton) chizish
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00f2ff', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#bc13fe', lineWidth: 1, radius: 3});
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];   // Bel
    const knee = landmarks[25];  // Tizza
    const ankle = landmarks[27]; // To'piq

    const angle = calculateAngle(hip, knee, ankle);
    const hipY = hip.y; // Belning ekrandagi balandligi (0.0 tepa - 1.0 past)

    // Ekranda burchak va balandlikni ko'rsatish
    document.getElementById('angle-text').innerText = `Angle: ${Math.round(angle)}° | Hip: ${hipY.toFixed(2)}`;

    // 3. ANTI-HACK MANTIQI (Ikki bosqichli tekshiruv)
    
    // TEPADA: Burchak katta va bel ekranda yuqorida (Y < 0.6)
    if (angle > STAND_ANGLE_LIMIT && hipY < 0.6) {
        if (stage === "down") {
            statusElement.innerText = "YAXSHI! DAVOM ETAMIZ 🔥";
            statusElement.style.color = "#00f2ff";
        }
        stage = "up";
    }
    
    // PASTDA: Burchak kichik VA bel haqiqatan pastga tushgan (Y > 0.7)
    if (angle < SQUAT_ANGLE_LIMIT && hipY > 0.7 && stage === "up") {
        let currentTime = Date.now();
        
        // VAQT FILTRI: Siltashga qarshi himoya
        if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
            stage = "down";
            count++;
            lastSquatTime = currentTime;

            // UI yangilash
            const countEl = document.getElementById('count');
            countEl.innerText = count;
            countEl.classList.add('count-bump'); // CSS animatsiya uchun
            setTimeout(() => countEl.classList.remove('count-bump'), 200);

            statusElement.innerText = "ENDI KO'TARILING! ⬆️";
            statusElement.style.color = "#bc13fe";
            
            // Telegram Vibratsiya
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            // Agar juda tez bajarilsa (Hack/Cheat urinishi)
            statusElement.innerText = "JUDA TEZ! SIFATLIROQ QILING ⚠️";
            statusElement.style.color = "#ffcc00";
            tg.HapticFeedback.notificationOccurred('warning');
        }
    }
    canvasCtx.restore();
}

// 4. MediaPipe Pose Sozlamalari
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

// 5. Kamera boshqaruvi
const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isActive) {
            await pose.send({image: videoElement});
        }
    },
    width: 480,
    height: 480
});

// 6. Navigatsiya va Tugmalar
function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    
    // Agar boshqa sahifaga o'tsa kamerani to'xtatish
    if (pageId !== 'workout') {
        isActive = false;
        // Resurslarni tejash uchun videoni to'xtatamiz
        videoElement.pause();
    }
}

function startGame() {
    tg.expand();
    isActive = true;
    count = 0;
    document.getElementById('count').innerText = "0";
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    statusElement.innerText = "KAMERA OLDIDA TO'LIQ KO'RINING";
    
    camera.start().catch(err => {
        alert("Kameraga ruxsat berilmadi!");
        console.error(err);
    });
}

function endGame() {
    isActive = false;
    if (count > 0) {
        // Ma'lumotni Botga yuborish
        const data = {
            reps: count,
            type: 'squat_ai',
            xp: count * 15, // Har bir harakat uchun 15 XP
            cheat_protection: 'active'
        };
        tg.sendData(JSON.stringify(data));
        tg.close();
    } else {
        alert("Siz hali birorta takrorlash qilmadingiz!");
        location.reload();
    }
}

// Telegram ishga tushganda UI sozlash
tg.ready();