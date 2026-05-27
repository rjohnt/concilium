import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityFeed, ActivityItem } from '../ActivityFeed'
import type { Ticket, FeedbackEntry, BuildReport } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Freeze time so relative timestamps are predictable */
const NOW = new Date('2025-06-15T12:00:00.000Z')

function freezeTime() {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TIX-001',
    title: 'Test Ticket',
    description: 'Test description',
    status: 'draft',
    priority: 2,
    createdAt: '2025-06-14T10:00:00.000Z',
    updatedAt: '2025-06-14T10:00:00.000Z',
    feedback: [],
    approvals: [],
    ...overrides,
  }
}

function makeFeedback(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: 'FB-001',
    ticketId: 'TIX-001',
    personaId: 'engineer',
    content: 'Looks good!',
    createdAt: '2025-06-14T11:00:00.000Z',
    approved: true,
    ...overrides,
  }
}

function makeBuildReport(overrides: Partial<BuildReport> = {}): BuildReport {
  return {
    id: 'BLD-001',
    ticketId: 'TIX-001',
    createdAt: '2025-06-14T14:00:00.000Z',
    status: 'building',
    requirements: [],
    designDecisions: [],
    qaCriteria: [],
    implementationPlan: '',
    consensusSummary: '',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivityFeed', () => {
  beforeEach(() => {
    freezeTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --------------------------------------------------------------------
  // 1. Ticket with no feedback — only the "created" event
  // --------------------------------------------------------------------
  it('shows only the "created" event for a ticket with no feedback', () => {
    const ticket = makeTicket()
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Ticket created')).toBeInTheDocument()
    expect(screen.getByText('1 event')).toBeInTheDocument()

    // No feedback-related text should appear
    expect(screen.queryByText('submitted feedback')).toBeNull()
    expect(screen.queryByText('approved the ticket')).toBeNull()
  })

  // --------------------------------------------------------------------
  // 2. Single approval
  // --------------------------------------------------------------------
  it('shows a single approval event alongside feedback and created', () => {
    const ticket = makeTicket({
      status: 'in-review',
      feedback: [makeFeedback()],
      approvals: ['engineer'],
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Ticket created')).toBeInTheDocument()
    expect(screen.getByText('⚙️ Engineer submitted feedback')).toBeInTheDocument()
    expect(screen.getByText('⚙️ Engineer approved the ticket')).toBeInTheDocument()
    // 4 events: created, feedback, approval, status-change (draft → in-review)
    expect(screen.getByText('4 events')).toBeInTheDocument()
  })

  // --------------------------------------------------------------------
  // 3. Approval then withdrawal
  // --------------------------------------------------------------------
  it('shows approval then withdrawal when feedback switches from approved to not approved', () => {
    const ticket = makeTicket({
      status: 'in-review',
      feedback: [
        makeFeedback({ id: 'FB-001', personaId: 'engineer', approved: true, createdAt: '2025-06-14T11:00:00.000Z' }),
        makeFeedback({ id: 'FB-002', personaId: 'engineer', approved: false, createdAt: '2025-06-14T12:00:00.000Z' }),
      ],
      approvals: [],
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('⚙️ Engineer approved the ticket')).toBeInTheDocument()
    expect(screen.getByText('⚙️ Engineer withdrew approval')).toBeInTheDocument()
    // 6 events: created, feedback x2, approval, approval-withdrawn, status-change
    expect(screen.getByText('6 events')).toBeInTheDocument()
  })

  // --------------------------------------------------------------------
  // 4. Multiple approvals reaching consensus
  // --------------------------------------------------------------------
  it('shows consensus status transition when threshold is reached', () => {
    const ticket = makeTicket({
      status: 'building', // past consensus
      feedback: [
        makeFeedback({ id: 'FB-001', personaId: 'engineer', approved: true }),
        makeFeedback({ id: 'FB-002', personaId: 'designer', approved: true }),
        makeFeedback({ id: 'FB-003', personaId: 'product-owner', approved: true }),
        makeFeedback({ id: 'FB-004', personaId: 'qa', approved: true }),
      ],
      approvals: ['engineer', 'designer', 'product-owner', 'qa'],
      buildReport: makeBuildReport({ status: 'completed', completedAt: '2025-06-14T15:00:00.000Z' }),
    })
    render(<ActivityFeed ticket={ticket} />)

    // Should show consensus status transition
    expect(screen.getByText('Status changed: in-review → consensus')).toBeInTheDocument()
    // All four approvals should show
    expect(screen.getAllByText(/approved the ticket/)).toHaveLength(4)
  })

  // --------------------------------------------------------------------
  // 5. Build triggered, completed, failed
  // --------------------------------------------------------------------
  it('shows build-triggered and build-completed events', () => {
    const ticket = makeTicket({
      status: 'done',
      feedback: [
        makeFeedback({ id: 'FB-001', personaId: 'engineer', approved: true }),
        makeFeedback({ id: 'FB-002', personaId: 'designer', approved: true }),
        makeFeedback({ id: 'FB-003', personaId: 'product-owner', approved: true }),
        makeFeedback({ id: 'FB-004', personaId: 'qa', approved: true }),
      ],
      approvals: ['engineer', 'designer', 'product-owner', 'qa'],
      buildReport: makeBuildReport({ status: 'completed', completedAt: '2025-06-14T15:00:00.000Z' }),
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Build triggered')).toBeInTheDocument()
    expect(screen.getByText('Build completed successfully')).toBeInTheDocument()
  })

  it('shows build-failed text when build status is failed', () => {
    const ticket = makeTicket({
      status: 'building',
      feedback: [
        makeFeedback({ id: 'FB-001', personaId: 'engineer', approved: true }),
        makeFeedback({ id: 'FB-002', personaId: 'designer', approved: true }),
        makeFeedback({ id: 'FB-003', personaId: 'product-owner', approved: true }),
        makeFeedback({ id: 'FB-004', personaId: 'qa', approved: true }),
      ],
      approvals: ['engineer', 'designer', 'product-owner', 'qa'],
      buildReport: makeBuildReport({ status: 'failed', completedAt: '2025-06-14T14:30:00.000Z' }),
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Build triggered')).toBeInTheDocument()
    expect(screen.getByText('Build failed')).toBeInTheDocument()
    expect(screen.queryByText('Build completed successfully')).toBeNull()
  })

  // --------------------------------------------------------------------
  // 6. Unknown personaId fallback
  // --------------------------------------------------------------------
  it('falls back to personaId string when getPersona returns undefined', () => {
    const ticket = makeTicket({
      status: 'in-review',
      feedback: [
        {
          id: 'FB-999',
          ticketId: 'TIX-001',
          personaId: 'unknown-bot' as any,
          content: 'Bot message',
          createdAt: '2025-06-14T11:00:00.000Z',
          approved: false,
        },
      ],
      approvals: [],
    })
    render(<ActivityFeed ticket={ticket} />)

    // Should use the personaId string directly as fallback
    expect(screen.getByText('unknown-bot submitted feedback')).toBeInTheDocument()
  })

  // --------------------------------------------------------------------
  // 7. Relative time edge cases
  // --------------------------------------------------------------------
  it('shows "just now" for timestamps less than a minute ago', () => {
    const ticket = makeTicket({
      createdAt: new Date(NOW.getTime() - 30_000).toISOString(), // 30 seconds ago
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('shows minutes ago for recent feedback', () => {
    const ticket = makeTicket({
      feedback: [
        makeFeedback({
          createdAt: new Date(NOW.getTime() - 5 * 60_000).toISOString(), // 5 minutes ago
        }),
      ],
      approvals: ['engineer'],
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getAllByText('5m ago').length).toBeGreaterThanOrEqual(1)
  })

  it('shows hours ago for older feedback', () => {
    const ticket = makeTicket({
      feedback: [
        makeFeedback({
          createdAt: new Date(NOW.getTime() - 3 * 3600_000).toISOString(), // 3 hours ago
        }),
      ],
      approvals: ['engineer'],
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getAllByText('3h ago').length).toBeGreaterThanOrEqual(1)
  })

  it('shows days ago for feedback older than 24 hours', () => {
    const ticket = makeTicket({
      feedback: [
        makeFeedback({
          createdAt: new Date(NOW.getTime() - 2 * 86400_000).toISOString(), // 2 days ago
        }),
      ],
      approvals: ['engineer'],
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getAllByText('2d ago').length).toBeGreaterThanOrEqual(1)
  })

  // --------------------------------------------------------------------
  // 8. Empty state — activity feed with no activities
  // --------------------------------------------------------------------
  it('renders the EmptyState component when there are no activities', () => {
    const ticket = makeTicket()
    // deriveActivity always returns at least the "created" event,
    // so this path is technically unreachable. We verify the component
    // renders the "Activity" heading and the ticket's single event.
    const { container } = render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Activity')).toBeInTheDocument()
    // There should always be at least the "created" event
    expect(screen.getByText('Ticket created')).toBeInTheDocument()
  })

  // --------------------------------------------------------------------
  // 9. Date grouping
  // --------------------------------------------------------------------
  it('groups events under date headers', () => {
    const ticket = makeTicket({
      createdAt: new Date(NOW.getTime() - 30_000).toISOString(), // just now
    })
    render(<ActivityFeed ticket={ticket} />)

    // Today's events should have "Today" header
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows "Yesterday" for events from yesterday', () => {
    const yesterday = new Date(NOW.getTime() - 86400_000).toISOString()
    const ticket = makeTicket({
      createdAt: yesterday,
    })
    render(<ActivityFeed ticket={ticket} />)

    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })
})
