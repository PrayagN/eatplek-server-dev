const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseTimeToMinutes = (timeString) => {
	if (!timeString) return null;

	const cleaned = timeString.trim().toUpperCase();
	let hours;
	let minutes;

	if (cleaned.includes('AM') || cleaned.includes('PM')) {
		const parts = cleaned.split(/[:\s]+/);
		hours = parseInt(parts[0], 10);
		minutes = parseInt(parts[1] || 0, 10);
		const period = parts[parts.length - 1];

		if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

		if (period === 'PM' && hours !== 12) {
			hours += 12;
		} else if (period === 'AM' && hours === 12) {
			hours = 0;
		}
	} else {
		const parts = cleaned.split(':');
		hours = parseInt(parts[0], 10);
		minutes = parseInt(parts[1] || 0, 10);

		if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
	}

	return hours * 60 + minutes;
};

const isTimeBetween = (currentMinutes, startTime, endTime) => {
	const startMinutes = parseTimeToMinutes(startTime);
	const endMinutes = parseTimeToMinutes(endTime);

	if (startMinutes === null || endMinutes === null) return false;

	if (endMinutes < startMinutes) {
		return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
	}

	return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const resolveDateContext = (dateInput) => {
	const referenceDate = dateInput instanceof Date ? dateInput : new Date();
	const currentDay = DAYS[referenceDate.getDay()];
	const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

	return { currentDay, currentMinutes };
};

const resolveActiveOffer = (food, currentDay, currentMinutes) => {
	if (!food?.dayOffers || food.dayOffers.length === 0) {
		return { activeOffer: null, isCurrentlyActive: false };
	}

	const dayMatchingOffers = food.dayOffers.filter((offer) => {
		if (!offer?.isActive) return false;
		if (!Array.isArray(offer.activeDays) || offer.activeDays.length === 0) return false;
		return offer.activeDays.includes(currentDay);
	});

	if (dayMatchingOffers.length === 0) {
		return { activeOffer: null, isCurrentlyActive: false };
	}

	let activeOffer = dayMatchingOffers.find((offer) => {
		if (offer.startTime && offer.endTime) {
			return isTimeBetween(currentMinutes, offer.startTime, offer.endTime);
		}
		return true;
	});

	if (!activeOffer) {
		activeOffer = dayMatchingOffers[0];
	}

	const isCurrentlyActive =
		activeOffer.startTime && activeOffer.endTime
			? isTimeBetween(currentMinutes, activeOffer.startTime, activeOffer.endTime)
			: true;

	return {
		activeOffer,
		isCurrentlyActive
	};
};

const calculateFoodPricing = (food, options = {}) => {
	if (!food) {
		return {
			actualPrice: 0,
			discountPrice: null,
			specialOfferPrice: null,
			specialOfferDetails: null,
			finalPrice: 0
		};
	}

	const actualPrice = Number(food.basePrice) || 0;
	const discountPrice =
		food.discountPrice !== null && food.discountPrice < actualPrice ? Number(food.discountPrice) : null;
	const priceBeforeOffer = discountPrice !== null ? discountPrice : actualPrice;

	const { currentDay, currentMinutes } =
		options.currentDay && Number.isFinite(options.currentMinutes)
			? { currentDay: options.currentDay, currentMinutes: options.currentMinutes }
			: resolveDateContext(options.currentDate);

	const { activeOffer, isCurrentlyActive } = resolveActiveOffer(food, currentDay, currentMinutes);

	let specialOfferPrice = null;
	let specialOfferDetails = null;

	if (activeOffer) {
		if (activeOffer.discountType === 'percentage') {
			specialOfferPrice = priceBeforeOffer * (1 - activeOffer.discountValue / 100);
		} else if (activeOffer.discountType === 'fixed') {
			specialOfferPrice = Math.max(0, priceBeforeOffer - activeOffer.discountValue);
		}

		if (specialOfferPrice !== null) {
			specialOfferPrice = Math.round(specialOfferPrice * 100) / 100;
		}

		specialOfferDetails = {
			discountType: activeOffer.discountType,
			discountValue: activeOffer.discountValue,
			startTime: activeOffer.startTime,
			endTime: activeOffer.endTime,
			activeDays: activeOffer.activeDays,
			isCurrentlyActive
		};
	}

	const finalPrice =
		specialOfferPrice !== null && specialOfferDetails?.isCurrentlyActive
			? specialOfferPrice
			: Math.round(priceBeforeOffer * 100) / 100;

	return {
		actualPrice: Math.round(actualPrice * 100) / 100,
		discountPrice: discountPrice !== null ? Math.round(discountPrice * 100) / 100 : null,
		specialOfferPrice,
		specialOfferDetails,
		finalPrice
	};
};

module.exports = {
	calculateFoodPricing,
	isTimeBetween,
	parseTimeToMinutes
};

