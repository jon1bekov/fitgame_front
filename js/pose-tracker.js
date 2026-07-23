// ============================================
// POSE TRACKER — kamera va sun'iy intellekt (MediaPipe) bilan bog'liq
// BARCHA mantiq shu yerda izolyatsiya qilingan. Boshqa fayllar bu modulning
// ichki ishlashi haqida hech narsa bilishi shart emas — faqat
// startTracking() / stopTracking() / getRepCount() orqali muloqot qiladi.
// ============================================

import {
    MIN_SQUAT_DURATION,
    SQUAT_ANGLE_LIMIT,
    STAND_ANGLE_LIMIT,
    VISIBILITY_THRESHOLD,
} from './config.js';
import { haptic, hapticNotify } from './telegram.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');
const angleTextElement = document.getElementById('angle-text');
const countElement = document.getElementById('count');

// Modul ichki holati (state) — tashqariga chiqarilmaydi
let count = 0;
let stage = 'up';
let isActive = false;
let lastSquatTime = 0;

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

function onResults(results) {
    if (!isActive) return;

    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (!results.poseLandmarks) {
        statusElement.innerText = 'ODAM TOPILMADI 👤';
        statusElement.style.color = 'red';
        canvasCtx.restore();
        return;
    }

    const landmarks = results.poseLandmarks;
    const hip = landmarks[23];
    const knee = landmarks[25];
    const ankle = landmarks[27];

    const isVisible =
        Math.min(hip.visibility, knee.visibility, ankle.visibility) > VISIBILITY_THRESHOLD;

    if (!isVisible) {
        statusElement.innerText = "TO'LIQ KO'RINMAYAPSIZ! ⚠️";
        statusElement.style.color = 'orange';
        angleTextElement.innerText = `Ko'rinish: ${Math.round(Math.min(hip.visibility, knee.visibility, ankle.visibility) * 100)}%`;
        canvasCtx.restore();
        return;
    }

    // Skeleton chizish (global drawConnectors/drawLandmarks — MediaPipe CDN skriptidan keladi)
    drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: '#00f2ff', lineWidth: 4 });
    drawLandmarks(canvasCtx, landmarks, { color: '#bc13fe', lineWidth: 1, radius: 3 });

    const angle = calculateAngle(hip, knee, ankle);

    angleTextElement.innerText = `Angle: ${Math.round(angle)}° | Status: OK`;

    // MUHIM TUZATISH: avvalgi versiyada burchak bilan bir qatorda hip'ning
    // ekrandagi aniq foiz pozitsiyasi (hipY) ham tekshirilardi. Bu shart
    // foydalanuvchining kameradan masofasi/bo'yiga qarab hech qachon
    // bajarilmasligi mumkin edi. Endi faqat tizza burchagiga tayanamiz —
    // bu qanday kadrlashdan qat'iy nazar ishonchli signal.
    if (angle < SQUAT_ANGLE_LIMIT) {
        if (stage === 'up') {
            stage = 'down';
            statusElement.innerText = 'YAXSHI, ENDI TEPAGA! ⬆️';
            statusElement.style.color = '#bc13fe';
            haptic('light');
        }
    }

    if (angle > STAND_ANGLE_LIMIT) {
        if (stage === 'down') {
            const currentTime = Date.now();

            if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
                count++;
                stage = 'up';
                lastSquatTime = currentTime;

                countElement.innerText = count;
                countElement.classList.add('count-bump');
                setTimeout(() => countElement.classList.remove('count-bump'), 200);

                statusElement.innerText = 'BARAKALLA! 🔥';
                statusElement.style.color = '#00f2ff';
                hapticNotify('success');
            } else {
                stage = 'up';
                statusElement.innerText = 'JUDA TEZ! SEKINROQ... ⚠️';
                statusElement.style.color = 'yellow';
            }
        }
    }

    canvasCtx.restore();
}

const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (isActive) {
            await pose.send({ image: videoElement });
        }
    },
    width: 640,
    height: 480,
});

/** Kamera va hisoblagichni ishga tushiradi. Promise qaytaradi (kamera ruxsati uchun). */
export function startTracking() {
    isActive = true;
    count = 0;
    stage = 'up';
    countElement.innerText = '0';
    return camera.start();
}

/** Kamerani to'xtatadi va telefon batareyasini tejaydi. */
export function stopTracking() {
    isActive = false;
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach((track) => track.stop());
    }
}

/** Joriy squat sonini qaytaradi. */
export function getRepCount() {
    return count;
}