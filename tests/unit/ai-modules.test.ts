import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the database module - factory function is hoisted
vi.mock('@/db', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  }
})

import { buildContextData } from '@/lib/ai/context-builder'
import {
  persistStreamedMessage,
  persistUserMessage,
  type StreamedMessageData,
} from '@/lib/ai/stream-handler'
import {
  initializeProviders,
  getProviders,
  hasAvailableProviders,
  getAvailableProviderNames,
} from '@/lib/ai/providers'
import { db } from '@/db'

describe('AI Modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })

  // ============================================================================
  // CONTEXT BUILDER TESTS
  // ============================================================================

  describe('buildContextData', () => {
    describe('buildContextData() aggregates transactions, weather, places into structured context', () => {
      it('should return empty object when all data sources are empty', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

        const context = await buildContextData('loc-1', 30)

        expect(context).toEqual({})
      })

      it('should handle daysBack parameter correctly', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

        await buildContextData('loc-1', 7)
        await buildContextData('loc-1', 90)

        // Both calls should work without error
        expect(mockDb.select).toHaveBeenCalled()
      })

      it('should use default 30 days when daysBack not provided', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

        await buildContextData('loc-1')

        expect(mockDb.select).toHaveBeenCalled()
      })

      it('should handle database connection errors gracefully', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockImplementation(() => {
          throw new Error('Database connection failed')
        })

        const context = await buildContextData('loc-1', 30)

        // Should return empty object on error
        expect(context).toEqual({})
      })
    })

    describe('buildContextData() handles empty data sets gracefully', () => {
      it('should return empty object when transactions are empty', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

        const context = await buildContextData('loc-1')

        expect(context).toEqual({})
      })

      it('should gracefully handle null location', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        })

        const context = await buildContextData('')

        expect(context).toEqual({})
      })

      it('should handle all query errors gracefully', async () => {
        const mockDb = db as unknown as Record<string, unknown>

        mockDb.select.mockImplementation(() => {
          throw new Error('Query failed')
        })

        const context = await buildContextData('loc-1')

        expect(context).toEqual({})
      })
    })
  })

  // ============================================================================
  // STREAM HANDLER TESTS
  // ============================================================================

  describe('Stream Handler', () => {
    describe('persistStreamedMessage() saves assistant messages to database', () => {
      it('should persist assistant message with all required fields', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Analysis of your inventory...',
            modelUsed: 'gpt-4',
            tokensIn: 150,
            tokensOut: 200,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Analysis of your inventory...',
          modelUsed: 'gpt-4',
          tokensIn: 150,
          tokensOut: 200,
        }

        const id = await persistStreamedMessage(messageData)

        expect(id).toBe('msg-1')
        expect(mockDb.insert).toHaveBeenCalled()
        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Analysis of your inventory...',
            modelUsed: 'gpt-4',
            tokensIn: 150,
            tokensOut: 200,
          }),
        )
      })

      it('should throw error when insert returns no rows', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test content',
          modelUsed: 'gpt-4',
          tokensIn: 100,
          tokensOut: 200,
        }

        await expect(persistStreamedMessage(messageData)).rejects.toThrow(
          'Failed to insert message',
        )
      })

      it('should throw error when insert fails', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi
          .fn()
          .mockRejectedValue(new Error('Database insert failed'))

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test content',
          modelUsed: 'gpt-4',
          tokensIn: 100,
          tokensOut: 200,
        }

        await expect(persistStreamedMessage(messageData)).rejects.toThrow(
          'Database insert failed',
        )
      })

      it('should preserve token counts accurately', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-3',
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Test message',
            modelUsed: 'gpt-3.5-turbo',
            tokensIn: 42,
            tokensOut: 87,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test message',
          modelUsed: 'gpt-3.5-turbo',
          tokensIn: 42,
          tokensOut: 87,
        }

        await persistStreamedMessage(messageData)

        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            tokensIn: 42,
            tokensOut: 87,
          }),
        )
      })

      it('should handle long streamed content', async () => {
        const longContent = 'A'.repeat(10000)
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-2',
            conversationId: 'conv-1',
            role: 'assistant',
            content: longContent,
            modelUsed: 'claude-3',
            tokensIn: 500,
            tokensOut: 1000,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: longContent,
          modelUsed: 'claude-3',
          tokensIn: 500,
          tokensOut: 1000,
        }

        const id = await persistStreamedMessage(messageData)

        expect(id).toBe('msg-2')
      })

      it('should handle different model types', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-4',
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Test',
            modelUsed: 'claude-3-opus',
            tokensIn: 100,
            tokensOut: 150,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const messageData: StreamedMessageData = {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Test',
          modelUsed: 'claude-3-opus',
          tokensIn: 100,
          tokensOut: 150,
        }

        const id = await persistStreamedMessage(messageData)

        expect(id).toBe('msg-4')
      })
    })

    describe('persistUserMessage() saves user messages to database', () => {
      it('should persist user message with only conversationId and content', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-100',
            conversationId: 'conv-1',
            role: 'user',
            content: 'What is my inventory status?',
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const id = await persistUserMessage(
          'conv-1',
          'What is my inventory status?',
        )

        expect(id).toBe('msg-100')
        expect(mockDb.insert).toHaveBeenCalled()
        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationId: 'conv-1',
            role: 'user',
            content: 'What is my inventory status?',
          }),
        )
      })

      it('should not include modelUsed or tokens for user messages', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-101',
            conversationId: 'conv-1',
            role: 'user',
            content: 'Test user message',
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        await persistUserMessage('conv-1', 'Test user message')

        const callArgs = mockValues.mock.calls[0][0]
        expect(callArgs).not.toHaveProperty('modelUsed')
        expect(callArgs).not.toHaveProperty('tokensIn')
        expect(callArgs).not.toHaveProperty('tokensOut')
      })

      it('should throw error when user message insert fails', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi
          .fn()
          .mockRejectedValue(new Error('Database insert failed'))

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        await expect(
          persistUserMessage('conv-1', 'Test message'),
        ).rejects.toThrow('Database insert failed')
      })

      it('should throw error when no rows returned from insert', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        await expect(
          persistUserMessage('conv-1', 'Test message'),
        ).rejects.toThrow('Failed to insert user message')
      })

      it('should handle long user messages', async () => {
        const longMessage = 'Q'.repeat(5000)
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-102',
            conversationId: 'conv-1',
            role: 'user',
            content: longMessage,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const id = await persistUserMessage('conv-1', longMessage)

        expect(id).toBe('msg-102')
      })

      it('should handle messages with special characters', async () => {
        const specialMessage = 'Test: 🎯 @user #tag $200 %discount & more!'
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi.fn().mockResolvedValue([
          {
            id: 'msg-103',
            conversationId: 'conv-1',
            role: 'user',
            content: specialMessage,
            createdAt: new Date(),
          },
        ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const id = await persistUserMessage('conv-1', specialMessage)

        expect(id).toBe('msg-103')
        expect(mockValues).toHaveBeenCalledWith(
          expect.objectContaining({
            content: specialMessage,
          }),
        )
      })

      it('should handle multiple messages in sequence', async () => {
        const mockDb = db as unknown as Record<string, unknown>
        const mockValues = vi.fn().mockReturnThis()
        const mockReturning = vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'msg-1',
              role: 'user',
              content: 'First message',
              conversationId: 'conv-1',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'msg-2',
              role: 'user',
              content: 'Second message',
              conversationId: 'conv-1',
            },
          ])

        mockDb.insert.mockReturnValue({
          values: mockValues,
        })
        mockValues.mockReturnValue({
          returning: mockReturning,
        })

        const id1 = await persistUserMessage('conv-1', 'First message')
        const id2 = await persistUserMessage('conv-1', 'Second message')

        expect(id1).toBe('msg-1')
        expect(id2).toBe('msg-2')
      })
    })
  })

  // ============================================================================
  // PROVIDERS TESTS
  // ============================================================================

  describe('Providers', () => {
    describe('initializeProviders() returns correct providers based on env keys', () => {
      it('should initialize all three providers when all keys are set', () => {
        process.env.OPENAI_API_KEY = 'test-openai-key'
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
        expect(providers).toHaveProperty('anthropic')
        expect(providers).toHaveProperty('google')
      })

      it('should initialize only OpenAI when only OPENAI_API_KEY is set', () => {
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.OPENAI_API_KEY = 'test-openai-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
        expect(providers).not.toHaveProperty('anthropic')
        expect(providers).not.toHaveProperty('google')
        expect(Object.keys(providers).length).toBeGreaterThan(0)
      })

      it('should initialize only Anthropic when only ANTHROPIC_API_KEY is set', () => {
        delete process.env.OPENAI_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

        const providers = initializeProviders()

        expect(providers).not.toHaveProperty('openai')
        expect(providers).toHaveProperty('anthropic')
        expect(providers).not.toHaveProperty('google')
      })

      it('should initialize only Google when only GOOGLE_GENERATIVE_AI_API_KEY is set', () => {
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key'

        const providers = initializeProviders()

        expect(providers).not.toHaveProperty('openai')
        expect(providers).not.toHaveProperty('anthropic')
        expect(providers).toHaveProperty('google')
      })

      it('should initialize multiple providers when multiple keys are set', () => {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.OPENAI_API_KEY = 'test-openai-key'
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
        expect(providers).toHaveProperty('anthropic')
        expect(Object.keys(providers).length).toBe(2)
      })

      it('should support Anthropic + Google combination', () => {
        delete process.env.OPENAI_API_KEY
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('anthropic')
        expect(providers).toHaveProperty('google')
        expect(Object.keys(providers).length).toBe(2)
      })

      it('should support OpenAI + Google combination', () => {
        process.env.OPENAI_API_KEY = 'test-openai-key'
        delete process.env.ANTHROPIC_API_KEY
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
        expect(providers).toHaveProperty('google')
        expect(Object.keys(providers).length).toBe(2)
      })
    })

    describe('initializeProviders() returns empty when no keys set', () => {
      it('should return empty object when no API keys are set', () => {
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

        const providers = initializeProviders()

        expect(providers).toEqual({})
        expect(Object.keys(providers).length).toBe(0)
      })

      it('should return empty object when API keys are explicitly empty strings', () => {
        process.env.OPENAI_API_KEY = ''
        process.env.ANTHROPIC_API_KEY = ''
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''

        const providers = initializeProviders()

        expect(providers).toEqual({})
      })
    })

    describe('initializeProviders() respects provider availability', () => {
      it('should include Anthropic when available', () => {
        process.env.ANTHROPIC_API_KEY = 'test-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('anthropic')
      })

      it('should include OpenAI when available', () => {
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.OPENAI_API_KEY = 'test-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
      })

      it('should include Google when available', () => {
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('google')
      })
    })

    describe('Provider helper functions', () => {
      it('getProviders() should return object structure', () => {
        const providers = getProviders()

        expect(providers).toBeDefined()
        expect(typeof providers).toBe('object')
      })

      it('getProviders() should return cached instance on second call', () => {
        const providers1 = getProviders()
        const providers2 = getProviders()

        // Verify caching behavior - same reference returned
        expect(providers1).toBe(providers2)
      })

      it('hasAvailableProviders() should return boolean', () => {
        const hasProviders = hasAvailableProviders()

        expect(typeof hasProviders).toBe('boolean')
      })

      it('getAvailableProviderNames() should return array', () => {
        const names = getAvailableProviderNames()

        expect(Array.isArray(names)).toBe(true)
      })

      it('initializeProviders() called directly with no env vars returns empty object', () => {
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

        const providers = initializeProviders()

        expect(providers).toEqual({})
      })

      it('initializeProviders() called directly with keys returns providers', () => {
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        process.env.OPENAI_API_KEY = 'test-key'

        const providers = initializeProviders()

        expect(Object.keys(providers).length).toBeGreaterThan(0)
      })

      it('initializeProviders() respects all three API key environment variables', () => {
        process.env.OPENAI_API_KEY = 'test-openai'
        process.env.ANTHROPIC_API_KEY = 'test-anthropic'
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google'

        const providers = initializeProviders()

        expect(Object.keys(providers).length).toBe(3)
      })

      it('initializeProviders() handles partial API key configuration', () => {
        process.env.OPENAI_API_KEY = 'test-openai'
        delete process.env.ANTHROPIC_API_KEY
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google'

        const providers = initializeProviders()

        expect(providers).toHaveProperty('openai')
        expect(providers).toHaveProperty('google')
        expect(providers).not.toHaveProperty('anthropic')
      })

      it('initializeProviders() ignores empty string API keys', () => {
        process.env.OPENAI_API_KEY = ''
        process.env.ANTHROPIC_API_KEY = ''
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''

        const providers = initializeProviders()

        expect(Object.keys(providers).length).toBe(0)
      })
    })
  })
})
