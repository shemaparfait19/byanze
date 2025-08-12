'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, TrendingUp, DollarSign, FileText, Download, Users, BarChart3, PieChart, Activity, Target } from 'lucide-react'
import { useSupabaseStore } from '@/lib/supabase-store'
import { formatCurrency } from '@/lib/utils'

export function AdvancedReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  
  const { invoices, clients } = useSupabaseStore()

  // Filter invoices based on selected period
  const filteredInvoices = useMemo(() => {
    switch (selectedPeriod) {
      case 'daily':
        return invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0]
          return invoiceDate === selectedDate
        })
      case 'monthly':
        return invoices.filter(invoice => {
          const invoiceMonth = new Date(invoice.createdAt).toISOString().slice(0, 7)
          return invoiceMonth === selectedMonth
        })
      case 'yearly':
        return invoices.filter(invoice => {
          const invoiceYear = new Date(invoice.createdAt).getFullYear().toString()
          return invoiceYear === selectedYear
        })
      default:
        return invoices
    }
  }, [invoices, selectedPeriod, selectedDate, selectedMonth, selectedYear])

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalInvoices = filteredInvoices.length
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const completedInvoices = filteredInvoices.filter(inv => inv.status === 'completed')
    const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pending')
    const cancelledInvoices = filteredInvoices.filter(inv => inv.status === 'cancelled')
    
    const completedRevenue = completedInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0)
    
    const averageInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0
    const completionRate = totalInvoices > 0 ? (completedInvoices.length / totalInvoices) * 100 : 0
    
    const uniqueClients = new Set(filteredInvoices.map(inv => inv.client.id)).size
    
    // Payment method breakdown
    const paymentMethods = filteredInvoices.reduce((acc, inv) => {
      acc[inv.paymentMethod] = (acc[inv.paymentMethod] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Daily breakdown for monthly/yearly reports
    const dailyBreakdown = filteredInvoices.reduce((acc, inv) => {
      const date = new Date(inv.createdAt).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { count: 0, revenue: 0, completed: 0 }
      }
      acc[date].count++
      acc[date].revenue += inv.total
      if (inv.status === 'completed') acc[date].completed++
      return acc
    }, {} as Record<string, { count: number; revenue: number; completed: number }>)
    
    // Top clients
    const clientStats = filteredInvoices.reduce((acc, inv) => {
      const clientId = inv.client.id
      if (!acc[clientId]) {
        acc[clientId] = {
          client: inv.client,
          invoices: 0,
          revenue: 0,
          completed: 0
        }
      }
      acc[clientId].invoices++
      acc[clientId].revenue += inv.total
      if (inv.status === 'completed') acc[clientId].completed++
      return acc
    }, {} as Record<string, { client: any; invoices: number; revenue: number; completed: number }>)
    
    const topClients = Object.values(clientStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalInvoices,
      totalRevenue,
      completedInvoices: completedInvoices.length,
      pendingInvoices: pendingInvoices.length,
      cancelledInvoices: cancelledInvoices.length,
      completedRevenue,
      pendingRevenue,
      averageInvoice,
      completionRate,
      uniqueClients,
      paymentMethods,
      dailyBreakdown,
      topClients
    }
  }, [filteredInvoices])

  const exportReport = () => {
    const reportData = {
      period: selectedPeriod,
      date: selectedPeriod === 'daily' ? selectedDate : 
            selectedPeriod === 'monthly' ? selectedMonth : selectedYear,
      stats,
      invoices: filteredInvoices.map(inv => ({
        id: inv.id,
        client: inv.client.name,
        phone: inv.client.phone,
        total: inv.total,
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        createdAt: inv.createdAt,
        items: inv.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      }))
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedPeriod}-report-${
      selectedPeriod === 'daily' ? selectedDate : 
      selectedPeriod === 'monthly' ? selectedMonth : selectedYear
    }.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily':
        return new Date(selectedDate).toLocaleDateString()
      case 'monthly':
        return new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
      case 'yearly':
        return selectedYear
      default:
        return 'All Time'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Advanced Reports</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === 'daily' && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          )}
          
          {selectedPeriod === 'monthly' && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40"
            />
          )}
          
          {selectedPeriod === 'yearly' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-muted-foreground">
          Report for {getPeriodLabel()}
        </h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Completed: {formatCurrency(stats.completedRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedInvoices} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Invoice</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageInvoice)}</div>
                <p className="text-xs text-muted-foreground">
                  Per invoice
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueClients}</div>
                <p className="text-xs text-muted-foreground">
                  Served this period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Completed</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {stats.completedInvoices}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(stats.completedRevenue)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {stats.pendingInvoices}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(stats.pendingRevenue)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cancelled</span>
                  <Badge className="bg-red-100 text-red-800">
                    {stats.cancelledInvoices}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.paymentMethods).map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span>{method}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
                {Object.keys(stats.paymentMethods).length === 0 && (
                  <p className="text-muted-foreground text-center">No payments recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedInvoices} of {stats.totalInvoices} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue per Client</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.uniqueClients > 0 ? stats.totalRevenue / stats.uniqueClients : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average per client
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices per Client</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.uniqueClients > 0 ? stats.totalInvoices / stats.uniqueClients : 0).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average per client
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topClients.length > 0 ? (
                <div className="space-y-4">
                  {stats.topClients.map((clientStat, index) => (
                    <div key={clientStat.client.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{clientStat.client.name}</p>
                          <p className="text-sm text-muted-foreground">{clientStat.client.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(clientStat.revenue)}</p>
                        <p className="text-sm text-muted-foreground">
                          {clientStat.invoices} invoices • {clientStat.completed} completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No client data available for this period.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {selectedPeriod !== 'daily' && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.dailyBreakdown).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Invoices</th>
                          <th className="text-left p-2">Revenue</th>
                          <th className="text-left p-2">Completed</th>
                          <th className="text-left p-2">Completion %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.dailyBreakdown)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([date, data]) => (
                            <tr key={date} className="border-b">
                              <td className="p-2">{new Date(date).toLocaleDateString()}</td>
                              <td className="p-2">{data.count}</td>
                              <td className="p-2 font-semibold">{formatCurrency(data.revenue)}</td>
                              <td className="p-2">{data.completed}</td>
                              <td className="p-2">
                                {data.count > 0 ? ((data.completed / data.count) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No trend data available for this period.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
