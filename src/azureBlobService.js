const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

class AzureBlobService {
  constructor() {
    this.storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
    this.uploadFolder = process.env.AZURE_UPLOAD_FOLDER || 'pdf';
    
    this.blobServiceClient = null;
    this.containerClient = null;
    
    this.init();
  }

  async init() {
    if (!this.storageAccountName || !this.storageAccountKey || !this.containerName) {
      throw new Error('Missing required Azure configuration');
    }

    try {
      console.log('Initializing Azure Blob Service...');
      
      console.log('Environment check:');
      console.log('- AZURE_STORAGE_ACCOUNT_NAME:', this.storageAccountName ? 'SET' : 'MISSING');
      console.log('- AZURE_STORAGE_ACCOUNT_KEY:', this.storageAccountKey ? 'SET' : 'MISSING');
      console.log('- AZURE_BLOB_CONTAINER_NAME:', this.containerName ? 'SET' : 'MISSING');
      console.log('- AZURE_UPLOAD_FOLDER:', this.uploadFolder ? `"${this.uploadFolder}"` : 'NOT SET (will list all blobs)');

      // Vérifier que AZURE_UPLOAD_FOLDER est bien défini
      if (!this.uploadFolder || this.uploadFolder.trim() === '') {
        console.warn('⚠️ AZURE_UPLOAD_FOLDER is not set - this will list ALL blobs in the container!');
      }

      // Create credential using Storage Account Key
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.storageAccountName,
        this.storageAccountKey
      );

      // Create BlobServiceClient
      const accountUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(accountUrl, sharedKeyCredential);
      
      console.log('Azure Blob Service initialized successfully');
      
      // Vérification des permissions du container (en arrière-plan)
      this.verifyContainerPermissions().catch(err => {
        console.warn('Échec de la vérification des permissions:', err.message);
      });
    } catch (error) {
      console.error('Failed to initialize Azure Blob Service:', error);
      throw error;
    }
  }

  async verifyContainerPermissions() {
    try {
      console.log('Vérification des permissions du container...');
      const containerClient = this.getContainerClient();
      
      // Vérifier si le container existe
      const exists = await containerClient.exists();
      console.log('Container existe:', exists);
      
      if (!exists) {
        console.error('❌ Le container n\'existe pas!');
        return;
      }
      
      // Essayer de lister les propriétés du container
      const properties = await containerClient.getProperties();
      console.log('✓ Lecture des propriétés du container réussie');
      console.log('Public Access:', properties.blobPublicAccess || 'none');
      
      // Test de permission d'écriture avec un blob temporaire
      const testBlobName = `${this.uploadFolder || 'test'}/permission-test-${Date.now()}.txt`;
      const testBlobClient = containerClient.getBlockBlobClient(testBlobName);
      
      try {
        await testBlobClient.upload('test', 4);
        console.log('✓ Permission d\'écriture confirmée');
        
        // Nettoyer le blob de test
        await testBlobClient.delete();
        console.log('✓ Permission de suppression confirmée');
      } catch (testError) {
        console.error('❌ Erreur de permission d\'écriture:', testError.message);
        if (testError.statusCode === 403) {
          console.error('❌ La clé d\'accès n\'a pas les permissions d\'écriture sur ce container');
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error.message);
    }
  }

  ensureInitialized() {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Service not initialized');
    }
  }

  getContainerClient() {
    this.ensureInitialized();
    if (!this.containerClient) {
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }
    return this.containerClient;
  }

  getBlobPath(fileName) {
    return this.uploadFolder ? `${this.uploadFolder}/${fileName}` : fileName;
  }

  async listBlobs() {
    this.ensureInitialized();
    try {
      console.log('=== DIAGNOSTIC AZURE BLOB ===');
      console.log('Storage Account:', this.storageAccountName);
      console.log('Container:', this.containerName);
      console.log('Upload Folder:', this.uploadFolder);
      
      const containerClient = this.getContainerClient();
      console.log('Container Client créé, tentative de listage...');
      
      const blobs = [];
      
      // Construction du préfixe avec vérifications
      let prefix = '';
      if (this.uploadFolder && this.uploadFolder.trim() !== '') {
        prefix = this.uploadFolder.trim() + '/';
        console.log(`Préfixe utilisé pour le filtrage: "${prefix}"`);
      } else {
        console.log('Aucun préfixe utilisé - listage de tous les blobs du container');
      }
      
      const listOptions = prefix ? { prefix: prefix } : {};
      console.log('Options de listage:', JSON.stringify(listOptions));
      
      let blobCount = 0;
      
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        blobCount++;
        console.log(`Blob trouvé #${blobCount}: ${blob.name}`);
        
        // Vérification supplémentaire côté client si nécessaire
        if (prefix && !blob.name.startsWith(prefix)) {
          console.log(`  -> Blob ignoré (ne correspond pas au préfixe "${prefix}")`);
          continue;
        }
        
        // Le nom du blob contient déjà le chemin complet (ex: "medias/pdf/document.pdf")
        // On extrait juste le nom du fichier pour l'affichage
        let displayName = blob.name;
        
        // Si on a un préfixe défini, on l'enlève du nom d'affichage
        if (prefix && blob.name.startsWith(prefix)) {
          displayName = blob.name.substring(prefix.length);
        }
        
        // Si il reste des slashes, on prend seulement la dernière partie
        const pathParts = displayName.split('/');
        displayName = pathParts[pathParts.length - 1];
        
        console.log(`  -> Nom complet: ${blob.name}`);
        console.log(`  -> Préfixe retiré: ${displayName}`);
        console.log(`  -> URL générée: ${containerClient.url}/${blob.name}`);
        
        blobs.push({
          name: blob.name,  // Nom complet pour les opérations (ex: "medias/pdf/document.pdf")
          displayName: displayName,  // Nom pour l'affichage (ex: "document.pdf")
          url: `${containerClient.url}/${blob.name}`,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          contentType: blob.properties.contentType
        });
      }
      
      console.log(`Total blobs filtrés trouvés: ${blobs.length}`);
      console.log('=== FIN DIAGNOSTIC ===');
      
      return blobs;
    } catch (error) {
      console.error('Error listing blobs:', error);
      throw new Error(`Failed to list blobs: ${error.message}`);
    }
  }

  async uploadBlob(fileName, buffer, mimeType) {
    this.ensureInitialized();
    try {
      console.log('=== DIAGNOSTIC UPLOAD ===');
      console.log('Nom du fichier:', fileName);
      console.log('Taille du buffer:', buffer.length);
      console.log('Type MIME:', mimeType);
      console.log('Upload folder configuré:', this.uploadFolder);
      
      const containerClient = this.getContainerClient();
      const blobName = this.getBlobPath(fileName);
      console.log('Chemin complet du blob:', blobName);
      console.log('URL du container:', containerClient.url);
      
      const blobClient = containerClient.getBlockBlobClient(blobName);
      console.log('URL du blob:', blobClient.url);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: mimeType
        }
      };

      console.log('Options d\'upload:', JSON.stringify(uploadOptions));
      console.log('Tentative d\'upload...');
      
      const uploadResult = await blobClient.upload(buffer, buffer.length, uploadOptions);
      console.log('Upload réussi! ETag:', uploadResult.etag);

      console.log('Upload réussi! ETag:', uploadResult.etag);
      console.log('=== FIN DIAGNOSTIC UPLOAD ===');

      return {
        name: blobName,
        displayName: fileName,
        url: blobClient.url,
        size: buffer.length,
        contentType: mimeType,
        etag: uploadResult.etag,
        lastModified: uploadResult.lastModified
      };
    } catch (error) {
      console.error('=== ERREUR UPLOAD ===');
      console.error('Erreur détaillée:', error);
      console.error('Code d\'erreur:', error.statusCode);
      console.error('Message d\'erreur:', error.message);
      console.error('Details de la réponse:', error.details);
      if (error.response) {
        console.error('Headers de réponse:', error.response.headers);
      }
      console.error('=== FIN ERREUR UPLOAD ===');
      
      // Afficher un message plus explicite selon le code d'erreur
      let friendlyMessage = error.message;
      if (error.statusCode === 403) {
        friendlyMessage = 'Erreur d\'autorisation (403): Vérifiez la clé d\'accès Azure et les permissions du container';
      } else if (error.statusCode === 404) {
        friendlyMessage = 'Container non trouvé (404): Vérifiez le nom du container';
      } else if (error.statusCode === 409) {
        friendlyMessage = 'Conflit (409): Le blob existe peut-être déjà';
      }
      
      throw new Error(`Failed to upload blob: ${friendlyMessage}`);
    }
  }

  async deleteBlob(blobName) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Check if blob exists first
      const exists = await blobClient.exists();
      if (!exists) {
        throw new Error('Blob not found or already deleted');
      }

      const deleteResult = await blobClient.delete();
      
      return {
        name: blobName,
        deleted: true,
        etag: deleteResult.etag
      };
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw new Error(`Failed to delete blob: ${error.message}`);
    }
  }

  async getBlobProperties(blobName) {
    this.ensureInitialized();
    try {
      const containerClient = this.getContainerClient();
      const blobClient = containerClient.getBlobClient(blobName);
      
      const properties = await blobClient.getProperties();
      
      return {
        name: blobName,
        url: blobClient.url,
        size: properties.contentLength,
        lastModified: properties.lastModified,
        contentType: properties.contentType,
        etag: properties.etag
      };
    } catch (error) {
      console.error('Error getting blob properties:', error);
      throw new Error(`Failed to get blob properties: ${error.message}`);
    }
  }
}

module.exports = new AzureBlobService();