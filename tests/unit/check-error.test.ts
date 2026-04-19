import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/csv/upload/route'

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}))

vi.mock('@/lib/csv/parser', () => ({
  parseCSV: vi.fn(),
}))

describe('Debug', () => {
  it('should print error message', async () => {
    const blob = new Blob(['col1,col2\nval1,val2\n'], { type: 'text/csv' })
    const file = new File([blob], 'test.csv', { type: 'text/csv' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('location_id', 'loc-123')

    const request = new NextRequest('http://localhost:3000/api/csv/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const body = await response.json()

    console.log('Status:', response.status)
    console.log('Error:', body.error)

    expect(response.status).toBe(400)
  })
})
