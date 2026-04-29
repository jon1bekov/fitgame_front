const tg = window.Telegram.WebApp;
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

let count = 0;
let stage = "up"; // Hozirgi holat
let isActive = false;
let lastSquatTime = 0;

// Sozlamalar
const MIN_SQUAT_DURATION = 1200; // 1.2 soniya
const SQUAT_ANGLE_LIMIT = 100;   
const STAND_ANGLE_LIMIT = 160;   

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

function onResults(results) {
    if (!results.poseLandmarks || !isActive) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00f2ff', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#bc13fe', lineWidth: 1, radius: 3});
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];   
    const knee = landmarks[25];  
    const ankle = landmarks[27]; 

    const angle = calculateAngle(hip, knee, ankle);
    const hipY = hip.y; 

    document.getElementById('angle-text').innerText = `Angle: ${Math.round(angle)}° | Hip: ${hipY.toFixed(2)}`;

    // --- YANGI MANTIQ: PASTGA TUSHISH VA TEPAGA CHIQISH ---

    // 1. PASTGA TUSHISHNI ANIQLASH (Faqat stage o'zgaradi, ball berilmaydi)
    if (angle < SQUAT_ANGLE_LIMIT && hipY > 0.7) {
        if (stage === "up") {
            stage = "down";
            statusElement.innerText = "ENDI TEPAGA KO'TARILING! ⬆️";
            statusElement.style.color = "#bc13fe";
            tg.HapticFeedback.impactOccurred('light'); // Pastga tushganda kichik vibratsiya
        }
    }
    
    // 2. TEPAGA CHIQISHNI ANIQLASH (Ball faqat shu yerda beriladi)
    if (angle > STAND_ANGLE_LIMIT && hipY < 0.6) {
        if (stage === "down") {
            let currentTime = Date.now();
            
            // Vaqt filtri (Siltashdan himoya)
            if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
                count++;
                stage = "up"; // Holatni qaytaramiz
                lastSquatTime = currentTime;

                // UI yangilash
                const countEl = document.getElementById('count');
                countEl.innerText = count;
                countEl.classList.add('count-bump');
                setTimeout(() => countEl.classList.remove('count-bump'), 200);

                statusElement.innerText = "BARAKALLA! +1 🔥";
                statusElement.style.color = "#00f2ff";
                
                // Muvaffaqiyatli takrorlash vibratsiyasi
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                // Agar o'ta tez harakat bo'lsa (Aldov urinishi)
                stage = "up"; // Ball bermaymiz lekin stage-ni yangilaymiz
                statusElement.innerText = "JUDA TEZ! SEKINROQ... ⚠️";
                statusElement.style.color = "#ffcc00";
            }
        }
    }
    canvasCtx.restore();
}

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

const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isActive) {
            await pose.send({image: videoElement});
        }
    },
    width: 480,
    height: 480
});

function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    if (pageId !== 'workout') isActive = false;
}

function startGame() {
    tg.expand();
    isActive = true;
    count = 0;
    stage = "up"; // Boshida har doim up
    document.getElementById('count').innerText = "0";
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    statusElement.innerText = "O'TIRIB-TURISHNI BOSHLANG";
    
    camera.start().catch(err => alert("Kamera xatosi!"));
}

function endGame() {
    isActive = false;
    if (count > 0) {
        tg.sendData(JSON.stringify({ 
            reps: count, 
            type: 'squat_ai', 
            xp: count * 15 
        }));
        tg.close();
    } else {
        alert("Mashq bajarilmadi!");
        location.reload();
    }
}

tg.ready();