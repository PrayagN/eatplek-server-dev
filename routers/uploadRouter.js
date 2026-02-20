const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadSingleImage } = require('../documents/upload.middleware');
const { uploadImageValidation } = require('../validations/upload.validations');

router.post(
  '/image',
  uploadSingleImage('image'),
  uploadImageValidation,
  uploadController.uploadImage
);

module.exports = router;

