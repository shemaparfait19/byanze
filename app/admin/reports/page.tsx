"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export default function AdminReports() {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let from: string | null = null;
      if (range === "today")
        from = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).toISOString();
      if (range === "7d")
        from = new Date(now.getTime() - 7 * 86400000).toISOString();
      if (range === "30d")
        from = new Date(now.getTime() - 30 * 86400000).toISOString();

      let query = supabase.from("invoices").select("*");
      if (from) query = query.gte("created_at", from);
      const { data } = await query.order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    fetchData();
  }, [range]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const completed = rows.filter((r) => r.status === "completed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    return { total, completed, pending, count: rows.length };
  }, [rows]);

  const downloadCsv = () => {
    const headers = [
      "id",
      "client_id",
      "total",
      "payment_method",
      "status",
      "pickup_date",
      "pickup_time",
      "created_at",
    ];
    const csv = [headers.join(",")];
    for (const r of rows) {
      csv.push(headers.map((h) => JSON.stringify(r[h] ?? "")).join(","));
    }
    const blob = new Blob([csv.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detailed Reports</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={range === "today" ? "default" : "outline"}
            onClick={() => setRange("today")}
          >
            Today
          </Button>
          <Button
            variant={range === "7d" ? "default" : "outline"}
            onClick={() => setRange("7d")}
          >
            7 days
          </Button>
          <Button
            variant={range === "30d" ? "default" : "outline"}
            onClick={() => setRange("30d")}
          >
            30 days
          </Button>
          <Button
            variant={range === "all" ? "default" : "outline"}
            onClick={() => setRange("all")}
          >
            All
          </Button>
          <Button onClick={downloadCsv}>Download CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>{formatCurrency(totals.total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>{totals.count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>{totals.completed}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>{totals.pending}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Raw exportable data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            "Loading..."
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">ID</th>
                    <th className="p-2">Client</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Method</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.id}</td>
                      <td className="p-2">{r.client_id}</td>
                      <td className="p-2">
                        {formatCurrency(Number(r.total || 0))}
                      </td>
                      <td className="p-2">{r.payment_method}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
