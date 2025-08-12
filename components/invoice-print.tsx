'use client'

import { forwardRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

interface InvoicePrintProps {
  invoice: Invoice
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ invoice }, ref) => {
    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:shadow-none shadow-lg">
        {/* Header */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
              <p className="text-gray-600 mt-2">Century Dry Cleaner</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">#{invoice.id}</div>
              <p className="text-gray-600">Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To:</h3>
            <div className="text-gray-700">
              <p className="font-medium text-lg">{invoice.client.name}</p>
              <p>{invoice.client.phone}</p>
              {invoice.client.address && <p>{invoice.client.address}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Details:</h3>
            <div className="text-gray-700 space-y-1">
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  invoice.status === 'completed' ? 'bg-green-100 text-green-800' :
                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {invoice.status.toUpperCase()}
                </span>
              </p>
              <p><span className="font-medium">Payment Method:</span> {invoice.paymentMethod}</p>
              {invoice.pickupDate && (
                <p><span className="font-medium">Pickup Date:</span> {invoice.pickupDate}</p>
              )}
              {invoice.pickupTime && (
                <p><span className="font-medium">Pickup Time:</span> {invoice.pickupTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Unit Price</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Section */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-xl font-bold text-gray-800">
                <span>TOTAL:</span>
                <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes:</h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 text-center text-gray-600">
          <p className="mb-2">Thank you for your business!</p>
          <p className="text-sm">For any questions about this invoice, please contact us.</p>
        </div>
      </div>
    )
  }
)

InvoicePrint.displayName = 'InvoicePrint'
