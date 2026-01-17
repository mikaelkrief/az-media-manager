# Support Vimeo - Documentation

## Vue d'ensemble

L'application MHL Media Manager supporte maintenant deux plateformes de vidéos :
- **YouTube** (existant)
- **Vimeo** (nouveau)

## Modifications apportées

### Backend (`src/youtubeService.js`)

**Nouveau modèle de données :**
```javascript
{
  id: "uuid",
  platformType: "youtube" | "vimeo",  // Type de plateforme
  videoId: "...",                      // ID universel (YouTube ou Vimeo)
  youtubeId: "...",                    // Rétrocompatibilité pour YouTube
  title: "Titre de la vidéo",
  description: "Description...",
  tags: ["tag1", "tag2"],
  createdAt: "2026-01-17T...",
  isPublished: true
}
```

**Changements :**
- Ajout du champ `platformType` ('youtube' ou 'vimeo')
- Ajout du champ `videoId` pour un ID universel
- Validation du type de plateforme lors de la création/mise à jour
- Vérification de duplication basée sur `videoId` + `platformType`
- Support de la variable d'environnement `VIDEO_CATALOG_BLOB` (par défaut: `meta/catalog.videos.json`)

### Frontend (`public/index.html` et `public/js/app.js`)

**Interface utilisateur :**
1. **Sélecteur de plateforme** dans la modale d'ajout/édition
   - Boutons radio pour choisir YouTube ou Vimeo
   - Icônes distinctes (YouTube rouge, Vimeo bleu)
   - Labels et placeholders adaptés selon la plateforme

2. **Extraction d'ID automatique**
   - YouTube: `extractYoutubeId()` - supporte URL et ID direct
   - Vimeo: `extractVimeoId()` - supporte URL et ID numérique

3. **Prévisualisation vidéo**
   - YouTube: `https://www.youtube-nocookie.com/embed/{id}`
   - Vimeo: `https://player.vimeo.com/video/{id}?dnt=1`

4. **DataTable**
   - Colonne "Titre" avec icône selon la plateforme
   - Colonne "Video ID" avec badge de plateforme (YOUTUBE/VIMEO)

### Player statique (`static-player/player.js`)

**Support multi-plateformes :**
```javascript
if (platformType === 'youtube') {
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
} else if (platformType === 'vimeo') {
  iframe.src = `https://player.vimeo.com/video/${videoId}?dnt=1`;
}
```

## Utilisation

### Ajouter une vidéo Vimeo

1. Cliquer sur "Ajouter une vidéo"
2. Sélectionner **Vimeo** dans les boutons radio
3. Saisir l'ID Vimeo (ex: `123456789`) ou l'URL complète (ex: `https://vimeo.com/123456789`)
4. Remplir le titre, description, tags
5. Cocher "Publier" si la vidéo doit être visible
6. Enregistrer

### Format des URLs supportées

**YouTube :**
- `dQw4w9WgXcQ` (ID direct)
- `https://youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://youtube.com/embed/dQw4w9WgXcQ`
- `https://youtube.com/shorts/dQw4w9WgXcQ`

**Vimeo :**
- `123456789` (ID numérique)
- `https://vimeo.com/123456789`
- `https://player.vimeo.com/video/123456789`

## Rétrocompatibilité

Les vidéos YouTube existantes continuent de fonctionner :
- Si `platformType` est absent, YouTube est assumé par défaut
- Le champ `youtubeId` est toujours présent pour les anciennes vidéos
- Le catalogue JSON est compatible avec la version v1 (YouTube only)

## Variables d'environnement

```env
# Nouveau (recommandé) - catalog multi-plateformes
VIDEO_CATALOG_BLOB=meta/catalog.videos.json

# Ancien (rétrocompatibilité) - YouTube uniquement
YOUTUBE_CATALOG_BLOB=meta/catalog.youtube.json
```

Si `VIDEO_CATALOG_BLOB` est défini, il prend priorité sur `YOUTUBE_CATALOG_BLOB`.

## Tests

Pour tester le support Vimeo :

1. **Démarrer le serveur :**
   ```bash
   npm start
   ```

2. **Accéder à l'interface :**
   http://localhost:3000

3. **Ajouter une vidéo Vimeo de test :**
   - Plateforme: Vimeo
   - ID: `76979871` (vidéo publique de test)
   - Titre: Test Vimeo
   - Publié: ✓

4. **Vérifier dans le player statique :**
   http://localhost:3000/player/player.html?id={VIDEO_ID}

## API Endpoints (inchangés)

Les endpoints restent identiques :
- `GET /api/youtube-videos` - Liste toutes les vidéos (YouTube + Vimeo)
- `POST /api/youtube-videos` - Crée une vidéo (YouTube ou Vimeo)
- `PUT /api/youtube-videos/:id` - Met à jour une vidéo
- `DELETE /api/youtube-videos/:id` - Supprime une vidéo

**Note:** Le nom "youtube-videos" est conservé pour la rétrocompatibilité, mais gère maintenant les deux plateformes.

## Migration des données existantes

Aucune migration n'est nécessaire ! Les vidéos YouTube existantes :
- Fonctionnent sans modification
- Auront `platformType = 'youtube'` assigné automatiquement lors de la prochaine édition
- Continuent d'utiliser le champ `youtubeId`

---

**Date de mise à jour :** 17 janvier 2026  
**Version catalogue :** v2 (support multi-plateformes)
