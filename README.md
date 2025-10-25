# MHL Media Manager

Application web de gestion de fichiers pour Azure Blob Storage, développée en Node.js avec une interface Bootstrap.

## Fonctionnalités

- **Gestion de fichiers PDF** : Upload, visualisation, suppression
- **Système de tags** : Ajout, modification et suppression de tags pour chaque fichier
- **Interface moderne** : Bootstrap 5 avec DataTables pour la navigation
- **Sécurité** : Authentification via Service Principal Azure
- **Déploiement** : Pipeline Azure DevOps pour Azure WebApp Linux

## Technologies utilisées

- **Backend** : Node.js 18+ LTS, Express, Azure SDK
- **Frontend** : HTML5, Bootstrap 5, jQuery, DataTables
- **Cloud** : Azure Blob Storage, Azure WebApp Linux
- **CI/CD** : Azure DevOps Pipelines

## Prérequis

### Azure Resources
1. **Azure Storage Account**
2. **Azure App Registration** (Service Principal)
3. **Azure WebApp Linux** (optionnel pour le déploiement)

### Variables d'environnement requises
```env
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=your-service-principal-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_BLOB_CONTAINER_NAME=your-container-name
AZURE_UPLOAD_FOLDER=your-upload-folder
PORT=3000
NODE_ENV=production
```

## Installation locale

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd mhl-media-manager
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration**
   ```bash
   cp .env.example .env
   # Éditer le fichier .env avec vos valeurs Azure
   ```

4. **Démarrer l'application**
   ```bash
   # Mode développement
   npm run dev
   
   # Mode production
   npm start
   ```

5. **Accéder à l'application**
   ```
   http://localhost:3000
   ```

## Configuration Azure

### 1. Service Principal

Créer un Service Principal avec les permissions suivantes sur le Storage Account :
- `Storage Blob Data Contributor`

```bash
# Créer le Service Principal
az ad sp create-for-rbac --name "mhl-media-manager-sp" --role "Storage Blob Data Contributor" --scopes "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Storage/storageAccounts/{storage-account}"
```

### 2. Storage Account

1. Créer un container blob
2. Configurer l'accès public si nécessaire
3. Noter le nom du Storage Account

### 3. WebApp (optionnel)

Pour le déploiement :
```bash
az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name myApp --runtime "NODE|18-lts" --os-type Linux
```

## Déploiement avec Azure DevOps

1. **Configurer les variables dans Azure DevOps** :
   - `azureSubscription` : Nom de la connexion de service Azure
   - `webAppName` : Nom de l'Azure WebApp
   - Variables secrètes pour les credentials Azure

2. **Pipeline automatique** :
   - Déclenchement sur push vers `main`
   - Build avec Node.js 18
   - Déploiement sur Azure WebApp Linux

## API Endpoints

### Fichiers
- `GET /api/blobs` - Liste tous les fichiers
- `POST /api/blobs` - Upload un fichier
- `DELETE /api/blobs/:blobName` - Supprime un fichier
- `GET /api/blobs/:blobName` - Détails d'un fichier

### Tags
- `GET /api/blobs/:blobName/tags` - Récupère les tags d'un fichier
- `PUT /api/blobs/:blobName/tags` - Met à jour les tags d'un fichier

### Système
- `GET /health` - Health check de l'application

## Structure du projet

```
mhl-media-manager/
├── public/                 # Fichiers statiques (frontend)
│   ├── index.html         # Interface principale
│   └── js/
│       └── app.js         # Logique frontend
├── src/                   # Code backend
│   ├── routes/
│   │   └── blobRoutes.js  # Routes API
│   └── azureBlobService.js # Service Azure Blob
├── .github/
│   └── instructions/      # Instructions du projet
├── server.js              # Serveur Express principal
├── package.json           # Dépendances et scripts
├── azure-pipelines.yml    # Pipeline CI/CD
└── .env.example           # Template de configuration
```

## Sécurité

- Helmet.js pour les headers de sécurité
- Rate limiting pour éviter les abus
- CORS configuré
- Validation des types de fichiers (PDF uniquement)
- Limitation de taille de fichier (50MB)

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