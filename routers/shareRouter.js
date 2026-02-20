const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Food = require('../models/Food');
const { calculateFoodPricing } = require('../utils/offerPricing');
const { buildShareLink, ensureFoodShareLinks, ensureSlugAndLink } = require('../utils/shareLink');

const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://eatplek.com').replace(/\/$/, '');
const DEFAULT_FAVICON = `${SHARE_BASE_URL}/public/logo.png`;
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.eatplek.user&hl=en_IN';
const IOS_STORE_URL = 'https://apps.apple.com/in/app/eatplek-dine-in-takeaway/id6474904955';

const SHARE_SYNC_KEY = process.env.SHARE_SYNC_KEY;

const escapeHtml = (str) =>
	str
		? str
				.toString()
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;')
		: '';

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatShareData = (food) => {
	const pricing = calculateFoodPricing(food);

	return {
		foodName: food.foodName,
		foodId: food._id.toString(),
		foodImage: food.foodImage,
		shareSlug: food.shareSlug,
		shareLink: food.shareLink || buildShareLink(food.shareSlug || food._id.toString()),
		vendorId: food.vendor ? (food.vendor._id?.toString ? food.vendor._id.toString() : food.vendor.toString()) : null,
		description: food.description || '',
		actualPrice: pricing.actualPrice,
		discountPrice: pricing.discountPrice,
		specialOfferPrice: pricing.specialOfferPrice,
		foodPrice: pricing.finalPrice,
		cartCount: 0,
		customizations: (food.customizations || []).map((customization) => ({
			id: customization._id?.toString(),
			name: customization.name,
			price: customization.price
		})),
		addOns: (food.addOns || []).map((addOn) => ({
			addOnId: addOn._id?.toString(),
			id: addOn._id?.toString(),
			name: addOn.name,
			price: addOn.price,
			image: addOn.image || null,
			imageKitFileId: addOn.imageKitFileId || null,
			cartCount: 0
		}))
	};
};

const renderSharePage = (shareLink, data) => {
	const safeImage = escapeHtml(
		data.foodImage ||
			'https://ik.imagekit.io/eatplek/marketing/banners/food-placeholder.png'
	);
	const buildListSection = (title, items = []) => {
		if (!items.length) return '';
		return `
      <div class="section-block">
        <p class="section-title">${escapeHtml(title)}</p>
        <div class="addon-list">
          ${items
						.map(
							(item) => `
            <div class="addon-item">
              <div class="addon-info">
                ${
									item.image
										? `<img class="addon-thumb" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />`
										: ''
								}
                <span class="addon-name">${escapeHtml(item.name)}</span>
              </div>
              <span class="addon-price">₹${item.price}</span>
            </div>`
						)
						.join('')}
        </div>
      </div>
    `;
	};

	const title = `${escapeHtml(data.foodName)} | Eatplek`;
	const description =
		data.discountPrice && data.discountPrice < data.actualPrice
			? `Now at ₹${data.foodPrice} (was ₹${data.actualPrice})`
			: `Available at ₹${data.foodPrice}`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(data.foodName)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(shareLink)}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:alt" content="${escapeHtml(data.foodName)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(data.foodName)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="twitter:image:alt" content="${escapeHtml(data.foodName)}" />

  <meta property="al:android:url" content="eatplek://food/${escapeHtml(data.foodId)}" />
  <meta property="al:android:package" content="com.eatplek.app" />
  <meta property="al:ios:url" content="eatplek://food/${escapeHtml(data.foodId)}" />

  <link rel="icon" type="image/png" href="${escapeHtml(DEFAULT_FAVICON)}" />
  <link rel="apple-touch-icon" href="${escapeHtml(DEFAULT_FAVICON)}" />
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #FFFFFFFF;
      color: #1f1f1f;
    }
    .page {
      max-width: 480px;
      margin: 0 auto;
      min-height: 100vh;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .hero {
      padding: 0;
      position: relative;
    }
    .hero img {
      width: 100vw;
      max-width: 480px;
      height: 320px;
      object-fit: cover;
      display: block;
    }
    .content-card {
      margin-top: -20px;
      background: #fff;
      border-radius: 32px 32px 0 0;
      padding: 40px 24px 120px;
      box-shadow: 0 -12px 40px rgba(15,23,42,0.05);
      flex: 1;
    }
    .food-title {
      font-size: 26px;
      font-weight: 700;
      margin: 0;
    }
    .meta {
      display: flex;
      gap: 16px;
      color: #7c8698;
      font-size: 14px;
      margin: 12px 0 20px;
    }
    .meta span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .price-value {
      font-size: 34px;
      font-weight: 700;
    }
    .price-value small {
      font-size: 16px;
      margin-left: 12px;
      color: #9ca3af;
      text-decoration: line-through;
      font-weight: 500;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin: 32px 0 12px;
    }
    .description {
      color: #6b7280;
      line-height: 1.6;
      font-size: 15px;
    }
    .addon-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .addon-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #f1f3f5;
      padding: 12px 16px;
      border-radius: 8px;
      background: #fbfbfb;
      box-shadow: 0 8px 18px rgba(15,23,42,.05);
      gap: 16px;
    }
    .addon-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .addon-thumb {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .addon-name {
      font-weight: 600;
      color: #1f2933;
    }
    .addon-price {
      color: #2563eb;
      font-weight: 600;
    }
    .bottom-bar {
      position: sticky;
      bottom: 0;
      background: #fff;
      padding: 18px 24px 26px;
      border-radius: 24px 24px 0 0;
      box-shadow: 0 -16px 40px rgba(15,23,42,0.12);
    }
    .bottom-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .total-label {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .total-price {
      font-size: 22px;
      font-weight: 700;
    }
    .cta-btn {
      display: none;
      justify-content: center;
      align-items: center;
      text-decoration: none;
      padding: 16px;
      font-size: 16px;
      border-radius: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .cta-btn.primary {
      background: #0f172a;
      color: #fff;
      flex: 1;
      border: none;
    }
    .cta-btn.secondary {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid rgba(15,23,42,0.15);
      flex: 1;
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 35px rgba(15,23,42,0.12);
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <img src="${safeImage}" alt="${escapeHtml(data.foodName)}" />
    </div>
    <div class="content-card">
      <h1 class="food-title">${escapeHtml(data.foodName)}</h1>
      <div class="meta">
        <span>12 km</span>
        <span>25-35 mins</span>
      </div>
      <div class="price-row">
        <div class="price-value">
          ₹${data.foodPrice}
          ${
						data.actualPrice && data.actualPrice !== data.foodPrice
							? `<small>₹${data.actualPrice}</small>`
							: ''
					}
        </div>
      </div>

      <div>
        <p class="section-title">About the food</p>
        <p class="description">
          ${escapeHtml(
						data.description ||
							'Juicy grilled layers, fresh lettuce, and melted cheese tucked inside a soft bun. A timeless favorite made to satisfy every craving.'
					)}
        </p>
      </div>

      ${buildListSection('Add-ons', data.addOns)}
      ${buildListSection('Customize your order', data.customizations)}
    </div>
    <div class="bottom-bar">
      <div class="bottom-content">
        <div>
          <div class="total-label">Total amount</div>
          <div class="total-price">₹${data.foodPrice}</div>
        </div>
        <a id="open-app-btn" class="cta-btn primary" href="#">Open in App</a>
        <a id="install-app-btn" class="cta-btn secondary" href="#" target="_blank" rel="noopener">Install App</a>
      </div>
    </div>
  </div>
  <script>
    (function() {
      const deepLink = 'eatplek://food/${escapeHtml(data.foodId)}';
      const openBtn = document.getElementById('open-app-btn');
      const installBtn = document.getElementById('install-app-btn');
      const bottomBar = document.querySelector('.bottom-bar');
      const ua = navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iP(hone|od|ad)/i.test(ua);

      installBtn.style.display = 'none';

      if (!isAndroid && !isIOS) {
        bottomBar.style.display = 'none';
        return;
      }

      openBtn.style.display = 'inline-flex';
      openBtn.addEventListener('click', function (event) {
        event.preventDefault();
        const now = Date.now();
        window.location.href = deepLink;
        setTimeout(function () {
          if (!document.hidden) {
            installBtn.style.display = 'inline-flex';
            installBtn.textContent = isAndroid ? 'Install on Play Store' : 'Install on App Store';
            installBtn.href = isAndroid ? '${ANDROID_STORE_URL}' : '${IOS_STORE_URL}';
          }
        }, 1400);
      });
    })();
  </script>
</body>
</html>`;
};

router.get('/food/:slugOrId', async (req, res) => {
	try {
		const { slugOrId } = req.params;
		const { type } = req.query;

		let food = await Food.findOne({ shareSlug: slugOrId }).lean();

		if (!food) {
			const suffixRegex = new RegExp(`${escapeRegex(`/share/food/${slugOrId}`)}$`, 'i');
			food = await Food.findOne({ shareLink: { $regex: suffixRegex } }).lean();
		}

		if (!food && mongoose.Types.ObjectId.isValid(slugOrId)) {
			food = await Food.findById(slugOrId).lean();
		}

		if (!food || !food.isActive) {
			return res.status(404).json({
				success: false,
				message: 'Food not found'
			});
		}

		if (!food.shareSlug || !food.shareLink) {
			const doc = await Food.findById(food._id);
			if (doc) {
				const updated = await ensureSlugAndLink(doc);
				if (updated) {
					await doc.save({ validateBeforeSave: false });
					food.shareSlug = doc.shareSlug;
					food.shareLink = doc.shareLink;
				}
			}
		}

		const shareData = formatShareData(food);

		if (type === 'json') {
			return res.json({
				success: true,
				data: shareData
			});
		}

		return res.send(renderSharePage(food.shareLink, shareData));
	} catch (error) {
		console.error('Error generating share link response:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to generate share response'
		});
	}
});

router.post('/sync', async (req, res) => {
	try {
		if (SHARE_SYNC_KEY) {
			const providedKey = req.headers['x-share-sync-key'] || req.query.key;
			if (providedKey !== SHARE_SYNC_KEY) {
				return res.status(403).json({
					success: false,
					message: 'Invalid sync key'
				});
			}
		}

		const updatedCount = await ensureFoodShareLinks();

		return res.json({
			success: true,
			message: `Share links ensured for ${updatedCount} foods`,
			updatedCount
		});
	} catch (error) {
		console.error('Error syncing share links:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to sync share links'
		});
	}
});

module.exports = router;

