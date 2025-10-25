const express = require('express');
const multer = require('multer');
const azureBlobService = require('../azureBlobService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
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
      data: blobs,
      count: blobs.length
    });
  } catch (error) {
    console.error('Error in GET /api/blobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/blobs/:blobName - Get specific blob details
router.get('/:blobName(*)', async (req, res) => {
  try {
    const { blobName } = req.params;
    const blobDetails = await azureBlobService.getBlobProperties(decodeURIComponent(blobName));
    
    res.json({
      success: true,
      data: blobDetails
    });
  } catch (error) {
    console.error('Error in GET /api/blobs/:blobName:', error);
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
        error: 'No file provided'
      });
    }

    const { originalname, buffer, mimetype } = req.file;
    
    // Generate unique filename if file already exists
    let fileName = originalname;
    const timestamp = Date.now();
    const baseName = fileName.replace(/\.pdf$/i, '');
    const extension = '.pdf';
    
    // Check if we need to add timestamp
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

// GET /api/blobs/:blobName/tags - Get blob tags
router.get('/:blobName(*)/tags', async (req, res) => {
  try {
    const { blobName } = req.params;
    const tags = await azureBlobService.getBlobTags(decodeURIComponent(blobName));
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error in GET /api/blobs/:blobName/tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/blobs/:blobName/tags - Set blob tags
router.put('/:blobName(*)/tags', async (req, res) => {
  try {
    const { blobName } = req.params;
    const { tags } = req.body;
    
    if (!tags || typeof tags !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Tags must be provided as an object'
      });
    }
    
    const result = await azureBlobService.setBlobTags(decodeURIComponent(blobName), tags);
    
    res.json({
      success: true,
      message: 'Tags updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in PUT /api/blobs/:blobName/tags:', error);
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
      error: 'Only PDF files are allowed.'
    });
  }
  
  next(error);
});

module.exports = router;