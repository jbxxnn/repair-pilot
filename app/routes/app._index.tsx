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
  // Return null - component will fetch data client-side
  // This ensures data is always fresh and avoids SSR/hydration issues
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

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        period,
      });
      
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

  // Fetch on mount and when filters change
  useEffect(() => {
    // Fetch immediately - this will run on mount and when filters change
    // React Router handles SSR, so this will only run on client
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCSV = () => {
    if (!data) return;

    const csvRows: string[] = [];
    
    // Revenue data
    csvRows.push("Revenue Report");
    csvRows.push(`Period,Revenue,Ticket Count`);
    data.revenue.byPeriod.forEach(item => {
      csvRows.push(`${item.period},${item.revenue.toFixed(2)},${item.count}`);
    });
    csvRows.push(`Total,${data.revenue.total.toFixed(2)},${data.tickets.total}`);
    csvRows.push("");

    // Status distribution
    csvRows.push("Status Distribution");
    csvRows.push(`Status,Count`);
    data.tickets.byStatus.forEach(item => {
      csvRows.push(`${item.status},${item.count}`);
    });
    csvRows.push("");

    // Technician performance
    csvRows.push("Technician Performance");
    csvRows.push(`Technician,Total Tickets,Average Repair Time (days)`);
    data.technicians.forEach(tech => {
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
        <div style={{ 
          padding: "1rem", 
          background: "#fef2f2", 
          borderRadius: "8px", 
          border: "1px solid #fca5a5",
          color: "#dc2626"
        }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare chart data
  const revenueData = data.revenue.byPeriod.map(item => ({
    period: item.period,
    revenue: parseFloat(item.revenue.toFixed(2)),
    tickets: item.count,
  }));

  const statusData = data.tickets.byStatus.map(item => ({
    name: TICKET_STATUS_LABELS[item.status as keyof typeof TICKET_STATUS_LABELS] || item.status,
    value: item.count,
    status: item.status,
  }));

  const technicianData = data.technicians.slice(0, 10).map(tech => ({
    name: tech.technicianName.length > 20 ? tech.technicianName.substring(0, 20) + "..." : tech.technicianName,
    tickets: tech.ticketCount,
    avgTime: parseFloat(tech.averageRepairTime.toFixed(1)),
  }));

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
          Reports & Analytics
        </h1>

        {/* Filters */}
        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          flexWrap: "wrap", 
          alignItems: "center",
          padding: "1.5rem",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          marginBottom: "2rem"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#6b7280" }}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#6b7280" }}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#6b7280" }}>Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                minWidth: "120px",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={exportToCSV}
            style={{
              padding: "0.5rem 1rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              alignSelf: "flex-end",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#3b82f6";
            }}
          >
            Export CSV
          </button>
        </div>

        {/* Key Metrics */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div style={{ 
            padding: "1.5rem", 
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            borderRadius: "12px",
            border: "2px solid #0ea5e9",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ fontSize: "12px", color: "#0369a1", fontWeight: "600", marginBottom: "0.5rem" }}>
              Total Revenue
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#0c4a6e" }}>
              {formatCurrency(data.revenue.total)}
            </div>
          </div>
          <div style={{ 
            padding: "1.5rem", 
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            borderRadius: "12px",
            border: "2px solid #22c55e",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "600", marginBottom: "0.5rem" }}>
              Total Tickets
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#14532d" }}>
              {data.tickets.total}
            </div>
          </div>
          <div style={{ 
            padding: "1.5rem", 
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            borderRadius: "12px",
            border: "2px solid #f59e0b",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "0.5rem" }}>
              Avg Repair Time
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#78350f" }}>
              {data.tickets.averageRepairTime} days
            </div>
          </div>
          <div style={{ 
            padding: "1.5rem", 
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            borderRadius: "12px",
            border: "2px solid #a855f7",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ fontSize: "12px", color: "#7c3aed", fontWeight: "600", marginBottom: "0.5rem" }}>
              Repeat Rate
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#6b21a8" }}>
              {data.customers.repeatRate}%
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "1.5rem" }}>
          {/* Revenue Chart */}
          <div style={{ 
            padding: "1.5rem", 
            background: "white", 
            borderRadius: "12px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Revenue Over Time
            </h2>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                No revenue data for the selected period
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div style={{ 
            padding: "1.5rem", 
            background: "white", 
            borderRadius: "12px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Status Distribution
            </h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                No status data available
              </div>
            )}
          </div>

          {/* Technician Performance */}
          {technicianData.length > 0 && (
            <div style={{ 
              padding: "1.5rem", 
              background: "white", 
              borderRadius: "12px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              gridColumn: "1 / -1"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
                Technician Performance
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={technicianData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tickets" fill="#3b82f6" name="Total Tickets" />
                  <Bar yAxisId="right" dataKey="avgTime" fill="#22c55e" name="Avg Time (days)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
