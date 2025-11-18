import type { ActionFunctionArgs } from "react-router";
import { Prisma } from "@prisma/client";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const WEBHOOK_TAG = "[ORDERS_PAID]";

const getAttributeValue = (payload: any, key: string): string | null => {
  const noteAttributes = Array.isArray(payload?.note_attributes) ? payload.note_attributes : [];
  const attributes = Array.isArray(payload?.attributes) ? payload.attributes : [];
  const combined = [...noteAttributes, ...attributes];

  for (const attribute of combined) {
    if (!attribute) continue;
    const name = attribute?.name ?? attribute?.key;
    if (typeof name === "string" && name.toLowerCase() === key.toLowerCase()) {
      const value = attribute?.value ?? attribute?.val;
      return typeof value === "string" ? value : value?.toString?.() ?? null;
    }
  }

  return null;
};

const findDepositLine = (payload: any) => {
  const lineItems = Array.isArray(payload?.line_items) ? payload.line_items : [];

  for (const item of lineItems) {
    if (!item) continue;
    const properties = Array.isArray(item.properties) ? item.properties : [];

    const hasDepositProperty = properties.some((prop: any) => {
      if (!prop) return false;
      const name = prop?.name ?? prop?.key;
      const value = prop?.value ?? prop?.val;
      return (
        typeof name === "string" &&
        name.toLowerCase() === "repairpilot_payment_type" &&
        typeof value === "string" &&
        value.toLowerCase() === "deposit"
      );
    });

    if (hasDepositProperty) {
      return item;
    }
  }

  return null;
};

const parseAmount = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const amount = (value as any)?.amount;
    return parseAmount(amount);
  }
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const context = await authenticate.webhook(request);
  const { topic, shop, payload } = context;

  console.log(`${WEBHOOK_TAG} Received webhook`, { topic, shop });

  if (topic !== "ORDERS_PAID") {
    console.warn(`${WEBHOOK_TAG} Ignoring unexpected topic: ${topic}`);
    return new Response();
  }

  try {
    const ticketId = getAttributeValue(payload, "repairpilot_ticket_id");

    if (!ticketId) {
      console.warn(`${WEBHOOK_TAG} No ticket attribute found on order ${payload?.id}`);
      return new Response();
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      console.warn(`${WEBHOOK_TAG} Ticket ${ticketId} not found for order ${payload?.id}`);
      return new Response();
    }

    const orderId =
      typeof payload?.admin_graphql_api_id === "string"
        ? payload.admin_graphql_api_id
        : payload?.id
        ? `gid://shopify/Order/${payload.id}`
        : null;

    const orderName = typeof payload?.name === "string" ? payload.name : null;
    const paymentGatewayNames = Array.isArray(payload?.payment_gateway_names)
      ? payload.payment_gateway_names
      : [];
    const paymentMethod = paymentGatewayNames.length > 0 ? paymentGatewayNames.join(", ") : null;

    const depositLine = findDepositLine(payload);
    const amountCandidates = [
      depositLine?.price_set?.shop_money,
      depositLine?.price_set?.presentment_money,
      depositLine?.price,
      payload?.current_total_price_set?.shop_money,
      payload?.total_price_set?.shop_money,
      payload?.total_price,
      payload?.subtotal_price,
    ];

    const depositAmount = amountCandidates
      .map(parseAmount)
      .find((value) => value !== null && value >= 0);

    const processedAt = payload?.processed_at || payload?.closed_at || payload?.created_at;

    if (ticket.depositPaymentOrderId === orderId && ticket.depositCollectedAt) {
      console.log(`${WEBHOOK_TAG} Ticket ${ticketId} already marked as collected for order ${orderId}`);
      return new Response();
    }

    const updateData: Record<string, any> = {
      depositPaymentOrderId: orderId,
      depositPaymentOrderName: orderName,
      depositPaymentMethod: paymentMethod,
      depositCollectedAt: processedAt ? new Date(processedAt) : new Date(),
    };

    if (depositAmount !== null) {
      updateData.depositCollectedAmount = new Prisma.Decimal(depositAmount);
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        ticketId,
        actor: "system",
        action: "deposit_collected",
        meta: {
          shop,
          orderId,
          orderName,
          paymentMethod,
          depositAmount,
          sourceName: payload?.source_name,
          processedAt,
        },
      },
    });

    console.log(`${WEBHOOK_TAG} Updated ticket ${ticketId} with POS payment order ${orderId}`);

    return new Response();
  } catch (error) {
    console.error(`${WEBHOOK_TAG} Failed to process orders/paid webhook`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
};




