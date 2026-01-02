const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

class YoutubeService {
  constructor() {
    this.storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
    this.catalogBlobName = process.env.YOUTUBE_CATALOG_BLOB || 'meta/catalog.youtube.json';
    
    this.blobServiceClient = null;
    this.containerClient = null;
    
    this.init();
  }

  async init() {
    if (!this.storageAccountName || !this.storageAccountKey || !this.containerName) {
      throw new Error('Missing required Azure configuration for YouTube service');
    }

    try {
      console.log('Initializing YouTube Catalog Service...');
      
      // Create credential using Storage Account Key
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.storageAccountName,
        this.storageAccountKey
      );

      // Create BlobServiceClient
      const accountUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(accountUrl, sharedKeyCredential);
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      console.log('YouTube Catalog Service initialized successfully');
      console.log('Catalog blob name:', this.catalogBlobName);
      
      // Ensure catalog exists
      await this.ensureYoutubeCatalogExists();
    } catch (error) {
      console.error('Failed to initialize YouTube Catalog Service:', error);
      throw error;
    }
  }

  /**
   * Ensure the YouTube catalog file exists in blob storage
   */
  async ensureYoutubeCatalogExists() {
    try {
      const blobClient = this.containerClient.getBlockBlobClient(this.catalogBlobName);
      const exists = await blobClient.exists();
      
      if (!exists) {
        console.log('Creating initial YouTube catalog...');
        const initialCatalog = {
          version: 1,
          updatedAt: new Date().toISOString(),
          items: []
        };
        
        const content = JSON.stringify(initialCatalog, null, 2);
        await blobClient.upload(content, content.length, {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          }
        });
        
        console.log('YouTube catalog created successfully');
      }
    } catch (error) {
      console.error('Error ensuring YouTube catalog exists:', error);
      throw error;
    }
  }

  /**
   * Read the YouTube catalog with ETag for concurrency control
   * @returns {Promise<{etag: string, data: Object}>}
   */
  async readYoutubeCatalog() {
    try {
      const blobClient = this.containerClient.getBlockBlobClient(this.catalogBlobName);
      const downloadResponse = await blobClient.download(0);
      const etag = downloadResponse.etag;
      
      // Read the blob content
      const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody);
      const data = JSON.parse(downloaded.toString('utf-8'));
      
      return { etag, data };
    } catch (error) {
      console.error('Error reading YouTube catalog:', error);
      throw error;
    }
  }

  /**
   * Write the YouTube catalog with ETag matching for concurrency control
   * @param {Object} data - The catalog data to write
   * @param {string} etag - The ETag to match (for concurrency control)
   */
  async writeYoutubeCatalogIfMatch(data, etag) {
    try {
      const blobClient = this.containerClient.getBlockBlobClient(this.catalogBlobName);
      
      // Update the updatedAt timestamp
      data.updatedAt = new Date().toISOString();
      
      const content = JSON.stringify(data, null, 2);
      
      // Upload with If-Match condition
      await blobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        },
        conditions: {
          ifMatch: etag
        }
      });
      
      console.log('YouTube catalog updated successfully');
    } catch (error) {
      if (error.statusCode === 412) {
        // Precondition failed - concurrent modification detected
        throw new Error('CONCURRENT_MODIFICATION: The catalog was modified by another request. Please retry.');
      }
      console.error('Error writing YouTube catalog:', error);
      throw error;
    }
  }

  /**
   * Atomically update the YouTube catalog with automatic retry on concurrent modification
   * @param {Function} mutatorFn - Function that receives the catalog data and returns modified data
   * @param {number} retries - Number of retries on concurrent modification (default: 3)
   */
  async updateYoutubeCatalogAtomic(mutatorFn, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Read current catalog with ETag
        const { etag, data } = await this.readYoutubeCatalog();
        
        // Apply mutation
        const modifiedData = await mutatorFn(data);
        
        // Try to write with ETag matching
        await this.writeYoutubeCatalogIfMatch(modifiedData, etag);
        
        return modifiedData;
      } catch (error) {
        if (error.message.startsWith('CONCURRENT_MODIFICATION') && attempt < retries) {
          console.log(`Concurrent modification detected, retrying... (attempt ${attempt + 1}/${retries})`);
          // Wait a bit before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to update catalog after maximum retries due to concurrent modifications');
  }

  /**
   * List all videos (optionally filter by published status or tags)
   * @param {Object} filters - Optional filters {isPublished: boolean, tags: string[]}
   * @returns {Promise<Array>}
   */
  async listVideos(filters = {}) {
    try {
      const { data } = await this.readYoutubeCatalog();
      let videos = data.items || [];
      
      // Filter by published status if specified
      if (filters.isPublished !== undefined) {
        videos = videos.filter(v => v.isPublished === filters.isPublished);
      }
      
      // Filter by tags if specified
      if (filters.tags && filters.tags.length > 0) {
        videos = videos.filter(v => 
          v.tags && v.tags.some(tag => filters.tags.includes(tag))
        );
      }
      
      // Sort by creation date (newest first)
      videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return videos;
    } catch (error) {
      console.error('Error listing videos:', error);
      throw error;
    }
  }

  /**
   * Get a single video by ID
   * @param {string} id - The video ID
   * @returns {Promise<Object>}
   */
  async getVideo(id) {
    try {
      const { data } = await this.readYoutubeCatalog();
      const video = data.items.find(v => v.id === id);
      
      if (!video) {
        throw new Error('VIDEO_NOT_FOUND');
      }
      
      return video;
    } catch (error) {
      console.error('Error getting video:', error);
      throw error;
    }
  }

  /**
   * Create a new video entry
   * @param {Object} videoData - {youtubeId, title, description, tags, isPublished}
   * @returns {Promise<Object>}
   */
  async createVideo(videoData) {
    try {
      const newVideo = {
        id: uuidv4(),
        youtubeId: videoData.youtubeId,
        title: videoData.title,
        description: videoData.description || '',
        tags: videoData.tags || [],
        createdAt: new Date().toISOString(),
        isPublished: videoData.isPublished !== undefined ? videoData.isPublished : false
      };
      
      // Validate required fields
      if (!newVideo.youtubeId || !newVideo.title) {
        throw new Error('VALIDATION_ERROR: youtubeId and title are required');
      }
      
      // Update catalog atomically
      await this.updateYoutubeCatalogAtomic(catalog => {
        // Check for duplicate youtubeId
        const exists = catalog.items.some(v => v.youtubeId === videoData.youtubeId);
        if (exists) {
          throw new Error('DUPLICATE_VIDEO: A video with this YouTube ID already exists');
        }
        
        catalog.items.push(newVideo);
        return catalog;
      });
      
      console.log('Video created successfully:', newVideo.id);
      return newVideo;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  /**
   * Update an existing video entry
   * @param {string} id - The video ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateVideo(id, updates) {
    try {
      let updatedVideo = null;
      
      await this.updateYoutubeCatalogAtomic(catalog => {
        const index = catalog.items.findIndex(v => v.id === id);
        
        if (index === -1) {
          throw new Error('VIDEO_NOT_FOUND');
        }
        
        // Apply updates (don't allow changing id or createdAt)
        const allowedFields = ['youtubeId', 'title', 'description', 'tags', 'isPublished'];
        allowedFields.forEach(field => {
          if (updates[field] !== undefined) {
            catalog.items[index][field] = updates[field];
          }
        });
        
        updatedVideo = catalog.items[index];
        return catalog;
      });
      
      console.log('Video updated successfully:', id);
      return updatedVideo;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  /**
   * Delete a video entry
   * @param {string} id - The video ID
   * @returns {Promise<void>}
   */
  async deleteVideo(id) {
    try {
      await this.updateYoutubeCatalogAtomic(catalog => {
        const index = catalog.items.findIndex(v => v.id === id);
        
        if (index === -1) {
          throw new Error('VIDEO_NOT_FOUND');
        }
        
        catalog.items.splice(index, 1);
        return catalog;
      });
      
      console.log('Video deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  /**
   * Helper function to convert stream to buffer
   */
  async streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
}

// Export singleton instance
module.exports = new YoutubeService();
