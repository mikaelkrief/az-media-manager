// ========================================
// CONFIGURATION - Update this with your API base URL
// ========================================
const API_BASE = 'http://localhost:3000'; // Change to your Azure App Service URL in production
// Example: const API_BASE = 'https://your-app.azurewebsites.net';

// ========================================
// Player initialization
// ========================================
(function() {
  'use strict';

  // Get video ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');

  // DOM elements
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const errorMessageEl = document.getElementById('error-message');
  const playerContentEl = document.getElementById('player-content');
  const videoContainerEl = document.getElementById('video-container');
  const videoTitleEl = document.getElementById('video-title');
  const videoDateEl = document.getElementById('video-date');
  const videoTagsEl = document.getElementById('video-tags');
  const videoDescriptionEl = document.getElementById('video-description');

  // ========================================
  // Error handling
  // ========================================
  function showError(message) {
    loadingEl.style.display = 'none';
    errorMessageEl.textContent = message;
    errorEl.style.display = 'block';
  }

  // ========================================
  // Load video data
  // ========================================
  async function loadVideo() {
    if (!videoId) {
      showError('Aucun ID de vidéo spécifié dans l\'URL. Utilisez ?id=VIDEO_ID');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/youtube-videos/${videoId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Vidéo non trouvée');
        }
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.video) {
        throw new Error('Format de réponse invalide');
      }

      // Vérifier si la vidéo est publiée
      if (!data.video.isPublished) {
        showError('Cette vidéo n\'est pas disponible. Elle n\'a pas encore été publiée.');
        return;
      }

      renderVideo(data.video);
    } catch (error) {
      console.error('Error loading video:', error);
      showError(error.message || 'Une erreur est survenue lors du chargement de la vidéo');
    }
  }

  // ========================================
  // Render video player and info
  // ========================================
  function renderVideo(video) {
    const platformType = video.platformType || 'youtube';
    const videoId = video.videoId || video.youtubeId;
    
    let mediaEl;
    if (platformType === 'upload') {
      // Fichier MP4 hébergé dans le blob storage : lecteur HTML5 natif
      mediaEl = document.createElement('video');
      mediaEl.controls = true;
      mediaEl.src = video.fileUrl;
    } else {
      // Create iframe (privacy-enhanced mode)
      mediaEl = document.createElement('iframe');
      mediaEl.title = video.title || 'Video player';
      mediaEl.width = '560';
      mediaEl.height = '315';
      mediaEl.frameBorder = '0';
      mediaEl.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      mediaEl.referrerPolicy = 'strict-origin-when-cross-origin';
      mediaEl.allowFullscreen = true;

      // Set src based on platform
      if (platformType === 'youtube') {
        mediaEl.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      } else if (platformType === 'vimeo') {
        mediaEl.src = `https://player.vimeo.com/video/${videoId}?dnt=1`;
      }
    }
    
    videoContainerEl.innerHTML = '';
    videoContainerEl.appendChild(mediaEl);

    // Set title
    videoTitleEl.textContent = video.title;
    document.title = `${video.title} - Video Player`;

    // Set date
    if (video.createdAt) {
      const date = new Date(video.createdAt);
      videoDateEl.textContent = date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    // Set tags
    if (video.tags && video.tags.length > 0) {
      videoTagsEl.innerHTML = video.tags
        .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join('');
    } else {
      videoTagsEl.innerHTML = '';
    }

    // Set description
    if (video.description) {
      // Convert line breaks to <br> tags
      const descriptionHtml = escapeHtml(video.description).replace(/\n/g, '<br>');
      videoDescriptionEl.innerHTML = descriptionHtml;
    } else {
      videoDescriptionEl.innerHTML = '<em>Aucune description</em>';
    }

    // Show player content
    loadingEl.style.display = 'none';
    playerContentEl.style.display = 'block';
  }

  // ========================================
  // Utility functions
  // ========================================
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ========================================
  // Initialize
  // ========================================
  loadVideo();
})();
