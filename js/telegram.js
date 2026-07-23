// ============================================
// TELEGRAM WEBAPP — Telegram bilan bog'liq barcha narsa shu yerda
// ============================================

export const tg = window.Telegram?.WebApp;

/**
 * Foydalanuvchining Telegram ID'sini xavfsiz aniqlaydi.
 * Avval Telegram'ning o'zidan olishga harakat qiladi (asosiy usul),
 * topilmasa URL'dagi ?user_id= parametridan oladi (zaxira usul).
 */
export function getTelegramUserId() {
    if (tg?.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('user_id');
    if (idFromUrl) {
        console.log('ID linkdan olindi (test rejimi):', idFromUrl);
        return idFromUrl;
    }

    return null;
}

/** Yengil vibratsiya (masalan, mashq bosqichi o'zgarganda) */
export function haptic(type = 'light') {
    tg?.HapticFeedback?.impactOccurred(type);
}

/** Natija vibratsiyasi (muvaffaqiyat/xatolik) */
export function hapticNotify(type = 'success') {
    tg?.HapticFeedback?.notificationOccurred(type);
}