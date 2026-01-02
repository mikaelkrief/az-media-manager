// Simple test to verify YouTube service functionality
const youtubeService = require('./src/youtubeService');

console.log('🧪 Testing YouTube Service...\n');

async function runTests() {
  try {
    console.log('✅ YouTube service loaded successfully');
    console.log('📊 Service initialized with:');
    console.log('   - Storage Account:', youtubeService.storageAccountName);
    console.log('   - Container:', youtubeService.containerName);
    console.log('   - Catalog Blob:', youtubeService.catalogBlobName);
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🔍 Testing catalog read...');
    const { data, etag } = await youtubeService.readYoutubeCatalog();
    console.log('✅ Catalog read successfully');
    console.log('   - Version:', data.version);
    console.log('   - Items count:', data.items.length);
    console.log('   - ETag:', etag.substring(0, 20) + '...');
    console.log('   - Last updated:', data.updatedAt);
    
    console.log('\n✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test the API: curl http://localhost:3000/api/youtube-videos');
    console.log('   3. Create a video: curl -X POST http://localhost:3000/api/youtube-videos \\');
    console.log('      -H "Content-Type: application/json" \\');
    console.log('      -d \'{"youtubeId":"dQw4w9WgXcQ","title":"Test Video","isPublished":true}\'');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Possible solutions:');
    console.error('   - Check your .env file is configured correctly');
    console.error('   - Verify Azure Storage credentials are valid');
    console.error('   - Ensure the container exists in your Storage Account');
    process.exit(1);
  }
}

runTests();
