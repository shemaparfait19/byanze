export interface Client {
  id: string
  name: string
  phone: string
  address?: string
  visitCount: number
  rewardClaimed: boolean
  lastVisit: string
  createdAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Invoice {
  id: string
  client: Client
  items: InvoiceItem[]
  total: number
  paymentMethod: string
  status: 'pending' | 'completed' | 'cancelled'
  pickupDate?: string
  pickupTime?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
