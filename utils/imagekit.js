const ImageKit = require('imagekit');
const sharp = require('sharp');

/**
 * Initialize ImageKit instance
 */
const imagekit = new ImageKit({
  publicKey: "public_a4Cy2UwFoKgCZcjXvj+ylK88Y8c=",
  privateKey: "private_Z0rtpRz/IV978UvWezMsexl18WM=",
  urlEndpoint: "https://ik.imagekit.io/eatplek"
});

/**
 * Resize image buffer to specified dimensions
 * @param {Buffer} fileBuffer - Original image buffer
 * @param {Number} width - Target width in pixels
 * @param {Number} height - Target height in pixels
 * @returns {Promise<Buffer>} Resized image buffer
 */
const resizeImage = async (fileBuffer, options = {}) => {
  const { width, height, quality, format } = options;
  try {
    let transformer = sharp(fileBuffer);

    if (width || height) {
      transformer = transformer.resize(width || null, height || null, {
        fit: 'cover',
        position: 'center'
      });
    }

    const fmt = format ? format.toLowerCase() : null;
    const qualityValue = quality ? Math.min(Math.max(parseInt(quality, 10), 1), 100) : null;

    if (fmt && ['jpeg', 'jpg', 'png', 'webp'].includes(fmt)) {
      if (fmt === 'jpg') {
        transformer = transformer.toFormat('jpeg', qualityValue ? { quality: qualityValue } : {});
      } else if (fmt === 'png') {
        if (qualityValue) {
          const compressionLevel = Math.round((100 - qualityValue) / 11); // approx map 0-100 to 0-9
          transformer = transformer.png({ compressionLevel });
        } else {
          transformer = transformer.png();
        }
      } else {
        transformer = transformer.toFormat(fmt, qualityValue ? { quality: qualityValue } : {});
      }
    } else if (qualityValue) {
      const metadata = await transformer.metadata();
      switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
          transformer = transformer.jpeg({ quality: qualityValue });
          break;
        case 'png':
          transformer = transformer.png({ compressionLevel: Math.round((100 - qualityValue) / 11) });
          break;
        case 'webp':
          transformer = transformer.webp({ quality: qualityValue });
          break;
        default:
          // Unsupported quality adjustment; continue without changes
          break;
      }
    }

    return await transformer.toBuffer();
  } catch (error) {
    console.error('Image resize error:', error);
    throw new Error(`Failed to resize image: ${error.message}`);
  }
};

/**
 * Upload file to ImageKit
 * @param {Buffer} fileBuffer - File buffer data
 * @param {String} fileName - Original file name
 * @param {String} folder - Folder path in ImageKit (optional)
 * @param {Object} resizeOptions - Resize options {width, height} (optional)
 * @returns {Promise<Object>} ImageKit upload response
 */
const uploadFile = async (fileBuffer, fileName, folder = 'categories', resizeOptions = null) => {
  try {
    let processedBuffer = fileBuffer;
    
    // Resize image if dimensions are provided
    if (resizeOptions && (resizeOptions.width || resizeOptions.height || resizeOptions.quality || resizeOptions.format)) {
      processedBuffer = await resizeImage(fileBuffer, resizeOptions);
    }
    
    const uploadResponse = await imagekit.upload({
      file: processedBuffer,
      fileName: fileName,
      folder: `/${folder}`,
      useUniqueFileName: true
    });

    return {
      success: true,
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      name: uploadResponse.name,
      size: uploadResponse.size,
      fileType: uploadResponse.fileType
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error(`Failed to upload file to ImageKit: ${error.message}`);
  }
};

/**
 * Delete file from ImageKit
 * @param {String} fileId - ImageKit file ID
 * @returns {Promise<Object>} ImageKit delete response
 */
const deleteFile = async (fileId) => {
  try {
    const deleteResponse = await imagekit.deleteFile(fileId);
    return {
      success: true,
      message: 'File deleted successfully',
      data: deleteResponse
    };
  } catch (error) {
    console.error('ImageKit delete error:', error);
    throw new Error(`Failed to delete file from ImageKit: ${error.message}`);
  }
};

/**
 * Get file details from ImageKit
 * @param {String} fileId - ImageKit file ID
 * @returns {Promise<Object>} File details
 */
const getFileDetails = async (fileId) => {
  try {
    const fileDetails = await imagekit.getFileDetails(fileId);
    return {
      success: true,
      data: fileDetails
    };
  } catch (error) {
    console.error('ImageKit get file details error:', error);
    throw new Error(`Failed to get file details: ${error.message}`);
  }
};

module.exports = {
  imagekit,
  uploadFile,
  deleteFile,
  getFileDetails
};

