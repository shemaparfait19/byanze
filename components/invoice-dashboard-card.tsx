'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, XCircle, Eye, Edit } from 'lucide-react'
import { InvoiceStatusManager } from '@/components/invoice-status-manager'
import { formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

interface InvoiceDashboardCardProps {
  invoice: Invoice
  onView: (invoice: Invoice) => void
  onEdit: (invoiceId: string) => void
}

export function InvoiceDashboardCard({ invoice, onView, onEdit }: InvoiceDashboardCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const isPickupDue = () => {
    if (!invoice.pickupDate || !invoice.pickupTime) return false
    
    const now = new Date()
    const pickupDateTime = new Date(`${invoice.pickupDate}T${invoice.pickupTime}:00`)
    const timeDiff = pickupDateTime.getTime() - now.getTime()
    const minutesDiff = timeDiff / (1000 * 60)
    
    return minutesDiff <= 30 && minutesDiff >= -60
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${
      isPickupDue() ? 'border-orange-200 bg-orange-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {invoice.client.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon(invoice.status)}
            {isPickupDue() && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                Pickup Due
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Invoice:</span>
            <p className="font-mono">{invoice.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>
            <p className="font-semibold">{formatCurrency(invoice.total)}</p>
          </div>
        </div>

        {invoice.pickupDate && invoice.pickupTime && (
          <div className="text-xs">
            <span className="text-muted-foreground">Pickup:</span>
            <p className={isPickupDue() ? 'text-orange-700 font-medium' : ''}>
              {invoice.pickupDate} at {invoice.pickupTime}
            </p>
          </div>
        )}

        <div className="pt-2 border-t">
          <InvoiceStatusManager 
            invoice={invoice} 
            compact={true} 
            showDetails={false} 
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(invoice)}
            className="flex-1 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(invoice.id)}
            className="flex-1 text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
