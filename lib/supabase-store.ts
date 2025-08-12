"use client";

import { create } from "zustand";
import { supabase } from "./supabase";
import type { Client, Invoice, InvoiceItem, UserAccount } from "./types";
import { toast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

interface SupabaseStore {
  invoices: Invoice[];
  clients: Client[];
  currentUserPhone: string | null;
  currentUserName: string | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  databaseReady: boolean;
  realtimeChannel: RealtimeChannel | null;

  // Database setup
  checkDatabaseSetup: () => Promise<boolean>;
  initializeDatabase: () => Promise<void>;

  // Client operations
  loadClients: () => Promise<void>;
  addClient: (
    client: Omit<Client, "id" | "createdAt" | "updatedAt">
  ) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Invoice operations
  loadInvoices: () => Promise<void>;
  addInvoice: (
    invoice: Omit<Invoice, "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // Pickup notifications
  getPickupNotifications: () => Invoice[];

  // Utility
  loadData: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  setCurrentUser: (phone: string, name?: string) => Promise<void>;
  signOut: () => void;

  subscribeToRealTimeUpdates: () => void;
  unsubscribeFromRealTimeUpdates: () => void;
  updateInvoiceStatus: (
    id: string,
    status: "pending" | "completed" | "cancelled"
  ) => Promise<void>;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  invoices: [],
  clients: [],
  currentUserPhone: null,
  currentUserName: null,
  loading: false,
  error: null,
  isInitialized: false,
  databaseReady: false,
  realtimeChannel: null,

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      invoices: [],
      clients: [],
      loading: false,
      error: null,
      isInitialized: false,
      databaseReady: false,
      currentUserPhone: null,
      currentUserName: null,
    }),

  setCurrentUser: async (phone, name) => {
    const normalized = phone.trim();
    try {
      // Check that user exists in users table (admin-managed accounts)
      const { data: existing, error } = await supabase
        .from("users")
        .select("name, phone")
        .eq("phone", normalized)
        .maybeSingle();

      if (error) {
        console.warn("User lookup failed", error);
      }

      if (!existing) {
        toast({
          title: "Account not found",
          description: "Ask admin to create your account first.",
          variant: "destructive",
        });
        return;
      }

      const resolvedName = existing.name || name || null;
      // store locally
      if (typeof window !== "undefined") {
        localStorage.setItem("ims_user_phone", normalized);
        if (resolvedName) localStorage.setItem("ims_user_name", resolvedName);
      }
      set({ currentUserPhone: normalized, currentUserName: resolvedName });
    } catch (e) {
      console.warn("Failed to ensure user record", e);
      toast({
        title: "Login failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  },

  signOut: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ims_user_phone");
      localStorage.removeItem("ims_user_name");
    }
    set({ currentUserPhone: null, currentUserName: null });
  },

  checkDatabaseSetup: async () => {
    try {
      console.log("Checking database setup...");

      // Test connection to Supabase
      const { data: connectionTest, error: connectionError } = await supabase
        .from("clients")
        .select("count", { count: "exact", head: true });

      if (connectionError) {
        console.error("Database connection error:", connectionError);

        // Check if it's a table not found error
        if (
          connectionError.message.includes("does not exist") ||
          connectionError.message.includes("schema cache") ||
          connectionError.message.includes("relation") ||
          connectionError.message.includes("table")
        ) {
          console.log("Tables do not exist, setup required");
          set({ databaseReady: false });
          return false;
        }

        throw connectionError;
      }

      console.log("Database setup check passed");
      set({ databaseReady: true });
      return true;
    } catch (error: any) {
      console.error("Database setup check failed:", error);
      set({
        databaseReady: false,
        error: `Database setup required: ${error.message}`,
      });
      return false;
    }
  },

  initializeDatabase: async () => {
    try {
      set({ loading: true, error: null });

      const isReady = await get().checkDatabaseSetup();
      if (isReady) {
        // hydrate local user if present
        if (typeof window !== "undefined") {
          const phone = localStorage.getItem("ims_user_phone");
          const name = localStorage.getItem("ims_user_name");
          if (phone) {
            // Try to resolve a friendly name from users table if not present
            let resolvedName = name || null;
            try {
              if (!resolvedName) {
                const { data: u } = await supabase
                  .from("users")
                  .select("name")
                  .eq("phone", phone)
                  .maybeSingle();
                if (u?.name) {
                  resolvedName = u.name as string;
                  localStorage.setItem("ims_user_name", resolvedName);
                }
              }
            } catch {}
            set({ currentUserPhone: phone, currentUserName: resolvedName });
          }
        }
        await get().loadData();
        get().subscribeToRealTimeUpdates(); // Add this line
        set({ isInitialized: true, loading: false });
        console.log("Database initialized successfully with real-time updates");
      } else {
        set({
          error:
            "Database tables not found. Please run the setup script in Supabase SQL Editor.",
          loading: false,
          databaseReady: false,
        });
      }
    } catch (error: any) {
      console.error("Database initialization error:", error);
      set({
        error: `Database initialization failed: ${error.message}`,
        loading: false,
        databaseReady: false,
      });
    }
  },

  loadClients: async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading clients:", error);
        throw new Error(`Failed to load clients: ${error.message}`);
      }

      const clients: Client[] = (data || []).map((client) => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address || "",
        visitCount: client.visit_count || 0,
        rewardClaimed: client.reward_claimed || false,
        lastVisit: client.last_visit || new Date().toISOString(),
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      }));

      set({ clients });
      console.log(`Loaded ${clients.length} clients`);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      throw error;
    }
  },

  addClient: async (clientData) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientData.name,
          phone: clientData.phone,
          address: clientData.address || null,
          visit_count: clientData.visitCount || 0,
          reward_claimed: clientData.rewardClaimed || false,
          last_visit: clientData.lastVisit || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding client:", error);
        throw new Error(`Failed to add client: ${error.message}`);
      }

      const newClient: Client = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address: data.address || "",
        visitCount: data.visit_count || 0,
        rewardClaimed: data.reward_claimed || false,
        lastVisit: data.last_visit || new Date().toISOString(),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set((state) => ({
        clients: [newClient, ...state.clients],
        loading: false,
      }));

      toast({
        title: "Client added successfully!",
        description: `${newClient.name} has been added to your client list.`,
      });

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "create",
          entity_type: "client",
          entity_id: newClient.id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
          changes: { name: newClient.name, phone: newClient.phone },
        });
      } catch {}

      return newClient;
    } catch (error: any) {
      console.error("Error adding client:", error);
      const errorMessage = error.message || "Failed to add client";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error adding client",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  },

  updateClient: async (id, updates) => {
    try {
      set({ loading: true, error: null });

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.address !== undefined)
        updateData.address = updates.address || null;
      if (updates.visitCount !== undefined)
        updateData.visit_count = updates.visitCount;
      if (updates.rewardClaimed !== undefined)
        updateData.reward_claimed = updates.rewardClaimed;
      if (updates.lastVisit !== undefined)
        updateData.last_visit = updates.lastVisit;

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to update client: ${error.message}`);
      }

      set((state) => ({
        clients: state.clients.map((client) =>
          client.id === id
            ? { ...client, ...updates, updatedAt: new Date().toISOString() }
            : client
        ),
        loading: false,
      }));

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "update",
          entity_type: "client",
          entity_id: id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
          changes: updates as any,
        });
      } catch {}

      toast({
        title: "Client updated successfully!",
      });
    } catch (error: any) {
      console.error("Error updating client:", error);
      const errorMessage = error.message || "Failed to update client";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error updating client",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  deleteClient: async (id) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete client: ${error.message}`);
      }

      set((state) => ({
        clients: state.clients.filter((client) => client.id !== id),
        loading: false,
      }));

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "delete",
          entity_type: "client",
          entity_id: id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
        });
      } catch {}

      toast({
        title: "Client deleted successfully!",
      });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      const errorMessage = error.message || "Failed to delete client";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error deleting client",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  loadInvoices: async () => {
    try {
      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (invoicesError) {
        console.error("Error loading invoices:", invoicesError);
        throw new Error(`Failed to load invoices: ${invoicesError.message}`);
      }

      if (!invoicesData || invoicesData.length === 0) {
        set({ invoices: [] });
        return;
      }

      // Load all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*");

      if (clientsError) {
        throw new Error(`Failed to load clients: ${clientsError.message}`);
      }

      // Load all invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*");

      if (itemsError) {
        throw new Error(`Failed to load invoice items: ${itemsError.message}`);
      }

      // Create lookup maps
      const clientsMap = new Map(
        (clientsData || []).map((client) => [client.id, client])
      );
      const itemsMap = new Map<string, any[]>();

      (itemsData || []).forEach((item) => {
        if (!itemsMap.has(item.invoice_id)) {
          itemsMap.set(item.invoice_id, []);
        }
        itemsMap.get(item.invoice_id)!.push(item);
      });

      // Build invoices with related data
      const invoices: Invoice[] = invoicesData
        .map((invoice) => {
          const client = clientsMap.get(invoice.client_id);
          const items = itemsMap.get(invoice.id) || [];

          if (!client) {
            console.warn(`Client not found for invoice ${invoice.id}`);
            return null;
          }

          return {
            id: invoice.id,
            client: {
              id: client.id,
              name: client.name,
              phone: client.phone,
              address: client.address || "",
              visitCount: client.visit_count || 0,
              rewardClaimed: client.reward_claimed || false,
              lastVisit: client.last_visit || new Date().toISOString(),
              createdAt: client.created_at,
              updatedAt: client.updated_at,
            },
            items: items.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unit_price),
              totalPrice: parseFloat(item.total_price),
            })),
            total: parseFloat(invoice.total),
            paymentMethod: invoice.payment_method,
            status: invoice.status,
            pickupDate: invoice.pickup_date || undefined,
            pickupTime: invoice.pickup_time || undefined,
            notes: invoice.notes || undefined,
            createdByName: (invoice as any).created_by_name || undefined,
            createdByPhone: (invoice as any).created_by_phone || undefined,
            createdAt: invoice.created_at,
            updatedAt: invoice.updated_at,
          };
        })
        .filter(Boolean) as Invoice[];

      set({ invoices });
      console.log(`Loaded ${invoices.length} invoices`);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      throw error;
    }
  },

  addInvoice: async (invoiceData) => {
    try {
      console.log("Starting invoice creation process...");
      set({ loading: true, error: null });

      // Validate invoice data
      if (!invoiceData.id) {
        throw new Error("Invoice ID is required");
      }
      if (!invoiceData.client?.id) {
        throw new Error("Client ID is required");
      }
      if (!invoiceData.items || invoiceData.items.length === 0) {
        throw new Error("Invoice items are required");
      }

      console.log("Inserting invoice:", {
        id: invoiceData.id,
        client_id: invoiceData.client.id,
        total: invoiceData.total,
        payment_method: invoiceData.paymentMethod,
        status: invoiceData.status,
        pickup_date: invoiceData.pickupDate || null,
        pickup_time: invoiceData.pickupTime || null,
        notes: invoiceData.notes || null,
        created_by_name: get().currentUserName || null,
        created_by_phone: get().currentUserPhone || null,
      });

      // Insert invoice
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          id: invoiceData.id,
          client_id: invoiceData.client.id,
          total: invoiceData.total,
          payment_method: invoiceData.paymentMethod,
          status: invoiceData.status,
          pickup_date: invoiceData.pickupDate || null,
          pickup_time: invoiceData.pickupTime || null,
          notes: invoiceData.notes || null,
          created_by_name: get().currentUserName || null,
          created_by_phone: get().currentUserPhone || null,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error("Invoice insert error:", invoiceError);
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }

      console.log("Invoice inserted successfully:", invoiceResult);

      // Insert invoice items
      if (invoiceData.items.length > 0) {
        const itemsToInsert = invoiceData.items.map((item) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        }));

        console.log("Inserting invoice items:", itemsToInsert);

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Invoice items insert error:", itemsError);
          // Try to rollback the invoice
          await supabase.from("invoices").delete().eq("id", invoiceData.id);
          throw new Error(
            `Failed to create invoice items: ${itemsError.message}`
          );
        }

        console.log("Invoice items inserted successfully");
      }

      // Update client visit count
      console.log("Updating client visit count...");
      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({
          visit_count: invoiceData.client.visitCount + 1,
          last_visit: new Date().toISOString(),
        })
        .eq("id", invoiceData.client.id);

      if (clientUpdateError) {
        console.warn("Failed to update client visit count:", clientUpdateError);
      }

      // Reload data
      console.log("Reloading data...");
      await get().loadInvoices();
      await get().loadClients();

      set({ loading: false });

      console.log("Invoice creation completed successfully");
      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "create",
          entity_type: "invoice",
          entity_id: invoiceData.id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
          changes: { total: invoiceData.total, status: invoiceData.status },
        });
      } catch {}

      toast({
        title: "Invoice created successfully!",
        description: `Invoice ${invoiceData.id} has been created.`,
      });
    } catch (error: any) {
      console.error("Error adding invoice:", error);
      const errorMessage = error.message || "Failed to add invoice";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error adding invoice",
        description: errorMessage,
        variant: "destructive",
      });
      throw error; // Re-throw to be caught by the form
    }
  },

  updateInvoice: async (id, updates) => {
    try {
      set({ loading: true, error: null });

      // Update invoice
      const updateData: any = {};
      if (updates.client?.id) updateData.client_id = updates.client.id;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.paymentMethod)
        updateData.payment_method = updates.paymentMethod;
      if (updates.status) updateData.status = updates.status;
      if (updates.pickupDate !== undefined)
        updateData.pickup_date = updates.pickupDate || null;
      if (updates.pickupTime !== undefined)
        updateData.pickup_time = updates.pickupTime || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", id);

      if (invoiceError) {
        throw new Error(`Failed to update invoice: ${invoiceError.message}`);
      }

      // If items are updated, delete old items and insert new ones
      if (updates.items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", id);

        if (deleteError) {
          throw new Error(
            `Failed to update invoice items: ${deleteError.message}`
          );
        }

        // Insert new items
        if (updates.items.length > 0) {
          const itemsToInsert = updates.items.map((item) => ({
            invoice_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
          }));

          const { error: itemsError } = await supabase
            .from("invoice_items")
            .insert(itemsToInsert);

          if (itemsError) {
            throw new Error(
              `Failed to update invoice items: ${itemsError.message}`
            );
          }
        }
      }

      // Reload data
      await get().loadInvoices();
      set({ loading: false });

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "update",
          entity_type: "invoice",
          entity_id: id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
          changes: updates as any,
        });
      } catch {}

      toast({
        title: "Invoice updated successfully!",
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      const errorMessage = error.message || "Failed to update invoice";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error updating invoice",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  deleteInvoice: async (id) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase.from("invoices").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete invoice: ${error.message}`);
      }

      set((state) => ({
        invoices: state.invoices.filter((invoice) => invoice.id !== id),
        loading: false,
      }));

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "delete",
          entity_type: "invoice",
          entity_id: id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
        });
      } catch {}

      toast({
        title: "Invoice deleted successfully!",
      });
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      const errorMessage = error.message || "Failed to delete invoice";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error deleting invoice",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  getPickupNotifications: () => {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour
      .toString()
      .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    return get().invoices.filter((invoice) => {
      if (
        !invoice.pickupDate ||
        !invoice.pickupTime ||
        invoice.status === "completed"
      ) {
        return false;
      }

      // Check if pickup date is today
      const isToday = invoice.pickupDate === currentDate;

      // Check if pickup time matches current time (exact match)
      const pickupTime = invoice.pickupTime.substring(0, 5); // Get HH:MM format
      const isTimeMatch = pickupTime === currentTimeString;

      // Show notification only when it's exactly the pickup date and time
      return isToday && isTimeMatch;
    });
  },

  loadData: async () => {
    try {
      await Promise.all([get().loadClients(), get().loadInvoices()]);
    } catch (error: any) {
      console.error("Error loading data:", error);
      throw error;
    }
  },

  subscribeToRealTimeUpdates: () => {
    const channel = supabase
      .channel("invoice-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
        },
        (payload) => {
          console.log("Real-time invoice update:", payload);
          // Reload invoices when changes occur
          get().loadInvoices();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        (payload) => {
          console.log("Real-time client update:", payload);
          // Reload clients when changes occur
          get().loadClients();
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromRealTimeUpdates: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  updateInvoiceStatus: async (id, status) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("invoices")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to update invoice status: ${error.message}`);
      }

      // Update local state immediately for better UX
      set((state) => ({
        invoices: state.invoices.map((invoice) =>
          invoice.id === id
            ? { ...invoice, status, updatedAt: new Date().toISOString() }
            : invoice
        ),
        loading: false,
      }));

      // audit log
      try {
        const { currentUserPhone, currentUserName } = get();
        await supabase.from("audit_logs").insert({
          action: "status_update",
          entity_type: "invoice",
          entity_id: id,
          actor_phone: currentUserPhone,
          actor_name: currentUserName,
          changes: { status },
        });
      } catch {}

      toast({
        title: "Status updated successfully!",
        description: `Invoice ${id} marked as ${status}`,
      });
    } catch (error: any) {
      console.error("Error updating invoice status:", error);
      const errorMessage = error.message || "Failed to update status";
      set({ error: errorMessage, loading: false });
      toast({
        title: "Error updating status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },
}));
