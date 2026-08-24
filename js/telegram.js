// ============================================
// TELEGRAM WEBAPP — Telegram bilan bog'liq barcha narsa shu yerda
// ============================================

export function getTelegramApp() {
    return window.Telegram?.WebApp;
}

export const tg = window.Telegram?.WebApp;

/**
 * Foydalanuvchining Telegram ID'sini xavfsiz aniqlaydi.
 * Avval Telegram'ning o'zidan olishga harakat qiladi (asosiy usul),
 * topilmasa URL'dagi ?user_id= parametridan oladi (zaxira usul).
 */
export function getTelegramUserId() {
    const webApp = window.Telegram?.WebApp;
    if (webApp?.initDataUnsafe?.user?.id) {
        return webApp.initDataUnsafe.user.id;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('user_id');
    if (idFromUrl) {
        console.log('ID linkdan olindi (test rejimi):', idFromUrl);
        return idFromUrl;
    }

    return null;
}

/**
 * Telegram'ning RAQAMLI IMZOLANGAN xom initData satrini qaytaradi.
 * MUHIM: bu — `initDataUnsafe`dan farqli o'laroq — backend tomonidan
 * TEKSHIRILADIGAN yagona ma'lumot. Holatni o'zgartiradigan har bir so'rovda
 * (XP qo'shish, do'kondan xarid) shu qiymat yuborilishi SHART.
 */
export function getInitData() {
    const webApp = window.Telegram?.WebApp;
    return webApp?.initData || '';
}

/** Yengil vibratsiya (masalan, mashq bosqichi o'zgarganda) */
export function haptic(type = 'light') {
    const webApp = window.Telegram?.WebApp;
    webApp?.HapticFeedback?.impactOccurred(type);
}

/** Natija vibratsiyasi (muvaffaqiyat/xatolik) */
export function hapticNotify(type = 'success') {
    const webApp = window.Telegram?.WebApp;
    webApp?.HapticFeedback?.notificationOccurred(type);
}