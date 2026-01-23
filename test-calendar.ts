/**
 * Test Google Calendar Integration
 * 
 * This demonstrates how the calendar tool works with user authentication.
 * 
 * Note: This is a mock test. In production, users authenticate via OAuth flow.
 */

import { googleCalendar } from "./src/tools/googleCalendar";
import { getAuthorizationUrl } from "./src/auth/googleCalendar";

const MOCK_USER_ID = "U123456789"; // Example Slack user ID

async function testCalendarTool() {
  console.log("=== Google Calendar Tool Test ===\n");

  // Test 1: Try to list events without authentication
  console.log("Test 1: Attempting to list events (not authenticated)...");
  const result1 = await googleCalendar.execute({
    action: "list",
    userId: MOCK_USER_ID,
  });
  
  console.log("Result:", JSON.stringify(result1, null, 2));
  
  if (result1.authUrl) {
    console.log("\n📋 Authorization URL generated:");
    console.log(result1.authUrl);
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Test completed!");
  console.log("\nHow the real flow works:");
  console.log("1. User asks: 'Do I have any meetings today?'");
  console.log("2. Bot detects user needs authorization");
  console.log("3. Bot provides personalized auth link (includes user's Slack ID)");
  console.log("4. User clicks link → authorizes with Google (company email only)");
  console.log("5. OAuth server receives callback → stores tokens for that user");
  console.log("6. User asks again → Bot uses their tokens → Shows their calendar");
  console.log("\n🔒 Security Features:");
  console.log("- Each user sees only their own calendar");
  console.log("- Email domain restriction (company emails only)");
  console.log("- Tokens stored per Slack user ID");
  console.log("- Automatic token refresh when expired");
}

// Run test
testCalendarTool().catch(console.error);
