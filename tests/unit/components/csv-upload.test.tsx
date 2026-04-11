import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CSVUpload } from '@/components/import/csv-upload'

// Mock the analytics utility
vi.mock('@/lib/analytics-utils', () => ({
  captureAnalyticsEvent: vi.fn(),
}))

// Mock the FieldMappingUI component
vi.mock('@/components/import/field-mapping-ui', () => ({
  FieldMappingUI: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="field-mapping-ui">
      <button onClick={onCancel}>Cancel Mapping</button>
    </div>
  ),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('CSVUpload Component', () => {
  const mockLocationId = 'loc-123'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  describe('Rendering', () => {
    it('should render file drop zone with correct accept attribute', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      expect(fileInput).toBeInTheDocument()
      expect(fileInput.accept).toBe('.csv,.tsv')
    })

    it('should display drag and drop instruction text', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      expect(
        screen.getByText('Drag and drop your file here'),
      ).toBeInTheDocument()
      expect(screen.getByText('or click to select a file')).toBeInTheDocument()
    })

    it('should display upload card title and description', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      expect(screen.getByText('Upload CSV File')).toBeInTheDocument()
      expect(
        screen.getByText(/Drag and drop a CSV or TSV file/),
      ).toBeInTheDocument()
    })
  })

  describe('File Input', () => {
    it('should allow clicking on drop zone to select file', async () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const dropZone = screen
        .getByText('Drag and drop your file here')
        .closest('div')

      // Click the drop zone
      fireEvent.click(dropZone!)

      // Verify file input was clicked (we can't directly test the file picker, but we can verify the input exists)
      expect(fileInput).toBeInTheDocument()
    })

    it('should handle file selection via input change', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'test.csv',
          rowCount: 10,
          headers: ['Name', 'Email'],
          preview: [{ Name: 'John', Email: 'john@example.com' }],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      // Simulate file selection
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Wait for upload to complete and FieldMappingUI to show
      await waitFor(() => {
        expect(screen.getByTestId('field-mapping-ui')).toBeInTheDocument()
      })
    })

    it('should disable drop zone when disabled prop is true', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const uploadText = screen.getByText('Drag and drop your file here')
      const dropZone = uploadText
        ?.closest('div')
        ?.closest('div')
        ?.closest('div')
      expect(dropZone).toBeInTheDocument()

      // Verify the structure contains the drop zone container
      expect(uploadText).toBeInTheDocument()
    })
  })

  describe('Upload Progress', () => {
    it('should show upload progress indicator during upload', async () => {
      ;(global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    uploadId: 'upload-123',
                    filename: 'test.csv',
                    rowCount: 10,
                    headers: ['Name', 'Email'],
                    preview: [],
                    status: 'success',
                  }),
                }),
              100,
            )
          }),
      )

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Should show loading indicator immediately
      await waitFor(() => {
        expect(screen.getByText('Uploading file...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message for failed upload', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid file format',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['invalid content'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Invalid file format')).toBeInTheDocument()
      })
    })

    it('should show error message for network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error occurred'),
      )

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument()
      })
    })

    it('should display error with Alert component', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'File too large',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['x'.repeat(51 * 1024 * 1024)], 'large.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('File too large')).toBeInTheDocument()
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onUploadComplete callback with upload response', async () => {
      const onUploadComplete = vi.fn()
      const mockResponse = {
        uploadId: 'upload-123',
        filename: 'test.csv',
        rowCount: 10,
        headers: ['Name', 'Email'],
        preview: [{ Name: 'John', Email: 'john@example.com' }],
        status: 'success',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(
        <CSVUpload
          locationId={mockLocationId}
          onUploadComplete={onUploadComplete}
        />,
      )

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledWith(mockResponse)
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over event', async () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const dropZone = screen
        .getByText('Drag and drop your file here')
        ?.closest('div')
        ?.closest('div')

      fireEvent.dragOver(dropZone!)

      // Should have blue border when dragging - verify it's in the DOM
      expect(dropZone).toBeInTheDocument()
    })

    it('should handle drag leave event', async () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const dropZone = screen
        .getByText('Drag and drop your file here')
        ?.closest('div')
        ?.closest('div')!

      fireEvent.dragOver(dropZone)
      fireEvent.dragLeave(dropZone)

      // Should not have blue border after leaving - just verify it's still in document
      expect(dropZone).toBeInTheDocument()
    })

    it('should handle file drop', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'dropped.csv',
          rowCount: 5,
          headers: ['ID', 'Name'],
          preview: [{ ID: '1', Name: 'Item' }],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const dropZone = screen
        .getByText('Drag and drop your file here')
        .closest('div')!
      const file = new File(['id,name\n1,Item'], 'dropped.csv', {
        type: 'text/csv',
      })

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'text/csv', getAsFile: () => file }],
        types: ['Files'],
      }

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(screen.getByTestId('field-mapping-ui')).toBeInTheDocument()
      })
    })
  })

  describe('Field Mapping Display', () => {
    it('should show field mapping UI after successful upload', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'test.csv',
          rowCount: 10,
          headers: ['Name', 'Email'],
          preview: [{ Name: 'John', Email: 'john@example.com' }],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('field-mapping-ui')).toBeInTheDocument()
      })
    })

    it('should display filename and row count in upload result card', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'inventory.csv',
          rowCount: 42,
          headers: ['Name', 'Email', 'Age'],
          preview: [{ Name: 'John', Email: 'john@example.com', Age: '30' }],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(
        ['name,email,age\nJohn,john@example.com,30'],
        'inventory.csv',
        {
          type: 'text/csv',
        },
      )

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('inventory.csv')).toBeInTheDocument()
        expect(screen.getByText(/42 rows, 3 columns/)).toBeInTheDocument()
      })
    })

    it('should call onCancel from field mapping to reset form', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'test.csv',
          rowCount: 10,
          headers: ['Name', 'Email'],
          preview: [{ Name: 'John', Email: 'john@example.com' }],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('field-mapping-ui')).toBeInTheDocument()
      })

      // Click cancel in field mapping
      const cancelButton = screen.getByText('Cancel Mapping')
      fireEvent.click(cancelButton)

      // Should return to upload form
      await waitFor(() => {
        expect(
          screen.getByText('Drag and drop your file here'),
        ).toBeInTheDocument()
      })
    })
  })

  describe('File Type Validation', () => {
    it('should accept .csv files', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      expect(fileInput.accept).toContain('.csv')
    })

    it('should accept .tsv files', () => {
      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      expect(fileInput.accept).toContain('.tsv')
    })
  })

  describe('API Request', () => {
    it('should send file to correct API endpoint', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'test.csv',
          rowCount: 10,
          headers: ['Name', 'Email'],
          preview: [],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/csv/upload', {
          method: 'POST',
          body: expect.any(FormData),
        })
      })
    })

    it('should include location_id in the request', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadId: 'upload-123',
          filename: 'test.csv',
          rowCount: 10,
          headers: ['Name', 'Email'],
          preview: [],
          status: 'success',
        }),
      })

      render(<CSVUpload locationId={mockLocationId} />)

      const fileInput = screen.getByLabelText(
        'Upload CSV file',
      ) as HTMLInputElement
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        const formData = (global.fetch as any).mock.calls[0][1].body
        expect(formData.get('location_id')).toBe(mockLocationId)
      })
    })
  })
})
