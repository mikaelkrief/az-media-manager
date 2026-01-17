# 🔗 Configuration du Player avec Backend séparé

## 📋 Architecture de déploiement séparé

```
┌─────────────────────────────────────┐
│  Backend (Azure WebApp)             │
│  https://backend.azurewebsites.net  │
│                                     │
│  - API REST (/api/youtube-videos)  │
│  - Service Azure Blob Storage       │
│  - Authentification Easy Auth       │
│  - Configuration CORS               │
└─────────────────────────────────────┘
              ↑
              │ HTTP Requests
              │ (avec CORS)
              ↓
┌─────────────────────────────────────┐
│  Player (Azure Static Web Apps)     │
│  https://player.z6.web.core.windows │
│                                     │
│  - HTML/CSS/JavaScript statique     │
│  - Appels API vers backend          │
│  - Pas d'authentification requise   │
└─────────────────────────────────────┘
```

## 🎯 Principe de fonctionnement

### 1. Le player fait des requêtes HTTP

Le player JavaScript appelle l'API REST du backend :

```javascript
// Dans player.js
const response = await fetch(`${API_BASE}/api/youtube-videos/${videoId}`);
```

### 2. Le backend répond avec les données

Le backend retourne les métadonnées de la vidéo en JSON :

```json
{
  "success": true,
  "video": {
    "id": "123e4567-...",
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Ma vidéo",
    "description": "...",
    "tags": ["tag1"],
    "isPublished": true
  }
}
```

### 3. CORS autorise l'accès cross-origin

Le backend doit autoriser les requêtes depuis le domaine du player.

## ⚙️ Configuration requise

### Étape 1 : Configurer l'URL du backend dans le player

**Fichier :** `static-player/player.js` (ligne 4)

**Avant déploiement, modifiez :**

```javascript
// AVANT (développement local)
const API_BASE = 'http://localhost:3000';

// APRÈS (production)
const API_BASE = 'https://votre-backend.azurewebsites.net';
```

**Exemple concret :**
```javascript
const API_BASE = 'https://mhl-media-api.azurewebsites.net';
```

### Étape 2 : Configurer CORS dans le backend

Le backend a déjà le CORS configuré ! Il faut juste définir la variable d'environnement.

**Dans Azure Portal → WebApp → Configuration → Variables d'application :**

```
Nom : ALLOWED_ORIGIN
Valeur : https://votre-player.z6.web.core.windows.net
```

**Ou si plusieurs domaines :**
```
ALLOWED_ORIGIN=https://player1.com,https://player2.com,https://static-site.z6.web.core.windows.net
```

### Étape 3 : Vérifier la configuration CORS dans server.js

Le code suivant est déjà en place dans `server.js` :

```javascript
// CORS configuration - Allow static player domains
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins if ALLOWED_ORIGIN is not configured
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
```

✅ **Rien à modifier dans le code !** Tout est géré par la variable d'environnement.

## 🚀 Déploiement étape par étape

### Option A : Backend + Player séparés (recommandé)

#### 1. Déployer le backend (Azure WebApp)

```bash
# Via Azure DevOps (pipeline déjà configuré)
git add .
git commit -m "feat: YouTube videos management"
git push origin main

# Ou via Azure CLI
az webapp up --name mhl-media-api --resource-group myRG
```

#### 2. Configurer les variables d'environnement du backend

```bash
az webapp config appsettings set \
  --name mhl-media-api \
  --resource-group myRG \
  --settings \
    AZURE_STORAGE_ACCOUNT_NAME="youraccount" \
    AZURE_STORAGE_ACCOUNT_KEY="yourkey" \
    AZURE_BLOB_CONTAINER_NAME="medias" \
    YOUTUBE_CATALOG_BLOB="meta/catalog.youtube.json" \
    ALLOWED_ORIGIN="https://YOUR-PLAYER-DOMAIN"
```

#### 3. Modifier l'URL du backend dans le player

**Fichier :** `static-player/player.js`

```javascript
const API_BASE = 'https://mhl-media-api.azurewebsites.net';
```

#### 4. Déployer le player (Azure Static Web Apps)

```bash
# Créer la Static Web App
az staticwebapp create \
  --name mhl-video-player \
  --resource-group myRG \
  --source https://github.com/yourorg/yourrepo \
  --location "West Europe" \
  --branch main \
  --app-location "/static-player" \
  --login-with-github
```

**Ou via Azure Portal :**
1. Créer une "Static Web App"
2. Connecter votre repo GitHub
3. Définir le dossier source : `static-player`
4. Déployer

#### 5. Mettre à jour ALLOWED_ORIGIN avec l'URL du player

Une fois le player déployé, vous obtenez une URL comme :
```
https://mhl-video-player.azurestaticapps.net
```

**Mettre à jour le backend :**
```bash
az webapp config appsettings set \
  --name mhl-media-api \
  --resource-group myRG \
  --settings ALLOWED_ORIGIN="https://mhl-video-player.azurestaticapps.net"
```

#### 6. Tester

```
https://mhl-video-player.azurestaticapps.net/player.html?id=VIDEO_ID
```

### Option B : Backend + Player sur le même domaine

Si vous hébergez le player dans le même backend (comme actuellement) :

```javascript
// Dans player.js
const API_BASE = window.location.origin; // Utilise le même domaine
```

**Avantages :**
- ✅ Pas de configuration CORS complexe
- ✅ Même domaine = pas de problèmes cross-origin
- ✅ Configuration plus simple

**Inconvénients :**
- ❌ Le player n'est pas sur un CDN dédié
- ❌ Moins de séparation des responsabilités

## 🔍 Debugging CORS

### Test en ligne de commande

```bash
# Test depuis le player
curl -X GET \
  -H "Origin: https://votre-player.azurestaticapps.net" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  --verbose \
  https://votre-backend.azurewebsites.net/api/youtube-videos/VIDEO_ID
```

**Vérifiez dans la réponse :**
```
< Access-Control-Allow-Origin: https://votre-player.azurestaticapps.net
< Access-Control-Allow-Credentials: true
```

### Test dans le navigateur

1. Ouvrez le player : `https://votre-player.com/player.html?id=VIDEO_ID`
2. Ouvrez les DevTools (F12)
3. Onglet "Console" → Vérifiez les erreurs CORS
4. Onglet "Network" → Cliquez sur la requête API

**Si erreur CORS :**
```
Access to fetch at 'https://backend.com/api/...' from origin 'https://player.com' 
has been blocked by CORS policy
```

**Solution :**
- Vérifiez que `ALLOWED_ORIGIN` contient l'URL exacte du player
- Redémarrez le backend après modification
- Vérifiez qu'il n'y a pas d'espaces ou de fautes de frappe

## 🔐 Sécurité

### Authentification

**Backend API :**
- L'interface de gestion utilise Easy Auth (Entra ID)
- Les endpoints API sont ouverts (pas d'auth requise pour les vidéos publiées)
- Si vous voulez protéger l'API, ajoutez un middleware d'authentification

**Player public :**
- Pas d'authentification requise
- Affiche uniquement les vidéos avec `isPublished: true`
- Appels API simples sans token

### Protection supplémentaire (optionnel)

Si vous voulez restreindre l'accès au player :

**Option 1 : API Key dans les headers**
```javascript
// player.js
const response = await fetch(`${API_BASE}/api/youtube-videos/${videoId}`, {
  headers: {
    'X-API-Key': 'votre-cle-secrete'
  }
});
```

**Option 2 : JWT Token**
- Générer un token côté backend
- L'inclure dans l'URL du player
- Valider le token dans l'API

**Option 3 : Rate Limiting**
- Déjà en place dans le backend (express-rate-limit)
- Limite : 100 requêtes par 15 minutes par IP

## 📊 Variables d'environnement complètes

### Backend (Azure WebApp)

```env
# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=youraccount
AZURE_STORAGE_ACCOUNT_KEY=yourkey
AZURE_BLOB_CONTAINER_NAME=medias
AZURE_UPLOAD_FOLDER=pdf

# YouTube
YOUTUBE_CATALOG_BLOB=meta/catalog.youtube.json

# CORS (IMPORTANT pour player séparé)
ALLOWED_ORIGIN=https://votre-player.azurestaticapps.net

# Server
PORT=3000
NODE_ENV=production
```

### Player (configuration dans le code)

**Fichier :** `static-player/player.js`
```javascript
const API_BASE = 'https://votre-backend.azurewebsites.net';
```

## 🌍 Exemples d'URLs en production

### Scénario 1 : Tout séparé

**Backend :**
```
https://mhl-media-api.azurewebsites.net
```

**Player :**
```
https://mhl-player.azurestaticapps.net
```

**Interface de gestion :**
```
https://mhl-media-admin.azurewebsites.net
```

**Configuration :**
```javascript
// player.js
const API_BASE = 'https://mhl-media-api.azurewebsites.net';

// Backend ALLOWED_ORIGIN
ALLOWED_ORIGIN=https://mhl-player.azurestaticapps.net,https://mhl-media-admin.azurewebsites.net
```

### Scénario 2 : Player sur CDN, backend sur WebApp

**Backend :**
```
https://api.monentreprise.com
```

**Player (Azure CDN) :**
```
https://videos.monentreprise.com
```

**Configuration :**
```javascript
// player.js
const API_BASE = 'https://api.monentreprise.com';

// Backend ALLOWED_ORIGIN
ALLOWED_ORIGIN=https://videos.monentreprise.com
```

### Scénario 3 : Tout sur le même domaine (sous-domaines)

**Backend :**
```
https://api.monentreprise.com
```

**Player :**
```
https://player.monentreprise.com
```

**Interface :**
```
https://admin.monentreprise.com
```

## ✅ Checklist de déploiement

### Backend
- [ ] Code déployé sur Azure WebApp
- [ ] Variables d'environnement configurées
- [ ] `ALLOWED_ORIGIN` contient l'URL du player
- [ ] API accessible publiquement
- [ ] Test : `curl https://backend.com/api/youtube-videos`

### Player
- [ ] `API_BASE` modifié avec l'URL du backend
- [ ] Code déployé sur Static Web Apps ou Storage
- [ ] URL du player notée
- [ ] Test : Ouvrir `https://player.com/player.html?id=VIDEO_ID`

### CORS
- [ ] `ALLOWED_ORIGIN` configuré dans le backend
- [ ] Pas d'erreur CORS dans la console du navigateur
- [ ] Test avec F12 → Network → Headers
- [ ] Header `Access-Control-Allow-Origin` présent dans la réponse

### Fonctionnalités
- [ ] Le player charge les vidéos correctement
- [ ] Les métadonnées s'affichent (titre, description, tags)
- [ ] La vidéo YouTube s'affiche
- [ ] Le bouton "Copier le lien" fonctionne
- [ ] Pas d'erreur dans la console

## 🎯 Résumé

**Le player accède au backend via :**

1. **Configuration de l'URL du backend** dans `player.js`
2. **Requêtes HTTP fetch()** vers l'API REST
3. **CORS autorisé** via `ALLOWED_ORIGIN` dans le backend
4. **Réponses JSON** avec les données des vidéos

**Aucun code serveur** n'est requis côté player, c'est purement du JavaScript client qui appelle l'API REST du backend.

---

**Configuration simple, déploiement flexible ! 🚀**
