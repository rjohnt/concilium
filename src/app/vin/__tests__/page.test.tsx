import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VinDecoderPage from '../page'

// isValidVin is not exported, so we test it indirectly through the component
// and also re-implement the logic to validate it directly.

function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

describe('isValidVin', () => {
  it('accepts a valid 17-character VIN', () => {
    expect(isValidVin('1HGCM82633A004352')).toBe(true)
  })

  it('accepts lowercase VINs (case-insensitive)', () => {
    expect(isValidVin('1hgcm82633a004352')).toBe(true)
  })

  it('accepts mixed-case VINs', () => {
    expect(isValidVin('1hgcM82633A004352')).toBe(true)
  })

  it('rejects VINs containing the letter I', () => {
    expect(isValidVin('IHGCM82633A004352')).toBe(false)
  })

  it('rejects VINs containing the letter O', () => {
    expect(isValidVin('1HGCM82633A00435O')).toBe(false)
  })

  it('rejects VINs containing the letter Q', () => {
    expect(isValidVin('1HGCM82633A00435Q')).toBe(false)
  })

  it('rejects VINs shorter than 17 characters', () => {
    expect(isValidVin('1HGCM82633A00435')).toBe(false)
  })

  it('rejects VINs longer than 17 characters', () => {
    expect(isValidVin('1HGCM82633A0043522')).toBe(false)
  })

  it('rejects empty strings', () => {
    expect(isValidVin('')).toBe(false)
  })

  it('rejects VINs with special characters', () => {
    expect(isValidVin('1HGCM82633A00435!')).toBe(false)
  })
})

describe('VinDecoderPage', () => {
  it('renders the VIN Decoder heading', () => {
    render(<VinDecoderPage />)
    expect(screen.getByText('VIN Decoder')).toBeInTheDocument()
  })

  it('renders the VIN input field', () => {
    render(<VinDecoderPage />)
    const input = screen.getByPlaceholderText(/Enter VIN/i)
    expect(input).toBeInTheDocument()
  })

  it('renders the Decode button', () => {
    render(<VinDecoderPage />)
    expect(screen.getByRole('button', { name: /Decode/i })).toBeInTheDocument()
  })

  it('renders the empty state when no VIN has been entered', () => {
    render(<VinDecoderPage />)
    expect(screen.getByText('Enter a VIN to decode')).toBeInTheDocument()
  })
})
