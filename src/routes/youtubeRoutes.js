const express = require('express');
const youtubeService = require('../youtubeService');
const ytdl = require('@distube/ytdl-core');

const router = express.Router();

// GET /api/youtube-videos/info/:youtubeId - Get video info from YouTube (sans API key)
router.get('/info/:youtubeId', async (req, res) => {
  try {
    const { youtubeId } = req.params;
    
    // Construire l'URL YouTube
    const videoUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    
    // Vérifier si l'URL est valide
    if (!ytdl.validateURL(videoUrl)) {
      return res.json({
        success: false,
        error: 'Invalid YouTube video ID'
      });
    }
    
    // Récupérer les informations de la vidéo
    const info = await ytdl.getInfo(videoUrl);
    const videoDetails = info.videoDetails;
    
    res.json({
      success: true,
      info: {
        title: videoDetails.title,
        description: videoDetails.description,
        thumbnails: videoDetails.thumbnails,
        channelTitle: videoDetails.author.name,
        duration: videoDetails.lengthSeconds
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

module.exports = router;
