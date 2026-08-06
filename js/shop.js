// ============================================
// SHOP — do'kon sahifasini boshqaradi: mahsulotlarni ko'rsatish,
// sotib olish va personajga kiydirish.
// ============================================

import { fetchShopItems, fetchUserProfile, buyShopItem, equipShopItem } from './api.js';
import { getTelegramUserId, hapticNotify } from './telegram.js';
import { updateProfileUI, applyEquippedItems } from './profile.js';
import { calculateLevel } from './config.js';

const SLOT_LABELS = {
    shirt: '👕 Futbolkalar',
    shorts: '🩳 Shimlar',
    shoes: '👟 Krossovkalar',
};

/** Bitta mahsulot uchun HTML kartochka yasaydi. */
function renderItemCard(item, userState) {
    const isOwned = userState.owned_items.includes(item.id);
    const isEquipped = userState.equipped_items[item.slot] === item.id;
    const canAfford = userState.coins >= item.price;

    let buttonHtml;
    if (isEquipped) {
        buttonHtml = `<button class="shop-btn shop-btn--equipped" disabled>✅ Kiyilgan</button>`;
    } else if (isOwned) {
        buttonHtml = `<button class="shop-btn shop-btn--equip" data-action="equip" data-item="${item.id}">Kiyish</button>`;
    } else {
        buttonHtml = `<button class="shop-btn shop-btn--buy" data-action="buy" data-item="${item.id}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? `Sotib olish · 🪙 ${item.price}` : `Yetarli emas · 🪙 ${item.price}`}
        </button>`;
    }

    return `
        <div class="shop-item">
            <div class="shop-item__swatch" style="background:${item.color};"></div>
            <div class="shop-item__info">
                <div class="shop-item__name">${item.name}</div>
                ${buttonHtml}
            </div>
        </div>
    `;
}

/** Do'kon sahifasini to'liq qayta chizadi (yuklashdan yoki xarid/kiyishdan keyin). */
export async function loadShop() {
    const container = document.getElementById('shop-list');
    if (!container) return;

    const tgId = getTelegramUserId();
    if (!tgId) {
        container.innerHTML = '<p style="text-align:center; color:#555;">Test rejimida do\'kon ishlamaydi</p>';
        return;
    }

    container.innerHTML = '<p style="text-align:center; color:#555;">Yuklanmoqda...</p>';

    try {
        const [items, profile] = await Promise.all([
            fetchShopItems(),
            fetchUserProfile(tgId),
        ]);

        if (!profile) {
            container.innerHTML = '<p style="text-align:center; color:#555;">Avval /start bosing</p>';
            return;
        }

        const userState = {
            coins: profile.coins || 0,
            owned_items: profile.owned_items || [],
            equipped_items: profile.equipped_items || {},
        };

        // Tangalarni sahifa tepasida ko'rsatamiz
        const coinsHeader = document.getElementById('shop-coins');
        if (coinsHeader) coinsHeader.innerText = `🪙 ${userState.coins}`;

        // Mahsulotlarni slot bo'yicha guruhlab chizamiz
        const slots = ['shirt', 'shorts', 'shoes'];
        let html = '';
        for (const slot of slots) {
            const slotItems = items.filter((i) => i.slot === slot);
            if (!slotItems.length) continue;
            html += `<h3 class="shop-slot-title">${SLOT_LABELS[slot] || slot}</h3>`;
            html += '<div class="shop-grid">';
            html += slotItems.map((item) => renderItemCard(item, userState)).join('');
            html += '</div>';
        }
        container.innerHTML = html;

        // Har bir tugmaga bosish hodisasini ulaymiz
        container.querySelectorAll('.shop-btn[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => handleShopAction(btn.dataset.action, btn.dataset.item));
        });
    } catch (err) {
        console.error("Do'konni yuklashda xatolik:", err);
        container.innerHTML = '<p style="text-align:center; color:red;">Yuklashda xatolik yuz berdi</p>';
    }
}

/** "Sotib olish" yoki "Kiyish" tugmasi bosilganda ishga tushadi. */
async function handleShopAction(action, itemId) {
    const tgId = getTelegramUserId();
    if (!tgId) return;

    try {
        if (action === 'buy') {
            const result = await buyShopItem(tgId, itemId);
            hapticNotify('success');
            // Coins darhol yangilanadi (profil sahifasida ham)
            const profile = await fetchUserProfile(tgId);
            if (profile) updateProfileUI(profile.xp, calculateLevel(profile.xp), result.coins);
        } else if (action === 'equip') {
            const result = await equipShopItem(tgId, itemId);
            hapticNotify('success');
            applyEquippedItems(result.equipped_items);
        }
        await loadShop(); // Do'konni yangilangan holat bilan qayta chizamiz
    } catch (err) {
        console.error("Do'kon amalida xatolik:", err);
        alert('Xatolik: ' + err.message);
    }
}