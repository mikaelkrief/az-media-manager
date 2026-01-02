// Test script to check YouTube catalog
require('dotenv').config();
const youtubeService = require('./src/youtubeService');

async function testCatalog() {
  try {
    console.log('=== Testing YouTube Catalog ===\n');
    
    // Wait for service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // List all videos
    console.log('📋 Listing all videos...');
    const videos = await youtubeService.listVideos();
    console.log(`Found ${videos.length} videos\n`);
    
    videos.forEach((video, index) => {
      console.log(`Video #${index + 1}:`);
      console.log(`  ID: ${video.id}`);
      console.log(`  YouTube ID: ${video.youtubeId}`);
      console.log(`  Title: ${video.title}`);
      console.log(`  Description: ${video.description.substring(0, 50)}${video.description.length > 50 ? '...' : ''}`);
      console.log(`  Tags: ${video.tags.join(', ')}`);
      console.log(`  Published: ${video.isPublished}`);
      console.log(`  Created: ${video.createdAt}`);
      console.log(`  Player URL: http://localhost:3000/player/player.html?id=${video.id}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCatalog();
