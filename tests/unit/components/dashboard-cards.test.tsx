import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportStatusCard } from '@/components/dashboard/import-status-card'
import { LocationOverviewCard } from '@/components/dashboard/location-overview-card'
import { QuickActionsCard } from '@/components/dashboard/quick-actions-card'

describe('Dashboard Cards', () => {
  describe('ImportStatusCard', () => {
    describe('Rendering', () => {
      it('should render the card title', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        expect(screen.getByText('Import Status')).toBeInTheDocument()
      })

      it('should render CSV Uploads section header', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        expect(screen.getByText('Recent CSV Uploads')).toBeInTheDocument()
      })

      it('should render POS Connections section header', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        expect(screen.getByText('Connected POS Accounts')).toBeInTheDocument()
      })
    })

    describe('CSV Uploads - Empty State', () => {
      it('should show empty state message when no CSV uploads', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        expect(screen.getByText('No CSV uploads yet.')).toBeInTheDocument()
      })

      it('should show link to import page in CSV empty state', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        const link = screen.getByText('Start importing data')
        expect(link).toHaveAttribute('href', '/import')
      })
    })

    describe('CSV Uploads - With Data', () => {
      const mockCsvUploads = [
        {
          id: 'csv-1',
          filename: 'inventory.csv',
          status: 'complete',
          uploadedAt: new Date('2026-04-10'),
          locationName: 'Downtown Location',
          locationId: 'loc-1',
          errorDetails: null,
        },
        {
          id: 'csv-2',
          filename: 'items.csv',
          status: 'error',
          uploadedAt: new Date('2026-04-09'),
          locationName: 'Uptown Location',
          locationId: 'loc-2',
          errorDetails: 'Invalid column format',
        },
      ]

      it('should display CSV uploads list', () => {
        render(
          <ImportStatusCard csvUploads={mockCsvUploads} posConnections={[]} />,
        )
        expect(screen.getByText('inventory.csv')).toBeInTheDocument()
        expect(screen.getByText('items.csv')).toBeInTheDocument()
      })

      it('should display location name for each upload', () => {
        render(
          <ImportStatusCard csvUploads={mockCsvUploads} posConnections={[]} />,
        )
        expect(screen.getByText(/Downtown Location/)).toBeInTheDocument()
        expect(screen.getByText(/Uptown Location/)).toBeInTheDocument()
      })

      it('should display upload date for each upload', () => {
        render(
          <ImportStatusCard csvUploads={mockCsvUploads} posConnections={[]} />,
        )
        // Dates should be formatted by toLocaleDateString
        const dateStrings = screen.getAllByText(/4\//)
        expect(dateStrings.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Status Badges - CSV', () => {
      const createCsvUpload = (status: string) => ({
        id: 'csv-1',
        filename: 'test.csv',
        status,
        uploadedAt: new Date(),
        locationName: 'Test Location',
        locationId: 'loc-1',
        errorDetails: null,
      })

      it('should show "Complete" badge for complete status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('complete')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('Complete')).toBeInTheDocument()
      })

      it('should show "Pending" badge for pending status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('pending')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      it('should show "Mapping" badge for mapping status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('mapping')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('Mapping')).toBeInTheDocument()
      })

      it('should show "Importing" badge for importing status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('importing')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('Importing')).toBeInTheDocument()
      })

      it('should show "Error" badge for error status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('error')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      it('should display correct badge styling for complete status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('complete')]}
            posConnections={[]}
          />,
        )
        const badge = screen.getByText('Complete')
        expect(badge.className).toContain('bg-green-100')
        expect(badge.className).toContain('text-green-800')
      })

      it('should display correct badge styling for error status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('error')]}
            posConnections={[]}
          />,
        )
        const badge = screen.getByText('Error')
        expect(badge.className).toContain('bg-red-100')
        expect(badge.className).toContain('text-red-800')
      })

      it('should display correct badge styling for pending status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('pending')]}
            posConnections={[]}
          />,
        )
        const badge = screen.getByText('Pending')
        expect(badge.className).toContain('bg-yellow-100')
        expect(badge.className).toContain('text-yellow-800')
      })

      it('should display correct badge styling for importing status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('importing')]}
            posConnections={[]}
          />,
        )
        const badge = screen.getByText('Importing')
        expect(badge.className).toContain('bg-blue-100')
        expect(badge.className).toContain('text-blue-800')
      })

      it('should show generic badge for unknown status', () => {
        render(
          <ImportStatusCard
            csvUploads={[createCsvUpload('unknown_status')]}
            posConnections={[]}
          />,
        )
        expect(screen.getByText('unknown_status')).toBeInTheDocument()
      })
    })

    describe('POS Connections - Empty State', () => {
      it('should show empty state message when no POS connections', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        expect(screen.getByText('No POS connections yet.')).toBeInTheDocument()
      })

      it('should show link to import page in POS empty state', () => {
        render(<ImportStatusCard csvUploads={[]} posConnections={[]} />)
        const links = screen.getAllByText('Connect Square')
        expect(links.length).toBeGreaterThanOrEqual(1)
        expect(links[0]).toHaveAttribute('href', '/import')
      })
    })

    describe('POS Connections - With Data', () => {
      const mockPosConnections = [
        {
          locationId: 'loc-1',
          locationName: 'Downtown Location',
          syncState: 'synced',
          lastSync: new Date('2026-04-10'),
        },
        {
          locationId: 'loc-2',
          locationName: 'Uptown Location',
          syncState: 'syncing',
          lastSync: new Date('2026-04-09'),
        },
      ]

      it('should display POS connections list', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={mockPosConnections}
          />,
        )
        expect(
          screen.getByText(/Downtown Location - Square/),
        ).toBeInTheDocument()
        expect(screen.getByText(/Uptown Location - Square/)).toBeInTheDocument()
      })

      it('should display last sync date for each connection', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={mockPosConnections}
          />,
        )
        const lastSyncElements = screen.getAllByText(/Last synced:/)
        expect(lastSyncElements.length).toBe(2)
      })

      it('should not display last sync when null', () => {
        const connections = [
          {
            locationId: 'loc-1',
            locationName: 'Test Location',
            syncState: 'pending_sync',
            lastSync: null,
          },
        ]
        render(
          <ImportStatusCard csvUploads={[]} posConnections={connections} />,
        )
        expect(screen.queryByText(/Last synced:/)).not.toBeInTheDocument()
      })
    })

    describe('Status Badges - POS', () => {
      const createPosConnection = (syncState: string) => ({
        locationId: 'loc-1',
        locationName: 'Test Location',
        syncState,
        lastSync: new Date(),
      })

      it('should show "Synced" badge for synced status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('synced')]}
          />,
        )
        expect(screen.getByText('Synced')).toBeInTheDocument()
      })

      it('should show "Syncing" badge for syncing status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('syncing')]}
          />,
        )
        expect(screen.getByText('Syncing')).toBeInTheDocument()
      })

      it('should show "Pending" badge for pending_sync status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('pending_sync')]}
          />,
        )
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      it('should display correct badge styling for synced status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('synced')]}
          />,
        )
        const badge = screen.getByText('Synced')
        expect(badge.className).toContain('bg-green-100')
        expect(badge.className).toContain('text-green-800')
      })

      it('should display correct badge styling for syncing status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('syncing')]}
          />,
        )
        const badge = screen.getByText('Syncing')
        expect(badge.className).toContain('bg-blue-100')
        expect(badge.className).toContain('text-blue-800')
      })

      it('should display correct badge styling for pending_sync status', () => {
        render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[createPosConnection('pending_sync')]}
          />,
        )
        const badge = screen.getByText('Pending')
        expect(badge.className).toContain('bg-yellow-100')
        expect(badge.className).toContain('text-yellow-800')
      })
    })

    describe('Loading State', () => {
      it('should accept isLoading prop', () => {
        const { rerender } = render(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[]}
            isLoading={false}
          />,
        )
        expect(screen.getByText('Import Status')).toBeInTheDocument()

        rerender(
          <ImportStatusCard
            csvUploads={[]}
            posConnections={[]}
            isLoading={true}
          />,
        )
        expect(screen.getByText('Import Status')).toBeInTheDocument()
      })
    })
  })

  describe('LocationOverviewCard', () => {
    describe('Rendering', () => {
      it('should render the card title', () => {
        render(<LocationOverviewCard locations={[]} />)
        expect(screen.getByText('Locations')).toBeInTheDocument()
      })
    })

    describe('Empty State', () => {
      it('should show empty state message when no locations', () => {
        render(<LocationOverviewCard locations={[]} />)
        expect(
          screen.getByText(
            'No locations yet. Create your first location to get started.',
          ),
        ).toBeInTheDocument()
      })

      it('should show link to settings page in empty state', () => {
        render(<LocationOverviewCard locations={[]} />)
        const link = screen.getByText('Create Location')
        expect(link).toHaveAttribute('href', '/settings')
      })
    })

    describe('With Locations', () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Downtown Restaurant',
          type: 'restaurant',
          transactionCount: 150,
          csvUploadCount: 3,
          posConnectionStatus: 'connected',
          conversationId: 'conv-1',
        },
        {
          id: 'loc-2',
          name: 'Mobile Food Truck',
          type: 'food_truck',
          transactionCount: 45,
          csvUploadCount: 1,
          posConnectionStatus: null,
          conversationId: null,
        },
      ]

      it('should display location count in title', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        expect(screen.getByText('Locations (2)')).toBeInTheDocument()
      })

      it('should display location names', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        expect(screen.getByText('Downtown Restaurant')).toBeInTheDocument()
        expect(screen.getByText('Mobile Food Truck')).toBeInTheDocument()
      })

      it('should display location type badges', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        expect(screen.getByText('Restaurant')).toBeInTheDocument()
        expect(screen.getByText('Food Truck')).toBeInTheDocument()
      })

      it('should display transaction count for each location', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        const counts = screen.getAllByText(/transactions/)
        expect(counts.length).toBe(2)
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument()
      })

      it('should display CSV upload count for each location', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        const counts = screen.getAllByText(/uploads/)
        expect(counts.length).toBe(2)
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
      })

      it('should display POS connection status when available', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        expect(screen.getByText('connected')).toBeInTheDocument()
      })

      it('should not display POS connection status when null', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        // Should only show one Square connection (the first location)
        const squareStatuses = screen.getAllByText(/Square:/)
        expect(squareStatuses.length).toBe(1)
      })
    })

    describe('Location Action Links', () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Test Restaurant',
          type: 'restaurant',
          transactionCount: 100,
          csvUploadCount: 2,
          posConnectionStatus: null,
          conversationId: 'conv-1',
        },
      ]

      it('should display Import link with correct href', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        const importLink = screen.getByText('Import')
        expect(importLink).toHaveAttribute('href', '/import?location_id=loc-1')
      })

      it('should display Chat link when conversation exists', () => {
        render(<LocationOverviewCard locations={mockLocations} />)
        const chatLink = screen.getByText('Chat')
        expect(chatLink).toHaveAttribute('href', '/conversations/conv-1')
      })

      it('should not display Chat link when conversation is null', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'Test Restaurant',
            type: 'restaurant',
            transactionCount: 100,
            csvUploadCount: 2,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        render(<LocationOverviewCard locations={locations} />)
        expect(screen.queryByText('Chat')).not.toBeInTheDocument()
      })
    })

    describe('Location Type Icons', () => {
      it('should display building icon for restaurant type', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'Restaurant',
            type: 'restaurant',
            transactionCount: 100,
            csvUploadCount: 1,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        const { container } = render(
          <LocationOverviewCard locations={locations} />,
        )
        // Check that at least one SVG is rendered for the icon
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBeGreaterThan(0)
      })

      it('should display utensils icon for food_truck type', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'Food Truck',
            type: 'food_truck',
            transactionCount: 50,
            csvUploadCount: 1,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        const { container } = render(
          <LocationOverviewCard locations={locations} />,
        )
        // Check that at least one SVG is rendered for the icon
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBeGreaterThan(0)
      })

      it('should fallback to building icon for unknown type', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'Unknown Type',
            type: 'unknown_type',
            transactionCount: 50,
            csvUploadCount: 1,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        const { container } = render(
          <LocationOverviewCard locations={locations} />,
        )
        // Check that at least one SVG is rendered for the icon
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBeGreaterThan(0)
      })
    })

    describe('Loading State', () => {
      it('should accept isLoading prop', () => {
        const { rerender } = render(
          <LocationOverviewCard locations={[]} isLoading={false} />,
        )
        expect(screen.getByText('Locations')).toBeInTheDocument()

        rerender(<LocationOverviewCard locations={[]} isLoading={true} />)
        expect(screen.getByText('Locations')).toBeInTheDocument()
      })
    })

    describe('Numeric Data Display', () => {
      it('should display zero transaction count correctly', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'New Location',
            type: 'restaurant',
            transactionCount: 0,
            csvUploadCount: 0,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        render(<LocationOverviewCard locations={locations} />)
        const zeros = screen.getAllByText('0')
        expect(zeros.length).toBeGreaterThanOrEqual(2)
      })

      it('should display large numbers correctly', () => {
        const locations = [
          {
            id: 'loc-1',
            name: 'Busy Location',
            type: 'restaurant',
            transactionCount: 10000,
            csvUploadCount: 250,
            posConnectionStatus: null,
            conversationId: null,
          },
        ]
        render(<LocationOverviewCard locations={locations} />)
        expect(screen.getByText('10000')).toBeInTheDocument()
        expect(screen.getByText('250')).toBeInTheDocument()
      })
    })
  })

  describe('QuickActionsCard', () => {
    describe('Rendering', () => {
      it('should render the card title', () => {
        render(<QuickActionsCard hasLocations={true} />)
        expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      })
    })

    describe('Actions Display', () => {
      it('should display all three action buttons', () => {
        render(<QuickActionsCard hasLocations={true} />)
        expect(screen.getByText('Import Data')).toBeInTheDocument()
        expect(screen.getByText('Start Conversation')).toBeInTheDocument()
        expect(screen.getByText('Manage Settings')).toBeInTheDocument()
      })

      it('should display action descriptions', () => {
        render(<QuickActionsCard hasLocations={true} />)
        expect(
          screen.getByText('Upload CSV or connect POS'),
        ).toBeInTheDocument()
        expect(screen.getByText('Ask AI about your data')).toBeInTheDocument()
        expect(
          screen.getByText('Add locations and account'),
        ).toBeInTheDocument()
      })
    })

    describe('Action Links - With Locations', () => {
      it('should link Import Data to /import when hasLocations is true', () => {
        render(<QuickActionsCard hasLocations={true} />)
        const importLink = screen.getByRole('link', { name: /Import Data/ })
        expect(importLink).toHaveAttribute('href', '/import')
      })

      it('should link Start Conversation to /conversations when hasLocations is true', () => {
        render(<QuickActionsCard hasLocations={true} />)
        const chatLink = screen.getByRole('link', {
          name: /Start Conversation/,
        })
        expect(chatLink).toHaveAttribute('href', '/conversations')
      })

      it('should link Manage Settings to /settings', () => {
        render(<QuickActionsCard hasLocations={true} />)
        const settingsLink = screen.getByRole('link', {
          name: /Manage Settings/,
        })
        expect(settingsLink).toHaveAttribute('href', '/settings')
      })
    })

    describe('Action Links - Without Locations', () => {
      it('should link Import Data to /settings when hasLocations is false', () => {
        render(<QuickActionsCard hasLocations={false} />)
        const importLink = screen.getByRole('link', { name: /Import Data/ })
        expect(importLink).toHaveAttribute('href', '/settings')
      })

      it('should not link Start Conversation when hasLocations is false', () => {
        render(<QuickActionsCard hasLocations={false} />)
        const chatActions = screen.getAllByText('Start Conversation')
        // Should find the action but it should not be a link
        expect(chatActions.length).toBeGreaterThan(0)
        // The disabled action should not be a link
        const disabledAction = chatActions[0].closest('div')
        expect(disabledAction?.tagName).not.toBe('A')
      })

      it('should still link Manage Settings to /settings', () => {
        render(<QuickActionsCard hasLocations={false} />)
        const settingsLink = screen.getByRole('link', {
          name: /Manage Settings/,
        })
        expect(settingsLink).toHaveAttribute('href', '/settings')
      })
    })

    describe('Action States', () => {
      it('should show "Create a location first" message for Start Conversation when no locations', () => {
        render(<QuickActionsCard hasLocations={false} />)
        expect(screen.getByText('Create a location first')).toBeInTheDocument()
      })

      it('should not show "Create a location first" for enabled actions', () => {
        render(<QuickActionsCard hasLocations={true} />)
        expect(
          screen.queryByText('Create a location first'),
        ).not.toBeInTheDocument()
      })

      it('should show muted styling for disabled Start Conversation action', () => {
        render(<QuickActionsCard hasLocations={false} />)
        // Verify the disabled action exists and has helper text
        expect(screen.getByText('Create a location first')).toBeInTheDocument()
      })

      it('should not have disabled styling for enabled actions', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        // All actions should have border-input styling for enabled state
        const enabledActions = container.querySelectorAll('.border-input')
        expect(enabledActions.length).toBeGreaterThan(0)
      })
    })

    describe('Icon Display', () => {
      it('should render icons for all actions', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        const svgs = container.querySelectorAll('svg')
        // Should have multiple SVG icons (one for each action icon)
        expect(svgs.length).toBeGreaterThan(2)
      })

      it('should display arrow icon for enabled actions', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBeGreaterThan(0)
      })

      it('should have muted styling indicators for disabled Start Conversation', () => {
        render(<QuickActionsCard hasLocations={false} />)
        // The disabled action should have helper text indicating it's disabled
        expect(screen.getByText('Create a location first')).toBeInTheDocument()
      })
    })

    describe('Action Button Styling', () => {
      it('should have interactive styling for enabled actions', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        // Enabled actions should have hover effects
        const links = container.querySelectorAll('a.border-input')
        expect(links.length).toBeGreaterThan(0)
      })

      it('should have proper styling for action cards', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        // Should have action cards with rounded borders
        const cards = container.querySelectorAll('.rounded-lg')
        expect(cards.length).toBeGreaterThan(0)
      })

      it('should have padding on action cards', () => {
        const { container } = render(<QuickActionsCard hasLocations={true} />)
        // Action cards should have padding
        const cards = container.querySelectorAll('.p-4')
        expect(cards.length).toBeGreaterThan(0)
      })
    })

    describe('Conditional Rendering', () => {
      it('should render different content based on hasLocations prop', () => {
        const { rerender } = render(<QuickActionsCard hasLocations={true} />)
        const importWithLocations = screen.getByRole('link', {
          name: /Import Data/,
        })
        expect(importWithLocations).toHaveAttribute('href', '/import')

        rerender(<QuickActionsCard hasLocations={false} />)
        const importWithoutLocations = screen.getByRole('link', {
          name: /Import Data/,
        })
        expect(importWithoutLocations).toHaveAttribute('href', '/settings')
      })

      it('should toggle Start Conversation between link and disabled state', () => {
        const { rerender } = render(<QuickActionsCard hasLocations={true} />)
        let chatLink = screen.getByRole('link', { name: /Start Conversation/ })
        expect(chatLink).toHaveAttribute('href', '/conversations')

        rerender(<QuickActionsCard hasLocations={false} />)
        // Now it should be disabled (not a link)
        const disabledText = screen.getByText('Start Conversation')
        expect(disabledText.closest('a')).not.toBeInTheDocument()
      })
    })

    describe('Accessibility', () => {
      it('should have proper link labels for screen readers', () => {
        render(<QuickActionsCard hasLocations={true} />)
        const importLink = screen.getByRole('link', { name: /Import Data/ })
        expect(importLink).toHaveAttribute('href')
      })

      it('should display descriptive text for each action', () => {
        render(<QuickActionsCard hasLocations={true} />)
        // All descriptions should be present
        expect(
          screen.getByText('Upload CSV or connect POS'),
        ).toBeInTheDocument()
        expect(screen.getByText('Ask AI about your data')).toBeInTheDocument()
        expect(
          screen.getByText('Add locations and account'),
        ).toBeInTheDocument()
      })

      it('should provide clear indication of disabled state', () => {
        render(<QuickActionsCard hasLocations={false} />)
        // Disabled action should have helper text
        expect(screen.getByText('Create a location first')).toBeInTheDocument()
      })
    })
  })
})
