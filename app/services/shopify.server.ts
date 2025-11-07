import { authenticate } from "../shopify.server";
import type { ActionFunctionArgs } from "react-router";
import { formatPhoneNumber } from "../utils/currency";

/**
 * Helper functions for Shopify operations
 */

export interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
}

export interface CustomerSearchResult {
  customers: Customer[];
}

export interface DraftOrder {
  id: string;
  name: string;
  totalPrice: string;
  status: string;
  invoiceUrl?: string;
}

export interface DraftOrderStatus {
  id: string;
  status: string;
  completedAt: string | null;
  order: {
    id: string;
    name: string;
    fullyPaid: boolean;
    financialStatus: string;
  } | null;
}

/**
 * Searches for customers in Shopify
 */
export async function searchCustomers(
  request: ActionFunctionArgs["request"],
  query: string
): Promise<Customer[]> {
  try {
    const { admin } = await authenticate.admin(request);
    
    const response = await admin.graphql(`
      query searchCustomers($query: String!) {
        customers(first: 10, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              displayName
              email
              phone
            }
          }
        }
      }
    `, {
      variables: { query }
    });

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("Customer search GraphQL errors:", responseJson.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
    }

    const customers = responseJson.data?.customers?.edges?.map((edge: any) => edge.node) || [];
    console.log(`Found ${customers.length} customers for query: "${query}"`);
    return customers;

  } catch (error) {
    console.error("Error in searchCustomers:", error);
    
    // If Protected Customer Data error, return empty array to allow manual entry
    if (error instanceof Error && error.message.includes("protected-customer-data")) {
      console.warn("Protected Customer Data access denied, returning empty results");
      return [];
    }
    
    throw error;
  }
}

/**
 * Creates a new customer in Shopify
 */
export async function createCustomer(
  request: ActionFunctionArgs["request"],
  customerData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }
): Promise<Customer> {
  const { admin, session } = await authenticate.admin(request);
  
  // Check if session has the required scope
  if (session && !session.scope?.includes('write_customers')) {
    const errorMessage = `Missing 'write_customers' scope. Please re-authorize the app to grant this permission. To fix this: 1) Go to your Shopify admin, 2) Navigate to Apps → Repair Pilot, 3) Click 'Manage app access' or reinstall the app, 4) Grant the 'write_customers' permission.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  const response = await admin.graphql(`
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          displayName
          email
          phone
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone ? formatPhoneNumber(customerData.phone) : undefined,
      }
    }
  });

  const responseJson = await response.json();
  
  if (responseJson.errors) {
    const errorMessages = responseJson.errors.map((e: any) => e.message || JSON.stringify(e)).join(", ");
    
    // Check for scope-related errors
    if (errorMessages.includes("write_customers") || errorMessages.includes("Access denied")) {
      const scopeError = `Missing 'write_customers' scope. Please re-authorize the app to grant this permission. To fix this: 1) Go to your Shopify admin, 2) Navigate to Apps → Repair Pilot, 3) Click 'Manage app access' or reinstall the app, 4) Grant the 'write_customers' permission.`;
      console.error(scopeError);
      throw new Error(scopeError);
    }
    
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  if (responseJson.data?.customerCreate?.userErrors?.length > 0) {
    const userErrors = responseJson.data.customerCreate.userErrors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
    throw new Error(`Customer creation errors: ${userErrors}`);
  }

  const customer = responseJson.data?.customerCreate?.customer;
  if (!customer) {
    throw new Error("Customer creation failed: No customer returned from API");
  }

  return customer;
}

/**
 * Creates a draft order in Shopify
 */
export async function createDraftOrder(
  request: ActionFunctionArgs["request"],
  draftOrderData: {
    customerId: string;
    lineItems: Array<{
      title: string;
      quantity: number;
      originalUnitPrice: string;
    }>;
    note?: string;
  }
): Promise<DraftOrder> {
  const { admin, session } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          totalPrice
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: {
        customerId: draftOrderData.customerId,
        lineItems: draftOrderData.lineItems,
        note: draftOrderData.note,
      }
    }
  });

  const responseJson = await response.json();
  
  if (responseJson.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
  }

  if (responseJson.data?.draftOrderCreate?.userErrors?.length > 0) {
    throw new Error(`Draft order creation errors: ${JSON.stringify(responseJson.data.draftOrderCreate.userErrors)}`);
  }

  const draftOrder = responseJson.data?.draftOrderCreate?.draftOrder;
  
  console.log(`Created draft order with status: ${draftOrder?.status}`);
  
  // Generate invoice URL from the session shop domain
  const shopDomain = session?.shop?.replace('.myshopify.com', '');
  const orderId = draftOrder?.id ? draftOrder.id.split('/').pop() : null;
  const invoiceUrl = orderId && shopDomain
    ? `https://${shopDomain}.myshopify.com/admin/orders/${orderId}/invoice`
    : undefined;

  if (invoiceUrl) {
    console.log(`Invoice URL: ${invoiceUrl}`);
    console.log(`Note: Customer payment via invoice automatically converts draft order to paid order`);
  }

  return {
    ...draftOrder,
    invoiceUrl,
  };
}

/**
 * Creates a draft order that can be completed manually in Shopify Admin
 * Note: POS orders require a POS device and cannot be created via API
 * Draft orders allow the store to manually process payment later
 */
export async function createPosOrder(
  request: ActionFunctionArgs["request"],
  posOrderData: {
    customerId: string;
    lineItems: Array<{
      title: string;
      quantity: number;
      price: string;
    }>;
    note?: string;
  }
) {
  // Use draft order instead of POS order
  // POS orders can only be created through the POS app with a physical device
  // Draft orders allow manual payment processing in Shopify Admin
  return await createDraftOrder(request, {
    customerId: posOrderData.customerId,
    lineItems: posOrderData.lineItems.map(item => ({
      title: item.title,
      quantity: item.quantity,
      originalUnitPrice: item.price,
    })),
    note: posOrderData.note || "Repair ticket payment - to be completed manually",
  });
}

/**
 * Gets customer details by ID
 */
export async function getCustomer(
  request: ActionFunctionArgs["request"],
  customerId: string
): Promise<Customer | null> {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        displayName
        email
        phone
      }
    }
  `, {
    variables: { id: customerId }
  });

  const responseJson = await response.json();
  
  if (responseJson.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
  }

  return responseJson.data?.customer || null;
}

/**
 * Gets shop information
 */
export async function getShop(request: ActionFunctionArgs["request"]) {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query getShop {
      shop {
        id
        name
        myshopifyDomain
        email
        phone
        timezone
        currencyCode
      }
    }
  `);

  const responseJson = await response.json();
  
  if (responseJson.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
  }

  return responseJson.data?.shop;
}

/**
 * Sends a draft order invoice to the customer via email
 */
export async function sendDraftOrderInvoice(
  request: ActionFunctionArgs["request"],
  draftOrderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await authenticate.admin(request);
    
    const response = await admin.graphql(`
      mutation draftOrderInvoiceSend($id: ID!) {
        draftOrderInvoiceSend(id: $id) {
          draftOrder {
            id
            invoiceUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        id: draftOrderId
      }
    });

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL errors sending draft order invoice:", responseJson.errors);
      return { success: false, error: `GraphQL errors: ${JSON.stringify(responseJson.errors)}` };
    }

    const userErrors = responseJson.data?.draftOrderInvoiceSend?.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error("User errors sending draft order invoice:", userErrors);
      return { success: false, error: `User errors: ${JSON.stringify(userErrors)}` };
    }

    console.log(`Successfully sent invoice for draft order: ${draftOrderId}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending draft order invoice:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

/**
 * Gets draft order status from Shopify
 * Returns status and payment information if the draft order has been completed
 */
export async function getDraftOrderStatus(
  request: ActionFunctionArgs["request"],
  draftOrderId: string
): Promise<DraftOrderStatus | null> {
  try {
    const { admin } = await authenticate.admin(request);
    
    const response = await admin.graphql(`
      query getDraftOrder($id: ID!) {
        draftOrder(id: $id) {
          id
          status
          completedAt
          order {
            id
            name
            fullyPaid
            financialStatus
          }
        }
      }
    `, {
      variables: {
        id: draftOrderId
      }
    });

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL errors fetching draft order:", responseJson.errors);
      return null;
    }

    const draftOrder = responseJson.data?.draftOrder;
    
    if (!draftOrder) {
      console.warn(`Draft order not found for ID: ${draftOrderId}`);
      return null;
    }

    // Debug logging to see what status values we're getting
    console.log(`Draft order status for ${draftOrderId}:`, {
      status: draftOrder.status,
      completedAt: draftOrder.completedAt,
      hasOrder: !!draftOrder.order,
      orderName: draftOrder.order?.name,
      fullyPaid: draftOrder.order?.fullyPaid,
      financialStatus: draftOrder.order?.financialStatus,
    });

    return {
      id: draftOrder.id,
      status: draftOrder.status,
      completedAt: draftOrder.completedAt,
      order: draftOrder.order ? {
        id: draftOrder.order.id,
        name: draftOrder.order.name,
        fullyPaid: draftOrder.order.fullyPaid,
        financialStatus: draftOrder.order.financialStatus,
      } : null,
    };
  } catch (error) {
    console.error("Error fetching draft order status:", error);
    return null;
  }
}

/**
 * Staff Member interface matching Shopify StaffMember
 */
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  active: boolean;
}

/**
 * Gets all staff members from Shopify
 */
export async function getStaffMembers(
  request: ActionFunctionArgs["request"],
  activeOnly: boolean = false
): Promise<StaffMember[]> {
  try {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
      query getStaffMembers {
        staffMembers(first: 250) {
          nodes {
            id
            name
            email
            firstName
            lastName
            phone
            active
          }
        }
      }
    `);

    // Handle 204 No Content (usually means missing scope or no permission)
    if (response.status === 204) {
      console.warn("Received 204 No Content response. This usually means the 'read_users' scope is missing.");
      throw new Error("Missing 'read_users' scope. Please add it to your app scopes and reinstall the app.");
    }

    const responseJson = await response.json();

    if (responseJson.errors) {
      console.error("Staff members GraphQL errors:", responseJson.errors);
      
      // Check if it's a scope/permission error
      const errorMessages = responseJson.errors.map((e: any) => e.message || JSON.stringify(e)).join(", ");
      if (errorMessages.includes("read_users") || errorMessages.includes("permission") || errorMessages.includes("scope")) {
        throw new Error("Missing 'read_users' scope. Please add it to your app scopes and reinstall the app.");
      }
      
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    let staffMembers = responseJson.data?.staffMembers?.nodes || [];

    // Filter by active status if requested
    if (activeOnly) {
      staffMembers = staffMembers.filter((member: StaffMember) => member.active);                                                                               
    }
    
    console.log(`Found ${staffMembers.length} staff members`);
    return staffMembers;

  } catch (error) {
    console.error("Error in getStaffMembers:", error);
    
    // Return empty array instead of throwing if it's a scope issue (graceful degradation)
    if (error instanceof Error && error.message.includes("read_users")) {
      console.warn("read_users scope not available. Returning empty staff list.");
      return [];
    }
    
    throw error;
  }
}

/**
 * Gets a single staff member by ID from Shopify
 */
export async function getStaffMember(
  request: ActionFunctionArgs["request"],
  staffMemberId: string
): Promise<StaffMember | null> {
  try {
    const { admin } = await authenticate.admin(request);
    
    const response = await admin.graphql(`
      query getStaffMember($id: ID!) {
        staffMember(id: $id) {
          id
          name
          email
          firstName
          lastName
          phone
          active
        }
      }
    `, {
      variables: { id: staffMemberId }
    });

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
    }

    return responseJson.data?.staffMember || null;

  } catch (error) {
    console.error("Error in getStaffMember:", error);
    throw error;
  }
}

/**
 * Interface for uploaded file result
 */
export interface UploadedFile {
  id: string;
  url: string;
  alt?: string;
}

/**
 * Uploads a photo file to Shopify using staged uploads
 * Returns the file ID and URL that can be stored in the database
 */
export async function uploadPhoto(
  request: ActionFunctionArgs["request"],
  file: File,
  alt?: string
): Promise<UploadedFile> {
  const { admin } = await authenticate.admin(request);

  // Step 1: Create staged upload target
  const stagedResponse = await admin.graphql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: [
        {
          filename: file.name,
          mimeType: file.type,
          httpMethod: "POST",
          resource: "FILE",
          fileSize: file.size.toString()
        }
      ]
    }
  });

  const stagedJson = await stagedResponse.json();

  if (stagedJson.errors) {
    const errorMessages = stagedJson.errors.map((e: any) => e.message || JSON.stringify(e)).join(", ");
    if (errorMessages.includes("Access denied") || errorMessages.includes("permission") || errorMessages.includes("scope")) {
      throw new Error(`Access denied: The 'write_files' scope is required. Please ensure it's added to shopify.app.toml and reinstall the app in your Shopify Partners dashboard. Error: ${errorMessages}`);
    }
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  if (stagedJson.data?.stagedUploadsCreate?.userErrors?.length > 0) {
    const userErrors = stagedJson.data.stagedUploadsCreate.userErrors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
    throw new Error(`Staged upload errors: ${userErrors}`);
  }

  const stagedTarget = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!stagedTarget) {
    throw new Error("Failed to create staged upload target");
  }

  // Step 2: Upload file to staged URL
  const formData = new FormData();
  stagedTarget.parameters.forEach((param: { name: string; value: string }) => {
    formData.append(param.name, param.value);
  });
  formData.append("file", file);

  const uploadResponse = await fetch(stagedTarget.url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Step 3: Create file record in Shopify
  const fileResponse = await admin.graphql(`
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          alt
          ... on MediaImage {
            image {
              url
              width
              height
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      files: [
        {
          contentType: "IMAGE",
          originalSource: stagedTarget.resourceUrl,
          alt: alt || file.name,
        }
      ]
    }
  });

  const fileJson = await fileResponse.json();

  if (fileJson.errors) {
    console.error("File creation GraphQL errors:", JSON.stringify(fileJson.errors, null, 2));
    throw new Error(`GraphQL errors: ${JSON.stringify(fileJson.errors)}`);
  }

  if (fileJson.data?.fileCreate?.userErrors?.length > 0) {
    console.error("File creation user errors:", JSON.stringify(fileJson.data.fileCreate.userErrors, null, 2));
    throw new Error(`File creation errors: ${JSON.stringify(fileJson.data.fileCreate.userErrors)}`);
  }

  const createdFile = fileJson.data?.fileCreate?.files?.[0];
  if (!createdFile) {
    console.error("No file returned from fileCreate:", JSON.stringify(fileJson.data, null, 2));
    throw new Error("Failed to create file record");
  }

  // If file is ready, return immediately
  if (createdFile.fileStatus === "READY" && (createdFile as any).image?.url) {
    return {
      id: createdFile.id,
      url: (createdFile as any).image.url,
      alt: createdFile.alt || undefined,
    };
  }

  // File is still processing, poll until ready
  console.log(`File status is ${createdFile.fileStatus}, polling until ready...`);
  const maxAttempts = 30; // 30 attempts * 1 second = 30 seconds max
  const pollInterval = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const pollResponse = await admin.graphql(`
      query getFile($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            id
            fileStatus
            alt
            image {
              url
              width
              height
            }
          }
        }
      }
    `, {
      variables: {
        id: createdFile.id
      }
    });

    const pollJson = await pollResponse.json();

    if (pollJson.errors) {
      throw new Error(`Error polling file: ${JSON.stringify(pollJson.errors)}`);
    }

    const fileNode = pollJson.data?.node as any;
    
    if (!fileNode) {
      throw new Error("File not found when polling");
    }

    if (fileNode.fileStatus === "READY" && fileNode.image?.url) {
      return {
        id: fileNode.id,
        url: fileNode.image.url,
        alt: fileNode.alt || undefined,
      };
    }

    // If status indicates an error
    if (fileNode.fileStatus === "FAILED") {
      throw new Error("File processing failed");
    }

    console.log(`Poll attempt ${attempt + 1}/${maxAttempts}: Status is ${fileNode.fileStatus}`);
  }

  // If we've exhausted all attempts
  throw new Error(`File did not become ready within ${maxAttempts} seconds. Last status: ${createdFile.fileStatus}`);
}

/**
 * Uploads multiple photos at once
 */
export async function uploadPhotos(
  request: ActionFunctionArgs["request"],
  files: File[],
  altPrefix?: string
): Promise<UploadedFile[]> {
  const uploadPromises = files.map((file, index) => 
    uploadPhoto(request, file, altPrefix ? `${altPrefix} ${index + 1}` : undefined)
  );
  
  return Promise.all(uploadPromises);
}
