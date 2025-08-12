'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Search } from 'lucide-react'
import { useSupabaseStore } from '@/lib/supabase-store'
import { formatCurrency, generateInvoiceId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Client, Invoice, InvoiceItem } from '@/lib/types'

const phoneSchema = z.string()
  .min(1, 'Phone number is required')
  .regex(/^\+250\d{9}$/, 'Phone must be in format +250XXXXXXXXX')

const invoiceSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: phoneSchema,
  clientAddress: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
  })).min(1, 'At least one item is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceFormProps {
  editingId?: string | null
  onSave: () => void
  onCancel: () => void
}

export function InvoiceForm({ editingId, onSave, onCancel }: InvoiceFormProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showClientSearch, setShowClientSearch] = useState(false)
  const { invoices, clients, addInvoice, updateInvoice, addClient, loading } = useSupabaseStore()

  const editingInvoice = editingId ? invoices.find(inv => inv.id === editingId) : null

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '+250',
      clientAddress: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      paymentMethod: '',
      pickupDate: '',
      pickupTime: '',
      notes: '',
      status: 'pending',
    },
    mode: 'onChange', // Add this for better validation feedback
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  useEffect(() => {
    if (editingInvoice) {
      form.reset({
        clientName: editingInvoice.client.name,
        clientPhone: editingInvoice.client.phone,
        clientAddress: editingInvoice.client.address || '',
        items: editingInvoice.items,
        paymentMethod: editingInvoice.paymentMethod,
        pickupDate: editingInvoice.pickupDate || '',
        pickupTime: editingInvoice.pickupTime || '',
        notes: editingInvoice.notes || '',
        status: editingInvoice.status,
      })
    }
  }, [editingInvoice, form])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  const selectClient = (client: Client) => {
    form.setValue('clientName', client.name)
    form.setValue('clientPhone', client.phone)
    form.setValue('clientAddress', client.address || '')
    setShowClientSearch(false)
    setSearchTerm('')
  }

  const calculateTotal = () => {
    const items = form.watch('items')
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      console.log('Form submission started with data:', data)
      
      // Validate required fields
      if (!data.clientName.trim()) {
        toast({ title: 'Client name is required', variant: 'destructive' })
        return
      }
      
      if (!data.clientPhone.trim()) {
        toast({ title: 'Client phone is required', variant: 'destructive' })
        return
      }
      
      if (!data.paymentMethod) {
        toast({ title: 'Payment method is required', variant: 'destructive' })
        return
      }
      
      if (data.items.length === 0) {
        toast({ title: 'At least one item is required', variant: 'destructive' })
        return
      }
      
      // Validate items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        if (!item.description.trim()) {
          toast({ title: `Item ${i + 1} description is required`, variant: 'destructive' })
          return
        }
        if (item.quantity <= 0) {
          toast({ title: `Item ${i + 1} quantity must be greater than 0`, variant: 'destructive' })
          return
        }
        if (item.unitPrice < 0) {
          toast({ title: `Item ${i + 1} unit price cannot be negative`, variant: 'destructive' })
          return
        }
      }

      // Find or create client
      let client = clients.find(c => c.phone === data.clientPhone)
      if (!client) {
        console.log('Creating new client...')
        const newClient = await addClient({
          name: data.clientName,
          phone: data.clientPhone,
          address: data.clientAddress || '',
          visitCount: 0,
          rewardClaimed: false,
          lastVisit: new Date().toISOString(),
        })
        if (!newClient) {
          toast({ title: 'Failed to create client', variant: 'destructive' })
          return
        }
        client = newClient
      }

      const total = calculateTotal()
      console.log('Calculated total:', total)

      const invoiceData: Omit<Invoice, 'createdAt' | 'updatedAt'> = {
        id: editingId || generateInvoiceId(),
        client,
        items: data.items.map(item => ({
          id: crypto.randomUUID(),
          ...item,
          totalPrice: item.quantity * item.unitPrice,
        })),
        total,
        paymentMethod: data.paymentMethod,
        status: data.status,
        pickupDate: data.pickupDate || undefined,
        pickupTime: data.pickupTime || undefined,
        notes: data.notes || undefined,
      }

      console.log('Invoice data prepared:', invoiceData)

      if (editingId) {
        console.log('Updating existing invoice...')
        await updateInvoice(editingId, invoiceData)
        toast({ title: 'Invoice updated successfully!' })
      } else {
        console.log('Creating new invoice...')
        await addInvoice(invoiceData)
        toast({ title: 'Invoice created successfully!' })
      }

      console.log('Invoice operation completed, calling onSave...')
      onSave()
    } catch (error: any) {
      console.error('Error in form submission:', error)
      toast({ 
        title: 'Error saving invoice', 
        description: error.message || 'Please try again.',
        variant: 'destructive' 
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {editingId ? 'Edit Invoice' : 'Create New Invoice'}
        </h1>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'} Invoice
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Label htmlFor="clientName">Client Name</Label>
              <div className="flex gap-2">
                <Input
                  id="clientName"
                  {...form.register('clientName')}
                  placeholder="Enter client name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClientSearch(!showClientSearch)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {form.formState.errors.clientName && (
                <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
              )}

              {showClientSearch && (
                <Card className="absolute top-full left-0 right-0 z-10 mt-1">
                  <CardContent className="p-4">
                    <Input
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-muted cursor-pointer rounded"
                          onClick={() => selectClient(client)}
                        >
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <Label htmlFor="clientPhone">Phone Number</Label>
              <Input
                id="clientPhone"
                {...form.register('clientPhone')}
                placeholder="+250XXXXXXXXX"
              />
              {form.formState.errors.clientPhone && (
                <p className="text-sm text-red-500">{form.formState.errors.clientPhone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="clientAddress">Address (Optional)</Label>
              <Textarea
                id="clientAddress"
                {...form.register('clientAddress')}
                placeholder="Enter client address"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <Button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded">
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    {...form.register(`items.${index}.description`)}
                    placeholder="Item description"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Unit Price (RWF)</Label>
                  <Input
                    type="number"
                    {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="text-right">
              <p className="text-lg font-semibold">
                Total: {formatCurrency(calculateTotal())}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment & Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={form.watch('paymentMethod')} 
                onValueChange={(value) => form.setValue('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MOMO">Mobile Money</SelectItem>
                  <SelectItem value="BANK">Bank Transfer</SelectItem>
                  <SelectItem value="CARD">Card Payment</SelectItem>
                </SelectContent>
              </Select>

              {form.formState.errors.paymentMethod && (
                <p className="text-sm text-red-500">{form.formState.errors.paymentMethod.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickupDate">Pickup Date (Optional)</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  {...form.register('pickupDate')}
                />
              </div>
              <div>
                <Label htmlFor="pickupTime">Pickup Time (Optional)</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  {...form.register('pickupTime')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={form.watch('status')} 
                onValueChange={(value) => form.setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {form.formState.errors.status && (
                <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Additional notes or instructions"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
