/**
 * Test the explore endpoint directly
 */

async function testExplore() {
  console.log("🧪 Testing explore endpoint...\n");

  try {
    const response = await fetch("http://localhost:3000/api/manga/explore?limit=10");
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    console.log("\nResponse data:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error("\n❌ Error:", data.error);
    } else if (data.data) {
      console.log(`\n✅ Got ${data.data.length} results`);
      if (data.data.length > 0) {
        console.log("\nFirst result:");
        console.log(JSON.stringify(data.data[0], null, 2));
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testExplore();

