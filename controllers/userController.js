const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const querystring = require('node:querystring');
const https = require('node:https');
const User = require('../models/User');
const Otp = require('../models/Otp');
const Vendor = require('../models/Vendor');
const Food = require('../models/Food');

const TEST_PHONES = ['9061213930', '9747489556'];
const SMS_API_URL = 'https://sapteleservices.com/SMS_API/sendsms.php';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBOHuJ-4CqJBjmSi_RugeonwPU5cBVqbeA';
const GOOGLE_GEOCODE_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const MAX_ACTIVE_DEVICES = 2; // Maximum 2 devices can be logged in at a time

class UserController {
	generateToken(id, phone) {
		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is not defined in environment variables');
		}
		return jwt.sign(
			{ id, phone, role: 'user' },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
		);
	}

	generateOtp(phone) {
		const normalizedPhone = (phone || '').replace(/\D/g, '');
		if (normalizedPhone && TEST_PHONES.includes(normalizedPhone)) return '000000';
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	async sendSms(phone, message) {
		const params = {
			username: process.env.SMS_USERNAME,
			password: process.env.SMS_PASSWORD,
			mobile: phone,
			sendername: process.env.SMS_SENDER,
			message,
			routetype: 1,
			tid: '1607100000000250667'
		};

		const query = querystring.stringify(params);
		const url = new URL(SMS_API_URL);
		url.search = query;

		return new Promise((resolve, reject) => {
			const req = https.get(url, (res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
			});
			req.on('error', reject);
			req.end();
		});
	}

	async reverseGeocode(latitude, longitude) {
		try {
			const url = new URL(GOOGLE_GEOCODE_API);
			url.searchParams.set('latlng', `${latitude},${longitude}`);
			url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
			return new Promise((resolve, reject) => {
				const req = https.get(url, (res) => {
					let data = '';
					res.on('data', (chunk) => (data += chunk));
					res.on('end', () => {
						try {
							const result = JSON.parse(data);
							if (result.status === 'OK' && result.results && result.results.length > 0) {
								let state = null;
								let district = null;
								let place = null;

								// Prefer using the most specific result first
								const candidates = result.results;
								for (const r of candidates) {
									for (const component of r.address_components) {
										if (!state && component.types.includes('administrative_area_level_1')) {
											state = component.long_name;
										}
										// District: prefer level_2, then level_3, then locality
										if (!district && component.types.includes('administrative_area_level_2')) {
											district = component.long_name;
										}
										if (!district && component.types.includes('administrative_area_level_3')) {
											district = component.long_name;
										}
										if (!district && component.types.includes('locality')) {
											district = component.long_name;
										}

										// Place: prefer locality, then sublocality_level_1, then neighborhood
										if (!place && component.types.includes('locality')) {
											place = component.long_name;
										}
										if (!place && component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
											place = component.long_name;
										}
										if (!place && component.types.includes('neighborhood')) {
											place = component.long_name;
										}
									}
									if (state && district && place) break;
								}

								resolve({ state, district, place });
							} else {
								resolve({ state: null, district: null, place: null });
							}
						} catch (error) {
							reject(error);
						}
					});
				});
				req.on('error', reject);
				req.end();
			});
		} catch (error) {
			console.error('Reverse geocoding error:', error);
			return { state: null, district: null, place: null };
		}
	}

	manageFirebaseTokens(user, newToken) {
		if (!newToken) return;

		// Remove the token if it already exists to avoid duplicates
		user.firebaseTokens = user.firebaseTokens.filter((token) => token !== newToken);

		// Add new token at the beginning (latest first)
		user.firebaseTokens.unshift(newToken);

		// Keep only the latest 2 tokens (max 2 active devices at a time)
		// If a 3rd device logs in, the oldest token is automatically removed
		if (user.firebaseTokens.length > MAX_ACTIVE_DEVICES) {
			user.firebaseTokens = user.firebaseTokens.slice(0, MAX_ACTIVE_DEVICES);
		}
	}

	getProfileMissingFields(user) {
		const missingFields = [];
		if (!user?.name) {
			missingFields.push('name');
		}

		const hasLatitude = user?.location && user.location.latitude !== null && user.location.latitude !== undefined;
		const hasLongitude = user?.location && user.location.longitude !== null && user.location.longitude !== undefined;

		if (!hasLatitude || !hasLongitude) {
			missingFields.push('location');
		}

		if (!user?.state) {
			missingFields.push('state');
		}

		if (!user?.district) {
			missingFields.push('district');
		}

		return [...new Set(missingFields)];
	}

	isProfileComplete(user) {
		return this.getProfileMissingFields(user).length === 0;
	}

	async sendOtp(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
			}

			const { dialCode, phone, firebaseToken, deviceOs, deviceName } = req.body;
			const code = this.generateOtp(phone);
			const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

			// Update OTP with code, expiration, and device details in one operation
			const updateData = {
				code,
				expiresAt,
				attempts: 0
			};

			if (firebaseToken !== undefined) updateData.firebaseToken = firebaseToken;
			if (deviceOs !== undefined) updateData.deviceOs = deviceOs;
			if (deviceName !== undefined) updateData.deviceName = deviceName;

			await Otp.findOneAndUpdate(
				{ dialCode, phone },
				updateData,
				{ upsert: true, new: true, setDefaultsOnInsert: true }
			);

			const message = `Your eatplek verification code is ${code}. Thank you for choosing eatplek.`;
			try {
				await this.sendSms(phone, message);
			} catch (e) {
				// Continue even if SMS gateway fails, for testing
				console.error('SMS sending failed:', e.message || e);
			}

			return res.json({ success: true, message: 'OTP sent successfully' });
		} catch (error) {
			console.error('Error sending OTP:', error);
			return res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
		}
	}

	async verifyOtp(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
			}

			const { dialCode, phone, otp, deviceOs, deviceName, firebaseToken } = req.body;

			const otpDoc = await Otp.findOne({ dialCode, phone });
			if (!otpDoc) {
				return res.status(400).json({ success: false, message: 'OTP not found or expired' });
			}
			if (otpDoc.expiresAt < new Date()) {
				await Otp.deleteOne({ _id: otpDoc._id });
				return res.status(400).json({ success: false, message: 'OTP expired' });
			}
			if (otpDoc.code !== otp) {
				otpDoc.attempts += 1;
				await otpDoc.save();
				return res.status(400).json({ success: false, message: 'Invalid OTP' });
			}

			// Get device details from OTP record or request body (prefer request body)
			const finalDeviceOs = deviceOs || otpDoc.deviceOs;
			const finalDeviceName = deviceName || otpDoc.deviceName;
			const finalFirebaseToken = firebaseToken || otpDoc.firebaseToken;

			// OTP valid – consume it
			await Otp.deleteOne({ _id: otpDoc._id });

			let user = await User.findOne({ dialCode, phone });
			if (user) {
				// Update device details (required on every login)
				if (finalDeviceOs) user.deviceOs = finalDeviceOs;
				if (finalDeviceName) user.deviceName = finalDeviceName;
				if (user.profileImage === undefined) user.profileImage = null;

				// Manage Firebase tokens (device management: max 2 active devices)
				this.manageFirebaseTokens(user, finalFirebaseToken);

				const profileCompleteNow = this.isProfileComplete(user);
				user.profileComplete = profileCompleteNow;

				await user.save();

				const token = this.generateToken(user._id, user.phone);
				const missingFields = this.getProfileMissingFields(user);
				const status = profileCompleteNow ? 'registered' : 'pending';

				const responsePayload = {
					success: true,
					message: status === 'registered'
						? 'Login successful'
						: 'Profile incomplete. Please update your profile.',
					status,
					data: {
						id: user._id,
						userCode: user.userCode,
						name: user.name,
						dialCode: user.dialCode,
						phone: user.phone,
						district: user.district,
						state: user.state,
						place: user.place,
						profileImage: user.profileImage,
						profileComplete: user.profileComplete
					},
					token
				};

				if (!profileCompleteNow) {
					responsePayload.missingFields = missingFields;
				}

				return res.json({
					...responsePayload
				});
			}

			// New user – create minimal record and mark profile as incomplete
			const firebaseTokens = finalFirebaseToken ? [finalFirebaseToken] : [];
			user = await User.create({
				dialCode,
				phone,
				deviceOs: finalDeviceOs || null,
				deviceName: finalDeviceName || null,
				firebaseTokens,
				profileComplete: false
			});

			const token = this.generateToken(user._id, user.phone);
			const missingFields = this.getProfileMissingFields(user);
			return res.status(201).json({
				success: true,
				message: 'OTP verified. Additional details required to complete profile',
				status: 'pending',
				data: {
					id: user._id,
					userCode: user.userCode,
					name: user.name,
					dialCode: user.dialCode,
					phone: user.phone,
					district: user.district,
					state: user.state,
					place: user.place,
					profileImage: user.profileImage,
					profileComplete: user.profileComplete
				},
				missingFields,
				token
			});
		} catch (error) {
			console.error('Error verifying OTP:', error);
			return res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
		}
	}

	async deactivateAccount(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({
					success: false,
					message: 'Authentication required'
				});
			}

			const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			if (!user.isActive) {
				return res.status(400).json({
					success: false,
					message: 'Account is already deactivated'
				});
			}

			user.isActive = false;
			user.deletedAt = new Date();
			user.deactivationReason = reason || null;
			user.firebaseTokens = [];

			await user.save();

			return res.json({
				success: true,
				message: 'Account deactivated successfully'
			});
		} catch (error) {
			console.error('Error deactivating account:', error);
			return res.status(500).json({
				success: false,
				message: 'Error deactivating account',
				error: error.message
			});
		}
	}

	async restoreAccount(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({
					success: false,
					message: 'Authentication required'
				});
			}

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			if (user.isActive) {
				return res.status(400).json({
					success: false,
					message: 'Account is already active'
				});
			}

			user.isActive = true;
			user.deletedAt = null;
			user.deactivationReason = null;

			await user.save();

			return res.json({
				success: true,
				message: 'Account restored successfully'
			});
		} catch (error) {
			console.error('Error restoring account:', error);
			return res.status(500).json({
				success: false,
				message: 'Error restoring account',
				error: error.message
			});
		}
	}

	async hardDeleteAccount(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({
					success: false,
					message: 'Authentication required'
				});
			}

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			await Promise.all([
				User.deleteOne({ _id: req.user.id }),
				Otp.deleteMany({ phone: user.phone, dialCode: user.dialCode })
			]);

			return res.json({
				success: true,
				message: 'Account deleted permanently'
			});
		} catch (error) {
			console.error('Error deleting account permanently:', error);
			return res.status(500).json({
				success: false,
				message: 'Error deleting account',
				error: error.message
			});
		}
	}

	async updateProfile(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
			}

			const { name, latitude, longitude, firebaseToken, deviceOs, deviceName, profileImage } = req.body;
			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({ success: false, message: 'User not found' });
			}

			// Update name
			if (name !== undefined) user.name = name;

			// Update location and reverse geocode to get state/district/place
			if (latitude !== undefined && longitude !== undefined) {
				user.location = {
					latitude,
					longitude
				};

				// Reverse geocode to extract state, district and place
				const geoData = await this.reverseGeocode(latitude, longitude);
				if (geoData.state) user.state = geoData.state;
				if (geoData.district) user.district = geoData.district;
				if (geoData.place) user.place = geoData.place;
			}

			// Update device details
			if (deviceOs !== undefined) user.deviceOs = deviceOs;
			if (deviceName !== undefined) user.deviceName = deviceName;

			if (profileImage !== undefined) {
				const trimmedImage = typeof profileImage === 'string' ? profileImage.trim() : profileImage;
				user.profileImage = trimmedImage ? trimmedImage : null;
			}

			// Manage Firebase tokens (device management: max 2 active devices)
			if (firebaseToken !== undefined) {
				this.manageFirebaseTokens(user, firebaseToken);
			}

			// Profile is complete when name, location (lat/long), state, and district are available
			const profileCompleteNow = this.isProfileComplete(user);
			user.profileComplete = profileCompleteNow;

			await user.save();

			const missingFields = this.getProfileMissingFields(user);

			return res.json({
				success: true,
				message: 'Profile updated successfully',
				status: profileCompleteNow ? 'registered' : 'pending',
				data: {
					id: user._id,
					userCode: user.userCode,
					name: user.name,
					dialCode: user.dialCode,
					phone: user.phone,
					district: user.district,
					state: user.state,
					location: user.location,
					profileComplete: user.profileComplete,
					profileImage: user.profileImage,
					place: user.place
				},
				missingFields
			});
		} catch (error) {
			console.error('Error updating profile:', error);
			return res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
		}
	}

	/**
	 * Parse time string to minutes since midnight
	 * Supports formats: "HH:MM", "HH:MM AM/PM", "HH:MMam/pm"
	 */
	parseTimeToMinutes(timeString) {
		if (!timeString) return null;
		
		const cleaned = timeString.trim().toUpperCase();
		let hours, minutes;
		
		// Handle 12-hour format with AM/PM
		if (cleaned.includes('AM') || cleaned.includes('PM')) {
			const parts = cleaned.split(/[:\s]+/);
			hours = parseInt(parts[0]);
			minutes = parseInt(parts[1] || 0);
			const period = parts[parts.length - 1];
			
			if (period === 'PM' && hours !== 12) hours += 12;
			if (period === 'AM' && hours === 12) hours = 0;
		} else {
			// Handle 24-hour format
			const parts = cleaned.split(':');
			hours = parseInt(parts[0]);
			minutes = parseInt(parts[1] || 0);
		}
		
		return hours * 60 + minutes;
	}

	/**
	 * Check if current time is between start and end time
	 */
	isTimeBetween(currentMinutes, startTime, endTime) {
		const startMinutes = this.parseTimeToMinutes(startTime);
		const endMinutes = this.parseTimeToMinutes(endTime);
		
		if (startMinutes === null || endMinutes === null) return false;
		
		// Handle case where end time is next day (e.g., 22:00 to 02:00)
		if (endMinutes < startMinutes) {
			return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
		}
		
		return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
	}

	/**
	 * Check if vendor is currently open
	 */
	isVendorOpen(vendor, currentTime) {
		if (!currentTime) return null; // Cannot determine without current time
		
		const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const currentDate = new Date(currentTime);
		const dayName = days[currentDate.getDay()];
		
		const dayHours = vendor.operatingHours?.find(h => h.day === dayName);
		if (!dayHours || dayHours.isClosed) return false;
		
		if (!dayHours.openTime || !dayHours.closeTime) return false;
		
		const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
		const startMinutes = this.parseTimeToMinutes(dayHours.openTime);
		const endMinutes = this.parseTimeToMinutes(dayHours.closeTime);
		
		if (startMinutes === null || endMinutes === null) return false;
		
		// Handle case where close time is next day
		if (endMinutes < startMinutes) {
			return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
		}
		
		return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
	}

	/**
	 * Calculate distance between two coordinates (Haversine formula)
	 * Returns distance in kilometers
	 */
	calculateDistance(lat1, lon1, lat2, lon2) {
		const R = 6371; // Earth's radius in kilometers
		const dLat = this.toRadians(lat2 - lat1);
		const dLon = this.toRadians(lon2 - lon1);
		
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(this.toRadians(lat1)) *
				Math.cos(this.toRadians(lat2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = R * c;
		
		return Math.round(distance * 100) / 100; // Round to 2 decimal places
	}

	toRadians(degrees) {
		return degrees * (Math.PI / 180);
	}

	/**
	 * Get user app home screen data
	 * GET /api/users/app/home
	 * Detects available services and lists vendors based on radius rules
	 */
	async getAppHome(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
			}

			const {
				latitude,
				longitude,
				serviceType = 'all',
				radius,
				dateTime,
				search
			} = req.query;

			// Validate required location parameters
			if (!latitude || !longitude) {
				return res.status(400).json({
					success: false,
					message: 'latitude and longitude are required'
				});
			}

			const userLat = parseFloat(latitude);
			const userLon = parseFloat(longitude);

			// Define default radius for each service type (in km)
			// Using normalized service type names
			const defaultRadius = {
				'Dine in': 30,
				'Delivery': 10,
				'Takeaway': 25,
				'Pickup': 25,
				'Car Dine in': 40
			};

			// Normalize service type mapping to vendor schema values
			const { normalizeServiceType } = require('../utils/serviceType');
			const serviceMapping = {
				'dine-in': 'Dine in',
				'delivery': 'Delivery',
				'takeaway': 'Takeaway',
				'pickup': 'Pickup',
				'car-dine-in': 'Car Dine in'
			};

			const getLocationFromAddress = (address = {}) => {
				const coords = address?.coordinates?.coordinates;
				if (Array.isArray(coords) && coords.length === 2) {
					return {
						latitude: coords[1],
						longitude: coords[0]
					};
				}
				return null;
			};

			const buildScheduleInfo = (entity, fallbackDay) => {
				const dayHours = entity?.operatingHours?.find((h) => h.day === fallbackDay);
				if (!dayHours) {
					return null;
				}
				return {
					openTime: dayHours.openTime || null,
					closeTime: dayHours.closeTime || null,
					isClosed: Boolean(dayHours.isClosed)
				};
			};

			// Step 1: Find all available services in the area
			let availableServices = [];
			{
				const allServices = ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in'];
				const servicesFound = new Set();

				// Query each service with its default radius
				for (const service of allServices) {
					const serviceRadius = defaultRadius[service] * 1000; // Convert to meters
					const vendorServiceName = service;

					const vendorsWithService = await Vendor.aggregate([
						{
							$geoNear: {
								near: {
									type: 'Point',
									coordinates: [userLon, userLat]
								},
								distanceField: 'distance',
								maxDistance: serviceRadius,
								spherical: true,
								query: {
									isActive: true,
									isVerified: true,
									verificationStatus: 'Approved',
									serviceOffered: { $in: [vendorServiceName] }
								}
							}
						},
						{ $limit: 1 }
					]);

					if (vendorsWithService.length > 0) {
						servicesFound.add(service);
					}
				}

				availableServices = Array.from(servicesFound);
			}

			// Step 2: Get vendors based on selected service type
			let vendors = [];
			if (serviceType !== 'all') {
				// Normalize the serviceType to standard format
				const vendorServiceName = normalizeServiceType(serviceType);

				if (!vendorServiceName) {
					return res.status(400).json({
						success: false,
						message: 'Invalid serviceType. Must be one of: Dine in, Delivery, Takeaway, Pickup, Car Dine in, or all'
					});
				}

				// Determine radius to use
				const effectiveRadius = radius ? parseFloat(radius) : defaultRadius[vendorServiceName];
				const radiusInMeters = effectiveRadius * 1000;

				// Build query filter
				const filter = {
					isActive: true,
					isVerified: true,
					verificationStatus: 'Approved',
					serviceOffered: { $in: [vendorServiceName] }
				};

				// Add search filter if provided
				if (search) {
					const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					filter.$or = [
						{ restaurantName: { $regex: escapedSearch, $options: 'i' } },
						{ ownerName: { $regex: escapedSearch, $options: 'i' } },
						{ 'address.city': { $regex: escapedSearch, $options: 'i' } }
					];
				}

				// Get vendors with geospatial query
				const aggregationPipeline = [
					{
						$geoNear: {
							near: {
								type: 'Point',
								coordinates: [userLon, userLat]
							},
							distanceField: 'distance',
							maxDistance: radiusInMeters,
							spherical: true,
							query: filter
						}
					},
					{ $sort: { distance: 1 } }
				];

				// Add search-based sorting if search is provided
				if (search) {
					aggregationPipeline.push({
						$addFields: {
							searchScore: {
								$cond: {
									if: { $regexMatch: { input: '$restaurantName', regex: search, options: 'i' } },
									then: 2,
									else: 1
								}
							}
						}
					});
					aggregationPipeline.push({ $sort: { searchScore: -1, distance: 1 } });
				}

				vendors = await Vendor.aggregate(aggregationPipeline);

				// Process vendors to format response
				let referenceDate = dateTime ? new Date(dateTime) : new Date();
				if (Number.isNaN(referenceDate.getTime())) {
					referenceDate = new Date();
				}
				const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
				const currentDay = days[referenceDate.getDay()];
				const referenceMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

				// Process vendors and their branches
				vendors = await Promise.all(vendors.map(async vendor => {
					// Check if vendor is open now
					let isOpenNow = false;
					const dayHours = vendor.operatingHours?.find(h => h.day === currentDay);
					if (dayHours && dayHours.openTime && dayHours.closeTime) {
						const startMinutes = this.parseTimeToMinutes(dayHours.openTime);
						const endMinutes = this.parseTimeToMinutes(dayHours.closeTime);

						if (startMinutes !== null && endMinutes !== null) {
							// Handle case where close time is next day
							if (endMinutes < startMinutes) {
								isOpenNow = referenceMinutes >= startMinutes || referenceMinutes <= endMinutes;
							} else {
								isOpenNow = referenceMinutes >= startMinutes && referenceMinutes <= endMinutes;
							}
						}
					}

					// Fetch and filter branches that meet the same criteria
					let branchList = [];
					if (vendor.branches && vendor.branches.length > 0) {
						try {
							// Get branches within radius and matching service
							const mongoose = require('mongoose');
							const branchIds = vendor.branches.map(b => {
								if (typeof b === 'string') {
									return mongoose.Types.ObjectId(b);
								}
								return b._id || b;
							});

							const branchCriteria = [
								{
									$geoNear: {
										near: {
											type: 'Point',
											coordinates: [userLon, userLat]
										},
										distanceField: 'distance',
										maxDistance: radiusInMeters,
										spherical: true,
										query: {
											_id: { $in: branchIds },
											isActive: true,
											isVerified: true,
											verificationStatus: 'Approved',
											serviceOffered: { $in: [vendorServiceName] }
										}
									}
								},
								{ $sort: { distance: 1 } }
							];

							const branches = await Vendor.aggregate(branchCriteria);

							branchList = branches.map(branch => {
								let branchIsOpenNow = false;
								const branchDayHours = branch.operatingHours?.find(h => h.day === currentDay);
								if (branchDayHours && branchDayHours.openTime && branchDayHours.closeTime) {
									const startMinutes = this.parseTimeToMinutes(branchDayHours.openTime);
									const endMinutes = this.parseTimeToMinutes(branchDayHours.closeTime);

									if (startMinutes !== null && endMinutes !== null) {
										if (endMinutes < startMinutes) {
											branchIsOpenNow = referenceMinutes >= startMinutes || referenceMinutes <= endMinutes;
										} else {
											branchIsOpenNow = referenceMinutes >= startMinutes && referenceMinutes <= endMinutes;
										}
									}
								}

								return {
									hotelId: branch._id.toString(),
									hotelName: branch.restaurantName,
									profileImage: branch.profileImage || '',
									coverImage: branch.restaurantImage || '',
									place: branch.address?.city || '',
									location: getLocationFromAddress(branch.address),
									isOpenNow: branchIsOpenNow,
									schedule: buildScheduleInfo(branch, currentDay),
									averageRating: branch.averageRating || 0,
									reviewCount: branch.reviewCount || 0
								};
							});
						} catch (branchError) {
							console.error('Error fetching branches:', branchError);
							// Continue without branches if error occurs
						}
					}

					if (vendor.branches && vendor.branches.length > 0) {
						const parentAsBranch = {
							hotelId: vendor._id.toString(),
							hotelName: vendor.restaurantName,
							profileImage: vendor.profileImage || '',
							coverImage: vendor.restaurantImage || '',
							place: vendor.address?.city || '',
							location: getLocationFromAddress(vendor.address),
							isOpenNow,
							schedule: buildScheduleInfo(vendor, currentDay),
							averageRating: vendor.averageRating || 0,
							reviewCount: vendor.reviewCount || 0
						};
						branchList = [parentAsBranch, ...branchList];
					}

					return {
						hotelId: vendor._id.toString(),
						hotelName: vendor.restaurantName,
						profileImage: vendor.profileImage || '',
						coverImage: vendor.restaurantImage || '',
						place: vendor.address?.city || '',
						location: getLocationFromAddress(vendor.address),
						isOpenNow: isOpenNow,
						schedule: buildScheduleInfo(vendor, currentDay),
						averageRating: vendor.averageRating || 0,
						reviewCount: vendor.reviewCount || 0,
						branchList: branchList
					};
				}));

				// Remove duplicates: handle both unidirectional and bidirectional branch relationships
				const branchIdsSet = new Set();
				const processedVendorIds = new Set();
				
				// First pass: collect all branch IDs
				vendors.forEach(vendor => {
					vendor.branchList.forEach(branch => {
						branchIdsSet.add(branch.hotelId);
					});
				});

				// Second pass: filter vendors
				// Keep first vendor in bidirectional relationships, remove the duplicate
				vendors = vendors.filter(vendor => {
					const vendorId = vendor.hotelId;
					
					// If this vendor is a branch of someone AND has already been processed, skip it
					if (branchIdsSet.has(vendorId) && processedVendorIds.has(vendorId)) {
						return false;
					}
					
					// If this vendor has branches, mark those branch IDs as processed
					if (vendor.branchList.length > 0) {
						vendor.branchList.forEach(branch => {
							processedVendorIds.add(branch.hotelId);
						});
					}
					
					// Mark this vendor as processed
					processedVendorIds.add(vendorId);
					
					return true;
				});
			}

			// Fetch prebook foods from all vendors
			let prebookList = [];
			if (vendors.length > 0) {
				const currentDateTime = dateTime ? new Date(dateTime) : new Date();
				const allVendorIds = vendors.map(v => v.hotelId);

				// Get all active prebook foods that haven't expired
				const prebookFoods = await Food.find({
					vendor: { $in: allVendorIds },
					isActive: true,
					isPrebook: true,
					prebookStartDate: { $lte: currentDateTime },
					prebookEndDate: { $gte: currentDateTime }
				})
					.populate('vendor', 'restaurantName profileImage restaurantImage address averageRating reviewCount')
					.populate('category', 'categoryName')
					.lean();

				prebookList = prebookFoods.map(food => ({
					foodId: food._id.toString(),
					foodName: food.foodName,
					foodImage: food.foodImage || '',
					description: food.description || '',
					basePrice: food.basePrice,
					discountPrice: food.discountPrice,
					effectivePrice: (food.discountPrice !== null && food.discountPrice < food.basePrice)
						? food.discountPrice
						: food.basePrice,
					prebookStartDate: food.prebookStartDate,
					prebookEndDate: food.prebookEndDate,
					category: food.category?.categoryName || '',
					vendor: {
						hotelId: food.vendor._id.toString(),
						hotelName: food.vendor.restaurantName,
						profileImage: food.vendor.profileImage || '',
						coverImage: food.vendor.restaurantImage || '',
						place: food.vendor.address?.city || '',
						averageRating: food.vendor.averageRating || 0,
						reviewCount: food.vendor.reviewCount || 0
					}
				}));
			}

			// Fetch today's offer foods from all vendors
			let todayOfferFoods = [];
			{
				const currentDateTime = dateTime ? new Date(dateTime) : new Date();
				const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
				const currentDay = days[currentDateTime.getDay()];
				const currentMinutes = currentDateTime.getHours() * 60 + currentDateTime.getMinutes();

				// Get all vendor IDs from the vendors list
				const allVendorIds = vendors.length > 0 ? vendors.map(v => v.hotelId) : [];

				if (allVendorIds.length > 0) {
					// Find foods with active day offers for today
					const foodsWithOffers = await Food.find({
						vendor: { $in: allVendorIds },
						isActive: true,
						'dayOffers.activeDays': currentDay,
						'dayOffers.isActive': true
					})
						.populate('vendor', 'restaurantName profileImage restaurantImage address averageRating reviewCount')
						.populate('category', 'categoryName image')
						.lean();

					// Process foods and filter by time if applicable
					todayOfferFoods = foodsWithOffers
						.map((food) => {
							// Find the active offer for today
							const dayOffer = food.dayOffers?.find(
								(offer) => offer.activeDays.includes(currentDay) && offer.isActive
							);
							if (!dayOffer) return null;

							const isOfferActiveNow = this.isTimeBetween(
								currentMinutes,
								dayOffer.startTime,
								dayOffer.endTime
							);

							// Calculate offer price
							let offerPrice = food.basePrice;
							if (food.discountPrice !== null && food.discountPrice < food.basePrice) {
								offerPrice = food.discountPrice;
							}

							// Apply day offer discount
							if (dayOffer.discountType === 'percentage') {
								offerPrice = offerPrice * (1 - dayOffer.discountValue / 100);
							} else if (dayOffer.discountType === 'fixed') {
								offerPrice = Math.max(0, offerPrice - dayOffer.discountValue);
							}

							return {
								foodId: food._id.toString(),
								foodName: food.foodName,
								foodImage: food.foodImage || '',
								description: food.description || '',
								basePrice: food.basePrice,
								discountPrice: food.discountPrice,
								effectivePrice: Math.round(offerPrice * 100) / 100,
								offerPrice: Math.round(offerPrice * 100) / 100,
								category: food.category?.categoryName || '',
								categoryImage: food.category?.image || '',
								activeOffer: {
									discountType: dayOffer.discountType,
									discountValue: dayOffer.discountValue,
									startTime: dayOffer.startTime,
									endTime: dayOffer.endTime
								},
								isOfferActiveNow,
								vendor: {
									hotelId: food.vendor._id.toString(),
									hotelName: food.vendor.restaurantName,
									profileImage: food.vendor.profileImage || '',
									coverImage: food.vendor.restaurantImage || '',
									place: food.vendor.address?.city || '',
									averageRating: food.vendor.averageRating || 0,
									reviewCount: food.vendor.reviewCount || 0
								}
							};
						})
						.filter(Boolean)
						.slice(0, 50); // Limit to 50 today offer foods
				}
			}

			// Fetch banners: check location radius (based on service type) and expiration
			let banners = [];
			{
				const currentDateTime = dateTime ? new Date(dateTime) : new Date();
				const Banner = require('../models/Banner');

				// Determine the radius to use for banner filtering
				const normalizedServiceType = serviceType !== 'all' ? normalizeServiceType(serviceType) : null;
				const effectiveRadius = radius ? parseFloat(radius) : (normalizedServiceType ? defaultRadius[normalizedServiceType] : 30) || 30; // Default to 30km if 'all'
				const radiusInMeters = effectiveRadius * 1000;

				// Get all active, non-expired banners
				const allBanners = await Banner.find({
					isActive: true,
					endDate: { $gte: currentDateTime }
				})
					.populate('hotel', 'restaurantName profileImage restaurantImage address')
					.populate('prebook', 'foodName foodImage basePrice discountPrice prebookStartDate prebookEndDate')
					.lean();

				// Filter banners based on location
				for (const banner of allBanners) {
					let shouldInclude = false;

					// If banner has location, check if it's within radius
					if (banner.locationPoints && banner.locationPoints.coordinates && banner.locationPoints.coordinates.length === 2) {
						const [bannerLon, bannerLat] = banner.locationPoints.coordinates;
						
						// Calculate distance using Haversine formula (returns km)
						const distanceInKm = this.calculateDistance(userLat, userLon, bannerLat, bannerLon);
						const distanceInMeters = distanceInKm * 1000;
						
						// Include banner if within radius
						if (distanceInMeters <= radiusInMeters) {
							shouldInclude = true;
						}
					} else {
						// If banner has no location, include it (global banner)
						shouldInclude = true;
					}

					if (shouldInclude) {
						banners.push({
							bannerId: banner._id.toString(),
							bannerImage: banner.bannerImage,
							isPrebookRelated: banner.isPrebookRelated,
							hotel: banner.hotel ? {
								hotelId: banner.hotel._id.toString(),
								hotelName: banner.hotel.restaurantName,
								profileImage: banner.hotel.profileImage || '',
								coverImage: banner.hotel.restaurantImage || '',
								place: banner.hotel.address?.city || ''
							} : null,
							prebook: banner.prebook ? {
								foodId: banner.prebook._id.toString(),
								foodName: banner.prebook.foodName,
								foodImage: banner.prebook.foodImage || '',
								basePrice: banner.prebook.basePrice,
								discountPrice: banner.prebook.discountPrice,
								effectivePrice: (banner.prebook.discountPrice !== null && banner.prebook.discountPrice < banner.prebook.basePrice)
									? banner.prebook.discountPrice
									: banner.prebook.basePrice,
								prebookStartDate: banner.prebook.prebookStartDate,
								prebookEndDate: banner.prebook.prebookEndDate
							} : null
						});
					}
				}
			}

			return res.json({
				success: true,
				message: 'Home screen data retrieved successfully',
				data: {
					availableServices,
					banners,
					vendors,
					prebookList,
					todayOfferFoods
				}
			});
		} catch (error) {
			console.error('Error getting app home data:', error);
			return res.status(500).json({
				success: false,
				message: 'Error retrieving home screen data',
				error: error.message
			});
		}
	}

	/**
	 * Get user home data with vendors
	 * GET /api/users/home
	 * Accessible with or without authentication
	 */
	async getHomeData(req, res) {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
			}

			const {
				serviceOffered,
				userLatitude,
				userLongitude,
				radius = 10, // Default 10km
				currentTime,
				search,
				page = 1,
				limit = 20
			} = req.query;

			// Validate serviceOffered if provided
			if (serviceOffered && serviceOffered !== 'Delivery') {
				return res.status(400).json({
					success: false,
					message: 'Currently only "Delivery" service is supported'
				});
			}

			// Build filter object
			const filter = {
				isActive: true,
				isVerified: true,
				verificationStatus: 'Approved'
			};

			// Filter by service offered
			if (serviceOffered === 'Delivery') {
				filter.serviceOffered = { $in: ['Delivery'] };
			}

			// Google-like search across multiple fields
			if (search) {
				const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				filter.$or = [
					{ restaurantName: { $regex: escapedSearch, $options: 'i' } },
					{ ownerName: { $regex: escapedSearch, $options: 'i' } },
					{ 'address.fullAddress': { $regex: escapedSearch, $options: 'i' } },
					{ 'address.city': { $regex: escapedSearch, $options: 'i' } },
					{ 'address.state': { $regex: escapedSearch, $options: 'i' } }
				];
			}

			// Calculate pagination
			const pageNum = parseInt(page);
			const limitNum = parseInt(limit);
			const skip = (pageNum - 1) * limitNum;

			let vendors;

			// If location is provided, use geospatial query
			if (userLatitude && userLongitude) {
				const latitude = parseFloat(userLatitude);
				const longitude = parseFloat(userLongitude);
				const radiusInMeters = parseFloat(radius) * 1000; // Convert km to meters

				// Use aggregation to get vendors with distance
				vendors = await Vendor.aggregate([
					{
						$geoNear: {
							near: {
								type: 'Point',
								coordinates: [longitude, latitude]
							},
							distanceField: 'distance',
							maxDistance: radiusInMeters,
							spherical: true,
							query: filter
						}
					},
					{
						$sort: { distance: 1 }
					},
					{
						$skip: skip
					},
					{
						$limit: limitNum
					}
				]);
			} else {
				// No location - return all matching vendors (without distance)
				vendors = await Vendor.find(filter)
					.sort({ averageRating: -1, createdAt: -1 })
					.skip(skip)
					.limit(limitNum)
					.lean();

				// Add distance as null if not calculated
				vendors = vendors.map(v => ({ ...v, distance: null }));
			}

			// Get current day
			const currentDate = currentTime ? new Date(currentTime) : new Date();
			const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			const currentDay = days[currentDate.getDay()];

			// Process vendors and fetch foods with offers
			const processedVendors = await Promise.all(
				vendors.map(async (vendor) => {
					// Handle both aggregate results and regular query results
					const vendorId = vendor._id || vendor.id;
					const vendorObj = await Vendor.findById(vendorId);
					if (!vendorObj) return null;
					
					const vendorData = vendorObj.toObject();
					// Preserve distance from aggregation if exists
					if (vendor.distance !== undefined) {
						vendorData.distance = vendor.distance;
					}

					// Check if vendor is open
					let isOpen = null;
					if (currentTime) {
						isOpen = this.isVendorOpen(vendorObj, currentTime);
					}

					// Fetch foods with offers for CURRENT DAY ("today offers")
					let todayOffers = [];
					let offerFoods = []; // backward compatibility
					let prebookFoods = [];
					{
						const vendorId = vendorData._id || vendorData.id;
						const foodFilter = {
							vendor: vendorId,
							isActive: true,
							'dayOffers.activeDays': currentDay,
							'dayOffers.isActive': true
						};

						const foods = await Food.find(foodFilter)
							.populate('category', 'categoryName image')
							.lean();

						if (foods.length > 0) {
							if (currentTime) {
								const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
								todayOffers = foods
									.map((food) => {
										const dayOffer = food.dayOffers?.find(
											(offer) => offer.activeDays.includes(currentDay) && offer.isActive
										);
										if (!dayOffer) return null;

										const isOfferActive = this.isTimeBetween(
											currentMinutes,
											dayOffer.startTime,
											dayOffer.endTime
										);
										if (!isOfferActive) return null;

										let offerPrice = food.basePrice;
										if (food.discountPrice) offerPrice = food.discountPrice;
										if (dayOffer.discountType === 'percentage') {
											offerPrice = offerPrice * (1 - dayOffer.discountValue / 100);
										} else if (dayOffer.discountType === 'fixed') {
											offerPrice = Math.max(0, offerPrice - dayOffer.discountValue);
										}

										return {
											...food,
											offerPrice: Math.round(offerPrice * 100) / 100,
											activeOffer: {
												discountType: dayOffer.discountType,
												discountValue: dayOffer.discountValue,
												startTime: dayOffer.startTime,
												endTime: dayOffer.endTime
											}
										};
								})
								.filter(Boolean);
							} else {
								// No currentTime provided: include all offers for the day
								todayOffers = foods
									.map((food) => {
										const dayOffer = food.dayOffers?.find(
											(offer) => offer.activeDays.includes(currentDay) && offer.isActive
										);
										if (!dayOffer) return null;

										let offerPrice = food.basePrice;
										if (food.discountPrice) offerPrice = food.discountPrice;
										if (dayOffer.discountType === 'percentage') {
											offerPrice = offerPrice * (1 - dayOffer.discountValue / 100);
										} else if (dayOffer.discountType === 'fixed') {
											offerPrice = Math.max(0, offerPrice - dayOffer.discountValue);
										}

										return {
											...food,
											offerPrice: Math.round(offerPrice * 100) / 100,
											activeOffer: {
												discountType: dayOffer.discountType,
												discountValue: dayOffer.discountValue,
												startTime: dayOffer.startTime,
												endTime: dayOffer.endTime
											}
										};
								})
								.filter(Boolean);
							}
						}

						// Keep backward compatibility: offerFoods mirrors todayOffers
						offerFoods = todayOffers;
					}

					// Fetch active prebook foods (within prebook window)
					{
						const now = currentDate;
						const vendorIdForPrebook = vendorData._id || vendorData.id;
						const prebookFilter = {
							vendor: vendorIdForPrebook,
							isActive: true,
							isPrebook: true,
							prebookStartDate: { $lte: now },
							prebookEndDate: { $gte: now }
						};

						const prebooks = await Food.find(prebookFilter)
							.select('foodName basePrice discountPrice imageKitFileId foodImage isPrebook prebookStartDate prebookEndDate')
							.lean();

						prebookFoods = prebooks.map((food) => ({
							...food,
							effectivePrice: (food.discountPrice !== null && food.discountPrice < food.basePrice)
								? food.discountPrice
								: food.basePrice
						}));
					}

					// Format vendor data
					return {
						id: vendorData._id ? vendorData._id.toString() : (vendorData.id ? vendorData.id.toString() : null),
						restaurantName: vendorData.restaurantName,
						ownerName: vendorData.ownerName,
						profileImage: vendorData.profileImage,
						restaurantImage: vendorData.restaurantImage,
						address: vendorData.address,
						serviceOffered: vendorData.serviceOffered,
						averageRating: vendorData.averageRating || 0,
						reviewCount: vendorData.reviewCount || 0,
						distance: vendorData.distance
							? Math.round((vendorData.distance / 1000) * 100) / 100
							: null, // Convert meters to km
						isOpen: isOpen,
						operatingHours: vendorData.operatingHours?.find((h) => h.day === currentDay) || null,
						todayOffers: todayOffers.slice(0, 10),
						offerFoods: offerFoods.slice(0, 10), // deprecated alias for todayOffers
						hasTodayOffers: todayOffers.length > 0,
						prebookFoods: prebookFoods.slice(0, 10) // Limit to 10 prebook foods
					};
				})
			);

			// Filter out null vendors (if any)
			const validVendors = processedVendors.filter(v => v !== null);

			// Get total count for pagination
			const totalCount = await Vendor.countDocuments(filter);
			const totalPages = Math.ceil(totalCount / limitNum);

			res.json({
				success: true,
				message: 'Home data retrieved successfully',
				data: {
					vendors: validVendors,
					currentDay: currentDay,
					currentTime: currentTime || new Date().toISOString(),
					pagination: {
						currentPage: pageNum,
						totalPages,
						totalCount,
						limit: limitNum,
						hasNextPage: pageNum < totalPages,
						hasPrevPage: pageNum > 1
					}
				}
			});
		} catch (error) {
			console.error('Error getting home data:', error);
			return res.status(500).json({
				success: false,
				message: 'Error retrieving home data',
				error: error.message
			});
		}
	}
}

const controller = new UserController();

module.exports = {
	sendOtp: controller.sendOtp.bind(controller),
	verifyOtp: controller.verifyOtp.bind(controller),
	deactivateAccount: controller.deactivateAccount.bind(controller),
	restoreAccount: controller.restoreAccount.bind(controller),
	hardDeleteAccount: controller.hardDeleteAccount.bind(controller),
	updateProfile: controller.updateProfile.bind(controller),
	getHomeData: controller.getHomeData.bind(controller),
	getAppHome: controller.getAppHome.bind(controller)
};


