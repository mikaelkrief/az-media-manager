# 📁 MHL Media Manager

> Application web moderne de gestion de fichiers PDF pour Azure Blob Storage

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Azure](https://img.shields.io/badge/Azure-Blob%20Storage-blue.svg)](https://azure.microsoft.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-purple.svg)](https://getbootstrap.com/)
[![DataTables](https://img.shields.io/badge/DataTables-1.13.8-orange.svg)](https://datatables.net/)

## ✨ Fonctionnalités

- 📄 **Gestion de fichiers PDF** : Upload, visualisation, suppression avec drag & drop
- 📊 **Interface DataTables** : Pagination, recherche, tri et export Excel
- 🔗 **Liens directs** : Génération d'URLs avec copie presse-papiers
- 📅 **Métadonnées** : Affichage de la date de dernière modification
- 🔒 **Sécurité** : Authentification via Service Principal Azure
- 🚀 **Déploiement** : Pipeline Azure DevOps pour Azure WebApp Linux
- 📱 **Responsive** : Interface adaptative Bootstrap 5

## 🛠️ Technologies

### Backend
- **Node.js 20.x LTS** - Serveur JavaScript
- **Express.js** - Framework web
- **Azure SDK** - Intégration Blob Storage
- **Helmet.js** - Sécurité HTTP
- **Rate Limiting** - Protection contre les abus

### Frontend  
- **Bootstrap 5.3.3** - Framework CSS moderne
- **DataTables 1.13.8** - Tableaux interactifs avec export Excel
- **jQuery 3.7.1** - Manipulation DOM
- **Font Awesome 6.5.1** - Icônes

### Cloud & DevOps
- **Azure Blob Storage** - Stockage de fichiers
- **Azure WebApp Linux** - Hébergement
- **Azure DevOps Pipelines** - CI/CD

## Prérequis

### Azure Resources
1. **Azure Storage Account** avec clés d'accès
2. **Azure WebApp Linux** (optionnel pour le déploiement)

## ⚙️ Configuration

### Variables d'environnement (.env)
```env
# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=dataakor
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-access-key
AZURE_BLOB_CONTAINER_NAME=medias
AZURE_UPLOAD_FOLDER=pdf

# Server Configuration
PORT=3000
NODE_ENV=development
```

> ⚠️ **Note** : L'application utilise les clés d'accès du Storage Account pour l'authentification (plus simple que Service Principal).

## 🚀 Installation et démarrage

### 1. Prérequis
- **Node.js 20.x LTS** ou plus récent
- **npm** ou **yarn**
- **Azure Storage Account** avec container `medias`
- **Access Key** du Storage Account Azure

### 2. Installation
```bash
# Cloner le repository
git clone https://github.com/mikaelkrief/az-media-manager.git
cd az-media-manager

# Installer les dépendances
npm install
```

### 3. Configuration
```bash
# Copier et modifier le fichier de configuration
cp .env.example .env
# Éditer .env avec vos credentials Azure
```

### 4. Démarrage
```bash
# Démarrer l'application
npm start

# L'application sera accessible sur
# http://localhost:3000
```

### 5. Interface utilisateur
- 📄 **Liste des fichiers** : Tableau avec pagination (200 éléments par défaut)
- ⬆️ **Upload** : Drag & drop ou sélection de fichiers PDF (max 50MB)
- 📊 **Export Excel** : Export de la liste avec noms et URLs
- 🔗 **Liens directs** : Boutons pour ouvrir et copier les URLs
- 🗑️ **Suppression** : Suppression sécurisée avec confirmation

## ☁️ Configuration Azure

### 1. Storage Account
1. ✅ Créer un Storage Account Azure
2. ✅ Créer un container blob nommé `medias`
3. ✅ Créer le dossier `pdf` dans le container
4. ✅ Récupérer l'Access Key du Storage Account :
   - Aller dans le portail Azure
   - Ouvrir votre Storage Account
   - Aller dans "Clés d'accès" (Access keys)
   - Copier la "Clé" (Key) ou "Chaîne de connexion" (Connection string)

### 2. WebApp (pour déploiement)
```bash
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name mhl-media-manager \
  --runtime "NODE|20-lts" \
  --os-type Linux
```

> 💡 **Avantages de l'Access Key :**
> - Configuration plus simple (pas de Service Principal à créer)
> - Authentification directe avec le Storage Account
> - Moins de prérequis Azure AD

## 🚀 Déploiement Azure DevOps

### Pipeline automatisé
Le projet inclut un pipeline CI/CD (`azure-pipelines.yml`) avec :

**🔨 Build Stage :**
- Installation Node.js 20.x LTS
- Installation dépendances production (`npm ci`)
- Création archive de déploiement
- Publication artefacts

**🚀 Deploy Stage :**
- Déploiement Azure WebApp Linux
- Configuration variables d'environnement
- Redémarrage automatique

### Variables à configurer
```yaml
# Azure DevOps > Pipelines > Variables
azureSubscription: 'AzureServiceConnection'
webAppName: 'mhl-media-manager'
AZURE_STORAGE_ACCOUNT_NAME: 'dataakor'
AZURE_STORAGE_ACCOUNT_KEY: '***' # Variable secrète
AZURE_BLOB_CONTAINER_NAME: 'medias'
AZURE_UPLOAD_FOLDER: 'pdf'
```

## 🔧 Développement et debug

### Scripts npm
```bash
npm start          # Démarrer l'application
npm install        # Installer les dépendances
```

### Debugging
- 🌐 **Health check** : http://localhost:3000/health
- 🔍 **Console dev** : F12 dans le navigateur
- 📝 **Logs serveur** : Messages détaillés dans le terminal
- ⚠️ **Mode développement** : Erreurs complètes affichées

## 📞 Support et contribution

### 🐛 Signaler un bug
Créer une [issue GitHub](https://github.com/mikaelkrief/az-media-manager/issues) avec :
- Description du problème
- Étapes de reproduction
- Logs d'erreur
- Environnement (Node.js, navigateur)

### 🤝 Contribuer au projet
1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** les changements (`git commit -m 'Ajout: nouvelle fonctionnalité'`)
4. **Push** vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. **Ouvrir** une Pull Request

---

## 📄 License

Ce projet est sous **licence MIT** - voir [LICENSE](LICENSE) pour les détails.

**Développé avec ❤️ pour une gestion moderne des fichiers Azure Blob Storage**

## 🔌 API Endpoints

### 📄 Gestion des fichiers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/blobs` | Liste tous les fichiers avec métadonnées |
| `POST` | `/api/blobs` | Upload un fichier PDF (max 50MB) |
| `DELETE` | `/api/blobs/:blobName` | Supprime un fichier du storage |

### 🔧 Système
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Health check de l'application |
| `GET` | `/` | Interface web principale |

### 📊 Exemple de réponse API
```json
{
  "success": true,
  "files": [
    {
      "name": "pdf/document.pdf",
      "url": "https://dataakor.blob.core.windows.net/medias/pdf/document.pdf",
      "size": 1048576,
      "lastModified": "2025-10-30T10:30:00.000Z"
    }
  ]
}
```

## 📁 Structure du projet

```
mhl-media-manager/
├── 📂 public/                    # Frontend (interface utilisateur)
│   ├── 🌐 index.html            # Interface principale avec DataTables
│   └── 📂 js/
│       └── ⚡ app.js             # Logique frontend (MediaManager)
├── 📂 src/                      # Backend (API et services)
│   ├── 📂 routes/
│   │   └── 🛤️ blobRoutes.js      # Routes API REST
│   └── ☁️ azureBlobService.js    # Service Azure Blob Storage
├── 📂 .github/
│   └── 📂 instructions/         # Documentation technique
├── 🔧 server.js                 # Serveur Express principal
├── 📦 package.json              # Dépendances et scripts npm
├── 🚀 azure-pipelines.yml       # Pipeline CI/CD Azure DevOps
├── 🔐 .env                      # Configuration (non versionné)
└── 📖 README.md                 # Documentation
```

## 🛡️ Sécurité et fonctionnalités

### 🔒 Sécurité implémentée
- **Helmet.js** : Headers de sécurité HTTP
- **Rate Limiting** : Protection contre les attaques par déni de service
- **CORS** : Configuration Cross-Origin Resource Sharing
- **Validation de fichiers** : Seuls les PDF sont acceptés
- **Limitation de taille** : Maximum 50MB par fichier
- **CSP désactivé** : Configuration développement pour compatibilité CDN

### ✨ Fonctionnalités avancées
- **Drag & Drop** : Interface intuitive pour l'upload
- **Pagination intelligente** : 25, 50, 100, 200 éléments ou tous
- **Export Excel** : Export des listes avec JSZip et DataTables Buttons
- **Copie presse-papiers** : URLs directement copiables
- **Interface responsive** : Compatible mobile et desktop
- **Gestion d'erreurs** : Messages détaillés et logging complet

## Développement

### Scripts disponibles
```bash
npm start     # Démarrer en production
npm run dev   # Démarrer avec nodemon
npm test      # Lancer les tests (à implémenter)
```

### Contribution
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

Pour toute question ou problème, créer une issue dans le repository.

## License

Ce projet est sous licence MIT.