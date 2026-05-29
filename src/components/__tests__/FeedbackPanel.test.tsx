import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackPanel } from '../FeedbackPanel'
import { ToastProvider } from '../Toast'
import type { Ticket, FeedbackEntry } from '@/lib/types'

const mockFeedback: FeedbackEntry[] = [
  {
    id: 'FB-001',
    ticketId: 'TIX-001',
    personaId: 'engineer',
    content: 'Engineer feedback content',
    createdAt: '2025-01-01T00:00:00.000Z',
    approved: true,
  },
  {
    id: 'FB-002',
    ticketId: 'TIX-001',
    personaId: 'designer',
    content: 'Designer feedback content',
    createdAt: '2025-01-02T00:00:00.000Z',
    approved: false,
  },
]

const mockTicket: Ticket = {
  id: 'TIX-001',
  title: 'Test Ticket',
  description: 'A test ticket for feedback panel',
  status: 'in-review',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
  feedback: mockFeedback,
  approvals: ['engineer'],
}

vi.mock('@/lib/store', () => ({
  getFeedbackHistory: vi.fn(
    (ticketId: string, personaId?: string) => {
      if (!personaId) return [...mockFeedback]
      return mockFeedback.filter((f) => f.personaId === personaId)
    }
  ),
  addFeedback: vi.fn(),
}))

/** Get persona filter buttons (they have aria-pressed attributes) */
function getFilterButtons() {
  return screen.getAllByRole('button').filter((btn) =>
    btn.hasAttribute('aria-pressed')
  )
}

describe('FeedbackPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the stakeholder feedback heading', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    expect(screen.getByText('Stakeholder Feedback')).toBeInTheDocument()
  })

  it('shows the contribution count', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    expect(screen.getByText('2 contributions')).toBeInTheDocument()
  })

  it('renders persona filter buttons when feedback exists', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    expect(screen.getByRole('button', { name: /All \(2\)/ })).toBeInTheDocument()

    const filterButtons = getFilterButtons()
    // "All" + 4 persona buttons = 5 total filter buttons
    expect(filterButtons).toHaveLength(5)
  })

  it('hides the filter bar when there is no feedback', () => {
    const emptyTicket = { ...mockTicket, feedback: [] }
    render(
      <ToastProvider><FeedbackPanel
        ticket={emptyTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    expect(screen.queryByText('Feedback History')).not.toBeInTheDocument()
  })

  it('marks the "All" filter button as pressed by default', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    const allButton = screen.getByRole('button', { name: /All \(2\)/ })
    expect(allButton.getAttribute('aria-pressed')).toBe('true')
  })

  it('filters history to show only entries for selected persona', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )

    // Initially shows all feedback
    expect(screen.getByText('Engineer feedback content')).toBeInTheDocument()
    expect(screen.getByText('Designer feedback content')).toBeInTheDocument()

    // Click engineer filter button (the one with aria-pressed)
    const engineerFilterBtn = screen.getByRole('button', {
      name: /Engineer/,
      pressed: false,
    })
    fireEvent.click(engineerFilterBtn)

    // Should still show engineer entry but not designer
    expect(screen.getByText('Engineer feedback content')).toBeInTheDocument()
    expect(screen.queryByText('Designer feedback content')).not.toBeInTheDocument()
  })

  it('updates aria-pressed when switching filters', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )

    const allButton = screen.getByRole('button', { name: /All \(2\)/ })
    const engineerFilterBtn = screen.getByRole('button', {
      name: /Engineer/,
      pressed: false,
    })

    expect(allButton.getAttribute('aria-pressed')).toBe('true')
    expect(engineerFilterBtn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(engineerFilterBtn)

    expect(allButton.getAttribute('aria-pressed')).toBe('false')
    expect(engineerFilterBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows empty state when selected persona has no feedback', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )

    // Click QA filter (has no feedback)  — use pressed:false to get the filter button
    const qaFilterBtn = screen.getByRole('button', {
      name: /QA/,
      pressed: false,
    })
    fireEvent.click(qaFilterBtn)

    expect(screen.getByText('No feedback from this persona yet.')).toBeInTheDocument()
  })

  it('shows the keyboard shortcut hint text', () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={mockTicket}
        onFeedbackAdded={vi.fn()}
      /></ToastProvider>
    )
    // Should show Cmd+Enter or Ctrl+Enter depending on platform
    expect(screen.getByText(/Enter to submit/)).toBeInTheDocument()
  })

  it('submits feedback on Cmd+Enter when content is entered', async () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={{...mockTicket, feedback: []}}
        onFeedbackAdded={vi.fn()}
        initialPersona="engineer"
      /></ToastProvider>
    )

    // Type content
    const textarea = screen.getByPlaceholderText(/weighing in as the Engineer/i)
    fireEvent.change(textarea, { target: { value: 'Test feedback' } })

    // Press Cmd+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    // Should have cleared the textarea after submit (async)
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Test feedback')).not.toBeInTheDocument()
    })
  })

  it('does not submit on Cmd+Enter with empty content', () => {
    const onFeedbackAdded = vi.fn()
    render(
      <ToastProvider><FeedbackPanel
        ticket={{...mockTicket, feedback: []}}
        onFeedbackAdded={onFeedbackAdded}
        initialPersona="engineer"
      /></ToastProvider>
    )

    const textarea = screen.getByPlaceholderText(/weighing in as the Engineer/i)
    // Press Cmd+Enter with empty textarea
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    // onFeedbackAdded should not have been called
    expect(onFeedbackAdded).not.toHaveBeenCalled()
  })

  it('submits on Ctrl+Enter as well (Windows compat)', async () => {
    render(
      <ToastProvider><FeedbackPanel
        ticket={{...mockTicket, feedback: []}}
        onFeedbackAdded={vi.fn()}
        initialPersona="engineer"
      /></ToastProvider>
    )

    const textarea = screen.getByPlaceholderText(/weighing in as the Engineer/i)
    fireEvent.change(textarea, { target: { value: 'Windows feedback' } })

    // Press Ctrl+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

    // Text should be cleared (async)
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Windows feedback')).not.toBeInTheDocument()
    })
  })

  it('does not submit on plain Enter (newline only)', () => {
    const onFeedbackAdded = vi.fn()
    render(
      <ToastProvider><FeedbackPanel
        ticket={{...mockTicket, feedback: []}}
        onFeedbackAdded={onFeedbackAdded}
        initialPersona="engineer"
      /></ToastProvider>
    )

    const textarea = screen.getByPlaceholderText(/weighing in as the Engineer/i)
    fireEvent.change(textarea, { target: { value: 'Multi line' } })

    // Press plain Enter (should add newline, not submit)
    fireEvent.keyDown(textarea, { key: 'Enter' })

    // Content should still be there (not submitted)
    expect(screen.getByDisplayValue('Multi line')).toBeInTheDocument()
    expect(onFeedbackAdded).not.toHaveBeenCalled()
  })
})
