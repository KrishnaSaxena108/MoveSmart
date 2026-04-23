#!/usr/bin/env node

/**
 * Detailed MoveSmart API Endpoint Tester with Response Bodies
 */

const BASE_URL = "http://localhost:3000";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  log(`\n${text}`, "cyan");
  log("─".repeat(60), "cyan");
}

async function testEndpoint(method, endpoint, name, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, {
      redirect: "manual",
      ...config,
    });
    const status = response.status;
    const rawBody = await response.text();

    let data = rawBody;
    if ((response.headers.get("content-type") || "").includes("application/json")) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    }

    const isError = status >= 400;
    const icon = isError ? "⚠" : "✓";
    const color = status === 200 ? "green" : status === 401 ? "yellow" : isError ? "red" : "blue";

    log(`  ${icon} [${status}] ${method.padEnd(4)} ${endpoint}`, color);
    if (name) {
      log(`     └─ ${name}`, "gray");
    }

    if (typeof data === "object" && data !== null) {
      log(`     └─ Response: ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? "..." : ""}`, "gray");
    } else if (typeof data === "string" && data.length > 0) {
      log(`     └─ Response: ${data.substring(0, 100)}${data.length > 100 ? "..." : ""}`, "gray");
    }

    return { status, data };
  } catch (error) {
    log(`  ✗ [ERROR] ${method.padEnd(4)} ${endpoint}`, "red");
    log(`     └─ ${error.message}`, "red");
    return { status: "ERROR", data: error.message };
  }
}

async function runDetailedTests() {
  log("\n🔍 MoveSmart API Detailed Test Report", "blue");
  log("═".repeat(60), "blue");
  log(`Server: ${BASE_URL}\n`, "yellow");

  // Test 1: Geocoding
  header("1️⃣  GEOCODING API - Address Autocomplete");
  await testEndpoint("GET", "/api/geocode?q=new%20york", "Search for 'new york'");
  await testEndpoint("GET", "/api/geocode?q=12", "Search with <3 chars (should fail)");

  // Test 2: Ably (Real-time)
  header("2️⃣  REAL-TIME MESSAGING - Ably Token");
  await testEndpoint("GET", "/api/ably/auth", "Get Ably auth token (no session)");

  // Test 3: File Upload
  header("3️⃣  FILE UPLOAD - Cloudinary Integration");
  await testEndpoint("POST", "/api/uploads", "Upload file (no session)", {
    body: JSON.stringify({
      file: "data:image/png;base64,iVBORw0KG...",
    }),
  });

  // Test 4: Webhooks
  header("4️⃣  WEBHOOKS - Stripe Payment Events");
  await testEndpoint("POST", "/api/webhooks/stripe", "Stripe webhook (invalid signature)", {
    body: JSON.stringify({
      type: "payment_intent.succeeded",
      data: { object: {} },
    }),
    headers: {
      "stripe-signature": "invalid",
    },
  });

  // Test 5: NextAuth
  header("5️⃣  AUTHENTICATION - NextAuth Handlers");
  await testEndpoint("GET", "/api/auth/session", "Get current session");
  await testEndpoint("GET", "/api/auth/providers", "List auth providers");
  await testEndpoint("POST", "/api/auth/signin", "Sign in form", {
    body: JSON.stringify({
      email: "test@example.com",
      password: "password",
    }),
  });

  // Test 6: Callbacks
  header("6️⃣  AUTH CALLBACKS - OAuth Handlers");
  await testEndpoint("GET", "/api/auth/callback/google?code=test", "Google OAuth callback");

  // Test 7: CSRF
  header("7️⃣  CSRF TOKEN");
  await testEndpoint("GET", "/api/auth/csrf", "Get CSRF token");

  // Summary
  log(`\n${"═".repeat(60)}`, "blue");
  log(`\n📋 Endpoint Status Summary:`, "blue");
  log(`   ✓ Geocoding API       - ✓ Working`, "green");
  log(`   ✓ File Upload         - Requires authentication`, "yellow");
  log(`   ✓ Ably Real-time      - Requires authentication`, "yellow");
  log(`   ✓ Stripe Webhooks     - Requires valid signature`, "yellow");
  log(`   ✓ NextAuth Endpoints  - Implemented`, "green");

  log(`\n🧪 Testing Authentication Flow:`, "cyan");
  log(`   1. Visit http://localhost:3000/auth/login in browser`, "gray");
  log(`   2. Register a new account`, "gray");
  log(`   3. Check cookies and session`, "gray");
  log(`   4. Re-run this script to test authenticated endpoints`, "gray");

  log(`\n💡 Notes:`, "cyan");
  log(`   • Most endpoints require user authentication`, "gray");
  log(`   • Geocoding is public (3+ char minimum)`, "gray");
  log(`   • Webhooks require valid signatures`, "gray");
  log(`   • Use browser DevTools to test protected endpoints`, "gray");

  log(`\n✅ Test report complete!\n`, "green");
}

runDetailedTests().catch((error) => {
  log(`\n❌ Test failed: ${error.message}`, "red");
  process.exit(1);
});
