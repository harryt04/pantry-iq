'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CSVUploadProps {
  locationId: string
  onUploadComplete?: (data: UploadResult) => void
}

interface UploadResult {
  uploadId: string
  filename: string
  rowCount: number
  headers: string[]
  preview: Record<string, string>[]
  status: string
}

export function CSVUpload({ locationId, onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('location_id', locationId)

        const response = await fetch('/api/csv/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Upload failed')
          return
        }

        setUploadResult(data)
        onUploadComplete?.(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setIsUploading(false)
      }
    },
    [locationId, onUploadComplete],
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Drag and drop a CSV or TSV file, or click to browse (max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600'
            } ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              aria-label="Upload CSV file"
            />

            <div className="flex flex-col items-center justify-center text-center">
              {isUploading ? (
                <>
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Uploading file...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Drag and drop your file here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    or click to select a file
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success - Preview */}
      {uploadResult && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  Upload Successful
                </CardTitle>
                <CardDescription className="text-green-800 dark:text-green-200">
                  {uploadResult.filename}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  Total Rows
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {uploadResult.rowCount}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  Columns
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {uploadResult.headers.length}
                </p>
              </div>
            </div>

            {/* Headers */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Column Headers
              </p>
              <div className="flex flex-wrap gap-2">
                {uploadResult.headers.map((header, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-100"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            {uploadResult.preview.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview (First {uploadResult.preview.length} rows)
                </p>
                <div className="overflow-x-auto rounded-lg border border-green-200 dark:border-green-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-green-200 bg-green-100 dark:border-green-900 dark:bg-green-900">
                        {uploadResult.headers.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-2 text-left font-semibold text-green-900 dark:text-green-100"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.preview.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-green-100 last:border-0 dark:border-green-900"
                        >
                          {uploadResult.headers.map((header) => (
                            <td
                              key={`${rowIdx}-${header}`}
                              className="px-4 py-2 text-gray-700 dark:text-gray-300"
                            >
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  setUploadResult(null)
                  setError(null)
                  fileInputRef.current?.click()
                }}
                variant="outline"
              >
                Upload Another File
              </Button>
              <Button variant="default" disabled>
                Continue to Field Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
