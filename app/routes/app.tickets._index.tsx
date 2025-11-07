import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { TICKET_STATUSES, TICKET_STATUS_LABELS, type TicketStatus } from "../utils/ticket-status";
import { formatCurrency } from "../utils/currency";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function TicketsBoard() {
  const app = useAppBridge();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);

  const loadTickets = useCallback(async () => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[CLIENT:${requestId}] ===== loadTickets called =====`);
    console.log(`[CLIENT:${requestId}] Status filter:`, statusFilter);
    console.log(`[CLIENT:${requestId}] Technician filter:`, technicianFilter);
    
    setLoading(true);
    setError(null);
    try {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (technicianFilter !== "all") params.append("technicianId", technicianFilter);
      const url = `${baseUrl}/api/tickets/list${params.toString() ? `?${params.toString()}` : ''}`;
      console.log(`[CLIENT:${requestId}] Fetching from URL:`, url);
      
      const fetchStartTime = Date.now();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });
      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`[CLIENT:${requestId}] Fetch completed (${fetchDuration}ms), status:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CLIENT:${requestId}] Response not OK:`, errorText);
        throw new Error(`Failed to load tickets: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[CLIENT:${requestId}] Response data:`, {
        success: data.success,
        ticketCount: data.tickets?.length || 0,
        error: data.error,
        debug: data.debug,
      });
      
      if (data.success) {
        console.log(`[CLIENT:${requestId}] ✅ Setting ${data.tickets?.length || 0} tickets`);
        setTickets(data.tickets || []);
      } else {
        console.error(`[CLIENT:${requestId}] ❌ API returned error:`, data.error);
        throw new Error(data.error || "Failed to load tickets");
      }
    } catch (err) {
      console.error(`[CLIENT:${requestId}] ❌ Error loading tickets:`, err);
      if (err instanceof Error) {
        console.error(`[CLIENT:${requestId}] Error name:`, err.name);
        console.error(`[CLIENT:${requestId}] Error message:`, err.message);
        console.error(`[CLIENT:${requestId}] Error stack:`, err.stack);
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      console.log(`[CLIENT:${requestId}] ===== loadTickets completed =====`);
    }
  }, [statusFilter, technicianFilter]);

  // Load technicians for filter
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch("/api/technicians?activeOnly=true");
        const data = await response.json();
        if (data.success) {
          setTechnicians(data.technicians || []);
        }
      } catch (error) {
        console.error("Error fetching technicians:", error);
      }
    };
    fetchTechnicians();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const ticketsByStatus = (status: TicketStatus) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  const statusColumns = [
    TICKET_STATUSES.INTAKE,
    TICKET_STATUSES.DIAGNOSING,
    TICKET_STATUSES.AWAITING_PARTS,
    TICKET_STATUSES.IN_PROGRESS,
    TICKET_STATUSES.QA,
    TICKET_STATUSES.READY,
    TICKET_STATUSES.CLOSED,
  ];

  if (loading) {
    return (
      <s-page heading="Ticket Board">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <s-spinner size="large" />
        </div>
      </s-page>
    );
  }

  if (error) {
    return (
      <s-page heading="Ticket Board">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-text>Error loading tickets</s-text>
          <s-text>{error}</s-text>
          <s-button onClick={loadTickets}>Retry</s-button>
        </s-box>
      </s-page>
    );
  }

  return (
    <s-page heading="Ticket Board">
      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <label htmlFor="status-filter" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
            <span>Status:</span>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "160px", backgroundColor: "white", cursor: "pointer" }}>
              <option value="all">All Statuses</option>
              {Object.entries(TICKET_STATUS_LABELS).map(([status, name]) => (
                <option key={status} value={status}>{name}</option>
              ))}
            </select>
          </label>
          <label htmlFor="technician-filter" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
            <span>Technician:</span>
            <select id="technician-filter" value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "160px", backgroundColor: "white", cursor: "pointer" }}>
              <option value="all">All Technicians</option>
              <option value="unassigned">Unassigned</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </select>
          </label>
          <s-button onClick={loadTickets}>Refresh</s-button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "0.75rem 1rem", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "8px", color: "white" }}>
            <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "0.25rem" }}>{tickets.length}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Total Tickets</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", borderRadius: "8px", color: "white" }}>
            <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "0.25rem" }}>{tickets.filter(t => t.status !== TICKET_STATUSES.CLOSED).length}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Active Tickets</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", borderRadius: "8px", color: "white" }}>
            <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "0.25rem" }}>{formatCurrency(tickets.reduce((sum, t) => sum + parseFloat(t.depositAmount || 0), 0))}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Total Deposits</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: statusFilter === "all" ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr", gap: "1rem", alignItems: "start" }}>
        {statusFilter === "all" ? (
          statusColumns.map(status => {
            const columnTickets = ticketsByStatus(status);
            return <TicketColumn key={status} status={status} tickets={columnTickets} onUpdate={loadTickets} onTicketClick={(ticket) => navigate(`/app/tickets/${ticket.id}`)} />;
          })
        ) : (
          <TicketColumn status={statusFilter as TicketStatus} tickets={tickets} onUpdate={loadTickets} onTicketClick={(ticket) => navigate(`/app/tickets/${ticket.id}`)} />
        )}
      </div>
    </s-page>
  );
}

function TicketColumn({ status, tickets, onUpdate, onTicketClick }: { status: TicketStatus; tickets: any[]; onUpdate: () => void; onTicketClick: (ticket: any) => void }) {
  const displayName = TICKET_STATUS_LABELS[status];
  const statusColors: Record<string, { bg: string; text: string }> = {
    [TICKET_STATUSES.INTAKE]: { bg: "#dbeafe", text: "#1e40af" },
    [TICKET_STATUSES.DIAGNOSING]: { bg: "#fef3c7", text: "#92400e" },
    [TICKET_STATUSES.AWAITING_PARTS]: { bg: "#fed7aa", text: "#9a3412" },
    [TICKET_STATUSES.IN_PROGRESS]: { bg: "#ddd6fe", text: "#5b21b6" },
    [TICKET_STATUSES.QA]: { bg: "#fce7f3", text: "#9f1239" },
    [TICKET_STATUSES.READY]: { bg: "#d1fae5", text: "#065f46" },
    [TICKET_STATUSES.CLOSED]: { bg: "#e5e7eb", text: "#374151" },
  };
  const color = statusColors[status] || { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: "500px", background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
      <div style={{ padding: "1rem", background: color.bg, borderBottom: "2px solid " + color.text, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: color.text }}>{displayName}</h3>
          <span style={{ background: color.text, color: "white", borderRadius: "12px", padding: "0.25rem 0.5rem", fontSize: "12px", fontWeight: "600", minWidth: "24px", textAlign: "center" }}>{tickets.length}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#9ca3af", fontSize: "14px" }}>No tickets</div>
        ) : (
          tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} onUpdate={onUpdate} onClick={() => onTicketClick(ticket)} />)
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onUpdate, onClick }: { ticket: any; onUpdate: () => void; onClick: () => void }) {
  const app = useAppBridge();
  const ticketId = ticket.id.slice(-8);
  const [updating, setUpdating] = useState(false);
  const handleStatusChange = async (e: React.MouseEvent, newStatus: TicketStatus) => {
    e.stopPropagation();
    if (newStatus === ticket.status) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/tickets/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: ticket.id, status: newStatus }) });
      const data = await response.json();
      if (data.success) {
        onUpdate();
        app.toast?.show("Ticket status updated successfully");
      } else {
        app.toast?.show(data.error || "Failed to update ticket status", { isError: true });
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      app.toast?.show("Failed to update ticket status", { isError: true });
    } finally {
      setUpdating(false);
    }
  };

  const handleTechnicianChange = async (technicianId: string) => {
    setUpdating(true);
    try {
      const response = await fetch("/api/tickets/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ticketId: ticket.id, 
          status: ticket.status,
          technicianId: technicianId || null
        })
      });
      const data = await response.json();
      if (data.success) {
        onUpdate();
        app.toast?.show("Technician updated successfully");
      } else {
        app.toast?.show(data.error || "Failed to update technician", { isError: true });
      }
    } catch (error) {
      console.error("Error updating technician:", error);
      app.toast?.show("Failed to update technician", { isError: true });
    } finally {
      setUpdating(false);
    }
  };
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.875rem", transition: "all 0.2s", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onClick={onClick} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#9ca3af"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#e5e7eb"; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>#{ticketId}</span>
          <span style={{ background: "#f3f4f6", color: "#374151", padding: "0.125rem 0.5rem", borderRadius: "4px", fontSize: "11px", fontWeight: "500" }}>{ticket.deviceType || "Unknown"}</span>
        </div>
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827", lineHeight: "1.4" }}>{ticket.deviceBrand} {ticket.deviceModel}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#f9fafb", borderRadius: "6px", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Dep:</span>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#059669" }}>{formatCurrency(ticket.depositAmount)}</span>
          </div>
          {ticket.remainingAmount > 0 && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>Rem:</span>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#dc2626" }}>{formatCurrency(ticket.remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>
      {ticket.technician && (
        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span>👤</span>
          <span>{ticket.technician.name}</span>
        </div>
      )}
      <select aria-label="Change ticket status" value={ticket.status || TICKET_STATUSES.INTAKE} onChange={(e) => handleStatusChange(e as any, e.target.value as TicketStatus)} onClick={(e) => e.stopPropagation()} disabled={updating} style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "12px", backgroundColor: updating ? "#f9fafb" : "white", cursor: updating ? "not-allowed" : "pointer" }}>
        {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
          <option key={status} value={status}>{label}</option>
        ))}
      </select>
      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "0.5rem", textAlign: "center" }}>Click for details</div>
    </div>
  );
}
