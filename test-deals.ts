import "dotenv/config";
import { attio } from "./src/tools/attio";

/**
 * Quick test for deals
 * Run with: bun run test-deals.ts
 */

console.log("🧪 Testing Deals...\n");

async function testDeals() {
  try {
    const result = await attio.execute({
      action: "list_deals",
    });
    
    console.log(`✅ Success!`);
    console.log(`Found ${result.count} deals (fetched ${result.total_fetched} total)\n`);
    
    if (result.results.length > 0) {
      console.log("Deals:");
      result.results.forEach((deal: any, idx: number) => {
        console.log(`\n${idx + 1}. ${deal.name}`);
        console.log(`   Stage: ${deal.stage || 'N/A'}`);
        console.log(`   Value: ${deal.value || 'N/A'}`);
        console.log(`   Confidence: ${deal.confidence || 'N/A'}`);
        console.log(`   Business Function: ${deal.business_function || 'N/A'}`);
        console.log(`   Geography: ${deal.geography || 'N/A'}`);
        console.log(`   Business Unit: ${deal.business_unit || 'N/A'}`);
        console.log(`   Entity: ${deal.entity || 'N/A'}`);
        console.log(`   Playbook: ${deal.playbook || 'N/A'}`);
        console.log(`   Delivered: ${deal.delivered || 'N/A'}`);
        console.log(`   Source of Lead: ${deal.source_of_lead || 'N/A'}`);
        console.log(`   Company: ${deal.associated_company || 'N/A'}`);
      });
    } else {
      console.log("No deals found in your Attio workspace.");
    }
    
    console.log("\n🎉 Deals integration working!");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
  }
}

testDeals();
