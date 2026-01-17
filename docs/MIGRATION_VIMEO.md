# Guide de migration - Support Vimeo

## Objectif

Ce guide explique comment migrer les données existantes de l'ancien format (YouTube uniquement) vers le nouveau format (YouTube + Vimeo).

## Changements de structure

### Avant (v1 - YouTube uniquement)
```json
{
  "version": 1,
  "updatedAt": "2026-01-17T...",
  "items": [
    {
      "id": "uuid",
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Titre",
      "description": "...",
      "tags": ["tag1"],
      "createdAt": "2026-01-17T...",
      "isPublished": true
    }
  ]
}
```

### Après (v2 - YouTube + Vimeo)
```json
{
  "version": 2,
  "updatedAt": "2026-01-17T...",
  "items": [
    {
      "id": "uuid",
      "platformType": "youtube",
      "videoId": "dQw4w9WgXcQ",
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Titre",
      "description": "...",
      "tags": ["tag1"],
      "createdAt": "2026-01-17T...",
      "isPublished": true
    },
    {
      "id": "uuid",
      "platformType": "vimeo",
      "videoId": "123456789",
      "title": "Titre Vimeo",
      "description": "...",
      "tags": ["tag2"],
      "createdAt": "2026-01-17T...",
      "isPublished": true
    }
  ]
}
```

## Migration automatique

**Bonne nouvelle !** La migration est **automatique** et **transparente** :

1. Les vidéos YouTube existantes continuent de fonctionner sans modification
2. Lors de la première édition, `platformType: 'youtube'` et `videoId` seront ajoutés automatiquement
3. Le champ `youtubeId` est conservé pour la rétrocompatibilité
4. Aucun script de migration n'est nécessaire

## Migration manuelle (optionnelle)

Si vous souhaitez forcer la migration immédiatement, voici un script Node.js :

```javascript
// migrate-catalog.js
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
require('dotenv').config();

async function migrateCatalog() {
  // Configuration
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
  const catalogBlob = process.env.VIDEO_CATALOG_BLOB || 'meta/catalog.videos.json';
  
  // Connexion
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(catalogBlob);
  
  // Lecture
  const downloadResponse = await blobClient.download(0);
  const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
  const catalog = JSON.parse(downloaded.toString('utf-8'));
  
  console.log(`Version actuelle: ${catalog.version}`);
  console.log(`Nombre de vidéos: ${catalog.items.length}`);
  
  // Migration
  let migrated = 0;
  catalog.items.forEach(item => {
    if (!item.platformType) {
      // Migration YouTube
      item.platformType = 'youtube';
      item.videoId = item.youtubeId;
      migrated++;
      console.log(`✓ Migré: ${item.title} (${item.youtubeId})`);
    }
  });
  
  if (migrated > 0) {
    // Mise à jour
    catalog.version = 2;
    catalog.updatedAt = new Date().toISOString();
    
    const content = JSON.stringify(catalog, null, 2);
    await blobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: 'application/json' }
    });
    
    console.log(`\n✅ Migration terminée : ${migrated} vidéo(s) migrée(s)`);
  } else {
    console.log('\n✅ Aucune migration nécessaire, toutes les vidéos sont déjà à jour');
  }
}

function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
}

// Exécution
migrateCatalog()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
```

### Utilisation du script de migration

```bash
# Sauvegarder le script dans le dossier racine
nano migrate-catalog.js

# Exécuter
node migrate-catalog.js
```

## Vérification post-migration

1. **Démarrer l'application :**
   ```bash
   npm start
   ```

2. **Accéder à l'onglet Vidéos :**
   http://localhost:3000

3. **Vérifier que toutes les vidéos YouTube sont visibles**

4. **Éditer une vidéo YouTube existante** :
   - La plateforme devrait être automatiquement définie sur "YouTube"
   - L'ID devrait être visible avec le badge "YOUTUBE"

5. **Tester l'ajout d'une vidéo Vimeo** :
   - Sélectionner "Vimeo" dans la modale
   - Ajouter une vidéo de test (ex: ID `76979871`)
   - Vérifier que l'aperçu fonctionne

## Rollback (retour en arrière)

Si vous rencontrez des problèmes, vous pouvez revenir à l'ancienne version :

1. **Restaurer le blob depuis Azure Portal** (si vous avez activé le versioning)
2. **Ou supprimer les champs ajoutés** :
   ```javascript
   catalog.items.forEach(item => {
     delete item.platformType;
     delete item.videoId;
   });
   catalog.version = 1;
   ```

## FAQ

**Q: Les anciennes vidéos YouTube fonctionnent-elles toujours ?**  
R: Oui, aucune modification n'est nécessaire. La rétrocompatibilité est assurée.

**Q: Puis-je mélanger des vidéos YouTube et Vimeo ?**  
R: Oui, c'est précisément l'objectif de cette mise à jour !

**Q: Le catalog blob doit-il être renommé ?**  
R: Non, mais vous pouvez utiliser `VIDEO_CATALOG_BLOB` au lieu de `YOUTUBE_CATALOG_BLOB` pour plus de clarté.

**Q: Les vidéos existantes apparaissent-elles dans le player statique ?**  
R: Oui, le player détecte automatiquement la plateforme et affiche le bon embed.

---

**Date :** 17 janvier 2026  
**Version :** v2 (YouTube + Vimeo)
