# Dépannage DataTables - MHL Media Manager

## Problème résolu : "DataTable is not a function"

### 🔍 **Causes identifiées :**

1. **Problème de réseau/CDN** : Les fichiers DataTables ne se chargent pas depuis le CDN
2. **Ordre de chargement** : Les scripts se chargent dans le mauvais ordre
3. **Conflit de versions** : Incompatibilité entre les versions des librairies

### ✅ **Solutions implémentées :**

#### 1. Système de chargement asynchrone avec fallback
```javascript
function loadDataTables() {
    return new Promise((resolve, reject) => {
        // Chargement dynamique avec gestion d'erreur
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js';
        script1.onload = function() {
            // Charger l'extension Bootstrap après le core
            const script2 = document.createElement('script');
            script2.src = 'https://cdn.datatables.net/1.13.8/js/dataTables.bootstrap5.min.js';
            script2.onload = () => resolve(true);
            script2.onerror = () => reject(false);
            document.head.appendChild(script2);
        };
        script1.onerror = () => reject(false);
        document.head.appendChild(script1);
    });
}
```

#### 2. Version de fallback sans DataTables
- Si DataTables ne se charge pas, l'application fonctionne avec un tableau HTML basique
- Fonctionnalités principales préservées (upload, suppression, visualisation)
- Seules les fonctionnalités avancées (tri, recherche, pagination) sont limitées

#### 3. Vérifications et logs améliorés
```javascript
console.log('jQuery version:', $.fn.jquery);
console.log('DataTables version:', $.fn.dataTable.version);
```

#### 4. Gestion d'erreurs robuste
- Messages d'erreur clairs pour l'utilisateur
- Logs détaillés pour le debugging
- Alerts visuelles avec Bootstrap

### 🧪 **Tests disponibles :**

1. **Page de test simple** : `/test-simple.html`
   - Vérifie que l'API fonctionne
   - Affiche les fichiers sans DataTables
   - Test de base de fonctionnalité

2. **Page de test DataTables** : `/test-datatables.html`
   - Vérifie le chargement de DataTables
   - Test d'initialisation
   - Debug des erreurs

### 🔧 **Commandes de dépannage :**

#### Vérifier l'état du serveur :
```bash
npm start
```

#### Tester l'API directement :
```bash
curl http://localhost:3000/api/blobs
curl http://localhost:3000/health
```

#### Vérifier les ports utilisés :
```bash
netstat -ano | findstr :3000
```

#### Arrêter un processus qui bloque :
```bash
taskkill /PID [PID_NUMBER] /F
```

### 🌐 **URLs de test :**

- **Application principale** : http://localhost:3000/
- **Test simple** : http://localhost:3000/test-simple.html
- **Test DataTables** : http://localhost:3000/test-datatables.html
- **Health check** : http://localhost:3000/health

### 📋 **Checklist de vérification :**

- [ ] Le serveur démarre sans erreur (port 3000 libre)
- [ ] Les variables d'environnement Azure sont définies
- [ ] jQuery se charge correctement
- [ ] L'API `/api/blobs` répond
- [ ] DataTables se charge depuis le CDN
- [ ] L'application s'initialise sans erreur

### 🚨 **En cas de problème persistant :**

1. **Vider le cache du navigateur** (Ctrl+F5)
2. **Vérifier la console développeur** (F12)
3. **Tester avec la page simple** : `/test-simple.html`
4. **Vérifier la connexion Azure** (variables d'environnement)
5. **Redémarrer le serveur** : Ctrl+C puis `npm start`

### 📊 **Versions utilisées :**

- **jQuery** : 3.7.1
- **Bootstrap** : 5.3.3
- **DataTables** : 1.13.8 (version stable testée)
- **Font Awesome** : 6.5.1
- **Node.js** : 18+ LTS

---

**Date de résolution** : 25 octobre 2025  
**Statut** : ✅ Résolu avec fallback fonctionnel