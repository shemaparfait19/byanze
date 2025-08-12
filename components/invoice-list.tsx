"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Share,
  Eye,
} from "lucide-react";
import { useSupabaseStore } from "@/lib/supabase-store";
import { formatCurrency } from "@/lib/utils";
import { generatePDF, shareViaWhatsApp } from "@/lib/pdf-utils";
import { InvoicePrint } from "@/components/invoice-print";
import { toast } from "@/hooks/use-toast";
import type { Invoice } from "@/lib/types";
import { InvoiceStatusManager } from "@/components/invoice-status-manager";

interface InvoiceListProps {
  onEdit: (invoiceId: string) => void;
}

export function InvoiceList({ onEdit }: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const { invoices, deleteInvoice, loading } = useSupabaseStore();

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client.phone.includes(searchTerm) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      setDeleteInvoiceId(null);
      toast({ title: "Invoice deleted successfully!" });
    } catch (error) {
      toast({
        title: "Error deleting invoice",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      await generatePDF(invoice);
      toast({ title: "PDF downloaded successfully!" });
    } catch (error) {
      toast({
        title: "Error generating PDF",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = async (invoice: Invoice) => {
    try {
      await shareViaWhatsApp(invoice);
      toast({ title: "Opening WhatsApp..." });
    } catch (error) {
      toast({
        title: "Error sharing invoice",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Invoices</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Invoice ID</th>
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Created By</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Payment</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <>
                    <tr key={invoice.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-sm">{invoice.id}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{invoice.client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client.phone}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {invoice.createdByName || "-"}
                      </td>
                      <td className="p-4 font-semibold">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="p-4">{invoice.paymentMethod}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEdit(invoice.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadPDF(invoice)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleShareWhatsApp(invoice)}
                            >
                              <Share className="h-4 w-4 mr-2" />
                              Share WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteInvoiceId(invoice.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    <tr
                      key={`${invoice.id}-status`}
                      className="border-b bg-gray-50/50"
                    >
                      <td colSpan={7} className="p-2">
                        <InvoiceStatusManager
                          invoice={invoice}
                          compact={true}
                          showDetails={false}
                        />
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteInvoiceId}
        onOpenChange={() => setDeleteInvoiceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoiceId && handleDelete(deleteInvoiceId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice View Dialog */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Invoice Preview</h2>
              <Button variant="ghost" onClick={() => setViewInvoice(null)}>
                ×
              </Button>
            </div>
            <div className="p-4">
              <InvoicePrint invoice={viewInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
