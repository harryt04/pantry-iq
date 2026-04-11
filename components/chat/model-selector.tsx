'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  MODEL_REGISTRY,
  ModelTier,
  calculateCost,
  formatCost,
} from '@/lib/ai/models'
import { ChevronDown } from 'lucide-react'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentModel = MODEL_REGISTRY.find((m) => m.id === selectedModel)
  const budgetModels = MODEL_REGISTRY.filter((m) => m.tier === 'budget')
  const midTierModels = MODEL_REGISTRY.filter((m) => m.tier === 'mid')

  // Estimate cost for a typical message (500 input tokens, 200 output tokens)
  const estimateCost = (modelId: string) => {
    const cost = calculateCost(modelId, 500, 200)
    return formatCost(cost)
  }

  const handleSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        disabled={disabled}
        className="w-full justify-between"
      >
        <span className="truncate">
          {currentModel?.displayName || 'Select model'}
        </span>
        <ChevronDown className="size-4 shrink-0" />
      </Button>

      {isOpen && (
        <div className="bg-background absolute bottom-full mb-2 w-full rounded-lg border shadow-lg">
          {/* Budget Tier */}
          <div className="border-b p-3">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold">
              BUDGET
            </h3>
            {budgetModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                  selectedModel === model.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.displayName}</span>
                  <span className="text-xs opacity-70">
                    {estimateCost(model.id)}/msg
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Mid-Tier */}
          <div className="p-3">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold">
              MID TIER
            </h3>
            {midTierModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={`mb-2 w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                  selectedModel === model.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{model.displayName}</div>
                    <div className="text-destructive text-xs">
                      ⚠️ This model costs more
                    </div>
                  </div>
                  <span className="ml-2 text-xs opacity-70">
                    {estimateCost(model.id)}/msg
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
