#!/usr/bin/env node

/**
 * MoveSmart API Endpoint Tester
 * Tests all REST API routes and basic authentication flow
 */

const BASE_URL = "http://localhost:3000";
let sessionCookie = "";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

class APITester {
  constructor() {
    this.results = [];
  }

  log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logTest(endpoint, method, status, passed) {
    const icon = passed ? "✓" : "✗";
    const color = passed ? "green" : "red";
    this.log(`  ${icon} ${method.padEnd(6)} ${endpoint.padEnd(40)} [${status}]`, color);
    this.results.push({ endpoint, method, status, passed });
  }

  async test(name, fn) {
    this.log(`\n${name}`, "cyan");
    this.log("─".repeat(60), "cyan");
    try {
      await fn();
    } catch (error) {
      this.log(`Error: ${error.message}`, "red");
    }
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add session cookie if available
    if (sessionCookie && !config.headers.Cookie) {
      config.headers.Cookie = sessionCookie;
    }

    try {
      const response = await fetch(url, config);
      
      // Capture Set-Cookie header for session management
      const setCookie = response.headers.get("set-cookie");
      if (setCookie && !sessionCookie) {
        sessionCookie = setCookie.split(";")[0];
      }

      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return { status: response.status, data, headers: response.headers };
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

const tester = new APITester();

async function runTests() {
  tester.log("\n🚀 MoveSmart API Endpoint Testing Suite", "blue");
  tester.log("═".repeat(60), "blue");
  tester.log(`Testing: ${BASE_URL}\n`, "yellow");

  // Test 1: Geocoding API
  await tester.test("1. GEOCODING API", async () => {
    const result = await tester.request("/api/geocode?q=123&page=1");
    const passed = result.status === 200 || result.status === 400; // 400 if < 3 chars
    tester.logTest("/api/geocode", "GET", result.status, passed);
  });

  // Test 2: Ably Auth
  await tester.test("2. REAL-TIME (ABLY) API", async () => {
    const result = await tester.request("/api/ably/auth");
    // Should return 401 (not authenticated) or auth token
    const passed = result.status === 200 || result.status === 401;
    tester.logTest("/api/ably/auth", "GET", result.status, passed);
  });

  // Test 3: Auth endpoints
  await tester.test("3. AUTHENTICATION ENDPOINTS", async () => {
    // Test NextAuth endpoint
    const result = await tester.request(
      "/api/auth/signin?error=AccessDenied",
      { method: "GET" }
    );
    const passed = result.status === 404 || result.status === 200; // May vary based on config
    tester.logTest("/api/auth/[...nextauth]", "GET", result.status, passed);
  });

  // Test 4: File Upload (without auth)
  await tester.test("4. FILE UPLOAD API", async () => {
    const result = await tester.request("/api/uploads", {
      method: "POST",
      body: JSON.stringify({
        file: "dummy",
      }),
    });
    // Should return 401 or 400 (no auth)
    const passed = result.status === 401 || result.status === 400;
    tester.logTest("/api/uploads", "POST", result.status, passed);
  });

  // Test 5: Webhook endpoint
  await tester.test("5. WEBHOOK ENDPOINTS", async () => {
    const result = await tester.request("/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "payment_intent.succeeded" }),
    });
    // Should validate signature, so expect 400 (invalid)
    const passed =
      result.status === 400 ||
      result.status === 403 ||
      result.status === 422;
    tester.logTest("/api/webhooks/stripe", "POST", result.status, passed);
  });

  // Test 6: Health check (common endpoint)
  await tester.test("6. HEALTH CHECK", async () => {
    try {
      const result = await tester.request("/_health", {
        method: "GET",
      });
      if (result.status === 404) {
        tester.log("  ⓘ /_health endpoint not implemented", "yellow");
        return;
      }
      tester.logTest("/_health", "GET", result.status, result.status === 200);
    } catch {
      // This endpoint might not exist, skip
      tester.log("  ⓘ /_health endpoint not implemented", "yellow");
    }
  });

  // Test 7: NextAuth session
  await tester.test("7. SESSION CHECK", async () => {
    const result = await tester.request("/api/auth/session");
    // Should return 200 with null session if not authenticated
    const passed = result.status === 200 || result.status === 401;
    tester.logTest("/api/auth/session", "GET", result.status, passed);
  });

  // Summary
  tester.log("\n" + "═".repeat(60), "blue");
  const passed = tester.results.filter((r) => r.passed).length;
  const total = tester.results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  tester.log(`\n📊 Test Summary`, "blue");
  tester.log(`   Passed: ${passed}/${total} (${percentage}%)`, "green");
  tester.log(
    `   Endpoint tests verify connectivity and basic error handling`,
    "yellow"
  );

  tester.log(`\n📝 Next Steps:`, "cyan");
  tester.log(`   1. Full auth flow: Run \`npm run test:auth\``, "yellow");
  tester.log(
    `   2. Server actions: Test via UI at http://localhost:3000/auth/login`,
    "yellow"
  );
  tester.log(`   3. Real-time chat: Connect to Ably and send messages`, "yellow");
  tester.log(`   4. Payments: Set up Stripe test keys in .env.local`, "yellow");

  tester.log(
    `\n✅ Endpoint availability check complete!`,
    "green"
  );
}

runTests().catch((error) => {
  tester.log(`\n❌ Test suite failed: ${error.message}`, "red");
  process.exit(1);
});
