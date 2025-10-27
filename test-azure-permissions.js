// Script de test des permissions Azure Blob Storage
require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { ClientSecretCredential } = require('@azure/identity');

async function testAzurePermissions() {
    console.log('=== TEST PERMISSIONS AZURE BLOB STORAGE ===\n');
    
    // 1. Vérifier les variables d'environnement
    console.log('1. Variables d\'environnement :');
    const requiredVars = [
        'AZURE_STORAGE_ACCOUNT_NAME',
        'AZURE_CLIENT_ID',
        'AZURE_CLIENT_SECRET',
        'AZURE_TENANT_ID',
        'AZURE_BLOB_CONTAINER_NAME'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('❌ Variables manquantes:', missingVars.join(', '));
        return;
    }
    
    requiredVars.forEach(varName => {
        console.log(`   ✅ ${varName}: ${process.env[varName] ? 'SET' : 'NOT SET'}`);
    });
    
    try {
        // 2. Créer les credentials
        console.log('\n2. Création des credentials...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID,
            process.env.AZURE_CLIENT_ID,
            process.env.AZURE_CLIENT_SECRET
        );
        console.log('   ✅ Credentials créés');
        
        // 3. Créer le client Blob Service
        console.log('\n3. Création du BlobServiceClient...');
        const accountUrl = `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
        console.log('   URL:', accountUrl);
        const blobServiceClient = new BlobServiceClient(accountUrl, credential);
        console.log('   ✅ BlobServiceClient créé');
        
        // 4. Tester l'accès au Storage Account
        console.log('\n4. Test d\'accès au Storage Account...');
        try {
            const accountInfo = await blobServiceClient.getAccountInfo();
            console.log('   ✅ Accès Storage Account OK');
            console.log('   SkuName:', accountInfo.skuName);
            console.log('   AccountKind:', accountInfo.accountKind);
        } catch (error) {
            console.error('   ❌ Erreur accès Storage Account:', error.message);
            if (error.statusCode === 403) {
                console.error('   💡 Solution: Attribuer le rôle "Storage Account Contributor" ou "Reader"');
            }
        }
        
        // 5. Tester l'accès au Container
        console.log('\n5. Test d\'accès au Container...');
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER_NAME);
        
        try {
            const exists = await containerClient.exists();
            console.log(`  ✅ Container "${process.env.AZURE_BLOB_CONTAINER_NAME}" existe:`, exists);
            
            if (!exists) {
                console.log('   Tentative de création du container...');
                await containerClient.create({
                    access: 'blob' // Public read access for blobs
                });
                console.log('   ✅ Container créé avec succès');
            } else {
                console.log('   ✅ Container accessible');
            }
        } catch (error) {
            console.error('   ❌ Erreur accès Container:', error.message);
            console.error('   Status Code:', error.statusCode);
            if (error.statusCode === 403) {
                console.error('   💡 Solution: Attribuer le rôle "Storage Blob Data Contributor"');
            }
        }
        
        // 6. Tester le listage des blobs
        console.log('\n6. Test de listage des blobs...');
        try {
            let blobCount = 0;
            for await (const blob of containerClient.listBlobsFlat()) {
                blobCount++;
                console.log(`   Blob ${blobCount}: ${blob.name}`);
                if (blobCount >= 5) {
                    console.log(`   ... et ${blobCount > 5 ? 'plus' : 'autres'} blobs`);
                    break;
                }
            }
            
            if (blobCount === 0) {
                console.log('   ℹ️  Aucun blob trouvé (container vide)');
            }
            console.log('   ✅ Listage des blobs OK');
        } catch (error) {
            console.error('   ❌ Erreur listage blobs:', error.message);
            console.error('   Status Code:', error.statusCode);
            if (error.statusCode === 403) {
                console.error('   💡 Solution: Attribuer le rôle "Storage Blob Data Reader" minimum');
            }
        }
        
        // 7. Recommandations
        console.log('\n7. Recommandations pour résoudre les erreurs:');
        console.log('   🔧 Commandes Azure CLI à exécuter:');
        console.log('');
        console.log('   # 1. Trouver le resource group');
        console.log(`   az storage account show --name ${process.env.AZURE_STORAGE_ACCOUNT_NAME} --query "resourceGroup" --output tsv`);
        console.log('');
        console.log('   # 2. Attribuer les rôles (remplacer YOUR_RG par le résultat ci-dessus)');
        console.log(`   az role assignment create \\`);
        console.log(`     --assignee "${process.env.AZURE_CLIENT_ID}" \\`);
        console.log(`     --role "Storage Blob Data Contributor" \\`);
        console.log(`     --scope "/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/YOUR_RG/providers/Microsoft.Storage/storageAccounts/${process.env.AZURE_STORAGE_ACCOUNT_NAME}"`);
        console.log('');
        console.log('   # 3. Optionnel: rôle pour voir le storage account');
        console.log(`   az role assignment create \\`);
        console.log(`     --assignee "${process.env.AZURE_CLIENT_ID}" \\`);
        console.log(`     --role "Reader" \\`);
        console.log(`     --scope "/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/YOUR_RG/providers/Microsoft.Storage/storageAccounts/${process.env.AZURE_STORAGE_ACCOUNT_NAME}"`);
        
    } catch (error) {
        console.error('\n❌ Erreur générale:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n=== FIN TEST ===');
}

// Exécuter le test
testAzurePermissions().catch(console.error);