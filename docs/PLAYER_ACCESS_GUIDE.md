# 🎬 Accès au Player Vidéo

## 🌐 Le player est maintenant accessible !

Le player statique est servi directement par le serveur Node.js.

## 📍 URLs d'accès

### Pour tester le player directement
```
http://localhost:3000/player/player.html?id=VIDEO_ID
```

**Exemple avec une vidéo existante :**
```
http://localhost:3000/player/player.html?id=dQw4w9WgXcQ
```
*(Note: Utilisez l'ID d'une vidéo que vous avez créée dans l'interface)*

### Pour accéder à l'interface de gestion
```
http://localhost:3000/
```

## 🎯 Comment obtenir le lien du player

### Méthode 1 : Via l'interface (recommandé)

1. **Allez sur** http://localhost:3000
2. **Cliquez sur l'onglet** "Vidéos YouTube"
3. **Créez ou sélectionnez une vidéo**
4. **Cliquez sur le bouton "Voir"** (👁️ bouton bleu)
5. **Le lien du player s'affiche** en bas de la modal
6. **Cliquez sur "Copier"** pour copier le lien dans le presse-papiers

### Méthode 2 : Construction manuelle

Format :
```
http://localhost:3000/player/player.html?id=VIDEO_ID
```

Où `VIDEO_ID` est l'ID de la vidéo dans votre catalogue (pas le YouTube ID).

## 🧪 Test rapide

### 1. Créer une vidéo de test

**Via l'interface :**
1. Allez sur http://localhost:3000
2. Onglet "Vidéos YouTube"
3. Cliquer "Ajouter une vidéo"
4. Remplir :
   ```
   YouTube ID: dQw4w9WgXcQ
   Titre: Vidéo de test
   ☑️ Publier
   ```
5. Sauvegarder

### 2. Récupérer l'ID de la vidéo

**Option A - Via l'interface :**
- Cliquer sur "Voir" (👁️)
- Le lien complet s'affiche

**Option B - Via l'API :**
```powershell
# Lister toutes les vidéos
Invoke-RestMethod http://localhost:3000/api/youtube-videos
```

Notez l'`id` retourné (format UUID comme `123e4567-e89b-12d3-a456-426614174000`)

### 3. Accéder au player

```
http://localhost:3000/player/player.html?id=123e4567-e89b-12d3-a456-426614174000
```

## ✅ Ce que vous devriez voir

Le player affiche :
- ✅ La vidéo YouTube intégrée
- ✅ Le titre de la vidéo
- ✅ La description
- ✅ Les tags (badges bleus)
- ✅ La date de création
- ✅ Un bouton "Copier le lien"

## 🔗 Structure des URLs

```
http://localhost:3000/
├── /                              → Interface de gestion
├── /api/blobs                     → API fichiers PDF
├── /api/youtube-videos            → API vidéos YouTube
└── /player/
    ├── player.html                → Page du player
    ├── player.js                  → Logique du player
    └── styles.css                 → Styles du player
```

## 📝 Notes importantes

### Configuration du player

Le player est configuré pour pointer vers :
```javascript
const API_BASE = 'http://localhost:3000';
```

Cette configuration est dans le fichier `static-player/player.js` (ligne 5).

### En production

Quand vous déployez sur Azure, les URLs seront :

**Backend (Azure WebApp) :**
```
https://your-app.azurewebsites.net/
```

**Player accessible via :**
```
https://your-app.azurewebsites.net/player/player.html?id=VIDEO_ID
```

**Ou déployé séparément (Azure Static Web Apps) :**
```
https://your-player.azurestaticapps.net/player.html?id=VIDEO_ID
```

## 🎨 Personnalisation

Pour changer l'URL du backend dans le player, éditez :

**Fichier:** `static-player/player.js`
```javascript
// Ligne 5
const API_BASE = 'https://your-backend.azurewebsites.net';
```

## 🐛 Problèmes courants

### Erreur 404 - Player not found
→ Vérifiez que le serveur est bien démarré
→ L'URL doit contenir `/player/` : `http://localhost:3000/player/player.html`

### Erreur "Vidéo non trouvée"
→ Vérifiez que l'ID dans l'URL est correct
→ Vérifiez que la vidéo existe : `curl http://localhost:3000/api/youtube-videos/VIDEO_ID`
→ Vérifiez que `isPublished: true`

### Erreur CORS
→ Si le player est sur un autre domaine, configurez `ALLOWED_ORIGIN` dans le backend

### La vidéo YouTube ne s'affiche pas
→ Vérifiez votre connexion internet
→ Vérifiez que le YouTube ID est correct
→ Certaines vidéos peuvent être restreintes par région ou âge

## 🔄 Workflow complet

```
1. Créer une vidéo
   Interface → Onglet YouTube → Ajouter
   ↓
2. Obtenir le lien
   Cliquer "Voir" → Copier le lien
   ↓
3. Partager le lien
   Envoyer à vos utilisateurs
   ↓
4. Les utilisateurs voient la vidéo
   Player s'ouvre avec la vidéo intégrée
```

## 🎬 Exemples d'utilisation

### Partager une vidéo de formation
```
http://localhost:3000/player/player.html?id=abc123-formation
```

### Partager une vidéo promotionnelle
```
http://localhost:3000/player/player.html?id=xyz789-promo
```

### Intégrer dans un email
```html
<a href="http://localhost:3000/player/player.html?id=VIDEO_ID">
  Voir la vidéo
</a>
```

### Intégrer dans une page web
```html
<iframe 
  src="http://localhost:3000/player/player.html?id=VIDEO_ID" 
  width="800" 
  height="600" 
  frameborder="0">
</iframe>
```

## ✅ Checklist de vérification

- [ ] Le serveur est démarré (npm start)
- [ ] J'ai créé au moins une vidéo
- [ ] La vidéo est publiée (isPublished: true)
- [ ] J'ai récupéré l'ID de la vidéo
- [ ] J'ai construit l'URL correcte
- [ ] J'ai testé l'URL dans le navigateur
- [ ] La vidéo s'affiche correctement

## 🚀 Prêt à partager !

Vous pouvez maintenant :
- ✅ Créer des vidéos dans l'interface
- ✅ Obtenir leurs liens de partage
- ✅ Les envoyer à vos utilisateurs
- ✅ Suivre leur statut de publication

---

**Bon visionnage ! 🎥**
