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
    // Create YouTube iframe (privacy-enhanced mode)
    // Format identique à l'embed YouTube officiel
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1`;
    iframe.title = video.title || 'YouTube video player';
    iframe.width = '560';
    iframe.height = '315';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    
    videoContainerEl.innerHTML = '';
    videoContainerEl.appendChild(iframe);

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
