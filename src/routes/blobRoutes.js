const express = require('express');
const multer = require('multer');
const path = require('path');
const azureBlobService = require('../azureBlobService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET /api/blobs - List all blobs
router.get('/', async (req, res) => {
  try {
    const blobs = await azureBlobService.listBlobs();
    
    res.json({
      success: true,
      count: blobs.length,
      files: blobs
    });
  } catch (error) {
    console.error('Error in GET /api/blobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/blobs - Upload a new blob
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { originalname, buffer, mimetype } = req.file;
    
    // Generate unique filename if file already exists
    let fileName = originalname;
    const timestamp = Date.now();
    const extension = path.extname(originalname);
    const baseName = path.basename(originalname, extension);
    
    // Check if file already exists
    try {
      await azureBlobService.getBlobProperties(azureBlobService.getBlobPath(fileName));
      // File exists, add timestamp
      fileName = `${baseName}_${timestamp}${extension}`;
    } catch (error) {
      // File doesn't exist, use original name
    }

    const uploadResult = await azureBlobService.uploadBlob(fileName, buffer, mimetype);
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    console.error('Error in POST /api/blobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/blobs/:blobName - Delete a blob
router.delete('/:blobName(*)', async (req, res) => {
  try {
    const { blobName } = req.params;
    const deleteResult = await azureBlobService.deleteBlob(decodeURIComponent(blobName));
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      data: deleteResult
    });
  } catch (error) {
    console.error('Error in DELETE /api/blobs/:blobName:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.'
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
});

module.exports = router;