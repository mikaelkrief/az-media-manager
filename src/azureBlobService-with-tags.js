const { BlobServiceClient } = require('@azure/storage-blob');
const { ClientSecretCredential } = require('@azure/identity');

class AzureBlobService {
  constructor() {
    this.blobServiceClient = null;
    this.containerName = null;
    this.uploadFolder = null;
    this.initialized = false;
  }

  initializeClient() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Azure Blob Service...');
      
      // Debug: print environment variables (without secrets)
      console.log('Environment check:');
      console.log('- AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'SET' : 'NOT SET');
      console.log('- AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('- AZURE_CLIENT_SECRET:', process.env.AZURE_CLIENT_SECRET ? 'SET' : 'NOT SET');
      console.log('- AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'SET' : 'NOT SET');
      console.log('- AZURE_BLOB_CONTAINER_NAME:', process.env.AZURE_BLOB_CONTAINER_NAME ? 'SET' : 'NOT SET');
      
      // Validate required environment variables
      const requiredEnvVars = [
        'AZURE_STORAGE_ACCOUNT_NAME',
        'AZURE_CLIENT_ID',
        'AZURE_CLIENT_SECRET',
        'AZURE_TENANT_ID',
        'AZURE_BLOB_CONTAINER_NAME'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      // Create credential using Service Principal
      const credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID,
        process.env.AZURE_CLIENT_ID,
        process.env.AZURE_CLIENT_SECRET
      );

      // Create BlobServiceClient
      const accountUrl = `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
      
      this.containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
      this.uploadFolder = process.env.AZURE_UPLOAD_FOLDER || '';
      
      this.initialized = true;
      console.log('Azure Blob Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure Blob Service:', error.message);
      throw error;
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.initializeClient();
    }
  }

  getContainerClient() {
    this.ensureInitialized();
    return this.blobServiceClient.getContainerClient(this.containerName);
  }

  getBlobPath(fileName) {
    this.ensureInitialized();
    return this.uploadFolder ? `${this.uploadFolder}/${fileName}` : fileName;
  }

  async listBlobs() {
    this.ensureInitialized();
    try {
      console.log('=== DIAGNOSTIC AZURE BLOB ===');
      console.log('Storage Account:', process.env.AZURE_STORAGE_ACCOUNT_NAME);
      console.log('Container:', this.containerName);
      console.log('Upload Folder:', this.uploadFolder);
      
      const containerClient = this.getContainerClient();
      console.log('Container Client créé, tentative de listage...');
      
      // Approche simplifiée sans options complexes
      const blobs = [];
      
      try {
        // Test 1: Listage simple sans options
        console.log('Test 1: Listage simple...');
        let blobCount = 0;
        for await (const blob of containerClient.listBlobsFlat()) {
          blobCount++;
          console.log(`Blob trouvé #${blobCount}:`, blob.name);
          
          // Filtrer par dossier côté client si nécessaire
          if (this.uploadFolder && !blob.name.startsWith(this.uploadFolder + '/')) {
            continue;
          }
          
          // Skip if it's just the folder path
          if (blob.name === this.uploadFolder + '/') continue;
          
          const blobClient = containerClient.getBlobClient(blob.name);
          
          // Récupérer les tags séparément si nécessaire
          let tags = {};
          try {
            const tagsResult = await blobClient.getTags();
            tags = tagsResult.tags || {};
          } catch (tagError) {
            console.log('Tags non récupérables pour', blob.name, ':', tagError.message);
          }
          
          blobs.push({
            name: blob.name,
            displayName: this.uploadFolder ? blob.name.replace(`${this.uploadFolder}/`, '') : blob.name,
            url: blobClient.url,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
            contentType: blob.properties.contentType,
            tags: tags,
            metadata: blob.metadata || {}
          });
          
          // Limiter pour test
          if (blobCount >= 10) break;
        }
        
        console.log(`Total blobs trouvés: ${blobs.length}`);
        console.log('=== FIN DIAGNOSTIC ===');
        
        return blobs;
        
      } catch (listError) {
        console.error('Erreur lors du listage:', listError);
        
        // Test 2: Essayer avec des options différentes
        console.log('Test 2: Listage avec préfixe seulement...');
        const simpleOptions = {};
        if (this.uploadFolder) {
          simpleOptions.prefix = `${this.uploadFolder}/`;
        }
        
        for await (const blob of containerClient.listBlobsFlat(simpleOptions)) {
          console.log('Blob avec préfixe:', blob.name);
          
          const blobClient = containerClient.getBlobClient(blob.name);
          blobs.push({
            name: blob.name,
            displayName: this.uploadFolder ? blob.name.replace(`${this.uploadFolder}/`, '') : blob.name,
            url: blobClient.url,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
            contentType: blob.properties.contentType,
            tags: {},
            metadata: {}
          });
        }
        
        return blobs;
      }
    } catch (error) {
      console.error('Error listing blobs:', error);
      throw new Error(`Failed to list blobs: ${error.message}`);
    }
  }

  async uploadBlob(fileName, fileBuffer, contentType) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobPath = this.getBlobPath(fileName);
      const blobClient = containerClient.getBlockBlobClient(blobPath);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType
        },
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: fileName
        }
      };

      const uploadResult = await blobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
      
      return {
        name: blobPath,
        displayName: fileName,
        url: blobClient.url,
        etag: uploadResult.etag,
        lastModified: uploadResult.lastModified
      };
    } catch (error) {
      console.error('Error uploading blob:', error);
      throw new Error(`Failed to upload blob: ${error.message}`);
    }
  }

  async deleteBlob(blobName) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      const deleteResult = await blobClient.deleteIfExists();
      
      if (!deleteResult.succeeded) {
        throw new Error('Blob not found or already deleted');
      }
      
      return { success: true, message: 'Blob deleted successfully' };
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw new Error(`Failed to delete blob: ${error.message}`);
    }
  }

  async getBlobTags(blobName) {
    this.ensureInitialized();
    try {
      // Comme nous n'avons pas les permissions pour getTags individuellement,
      // nous devons récupérer les tags depuis les métadonnées
      console.log(`Récupération des tags pour: ${blobName}`);
      
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Essayer d'abord d'obtenir les tags directement (si les permissions le permettent)
      try {
        const tagsResult = await blobClient.getTags();
        console.log(`Tags Azure natifs récupérés pour ${blobName}:`, tagsResult.tags);
        return tagsResult.tags || {};
      } catch (directError) {
        console.log(`Impossible de récupérer les tags Azure natifs pour ${blobName}:`, directError.message);
        
        // Fallback: récupérer depuis les métadonnées
        try {
          const properties = await blobClient.getProperties();
          console.log(`Propriétés récupérées pour ${blobName}:`, properties.metadata);
          
          // Convertir les métadonnées préfixées en tags
          const tags = {};
          if (properties.metadata) {
            Object.keys(properties.metadata).forEach(key => {
              if (key.startsWith('tag_')) {
                const tagKey = key.substring(4); // Enlever le préfixe 'tag_'
                tags[tagKey] = properties.metadata[key];
              }
            });
          }
          
          console.log(`Tags récupérés depuis les métadonnées pour ${blobName}:`, tags);
          return tags;
        } catch (metadataError) {
          console.log(`Impossible de récupérer les métadonnées pour ${blobName}:`, metadataError.message);
          return {};
        }
      }
    } catch (error) {
      console.error('Error getting blob tags:', error);
      // Retourner un objet vide plutôt que de lever une erreur
      console.log(`Retour d'un objet vide pour les tags de ${blobName}`);
      return {};
    }
  }

  async setBlobTags(blobName, tags) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Validate tags (Azure has limitations)
      const validatedTags = {};
      Object.keys(tags).forEach(key => {
        if (key.length <= 128 && tags[key].toString().length <= 256) {
          validatedTags[key] = tags[key].toString();
        }
      });
      
      console.log(`Tentative de définition des tags pour ${blobName}:`, validatedTags);
      
      try {
        // Essayer d'utiliser les tags Azure natifs
        await blobClient.setTags(validatedTags);
        console.log(`Tags Azure natifs définis avec succès pour ${blobName}`);
        return { success: true, tags: validatedTags, method: 'azure-tags' };
      } catch (tagsError) {
        console.log(`Impossible d'utiliser les tags Azure natifs pour ${blobName}:`, tagsError.message);
        
        // Fallback: utiliser les métadonnées
        try {
          const metadata = {};
          Object.keys(validatedTags).forEach(key => {
            // Préfixer les clés pour éviter les conflits avec les métadonnées système
            metadata[`tag_${key}`] = validatedTags[key];
          });
          
          await blobClient.setMetadata(metadata);
          console.log(`Métadonnées définies avec succès pour ${blobName}:`, metadata);
          return { success: true, tags: validatedTags, method: 'metadata' };
        } catch (metadataError) {
          console.error(`Erreur lors de la définition des métadonnées pour ${blobName}:`, metadataError);
          throw metadataError;
        }
      }
    } catch (error) {
      console.error('Error setting blob tags:', error);
      throw new Error(`Failed to set blob tags: ${error.message}`);
    }
  }

  async getBlobProperties(blobName) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      const properties = await blobClient.getProperties();
      const tags = await this.getBlobTags(blobName);
      
      return {
        name: blobName,
        url: blobClient.url,
        size: properties.contentLength,
        lastModified: properties.lastModified,
        contentType: properties.contentType,
        etag: properties.etag,
        tags: tags,
        metadata: properties.metadata || {}
      };
    } catch (error) {
      console.error('Error getting blob properties:', error);
      throw new Error(`Failed to get blob properties: ${error.message}`);
    }
  }
}

module.exports = new AzureBlobService();