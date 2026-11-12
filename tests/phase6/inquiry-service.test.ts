/**
 * Phase 6 — Mini-Task 6.1: Venue Inquiry Conversation Service Integration Tests
 *
 * Requirements from docs/phases.md & docs/assumptions-and-schema.md:
 * 1. Inquiry Conversation:
 *    - Tied to a customer and a venue manager (over a specific venue).
 *    - Serves as the pre-booking discovery/clarification channel.
 * 2. Message Records & Attribution:
 *    - Messages are explicitly attributed to their sender (customer or manager).
 *    - Returned in strict chronological order (ascending by created_at).
 *    - Content must not be empty or blank.
 * 3. Strict Read & Write Authorization:
 *    - Only the two participating parties (customer and venue manager) can send messages.
 *    - Third parties (foreign customers, foreign managers) are strictly rejected with 403 / unauthorized error.
 *    - Privacy invariant: Super admin can inspect conversation metadata (parties, timestamps),
 *      but private message bodies are excluded from super admin view.
 * 4. Scoped Listing:
 *    - Customer queries return only conversations they started.
 *    - Manager queries return only conversations for venues they manage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import {
  createConversation,
  sendMessage,
  getConversationById,
  getConversationMessages,
  listConversationsForAccount,
} from "../../lib/services/inquiry-service";

describe("Phase 6 — Mini-Task 6.1: Venue Inquiry Conversation Service Layer", () => {
  let customerAId: string;
  let customerBId: string;
  let managerAId: string;
  let managerBId: string;
  let adminId: string;
  let venueAId: string;
  let venueBId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Customers
    const custA = await createAccount({
      phone: "+251917000001",
      name: "Customer Almaz",
      role: "user",
    });
    customerAId = custA.id;

    const custB = await createAccount({
      phone: "+251917000002",
      name: "Customer Biniam",
      role: "user",
    });
    customerBId = custB.id;

    // 2. Managers
    const mgrA = await createAccount({
      phone: "+251917000003",
      name: "Manager Chaltu",
      role: "venue_manager",
    });
    managerAId = mgrA.id;

    const mgrB = await createAccount({
      phone: "+251917000004",
      name: "Manager Dereje",
      role: "venue_manager",
    });
    managerBId = mgrB.id;

    // 3. Super Admin
    const admin = await createAccount({
      phone: "+251917000000",
      name: "Super Admin",
      role: "super_admin",
    });
    adminId = admin.id;

    // 4. Venues
    const venueA = await createVenue({
      managerId: managerAId,
      name: "Chaltu Grand Oasis",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueAId = venueA.id;

    const venueB = await createVenue({
      managerId: managerBId,
      name: "Dereje Mountain Resort",
      area: "Yeka",
      type: "Garden venue",
    });
    venueBId = venueB.id;
  });

  it("proves a customer can initiate an inquiry conversation with an initial message", async () => {
    // Explanation: Customer Almaz sends an inquiry about catering and decor policies to Chaltu Grand Oasis.
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Catering and sound system availability",
      initialMessage: "Hello, we are planning a wedding for 300 guests in December. Does your hall allow outside traditional catering?",
    });

    expect(conv).toBeDefined();
    expect(conv.id).toBeDefined();
    expect(conv.venueId).toBe(venueAId);
    expect(conv.customerId).toBe(customerAId);
    expect(conv.managerId).toBe(managerAId);
    expect(conv.subject).toBe("Catering and sound system availability");

    // Verify initial message was created and attributed to customer
    const messages = await getConversationMessages({
      conversationId: conv.id,
      callerId: customerAId,
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].senderId).toBe(customerAId);
    expect(messages[0].content).toContain("planning a wedding for 300 guests");
  });

  it("proves manager and customer can converse, with messages ordered chronologically and correctly attributed", async () => {
    // 1. Customer initiates conversation
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Microphone setup",
      initialMessage: "Do you provide wireless lapel microphones?",
    });

    // 2. Manager replies
    const msg2 = await sendMessage({
      conversationId: conv.id,
      senderId: managerAId,
      content: "Yes, our audiovisual package includes 4 wireless handhelds and 2 lapel mics.",
    });
    expect(msg2.senderId).toBe(managerAId);

    // 3. Customer follow-up
    const msg3 = await sendMessage({
      conversationId: conv.id,
      senderId: customerAId,
      content: "Great, thank you! We will proceed to check date availability.",
    });
    expect(msg3.senderId).toBe(customerAId);

    // 4. Retrieve conversation transcript as manager
    const transcript = await getConversationMessages({
      conversationId: conv.id,
      callerId: managerAId,
    });

    expect(transcript).toHaveLength(3);
    // Verify ascending chronological order
    expect(transcript[0].content).toBe("Do you provide wireless lapel microphones?");
    expect(transcript[1].content).toContain("audiovisual package includes 4 wireless");
    expect(transcript[2].content).toContain("proceed to check date availability");

    expect(new Date(transcript[0].createdAt).getTime()).toBeLessThanOrEqual(
      new Date(transcript[1].createdAt).getTime()
    );
    expect(new Date(transcript[1].createdAt).getTime()).toBeLessThanOrEqual(
      new Date(transcript[2].createdAt).getTime()
    );
  });

  it("proves empty or whitespace-only messages are strictly rejected", async () => {
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Test subject",
      initialMessage: "Valid initial message",
    });

    // 1. Blank content
    await expect(
      sendMessage({
        conversationId: conv.id,
        senderId: customerAId,
        content: "   ",
      })
    ).rejects.toThrow(/empty|blank/i);

    // 2. Empty initial message during creation
    await expect(
      createConversation({
        venueId: venueAId,
        customerId: customerAId,
        subject: "Test",
        initialMessage: "",
      })
    ).rejects.toThrow(/empty|blank/i);
  });

  it("proves third parties (foreign customer, foreign manager) cannot send messages in another's conversation", async () => {
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Private negotiation",
      initialMessage: "Can you provide a discount for Friday?",
    });

    // Unrelated customer B tries to inject a message
    await expect(
      sendMessage({
        conversationId: conv.id,
        senderId: customerBId,
        content: "I am intruding into this conversation",
      })
    ).rejects.toThrow(/not authorized|forbidden|participant/i);

    // Foreign manager B (does not own Venue A) tries to send a message
    await expect(
      sendMessage({
        conversationId: conv.id,
        senderId: managerBId,
        content: "Manager B trying to reply",
      })
    ).rejects.toThrow(/not authorized|forbidden|participant/i);
  });

  it("proves third parties cannot read messages of another conversation (403 authorization boundary)", async () => {
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Confidential inquiry",
      initialMessage: "Private details about our guest list",
    });

    // Foreign customer B tries to read
    await expect(
      getConversationMessages({
        conversationId: conv.id,
        callerId: customerBId,
      })
    ).rejects.toThrow(/not authorized|forbidden|permission/i);

    // Foreign manager B tries to read
    await expect(
      getConversationMessages({
        conversationId: conv.id,
        callerId: managerBId,
      })
    ).rejects.toThrow(/not authorized|forbidden|permission/i);
  });

  it("proves super admin can inspect conversation metadata, but message contents are excluded (privacy invariant)", async () => {
    // Requirements from docs/phases.md & assumptions-and-schema.md:
    // "Super admin sees everything EXCEPT private messages"
    const conv = await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Pricing inquiry",
      initialMessage: "Top secret budget numbers: $50,000",
    });

    // 1. Super admin CAN view conversation metadata (audit/support visibility)
    const meta = await getConversationById({
      conversationId: conv.id,
      callerId: adminId,
    });
    expect(meta).toBeDefined();
    expect(meta?.id).toBe(conv.id);
    expect(meta?.venueId).toBe(venueAId);
    expect(meta?.customerId).toBe(customerAId);

    // 2. Super admin querying message content gets rejected OR content is redacted/empty
    await expect(
      getConversationMessages({
        conversationId: conv.id,
        callerId: adminId,
      })
    ).rejects.toThrow(/private|excluded|forbidden|confidential/i);
  });

  it("proves listConversationsForAccount scopes results correctly by role", async () => {
    // Conv 1: Customer A <-> Manager A (Venue A)
    await createConversation({
      venueId: venueAId,
      customerId: customerAId,
      subject: "Inquiry 1",
      initialMessage: "Question 1",
    });

    // Conv 2: Customer A <-> Manager B (Venue B)
    await createConversation({
      venueId: venueBId,
      customerId: customerAId,
      subject: "Inquiry 2",
      initialMessage: "Question 2",
    });

    // Conv 3: Customer B <-> Manager B (Venue B)
    await createConversation({
      venueId: venueBId,
      customerId: customerBId,
      subject: "Inquiry 3",
      initialMessage: "Question 3",
    });

    // Customer A should see Conv 1 and Conv 2 (2 conversations)
    const custAConvs = await listConversationsForAccount(customerAId);
    expect(custAConvs).toHaveLength(2);

    // Customer B should see only Conv 3 (1 conversation)
    const custBConvs = await listConversationsForAccount(customerBId);
    expect(custBConvs).toHaveLength(1);

    // Manager A should see only Conv 1 (1 conversation for Venue A)
    const mgrAConvs = await listConversationsForAccount(managerAId);
    expect(mgrAConvs).toHaveLength(1);

    // Manager B should see Conv 2 and Conv 3 (2 conversations for Venue B)
    const mgrBConvs = await listConversationsForAccount(managerBId);
    expect(mgrBConvs).toHaveLength(2);
  });
});
