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
    
    // Beta - telefonning oldi-orqaga egilishi (-180 dan 180 gacha)
    let beta = Math.round(event.beta); 

    // Tekshirish uchun statusga yozib turamiz (Buni keyin o'chirib tashlaysiz)
    document.getElementById('status').innerText = "Beta: " + beta;

    // Graduslarni kengaytiramiz: 
    // O'tirganda (pastda) telefon odatda vertikalroq bo'ladi (qiymat osha boshlaydi)
    if (beta > 65) { 
        if (stage === "up") {
            stage = "down";
            tg.HapticFeedback.impactOccurred('light'); // Pastga tushganini bildirish
        }
    }
    
    // Turganingizda (tepada) telefon gorizontalroq bo'ladi (qiymat kamayadi)
    if (beta < 35 && stage === "down") {
        squatCount++;
        stage = "up";
        document.getElementById('count').innerText = squatCount;
        tg.HapticFeedback.notificationOccurred('success'); // Hisoblaganini bildirish
    }
}