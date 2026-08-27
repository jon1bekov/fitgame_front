// ============================================
// POSE TRACKER — kamera va sun'iy intellekt (MediaPipe) bilan bog'liq
// To'g'ri forma nazorati (Anti-Cheat & Anti-Waist-Bending) shu yerda joylashgan.
// ============================================

import {
    MIN_SQUAT_DURATION,
    SQUAT_KNEE_ANGLE,
    STAND_KNEE_ANGLE,
    MAX_HIP_DROP_RATIO,
    MIN_HIP_ANGLE,
    VISIBILITY_THRESHOLD,
} from './config.js';
import { haptic, hapticNotify } from './telegram.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');
const angleTextElement = document.getElementById('angle-text');
const countElement = document.getElementById('count');

// Modul ichki holati (state)
let count = 0;
let stage = 'up';
let isActive = false;
let lastSquatTime = 0;

/** Uch nuqta orasidagi burchakni hisoblaydi (0° dan 180° gacha) */
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
        statusElement.style.color = '#ef4444';
        angleTextElement.innerText = 'Kamera qarshisiga o\'ting';
        canvasCtx.restore();
        return;
    }

    const landmarks = results.poseLandmarks;

    // 1. IKKI TOMONNI TEKSHIRISH (Chap va O'ng oyoq/tana)
    // Chap: yelka(11), chanoq(23), tizza(25), to'piq(27)
    // O'ng: yelka(12), chanoq(24), tizza(26), to'piq(28)
    const leftScore =
        ((landmarks[11]?.visibility || 0) +
            (landmarks[23]?.visibility || 0) +
            (landmarks[25]?.visibility || 0) +
            (landmarks[27]?.visibility || 0)) / 4;

    const rightScore =
        ((landmarks[12]?.visibility || 0) +
            (landmarks[24]?.visibility || 0) +
            (landmarks[26]?.visibility || 0) +
            (landmarks[28]?.visibility || 0)) / 4;

    const useLeft = leftScore >= rightScore;
    const shoulder = useLeft ? landmarks[11] : landmarks[12];
    const hip = useLeft ? landmarks[23] : landmarks[24];
    const knee = useLeft ? landmarks[25] : landmarks[26];
    const ankle = useLeft ? landmarks[27] : landmarks[28];

    const minVisibility = Math.min(
        shoulder?.visibility || 0,
        hip?.visibility || 0,
        knee?.visibility || 0,
        ankle?.visibility || 0
    );

    if (minVisibility < VISIBILITY_THRESHOLD) {
        statusElement.innerText = "TO'LIQ KO'RINMAYAPSIZ! ⚠️";
        statusElement.style.color = '#f59e0b';
        angleTextElement.innerText = `Ko'rinish: ${Math.round(minVisibility * 100)}% (2 metr orqaroq turing)`;
        canvasCtx.restore();
        return;
    }

    // 2. BIOMEXANIK HISOBLASHLAR
    // Tizza burchagi (chanoq - tizza - to'piq)
    const kneeAngle = calculateAngle(hip, knee, ankle);

    // Bel/tana burchagi (yelka - chanoq - tizza) — belni egib yuborishni aniqlash
    const hipAngle = calculateAngle(shoulder, hip, knee);

    // Son uzunligi va chanoqning vertikal tushish nisbati (hip drop)
    const thighLength = Math.hypot(hip.x - knee.x, hip.y - knee.y) || 0.001;
    // Tik turganda knee.y - hip.y katta (musbat ~0.8-1.0). To'liq o'tirganda son gorizontal bo'ladi (<=0.35).
    const hipDropRatio = (knee.y - hip.y) / thighLength;

    // Chuqurlik foizi (vizual ko'rsatkich uchun)
    const depthPercent = Math.max(
        0,
        Math.min(100, Math.round(((STAND_KNEE_ANGLE - kneeAngle) / (STAND_KNEE_ANGLE - SQUAT_KNEE_ANGLE)) * 100))
    );

    // 3. ANOMALIYA VA XATOLARNI ANIQLASH (Anti-Cheat)
    // Xatolik 1: Belni bukib, tizzani bukmaslik (Good Morning xatosi)
    const isBendingWaistOnly = (hipAngle < 105 && kneeAngle > 125) || (hipAngle < 75 && hipDropRatio > 0.5);

    // Xatolik 2: Yarim o'tirish (Half squat)
    const isHalfSquat = kneeAngle > SQUAT_KNEE_ANGLE && kneeAngle <= 135 && hipDropRatio > MAX_HIP_DROP_RATIO;

    // To'g'ri to'liq o'tirish shartlari:
    // a) Tizza burchagi <= 95°
    // b) Chanoq yetarlicha pastga tushgan (son gorizontalga yaqin, hipDropRatio <= 0.35)
    // c) Bel haddan tashqari bukilmagan (hipAngle >= 50°)
    const isFullValidSquat =
        kneeAngle <= SQUAT_KNEE_ANGLE &&
        hipDropRatio <= MAX_HIP_DROP_RATIO &&
        hipAngle >= MIN_HIP_ANGLE &&
        !isBendingWaistOnly;

    // 4. HOLAT MASHINASI (STATE MACHINE)
    let skeletonColor = '#00f2ff'; // Default moviy

    if (isBendingWaistOnly && stage === 'up') {
        statusElement.innerText = "BELNI BUKMANG! TIZZANI BUKING ⚠️";
        statusElement.style.color = '#ef4444';
        skeletonColor = '#ef4444';
    } else if (stage === 'up' && isFullValidSquat) {
        stage = 'down';
        statusElement.innerText = "AJOYIB! ENDI TIK TURING ⬆️";
        statusElement.style.color = '#22c55e';
        skeletonColor = '#22c55e';
        haptic('light');
    } else if (stage === 'up' && isHalfSquat) {
        statusElement.innerText = `CHUQURROQ O'TIRING! ⬇️ (${depthPercent}%)`;
        statusElement.style.color = '#eab308';
        skeletonColor = '#eab308';
    } else if (stage === 'down') {
        // O'tirgandan keyin to'liq tik turishni tekshirish (Knee >= 160° va chanoq qayta ko'tarilgan)
        if (kneeAngle >= STAND_KNEE_ANGLE && hipDropRatio >= 0.65) {
            const currentTime = Date.now();

            if (currentTime - lastSquatTime > MIN_SQUAT_DURATION) {
                count++;
                stage = 'up';
                lastSquatTime = currentTime;

                countElement.innerText = count;
                countElement.classList.add('count-bump');
                setTimeout(() => countElement.classList.remove('count-bump'), 200);

                statusElement.innerText = "BARAKALLA! 🔥";
                statusElement.style.color = '#00f2ff';
                skeletonColor = '#00f2ff';
                hapticNotify('success');
            } else {
                stage = 'up';
                statusElement.innerText = "JUDA TEZ! ME'YORDA QILING... ⚠️";
                statusElement.style.color = '#eab308';
            }
        } else {
            statusElement.innerText = "TO'LIQ TIK TURING! ⬆️";
            statusElement.style.color = '#22c55e';
            skeletonColor = '#22c55e';
        }
    } else {
        statusElement.innerText = "TAYYOR! O'TIRING ⬇️";
        statusElement.style.color = '#8994a8';
    }

    // Ekrandagi burchak va status matni
    angleTextElement.innerText = `Tizza: ${Math.round(kneeAngle)}° | Chuqurlik: ${depthPercent}%`;

    // Skelet chizish
    drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: skeletonColor, lineWidth: 4 });
    drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 3 });

    canvasCtx.restore();
}

const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

// Mobil qurilmalarda yuqori FPS va silliq ishlash uchun modelComplexity: 0 (Lite)
pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
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

/** Kamera va hisoblagichni ishga tushiradi. Promise qaytaradi. */
export function startTracking() {
    isActive = true;
    count = 0;
    stage = 'up';
    countElement.innerText = '0';
    return camera.start();
}

/** Kamerani to'xtatadi. */
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