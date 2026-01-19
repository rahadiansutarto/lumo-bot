import "dotenv/config";

/**
 * Check raw deals structure
 * Run with: bun run test-deals-raw.ts
 */

console.log("🔍 Checking Raw Deals Structure...\n");

const apiKey = process.env.ATTIO_API_KEY;

async function checkDealsStructure() {
  try {
    const response = await fetch("https://api.attio.com/v2/objects/deals/records/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 2, // Just get 2 deals to see structure
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return;
    }

    const data = await response.json() as any;
    console.log(`✅ Found ${data.data?.length || 0} deals\n`);
    
    if (data.data && data.data.length > 0) {
      console.log("First deal - FULL STRUCTURE:");
      console.log("=".repeat(50));
      console.log(JSON.stringify(data.data[0], null, 2));
      console.log("=".repeat(50));
      
      console.log("\n📝 Available attributes in deals:");
      if (data.data[0].values) {
        Object.keys(data.data[0].values).forEach(key => {
          const value = data.data[0].values[key];
          if (value && value.length > 0) {
            console.log(`  - ${key} (has data)`);
          } else {
            console.log(`  - ${key} (empty)`);
          }
        });
      }
    } else {
      console.log("No deals found in workspace.");
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
  }
}

checkDealsStructure();
