# MHL Media Manager - AI Coding Agent Instructions

## Project Overview

A Node.js web application for managing PDF files in Azure Blob Storage with YouTube video catalog functionality. Built for Azure WebApp Linux deployment via Azure DevOps.

**Key Architecture:**
- Backend: Express.js server ([server.js](../server.js)) with Azure SDK for Blob Storage
- Frontend: Vanilla JavaScript with Bootstrap 5 and DataTables
- Authentication: Azure Storage Account Key (NOT Service Principal despite initial instructions)
- Deployment: Azure WebApp Linux via Azure DevOps pipeline

## Critical Conventions

### Azure Authentication Pattern
**IMPORTANT:** Despite `.github/instructions/instr.instructions.md` mentioning Service Principal, the codebase uses **Storage Account Key** authentication:
```javascript
// In azureBlobService.js and youtubeService.js
const sharedKeyCredential = new StorageSharedKeyCredential(
  this.storageAccountName,
  this.storageAccountKey
);
```
Never suggest switching to Service Principal unless explicitly requested.

### Dual Service Architecture
The app manages TWO distinct data types:
1. **PDF files** - Stored in `{AZURE_UPLOAD_FOLDER}/` subfolder ([azureBlobService.js](../src/azureBlobService.js))
2. **Video catalog** - JSON metadata in `meta/catalog.videos.json` blob ([youtubeService.js](../src/youtubeService.js))
   - Supports both **YouTube** and **Vimeo** videos (platformType: 'youtube' or 'vimeo')
   - Each video has: `platformType`, `videoId` (universal ID), `youtubeId` (backwards compatibility)

Both use the same container but different blob paths. Never mix their API routes.

### Environment Configuration
All Azure credentials MUST be in environment variables (`.env` file):
```env
AZURE_STORAGE_ACCOUNT_NAME=dataakor
AZURE_STORAGE_ACCOUNT_KEY=xxx  # NOT Service Principal
AZURE_BLOB_CONTAINER_NAME=medias
AZURE_UPLOAD_FOLDER=pdf  # Subfolder for PDFs
YOUTUBE_CATALOG_BLOB=meta/catalog.youtube.json  # Legacy name
VIDEO_CATALOG_BLOB=meta/catalog.videos.json     # Preferred (supports YouTube & Vimeo)
YOUTUBE_API_KEY=your-youtube-api-key            # YouTube Data API v3 key (required for auto-fetch)
PLAYER_BASE_URL=https://player.example.com       # External player URL (optional)
ALLOWED_ORIGIN=https://site.com,https://other.com  # For static player CORS
```

## Key Workflows

### Testing Azure Permissions
Run permission verification tests before deploying:
```bash
node tests/test-azure-permissions.js  # Checks read/write/delete on container
node tests/test-upload.js             # Tests file upload flow
node tests/test-youtube-service.js    # Tests YouTube catalog operations
```

### YouTube Catalog Concurrency Control
Uses **ETag-based optimistic locking** to prevent conflicts:
```javascript
// In youtubeService.js - ALWAYS fetch ETag before updates
const { etag, data } = await this.readYoutubeCatalog();
// Modify data...
await this.writeYoutubeCatalog(data, etag);  // Fails if ETag changed
```
Never modify catalog without ETag validation.

### DataTables Integration Pattern
Both PDFs and YouTube videos use DataTables with specific initialization:
```javascript
// In public/js/app.js
this.dataTable = $('#filesTable').DataTable({
  pageLength: 200,  // Always 200 per requirement
  buttons: ['excelHtml5'],  // Export button
  // Column search enabled by default
});
```

### Static Player Deployment
The `static-player/` folder deploys independently to Azure Static Web Apps:
- Update `API_BASE` in [player.js](../static-player/player.js) to backend URL
- Set `PLAYER_BASE_URL` env var in backend to player site URL
- Backend exposes player URL via `/api/config` endpoint
- Backend must allow player origin in `ALLOWED_ORIGIN` env var
- Player supports both YouTube (`youtube-nocookie.com`) and Vimeo (`player.vimeo.com`) with privacy-enhanced embedding
- Automatically detects `platformType` from video data

## Common Pitfalls

### CSP and Security Headers
[server.js](../server.js) disables CSP to allow CDN resources:
```javascript
app.use(helmet({ contentSecurityPolicy: false }));
```
See [docs/CSP_RESOLUTION.md](../docs/CSP_RESOLUTION.md) if security issues arise.

### CORS Configuration
CORS is permissive by default but can be restricted:
- Empty `ALLOWED_ORIGIN` = allow all origins
- Set `ALLOWED_ORIGIN` for production to restrict access
- Required for static player to access backend APIs

### Azure DevOps Pipeline
[azure-pipelines.yml](../azure-pipelines.yml) uses **variable groups** for env vars:
- `AzMHLMediaManagerProduction` (default)
- `AzMHLMediaManagerDev`

Configure these in Azure DevOps Library, NOT in the YAML file.

### File Upload Limitations
Multer configured with specific constraints in [blobRoutes.js](../src/routes/blobRoutes.js):
- Max size: 50MB
- Only PDF files accepted (`application/pdf` mimetype)
- Files stored in `{AZURE_UPLOAD_FOLDER}/` with original filenames

## Key Files Reference

- [server.js](../server.js) - Express app entry point, CORS, helmet config
- [src/azureBlobService.js](../src/azureBlobService.js) - PDF blob operations
- [src/youtubeService.js](../src/youtubeService.js) - YouTube catalog with ETag concurrency
- [public/js/app.js](../public/js/app.js) - Frontend DataTables and API calls
- [docs/](../docs/) - Extensive troubleshooting guides (403 errors, permissions, CORS)
- [tests/](../tests/) - Automated tests for Azure permissions and API endpoints

## Documentation Standards

- Place new guides in `docs/` with descriptive UPPERCASE names
- Follow existing pattern: problem statement → solution → verification steps
- Reference actual code files and line numbers
- Update [README.md](../README.md) if adding features

## When in Doubt

1. Check [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for common issues
2. Run relevant tests in `tests/` to verify Azure connectivity
3. Verify environment variables are set correctly
4. Remember: Storage Account Key authentication, NOT Service Principal
