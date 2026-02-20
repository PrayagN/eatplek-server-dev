const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const querystring = require('node:querystring');
const https = require('node:https');

const Vendor = require('../models/Vendor');
const Otp = require('../models/Otp');

const TEST_PHONES = ['9061213930', '9747489556'];
const SMS_API_URL = 'https://sapteleservices.com/SMS_API/sendsms.php';
const MAX_ACTIVE_DEVICES = 2;

class VendorAuthController {
  generateToken(vendor) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(
      {
        id: vendor._id,
        vendorId: vendor._id,
        role: 'vendor',
        email: vendor.email,
        phone: vendor.phoneNumber
      },
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

      req.on('error', (err) => reject(err));
    });
  }

  manageFirebaseTokens(vendor, newToken) {
    if (!newToken) return;

    if (!Array.isArray(vendor.firebaseTokens)) {
      vendor.firebaseTokens = [];
    }

    vendor.firebaseTokens = vendor.firebaseTokens.filter((token) => token !== newToken);
    vendor.firebaseTokens.unshift(newToken);

    if (vendor.firebaseTokens.length > MAX_ACTIVE_DEVICES) {
      vendor.firebaseTokens = vendor.firebaseTokens.slice(0, MAX_ACTIVE_DEVICES);
    }
  }

  normalizePhoneParts(dialCode, phone) {
    const dial = (dialCode || '').replace(/\D/g, '');
    const basePhone = (phone || '').replace(/\D/g, '');
    return {
      dialCode: dial,
      phone: basePhone
    };
  }

  async findVendorByPhone(dialCode, phone) {
    const { dialCode: normalizedDial, phone: normalizedPhone } = this.normalizePhoneParts(dialCode, phone);

    if (!normalizedDial || !normalizedPhone) {
      return null;
    }

    const dialPattern = normalizedDial ? `(?:\\+?${normalizedDial})?` : '';
    const phoneRegex = new RegExp(`${dialPattern}${normalizedPhone}$`);

    const candidates = await Vendor.findOne({
      $or: [
        { dialCode: normalizedDial, phone: normalizedPhone },
        { phoneNumber: { $regex: phoneRegex } },
        { phoneNumber: { $regex: new RegExp(`${normalizedPhone}$`) } }
      ]
    });

    return { vendor: candidates, normalizedDial, normalizedPhone };
  }

  async sendOtp(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { dialCode, phone, firebaseToken, deviceOs, deviceName } = req.body;
      const result = await this.findVendorByPhone(dialCode, phone);

      if (!result || !result.vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found. Please contact support.'
        });
      }

      const { normalizedDial, normalizedPhone } = result;
      if (!normalizedDial || !normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }

      const code = this.generateOtp(normalizedPhone);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const updateData = {
        code,
        expiresAt,
        attempts: 0
      };

      if (firebaseToken !== undefined) updateData.firebaseToken = firebaseToken;
      if (deviceOs !== undefined) updateData.deviceOs = deviceOs;
      if (deviceName !== undefined) updateData.deviceName = deviceName;

      await Otp.findOneAndUpdate(
        { dialCode: normalizedDial, phone: normalizedPhone },
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const message = `Your eatplek verification code is ${code}. Thank you for choosing eatplek.`;
      const smsTarget =
        result.vendor?.phoneNumber?.replace(/\D/g, '') || `${normalizedDial}${normalizedPhone}` || normalizedPhone;
      try {
        await this.sendSms(smsTarget || normalizedPhone, message);
      } catch (e) {
        console.error('Vendor SMS sending failed:', e.message || e);
      }

      return res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      console.error('Error sending vendor OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Error sending OTP',
        error: error.message
      });
    }
  }

  async verifyOtp(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { dialCode, phone, otp, deviceOs, deviceName, firebaseToken } = req.body;
      const { normalizedDial, normalizedPhone, vendor } = (await this.findVendorByPhone(dialCode, phone)) || {};

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found. Please contact support.'
        });
      }

      const otpDoc = await Otp.findOne({ dialCode: normalizedDial, phone: normalizedPhone });
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

      const finalDeviceOs = deviceOs || otpDoc.deviceOs;
      const finalDeviceName = deviceName || otpDoc.deviceName;
      const finalFirebaseToken = firebaseToken || otpDoc.firebaseToken;

      await Otp.deleteOne({ _id: otpDoc._id });

      vendor.dialCode = normalizedDial;
      vendor.phone = normalizedPhone;
      if (finalDeviceOs) vendor.deviceOs = finalDeviceOs;
      if (finalDeviceName) vendor.deviceName = finalDeviceName;
      this.manageFirebaseTokens(vendor, finalFirebaseToken);

      await vendor.save();

      const token = this.generateToken(vendor);

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          id: vendor._id,
          ownerName: vendor.ownerName,
          restaurantName: vendor.restaurantName,
          phoneNumber: vendor.phoneNumber,
          dialCode: vendor.dialCode,
          phone: vendor.phone,
          isVerified: vendor.isVerified,
          verificationStatus: vendor.verificationStatus
        },
        token
      });
    } catch (error) {
      console.error('Error verifying vendor OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying OTP',
        error: error.message
      });
    }
  }
}

module.exports = new VendorAuthController();

