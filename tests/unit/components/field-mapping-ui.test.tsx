import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FieldMappingUI } from '@/components/import/field-mapping-ui'

// Mock fetch globally
global.fetch = vi.fn()

describe('FieldMappingUI Component', () => {
  const mockUploadId = 'upload-123'
  const mockHeaders = ['Product Name', 'Quantity', 'Price']
  const mockPreview = [
    { 'Product Name': 'Widget', Quantity: '100', Price: '19.99' },
    { 'Product Name': 'Gadget', Quantity: '50', Price: '29.99' },
    { 'Product Name': 'Doohickey', Quantity: '25', Price: '9.99' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as unknown as typeof global.fetch).mockClear()
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  suggestedMapping: {
                    'Product Name': 'item',
                    Quantity: 'qty',
                    Price: 'revenue',
                  },
                }),
              })
            }, 50)
          }),
      )

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      // Loading indicator should appear
      expect(
        screen.getByText('Loading field suggestions...'),
      ).toBeInTheDocument()
    })

    it('should load suggestions on component mount', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {
            'Product Name': 'item',
          },
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/csv/field-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: mockUploadId }),
        })
      })
    })
  })

  describe('API Integration', () => {
    it('should call field-mapping API with correct upload ID', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {},
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        const fetchCall = (global.fetch as unknown as typeof global.fetch).mock
          .calls[0] as Array<string | RequestInit | undefined>
        const body = JSON.parse((fetchCall[1] as RequestInit)?.body as string)
        expect(body.uploadId).toBe(mockUploadId)
      })
    })

    it('should handle API error gracefully', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Failed to load field suggestions',
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load field suggestions/),
        ).toBeInTheDocument()
      })
    })

    it('should initialize with empty mapping when suggestions fail', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Error loading suggestions',
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      // Wait for error to be displayed
      await waitFor(() => {
        const alert = screen.queryByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should have Cancel button', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {},
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('should have Confirm & Import button', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {},
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn()

      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {},
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
          onCancel={onCancel}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Cancel'))
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('should require item field to be mapped before import', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {
            'Product Name': null,
            Quantity: 'qty',
          },
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(
          screen.getByText('Required field "Item" must be mapped'),
        ).toBeInTheDocument()
      })
    })

    it('should not call import API when item field is missing', async () => {
      ;(global.fetch as unknown as typeof global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestedMapping: {
            'Product Name': null,
            Quantity: 'qty',
          },
        }),
      })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      // Should only have one API call (the initial suggestion call)
      await waitFor(() => {
        const fieldMappingCalls = (
          global.fetch as unknown as typeof global.fetch
        ).mock.calls.filter((call: Array<string | RequestInit | undefined>) =>
          (call[0] as string).includes('field-mapping'),
        )
        expect(fieldMappingCalls).toHaveLength(1)
      })
    })
  })

  describe('Import Result', () => {
    it('should display import complete message after successful import', async () => {
      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
              Quantity: 'qty',
              Price: 'revenue',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            rowsImported: 42,
          }),
        })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(screen.getByText('Import Complete')).toBeInTheDocument()
        expect(
          screen.getByText('42 rows imported successfully'),
        ).toBeInTheDocument()
      })
    })

    it('should display row count in import result', async () => {
      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            rowsImported: 25,
          }),
        })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(
          screen.getByText('25 rows imported successfully'),
        ).toBeInTheDocument()
      })
    })

    it('should show error details when import fails', async () => {
      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            message: 'Failed to import data',
          }),
        })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(screen.getByText('Failed to import data')).toBeInTheDocument()
      })
    })

    it('should display partial import errors', async () => {
      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            rowsImported: 40,
            errors: [
              { row: 5, message: 'Invalid quantity' },
              { row: 10, message: 'Missing required field' },
            ],
          }),
        })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(screen.getByText('Import Complete')).toBeInTheDocument()
        expect(
          screen.getByText(/2 row\(s\) failed to import/),
        ).toBeInTheDocument()
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onMappingConfirmed callback', async () => {
      const onMappingConfirmed = vi.fn()

      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
              Quantity: 'qty',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            rowsImported: 10,
          }),
        })

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
          onMappingConfirmed={onMappingConfirmed}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      await waitFor(() => {
        expect(onMappingConfirmed).toHaveBeenCalledWith(
          expect.objectContaining({
            'Product Name': 'item',
            Quantity: 'qty',
          }),
        )
      })
    })
  })

  describe('Loading States', () => {
    it('should show importing indicator during import', async () => {
      ;(global.fetch as unknown as typeof global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            suggestedMapping: {
              'Product Name': 'item',
            },
          }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    rowsImported: 5,
                  }),
                })
              }, 100)
            }),
        )

      render(
        <FieldMappingUI
          uploadId={mockUploadId}
          headers={mockHeaders}
          preview={mockPreview}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Confirm & Import')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Confirm & Import'))

      // Should show importing state
      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument()
      })
    })
  })
})
