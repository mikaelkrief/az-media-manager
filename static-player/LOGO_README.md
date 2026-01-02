# 🎨 Comment remplacer le logo du player

## Logo actuel

Un logo placeholder SVG "VOTRE LOGO" est actuellement affiché en haut du player.

## Comment remplacer le logo

### Option 1 : Remplacer le fichier SVG

Remplacez simplement le fichier `static-player/logo.svg` par votre propre logo :

```bash
# Copiez votre logo SVG
cp /chemin/vers/votre-logo.svg static-player/logo.svg
```

**Format recommandé :** SVG (meilleure qualité, poids léger)

### Option 2 : Utiliser un fichier PNG/JPG

Si vous préférez un format PNG ou JPG :

1. **Ajoutez votre logo :**
   ```bash
   cp /chemin/vers/votre-logo.png static-player/logo.png
   ```

2. **Modifiez `player.html` (ligne 10) :**
   ```html
   <!-- Avant -->
   <img src="logo.svg" alt="Logo" class="logo" id="logo">
   
   <!-- Après -->
   <img src="logo.png" alt="Logo" class="logo" id="logo">
   ```

### Option 3 : Logo hébergé en ligne

Si votre logo est déjà hébergé quelque part :

**Modifiez `player.html` (ligne 10) :**
```html
<img src="https://votresite.com/images/logo.png" alt="Logo" class="logo" id="logo">
```

## Dimensions recommandées

- **Hauteur maximale :** 50px (40px sur mobile)
- **Format :** SVG, PNG ou JPG
- **Fond :** Transparent de préférence (PNG ou SVG)
- **Largeur :** Automatique (s'adapte selon la hauteur)

## Exemples de dimensions

- **Format horizontal :** 200x50px, 300x60px
- **Format carré :** 50x50px
- **Format vertical :** 40x80px (attention, prend plus de place en hauteur)

## Personnaliser le style

Si vous voulez changer la hauteur du logo, modifiez `static-player/styles.css` :

```css
.logo {
  max-height: 60px;  /* Changez cette valeur */
  width: auto;
  object-fit: contain;
}
```

## Enlever le logo

Si vous ne voulez pas de logo, supprimez simplement la section header dans `player.html` :

```html
<!-- À supprimer -->
<header class="header">
  <div class="logo-container">
    <img src="logo.svg" alt="Logo" class="logo" id="logo">
  </div>
</header>
```

---

**Note :** Après modification, pensez à déployer les nouveaux fichiers sur votre hébergement (Azure Static Web Apps, etc.).
