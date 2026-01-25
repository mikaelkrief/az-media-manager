---
agent: agent
---
# Prompt Copilot — Référencement de vidéos YouTube (upload manuel) + catalogue JSON + player statique (CommonJS)

Tu es un développeur senior Node.js.

Contexte : j’ai cette application existante en **CommonJS** (`require/module.exports`) déployée sur Azure App Service.  
Elle gère déjà l’upload et le partage de **PDF** via Azure Blob Storage.  
Il existe déjà un dossier `routes/`.

Objectif : ajouter une fonctionnalité “Vidéos” **sans upload vidéo** côté app (l’upload est fait manuellement sur YouTube en mode **non répertorié**).  
Mon backend sert uniquement à **référencer** ces vidéos dans un **fichier JSON** (titre, description, youtubeId, tags, published) et à exposer une API consommée par un **player statique** (HTML/JS) hébergeable sur Azure Static Web Apps / static website.

Aucune base de données.

---

## Contraintes & choix techniques

- L’upload vidéo est fait sur YouTube manuellement. L’app ne gère pas l’upload.
- Les métadonnées sont stockées dans un fichier JSON dans Azure Blob Storage (recommandé en prod)

- Gestion de concurrence obligatoire si JSON sur Blob : **ETag / If-Match** + retry.
- Le backend doit rester **CommonJS**.
- Ne pas casser les routes PDF existantes.
- CORS : autoriser le domaine du site statique du player (env `ALLOWED_ORIGIN` CSV), sans casser l’existant.

---

## Stockage (Azure Blob) — recommandé

Utiliser un container configurable en variable d’environnement comme actuellement
- `meta/catalog.youtube.json` (env `YOUTUBE_CATALOG_BLOB`)

Format du fichier JSON :

```json
{
  "version": 1,
  "updatedAt": "ISO8601",
  "items": [
    {
      "id": "uuid-ou-slug",
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Promo Janvier",
      "description": "Texte",
      "tags": ["promo"],
      "createdAt": "ISO8601",
      "isPublished": true
    }
  ]
}
```

## Concurrence (obligatoire si JSON sur Blob)

Implémenter des helpers :

- ensureYoutubeCatalogExists()
- readYoutubeCatalog() -> { etag, data }
- writeYoutubeCatalogIfMatch(data, etag)
- updateYoutubeCatalogAtomic(mutatorFn, retries=3)


## Player statique (HTML/JS)

Dans ce meme workspace creer un autre dossier racine pour le player statique qui sera déployer dans une staic web app (storage account): static-player/ avec :

-player.html

- player.js

- styles.css

### Comportement :

- URL : player.html?id=<id>

- player.js appelle : GET <API_BASE>/api/youtube-videos/<id>

- Affiche video + title + description

### Embed YouTube via iframe en privacy-enhanced :

- https://www.youtube-nocookie.com/embed/<youtubeId>?rel=0&modestbranding=1
- Ajouter un bouton “Copier le lien” (copie l’URL de la page).
- Mettre API_BASE configurable en haut de player.js.##