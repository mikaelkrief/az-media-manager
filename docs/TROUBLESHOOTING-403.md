# Guide de dépannage - Erreur 403 Upload

## Étapes de diagnostic

### 1. Vérifier la configuration Azure
Accédez à : `https://votre-app.azurewebsites.net/api/diagnostic`

Cette page vous montrera :
- Si toutes les variables d'environnement sont définies
- Les valeurs actuelles (masquées pour la sécurité)
- Les avertissements éventuels

### 2. Vérifier les variables Azure DevOps
Assurez-vous que ces variables sont définies dans votre pipeline Azure DevOps :

- `azureStorageAccountName` : Le nom de votre Storage Account
- `azureStorageAccountKey` : La clé d'accès (Key1 ou Key2)
- `azureBlobContainerName` : Le nom de votre container
- `serviceConnection` : Votre service connection Azure
- `webAppName` : Le nom de votre Azure WebApp

### 3. Vérifier les permissions Azure Storage

#### Dans le portail Azure :
1. **Storage Account > Access Keys**
   - Vérifiez que les clés sont activées
   - Copiez la bonne clé (Key1 ou Key2)

2. **Storage Account > Containers > [votre-container]**
   - Vérifiez que le container existe
   - Access level peut être "Private" (normal)

3. **Storage Account > Networking**
   - Si "Selected networks" est activé, ajoutez l'IP de votre Azure WebApp
   - Ou temporairement, activez "All networks" pour tester

### 4. Causes communes d'erreur 403

1. **Clé d'accès incorrecte ou expirée**
   - Régénérez une nouvelle clé dans le portail Azure
   - Mettez à jour la variable Azure DevOps
   - Redéployez l'application

2. **Restrictions réseau**
   - Le Storage Account peut bloquer l'accès depuis Azure WebApp
   - Vérifiez les règles de firewall du Storage Account

3. **Container inexistant**
   - Vérifiez que le container spécifié existe bien

4. **Nom du Storage Account incorrect**
   - Vérifiez l'orthographe exacte

### 5. Test en production
Après avoir vérifié la configuration, testez l'upload et consultez les logs :

```bash
# Logs Azure WebApp
az webapp log tail --name votre-app --resource-group votre-rg
```

Les logs montreront les détails de l'erreur avec nos nouveaux messages de diagnostic.

### 6. Solution temporaire de test
Pour tester rapidement, vous pouvez temporairement :

1. Activer "All networks" dans Storage Account > Networking
2. Vérifier que l'upload fonctionne
3. Si ça fonctionne, le problème était les restrictions réseau
4. Puis restreindre l'accès et ajouter l'IP correcte

### 7. Variables d'environnement à vérifier
```
AZURE_STORAGE_ACCOUNT_NAME=votre-storage-account
AZURE_STORAGE_ACCOUNT_KEY=votre-cle-dacces
AZURE_BLOB_CONTAINER_NAME=votre-container
AZURE_UPLOAD_FOLDER=medias/pdf
```