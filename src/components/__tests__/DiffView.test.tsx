import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffView, wordDiff } from '../DiffView'
import type { DiffSegment } from '../DiffView'

// ---------------------------------------------------------------------------
// Part A: wordDiff pure function tests (no DOM)
// ---------------------------------------------------------------------------

describe('wordDiff (pure function)', () => {
  it('returns all equal segments for identical texts', () => {
    const result = wordDiff('hello world', 'hello world')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: 'equal', text: 'hello world' })
  })

  it('returns all added segments when old text is empty', () => {
    const result = wordDiff('', 'fresh content')
    expect(result.every((s) => s.type === 'added')).toBe(true)
    expect(result.map((s) => s.text).join('')).toBe('fresh content')
  })

  it('returns all removed segments when new text is empty', () => {
    const result = wordDiff('removed content', '')
    expect(result.every((s) => s.type === 'removed')).toBe(true)
    expect(result.map((s) => s.text).join('')).toBe('removed content')
  })

  it('handles mixed changes: added, removed, and equal', () => {
    const result = wordDiff('the quick brown fox', 'the slow red fox')
    const types = result.map((s) => s.type)
    // 'the ' equal, 'quick ' removed, 'brown ' removed, 'slow ' added, 'red ' added, 'fox' equal
    expect(types).toContain('equal')
    expect(types).toContain('added')
    expect(types).toContain('removed')
    // Verify the combined text matches
    const oldText = result
      .filter((s) => s.type !== 'added')
      .map((s) => s.text)
      .join('')
    expect(oldText).toBe('the quick brown fox')
    const newText = result
      .filter((s) => s.type !== 'removed')
      .map((s) => s.text)
      .join('')
    expect(newText).toBe('the slow red fox')
  })

  it('returns empty array for two empty strings', () => {
    const result = wordDiff('', '')
    expect(result).toEqual([])
  })

  it('preserves whitespace as separate tokens', () => {
    const result = wordDiff('a b', 'a  b')
    // old: ['a', ' ', 'b']  new: ['a', '  ', 'b']
    // Should detect the double-space as added + single-space as removed
    const types = result.map((s) => s.type)
    expect(types.filter((t) => t === 'removed').length).toBeGreaterThan(0)
    expect(types.filter((t) => t === 'added').length).toBeGreaterThan(0)
  })

  it('handles unicode text correctly', () => {
    const result = wordDiff('café naïve', 'café résumé')
    // 'café ' equal, 'naïve' removed, 'résumé' added
    const hasRemoved = result.some((s) => s.type === 'removed' && s.text.includes('naïve'))
    const hasAdded = result.some((s) => s.type === 'added' && s.text.includes('résumé'))
    expect(hasRemoved).toBe(true)
    expect(hasAdded).toBe(true)
  })

  it('handles text with only word reordering', () => {
    const result = wordDiff('hello world', 'world hello')
    // Should detect 'hello ' as removed and 'hello' as added (or vice versa)
    const removedWords = result
      .filter((s) => s.type === 'removed')
      .map((s) => s.text.trim())
      .filter(Boolean)
    const addedWords = result
      .filter((s) => s.type === 'added')
      .map((s) => s.text.trim())
      .filter(Boolean)
    expect(removedWords.length).toBeGreaterThan(0)
    expect(addedWords.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Part B: DiffView component rendering tests
// ---------------------------------------------------------------------------

describe('DiffView component', () => {
  // ----- Styling -----

  describe('text styling', () => {
    it('renders added text with olive styling', () => {
      render(<DiffView oldText="before" newText="before and after" />)

      const addedSpan = screen.getByText(/and after/)
      expect(addedSpan).toBeInTheDocument()
      expect(addedSpan.className).toContain('bg-olive/20')
      expect(addedSpan.className).toContain('text-olive')
      expect(addedSpan.className).toContain('font-medium')
    })

    it('renders removed text with cardinal styling and line-through', () => {
      render(<DiffView oldText="before and gone" newText="before" />)

      const removedSpan = screen.getByText(/and gone/)
      expect(removedSpan).toBeInTheDocument()
      expect(removedSpan.className).toContain('bg-cardinal/20')
      expect(removedSpan.className).toContain('text-cardinal')
      expect(removedSpan.className).toContain('line-through')
    })

    it('renders unchanged text without special classes', () => {
      render(<DiffView oldText="keep me" newText="keep me too" />)

      // The unchanged parts should be rendered as plain spans
      // "keep me" is equal, " too" is added
      const allSpans = document.querySelectorAll('span')
      const equalSpans = Array.from(allSpans).filter(
        (s) =>
          !s.className.includes('bg-olive') &&
          !s.className.includes('bg-cardinal') &&
          !s.className.includes('text-olive') &&
          !s.className.includes('text-cardinal') &&
          !s.className.includes('line-through') &&
          !s.className.includes('font-medium') &&
          s.textContent !== ''
      )
      // Should have at least one plain span for "keep me "
      expect(equalSpans.length).toBeGreaterThan(0)
    })
  })

  // ----- Identical texts -----

  describe('identical texts', () => {
    it('renders unchanged text without diff highlighting when both texts are identical', () => {
      render(<DiffView oldText="same text" newText="same text" />)

      // Identical non-empty texts: all tokens are equal, rendered without olive/cardinal styling
      const container = document.querySelector('.bg-elevated')
      expect(container).toBeTruthy()
      // No added/removed spans
      expect(container!.querySelector('.text-olive')).toBeFalsy()
      expect(container!.querySelector('.text-cardinal')).toBeFalsy()
      expect(screen.getByText('same text')).toBeInTheDocument()
    })

    it('displays "No differences found." when both texts are empty', () => {
      render(<DiffView oldText="" newText="" />)

      expect(screen.getByText('No differences found.')).toBeInTheDocument()
    })
  })

  // ----- Unified vs Side-by-side -----

  describe('layout mode selection', () => {
    it('uses unified mode for short texts (less than 300 chars and ≤3 lines)', () => {
      const shortText = 'A short piece of text.'
      render(<DiffView oldText={shortText} newText={shortText + ' extra'} />)

      // Unified mode renders in a single container with bg-elevated
      // It should NOT have the side-by-side grid layout
      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Current')).not.toBeInTheDocument()
    })

    it('uses side-by-side mode for long texts (300+ chars)', () => {
      const longText = 'x'.repeat(300)
      render(<DiffView oldText={longText} newText={longText + ' extra'} />)

      // Side-by-side mode shows column headers
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
    })

    it('uses side-by-side mode for texts with 4+ lines', () => {
      const multiLine = 'line1\nline2\nline3\nline4'
      render(<DiffView oldText={multiLine} newText={multiLine + ' extra'} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
    })

    it('uses unified mode for 3-line text', () => {
      const threeLines = 'line1\nline2\nline3'
      render(<DiffView oldText={threeLines} newText={threeLines + ' extra'} />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    })

    it('uses unified mode for text with exactly 299 characters', () => {
      const text299a = 'a'.repeat(299)
      const text299b = 'b'.repeat(299)
      render(<DiffView oldText={text299a} newText={text299b} />)

      // Both texts are 299 chars (< 300), 1 line => unified mode
      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    })

    it('uses side-by-side mode for text with exactly 300 characters', () => {
      const text300 = 'x'.repeat(300)
      render(<DiffView oldText={text300} newText={text300 + ' extra'} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
    })
  })

  // ----- sideBySide prop override -----

  describe('sideBySide prop', () => {
    it('forces side-by-side mode even for short texts when sideBySide=true', () => {
      render(
        <DiffView oldText="short" newText="short text" sideBySide={true} />
      )

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
    })

    it('forces unified mode even for long texts when sideBySide=false', () => {
      const longText = 'x'.repeat(500)
      render(
        <DiffView oldText={longText} newText={longText + ' extra'} sideBySide={false} />
      )

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Current')).not.toBeInTheDocument()
    })
  })

  // ----- Custom labels -----

  describe('custom labels', () => {
    it('displays default labels "Previous" and "Current" in side-by-side mode', () => {
      const longText = 'x'.repeat(300)
      render(<DiffView oldText={longText} newText={longText + ' extra'} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
    })

    it('displays custom oldLabel and newLabel when provided', () => {
      const longText = 'x'.repeat(300)
      render(
        <DiffView
          oldText={longText}
          newText={longText + ' extra'}
          oldLabel="Version A"
          newLabel="Version B"
        />
      )

      expect(screen.getByText('Version A')).toBeInTheDocument()
      expect(screen.getByText('Version B')).toBeInTheDocument()
    })
  })

  // ----- Edge cases -----

  describe('edge cases', () => {
    it('handles multiline diff in unified mode correctly', () => {
      const oldText = 'line one\nline two'
      const newText = 'line one\nline two modified'
      render(<DiffView oldText={oldText} newText={newText} />)

      // The modified text should have olive styling
      const modifiedSpan = screen.getByText(/modified/)
      expect(modifiedSpan).toBeInTheDocument()
      expect(modifiedSpan.className).toContain('text-olive')
    })

    it('handles whitespace-only changes', () => {
      render(<DiffView oldText="hello world" newText="hello  world" />)

      // Extra space should be detected
      // The text should show differences highlighted
      const diffContainer = document.querySelector('.bg-elevated')
      expect(diffContainer).toBeTruthy()
    })

    it('renders side-by-side removed text with cardinal styling', () => {
      const longText = 'x'.repeat(300)
      render(<DiffView oldText={longText + ' removed-part'} newText={longText} />)

      // In side-by-side, removed text should have cardinal styling
      const removedSpan = screen.getByText(/removed-part/)
      expect(removedSpan).toBeInTheDocument()
      expect(removedSpan.className).toContain('text-cardinal')
      expect(removedSpan.className).toContain('line-through')
    })

    it('renders side-by-side added text with olive styling', () => {
      const longText = 'x'.repeat(300)
      render(<DiffView oldText={longText} newText={longText + ' added-part'} />)

      const addedSpan = screen.getByText(/added-part/)
      expect(addedSpan).toBeInTheDocument()
      expect(addedSpan.className).toContain('text-olive')
      expect(addedSpan.className).toContain('font-medium')
    })

    it('handles text consisting only of newlines', () => {
      // 3 newlines in old (2 chars), 4 newlines in new (3 chars)
      // newText has 4 lines (> 3) => triggers side-by-side
      render(<DiffView oldText={'\n\n'} newText={'\n\n\n'} />)

      // Should render without crashing — check for the grid layout
      const grid = document.querySelector('.grid.grid-cols-2')
      expect(grid).toBeTruthy()
    })

    it('renders the side-by-side grid layout with two columns for differing long texts', () => {
      const textA = 'x'.repeat(300)
      const textB = 'y'.repeat(300)
      render(<DiffView oldText={textA} newText={textB} />)

      // Both are 300 chars, no sideBySide prop => side-by-side mode
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
    })
  })
})
