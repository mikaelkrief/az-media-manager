const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const youtubeService = require('../youtubeService');
const azureBlobService = require('../azureBlobService');
const fetch = require('node-fetch');

const router = express.Router();

// Configure multer for MP4 video uploads (stored in memory then streamed to Azure Blob Storage)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 files are allowed'), false);
    }
  }
});

// GET /api/youtube-videos/info/:youtubeId - Get video info from YouTube Data API v3
router.get('/info/:youtubeId', async (req, res) => {
  try {
    const { youtubeId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    // Vérifier que la clé API est configurée
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'YouTube API key not configured. Set YOUTUBE_API_KEY in environment variables.'
      });
    }
    
    // Appeler l'API YouTube Data v3
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${youtubeId}&key=${apiKey}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Vérifier si la vidéo existe
    if (!data.items || data.items.length === 0) {
      return res.json({
        success: false,
        error: 'Video not found or is private'
      });
    }
    
    const video = data.items[0];
    const snippet = video.snippet;
    
    res.json({
      success: true,
      info: {
        title: snippet.title,
        description: snippet.description,
        thumbnails: snippet.thumbnails,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt
      }
    });
  } catch (error) {
    console.error('Error fetching YouTube info:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch video information'
    });
  }
});

// POST /api/youtube-videos/upload - Upload an MP4 file to Blob Storage and register it in the catalog
router.post('/upload', videoUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { title, description, isPublished } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }

    const tags = req.body.tags
      ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(t => t.trim()).filter(t => t.length > 0))
      : [];

    const { originalname, buffer, mimetype } = req.file;
    const videoFolder = process.env.AZURE_VIDEO_UPLOAD_FOLDER || 'video';
    // Prefix with a unique id to avoid collisions with existing blobs/catalog entries
    const blobFileName = `${uuidv4()}-${originalname}`;

    const uploadResult = await azureBlobService.uploadBlob(blobFileName, buffer, mimetype, videoFolder);

    const newVideo = await youtubeService.createVideo({
      platformType: 'upload',
      videoId: uploadResult.name,
      fileUrl: uploadResult.url,
      title,
      description: description || '',
      tags,
      isPublished: isPublished === 'true' || isPublished === true
    });

    res.status(201).json({
      success: true,
      message: 'Vidéo uploadée avec succès',
      video: newVideo
    });
  } catch (error) {
    console.error('Error in POST /api/youtube-videos/upload:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/youtube-videos - List all videos (with optional filters)
router.get('/', async (req, res) => {
  try {
    const filters = {};
    
    // Parse query parameters
    if (req.query.isPublished !== undefined) {
      filters.isPublished = req.query.isPublished === 'true';
    }
    
    if (req.query.tags) {
      filters.tags = Array.isArray(req.query.tags) 
        ? req.query.tags 
        : req.query.tags.split(',').map(t => t.trim());
    }
    
    const videos = await youtubeService.listVideos(filters);
    
    res.json({
      success: true,
      count: videos.length,
      videos: videos
    });
  } catch (error) {
    console.error('Error in GET /api/youtube-videos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/youtube-videos/:id - Get a single video by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = await youtubeService.getVideo(id);
    
    res.json({
      success: true,
      video: video
    });
  } catch (error) {
    console.error('Error in GET /api/youtube-videos/:id:', error);
    
    if (error.message === 'VIDEO_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/youtube-videos - Create a new video entry
router.post('/', async (req, res) => {
  try {
    const { youtubeId, title, description, tags, isPublished } = req.body;
    
    // Validate required fields
    if (!youtubeId || !title) {
      return res.status(400).json({
        success: false,
        error: 'youtubeId and title are required'
      });
    }
    
    const videoData = {
      youtubeId,
      title,
      description: description || '',
      tags: Array.isArray(tags) ? tags : [],
      isPublished: isPublished !== undefined ? isPublished : false
    };
    
    const newVideo = await youtubeService.createVideo(videoData);
    
    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      video: newVideo
    });
  } catch (error) {
    console.error('Error in POST /api/youtube-videos:', error);
    
    if (error.message.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({
        success: false,
        error: error.message.replace('VALIDATION_ERROR: ', '')
      });
    }
    
    if (error.message.startsWith('DUPLICATE_VIDEO')) {
      return res.status(409).json({
        success: false,
        error: error.message.replace('DUPLICATE_VIDEO: ', '')
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/youtube-videos/:id - Update an existing video
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    // Extract allowed update fields
    const allowedFields = ['youtubeId', 'title', 'description', 'tags', 'isPublished'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    const updatedVideo = await youtubeService.updateVideo(id, updates);
    
    res.json({
      success: true,
      message: 'Video updated successfully',
      video: updatedVideo
    });
  } catch (error) {
    console.error('Error in PUT /api/youtube-videos/:id:', error);
    
    if (error.message === 'VIDEO_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/youtube-videos/:id/publish - Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    if (isPublished === undefined) {
      return res.status(400).json({
        success: false,
        error: 'isPublished field is required'
      });
    }
    
    const updatedVideo = await youtubeService.updateVideo(id, { isPublished });
    
    res.json({
      success: true,
      message: `Video ${isPublished ? 'published' : 'unpublished'} successfully`,
      video: updatedVideo
    });
  } catch (error) {
    console.error('Error in PATCH /api/youtube-videos/:id/publish:', error);
    
    if (error.message === 'VIDEO_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/youtube-videos/:id - Delete a video
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await youtubeService.deleteVideo(id);
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/youtube-videos/:id:', error);
    
    if (error.message === 'VIDEO_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware for multer (MP4 upload)
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 1GB.'
      });
    }
  }

  if (error.message === 'Only MP4 files are allowed') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next(error);
});

module.exports = router;
