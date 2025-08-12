'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Award } from 'lucide-react'
import { useSupabaseStore } from '@/lib/supabase-store'
import { formatCurrency } from '@/lib/utils'

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const { clients, invoices, loading } = useSupabaseStore()

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  const getClientStats = (clientId: string) => {
    const clientInvoices = invoices.filter(inv => inv.client.id === clientId)
    const totalSpent = clientInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const completedInvoices = clientInvoices.filter(inv => inv.status === 'completed').length
    
    return {
      totalInvoices: clientInvoices.length,
      totalSpent,
      completedInvoices,
      lastInvoice: clientInvoices.length > 0 ? 
        new Date(Math.max(...clientInvoices.map(inv => new Date(inv.createdAt).getTime()))) : null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          const stats = getClientStats(client.id)
          return (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {client.visitCount >= 5 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Award className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Phone:</strong> {client.phone}
                  </p>
                  {client.address && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Address:</strong> {client.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalInvoices}</p>
                    <p className="text-xs text-muted-foreground">Total Invoices</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completedInvoices}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm">
                    <strong>Total Spent:</strong> {formatCurrency(stats.totalSpent)}
                  </p>
                  {stats.lastInvoice && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Last Visit:</strong> {stats.lastInvoice.toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Member since {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No clients found matching your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
