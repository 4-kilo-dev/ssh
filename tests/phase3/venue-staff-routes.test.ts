import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createSession } from "../../lib/auth/session";
import { GET as getStaff, POST as addStaff, PATCH as updateStaff, DELETE as removeStaff } from "@/app/api/venues/[id]/staff/route";
import { POST as transferOwnership } from "@/app/api/venues/[id]/transfer/route";
import { GET as getManagedVenue } from "@/app/api/venues/managed/route";

function makeReq(url: string, method: string, sessionToken: string, body?: any) {
  const init: RequestInit = {
    method,
    headers: {
      "authorization": `Bearer ${sessionToken}`,
      "cookie": `addisvenue_session=${sessionToken}`,
      "content-type": "application/json",
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

describe("Phase 3.5 — Venue Staff Route Handlers", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("handles staff lifecycle via HTTP routes: list, add, update, and transfer", async () => {
    // 1. Create owner and login session
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Abebe Owner",
      role: "venue_manager",
    });
    const ownerSession = await createSession(owner.id);

    const venue = await createVenue({
      managerId: owner.id,
      name: "Bole Luxury Event Hall",
      area: "Bole",
      type: "Hotel ballroom",
    });

    const routeParams = { params: Promise.resolve({ id: venue.id }) };

    // 2. GET /api/venues/[id]/staff
    const getRes = await getStaff(makeReq(`http://localhost/api/venues/${venue.id}/staff`, "GET", ownerSession.sessionToken), routeParams);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.staff.length).toBeGreaterThanOrEqual(1);
    expect(getData.staff[0].isPrimaryOwner).toBe(true);

    // 3. POST /api/venues/[id]/staff -> Add new staff member
    const addRes = await addStaff(
      makeReq(`http://localhost/api/venues/${venue.id}/staff`, "POST", ownerSession.sessionToken, {
        phone: "0912 998877",
        name: "Sara Assistant GM",
        role: "manager",
        title: "Assistant GM",
      }),
      routeParams
    );
    expect(addRes.status).toBe(201);
    const addData = await addRes.json();
    expect(addData.member.phone).toBe("+251912998877");
    expect(addData.member.role).toBe("manager");

    const saraAccountId = addData.member.accountId;

    // 4. Verify Sara can call GET /api/venues/managed and see her venue
    const saraSession = await createSession(saraAccountId);
    const managedRes = await getManagedVenue(makeReq(`http://localhost/api/venues/managed`, "GET", saraSession.sessionToken));
    expect(managedRes.status).toBe(200);
    const managedData = await managedRes.json();
    expect(managedData.venue?.id).toBe(venue.id);
    expect(managedData.role).toBe("manager");
    expect(managedData.isPrimaryOwner).toBe(false);

    // 5. PATCH /api/venues/[id]/staff -> Promote Sara or toggle status
    const patchRes = await updateStaff(
      makeReq(`http://localhost/api/venues/${venue.id}/staff`, "PATCH", ownerSession.sessionToken, {
        staffAccountId: saraAccountId,
        title: "Senior Vice President",
      }),
      routeParams
    );
    expect(patchRes.status).toBe(200);

    // 6. POST /api/venues/[id]/transfer -> Transfer primary ownership to Sara
    const transferRes = await transferOwnership(
      makeReq(`http://localhost/api/venues/${venue.id}/transfer`, "POST", ownerSession.sessionToken, {
        newOwnerPhoneOrId: "+251912998877",
      }),
      routeParams
    );
    expect(transferRes.status).toBe(200);
    const transferData = await transferRes.json();
    expect(transferData.venue.managerId).toBe(saraAccountId);

    // 7. Sara is now primary owner; Sara removes Abebe from staff
    const deleteRes = await removeStaff(
      makeReq(`http://localhost/api/venues/${venue.id}/staff?staffAccountId=${owner.id}`, "DELETE", saraSession.sessionToken),
      routeParams
    );
    expect(deleteRes.status).toBe(200);
  });
});
