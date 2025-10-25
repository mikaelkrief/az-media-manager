const { BlobServiceClient } = require('@azure/storage-blob');
const { ClientSecretCredential } = require('@azure/identity');

class AzureBlobService {
  constructor() {
    this.storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
    this.uploadFolder = process.env.AZURE_BLOB_UPLOAD_FOLDER || 'pdf';
    
    this.tenantId = process.env.AZURE_TENANT_ID;
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    this.blobServiceClient = null;
    this.containerClient = null;
    
    this.init();
  }

  init() {
    if (!this.storageAccountName || !this.containerName || !this.clientId || !this.clientSecret || !this.tenantId) {
      throw new Error('Missing required Azure configuration');
    }

    try {
      console.log('Initializing Azure Blob Service...');
      
      console.log('Environment check:');
      console.log('- AZURE_STORAGE_ACCOUNT_NAME:', this.storageAccountName ? 'SET' : 'MISSING');
      console.log('- AZURE_CLIENT_ID:', this.clientId ? 'SET' : 'MISSING');
      console.log('- AZURE_CLIENT_SECRET:', this.clientSecret ? 'SET' : 'MISSING');
      console.log('- AZURE_TENANT_ID:', this.tenantId ? 'SET' : 'MISSING');
      console.log('- AZURE_BLOB_CONTAINER_NAME:', this.containerName ? 'SET' : 'MISSING');

      // Create credential using Service Principal
      const credential = new ClientSecretCredential(
        this.tenantId,
        this.clientId,
        this.clientSecret
      );

      // Create BlobServiceClient
      const accountUrl = `https://${this.storageAccountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
      
      console.log('Azure Blob Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure Blob Service:', error);
      throw error;
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
      const listOptions = {
        prefix: this.uploadFolder + '/'
      };
      
      console.log('Test 1: Listage simple...');
      let blobCount = 0;
      
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        blobCount++;
        console.log(`Blob trouvé #${blobCount}: ${blob.name}`);
        
        blobs.push({
          name: blob.name,
          displayName: blob.name.split('/').pop(),
          url: `${containerClient.url}/${blob.name}`,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          contentType: blob.properties.contentType
        });
      }
      
      console.log(`Total blobs trouvés: ${blobCount}`);
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
      const containerClient = this.getContainerClient();
      const blobName = this.getBlobPath(fileName);
      const blobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: mimeType
        }
      };

      const uploadResult = await blobClient.upload(buffer, buffer.length, uploadOptions);

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
      console.error('Error uploading blob:', error);
      throw new Error(`Failed to upload blob: ${error.message}`);
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