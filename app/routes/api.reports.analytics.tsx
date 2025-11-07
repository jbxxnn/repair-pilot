import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { TICKET_STATUSES } from "../utils/ticket-status";

export interface AnalyticsRequest {
  startDate?: string;
  endDate?: string;
  period?: "daily" | "weekly" | "monthly";
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    revenue: {
      total: number;
      byPeriod: Array<{ period: string; revenue: number; count: number }>;
    };
    tickets: {
      total: number;
      byStatus: Array<{ status: string; count: number }>;
      averageRepairTime: number; // in days
    };
    technicians: Array<{
      technicianId: string;
      technicianName: string;
      ticketCount: number;
      averageRepairTime: number;
    }>;
    customers: {
      total: number;
      repeatRate: number; // percentage
    };
  };
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response> => {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const period = (url.searchParams.get("period") || "monthly") as "daily" | "weekly" | "monthly";

    // Parse dates or use defaults (last 30 days)
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Get all tickets for the shop within date range
    const tickets = await prisma.ticket.findMany({
      where: {
        shopDomain: session.shop,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        partsUsed: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate revenue
    const revenueByPeriod = calculateRevenueByPeriod(tickets, startDate, endDate, period);
    const totalRevenue = tickets.reduce((sum, ticket) => {
      const quotedAmount = ticket.quotedAmount ? ticket.quotedAmount.toNumber() : 0;
      const partsTotal = ticket.partsUsed.reduce((partsSum, part) => {
        return partsSum + (part.cost.toNumber() * part.quantity);
      }, 0);
      return sum + quotedAmount + partsTotal;
    }, 0);

    // Tickets by status
    const statusCounts: Record<string, number> = {};
    tickets.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    });

    const ticketsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Average repair time (time from creation to closed status)
    const closedTickets = tickets.filter(t => t.status === TICKET_STATUSES.CLOSED);
    const averageRepairTime = closedTickets.length > 0
      ? closedTickets.reduce((sum, ticket) => {
          const repairTime = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
          return sum + repairTime / (1000 * 60 * 60 * 24); // Convert to days
        }, 0) / closedTickets.length
      : 0;

    // Technician performance
    const technicianStats: Record<string, { ticketIds: string[]; technicianName: string }> = {};
    tickets.forEach(ticket => {
      if (ticket.technicianId) {
        if (!technicianStats[ticket.technicianId]) {
          technicianStats[ticket.technicianId] = {
            ticketIds: [],
            technicianName: `Technician ${ticket.technicianId.slice(-8)}`,
          };
        }
        technicianStats[ticket.technicianId].ticketIds.push(ticket.id);
      }
    });

    // Calculate average repair time per technician
    const technicianPerformance = await Promise.all(
      Object.entries(technicianStats).map(async ([technicianId, stats]) => {
        const techTickets = tickets.filter(t => t.technicianId === technicianId);
        const closedTechTickets = techTickets.filter(t => t.status === TICKET_STATUSES.CLOSED);
        const avgTime = closedTechTickets.length > 0
          ? closedTechTickets.reduce((sum, ticket) => {
              const repairTime = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
              return sum + repairTime / (1000 * 60 * 60 * 24);
            }, 0) / closedTechTickets.length
          : 0;

        // Try to get technician name from Shopify (optional - might fail if scope not available)
        let technicianName = stats.technicianName;
        try {
          // Note: This would require read_users scope, so we'll use fallback name
        } catch (error) {
          // Use fallback name
        }

        return {
          technicianId,
          technicianName,
          ticketCount: techTickets.length,
          averageRepairTime: avgTime,
        };
      })
    );

    // Customer repeat rate
    const customerTicketCounts: Record<string, number> = {};
    tickets.forEach(ticket => {
      customerTicketCounts[ticket.customerId] = (customerTicketCounts[ticket.customerId] || 0) + 1;
    });
    const totalCustomers = Object.keys(customerTicketCounts).length;
    const repeatCustomers = Object.values(customerTicketCounts).filter(count => count > 1).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          byPeriod: revenueByPeriod,
        },
        tickets: {
          total: tickets.length,
          byStatus: ticketsByStatus,
          averageRepairTime: Math.round(averageRepairTime * 10) / 10, // Round to 1 decimal
        },
        technicians: technicianPerformance.sort((a, b) => b.ticketCount - a.ticketCount),
        customers: {
          total: totalCustomers,
          repeatRate: Math.round(repeatRate * 10) / 10,
        },
      },
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analytics"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

function calculateRevenueByPeriod(
  tickets: Array<{
    createdAt: Date;
    quotedAmount: any;
    partsUsed: Array<{ cost: any; quantity: number }>;
  }>,
  startDate: Date,
  endDate: Date,
  period: "daily" | "weekly" | "monthly"
): Array<{ period: string; revenue: number; count: number }> {
  const periodMap = new Map<string, { revenue: number; count: number }>();

  tickets.forEach(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    let periodKey: string;

    if (period === "daily") {
      periodKey = ticketDate.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (period === "weekly") {
      // Get week start (Monday)
      const weekStart = new Date(ticketDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      weekStart.setDate(diff);
      periodKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    } else {
      // Monthly
      periodKey = `${ticketDate.getFullYear()}-${String(ticketDate.getMonth() + 1).padStart(2, "0")}`;
    }

    const quotedAmount = ticket.quotedAmount ? ticket.quotedAmount.toNumber() : 0;
    const partsTotal = ticket.partsUsed.reduce((sum, part) => {
      return sum + (part.cost.toNumber() * part.quantity);
    }, 0);
    const ticketRevenue = quotedAmount + partsTotal;

    const existing = periodMap.get(periodKey) || { revenue: 0, count: 0 };
    periodMap.set(periodKey, {
      revenue: existing.revenue + ticketRevenue,
      count: existing.count + 1,
    });
  });

  // Convert to array and sort
  return Array.from(periodMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}




