/**
 * Centralized serviceType constants and normalization utility
 * Standard format: ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in']
 */

// Standard service types (as stored in database)
const SERVICE_TYPES = ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in'];

// Mapping from various input formats to standard format
const SERVICE_TYPE_MAPPING = {
	// Standard format (case-insensitive)
	'dine in': 'Dine in',
	'Dine in': 'Dine in',
	'DINE IN': 'Dine in',
	'dine-in': 'Dine in',
	'Dine-in': 'Dine in',
	'DINE-IN': 'Dine in',
	
	'delivery': 'Delivery',
	'Delivery': 'Delivery',
	'DELIVERY': 'Delivery',
	
	'takeaway': 'Takeaway',
	'Takeaway': 'Takeaway',
	'TAKEAWAY': 'Takeaway',
	'take away': 'Takeaway',
	'Take away': 'Takeaway',
	'TAKE AWAY': 'Takeaway',
	'take-away': 'Takeaway',
	'Take-away': 'Takeaway',
	'TAKE-AWAY': 'Takeaway',
	
	'pickup': 'Pickup',
	'Pickup': 'Pickup',
	'PICKUP': 'Pickup',
	'pick-up': 'Pickup',
	'Pick-up': 'Pickup',
	'PICK-UP': 'Pickup',
	
	'car dine in': 'Car Dine in',
	'Car Dine in': 'Car Dine in',
	'CAR DINE IN': 'Car Dine in',
	'car-dine-in': 'Car Dine in',
	'Car-dine-in': 'Car Dine in',
	'CAR-DINE-IN': 'Car Dine in',
	'car dine-in': 'Car Dine in',
	'Car Dine-in': 'Car Dine in'
};

/**
 * Normalizes a serviceType string to the standard format
 * @param {string} serviceType - The service type to normalize
 * @returns {string|null} - The normalized service type or null if invalid
 */
const normalizeServiceType = (serviceType) => {
	if (!serviceType || typeof serviceType !== 'string') {
		return null;
	}
	
	const trimmed = serviceType.trim();
	if (!trimmed) {
		return null;
	}
	
	// Try exact match first
	if (SERVICE_TYPE_MAPPING[trimmed]) {
		return SERVICE_TYPE_MAPPING[trimmed];
	}
	
	// Try case-insensitive match
	const lowerTrimmed = trimmed.toLowerCase();
	if (SERVICE_TYPE_MAPPING[lowerTrimmed]) {
		return SERVICE_TYPE_MAPPING[lowerTrimmed];
	}
	
	return null;
};

/**
 * Validates if a serviceType is valid
 * @param {string} serviceType - The service type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidServiceType = (serviceType) => {
	const normalized = normalizeServiceType(serviceType);
	return normalized !== null;
};

/**
 * Gets all valid service types
 * @returns {string[]} - Array of valid service types
 */
const getServiceTypes = () => {
	return [...SERVICE_TYPES];
};

/**
 * Gets all possible variations of a service type for database queries
 * This includes both old and new formats to handle data migration
 * @param {string} serviceType - The service type (can be in any format)
 * @returns {string[]} - Array of all possible variations
 */
const getServiceTypeVariations = (serviceType) => {
	const normalized = normalizeServiceType(serviceType);
	if (!normalized) {
		return [];
	}

	// Map normalized types to all their possible variations
	const variationsMap = {
		'Dine in': ['Dine in', 'dine in', 'DINE IN', 'dine-in', 'Dine-in', 'DINE-IN'],
		'Delivery': ['Delivery', 'delivery', 'DELIVERY'],
		'Takeaway': ['Takeaway', 'takeaway', 'TAKEAWAY', 'take away', 'Take away', 'TAKE AWAY', 'take-away', 'Take-away', 'TAKE-AWAY'],
		'Pickup': ['Pickup', 'pickup', 'PICKUP', 'pick-up', 'Pick-up', 'PICK-UP'],
		'Car Dine in': ['Car Dine in', 'car dine in', 'CAR DINE IN', 'car-dine-in', 'Car-dine-in', 'CAR-DINE-IN', 'car dine-in', 'Car Dine-in']
	};

	return variationsMap[normalized] || [normalized];
};

module.exports = {
	SERVICE_TYPES,
	SERVICE_TYPE_MAPPING,
	normalizeServiceType,
	isValidServiceType,
	getServiceTypes,
	getServiceTypeVariations
};

