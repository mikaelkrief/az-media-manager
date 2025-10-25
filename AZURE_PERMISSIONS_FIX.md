# Résolution erreur Azure : "This request is not authorized to perform this operation"

## 🚨 **Erreur identifiée :**
```
Error: Failed to list blobs: This request is not authorized to perform this operation using this permission.
```

## 🔍 **Cause :**
Le Service Principal n'a pas les permissions suffisantes pour accéder au Blob Storage.

## ✅ **Solution : Attribuer les bons rôles RBAC**

### 1. **Rôles recommandés pour votre application :**

#### **Option A : Rôle complet (recommandé)**
```bash
# Storage Blob Data Contributor - Permet toutes les opérations
az role assignment create \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/dataakor"
```

#### **Option B : Permissions minimales**
```bash
# Storage Blob Data Reader - Pour lister et lire
az role assignment create \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/dataakor"

# Storage Blob Data Owner - Pour upload et delete (si nécessaire)
az role assignment create \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --role "Storage Blob Data Owner" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/dataakor"
```

### 2. **Commandes avec vos paramètres :**

#### **Remplacez YOUR_RESOURCE_GROUP par le nom de votre groupe de ressources :**

```bash
# 1. Trouver le nom du resource group
az storage account show --name dataakor --query "resourceGroup" --output tsv

# 2. Attribuer le rôle (remplacez RG_NAME par le résultat de la commande précédente)
az role assignment create \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/RG_NAME/providers/Microsoft.Storage/storageAccounts/dataakor"
```

### 3. **Alternative via le portail Azure :**

1. **Aller dans le Storage Account** `dataakor`
2. **Menu de gauche** → `Access Control (IAM)`
3. **Cliquer** sur `+ Add` → `Add role assignment`
4. **Sélectionner le rôle** : `Storage Blob Data Contributor`
5. **Assign access to** : `User, group, or service principal`
6. **Sélectionner** votre Service Principal
7. **Cliquer** `Review + assign`

### 4. **Vérification des permissions :**

```bash
# Vérifier les rôles attribués
az role assignment list \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/dataakor" \
  --output table
```

## 📋 **Rôles Azure Storage expliqués :**

| Rôle | Permissions | Usage |
|------|-------------|-------|
| **Storage Blob Data Contributor** | ✅ List, Read, Write, Delete | **Recommandé** pour votre app |
| **Storage Blob Data Owner** | ✅ Toutes + gestion ACL | Si vous avez besoin de permissions ACL |
| **Storage Blob Data Reader** | ✅ List, Read seulement | Si vous voulez juste lire |

## 🔧 **Commande rapide (tout-en-un) :**

```bash
# Remplacez YOUR_RESOURCE_GROUP par votre groupe de ressources
az role assignment create \
  --assignee "cf68d422-2f67-492c-91ba-9f2480a26f9f" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/8a7aace5-74aa-416f-b8e4-2c292b6304e5/resourceGroups/YOUR_RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/dataakor"
```

## ⏱️ **Temps de propagation :**
Les permissions peuvent prendre **5-10 minutes** pour se propager. Attendez un peu avant de retester.

## 🧪 **Test après attribution :**

1. **Redémarrer l'application :**
   ```bash
   npm start
   ```

2. **Tester l'API :**
   ```bash
   curl http://localhost:3000/api/blobs
   ```

3. **Vérifier dans l'interface :**
   http://localhost:3000/

## 🚨 **Si l'erreur persiste :**

1. **Vérifier que le container existe :**
   ```bash
   az storage container show --name medias --account-name dataakor
   ```

2. **Créer le container si nécessaire :**
   ```bash
   az storage container create --name medias --account-name dataakor
   ```

3. **Vérifier les variables d'environnement :**
   - AZURE_STORAGE_ACCOUNT_NAME=dataakor ✅
   - AZURE_BLOB_CONTAINER_NAME=medias ✅

---

**Action immédiate requise :** Exécuter la commande d'attribution de rôle ci-dessus avec votre nom de groupe de ressources.