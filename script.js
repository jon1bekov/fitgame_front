const tg = window.Telegram.WebApp;
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

let count = 0;
let stage = "up"; 
let isActive = false;

// 1. Burchakni hisoblash (Bel-Tizza-To'piq)
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// 2. AI natijalarini qayta ishlash
function onResults(results) {
    if (!results.poseLandmarks || !isActive) return;

    // Canvasni tozalash va chizish
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Bo'g'inlarni chizish (Vizual ko'rinish uchun)
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];   // Bel
    const knee = landmarks[25];  // Tizza
    const ankle = landmarks[27]; // To'piq

    const angle = calculateAngle(hip, knee, ankle);
    document.getElementById('angle-text').innerText = `Angle: ${Math.round(angle)}°`;

    // 3. Squat Logikasi (Anti-Cheat mantiqi bilan)
    if (angle > 160) {
        if (stage === "down") {
            statusElement.innerText = "YAXSHI! YANA... 🔥";
            statusElement.style.color = "#00ff88";
        }
        stage = "up";
    }
    
    if (angle < 100 && stage === "up") { // 90 gradusdan biroz yumshoqroq 100 qildik
        stage = "down";
        count++;
        document.getElementById('count').innerText = count;
        statusElement.innerText = "KO'TARILING! ⬆️";
        statusElement.style.color = "#00f2ff";
        tg.HapticFeedback.impactOccurred('medium');
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
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
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

// 6. Tugmalar uchun funksiyalar
function startGame() {
    isActive = true;
    count = 0;
    document.getElementById('count').innerText = "0";
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    statusElement.innerText = "KAMERA OLDIDA TURING";
    
    camera.start().catch(err => {
        statusElement.innerText = "KAMERA XATOSI! ⚠️";
        console.error(err);
    });
}

function endGame() {
    isActive = false;
    if (count > 0) {
        tg.sendData(JSON.stringify({ 
            reps: count, 
            type: 'squat_ai',
            xp: count * 15 // AI bilan qilingani uchun ko'proq XP
        }));
        tg.close();
    } else {
        alert("Siz hali mashq qilmadingiz!");
        location.reload(); // Sahifani qayta yuklash
    }
}

// Sahifalar navigatsiyasi (Avvalgi koddan)
function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    
    if (pageId !== 'workout') {
        isActive = false;
    }
}