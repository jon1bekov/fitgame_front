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

// Sozlamalar (Anti-Hack)
const MIN_SQUAT_DURATION = 1200; // 1.2 soniya
const SQUAT_ANGLE_LIMIT = 100;   // O'tirish burchagi
const STAND_ANGLE_LIMIT = 160;   // Turish burchagi
const VISIBILITY_THRESHOLD = 0.8; // 80% ko'rinish sharti

// 1. Burchakni hisoblash funksiyasi
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// 2. AI natijalarini qayta ishlash
function onResults(results) {
    if (!isActive) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (!results.poseLandmarks) {
        statusElement.innerText = "ODAM TOPILMADI 👤";
        canvasCtx.restore();
        return;
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];   // Bel
    const knee = landmarks[25];  // Tizza
    const ankle = landmarks[27]; // To'piq

    // --- 1-BOSQICH: KO'RINISHNI TEKSHIRISH (ANTI-HACK) ---
    const isVisible = hip.visibility > VISIBILITY_THRESHOLD && 
                      knee.visibility > VISIBILITY_THRESHOLD && 
                      ankle.visibility > VISIBILITY_THRESHOLD;

    if (!isVisible) {
        statusElement.innerText = "TO'LIQ KO'RINMAYAPSIZ! ⚠️";
        statusElement.style.color = "orange";
        canvasCtx.restore();
        return;
    }

    // Skeleton chizish (Faqat odam to'liq ko'rinsa)
    drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, {color: '#00f2ff', lineWidth: 4});
    drawLandmarks(canvasCtx, landmarks, {color: '#bc13fe', lineWidth: 1, radius: 3});

    const angle = calculateAngle(hip, knee, ankle);
    const hipY = hip.y;

    document.getElementById('angle-text').innerText = `Angle: ${Math.round(angle)}° | Status: OK`;

    // --- 2-BOSQICH: MASHQ MANTIQI (FULL CYCLE) ---

    // A) Pastga tushish bosqichi
    if (angle < SQUAT_ANGLE_LIMIT && hipY > 0.65) {
        if (stage === "up") {
            stage = "down";
            statusElement.innerText = "YAXSHI, ENDI TEPAGA! ⬆️";
            statusElement.style.color = "#bc13fe";
            tg.HapticFeedback.impactOccurred('light');
        }
    }
    
    // B) Tepaga chiqish va Ball berish bosqichi
    if (angle > STAND_ANGLE_LIMIT && hipY < 0.6) {
        if (stage === "down") {
            let currentTime = Date.now();
            
            // Vaqt filtri: Siltab aldashga yo'l qo'ymaydi
            if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
                count++;
                stage = "up";
                lastSquatTime = currentTime;

                // UI Yangilash
                const countEl = document.getElementById('count');
                countEl.innerText = count;
                countEl.classList.add('count-bump');
                setTimeout(() => countEl.classList.remove('count-bump'), 200);

                statusElement.innerText = "BARAKALLA! 🔥";
                statusElement.style.color = "#00f2ff";
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                // Judayam tez harakat bo'lsa
                stage = "up";
                statusElement.innerText = "JUDA TEZ! SEKINROQ... ⚠️";
                statusElement.style.color = "yellow";
            }
        }
    }
    canvasCtx.restore();
}

// 3. MediaPipe Pose Sozlamalari
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

// 4. Kamera boshqaruvi
const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isActive) {
            await pose.send({image: videoElement});
        }
    },
    width: 480,
    height: 480
});

// 5. Ilova Funksiyalari
function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    
    if (pageId !== 'workout') {
        isActive = false;
        videoElement.pause();
    }
}

function startGame() {
    tg.expand();
    isActive = true;
    count = 0;
    stage = "up";
    document.getElementById('count').innerText = "0";
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    statusElement.innerText = "KAMERADAN 2 METR ORQAGA SURILING";
    
    camera.start().catch(err => {
        alert("Kameraga ruxsat bering!");
    });
}

function endGame() {
    isActive = false;
    if (count > 0) {
        tg.sendData(JSON.stringify({ 
            reps: count, 
            xp: count * 20, // AI rejimida qiyinroq bo'lgani uchun ko'proq XP
            type: 'squat_ai_verified' 
        }));
        tg.close();
    } else {
        alert("Siz hali mashq qilmadingiz!");
        location.reload();
    }
}

tg.ready();