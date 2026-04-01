import "dotenv/config";

/**
 * Test script to verify Attio API connection
 * Run with: bun run test-attio.ts
 */

console.log("🧪 Testing Attio API Connection...\n");

// Check environment variable
const apiKey = process.env.ATTIO_API_KEY;
if (!apiKey) {
  console.error("❌ ATTIO_API_KEY not found in environment variables");
  console.error("Please add ATTIO_API_KEY=your_key to .env file");
  process.exit(1);
}

console.log("✅ ATTIO_API_KEY found");
console.log(`Key preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`);

/**
 * Test 1: Search for people
 */
async function testSearchPeople() {
  console.log("📋 Test 1: Search People");
  console.log("Searching for people with query 'a'...");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects/people/records/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          attribute: {
            slug: "name",
          },
          query: {
            $contains: "a",
          },
        },
        limit: 5,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return false;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} people`);
    
    if (data.data && data.data.length > 0) {
      console.log("\nSample results:");
      data.data.slice(0, 2).forEach((person: any, index: number) => {
        console.log(`  ${index + 1}. ${JSON.stringify(person.values, null, 2)}`);
      });
    } else {
      console.log("  (No people found with 'a' in name)");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 2: Search for companies
 */
async function testSearchCompanies() {
  console.log("\n📋 Test 2: Search Companies");
  console.log("Searching for companies with query 'inc'...");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects/companies/records/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          attribute: {
            slug: "name",
          },
          query: {
            $contains: "inc",
          },
        },
        limit: 5,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return false;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} companies`);
    
    if (data.data && data.data.length > 0) {
      console.log("\nSample results:");
      data.data.slice(0, 2).forEach((company: any, index: number) => {
        console.log(`  ${index + 1}. ${JSON.stringify(company.values, null, 2)}`);
      });
    } else {
      console.log("  (No companies found with 'inc' in name)");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 3: List all objects (to see what's available in your workspace)
 */
async function testListObjects() {
  console.log("\n📋 Test 3: List Available Objects");
  console.log("Fetching your Attio workspace objects...");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return false;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} object types`);
    
    if (data.data && data.data.length > 0) {
      console.log("\nAvailable objects in your workspace:");
      data.data.forEach((obj: any) => {
        console.log(`  - ${obj.api_slug} (${obj.singular_noun})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const results = {
    people: await testSearchPeople(),
    companies: await testSearchCompanies(),
    objects: await testListObjects(),
  };

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary:");
  console.log("=".repeat(50));
  console.log(`People Search:    ${results.people ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Companies Search: ${results.companies ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`List Objects:     ${results.objects ? "✅ PASS" : "❌ FAIL"}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log("\n🎉 All tests passed! Attio API is working correctly.");
    console.log("You can now integrate this with your LLM tool.");
  } else {
    console.log("\n⚠️  Some tests failed. Check your API key and permissions.");
  }
  
  console.log("=".repeat(50));
}

// Run the tests
runTests().catch(console.error);
