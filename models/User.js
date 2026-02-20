const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load district codes from codes.json
const codesPath = path.join(__dirname, '../codes.json');
let DISTRICT_CODE_MAP = {};

try {
	const codesData = JSON.parse(fs.readFileSync(codesPath, 'utf8'));
	// Create reverse mapping: district name -> district code
	// Extract code from key like "KL-TVM" -> "TVM"
	for (const [key, districtName] of Object.entries(codesData)) {
		const districtCode = key.split('-')[1]; // Extract part after hyphen
		if (districtCode) {
			DISTRICT_CODE_MAP[districtName.toUpperCase()] = districtCode;
		}
	}
} catch (error) {
	console.error('Error loading codes.json:', error);
	// Fallback to empty map
	DISTRICT_CODE_MAP = {};
}

const UserSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			trim: true,
			default: null
		},
		dialCode: {
			type: String,
			required: true,
			trim: true
		},
		phone: {
			type: String,
			required: true,
			trim: true,
			index: true
		},
		district: {
			type: String,
			trim: true,
			default: null
		},
		state: {
			type: String,
			trim: true,
			default: null
		},
		place: {
			type: String,
			trim: true,
			default: null
		},
		location: {
			latitude: {
				type: Number,
				default: null
			},
			longitude: {
				type: Number,
				default: null
			}
		},
		deviceOs: {
			type: String,
			trim: true,
			default: null
		},
		deviceName: {
			type: String,
			trim: true,
			default: null
		},
		profileImage: {
			type: String,
			trim: true,
			default: null
		},
		firebaseTokens: {
			type: [String],
			default: [],
			validate: {
				validator: function(v) {
					return v.length <= 2;
				},
				message: 'Maximum 2 firebase tokens allowed (2 active devices)'
			}
		},
		isActive: {
			type: Boolean,
			default: true
		},
		deactivationReason: {
			type: String,
			trim: true,
			default: null,
			maxlength: 500
		},
		deletedAt: {
			type: Date,
			default: null
		},
		profileComplete: {
			type: Boolean,
			default: false
		},
		userCode: {
			type: String,
			trim: true,
			uppercase: true,
			unique: true,
			sparse: true,
			index: true
		}
	},
	{ timestamps: true }
);

UserSchema.index({ dialCode: 1, phone: 1 }, { unique: true });

// Generate random 2-digit alphanumeric code (numbers and letters)
const generateRandomCode = () => {
	const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let result = '';
	for (let i = 0; i < 2; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

// Get district code from district name using codes.json mapping
const getDistrictCode = (districtName) => {
	// If district is null or empty, use "DIST" as default code
	if (!districtName || districtName.trim() === '') {
		return 'DIST';
	}
	
	const districtUpper = districtName.toUpperCase().trim();
	
	// Direct match in DISTRICT_CODE_MAP (loaded from codes.json)
	if (DISTRICT_CODE_MAP[districtUpper]) {
		return DISTRICT_CODE_MAP[districtUpper];
	}
	
	// Partial match (e.g., "KANNUR DISTRICT" -> "KAN", "KANNUR" -> "KAN")
	// Check if district name contains or is contained in any mapped district name
	for (const [mappedDistrictName, code] of Object.entries(DISTRICT_CODE_MAP)) {
		if (districtUpper.includes(mappedDistrictName) || mappedDistrictName.includes(districtUpper)) {
			return code;
		}
	}
	
	// If no match, use first 3 letters of district name (uppercase)
	return districtUpper.substring(0, 3).padEnd(3, 'X').substring(0, 3);
};

// Generate unique user code
// Format: EAT{last4digits}{districtCode}{random2digits}
// Example: EAT3930KAN89 or EAT3930KANJ8
UserSchema.statics.generateUserCode = async function (phone, district) {
	if (!phone) {
		throw new Error('Phone number is required to generate user code');
	}
	
	// Get last 4 digits of phone number (pad with 0s if less than 4 digits)
	const phoneStr = String(phone).replace(/\D/g, ''); // Remove non-digits
	const last4Digits = phoneStr.slice(-4).padStart(4, '0');
	
	// Get district code
	const districtCode = getDistrictCode(district);
	
	let userCode;
	let attempts = 0;
	const maxAttempts = 100; // Prevent infinite loop
	
	do {
		const randomCode = generateRandomCode();
		userCode = `EAT${last4Digits}${districtCode}${randomCode}`;
		attempts++;
		
		// Check if code already exists
		const existingUser = await this.findOne({ userCode: userCode });
		if (!existingUser) {
			break;
		}
		
		if (attempts >= maxAttempts) {
			throw new Error('Unable to generate unique user code. Please try again.');
		}
	} while (true);
	
	return userCode;
};

// Pre-save hook to generate user code if not exists
UserSchema.pre('save', async function (next) {
	// Only generate code for new users who don't have one yet
	if (this.isNew && !this.userCode && this.phone) {
		try {
			this.userCode = await this.constructor.generateUserCode(
				this.phone,
				this.district || null
			);
		} catch (error) {
			return next(error);
		}
	}
	// Don't regenerate code if it already exists or user is being updated
	next();
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
module.exports.DISTRICT_CODE_MAP = DISTRICT_CODE_MAP; // Export the loaded district code mapping


