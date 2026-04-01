import "dotenv/config";

/**
 * Simple Attio API test - just list records
 * Run with: bun run test-attio-simple.ts
 */

console.log("🧪 Testing Attio API - Simple List...\n");

const apiKey = process.env.ATTIO_API_KEY;
if (!apiKey) {
  console.error("❌ ATTIO_API_KEY not found");
  process.exit(1);
}

console.log("✅ API Key found\n");

/**
 * Test 1: List people (no filtering)
 */
async function testListPeople() {
  console.log("📋 Test 1: List People (first 5)");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects/people/records/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 5,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return null;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} people\n`);
    
    if (data.data && data.data.length > 0) {
      console.log("Sample person record structure:");
      console.log(JSON.stringify(data.data[0], null, 2));
      
      // Show what attributes are available
      console.log("\n📝 Available attributes in people:");
      if (data.data[0].values) {
        Object.keys(data.data[0].values).forEach(key => {
          console.log(`  - ${key}`);
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Test 2: List companies (no filtering)
 */
async function testListCompanies() {
  console.log("\n📋 Test 2: List Companies (first 5)");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects/companies/records/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 5,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:");
      console.error(errorText);
      return null;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} companies\n`);
    
    if (data.data && data.data.length > 0) {
      console.log("Sample company record structure:");
      console.log(JSON.stringify(data.data[0], null, 2));
      
      // Show what attributes are available
      console.log("\n📝 Available attributes in companies:");
      if (data.data[0].values) {
        Object.keys(data.data[0].values).forEach(key => {
          console.log(`  - ${key}`);
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Test 3: Get attributes for people object
 */
async function testGetPeopleAttributes() {
  console.log("\n📋 Test 3: Get People Object Attributes");
  
  try {
    const response = await fetch("https://api.attio.com/v2/objects/people/attributes", {
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
      return null;
    }

    const data = await response.json() as any;
    console.log(`✅ Success! Found ${data.data?.length || 0} attributes\n`);
    
    if (data.data && data.data.length > 0) {
      console.log("📝 Available attributes for People:");
      data.data.forEach((attr: any) => {
        console.log(`  - ${attr.api_slug} (${attr.title}) - Type: ${attr.type}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const people = await testListPeople();
  const companies = await testListCompanies();
  const attributes = await testGetPeopleAttributes();

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log("=".repeat(50));
  console.log(`List People:    ${people ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`List Companies: ${companies ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Get Attributes: ${attributes ? "✅ PASS" : "❌ FAIL"}`);
  
  if (people && companies) {
    console.log("\n🎉 Great! Attio API is working.");
    console.log("📝 Now we know the attribute structure and can build proper filters.");
  }
  
  console.log("=".repeat(50));
}

runTests().catch(console.error);
