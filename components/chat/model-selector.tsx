'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MODEL_REGISTRY, calculateCost, formatCost } from '@/lib/ai/models'
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="truncate">
            {currentModel?.displayName || 'Select model'}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Budget Tier */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold">
            BUDGET
          </DropdownMenuLabel>
          {budgetModels.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className={`cursor-pointer ${
                selectedModel === model.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span>{model.displayName}</span>
                <span className="ml-2 text-xs opacity-70">
                  {estimateCost(model.id)}/msg
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Mid-Tier */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold">
            MID TIER
          </DropdownMenuLabel>
          {midTierModels.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className={`cursor-pointer ${
                selectedModel === model.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex w-full flex-col">
                <div className="flex items-center justify-between">
                  <span>{model.displayName}</span>
                  <span className="ml-2 text-xs opacity-70">
                    {estimateCost(model.id)}/msg
                  </span>
                </div>
                <div className="text-destructive text-xs">
                  ⚠️ This model costs more
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
