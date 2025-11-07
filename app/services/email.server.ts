import type { ActionFunctionArgs } from "react-router";
import { Resend } from "resend";
import { authenticate } from "../shopify.server";
import { getCustomer } from "./shopify.server";
import { TICKET_STATUS_LABELS } from "../utils/ticket-status";
import { formatCurrency } from "../utils/currency";

/**
 * Email notification service for ticket status updates using Resend
 */

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY || "");

/**
 * Get the "from" email address for Resend
 * Uses environment variable or defaults to a placeholder
 */
function getFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (fromEmail) {
    return fromEmail;
  }
  
  // If no from email is set, use a default format
  // Note: Resend requires a verified domain for production
  return "noreply@repairpilot.app";
}

interface TicketInfo {
  id: string;
  status: string;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  quotedAmount?: number | null;
  depositAmount: number;
  remainingAmount: number;
  customerId: string;
}

/**
 * Sends an email notification to the customer when ticket status changes
 */
export async function sendStatusUpdateEmail(
  request: ActionFunctionArgs["request"],
  ticket: TicketInfo,
  oldStatus: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get customer details
    const customer = await getCustomer(request, ticket.customerId);
    
    if (!customer || !customer.email) {
      console.log(`Skipping email notification - customer not found or no email for ticket ${ticket.id}`);
      return { success: false, error: "Customer not found or no email address" };
    }

    // Get shop name for email branding
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace('.myshopify.com', '') || 'Repair Shop';

    // Build email content
    const statusLabel = TICKET_STATUS_LABELS[newStatus as keyof typeof TICKET_STATUS_LABELS] || newStatus;
    const oldStatusLabel = TICKET_STATUS_LABELS[oldStatus as keyof typeof TICKET_STATUS_LABELS] || oldStatus;
    
    const deviceInfo = [ticket.deviceType, ticket.deviceBrand, ticket.deviceModel]
      .filter(Boolean)
      .join(' ') || 'your device';
    
    const ticketNumber = ticket.id.slice(-8);
    
    // Create email subject
    const subject = `Repair Ticket #${ticketNumber} - Status Updated to ${statusLabel}`;
    
    // Build email HTML content
    const customerName = customer.firstName || customer.displayName || 'Valued Customer';
    const statusMessage = getStatusMessage(newStatus, ticket.remainingAmount);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Repair Status Update</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${customerName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">Your repair ticket status has been updated:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280; width: 40%;">Ticket Number:</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 600;">#${ticketNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Device:</td>
          <td style="padding: 8px 0; color: #111827;">${deviceInfo}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Previous Status:</td>
          <td style="padding: 8px 0; color: #111827;">${oldStatusLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">New Status:</td>
          <td style="padding: 8px 0; color: #667eea; font-weight: 600; font-size: 18px;">${statusLabel}</td>
        </tr>
        ${ticket.quotedAmount ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Quoted Amount:</td>
          <td style="padding: 8px 0; color: #111827;">${formatCurrency(ticket.quotedAmount)}</td>
        </tr>
        ` : ''}
        ${ticket.depositAmount > 0 ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Deposit Paid:</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 600;">${formatCurrency(ticket.depositAmount)}</td>
        </tr>
        ` : ''}
        ${ticket.remainingAmount > 0 ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Remaining Balance:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${formatCurrency(ticket.remainingAmount)}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
      <p style="margin: 0; color: #1e40af; font-size: 16px;">${statusMessage}</p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions, please don't hesitate to contact us.
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Thank you,<br>
      <strong style="color: #111827;">${shopName}</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>This is an automated notification. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `.trim();

    // Plain text version for email clients that don't support HTML
    const textContent = `
Hello ${customerName},

Your repair ticket status has been updated:

Ticket Number: #${ticketNumber}
Device: ${deviceInfo}
Previous Status: ${oldStatusLabel}
New Status: ${statusLabel}

${ticket.quotedAmount ? `Quoted Amount: ${formatCurrency(ticket.quotedAmount)}` : ''}
${ticket.depositAmount > 0 ? `Deposit Paid: ${formatCurrency(ticket.depositAmount)}` : ''}
${ticket.remainingAmount > 0 ? `Remaining Balance: ${formatCurrency(ticket.remainingAmount)}` : ''}

${statusMessage}

If you have any questions, please don't hesitate to contact us.

Thank you,
${shopName}
    `.trim();

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent. Logging email content:");
      console.log(`To: ${customer.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${textContent}`);
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: customer.email,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error("Resend error:", error);
        return { success: false, error: error.message || "Failed to send email" };
      }

      console.log(`Email sent successfully to ${customer.email}. Message ID: ${data?.id}`);
      return { success: true };
    } catch (error) {
      console.error("Error sending email via Resend:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      };
    }
  } catch (error) {
    console.error("Error sending status update email:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

/**
 * Helper function to get status-specific message
 */
function getStatusMessage(status: string, remainingAmount: number): string {
  switch (status.toLowerCase()) {
    case 'intake':
      return 'Your device has been received and is being processed.';
    case 'diagnosing':
      return 'Our technicians are currently diagnosing the issue with your device.';
    case 'awaiting_parts':
      return 'We are waiting for parts to arrive before we can proceed with the repair.';
    case 'in_progress':
      return 'Your device is currently being repaired.';
    case 'qa':
      return 'Your device is undergoing quality assurance testing.';
    case 'ready':
      if (remainingAmount > 0) {
        return `Your repair is complete! An invoice has been sent for the remaining balance of ${formatCurrency(remainingAmount)}. Please complete payment to pick up your device.`;
      }
      return 'Your repair is complete and ready for pickup!';
    case 'closed':
      return 'Your ticket has been closed. Thank you for your business!';
    default:
      return 'Your ticket status has been updated.';
  }
}

