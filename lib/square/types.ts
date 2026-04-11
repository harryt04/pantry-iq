/**
 * Square API integration types
 */

export interface SquareTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  merchant_id: string
}

export interface SquareTransaction {
  id: string
  created_at: string
  closed_at: string
  state: string
  total_money: {
    amount: number
    currency: string
  }
  line_items: Array<{
    uid: string
    name: string
    quantity: string
    gross_sales_money: {
      amount: number
      currency: string
    }
    item_detail?: {
      catalog_object_id: string
    }
  }>
}

export interface SquareCatalogObject {
  type: string
  id: string
  updated_at: string
  version: number
  is_deleted: boolean
  item?: {
    name: string
    description?: string
    category_id?: string
    variations?: Array<{
      type: string
      id: string
      item_variation_data?: {
        name: string
        pricing_data?: {
          price_money?: {
            amount: number
            currency: string
          }
        }
      }
    }>
  }
}

export interface PantryIQTransaction {
  locationId: string
  date: Date
  item: string
  qty: number
  revenue?: number
  cost?: number
  source: 'square' | 'csv' | 'manual'
  sourceId: string
}

export interface SyncResult {
  synced: number
  errors: number
  lastSyncTime: Date
  nextSyncTime?: Date
}
