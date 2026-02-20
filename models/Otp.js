const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
	{
		dialCode: { type: String, required: true, trim: true },
		phone: { type: String, required: true, trim: true, index: true },
		code: { type: String, required: true },
		expiresAt: { type: Date, required: true },
		attempts: { type: Number, default: 0 },
		firebaseToken: { type: String, default: null },
		deviceOs: { type: String, default: null },
		deviceName: { type: String, default: null }
	},
	{ timestamps: true }
);

OtpSchema.index({ dialCode: 1, phone: 1 }, { unique: true });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);


