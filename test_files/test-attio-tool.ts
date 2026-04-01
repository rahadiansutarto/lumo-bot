import "dotenv/config";
import { attio } from "../src/tools/attio";

/**
 * Test the Attio tool directly (without LLM)
 * Run with: bun run test-attio-tool.ts
 */

console.log("🧪 Testing Attio Tool Integration...\n");

async function runTests() {
  console.log("=".repeat(50));
  console.log("Test 1: List all people");
  console.log("=".repeat(50));
  
  try {
    const result1 = await attio.execute({
      action: "list_people",
    });
    
    console.log(`✅ Success!`);
    console.log(`Found ${result1.count} people (fetched ${result1.total_fetched} total)`);
    console.log("\nFirst 3 results:");
    result1.results.slice(0, 3).forEach((person: any, idx: number) => {
      console.log(`\n${idx + 1}. ${person.name}`);
      console.log(`   Email: ${person.email || 'N/A'}`);
      console.log(`   Job: ${person.job_title || 'N/A'}`);
    });
  } catch (error) {
    console.error("❌ Failed:", error instanceof Error ? error.message : error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test 2: Search for people with 'nicholas'");
  console.log("=".repeat(50));
  
  try {
    const result2 = await attio.execute({
      action: "search_people",
      query: "nicholas",
    });
    
    console.log(`✅ Success!`);
    console.log(`Found ${result2.count} matching people`);
    console.log("\nResults:");
    result2.results.forEach((person: any, idx: number) => {
      console.log(`\n${idx + 1}. ${person.name}`);
      console.log(`   Email: ${person.email || 'N/A'}`);
      console.log(`   Job: ${person.job_title || 'N/A'}`);
    });
  } catch (error) {
    console.error("❌ Failed:", error instanceof Error ? error.message : error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test 3: List all companies");
  console.log("=".repeat(50));
  
  try {
    const result3 = await attio.execute({
      action: "list_companies",
    });
    
    console.log(`✅ Success!`);
    console.log(`Found ${result3.count} companies (fetched ${result3.total_fetched} total)`);
    console.log("\nFirst 5 results:");
    result3.results.slice(0, 5).forEach((company: any, idx: number) => {
      console.log(`\n${idx + 1}. ${company.name}`);
      console.log(`   Domain: ${company.domains || 'N/A'}`);
      console.log(`   Location: ${company.location || 'N/A'}`);
    });
  } catch (error) {
    console.error("❌ Failed:", error instanceof Error ? error.message : error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test 4: Search companies with 'inc'");
  console.log("=".repeat(50));
  
  try {
    const result4 = await attio.execute({
      action: "search_companies",
      query: "inc",
    });
    
    console.log(`✅ Success!`);
    console.log(`Found ${result4.count} matching companies`);
    console.log("\nResults:");
    result4.results.forEach((company: any, idx: number) => {
      console.log(`${idx + 1}. ${company.name}`);
    });
  } catch (error) {
    console.error("❌ Failed:", error instanceof Error ? error.message : error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Tool testing complete!");
  console.log("=".repeat(50));
  console.log("\n✅ If all tests passed, the tool is ready to integrate with LLM!");
}

runTests().catch(console.error);
