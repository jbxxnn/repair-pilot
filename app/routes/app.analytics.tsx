import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { formatCurrency } from "../utils/currency";
import { TICKET_STATUS_LABELS } from "../utils/ticket-status";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

interface AnalyticsData {
  revenue: {
    total: number;
    byPeriod: Array<{ period: string; revenue: number; count: number }>;
  };
  tickets: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    averageRepairTime: number;
  };
  technicians: Array<{
    technicianId: string;
    technicianName: string;
    ticketCount: number;
    averageRepairTime: number;
  }>;
  customers: {
    total: number;
    repeatRate: number;
  };
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ startDate, endDate, period });
      const response = await fetch(`/api/reports/analytics?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCSV = () => {
    if (!data) return;

    const csvRows: string[] = [];

    csvRows.push("Revenue Report");
    csvRows.push(`Period,Revenue,Ticket Count`);
    data.revenue.byPeriod.forEach((item) => {
      csvRows.push(`${item.period},${item.revenue.toFixed(2)},${item.count}`);
    });
    csvRows.push(`Total,${data.revenue.total.toFixed(2)},${data.tickets.total}`);
    csvRows.push("");

    csvRows.push("Status Distribution");
    csvRows.push(`Status,Count`);
    data.tickets.byStatus.forEach((item) => {
      csvRows.push(`${item.status},${item.count}`);
    });
    csvRows.push("");

    csvRows.push("Technician Performance");
    csvRows.push(`Technician,Total Tickets,Average Repair Time (days)`);
    data.technicians.forEach((tech) => {
      csvRows.push(`${tech.technicianName},${tech.ticketCount},${tech.averageRepairTime.toFixed(1)}`);
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repair-pilot-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "18px", color: "#6b7280" }}>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            padding: "1rem",
            background: "#fef2f2",
            borderRadius: "8px",
            border: "1px solid #fca5a5",
            color: "#dc2626",
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const revenueData = data.revenue.byPeriod.map((item) => ({
    period: item.period,
    revenue: parseFloat(item.revenue.toFixed(2)),
    tickets: item.count,
  }));

  const statusData = data.tickets.byStatus.map((item) => ({
    name: TICKET_STATUS_LABELS[item.status as keyof typeof TICKET_STATUS_LABELS] || item.status,
    value: item.count,
    status: item.status,
  }));

  const technicianData = data.technicians.slice(0, 10).map((tech) => ({
    name: tech.technicianName.length > 20 ? `${tech.technicianName.substring(0, 20)}...` : tech.technicianName,
    tickets: tech.ticketCount,
    avgTime: parseFloat(tech.averageRepairTime.toFixed(1)),
  }));

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "1rem", color: "#111827" }}>
          Reports & Analytics
        </h1>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            background: "white",
            padding: "1rem",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#6b7280" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, marginBottom: "0.25rem", color: "#111827" }}>
              Start Date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                color: "#111827",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#6b7280" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, marginBottom: "0.25rem", color: "#111827" }}>
              End Date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                color: "#111827",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#6b7280" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, marginBottom: "0.25rem", color: "#111827" }}>
              Interval
            </span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                color: "#111827",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <button
            onClick={fetchAnalytics}
            style={{
              padding: "0.5rem 1rem",
              background: "#2563eb",
              color: "white",
              borderRadius: "0.5rem",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            style={{
              padding: "0.5rem 1rem",
              background: "#10b981",
              color: "white",
              borderRadius: "0.5rem",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value: number, name) => (name === "revenue" ? formatCurrency(value) : value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="tickets" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Tickets by Status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill="#8884d8" label>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Technician Performance</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={technicianData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="tickets" fill="#2563eb" radius={4} />
              <Bar dataKey="avgTime" fill="#f97316" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Customer Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: "#eff6ff", borderRadius: "10px" }}>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#1d4ed8" }}>{data.customers.total}</div>
              <div style={{ fontSize: "13px", color: "#1e40af", marginTop: "0.5rem" }}>Total Customers</div>
            </div>
            <div style={{ padding: "1rem", background: "#ecfdf5", borderRadius: "10px" }}>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#047857" }}>{(data.customers.repeatRate * 100).toFixed(1)}%</div>
              <div style={{ fontSize: "13px", color: "#065f46", marginTop: "0.5rem" }}>Repeat Rate</div>
            </div>
            <div style={{ padding: "1rem", background: "#fff7ed", borderRadius: "10px" }}>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#c2410c" }}>{formatCurrency(data.revenue.total)}</div>
              <div style={{ fontSize: "13px", color: "#9a3412", marginTop: "0.5rem" }}>Revenue (period)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
