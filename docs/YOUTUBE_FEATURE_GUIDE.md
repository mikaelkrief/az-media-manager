# Guide d'utilisation - Fonctionnalité Vidéos YouTube

Ce guide explique comment utiliser la nouvelle fonctionnalité de référencement de vidéos YouTube.

## 📋 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Configuration](#configuration)
3. [Workflow d'utilisation](#workflow-dutilisation)
4. [API REST](#api-rest)
5. [Déploiement du player statique](#déploiement-du-player-statique)
6. [Gestion de concurrence](#gestion-de-concurrence)

## 🎯 Vue d'ensemble

Cette fonctionnalité permet de :
- **Référencer** des vidéos YouTube (upload manuel sur YouTube)
- **Stocker** les métadonnées dans un fichier JSON sur Azure Blob Storage
- **Exposer** une API REST pour la gestion CRUD
- **Afficher** les vidéos via un player statique embeddé

**Important** : L'application ne gère PAS l'upload de vidéos. Les vidéos doivent être uploadées manuellement sur YouTube (en mode non répertorié recommandé).

## ⚙️ Configuration

### 1. Variables d'environnement

Ajouter dans votre fichier `.env` :

```env
# YouTube Catalog Configuration
YOUTUBE_CATALOG_BLOB=meta/catalog.youtube.json

# CORS Configuration (pour le player statique)
ALLOWED_ORIGIN=https://your-static-site.z6.web.core.windows.net
```

### 2. Azure Blob Storage

Le fichier `catalog.youtube.json` sera automatiquement créé dans votre container Azure lors de la première utilisation. Assurez-vous que :
- Le container existe (défini dans `AZURE_BLOB_CONTAINER_NAME`)
- Les credentials Azure sont corrects
- Le dossier `meta/` sera créé automatiquement

### 3. CORS

Pour permettre au player statique d'accéder à l'API :
- Configurez `ALLOWED_ORIGIN` avec l'URL de votre site statique
- Plusieurs domaines peuvent être séparés par des virgules
- Si non configuré, tous les domaines sont autorisés (développement uniquement)

## 🔄 Workflow d'utilisation

### Étape 1 : Upload sur YouTube

1. Connectez-vous à YouTube
2. Uploadez votre vidéo en mode **"Non répertorié"** (recommandé)
3. Notez l'**ID YouTube** de la vidéo (dans l'URL : `youtube.com/watch?v=VIDEO_ID`)

### Étape 2 : Référencer dans l'application

Créer une nouvelle entrée via l'API :

```bash
curl -X POST http://localhost:3000/api/youtube-videos \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Ma vidéo promotionnelle",
    "description": "Description complète de la vidéo",
    "tags": ["promo", "janvier", "2025"],
    "isPublished": true
  }'
```

### Étape 3 : Obtenir l'ID de la vidéo

La réponse contient l'ID unique :

```json
{
  "success": true,
  "video": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    ...
  }
}
```

### Étape 4 : Partager avec le player

L'URL du player sera :
```
https://your-static-site.com/player.html?id=123e4567-e89b-12d3-a456-426614174000
```

## 🔌 API REST

### Liste des vidéos

```bash
# Toutes les vidéos
GET /api/youtube-videos

# Seulement les vidéos publiées
GET /api/youtube-videos?isPublished=true

# Filtre par tags
GET /api/youtube-videos?tags=promo,janvier
```

### Récupérer une vidéo

```bash
GET /api/youtube-videos/:id
```

### Créer une vidéo

```bash
POST /api/youtube-videos
Content-Type: application/json

{
  "youtubeId": "VIDEO_ID",      # Obligatoire
  "title": "Titre",             # Obligatoire
  "description": "Description", # Optionnel
  "tags": ["tag1", "tag2"],    # Optionnel
  "isPublished": true          # Optionnel (default: false)
}
```

### Mettre à jour une vidéo

```bash
PUT /api/youtube-videos/:id
Content-Type: application/json

{
  "title": "Nouveau titre",
  "description": "Nouvelle description",
  "tags": ["nouveaux", "tags"],
  "isPublished": false
}
```

### Changer le statut de publication

```bash
PATCH /api/youtube-videos/:id/publish
Content-Type: application/json

{
  "isPublished": true
}
```

### Supprimer une vidéo

```bash
DELETE /api/youtube-videos/:id
```

## 🎬 Déploiement du player statique

### Option 1 : Azure Static Web Apps

1. Créer une Static Web App :
```bash
az staticwebapp create \
  --name my-video-player \
  --resource-group myResourceGroup \
  --source https://github.com/myorg/myrepo \
  --location "West Europe" \
  --branch main \
  --app-location "/static-player" \
  --login-with-github
```

2. Mettre à jour `API_BASE` dans `static-player/player.js` :
```javascript
const API_BASE = 'https://your-backend.azurewebsites.net';
```

3. Configurer `ALLOWED_ORIGIN` dans le backend :
```env
ALLOWED_ORIGIN=https://my-video-player.azurestaticapps.net
```

### Option 2 : Azure Storage Static Website

1. Activer le site statique sur votre Storage Account :
```bash
az storage blob service-properties update \
  --account-name mystorageaccount \
  --static-website \
  --index-document player.html
```

2. Uploader les fichiers :
```bash
az storage blob upload-batch \
  --account-name mystorageaccount \
  --destination '$web' \
  --source ./static-player
```

3. Noter l'URL du site statique :
```
https://mystorageaccount.z6.web.core.windows.net
```

## 🔒 Gestion de concurrence

Le système utilise **ETag** pour éviter les conflits lors de modifications simultanées.

### Comment ça marche ?

1. Chaque lecture du catalog retourne un ETag (hash du contenu)
2. Toute modification vérifie que l'ETag n'a pas changé
3. Si l'ETag a changé, la modification échoue et un retry automatique est effectué (jusqu'à 3 fois)

### En cas d'erreur de concurrence

Si vous recevez une erreur "CONCURRENT_MODIFICATION", cela signifie que le catalog a été modifié par une autre requête. Le système réessaie automatiquement.

**Bonnes pratiques :**
- Évitez les modifications simultanées du même catalog
- Les lectures sont toujours sûres et ne causent pas de conflits
- Le système supporte environ 10-20 modifications simultanées avant échec

## 🎨 Personnalisation du player

### Modifier les couleurs

Éditez `static-player/styles.css` :

```css
:root {
  --primary-color: #0078d4;  /* Couleur principale */
  --primary-hover: #005a9e;  /* Survol */
  /* ... */
}
```

### Ajouter des fonctionnalités

Le code JavaScript est structuré en sections :
- Configuration (ligne 1-5)
- Gestion d'erreurs
- Chargement de vidéo
- Rendu du player
- Copie de lien
- Utilitaires

## 📊 Format du catalog JSON

Le fichier `catalog.youtube.json` a cette structure :

```json
{
  "version": 1,
  "updatedAt": "2025-01-02T10:30:00.000Z",
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Ma vidéo",
      "description": "Description",
      "tags": ["tag1", "tag2"],
      "createdAt": "2025-01-02T10:30:00.000Z",
      "isPublished": true
    }
  ]
}
```

**Note** : Ne modifiez pas ce fichier manuellement, utilisez l'API REST.

## 🐛 Dépannage

### Erreur CORS

**Symptôme** : Le player ne peut pas charger les vidéos

**Solution** :
1. Vérifiez que `ALLOWED_ORIGIN` est correctement configuré
2. Redémarrez le backend après modification
3. Vérifiez que l'URL du player correspond exactement à `ALLOWED_ORIGIN`

### Vidéo non trouvée

**Symptôme** : Erreur 404 lors du chargement

**Solution** :
1. Vérifiez que l'ID dans l'URL est correct
2. Vérifiez que la vidéo existe via `GET /api/youtube-videos`
3. Vérifiez que `isPublished` est `true` si nécessaire

### Erreur de concurrence

**Symptôme** : "Failed to update catalog after maximum retries"

**Solution** :
1. Réduisez le nombre de modifications simultanées
2. Attendez quelques secondes et réessayez
3. Le système réessaie automatiquement 3 fois

## 💡 Conseils de production

1. **Mode non répertorié** : Uploadez vos vidéos en mode "Non répertorié" sur YouTube pour un meilleur contrôle
2. **CDN** : Utilisez Azure CDN devant votre player statique pour de meilleures performances
3. **Cache** : Configurez un cache approprié pour le catalog JSON
4. **Monitoring** : Surveillez les erreurs de concurrence pour ajuster le nombre de workers
5. **Backup** : Sauvegardez régulièrement le catalog JSON

## 📞 Support

Pour toute question ou problème :
- Consultez les logs du serveur : `npm start`
- Vérifiez la configuration : `GET /api/diagnostic`
- Créez une issue GitHub avec les détails de l'erreur
