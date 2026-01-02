# 🎯 Exemple de configuration Production

## Scénario : Déploiement séparé complet

Voici un exemple concret de configuration pour un déploiement en production.

## 📦 Architecture déployée

```
┌────────────────────────────────────────────────────────┐
│  Backend API - Azure WebApp                            │
│  URL: https://mhl-media-api.azurewebsites.net          │
│  Port: 443 (HTTPS)                                     │
└────────────────────────────────────────────────────────┘
                         ↑
                         │ API Calls (CORS enabled)
                         │
┌────────────────────────────────────────────────────────┐
│  Player - Azure Static Web Apps                        │
│  URL: https://mhl-player.azurestaticapps.net           │
└────────────────────────────────────────────────────────┘
```

## 1️⃣ Configuration du Backend

### Variables d'environnement (Azure Portal)

Allez dans : **Azure Portal → WebApp → Configuration → Application settings**

```
AZURE_STORAGE_ACCOUNT_NAME = dataakor
AZURE_STORAGE_ACCOUNT_KEY = [votre clé d'accès]
AZURE_BLOB_CONTAINER_NAME = medias
AZURE_UPLOAD_FOLDER = pdf
YOUTUBE_CATALOG_BLOB = meta/catalog.youtube.json
ALLOWED_ORIGIN = https://mhl-player.azurestaticapps.net
NODE_ENV = production
PORT = 8080
```

### Via Azure CLI

```bash
az webapp config appsettings set \
  --name mhl-media-api \
  --resource-group mhl-resources \
  --settings \
    AZURE_STORAGE_ACCOUNT_NAME="dataakor" \
    AZURE_STORAGE_ACCOUNT_KEY="[votre-cle]" \
    AZURE_BLOB_CONTAINER_NAME="medias" \
    AZURE_UPLOAD_FOLDER="pdf" \
    YOUTUBE_CATALOG_BLOB="meta/catalog.youtube.json" \
    ALLOWED_ORIGIN="https://mhl-player.azurestaticapps.net" \
    NODE_ENV="production"
```

### Vérification

```bash
# Test de l'API
curl https://mhl-media-api.azurewebsites.net/health

# Devrait retourner
{
  "status": "OK",
  "timestamp": "2026-01-02T10:30:00.000Z"
}
```

## 2️⃣ Configuration du Player

### Avant le déploiement

**Fichier :** `static-player/player.js` (ligne 4)

```javascript
// ❌ AVANT (développement)
const API_BASE = 'http://localhost:3000';

// ✅ APRÈS (production)
const API_BASE = 'https://mhl-media-api.azurewebsites.net';
```

### Créer un fichier de config (optionnel mais recommandé)

**Nouveau fichier :** `static-player/config.js`

```javascript
// Configuration de l'environnement
const CONFIG = {
  // URL de l'API backend
  API_BASE: 'https://mhl-media-api.azurewebsites.net',
  
  // Autres configs si nécessaire
  DEFAULT_LANGUAGE: 'fr',
  ENABLE_ANALYTICS: true
};

// Export pour utilisation dans player.js
window.APP_CONFIG = CONFIG;
```

**Modifier :** `static-player/player.html`

```html
<!-- Avant player.js -->
<script src="config.js"></script>
<script src="player.js"></script>
```

**Modifier :** `static-player/player.js`

```javascript
// Utiliser la config centralisée
const API_BASE = window.APP_CONFIG?.API_BASE || 'http://localhost:3000';
```

**Avantage :** Un seul fichier à modifier pour changer la config !

## 3️⃣ Déploiement du Player

### Option A : Azure Static Web Apps (recommandé)

#### Via Azure Portal

1. **Créer une Static Web App**
   - Aller sur Azure Portal
   - Créer "Static Web App"
   - Nom : `mhl-player`
   - Région : `West Europe`

2. **Connecter GitHub**
   - Source : GitHub
   - Organisation : [votre-org]
   - Repository : [votre-repo]
   - Branche : `main`

3. **Configuration du build**
   ```yaml
   App location: /static-player
   Api location: (laisser vide)
   Output location: (laisser vide)
   ```

4. **Déployer**
   - Azure crée automatiquement un workflow GitHub Actions
   - Le déploiement se lance automatiquement

#### Via Azure CLI

```bash
# Créer la Static Web App
az staticwebapp create \
  --name mhl-player \
  --resource-group mhl-resources \
  --source https://github.com/yourorg/mhl-media-manager \
  --location "West Europe" \
  --branch main \
  --app-location "/static-player" \
  --login-with-github

# Récupérer l'URL
az staticwebapp show \
  --name mhl-player \
  --resource-group mhl-resources \
  --query "defaultHostname" \
  --output tsv
```

**Résultat :**
```
mhl-player.azurestaticapps.net
```

### Option B : Azure Storage Static Website

```bash
# 1. Créer un Storage Account
az storage account create \
  --name mhlplayerstorage \
  --resource-group mhl-resources \
  --location westeurope \
  --sku Standard_LRS

# 2. Activer Static Website
az storage blob service-properties update \
  --account-name mhlplayerstorage \
  --static-website \
  --index-document player.html

# 3. Uploader les fichiers
az storage blob upload-batch \
  --account-name mhlplayerstorage \
  --destination '$web' \
  --source ./static-player

# 4. Obtenir l'URL
az storage account show \
  --name mhlplayerstorage \
  --resource-group mhl-resources \
  --query "primaryEndpoints.web" \
  --output tsv
```

**Résultat :**
```
https://mhlplayerstorage.z6.web.core.windows.net/
```

## 4️⃣ Mise à jour de ALLOWED_ORIGIN

Une fois le player déployé, mettez à jour le backend :

```bash
# URL obtenue après déploiement du player
PLAYER_URL="https://mhl-player.azurestaticapps.net"

# Mettre à jour le backend
az webapp config appsettings set \
  --name mhl-media-api \
  --resource-group mhl-resources \
  --settings ALLOWED_ORIGIN="$PLAYER_URL"

# Redémarrer le backend
az webapp restart \
  --name mhl-media-api \
  --resource-group mhl-resources
```

## 5️⃣ Tests de validation

### Test 1 : Backend accessible

```bash
curl https://mhl-media-api.azurewebsites.net/health
```

**Attendu :**
```json
{"status":"OK","timestamp":"..."}
```

### Test 2 : API vidéos accessible

```bash
curl https://mhl-media-api.azurewebsites.net/api/youtube-videos
```

**Attendu :**
```json
{
  "success": true,
  "count": 0,
  "videos": []
}
```

### Test 3 : CORS configuré

```bash
curl -X OPTIONS \
  -H "Origin: https://mhl-player.azurestaticapps.net" \
  -H "Access-Control-Request-Method: GET" \
  --verbose \
  https://mhl-media-api.azurewebsites.net/api/youtube-videos
```

**Vérifier dans la réponse :**
```
< Access-Control-Allow-Origin: https://mhl-player.azurestaticapps.net
< Access-Control-Allow-Credentials: true
```

### Test 4 : Player fonctionne

1. **Créer une vidéo de test via l'interface**
   ```
   https://mhl-media-api.azurewebsites.net/
   ```

2. **Noter l'ID de la vidéo**
   Exemple : `123e4567-e89b-12d3-a456-426614174000`

3. **Ouvrir le player**
   ```
   https://mhl-player.azurestaticapps.net/player.html?id=123e4567-e89b-12d3-a456-426614174000
   ```

4. **Vérifier :**
   - ✅ La vidéo YouTube s'affiche
   - ✅ Le titre et la description sont présents
   - ✅ Les tags s'affichent
   - ✅ Pas d'erreur CORS dans la console (F12)

## 6️⃣ Configuration avec plusieurs environnements

### Développement, Staging, Production

```javascript
// static-player/config.js
const ENVIRONMENTS = {
  development: 'http://localhost:3000',
  staging: 'https://mhl-api-staging.azurewebsites.net',
  production: 'https://mhl-api.azurewebsites.net'
};

// Détection automatique ou config manuelle
const ENV = 'production'; // Changer selon l'environnement

const CONFIG = {
  API_BASE: ENVIRONMENTS[ENV],
  ENVIRONMENT: ENV
};

window.APP_CONFIG = CONFIG;
```

### ALLOWED_ORIGIN pour tous les environnements

```bash
# Backend Production
ALLOWED_ORIGIN="https://mhl-player.azurestaticapps.net,https://mhl-player-staging.azurestaticapps.net"
```

## 7️⃣ Domaines personnalisés (optionnel)

### Ajouter un domaine personnalisé au player

```bash
# Ajouter player.monentreprise.com
az staticwebapp hostname set \
  --name mhl-player \
  --resource-group mhl-resources \
  --hostname player.monentreprise.com
```

**Mettre à jour ALLOWED_ORIGIN :**
```bash
az webapp config appsettings set \
  --name mhl-media-api \
  --resource-group mhl-resources \
  --settings ALLOWED_ORIGIN="https://player.monentreprise.com"
```

**Et dans player.js :**
```javascript
const API_BASE = 'https://api.monentreprise.com';
```

## 📋 Checklist finale

### Backend déployé
- [ ] WebApp créée et accessible
- [ ] Variables d'environnement configurées
- [ ] ALLOWED_ORIGIN configuré (vide ou avec l'URL du player)
- [ ] API accessible : `/health` et `/api/youtube-videos`
- [ ] SSL activé (HTTPS)

### Player déployé
- [ ] Static Web App ou Storage créé
- [ ] Fichiers uploadés (player.html, player.js, styles.css)
- [ ] API_BASE configuré avec l'URL du backend
- [ ] URL du player notée

### CORS validé
- [ ] ALLOWED_ORIGIN mis à jour avec l'URL exacte du player
- [ ] Backend redémarré après la modification
- [ ] Test CORS réussi (pas d'erreur dans la console)
- [ ] Headers Access-Control-* présents dans les réponses

### Fonctionnel
- [ ] Player affiche une vidéo de test
- [ ] Métadonnées correctement affichées
- [ ] Bouton "Copier le lien" fonctionne
- [ ] Pas d'erreur 404, 500 ou CORS
- [ ] Performance acceptable (< 2s de chargement)

## 🔄 Processus de mise à jour

### Mettre à jour le player

```bash
# 1. Modifier le code localement
code static-player/player.js

# 2. Commit et push
git add static-player/
git commit -m "update: Player configuration"
git push origin main

# 3. GitHub Actions déploie automatiquement
# (Si vous utilisez Static Web Apps)
```

### Mettre à jour le backend

```bash
# Via Azure DevOps pipeline (déjà configuré)
git push origin main

# Ou manuellement
az webapp deployment source sync \
  --name mhl-media-api \
  --resource-group mhl-resources
```

## 💰 Estimation des coûts (Azure)

**Backend (WebApp) :**
- Tier : Basic B1 (1 core, 1.75 GB RAM)
- Coût : ~13€/mois

**Player (Static Web Apps) :**
- Tier : Free
- Coût : 0€/mois (jusqu'à 100GB bandwidth)

**Storage (Azure Blob) :**
- LRS Standard
- Coût : ~0.018€/GB/mois + transactions

**Total estimé : 15-20€/mois**

## 🎉 Félicitations !

Votre application est maintenant en production avec :
- ✅ Backend API sécurisé
- ✅ Player statique performant
- ✅ CORS correctement configuré
- ✅ SSL/HTTPS activé
- ✅ Prêt à gérer des milliers d'utilisateurs !

---

**Configuration terminée ! 🚀**
