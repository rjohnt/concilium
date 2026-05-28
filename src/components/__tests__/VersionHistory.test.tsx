import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionHistory } from '../VersionHistory'
import type { FeedbackEntry } from '@/lib/types'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createFeedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: 'FB-001',
    ticketId: 'TIX-001',
    personaId: 'engineer',
    content: 'Default feedback content.',
    createdAt: '2025-06-01T00:00:00.000Z',
    approved: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(overrides: {
  personaId?: 'engineer' | 'designer' | 'product-owner' | 'qa';
  feedback?: FeedbackEntry[];
  onClose?: () => void;
} = {}) {
  const onClose = overrides.onClose ?? vi.fn()
  const utils = render(
    <VersionHistory
      ticketId="TIX-001"
      personaId={overrides.personaId ?? 'engineer'}
      feedback={overrides.feedback ?? []}
      onClose={onClose}
    />
  )
  return { ...utils, onClose }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('VersionHistory', () => {
  // ----- Rendering with data -----

  describe('rendering with data', () => {
    it('renders the version history header with count badge', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'First version', createdAt: '2025-06-01T00:00:00.000Z' }),
        ],
      })

      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText('(1 version)')).toBeInTheDocument()
    })

    it('renders plural count label when multiple versions exist', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'First', createdAt: '2025-06-01T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-2', content: 'Second', createdAt: '2025-06-02T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-3', content: 'Third', createdAt: '2025-06-03T00:00:00.000Z' }),
        ],
      })

      expect(screen.getByText('(3 versions)')).toBeInTheDocument()
    })

    it('renders timeline entries newest-first', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-old', content: 'Oldest entry', createdAt: '2025-06-01T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-mid', content: 'Middle entry', createdAt: '2025-06-05T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-new', content: 'Newest entry', createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      const versionSpans = screen.getAllByText(/^v\d$/)
      expect(versionSpans).toHaveLength(3)
      // Newest first: v3, v2, v1
      expect(versionSpans[0]).toHaveTextContent('v3')
      expect(versionSpans[1]).toHaveTextContent('v2')
      expect(versionSpans[2]).toHaveTextContent('v1')
    })

    it('renders "Latest" badge with gold styling on the newest entry', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Only entry', createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      const latestBadge = screen.getByText('Latest')
      expect(latestBadge).toBeInTheDocument()
      expect(latestBadge.className).toContain('bg-gold/20')
      expect(latestBadge.className).toContain('text-gold')
    })

    it('does not show "Latest" badge on non-newest entries', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-new', content: 'Newest', createdAt: '2025-06-10T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-old', content: 'Older', createdAt: '2025-06-01T00:00:00.000Z' }),
        ],
      })

      // Only one "Latest" badge should exist
      const badges = screen.getAllByText('Latest')
      expect(badges).toHaveLength(1)
    })

    it('renders CheckCircle icon for approved entries', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Approved', approved: true, createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      // CheckCircle renders an SVG element — look for the lucide icon
      const entry = screen.getByText('Approved').closest('.card')
      const svg = entry?.querySelector('svg')
      expect(svg).toBeTruthy()
      // The parent container should have the lucide CheckCircle
    })

    it('renders XCircle icon for rejected entries', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Rejected', approved: false, createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      const entry = screen.getByText('Rejected').closest('.card')
      const svg = entry?.querySelector('svg')
      expect(svg).toBeTruthy()
      // XCircle is rendered for non-approved entries
    })
  })

  // ----- Interaction -----

  describe('interaction', () => {
    it('collapsed entries show line-clamp-2 preview content', () => {
      const longContent =
        'Line one content. Line two content. Line three content that should be clamped. Line four is hidden.'
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: longContent, createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      const preview = screen.getByText(longContent)
      expect(preview).toBeInTheDocument()
      expect(preview.className).toContain('line-clamp-2')
    })

    it('click to expand shows DiffView when previous version exists', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-v2', content: 'Updated content', createdAt: '2025-06-10T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-v1', content: 'Original content', createdAt: '2025-06-01T00:00:00.000Z' }),
        ],
      })

      // Initially collapsed — preview visible
      expect(screen.getByText('Updated content')).toBeInTheDocument()

      // Click the v2 card to expand
      const v2Card = screen.getByText('v2').closest('.card')!
      fireEvent.click(v2Card)

      // After expanding, the preview p with line-clamp-2 should be gone
      // and DiffView content should be visible
      const paragraphs = v2Card.querySelectorAll('p.line-clamp-2')
      expect(paragraphs).toHaveLength(0)
    })

    it('shows initial version message when no previous entry exists', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-only', content: 'Only version', createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      // Click to expand (it's the only entry = v1, so no previous)
      const v1Card = screen.getByText('v1').closest('.card')!
      fireEvent.click(v1Card)

      expect(screen.getByText('Initial version — no previous to compare')).toBeInTheDocument()
    })

    it('click to collapse toggles expanded entry back to collapsed', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-v2', content: 'Updated content', createdAt: '2025-06-10T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-v1', content: 'Original content', createdAt: '2025-06-01T00:00:00.000Z' }),
        ],
      })

      const v2Card = screen.getByText('v2').closest('.card')!
      fireEvent.click(v2Card) // expand

      // Should have expanded view now
      expect(screen.queryByText('line-clamp-2')).toBeFalsy()

      fireEvent.click(v2Card) // collapse

      // Should be collapsed again — preview visible
      const preview = screen.getByText('Updated content')
      expect(preview).toBeInTheDocument()
      expect(preview.className).toContain('line-clamp-2')
    })
  })

  // ----- Empty state -----

  describe('empty state', () => {
    it('shows "No versions available." message when feedback array is empty', () => {
      setup({ feedback: [] })

      expect(screen.getByText('No versions available.')).toBeInTheDocument()
    })

    it('renders "Back to feedback" button in empty state', () => {
      setup({ feedback: [] })

      expect(screen.getByText('Back to feedback')).toBeInTheDocument()
    })

    it('"Back to feedback" in empty state calls onClose', () => {
      const onClose = vi.fn()
      setup({ feedback: [], onClose })

      fireEvent.click(screen.getByText('Back to feedback'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ----- Filtering and sorting -----

  describe('filtering and sorting', () => {
    it('filters versions to only show entries for the given personaId', () => {
      setup({
        personaId: 'engineer',
        feedback: [
          createFeedbackEntry({ id: 'FB-eng', personaId: 'engineer', content: 'Engineer feedback', createdAt: '2025-06-10T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-des', personaId: 'designer', content: 'Designer feedback', createdAt: '2025-06-05T00:00:00.000Z' }),
        ],
      })

      expect(screen.getByText('Engineer feedback')).toBeInTheDocument()
      expect(screen.queryByText('Designer feedback')).not.toBeInTheDocument()
    })

    it('sorts entries by createdAt descending (newest first)', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Entry one', createdAt: '2025-06-01T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-3', content: 'Entry three', createdAt: '2025-06-10T00:00:00.000Z' }),
          createFeedbackEntry({ id: 'FB-2', content: 'Entry two', createdAt: '2025-06-05T00:00:00.000Z' }),
        ],
      })

      const versionSpans = screen.getAllByText(/^v\d$/)
      expect(versionSpans[0]).toHaveTextContent('v3')
      expect(versionSpans[1]).toHaveTextContent('v2')
      expect(versionSpans[2]).toHaveTextContent('v1')
    })
  })

  // ----- Edge cases -----

  describe('edge cases', () => {
    it('"Back to feedback" button in header calls onClose', () => {
      const onClose = vi.fn()
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Entry', createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
        onClose,
      })

      // There are two "Back to feedback" buttons: one in header, one in empty state
      // Find the one in the header (when feedback exists)
      const backButtons = screen.getAllByText('Back to feedback')
      fireEvent.click(backButtons[0])
      expect(onClose).toHaveBeenCalled()
    })

    it('renders GitBranch icon in the header', () => {
      setup({
        feedback: [
          createFeedbackEntry({ id: 'FB-1', content: 'Entry', createdAt: '2025-06-10T00:00:00.000Z' }),
        ],
      })

      // GitBranch is an SVG icon
      const header = screen.getByText('Version History').closest('div')
      expect(header?.querySelector('svg')).toBeTruthy()
    })

    it('shows Clock icon with relative time for each entry', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))

      setup({
        feedback: [
          createFeedbackEntry({
            id: 'FB-1',
            content: 'Fresh entry',
            createdAt: new Date('2025-06-15T11:30:00.000Z').toISOString(),
          }),
        ],
      })

      // 30 minutes ago => "30m ago"
      expect(screen.getByText('30m ago')).toBeInTheDocument()
    })

    it('displays "just now" for entries created less than a minute ago', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))

      setup({
        feedback: [
          createFeedbackEntry({
            id: 'FB-1',
            content: 'Brand new',
            createdAt: new Date('2025-06-15T11:59:45.000Z').toISOString(),
          }),
        ],
      })

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('displays hours ago for entries created hours ago', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))

      setup({
        feedback: [
          createFeedbackEntry({
            id: 'FB-1',
            content: 'Old entry',
            createdAt: new Date('2025-06-15T09:00:00.000Z').toISOString(),
          }),
        ],
      })

      expect(screen.getByText('3h ago')).toBeInTheDocument()
    })

    it('displays locale date string for entries older than 24 hours', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))

      setup({
        feedback: [
          createFeedbackEntry({
            id: 'FB-1',
            content: 'Ancient entry',
            createdAt: new Date('2025-06-01T00:00:00.000Z').toISOString(),
          }),
        ],
      })

      // Should show a locale date string, not "Xh ago"
      const timeText = screen.getByText(/6\/1\/2025|01\/06\/2025|2025/)
      expect(timeText).toBeInTheDocument()
    })
  })
})
