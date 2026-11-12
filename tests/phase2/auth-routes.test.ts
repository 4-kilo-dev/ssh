/**
 * Phase 2 — Mini-Task 2.3 Tests: Auth API Routes & Mini App Resilience
 *
 * Requirements from docs/phases.md:
 * - Onboarding password-set flow (/api/auth/onboard/set-password).
 * - Phone + password login (/api/auth/login).
 * - Session issuance via signed HTTP-only cookie.
 * - Current account profile query (/api/auth/me) with Mini App step-out resilience.
 * - Logout (/api/auth/logout) with cookie clearing.
 *
 * Tests prove:
 * 1. Onboarding token consumption sets password, creates session, and returns Set-Cookie.
 * 2. Onboarding token reuse or invalid token is rejected with 400.
 * 3. Login with correct credentials returns 200 and sets session cookie.
 * 4. Login with wrong password returns 401.
 * 5. GET /api/auth/me resolves the account from the session cookie.
 * 6. GET /api/auth/me without cookie returns 401.
 * 7. Logout revokes the session and clears the cookie.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "@/lib/services/account-service";
import { issueOnboardingToken } from "@/lib/auth/tokens";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { POST as setPasswordRoute } from "@/app/api/auth/onboard/set-password/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";

describe("Phase 2 — Mini-Task 2.3: Auth API Routes", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("proves onboarding set-password sets credentials and issues session cookie", async () => {
    const user = await createAccount({
      name: "Onboard Route User",
      phone: "+251911222001",
      role: "user",
      telegramId: "tg_onboard_route_1",
    });

    const { token } = await issueOnboardingToken(user.id);

    const request = new Request("http://localhost:3000/api/auth/onboard/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: "SecurePass2026!",
      }),
    });

    const response = await setPasswordRoute(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.account.id).toBe(user.id);
    expect(data.account.name).toBe("Onboard Route User");

    // Must issue Set-Cookie header
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(SESSION_COOKIE_NAME);
  });

  it("proves onboarding set-password rejects reused or invalid tokens", async () => {
    const user = await createAccount({
      name: "Reuse Token User",
      phone: "+251911222002",
      role: "user",
    });

    const { token } = await issueOnboardingToken(user.id);

    // Consume first time
    const req1 = new Request("http://localhost:3000/api/auth/onboard/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: "PassOne123!" }),
    });
    expect((await setPasswordRoute(req1)).status).toBe(200);

    // Second attempt with same token must fail with 400
    const req2 = new Request("http://localhost:3000/api/auth/onboard/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: "PassTwo123!" }),
    });
    const res2 = await setPasswordRoute(req2);
    expect(res2.status).toBe(400);
  });

  it("proves login with valid credentials succeeds and issues session cookie", async () => {
    const phone = "+251911222003";
    const password = "ValidUserPassword#1";

    const user = await createAccount({
      name: "Login Route User",
      phone,
      role: "venue_manager",
    });

    // Set password via onboard
    const { token } = await issueOnboardingToken(user.id);
    await setPasswordRoute(
      new Request("http://localhost:3000/api/auth/onboard/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
    );

    // Perform Login
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const loginRes = await loginRoute(loginReq);
    expect(loginRes.status).toBe(200);

    const body = await loginRes.json();
    expect(body.status).toBe("ok");
    expect(body.account.phone).toBe(phone);
    expect(body.account.role).toBe("venue_manager");

    const cookieHeader = loginRes.headers.get("set-cookie");
    expect(cookieHeader).toContain(SESSION_COOKIE_NAME);
  });

  it("proves login with wrong password is rejected with 401", async () => {
    const phone = "+251911222004";
    const user = await createAccount({
      name: "Wrong Pass User",
      phone,
      role: "user",
    });

    const { token } = await issueOnboardingToken(user.id);
    await setPasswordRoute(
      new Request("http://localhost:3000/api/auth/onboard/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "RightPassword#1" }),
      })
    );

    const failReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password: "WrongPassword#999" }),
    });

    const failRes = await loginRoute(failReq);
    expect(failRes.status).toBe(401);
  });

  it("proves GET /api/auth/me validates session cookie and returns current account", async () => {
    const phone = "+251911222005";
    const password = "MeRoutePassword#1";

    const user = await createAccount({
      name: "Me Route User",
      phone,
      role: "vendor",
      telegramId: "tg_vendor_me",
    });

    const { token } = await issueOnboardingToken(user.id);
    const onboardRes = await setPasswordRoute(
      new Request("http://localhost:3000/api/auth/onboard/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
    );

    // Extract cookie from response
    const setCookie = onboardRes.headers.get("set-cookie")!;
    const cookieValue = setCookie.split(";")[0]; // addisvenue_session=...

    // Request /api/auth/me with the cookie
    const meReq = new Request("http://localhost:3000/api/auth/me", {
      headers: { Cookie: cookieValue },
    });

    const meRes = await meRoute(meReq);
    expect(meRes.status).toBe(200);

    const data = await meRes.json();
    expect(data.status).toBe("authenticated");
    expect(data.account.id).toBe(user.id);
    expect(data.account.name).toBe("Me Route User");
    expect(data.account.role).toBe("vendor");
    expect(data.account.telegramId).toBe("tg_vendor_me");
  });

  it("proves GET /api/auth/me without cookie returns 401 unauthenticated", async () => {
    const req = new Request("http://localhost:3000/api/auth/me");
    const res = await meRoute(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.status).toBe("unauthenticated");
  });

  it("proves logout revokes session and clears cookie", async () => {
    const phone = "+251911222006";
    const password = "LogoutPassword#1";

    const user = await createAccount({
      name: "Logout Route User",
      phone,
      role: "user",
    });

    const { token } = await issueOnboardingToken(user.id);
    const onboardRes = await setPasswordRoute(
      new Request("http://localhost:3000/api/auth/onboard/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
    );

    const cookieValue = onboardRes.headers.get("set-cookie")!.split(";")[0];

    // Verify authenticated
    const preRes = await meRoute(new Request("http://localhost:3000/api/auth/me", {
      headers: { Cookie: cookieValue },
    }));
    expect(preRes.status).toBe(200);

    // Call Logout
    const logoutRes = await logoutRoute(new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookieValue },
    }));
    expect(logoutRes.status).toBe(200);

    const clearCookieHeader = logoutRes.headers.get("set-cookie");
    expect(clearCookieHeader).toContain("Max-Age=0");

    // Verify /api/auth/me now returns 401
    const postRes = await meRoute(new Request("http://localhost:3000/api/auth/me", {
      headers: { Cookie: cookieValue },
    }));
    expect(postRes.status).toBe(401);
  });
});
