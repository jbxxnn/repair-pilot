/**
 * Ticket status constants and utilities
 */

export const TICKET_STATUSES = {
  INTAKE: "intake",
  DIAGNOSING: "diagnosing",
  AWAITING_PARTS: "awaiting_parts",
  IN_PROGRESS: "in_progress",
  QA: "qa",
  READY: "ready",
  CLOSED: "closed",
  ON_HOLD: "on_hold",
  REFUNDED: "refunded",
} as const;

export type TicketStatus = (typeof TICKET_STATUSES)[keyof typeof TICKET_STATUSES];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TICKET_STATUSES.INTAKE]: "Intake",
  [TICKET_STATUSES.DIAGNOSING]: "Diagnosing",
  [TICKET_STATUSES.AWAITING_PARTS]: "Awaiting Parts",
  [TICKET_STATUSES.IN_PROGRESS]: "In Progress",
  [TICKET_STATUSES.QA]: "QA",
  [TICKET_STATUSES.READY]: "Ready",
  [TICKET_STATUSES.CLOSED]: "Closed",
  [TICKET_STATUSES.ON_HOLD]: "On Hold",
  [TICKET_STATUSES.REFUNDED]: "Refunded",
};

export const ACTIVE_STATUSES: TicketStatus[] = [
  TICKET_STATUSES.INTAKE,
  TICKET_STATUSES.DIAGNOSING,
  TICKET_STATUSES.AWAITING_PARTS,
  TICKET_STATUSES.IN_PROGRESS,
  TICKET_STATUSES.QA,
  TICKET_STATUSES.READY,
  TICKET_STATUSES.ON_HOLD,
];

export const COMPLETED_STATUSES: TicketStatus[] = [
  TICKET_STATUSES.CLOSED,
  TICKET_STATUSES.REFUNDED,
];

/**
 * Validates if a string is a valid ticket status
 */
export function isValidTicketStatus(status: string): status is TicketStatus {
  return Object.values(TICKET_STATUSES).includes(status as TicketStatus);
}

/**
 * Gets the display label for a ticket status
 */
export function getStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABELS[status] || status;
}

/**
 * Checks if a status is active (not completed)
 */
export function isActiveStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Checks if a status is completed
 */
export function isCompletedStatus(status: TicketStatus): boolean {
  return COMPLETED_STATUSES.includes(status);
}


