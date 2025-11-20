import { useState, useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useParams, useNavigate, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { TICKET_STATUSES, TICKET_STATUS_LABELS, type TicketStatus } from "../utils/ticket-status";
import { formatCurrency } from "../utils/currency";
import type { Ticket } from "./api.tickets.list";
import prisma from "../db.server";
import { getStaffMember } from "../services/shopify.server";
import type { CSSProperties, ComponentType } from "react";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (!session) {
    throw new Response("Authentication required", { status: 401 });
  }

  const ticketId = params.ticketId;
  
  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  // Get ticket from database
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      shopDomain: session.shop,
    },
    include: {
      quoteItems: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!ticket) {
    throw new Response("Ticket not found", { status: 404 });
  }

  // Fetch technician info from Shopify if technicianId exists
  let technician = null;
  if (ticket.technicianId) {
    try {
      const staffMember = await getStaffMember(request, ticket.technicianId);
      if (staffMember) {
        technician = {
          id: staffMember.id,
          name: staffMember.name,
          email: staffMember.email,
          phone: staffMember.phone,
        };
      }
    } catch (error) {
      console.error(`Error fetching staff member ${ticket.technicianId}:`, error);
    }
  }

  // Transform ticket
  const transformedTicket: Ticket = {
    id: ticket.id,
    shopDomain: ticket.shopDomain,
    status: ticket.status,
    customerId: ticket.customerId,
    deviceType: ticket.deviceType,
    deviceBrand: ticket.deviceBrand,
    deviceModel: ticket.deviceModel,
    serial: ticket.serial,
    repairType: ticket.repairType,
    issueDescription: ticket.issueDescription,
    photos: Array.isArray(ticket.photos) ? ticket.photos : [],
    quotedAmount: ticket.quotedAmount ? ticket.quotedAmount.toNumber() : null,
    depositAmount: ticket.depositAmount.toNumber(),
    remainingAmount: ticket.remainingAmount.toNumber(),
    intakeOrderId: ticket.intakeOrderId,
    finalOrderId: ticket.finalOrderId,
    depositPaymentOrderId: ticket.depositPaymentOrderId,
    depositPaymentOrderName: ticket.depositPaymentOrderName,
    depositPaymentMethod: ticket.depositPaymentMethod,
    depositCollectedAt: ticket.depositCollectedAt,
    depositCollectedAmount: ticket.depositCollectedAmount ? ticket.depositCollectedAmount.toNumber() : null,
    technicianId: ticket.technicianId,
    technician,
    quoteItems: ticket.quoteItems?.map(item => ({
      id: item.id,
      type: item.type,
      description: item.description,
      amount: item.amount.toNumber(),
      displayOrder: item.displayOrder,
    })) || [],
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  return { ticket: transformedTicket };
};

export default function TicketDetail() {
  const app = useAppBridge();
  const { ticket: initialTicket } = useLoaderData<typeof loader>();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  
  // Debug: Log to verify this component is rendering
  useEffect(() => {
    console.log("TicketDetail component rendered for ticket:", ticketId);
  }, [ticketId]);
  
  const [currentTicket, setCurrentTicket] = useState<Ticket>(initialTicket);
  const displayTicketId = currentTicket.id.slice(-8);
  const [updating, setUpdating] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; firstName?: string; lastName?: string; displayName: string; email?: string; phone?: string } | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [parts, setParts] = useState<Array<{ id: string; name: string | null; sku: string | null; quantity: number; cost: number }>>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [showAddPart, setShowAddPart] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [partForm, setPartForm] = useState({ name: "", sku: "", quantity: 1, cost: 0 });
  const [savingPart, setSavingPart] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{ show: boolean; message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { status: string | null; isPaid: boolean; financialStatus: string | null; orderName: string | null }>>({});
  const [loadingOrderStatuses, setLoadingOrderStatuses] = useState(false);
  const [QRCodeComponent, setQRCodeComponent] = useState<ComponentType<{ value: string; size: number; level: string; includeMargin: boolean; className: string }> | null>(null);
  
  // Generate QR code URL with shop domain for proper authentication
  const qrCodeUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/app/tickets/${currentTicket.id}?shop=${encodeURIComponent(currentTicket.shopDomain)}`
    : `/app/tickets/${currentTicket.id}`;
  
  // Load QR code component client-side only to avoid SSR issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("qrcode.react").then((module) => {
        setQRCodeComponent(() => module.QRCodeSVG);
      }).catch((err) => {
        console.error("Failed to load QR code component:", err);
      });
    }
  }, []);
  
  // Print QR code handler
  const handlePrintQR = () => {
    const qrSvg = document.querySelector('.qr-code-svg') as HTMLElement;
    const svgContent = qrSvg ? qrSvg.outerHTML : '';
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket #${displayTicketId} - QR Code</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                background: white;
              }
              .qr-container {
                text-align: center;
                padding: 2rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                background: white;
                max-width: 400px;
              }
              .qr-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: #111827;
              }
              .qr-subtitle {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 1.5rem;
              }
              .qr-code {
                margin: 1rem 0;
                display: inline-block;
              }
              .qr-code svg {
                max-width: 100%;
                height: auto;
              }
              .qr-url {
                font-size: 11px;
                color: #6b7280;
                margin-top: 1rem;
                word-break: break-all;
                font-family: monospace;
                padding: 0.5rem;
                background: #f9fafb;
                border-radius: 4px;
              }
              @media print {
                body { padding: 1rem; }
                .qr-container { 
                  border: 1px solid #000;
                  box-shadow: none;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="qr-title">Ticket #${displayTicketId}</div>
              <div class="qr-subtitle">Scan to view ticket details</div>
              <div class="qr-code">
                ${svgContent}
              </div>
              <div class="qr-url">${qrCodeUrl}</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                }, 250);
              };
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Refresh ticket data
  const refreshTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/get?ticketId=${currentTicket.id}`);
      const data = await response.json();
      if (data.success && data.ticket) {
        setCurrentTicket(data.ticket);
      }
    } catch (error) {
      console.error("Error refreshing ticket:", error);
    }
  };

  // Fetch customer details
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!currentTicket.customerId) {
        setLoadingCustomer(false);
        return;
      }

      setLoadingCustomer(true);
      setCustomerError(null);
      try {
        const response = await fetch("/api/customers/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: currentTicket.customerId })
        });
        const data = await response.json();
        if (data.success && data.customer) {
          setCustomer(data.customer);
        } else {
          setCustomerError(data.error || "Failed to load customer details");
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
        setCustomerError("Failed to load customer details");
      } finally {
        setLoadingCustomer(false);
      }
    };

    fetchCustomer();
  }, [currentTicket.customerId]);

  // Fetch technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const response = await fetch("/api/technicians?activeOnly=true");
        const data = await response.json();
        if (data.success) {
          setTechnicians(data.technicians || []);
        }
      } catch (error) {
        console.error("Error fetching technicians:", error);
      } finally {
        setLoadingTechnicians(false);
      }
    };
    fetchTechnicians();
  }, []);

  // Fetch parts
  useEffect(() => {
    const fetchParts = async () => {
      setLoadingParts(true);
      try {
        const response = await fetch(`/api/tickets/parts?ticketId=${currentTicket.id}`);
        const data = await response.json();
        if (data.success && data.parts) {
          setParts(data.parts);
        }
      } catch (error) {
        console.error("Error fetching parts:", error);
      } finally {
        setLoadingParts(false);
      }
    };

    fetchParts();
  }, [currentTicket.id]);

  // Fetch order statuses
  useEffect(() => {
    const fetchOrderStatuses = async () => {
      const orderIds: string[] = [];
      if (currentTicket.intakeOrderId) orderIds.push(currentTicket.intakeOrderId);
      if (currentTicket.finalOrderId) orderIds.push(currentTicket.finalOrderId);

      if (orderIds.length === 0) {
        return;
      }

      setLoadingOrderStatuses(true);
      try {
        const response = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds })
        });
        const data = await response.json();
        if (data.success && data.orders) {
          const statusMap: Record<string, { status: string | null; isPaid: boolean; financialStatus: string | null; orderName: string | null }> = {};
          data.orders.forEach((order: any) => {
            statusMap[order.orderId] = {
              status: order.status,
              isPaid: order.isPaid,
              financialStatus: order.financialStatus,
              orderName: order.orderName,
            };
          });
          setOrderStatuses(statusMap);
        }
      } catch (error) {
        console.error("Error fetching order statuses:", error);
      } finally {
        setLoadingOrderStatuses(false);
      }
    };

    fetchOrderStatuses();
  }, [currentTicket.intakeOrderId, currentTicket.finalOrderId]);

  const loadParts = async () => {
    try {
      const response = await fetch(`/api/tickets/parts?ticketId=${currentTicket.id}`);
      const data = await response.json();
      if (data.success && data.parts) {
        setParts(data.parts);
      }
    } catch (error) {
      console.error("Error fetching parts:", error);
    }
  };

  // Helper function to render payment status badge
  const renderPaymentStatusBadge = (orderId: string) => {
    const status = orderStatuses[orderId];
    if (!status) {
      if (loadingOrderStatuses) {
        return (
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            padding: "0.375rem 0.75rem", 
            background: "#f3f4f6", 
            borderRadius: "6px", 
            fontSize: "12px",
            fontWeight: "500",
            color: "#6b7280"
          }}>
            <span>Loading...</span>
          </div>
        );
      }
      // If status is null, it means the draft order might not exist or wasn't found
      return (
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.375rem 0.75rem", 
          background: "#f3f4f6", 
          borderRadius: "6px", 
          fontSize: "12px",
          fontWeight: "500",
          color: "#6b7280"
        }}>
          <span>Status Unavailable</span>
        </div>
      );
    }

    // If order is paid
    if (status.isPaid) {
      return (
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.375rem 0.75rem", 
          background: "#dcfce7", 
          borderRadius: "6px", 
          border: "1px solid #22c55e",
          fontSize: "12px",
          fontWeight: "600",
          color: "#15803d"
        }}>
          <span>✓</span>
          <span>Paid</span>
        </div>
      );
    }

    // If draft order has been completed and converted to order
    if (status.orderName) {
      return (
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.375rem 0.75rem", 
          background: "#fef3c7", 
          borderRadius: "6px", 
          border: "1px solid #f59e0b",
          fontSize: "12px",
          fontWeight: "600",
          color: "#92400e"
        }}>
          <span>Order #{status.orderName}</span>
          {status.financialStatus && (
            <span style={{ fontSize: "11px", opacity: 0.8 }}>({status.financialStatus})</span>
          )}
        </div>
      );
    }

    // Draft order status - handle null/undefined status
    if (!status.status || status.status === null) {
      return (
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.375rem 0.75rem", 
          background: "#f3f4f6", 
          borderRadius: "6px", 
          fontSize: "12px",
          fontWeight: "500",
          color: "#6b7280"
        }}>
          <span>Draft Order</span>
        </div>
      );
    }

    // Draft order status mapping
    const statusLabels: Record<string, string> = {
      "OPEN": "Draft",
      "INVOICE_SENT": "Invoice Sent",
      "COMPLETED": "Completed",
    };

    // Normalize status to uppercase for comparison
    const normalizedStatus = (status.status || "").toUpperCase();
    const statusLabel = statusLabels[normalizedStatus] || status.status || "Draft";

    return (
      <div style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: "0.5rem", 
        padding: "0.375rem 0.75rem", 
        background: "#eff6ff", 
        borderRadius: "6px", 
        border: "1px solid #3b82f6",
        fontSize: "12px",
        fontWeight: "600",
        color: "#1e40af"
      }}>
        <span>{statusLabel}</span>
      </div>
    );
  };

  const handleDeletePhoto = async (photoUrlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setConfirmationDialog({
      show: true,
      message: "Are you sure you want to delete this photo?",
      onConfirm: async () => {
        setConfirmationDialog(null);
        try {
          const response = await fetch("/api/tickets/remove-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId: currentTicket.id,
              photoUrl: photoUrlToDelete,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setCurrentTicket((prev: Ticket) => {
              const currentPhotos = Array.isArray(prev.photos) ? prev.photos : [];
              return {
                ...prev,
                photos: currentPhotos.filter((url: string) => url !== photoUrlToDelete)
              };
            });
            await refreshTicket();
            app.toast?.show("Photo deleted successfully");
          } else {
            throw new Error(data.error || "Failed to delete photo");
          }
        } catch (error) {
          console.error("Error deleting photo:", error);
          app.toast?.show(error instanceof Error ? error.message : "Failed to delete photo", { isError: true });
        }
      },
      onCancel: () => {
        setConfirmationDialog(null);
      }
    });
  };

  const handleAddPart = async (e?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPartError(null);
    
    if (partForm.quantity < 1 || partForm.cost < 0) {
      setPartError("Quantity must be at least 1 and cost must be 0 or greater");
      return;
    }
    
    setSavingPart(true);
    try {
      const response = await fetch("/api/tickets/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: currentTicket.id,
          name: partForm.name || undefined,
          sku: partForm.sku || undefined,
          quantity: partForm.quantity,
          cost: partForm.cost,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPartForm({ name: "", sku: "", quantity: 1, cost: 0 });
        setShowAddPart(false);
        setPartError(null);
        await loadParts();
        await refreshTicket();
      } else {
        setPartError(data.error || "Failed to add part");
      }
    } catch (error) {
      console.error("Error adding part:", error);
      setPartError("Failed to add part. Please try again.");
    } finally {
      setSavingPart(false);
    }
  };

  const handleUpdatePart = async (partId: string, e?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPartError(null);
    
    if (partForm.quantity < 1 || partForm.cost < 0) {
      setPartError("Quantity must be at least 1 and cost must be 0 or greater");
      return;
    }
    
    setSavingPart(true);
    try {
      const response = await fetch("/api/tickets/parts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          name: partForm.name || undefined,
          sku: partForm.sku || undefined,
          quantity: partForm.quantity,
          cost: partForm.cost,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingPart(null);
        setPartForm({ name: "", sku: "", quantity: 1, cost: 0 });
        setPartError(null);
        await loadParts();
        await refreshTicket();
      } else {
        setPartError(data.error || "Failed to update part");
      }
    } catch (error) {
      console.error("Error updating part:", error);
      setPartError("Failed to update part. Please try again.");
    } finally {
      setSavingPart(false);
    }
  };

  const handleDeletePart = async (partId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setConfirmationDialog({
      show: true,
      message: "Are you sure you want to delete this part?",
      onConfirm: async () => {
        setConfirmationDialog(null);
        setPartError(null);
        try {
          const response = await fetch("/api/tickets/parts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partId,
              ticketId: currentTicket.id,
            }),
          });
          const data = await response.json();
          if (data.success) {
            await loadParts();
            await refreshTicket();
            app.toast?.show("Part deleted successfully");
          } else {
            setPartError(data.error || "Failed to delete part");
            app.toast?.show(data.error || "Failed to delete part", { isError: true });
          }
        } catch (error) {
          console.error("Error deleting part:", error);
          setPartError("Failed to delete part. Please try again.");
          app.toast?.show("Failed to delete part. Please try again.", { isError: true });
        }
      },
      onCancel: () => {
        setConfirmationDialog(null);
      }
    });
  };

  const startEditingPart = (part: { id: string; name: string | null; sku: string | null; quantity: number; cost: number }) => {
    setEditingPart(part.id);
    setPartForm({
      name: part.name || "",
      sku: part.sku || "",
      quantity: part.quantity,
      cost: part.cost,
    });
    setShowAddPart(false);
  };

  const cancelEdit = () => {
    setEditingPart(null);
    setPartForm({ name: "", sku: "", quantity: 1, cost: 0 });
    setPartError(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === currentTicket.status) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/tickets/update-status", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ ticketId: currentTicket.id, status: newStatus }) 
      });
      const data = await response.json();
      if (data.success) {
        setCurrentTicket({ ...currentTicket, status: newStatus });
        await refreshTicket();
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
          ticketId: currentTicket.id, 
          status: currentTicket.status,
          technicianId: technicianId || null
        })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentTicket({ ...currentTicket, technicianId: technicianId || null });
        await refreshTicket();
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

  const partFormGridStyle: CSSProperties = {
    display: "grid",
    gap: "1rem",
    alignItems: "end",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    width: "100%",
  };

  const baseInputStyle: CSSProperties = {
    width: "100%",
    padding: "0.625rem 0.75rem",
    borderRadius: "8px",
    border: "2px solid #38bdf8",
    fontSize: "14px",
    transition: "all 0.2s",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <s-page heading={`Ticket #${displayTicketId}`}>
      <div style={{ marginBottom: "1.5rem" }}>
        <s-button onClick={() => navigate("/app/tickets")} variant="secondary">
          ← Back to Tickets
        </s-button>
      </div>

      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#111827" }}>Ticket #{displayTicketId}</h2>
            <div style={{ marginTop: "0.5rem", fontSize: "16px", color: "#6b7280" }}>{TICKET_STATUS_LABELS[currentTicket.status as TicketStatus] || currentTicket.status}</div>
          </div>
        </div>

        <div style={{ padding: "1.5rem" }}>
          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>Customer Information</h3>
            {loadingCustomer ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                <s-spinner size="base" />
                <div style={{ marginTop: "0.5rem", fontSize: "14px" }}>Loading customer details...</div>
              </div>
            ) : customerError ? (
              <div style={{ padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                <div style={{ fontSize: "14px", color: "#dc2626" }}>{customerError}</div>
              </div>
            ) : customer ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                {(customer.firstName || customer.lastName) && (
                  <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Name</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem", fontWeight: "500" }}>{[customer.firstName, customer.lastName].filter(Boolean).join(" ")}</div></div>
                )}
                {customer.email && <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Email</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}><a href={`mailto:${customer.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{customer.email}</a></div></div>}
                {customer.phone && <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Phone</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}><a href={`tel:${customer.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>{customer.phone}</a></div></div>}
                {!customer.firstName && !customer.lastName && !customer.email && !customer.phone && customer.displayName && (
                  <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Display Name</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}>{customer.displayName}</div></div>
                )}
              </div>
            ) : (
              <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280" }}>No customer information available</div>
            )}
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>Device Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Device Type</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}>{currentTicket.deviceType || "N/A"}</div></div>
              <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Brand</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}>{currentTicket.deviceBrand || "N/A"}</div></div>
              <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Model</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}>{currentTicket.deviceModel || "N/A"}</div></div>
              {currentTicket.serial && <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Serial Number</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem", fontFamily: "monospace" }}>{currentTicket.serial}</div></div>}
              {currentTicket.repairType && <div><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Repair Type</label><div style={{ fontSize: "14px", color: "#111827", marginTop: "0.25rem" }}>{currentTicket.repairType}</div></div>}
            </div>
          </section>

          {currentTicket.issueDescription && (
            <section style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "0.75rem", color: "#111827" }}>Issue Description</h3>
              <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{currentTicket.issueDescription}</div>
            </section>
          )}

          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                Device Photos {currentTicket.photos && Array.isArray(currentTicket.photos) && currentTicket.photos.length > 0 ? `(${currentTicket.photos.length})` : ''}
              </h3>
            </div>
            
            {/* Photo Upload Section */}
            <div style={{ marginBottom: "1rem", padding: "1rem", border: "2px dashed #d1d5db", borderRadius: "8px", backgroundColor: "#f9fafb" }}>
              <label htmlFor="photo-upload" style={{ display: "block", cursor: uploadingPhotos ? "not-allowed" : "pointer" }}>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingPhotos}
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setUploadingPhotos(true);
                    try {
                      const formData = new FormData();
                      Array.from(files).forEach((file) => {
                        formData.append("files", file);
                      });

                      const uploadResponse = await fetch("/api/photos/upload", {
                        method: "POST",
                        credentials: "include",
                        body: formData,
                      });

                      const uploadResult = await uploadResponse.json();

                      if (!uploadResult.success || !uploadResult.files) {
                        throw new Error(uploadResult.error || "Upload failed");
                      }

                      const photoUrls = uploadResult.files.map((f: { url: string }) => f.url);

                      const addResponse = await fetch("/api/tickets/add-photos", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ticketId: currentTicket.id,
                          photos: photoUrls,
                        }),
                      });

                      const addResult = await addResponse.json();

                      if (addResult.success) {
                        setCurrentTicket((prev: Ticket) => {
                          const currentPhotos = Array.isArray(prev.photos) ? prev.photos : [];
                          return {
                            ...prev,
                            photos: [...currentPhotos, ...photoUrls]
                          };
                        });
                        await refreshTicket();
                        app.toast?.show("Photos uploaded successfully");
                      } else {
                        throw new Error(addResult.error || "Failed to add photos to ticket");
                      }
                    } catch (error) {
                      console.error("Error uploading photos:", error);
                      app.toast?.show(error instanceof Error ? error.message : "Failed to upload photos", { isError: true });
                    } finally {
                      setUploadingPhotos(false);
                      e.target.value = "";
                    }
                  }}
                />
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  {uploadingPhotos ? (
                    <div style={{ color: "#6b7280" }}>Uploading photos...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "0.5rem" }}>
                        Click to select photos or drag and drop
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        PNG, JPG, GIF up to 10MB each
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Display existing photos */}
            {currentTicket.photos && Array.isArray(currentTicket.photos) && currentTicket.photos.length > 0 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                  {currentTicket.photos.map((photoUrl: string, index: number) => (
                    <div key={photoUrl || index} style={{ position: "relative", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer" }}>
                      <img 
                        src={photoUrl} 
                        alt={`Device photo ${index + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onClick={() => window.open(photoUrl, "_blank")}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='12' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <button
                        onClick={(e) => handleDeletePhoto(photoUrl, e)}
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          right: "0.5rem",
                          background: "rgba(0, 0, 0, 0.7)",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "white",
                          fontSize: "16px",
                          fontWeight: "bold",
                          transition: "all 0.2s",
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(220, 38, 38, 0.9)";
                          e.currentTarget.style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                        title="Delete photo"
                      >
                        ×
                      </button>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)", padding: "0.5rem", color: "white", fontSize: "12px", fontWeight: "500" }}>
                        Photo {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "12px", color: "#6b7280" }}>Click any photo to open in full size</div>
              </>
            )}
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>Financial Information</h3>
            
            {/* Itemized Quote Breakdown */}
            {currentTicket.quoteItems && currentTicket.quoteItems.length > 0 && (
              <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>Itemized Pre-Quote</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {currentTicket.quoteItems.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #e5e7eb" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827" }}>
                          {item.type === 'diagnostic' ? 'Diagnostic/Bench Fee' :
                           item.type === 'parts' ? 'Estimated Parts' :
                           item.type === 'labor' ? 'Estimated Labor' :
                           item.description || 'Additional Item'}
                        </div>
                        {item.type === 'additional' && item.description && (
                          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "0.25rem" }}>{item.description}</div>
                        )}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#059669" }}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", marginTop: "0.5rem", borderTop: "2px solid #d1d5db" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Estimated Total</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#059669" }}>
                      {formatCurrency(currentTicket.quotedAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Quoted Amount</label><div style={{ fontSize: "18px", fontWeight: "600", color: "#059669", marginTop: "0.5rem" }}>{currentTicket.quotedAmount ? formatCurrency(currentTicket.quotedAmount) : "N/A"}</div></div>
              <div style={{ padding: "1rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #6ee7b7" }}><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Deposit</label><div style={{ fontSize: "18px", fontWeight: "600", color: "#059669", marginTop: "0.5rem" }}>{formatCurrency(currentTicket.depositAmount)}</div></div>
              {currentTicket.remainingAmount > 0 && <div style={{ padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5" }}><label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Remaining</label><div style={{ fontSize: "18px", fontWeight: "600", color: "#dc2626", marginTop: "0.5rem" }}>{formatCurrency(currentTicket.remainingAmount)}</div></div>}
            {currentTicket.depositCollectedAt ? (
              <div style={{ gridColumn: "1 / -1", padding: "1rem", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <label style={{ fontSize: "12px", color: "#1d4ed8", fontWeight: "600" }}>Deposit Collected</label>
                <div style={{ marginTop: "0.5rem", color: "#1e3a8a", fontWeight: 600, fontSize: "16px" }}>
                  {formatCurrency(currentTicket.depositCollectedAmount ?? currentTicket.depositAmount)}
                </div>
                <div style={{ marginTop: "0.25rem", fontSize: "13px", color: "#1e40af" }}>
                  Collected via {currentTicket.depositPaymentMethod || "POS"}
                  {currentTicket.depositPaymentOrderName ? ` · Order ${currentTicket.depositPaymentOrderName}` : ""}
                </div>
                <div style={{ marginTop: "0.25rem", fontSize: "12px", color: "#1d4ed8" }}>
                  {"on " + new Date(currentTicket.depositCollectedAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div style={{ gridColumn: "1 / -1", padding: "1rem", background: "#fefce8", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                <label style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>Deposit Outstanding</label>
                <div style={{ marginTop: "0.5rem", fontSize: "13px", color: "#78350f" }}>
                  Waiting for POS payment. If you collected payment outside POS, you can manually mark it as received.
                </div>
              </div>
            )}
          </div>
        </section>

          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>Parts Used</h3>
              {!showAddPart && !editingPart && (
                <s-button onClick={() => { setShowAddPart(true); setEditingPart(null); setPartForm({ name: "", sku: "", quantity: 1, cost: 0 }); }}>Add Part</s-button>
              )}
            </div>
            {loadingParts ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                <s-spinner size="base" />
                <div style={{ marginTop: "0.5rem", fontSize: "14px" }}>Loading parts...</div>
              </div>
            ) : (
              <>
                {showAddPart && (
                  <div style={{ padding: "1.25rem", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: "12px", marginBottom: "1rem", border: "2px solid #0ea5e9", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleAddPart(e); }}>
                      <div style={partFormGridStyle}>
                        <div>
                          <label style={{ fontSize: "12px", color: "#0c4a6e", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Part Name</label>
                          <input 
                            type="text" 
                            aria-label="Part name" 
                            value={partForm.name} 
                            onChange={(e) => { setPartForm({ ...partForm, name: e.target.value }); setPartError(null); }}
                            onKeyDown={(e) => handleKeyDown(e, () => handleAddPart(e))}
                            placeholder="e.g., iPhone 12 LCD Screen" 
                            style={baseInputStyle}
                            onFocus={(e) => e.target.style.borderColor = "#0ea5e9"}
                            onBlur={(e) => e.target.style.borderColor = "#38bdf8"}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#0c4a6e", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>SKU</label>
                          <input 
                            type="text" 
                            aria-label="Part SKU" 
                            value={partForm.sku} 
                            onChange={(e) => { setPartForm({ ...partForm, sku: e.target.value }); setPartError(null); }}
                            onKeyDown={(e) => handleKeyDown(e, () => handleAddPart(e))}
                            placeholder="Optional" 
                            style={baseInputStyle}
                            onFocus={(e) => e.target.style.borderColor = "#0ea5e9"}
                            onBlur={(e) => e.target.style.borderColor = "#38bdf8"}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#0c4a6e", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Quantity</label>
                          <input 
                            type="number" 
                            aria-label="Part quantity" 
                            min="1" 
                            value={partForm.quantity} 
                            onChange={(e) => { setPartForm({ ...partForm, quantity: parseInt(e.target.value) || 1 }); setPartError(null); }}
                            onKeyDown={(e) => handleKeyDown(e, () => handleAddPart(e))}
                            style={baseInputStyle}
                            onFocus={(e) => e.target.style.borderColor = "#0ea5e9"}
                            onBlur={(e) => e.target.style.borderColor = "#38bdf8"}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#0c4a6e", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Cost</label>
                          <input 
                            type="number" 
                            aria-label="Part cost" 
                            min="0" 
                            step="0.01" 
                            value={partForm.cost} 
                            onChange={(e) => { setPartForm({ ...partForm, cost: parseFloat(e.target.value) || 0 }); setPartError(null); }}
                            onKeyDown={(e) => handleKeyDown(e, () => handleAddPart(e))}
                            style={baseInputStyle}
                            onFocus={(e) => e.target.style.borderColor = "#0ea5e9"}
                            onBlur={(e) => e.target.style.borderColor = "#38bdf8"}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                          <s-button onClick={(e) => handleAddPart(e)} disabled={savingPart} variant="primary">
                            {savingPart ? "Saving..." : "Save"}
                          </s-button>
                          <s-button 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setShowAddPart(false); 
                              setPartForm({ name: "", sku: "", quantity: 1, cost: 0 }); 
                              setPartError(null); 
                            }} 
                            variant="secondary"
                          >
                            Cancel
                          </s-button>
                        </div>
                      </div>
                      {partError && (
                        <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                          <div style={{ fontSize: "13px", color: "#dc2626", fontWeight: "500" }}>{partError}</div>
                        </div>
                      )}
                    </form>
                  </div>
                )}
                {parts.length === 0 && !showAddPart ? (
                  <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", fontSize: "14px", color: "#6b7280", textAlign: "center" }}>No parts added yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {parts.map((part) => (
                      <div key={part.id}>
                        {editingPart === part.id ? (
                          <div style={{ padding: "1.25rem", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", borderRadius: "12px", border: "2px solid #f59e0b", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePart(part.id, e); }}>
                              <div style={partFormGridStyle}>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#78350f", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Part Name</label>
                                  <input 
                                    type="text" 
                                    aria-label="Part name" 
                                    value={partForm.name} 
                                    onChange={(e) => { setPartForm({ ...partForm, name: e.target.value }); setPartError(null); }}
                                    onKeyDown={(e) => handleKeyDown(e, () => handleUpdatePart(part.id, e))}
                                    placeholder="e.g., iPhone 12 LCD Screen" 
                                    style={{ ...baseInputStyle, border: "2px solid #fbbf24" }}
                                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                                    onBlur={(e) => e.target.style.borderColor = "#fbbf24"}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#78350f", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>SKU</label>
                                  <input 
                                    type="text" 
                                    aria-label="Part SKU" 
                                    value={partForm.sku} 
                                    onChange={(e) => { setPartForm({ ...partForm, sku: e.target.value }); setPartError(null); }}
                                    onKeyDown={(e) => handleKeyDown(e, () => handleUpdatePart(part.id, e))}
                                    placeholder="Optional" 
                                    style={{ ...baseInputStyle, border: "2px solid #fbbf24" }}
                                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                                    onBlur={(e) => e.target.style.borderColor = "#fbbf24"}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#78350f", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Quantity</label>
                                  <input 
                                    type="number" 
                                    aria-label="Part quantity" 
                                    min="1" 
                                    value={partForm.quantity} 
                                    onChange={(e) => { setPartForm({ ...partForm, quantity: parseInt(e.target.value) || 1 }); setPartError(null); }}
                                    onKeyDown={(e) => handleKeyDown(e, () => handleUpdatePart(part.id, e))}
                                    style={baseInputStyle}
                                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                                    onBlur={(e) => e.target.style.borderColor = "#fbbf24"}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#78350f", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Cost</label>
                                  <input 
                                    type="number" 
                                    aria-label="Part cost" 
                                    min="0" 
                                    step="0.01" 
                                    value={partForm.cost} 
                                    onChange={(e) => { setPartForm({ ...partForm, cost: parseFloat(e.target.value) || 0 }); setPartError(null); }}
                                    onKeyDown={(e) => handleKeyDown(e, () => handleUpdatePart(part.id, e))}
                                    style={baseInputStyle}
                                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                                    onBlur={(e) => e.target.style.borderColor = "#fbbf24"}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                                  <s-button onClick={(e) => handleUpdatePart(part.id, e)} disabled={savingPart} variant="primary">
                                    {savingPart ? "Saving..." : "Save"}
                                  </s-button>
                                  <s-button onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelEdit(); }} variant="secondary">Cancel</s-button>
                                </div>
                              </div>
                              {partError && (
                                <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                                  <div style={{ fontSize: "13px", color: "#dc2626", fontWeight: "500" }}>{partError}</div>
                                </div>
                              )}
                            </form>
                          </div>
                        ) : (
                          <div 
                            style={{ 
                              padding: "1rem 1.25rem", 
                              background: "#ffffff", 
                              borderRadius: "10px", 
                              border: "1px solid #e5e7eb", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              transition: "all 0.2s",
                              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f9fafb";
                              e.currentTarget.style.borderColor = "#d1d5db";
                              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#e5e7eb";
                              e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div style={{ 
                                  width: "40px", 
                                  height: "40px", 
                                  borderRadius: "8px", 
                                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  flexShrink: 0
                                }}>
                                  ⚙️
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                                    {part.name || part.sku || "Unnamed Part"}
                                  </div>
                                  {part.sku && part.name && (
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>
                                      <span style={{ fontWeight: "500" }}>SKU:</span> {part.sku}
                                    </div>
                                  )}
                                  <div style={{ fontSize: "13px", color: "#059669", fontWeight: "500", marginTop: "0.25rem" }}>
                                    {part.quantity} × {formatCurrency(part.cost)} = <span style={{ fontWeight: "600" }}>{formatCurrency(part.quantity * part.cost)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <s-button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditingPart(part); }} 
                                variant="secondary"
                              >
                                Edit
                              </s-button>
                              <s-button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePart(part.id, e); }} 
                                variant="auto"
                              >
                                Delete
                              </s-button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {parts.length > 0 && (
                      <div style={{ 
                        padding: "1rem 1.25rem", 
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", 
                        borderRadius: "12px", 
                        border: "2px solid #3b82f6", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                        marginTop: "0.5rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ 
                            width: "36px", 
                            height: "36px", 
                            borderRadius: "8px", 
                            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "600",
                            fontSize: "16px"
                          }}>
                            💰
                          </div>
                          <span style={{ fontSize: "15px", fontWeight: "600", color: "#1e40af" }}>Total Parts Cost:</span>
                        </div>
                        <span style={{ fontSize: "18px", fontWeight: "700", color: "#1e40af" }}>{formatCurrency(parts.reduce((sum, p) => sum + p.cost * p.quantity, 0))}</span>
                      </div>
                    )}
                    {partError && !showAddPart && !editingPart && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                        <div style={{ fontSize: "13px", color: "#dc2626", fontWeight: "500" }}>{partError}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {(currentTicket.intakeOrderId || currentTicket.finalOrderId) && (
            <section style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>Order Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {currentTicket.intakeOrderId && (() => {
                  // Extract order ID from GID (format: gid://shopify/DraftOrder/123)
                  const orderId = currentTicket.intakeOrderId.includes('/') 
                    ? currentTicket.intakeOrderId.split('/').pop() 
                    : currentTicket.intakeOrderId;
                  // Extract shop domain (format: shopname.myshopify.com)
                  const shopName = currentTicket.shopDomain?.replace('.myshopify.com', '') || '';
                  const status = orderStatuses[currentTicket.intakeOrderId];
                  // If order is completed, link to order page; otherwise link to draft order page
                  const adminUrl = shopName 
                    ? (status?.orderName 
                        ? `https://${shopName}.myshopify.com/admin/orders/${status.orderName.replace('#', '')}`
                        : `https://${shopName}.myshopify.com/admin/draft_orders/${orderId}`)
                    : null;
                  
                  return (
                    <div style={{ 
                      padding: "1.25rem", 
                      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", 
                      borderRadius: "12px", 
                      border: "2px solid #0ea5e9",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <label style={{ fontSize: "12px", color: "#0369a1", fontWeight: "600", display: "block" }}>
                          Deposit Order (Intake)
                        </label>
                        {renderPaymentStatusBadge(currentTicket.intakeOrderId)}
                      </div>
                      <div style={{ fontSize: "13px", color: "#0c4a6e", marginBottom: "0.75rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {orderId}
                      </div>
                      {adminUrl && (
                        <a 
                          href={adminUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            background: "#0ea5e9",
                            color: "white",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0284c7";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#0ea5e9";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <span>View in Shopify</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  );
                })()}
                {currentTicket.finalOrderId && (() => {
                  // Extract order ID from GID (format: gid://shopify/DraftOrder/123)
                  const orderId = currentTicket.finalOrderId.includes('/') 
                    ? currentTicket.finalOrderId.split('/').pop() 
                    : currentTicket.finalOrderId;
                  // Extract shop domain (format: shopname.myshopify.com)
                  const shopName = currentTicket.shopDomain?.replace('.myshopify.com', '') || '';
                  const status = orderStatuses[currentTicket.finalOrderId];
                  // If order is completed, link to order page; otherwise link to draft order page
                  const adminUrl = shopName 
                    ? (status?.orderName 
                        ? `https://${shopName}.myshopify.com/admin/orders/${status.orderName.replace('#', '')}`
                        : `https://${shopName}.myshopify.com/admin/draft_orders/${orderId}`)
                    : null;
                  
                  return (
                    <div style={{ 
                      padding: "1.25rem", 
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", 
                      borderRadius: "12px", 
                      border: "2px solid #22c55e",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <label style={{ fontSize: "12px", color: "#15803d", fontWeight: "600", display: "block" }}>
                          Final Payment Order
                        </label>
                        {renderPaymentStatusBadge(currentTicket.finalOrderId)}
                      </div>
                      <div style={{ fontSize: "13px", color: "#14532d", marginBottom: "0.75rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {orderId}
                      </div>
                      {adminUrl && (
                        <a 
                          href={adminUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            background: "#22c55e",
                            color: "white",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.2s",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#16a34a";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#22c55e";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <span>View in Shopify</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>QR Code</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <s-button 
                  onClick={handlePrintQR}
                  variant="secondary"
                  size="small"
                >
                  Print QR Code
                </s-button>
              </div>
            </div>
            <div style={{ 
              padding: "1.5rem", 
              background: "white", 
              borderRadius: "12px", 
              border: "2px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem"
            }}>
              <div style={{ 
                padding: "1rem", 
                background: "#f9fafb", 
                borderRadius: "8px",
                minHeight: "200px",
                minWidth: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {QRCodeComponent ? (
                  <QRCodeComponent
                    value={qrCodeUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    className="qr-code-svg"
                  />
                ) : (
                  <div style={{ color: "#6b7280", fontSize: "14px" }}>Loading QR code...</div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "0.5rem" }}>
                  Scan this QR code to quickly access this ticket
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {qrCodeUrl}
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>Status & Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", minWidth: "80px" }}>Status:</label>
                <select aria-label="Change ticket status" value={currentTicket.status || TICKET_STATUSES.INTAKE} onChange={(e) => handleStatusChange(e.target.value as TicketStatus)} disabled={updating} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "200px", backgroundColor: updating ? "#f9fafb" : "white", cursor: updating ? "not-allowed" : "pointer" }}>
                  {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
                    <option key={status} value={status}>{label}</option>
                  ))}
                </select>
                {currentTicket.status === TICKET_STATUSES.READY && currentTicket.remainingAmount > 0 && <s-button onClick={() => handleStatusChange(TICKET_STATUSES.CLOSED)} disabled={updating}>Collect Balance</s-button>}
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", minWidth: "80px" }}>Technician:</label>
                {loadingTechnicians ? (
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>Loading...</span>
                ) : (
                  <select aria-label="Assign technician" value={currentTicket.technicianId || ""} onChange={(e) => handleTechnicianChange(e.target.value)} disabled={updating} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", minWidth: "200px", backgroundColor: updating ? "#f9fafb" : "white", cursor: updating ? "not-allowed" : "pointer" }}>
                    <option value="">Unassigned</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </section>

          <section>
            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", fontSize: "12px", color: "#6b7280" }}>
              <div style={{ marginBottom: "0.5rem" }}><strong>Created:</strong> {new Date(currentTicket.createdAt).toLocaleString()}</div>
              <div><strong>Last Updated:</strong> {new Date(currentTicket.updatedAt).toLocaleString()}</div>
              {currentTicket.technician && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>Assigned Technician:</strong> {currentTicket.technician.name}
                  {currentTicket.technician.email && <span style={{ marginLeft: "0.5rem", color: "#9ca3af" }}>({currentTicket.technician.email})</span>}
                </div>
              )}
              {currentTicket.customerId && <div style={{ marginTop: "0.5rem" }}><strong>Customer ID:</strong> <span style={{ fontFamily: "monospace" }}>{currentTicket.customerId}</span></div>}
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmationDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => confirmationDialog.onCancel()}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "18px", fontWeight: "600", color: "#111827" }}>
              Confirm Action
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "14px", color: "#374151", lineHeight: "1.5" }}>
              {confirmationDialog.message}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <s-button onClick={confirmationDialog.onCancel} variant="secondary">
                Cancel
              </s-button>
              <s-button onClick={confirmationDialog.onConfirm} variant="primary">
                Confirm
              </s-button>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

