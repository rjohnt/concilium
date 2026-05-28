import { describe, it, expect, vi, beforeEach } from "vitest";
import { onFeedbackStream, broadcastFeedback, FeedbackStreamEvent } from "@/lib/feedback-stream";

describe("feedback-stream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("subscribes and unsubscribes from stream", () => {
    const listener = vi.fn();
    const unsub = onFeedbackStream(listener);
    expect(typeof unsub).toBe("function");
    unsub();
    // No crash after unsubscribe
    expect(true).toBe(true);
  });

  it("broadcasts and delivers to subscriber", () => {
    const listener = vi.fn();
    onFeedbackStream(listener);

    const event: FeedbackStreamEvent = {
      type: "feedback-submitted",
      feedbackEntry: {
        id: "FB-001",
        ticketId: "TIX-001",
        personaId: "engineer",
        content: "This looks good from an engineering perspective.",
        createdAt: new Date().toISOString(),
        approved: true,
      },
      ticketSnapshot: {
        id: "TIX-001",
        status: "in-review",
        approvals: ["engineer"],
        approvalCount: 1,
        totalPersonas: 4,
      },
      timestamp: Date.now(),
    };

    broadcastFeedback(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: "feedback-submitted",
      feedbackEntry: expect.objectContaining({
        id: "FB-001",
        personaId: "engineer",
      }),
    }));
  });

  it("multiple listeners all receive events", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    onFeedbackStream(listener1);
    onFeedbackStream(listener2);

    const event: FeedbackStreamEvent = {
      type: "feedback-submitted",
      feedbackEntry: {
        id: "FB-002",
        ticketId: "TIX-002",
        personaId: "designer",
        content: "UX review: the flow works well.",
        createdAt: new Date().toISOString(),
        approved: false,
      },
      ticketSnapshot: {
        id: "TIX-002",
        status: "in-review",
        approvals: ["engineer", "product-owner"],
        approvalCount: 2,
        totalPersonas: 4,
      },
      timestamp: Date.now(),
    };

    broadcastFeedback(event);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribed listener does not receive events", () => {
    const listener = vi.fn();
    const unsub = onFeedbackStream(listener);
    unsub();

    const event: FeedbackStreamEvent = {
      type: "feedback-submitted",
      feedbackEntry: {
        id: "FB-003",
        ticketId: "TIX-003",
        personaId: "qa",
        content: "Edge cases covered.",
        createdAt: new Date().toISOString(),
        approved: true,
      },
      ticketSnapshot: {
        id: "TIX-003",
        status: "consensus",
        approvals: ["engineer", "designer", "qa"],
        approvalCount: 3,
        totalPersonas: 4,
      },
      timestamp: Date.now(),
    };

    broadcastFeedback(event);

    expect(listener).not.toHaveBeenCalled();
  });

  it("handles feedback stream data correctly with ticket snapshot", () => {
    const listener = vi.fn();
    onFeedbackStream(listener);

    broadcastFeedback({
      type: "feedback-submitted",
      feedbackEntry: {
        id: "FB-004",
        ticketId: "TIX-004",
        personaId: "product-owner",
        content: "High business value. Approving.",
        createdAt: new Date().toISOString(),
        approved: true,
      },
      ticketSnapshot: {
        id: "TIX-004",
        status: "consensus",
        approvals: ["engineer", "designer", "product-owner", "qa"],
        approvalCount: 4,
        totalPersonas: 4,
      },
      timestamp: Date.now(),
    });

    const call = listener.mock.calls[0][0] as FeedbackStreamEvent;
    expect(call.ticketSnapshot.approvalCount).toBe(4);
    expect(call.ticketSnapshot.totalPersonas).toBe(4);
    expect(call.ticketSnapshot.status).toBe("consensus");
  });
});
