const Food = require('../models/Food');

const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://eatplek.com').replace(/\/$/, '');

const slugify = (text) => {
	if (!text) return 'food';
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/[\s\W-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'food';
};

const generateSlugSuffix = () => Math.random().toString(36).slice(2, 8);

const buildShareLink = (slug) => `${SHARE_BASE_URL}/share/food/${slug}`;

const ensureSlugAndLink = async (food) => {
	let updated = false;

	if (!food.shareSlug) {
		const base = slugify(food.foodName);
		let candidate = base;
		let counter = 0;

		while (await Food.exists({ _id: { $ne: food._id }, shareSlug: candidate })) {
			counter += 1;
			candidate = `${base}-${generateSlugSuffix()}${counter}`;
		}

		food.shareSlug = candidate;
		updated = true;
	}

	const expectedLink = buildShareLink(food.shareSlug);
	if (!food.shareLink || food.shareLink !== expectedLink) {
		food.shareLink = expectedLink;
		updated = true;
	}

	return updated;
}; 

const ensureFoodShareLinks = async () => {
	try {
		const foods = await Food.find({
			$or: [
				{ shareLink: { $exists: false } },
				{ shareLink: null },
				{ shareLink: '' },
				{ shareSlug: { $exists: false } },
				{ shareSlug: null },
				{ shareSlug: '' },
				{ shareLink: { $regex: /share\/food\/[0-9a-f]{24}$/i } }
			]
		}).select('_id foodName shareLink shareSlug');

		if (!foods.length) {
			return 0;
		}

		let updatedCount = 0;
		for (const food of foods) {
			const updated = await ensureSlugAndLink(food);
			if (updated) {
				await food.save({ validateBeforeSave: false });
				updatedCount += 1;
			}
		}

		return updatedCount;
	} catch (error) {
		console.error('Error ensuring share links for foods:', error);
		return 0;
	}
};

module.exports = {
	buildShareLink,
	ensureFoodShareLinks,
	ensureSlugAndLink
};

