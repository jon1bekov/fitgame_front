const tg = window.Telegram.WebApp;
tg.expand();

let squatCount = 0;
let isActive = false;
let stage = "up";

function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    stopMotion();
}

function startGame() {
    squatCount = 0;
    document.getElementById('count').innerText = 0;
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'block';
    isActive = true;
    
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => {
            if (res == 'granted') window.addEventListener('deviceorientation', handleSquat);
        }).catch(e => console.error(e));
    } else {
        window.addEventListener('deviceorientation', handleSquat);
    }
}

function stopMotion() {
    isActive = false;
    window.removeEventListener('deviceorientation', handleSquat);
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('finish-btn').style.display = 'none';
    document.getElementById('status').innerText = "TAYYORMISIZ?";
    document.getElementById('status').style.color = "#888";
}

function handleSquat(event) {
    if (!isActive) return;
    let beta = event.beta;

    if (beta > 70) {
        if (stage === "up") {
            stage = "down";
            document.getElementById('status').innerText = "GO DOWN... ✅";
            document.getElementById('status').style.color = "#00f2ff";
        }
    }
    
    if (beta < 40 && stage === "down") {
        squatCount++;
        stage = "up";
        document.getElementById('count').innerText = squatCount;
        document.getElementById('status').innerText = "KEEP GOING! 🔥";
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function endGame() {
    if (squatCount > 0) {
        tg.sendData(JSON.stringify({ reps: squatCount, type: 'squat' }));
        tg.close();
    } else {
        alert("Siz hali mashq qilmadingiz!");
    }
}