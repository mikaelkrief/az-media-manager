# 🔄 Flux de communication Player ↔ Backend

## Architecture simplifiée

```
┌──────────────────────────────────────────────────────────────┐
│                      UTILISATEUR FINAL                        │
│                  (Navigateur Web)                             │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ 1. Ouvre l'URL
                            ↓
┌──────────────────────────────────────────────────────────────┐
│             PLAYER STATIQUE (Frontend)                        │
│   https://player.azurestaticapps.net/player.html?id=123      │
│                                                               │
│   📄 HTML : Structure de la page                             │
│   🎨 CSS  : Mise en forme                                    │
│   ⚙️ JS   : Logique (player.js)                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ 2. Extraction de l'ID depuis l'URL
                            │    const videoId = params.get('id')
                            │
                            │ 3. Requête HTTP GET
                            │    fetch(`${API_BASE}/api/youtube-videos/${id}`)
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              BACKEND API (Node.js)                            │
│         https://backend.azurewebsites.net                     │
│                                                               │
│   📡 Route : /api/youtube-videos/:id                         │
│   🔍 Lecture du catalog JSON depuis Azure Blob               │
│   ✅ CORS : Autorise les requêtes depuis le player           │
│   📤 Retourne les données JSON                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ 4. Réponse JSON
                            │    {success: true, video: {...}}
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  PLAYER (Traitement JS)                       │
│                                                               │
│   📊 Parse la réponse JSON                                   │
│   🎬 Affiche la vidéo YouTube                                │
│   📝 Affiche les métadonnées (titre, description, tags)      │
│   🔗 Génère le bouton "Copier le lien"                       │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ 5. Rendu final
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    PAGE AFFICHÉE                              │
│                                                               │
│   ┌────────────────────────────────────────────┐            │
│   │                                             │            │
│   │      VIDÉO YOUTUBE INTÉGRÉE                │            │
│   │      (iframe youtube-nocookie.com)         │            │
│   │                                             │            │
│   └────────────────────────────────────────────┘            │
│                                                               │
│   📌 Titre de la vidéo                                       │
│   📅 Date de création                                        │
│   🏷️ Tag1  Tag2  Tag3                                        │
│   📄 Description complète...                                 │
│   [📋 Copier le lien]                                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Détail du code JavaScript (player.js)

```javascript
// 1. CONFIGURATION (ligne 4)
const API_BASE = 'https://votre-backend.azurewebsites.net';

// 2. EXTRACTION DE L'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');
// Exemple: player.html?id=123 → videoId = '123'

// 3. APPEL API
async function loadVideo() {
    const response = await fetch(`${API_BASE}/api/youtube-videos/${videoId}`);
    //          ↓
    // https://votre-backend.azurewebsites.net/api/youtube-videos/123
    
    const result = await response.json();
    
    if (result.success && result.video) {
        renderVideo(result.video);
    }
}

// 4. AFFICHAGE
function renderVideo(video) {
    // Créer l'iframe YouTube
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
    
    // Afficher les métadonnées
    document.getElementById('title').textContent = video.title;
    document.getElementById('description').textContent = video.description;
    // ... etc
}
```

## Configuration CORS côté Backend (server.js)

```javascript
// 1. LECTURE de la variable d'environnement
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',').map(origin => origin.trim())
  : [];
// Exemple: ALLOWED_ORIGIN="https://player.com,https://admin.com"
// → ['https://player.com', 'https://admin.com']

// 2. CONFIGURATION CORS
const corsOptions = {
  origin: function (origin, callback) {
    // L'origin est l'URL du site qui fait la requête
    // Exemple: 'https://player.azurestaticapps.net'
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      // ✅ Autorisé
      callback(null, true);
    } else {
      // ❌ Refusé
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// 3. Headers ajoutés automatiquement par CORS
// Access-Control-Allow-Origin: https://player.azurestaticapps.net
// Access-Control-Allow-Credentials: true
```

## Flux de requête détaillé

### Requête HTTP du player vers le backend

```
GET /api/youtube-videos/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: backend.azurewebsites.net
Origin: https://player.azurestaticapps.net
Accept: application/json
User-Agent: Mozilla/5.0...
```

### Réponse du backend

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://player.azurestaticapps.net
Access-Control-Allow-Credentials: true
Content-Type: application/json

{
  "success": true,
  "video": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Ma super vidéo",
    "description": "Description...",
    "tags": ["tag1", "tag2"],
    "createdAt": "2026-01-02T10:30:00.000Z",
    "isPublished": true
  }
}
```

## Pourquoi CORS est nécessaire ?

### Sécurité du navigateur

Les navigateurs bloquent par défaut les requêtes cross-origin :

```
Player:  https://player.com  ─X─► Backend: https://api.com
         (Domaine A)                       (Domaine B)
                                           
         ❌ Bloqué par la politique CORS !
```

Avec CORS configuré :

```
Player:  https://player.com  ─✓─► Backend: https://api.com
         (Domaine A)                       (Domaine B)
         
         Header Origin: https://player.com
                                ↓
         ✅ Backend vérifie ALLOWED_ORIGIN
         ✅ Ajoute Access-Control-Allow-Origin
         ✅ Navigateur autorise la requête
```

## Cas d'utilisation

### Cas 1 : Développement local

```javascript
// player.js
const API_BASE = 'http://localhost:3000';

// Backend .env
ALLOWED_ORIGIN=  (vide = autorise tout)
```

### Cas 2 : Production séparée

```javascript
// player.js (déployé sur Static Web Apps)
const API_BASE = 'https://mhl-api.azurewebsites.net';

// Backend Azure WebApp config
ALLOWED_ORIGIN=https://mhl-player.azurestaticapps.net
```

### Cas 3 : Même domaine (sous-domaines)

```javascript
// player.js (hébergé sur api.exemple.com/player/)
const API_BASE = window.location.origin; // = https://api.exemple.com

// Pas besoin de CORS (même domaine)
```

### Cas 4 : Plusieurs players

```javascript
// player.js (plusieurs déploiements)
const API_BASE = 'https://api.entreprise.com';

// Backend config
ALLOWED_ORIGIN=https://player-prod.com,https://player-preprod.com,https://player-dev.com
```

## Avantages de l'architecture séparée

### ✅ Avantages

1. **Scalabilité** : Player sur CDN = performances optimales
2. **Indépendance** : Déploiement du player sans redémarrer le backend
3. **Sécurité** : Player statique = pas de code serveur exposé
4. **Coûts** : Static Web Apps souvent moins cher que WebApp

### ⚠️ Considérations

1. **CORS** : Doit être configuré correctement
2. **URL** : Changer l'API_BASE à chaque déploiement
3. **Cache** : Le browser peut cacher l'ancien player.js

## Alternatives

### Option 1 : Backend sert le player (actuel)

```
https://backend.com/
  ├── /api/youtube-videos    (API)
  └── /player/player.html    (Player statique)
```

**Avantage :** Pas de problème CORS (même domaine)

### Option 2 : Reverse Proxy

```
https://monsite.com/
  ├── /api/*  → Proxy vers backend.azurewebsites.net
  └── /player/* → Proxy vers player.azurestaticapps.net
```

**Avantage :** Même domaine apparent, pas de CORS

### Option 3 : Azure Front Door

```
Front Door (monsite.com)
  ├── Route /api/* → Backend Pool
  └── Route /* → Static Content
```

**Avantage :** CDN global + pas de CORS

## En résumé

**Le player accède au backend simplement via :**

1. 📝 **Configuration** : `const API_BASE = 'https://backend-url'`
2. 🌐 **HTTP Request** : `fetch(API_BASE + '/api/youtube-videos/' + id)`
3. ✅ **CORS** : Backend autorise via `ALLOWED_ORIGIN`
4. 📦 **JSON Response** : Données de la vidéo
5. 🎨 **Rendu** : Affichage dans le navigateur

**C'est aussi simple qu'un appel d'API classique !**

---

**Pas de complexité, juste du HTTP standard ! 🚀**
