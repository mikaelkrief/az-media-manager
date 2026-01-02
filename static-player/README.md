# Static Video Player

Ce dossier contient le lecteur vidéo statique qui peut être déployé sur Azure Static Web Apps ou un Azure Storage Account (static website).

## Structure

- `player.html` - Page HTML du lecteur
- `player.js` - Logique JavaScript du lecteur
- `styles.css` - Styles CSS

## Configuration

Avant de déployer, mettez à jour `API_BASE` dans `player.js` avec l'URL de votre backend :

```javascript
const API_BASE = 'https://your-app.azurewebsites.net';
```

## Utilisation

Le lecteur s'utilise avec un paramètre d'URL `id` :

```
player.html?id=VIDEO_ID
```

Exemple :
```
https://your-static-site.z6.web.core.windows.net/player.html?id=123e4567-e89b-12d3-a456-426614174000
```

## Déploiement sur Azure Static Web Apps

1. Créer une Azure Static Web App depuis le portail Azure
2. Connecter votre dépôt GitHub
3. Configurer le dossier de build : `static-player`
4. Déployer

## Déploiement sur Azure Storage (Static Website)

1. Créer un Storage Account
2. Activer "Static website" dans les paramètres
3. Uploader les fichiers dans le container `$web`
4. Noter l'URL du site statique

## Variables d'environnement requises dans le backend

Pour autoriser le CORS depuis le site statique, ajouter dans les variables d'environnement du backend :

```
ALLOWED_ORIGIN=https://your-static-site.z6.web.core.windows.net,https://your-other-domain.com
```

## Fonctionnalités

- ✅ Lecture vidéo YouTube en mode "privacy-enhanced" (youtube-nocookie.com)
- ✅ Affichage du titre, description et tags
- ✅ Bouton de copie du lien de la page
- ✅ Design responsive (mobile-friendly)
- ✅ Support du mode sombre
- ✅ Gestion des erreurs

## Personnalisation

### Modifier les couleurs

Éditez les variables CSS dans `styles.css` :

```css
:root {
  --primary-color: #0078d4;
  --primary-hover: #005a9e;
  /* ... */
}
```

### Ajouter des fonctionnalités

Le code est structuré en sections commentées pour faciliter les modifications.
