'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Invoice } from './types'
import { formatCurrency, createDateFolder } from './utils'

export async function generatePDF(invoice: Invoice): Promise<void> {
  try {
    // Create a temporary div with the invoice content
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '800px'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.style.padding = '40px'
    tempDiv.style.fontFamily = 'Arial, sans-serif'
    
    tempDiv.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 36px; font-weight: bold; color: #1f2937; margin: 0;">INVOICE</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Century Dry Cleaner</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">#${invoice.id}</div>
              <p style="color: #6b7280; margin: 4px 0 0 0;">Date: ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <!-- Client Information -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Bill To:</h3>
            <div style="color: #374151;">
              <p style="font-weight: 500; font-size: 18px; margin: 0 0 4px 0;">${invoice.client.name}</p>
              <p style="margin: 0 0 4px 0;">${invoice.client.phone}</p>
              ${invoice.client.address ? `<p style="margin: 0;">${invoice.client.address}</p>` : ''}
            </div>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Invoice Details:</h3>
            <div style="color: #374151;">
              <p style="margin: 0 0 4px 0;"><span style="font-weight: 500;">Status:</span> 
                <span style="margin-left: 8px; padding: 4px 8px; border-radius: 4px; font-size: 12px; ${
                  invoice.status === 'completed' ? 'background-color: #dcfce7; color: #166534;' :
                  invoice.status === 'pending' ? 'background-color: #fef3c7; color: #92400e;' :
                  'background-color: #fee2e2; color: #991b1b;'
                }">
                  ${invoice.status.toUpperCase()}
                </span>
              </p>
              <p style="margin: 0 0 4px 0;"><span style="font-weight: 500;">Payment Method:</span> ${invoice.paymentMethod}</p>
              ${invoice.pickupDate ? `<p style="margin: 0 0 4px 0;"><span style="font-weight: 500;">Pickup Date:</span> ${invoice.pickupDate}</p>` : ''}
              ${invoice.pickupTime ? `<p style="margin: 0;"><span style="font-weight: 500;">Pickup Time:</span> ${invoice.pickupTime}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: 600;">Description</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 600;">Qty</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: 600;">Unit Price</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, index) => `
                <tr style="${index % 2 === 0 ? 'background-color: white;' : 'background-color: #f9fafb;'}">
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${item.description}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: 500;">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Total Section -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
          <div style="width: 256px;">
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: bold; color: #1f2937;">
                <span>TOTAL:</span>
                <span style="color: #2563eb;">${formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
        <!-- Notes -->
        <div style="margin-bottom: 32px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Notes:</h3>
          <p style="color: #374151; background-color: #f9fafb; padding: 16px; border-radius: 4px; margin: 0;">${invoice.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 2px solid #e5e7eb; padding-top: 24px; text-align: center; color: #6b7280;">
          <p style="margin-bottom: 8px;">Thank you for your business!</p>
          <p style="font-size: 14px; margin: 0;">For any questions about this invoice, please contact us.</p>
        </div>
      </div>
    `
    
    document.body.appendChild(tempDiv)
    
    // Generate canvas from the HTML
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: tempDiv.scrollHeight,
    })
    
    // Remove temporary div
    document.body.removeChild(tempDiv)
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
    
    // Create date folder structure for filename
    const dateFolder = createDateFolder()
    const filename = `invoice-${invoice.id}-${dateFolder}.pdf`
    
    // Download the PDF
    pdf.save(filename)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

export function shareViaWhatsApp(invoice: Invoice): void {
  try {
    const message = `Invoice Details:
📄 Invoice #${invoice.id}
👤 Client: ${invoice.client.name}
💰 Total: ${formatCurrency(invoice.total)}
📅 Date: ${new Date(invoice.createdAt).toLocaleDateString()}
📋 Status: ${invoice.status.toUpperCase()}
💳 Payment: ${invoice.paymentMethod}

Items:
${invoice.items.map(item => 
  `• ${item.description} (${item.quantity}x) - ${formatCurrency(item.totalPrice)}`
).join('\n')}

${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}

Thank you for your business! 🙏`

    const encodedMessage = encodeURIComponent(message)
    const phoneNumber = invoice.client.phone.replace('+', '')
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error)
    throw new Error('Failed to share via WhatsApp')
  }
}
