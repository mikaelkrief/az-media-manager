# 🚀 Quick Start - YouTube Feature

Guide rapide pour tester la nouvelle fonctionnalité vidéos YouTube.

## 📋 Prérequis

1. Node.js 20.x LTS installé
2. Fichier `.env` configuré avec les credentials Azure
3. Dépendances installées : `npm install` ✅

## 🧪 Test 1 : Vérifier le service

```bash
node test-youtube-service.js
```

**Résultat attendu :**
```
✅ YouTube service loaded successfully
✅ Catalog read successfully
✅ All tests passed!
```

## 🚀 Test 2 : Démarrer le serveur

```bash
npm start
```

**Résultat attendu :**
```
Server running on port 3000
YouTube Catalog Service initialized successfully
```

## 📝 Test 3 : Créer une vidéo (API)

### Windows PowerShell
```powershell
$body = @{
    youtubeId = "dQw4w9WgXcQ"
    title = "Ma première vidéo"
    description = "Test de la fonctionnalité vidéo"
    tags = @("test", "demo")
    isPublished = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Bash / WSL
```bash
curl -X POST http://localhost:3000/api/youtube-videos \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Ma première vidéo",
    "description": "Test de la fonctionnalité vidéo",
    "tags": ["test", "demo"],
    "isPublished": true
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Video created successfully",
  "video": {
    "id": "123e4567-...",
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Ma première vidéo",
    ...
  }
}
```

**⚠️ Important** : Notez l'`id` retourné, vous en aurez besoin pour le player !

## 📋 Test 4 : Lister les vidéos

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos"
```

### Bash / WSL
```bash
curl http://localhost:3000/api/youtube-videos
```

## 🎬 Test 5 : Tester le player

1. **Mettre à jour l'API_BASE** dans `static-player/player.js` :
   ```javascript
   const API_BASE = 'http://localhost:3000';
   ```

2. **Servir les fichiers statiques** (choisir une option) :
   
   **Option A - Python :**
   ```bash
   cd static-player
   python -m http.server 8000
   ```
   
   **Option B - Node.js (http-server) :**
   ```bash
   npx http-server static-player -p 8000
   ```
   
   **Option C - VS Code Live Server :**
   - Installer l'extension "Live Server"
   - Clic droit sur `player.html` → "Open with Live Server"

3. **Ouvrir dans le navigateur :**
   ```
   http://localhost:8000/player.html?id=<VIDEO_ID>
   ```
   Remplacez `<VIDEO_ID>` par l'ID obtenu lors de la création (Test 3).

**Résultat attendu :**
- ✅ La vidéo YouTube s'affiche
- ✅ Le titre, description et tags sont visibles
- ✅ Le bouton "Copier le lien" fonctionne

## 🔍 Tests additionnels

### Mettre à jour une vidéo

```bash
# PowerShell
$body = @{ title = "Titre mis à jour" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos/<VIDEO_ID>" `
    -Method Put -ContentType "application/json" -Body $body

# Bash
curl -X PUT http://localhost:3000/api/youtube-videos/<VIDEO_ID> \
  -H "Content-Type: application/json" \
  -d '{"title": "Titre mis à jour"}'
```

### Publier/dépublier une vidéo

```bash
# PowerShell
$body = @{ isPublished = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos/<VIDEO_ID>/publish" `
    -Method Patch -ContentType "application/json" -Body $body

# Bash
curl -X PATCH http://localhost:3000/api/youtube-videos/<VIDEO_ID>/publish \
  -H "Content-Type: application/json" \
  -d '{"isPublished": false}'
```

### Filtrer les vidéos

```bash
# Seulement les vidéos publiées
curl "http://localhost:3000/api/youtube-videos?isPublished=true"

# Filtrer par tags
curl "http://localhost:3000/api/youtube-videos?tags=test,demo"
```

### Supprimer une vidéo

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos/<VIDEO_ID>" -Method Delete

# Bash
curl -X DELETE http://localhost:3000/api/youtube-videos/<VIDEO_ID>
```

## ✅ Checklist de validation

- [ ] Le service YouTube s'initialise correctement
- [ ] Le catalog JSON est créé automatiquement
- [ ] Je peux créer une vidéo via l'API
- [ ] Je peux lister les vidéos
- [ ] Je peux récupérer une vidéo par ID
- [ ] Je peux mettre à jour une vidéo
- [ ] Je peux supprimer une vidéo
- [ ] Le player statique affiche la vidéo
- [ ] Le bouton de copie fonctionne
- [ ] Les filtres (isPublished, tags) fonctionnent
- [ ] Les routes PDF existantes fonctionnent toujours

## 🐛 Problèmes courants

### "Missing required Azure configuration"
→ Vérifiez votre fichier `.env` avec les variables Azure

### "Video not found" dans le player
→ Vérifiez que l'ID dans l'URL est correct et que `isPublished: true`

### Erreur CORS dans le player
→ Vérifiez que `API_BASE` dans `player.js` correspond à votre serveur

### "CONCURRENT_MODIFICATION"
→ Normal lors de modifications simultanées, le retry automatique résout ça

## 📚 Documentation complète

- **Guide utilisateur** : [docs/YOUTUBE_FEATURE_GUIDE.md](docs/YOUTUBE_FEATURE_GUIDE.md)
- **Résumé d'implémentation** : [YOUTUBE_IMPLEMENTATION.md](YOUTUBE_IMPLEMENTATION.md)
- **README principal** : [README.md](README.md)

## 💡 Prochaines étapes

1. **Déployer le backend** sur Azure WebApp
2. **Configurer les variables d'environnement** dans Azure Portal
3. **Déployer le player** sur Azure Static Web Apps ou Storage
4. **Mettre à jour** `ALLOWED_ORIGIN` et `API_BASE`
5. **Tester en production** avec une vraie vidéo YouTube

---

**Bon test ! 🎉**
