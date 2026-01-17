# 🧪 Test de l'interface utilisateur YouTube

Le serveur est démarré avec succès ! Voici comment tester la nouvelle interface.

## ✅ Serveur démarré

```
✓ Azure Blob Service initialisé
✓ YouTube Catalog Service initialisé  
✓ Catalog créé : meta/catalog.youtube.json
✓ Serveur accessible sur : http://localhost:3000
```

## 🌐 Accéder à l'interface

Ouvrez votre navigateur et allez sur :
```
http://localhost:3000
```

## 📋 Étapes de test

### 1. Navigation dans l'interface

✅ **Vérifier les onglets**
- Vous devriez voir 2 onglets :
  - 📄 **Fichiers PDF** (actif par défaut)
  - 🎥 **Vidéos YouTube** (nouveau)

✅ **Cliquer sur "Vidéos YouTube"**
- Le tableau des vidéos s'affiche (vide au départ)
- Bouton "Ajouter une vidéo" visible en haut à droite

### 2. Créer votre première vidéo

✅ **Cliquer sur "Ajouter une vidéo"**

✅ **Remplir le formulaire** :
```
YouTube ID : dQw4w9WgXcQ
Titre : Test - Rick Astley - Never Gonna Give You Up
Description : Vidéo de test pour la fonctionnalité YouTube
Tags : test, demo, music
☑️ Publier cette vidéo
```

✅ **Observer l'aperçu**
- La vidéo devrait s'afficher automatiquement dans l'aperçu
- Le player YouTube s'intègre en mode privacy-enhanced

✅ **Cliquer sur "Enregistrer"**
- Message de succès : "Vidéo ajoutée avec succès !"
- La vidéo apparaît dans le tableau

### 3. Tester les fonctionnalités

#### 👁️ Voir les détails
1. Cliquer sur l'icône œil (🔵 bouton bleu)
2. Une modal s'ouvre avec :
   - ✅ Player YouTube intégré
   - ✅ Titre, description, tags
   - ✅ Date de création
   - ✅ Statut (publié)
   - ✅ **Lien du player** avec bouton de copie

3. **Tester la copie du lien**
   - Cliquer sur le bouton "Copier"
   - Un toast de confirmation apparaît
   - Essayer de coller le lien (Ctrl+V)

#### ✏️ Modifier une vidéo
1. Cliquer sur l'icône crayon (🟡 bouton jaune)
2. Le formulaire se pré-remplit avec les données
3. Modifier le titre : "Test MODIFIÉ - Rick Astley"
4. Ajouter un nouveau tag : ", updated"
5. Cliquer sur "Enregistrer"
6. Vérifier que les changements sont appliqués

#### 👁️‍🗨️ Publier/Dépublier
1. Cliquer sur l'icône œil barré (⚫ bouton gris)
2. La vidéo passe en statut "Non publié"
3. Le badge change de couleur
4. Re-cliquer pour republier

#### 🗑️ Supprimer
1. Cliquer sur l'icône poubelle (🔴 bouton rouge)
2. Une confirmation s'affiche
3. Lire l'avertissement
4. Cliquer sur "Supprimer"
5. La vidéo disparaît du tableau

### 4. Tester plusieurs vidéos

Créer d'autres vidéos pour tester :

**Vidéo 2 - Tutoriel**
```
YouTube ID : jNQXAC9IVRw
Titre : Me at the zoo - Première vidéo YouTube
Description : La toute première vidéo uploadée sur YouTube
Tags : histoire, youtube, classic
☐ Publier (laisser décoché)
```

**Vidéo 3 - Promo**
```
YouTube ID : 9bZkp7q19f0
Titre : PSY - GANGNAM STYLE
Description : Vidéo K-pop populaire
Tags : music, kpop, viral
☑️ Publier
```

### 5. Tester les fonctionnalités DataTables

✅ **Recherche**
- Taper "YouTube" dans la barre de recherche
- Seule la vidéo 2 s'affiche

✅ **Tri**
- Cliquer sur "Date de création"
- L'ordre s'inverse

✅ **Pagination**
- Changer "Afficher 25 vidéos" → "50 vidéos"

✅ **Export Excel**
- Cliquer sur "Exporter Excel"
- Un fichier .xlsx se télécharge
- L'ouvrir pour vérifier le contenu

### 6. Tester les filtres

✅ **Filtrer par statut**
- Observer quelles vidéos sont publiées (badge vert)
- Observer quelles vidéos ne le sont pas (badge gris)

✅ **Filtrer par tags**
- Les tags s'affichent en badges bleus
- Rechercher "music" pour voir les vidéos avec ce tag

### 7. Tester le responsive

✅ **Redimensionner la fenêtre**
- Les tableaux s'adaptent automatiquement
- Les modals restent centrées
- Les boutons sont accessibles

✅ **Mode mobile** (F12 → Toggle device toolbar)
- Tester sur iPhone/Android
- Vérifier que tout est cliquable

## 🎯 Résultats attendus

### ✅ Succès si :
- [x] Les onglets sont visibles et fonctionnels
- [x] Le formulaire d'ajout fonctionne
- [x] L'aperçu vidéo s'affiche automatiquement
- [x] Les vidéos apparaissent dans le tableau
- [x] Les actions (voir, modifier, publier, supprimer) fonctionnent
- [x] Le lien du player se copie dans le presse-papiers
- [x] L'export Excel fonctionne
- [x] Les messages de succès/erreur s'affichent
- [x] L'interface est responsive

### ❌ Problèmes potentiels

**"Erreur lors du chargement des vidéos"**
→ Vérifier la console (F12) pour les détails
→ Vérifier que le backend est bien démarré

**Le tableau ne s'affiche pas**
→ Attendre le chargement de DataTables (peut prendre 1-2 secondes)
→ Vérifier la console pour erreurs JavaScript

**L'aperçu ne s'affiche pas**
→ Vérifier l'ID YouTube (11 caractères exactement)
→ Vérifier la connexion internet

**Le lien du player ne fonctionne pas**
→ Normal : le player statique n'est pas encore déployé
→ Le lien sera fonctionnel après déploiement du player

## 📊 Test de l'API directement

### PowerShell
```powershell
# Lister les vidéos
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos"

# Récupérer une vidéo (remplacer VIDEO_ID)
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube-videos/VIDEO_ID"
```

### Bash / WSL
```bash
# Lister les vidéos
curl http://localhost:3000/api/youtube-videos | jq

# Récupérer une vidéo
curl http://localhost:3000/api/youtube-videos/VIDEO_ID | jq
```

## 🎬 Bonus : Tester avec vos propres vidéos

1. Allez sur YouTube
2. Trouvez une vidéo que vous aimez
3. Copiez l'URL : `https://www.youtube.com/watch?v=XXXXXXXXXXXX`
4. Extrayez l'ID : `XXXXXXXXXXXX` (les 11 caractères après `v=`)
5. Ajoutez-la dans l'interface !

## 🐛 Console de développement

Ouvrez les outils de développement (F12) pour voir :
- Les logs de chargement
- Les requêtes API (onglet Network)
- Les erreurs éventuelles (onglet Console)

## ✅ Checklist finale

- [ ] Interface accessible sur http://localhost:3000
- [ ] Onglet "Vidéos YouTube" visible
- [ ] Formulaire d'ajout fonctionnel
- [ ] Aperçu vidéo en temps réel
- [ ] Création de vidéo réussie
- [ ] Affichage dans le tableau
- [ ] Voir les détails fonctionne
- [ ] Modification fonctionne
- [ ] Publication/dépublication fonctionne
- [ ] Suppression fonctionne
- [ ] Copie du lien fonctionne
- [ ] Export Excel fonctionne
- [ ] Recherche et tri fonctionnent
- [ ] Interface responsive
- [ ] Aucune erreur dans la console

## 🎉 Félicitations !

Si tous les tests passent, votre interface est opérationnelle et prête pour la production !

**Prochaines étapes :**
1. Déployer le backend sur Azure WebApp
2. Déployer le player statique sur Azure Static Web Apps
3. Configurer CORS avec les bonnes URLs
4. Tester en production avec de vraies vidéos YouTube

---

**Bon test ! 🚀**
