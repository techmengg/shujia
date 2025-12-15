/**
 * Quick test script to verify MangaUpdates API is working
 */

async function testMangaUpdatesAPI() {
  console.log("🧪 Testing MangaUpdates API...\n");

  // Test 1: Simple search
  console.log("Test 1: Searching for 'One Piece'...");
  try {
    const searchResponse = await fetch("https://api.mangaupdates.com/v1/series/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        search: "One Piece",
        stype: "title",
        perpage: 5,
        page: 1,
      }),
    });

    if (!searchResponse.ok) {
      console.error(`❌ Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
      console.error(await searchResponse.text());
    } else {
      const searchData = await searchResponse.json();
      console.log(`✅ Search successful!`);
      console.log(`   Total hits: ${searchData.total_hits}`);
      console.log(`   Results returned: ${searchData.results?.length || 0}`);
      
      if (searchData.results && searchData.results.length > 0) {
        const first = searchData.results[0].record;
        console.log(`\n   First result:`);
        console.log(`   - ID: ${first.series_id}`);
        console.log(`   - Title: ${first.title}`);
        console.log(`   - Type: ${first.type}`);
        console.log(`   - Year: ${first.year}`);
        console.log(`   - Has image: ${!!first.image}`);
        if (first.image) {
          console.log(`   - Image URL: ${first.image.url?.thumb || first.image.url?.original}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Search error:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Get specific series
  console.log("Test 2: Getting series by ID (20 = One Piece)...");
  try {
    const seriesResponse = await fetch("https://api.mangaupdates.com/v1/series/20", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!seriesResponse.ok) {
      console.error(`❌ Series fetch failed: ${seriesResponse.status} ${seriesResponse.statusText}`);
      console.error(await seriesResponse.text());
    } else {
      const seriesData = await seriesResponse.json();
      console.log(`✅ Series fetch successful!`);
      console.log(`   ID: ${seriesData.series_id}`);
      console.log(`   Title: ${seriesData.title}`);
      console.log(`   Status: ${seriesData.status}`);
      console.log(`   Completed: ${seriesData.completed}`);
      console.log(`   Has image: ${!!seriesData.image}`);
      console.log(`   Authors: ${seriesData.authors?.length || 0}`);
    }
  } catch (error) {
    console.error("❌ Series fetch error:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Browse without filters (popular series)
  console.log("Test 3: Browsing popular series...");
  try {
    const browseResponse = await fetch("https://api.mangaupdates.com/v1/series/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        perpage: 10,
        page: 1,
        orderby: "rating",
      }),
    });

    if (!browseResponse.ok) {
      console.error(`❌ Browse failed: ${browseResponse.status} ${browseResponse.statusText}`);
      console.error(await browseResponse.text());
    } else {
      const browseData = await browseResponse.json();
      console.log(`✅ Browse successful!`);
      console.log(`   Total hits: ${browseData.total_hits}`);
      console.log(`   Results returned: ${browseData.results?.length || 0}`);
      
      if (browseData.results && browseData.results.length > 0) {
        console.log(`\n   Top 3 results:`);
        browseData.results.slice(0, 3).forEach((item: any, i: number) => {
          const rec = item.record;
          console.log(`   ${i + 1}. ${rec.title} (ID: ${rec.series_id})`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Browse error:", error);
  }
}

testMangaUpdatesAPI();

