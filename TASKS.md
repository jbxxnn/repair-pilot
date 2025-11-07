# Repair Pilot - Feature Tasks & Roadmap

This document outlines all planned features and improvements for the Repair Pilot application, organized by priority and status.

---

## ✅ Completed Features

- ✅ **Ticket Creation from POS Modal**
  - Customer search and creation
  - Device information capture
  - Financial details (quoted amount, deposit)
  - Draft order creation for deposits
  - Invoice URL generation

- ✅ **Admin Dashboard - Ticket Board**
  - Kanban-style board with status columns
  - Status filtering
  - Ticket statistics (total, active, deposits)
  - Real-time status updates
  - Compact ticket cards with hover effects

- ✅ **Ticket Detail Modal**
  - Customer information display
  - Device information
  - Financial information
  - Order information (intake/final order IDs)
  - Status management
  - Clickable contact links (email, phone)

- ✅ **Customer Management**
  - Customer search integration
  - Customer creation
  - Customer details fetching and display
  - Protected Customer Data access configured

- ✅ **Payment Flow**
  - Draft order creation for deposits
  - Invoice URL generation
  - Status-based order creation (draft orders for final payments)

---

## 🔥 High Priority Features

### 1. Parts Management System
**Status:** Not Started  
**Priority:** High  
**Estimated Effort:** Medium

**Requirements:**
- Add/remove parts used in repairs per ticket
- Track parts costs
- Update ticket total based on parts used
- Display parts list in ticket modal
- Calculate remaining amount including parts costs

**Technical Notes:**
- Database schema already has `PartsUsed` table
- Fields: `id`, `ticketId`, `sku`, `quantity`, `cost`
- Need API endpoints for CRUD operations on parts
- UI components for adding/managing parts in ticket modal

**Acceptance Criteria:**
- [ ] Can add parts to a ticket with SKU, quantity, and cost
- [ ] Parts list displays in ticket modal
- [ ] Total ticket cost updates when parts are added/removed
- [ ] Parts can be edited or removed
- [ ] Parts cost is included in remaining amount calculation

---

### 2. Technician Assignment
**Status:** Not Started  
**Priority:** High  
**Estimated Effort:** Low-Medium

**Requirements:**
- Assign tickets to technicians
- Filter tickets by technician
- Display assigned technician in ticket cards and modal
- Technician list/dropdown for assignment

**Technical Notes:**
- Database schema already has `technicianId` field in `Ticket` model
- Need technician management (could be simple list or full CRUD)
- Update ticket creation and ticket modal UI
- Add technician filter to admin dashboard

**Acceptance Criteria:**
- [ ] Can assign technician when creating ticket
- [ ] Can change technician assignment on existing ticket
- [ ] Filter tickets by technician in dashboard
- [ ] Technician name displays on ticket cards and in modal
- [ ] Technician filter works with status filter

---

### 3. Photo Management
**Status:** Not Started  
**Priority:** High  
**Estimated Effort:** Medium-High

**Requirements:**
- Upload device photos at ticket creation
- Display photos in ticket modal
- Multiple photos per ticket
- Photo gallery view

**Technical Notes:**
- Database schema already has `photos` JSON field
- Need file upload handling (consider Shopify Files API or external storage)
- Image compression/optimization
- Display images in modal with lightbox/gallery

**Acceptance Criteria:**
- [ ] Can upload photos when creating ticket from POS
- [ ] Photos display in ticket modal
- [ ] Can view photos in full-size (lightbox/modal)
- [ ] Multiple photos supported
- [ ] Photos are stored securely and accessible

---

## 🟡 Medium Priority Features

### 4. Customer Notifications
**Status:** Not Started  
**Priority:** Medium  
**Estimated Effort:** High

**Requirements:**
- SMS notification when ticket status changes to "Ready"
- Email notifications for status updates
- Configurable notification preferences
- Notification history/log

**Technical Notes:**
- Need SMS service integration (Twilio, AWS SNS, etc.)
- Need email service (Shopify email, SendGrid, etc.)
- Notification preferences storage
- Webhook/event system for status changes

**Acceptance Criteria:**
- [ ] SMS sent automatically when ticket status → "Ready"
- [ ] Email sent for major status changes
- [ ] Notification preferences can be configured
- [ ] Notification history is logged
- [ ] Notifications are reliable and delivered

---

### 5. Order/Invoice Management
**Status:** ✅ Complete  
**Priority:** Medium  
**Estimated Effort:** Low-Medium

**Requirements:**
- ✅ Clickable links to Shopify draft orders
- ✅ Better visibility into payment status
- ✅ Track order payment completion
- ✅ Link final orders to tickets
- ✅ Payment status indicators

**Technical Notes:**
- Currently creating draft orders and storing IDs
- ✅ Added clickable links in ticket modal with improved styling
- ✅ Implemented GraphQL API calls to fetch draft order status in real-time
- ✅ Added payment status badges showing: Draft, Invoice Sent, Paid, or Order status
- ✅ Updated UI to show order information clearly with visual distinction between intake and final orders
- ✅ Links automatically switch from draft order page to order page when draft is completed
- Webhook support for real-time updates (optional future enhancement)

**Acceptance Criteria:**
- [x] Clickable links to draft orders in ticket modal
- [x] Payment status is clearly displayed with status badges
- [x] Can track when deposit/final payment is completed (via GraphQL API)
- [x] Links open in new tab to Shopify admin
- [x] Links automatically update to order page when draft is completed

---

### 6. Advanced Search & Filters
**Status:** Not Started  
**Priority:** Medium  
**Estimated Effort:** Medium

**Requirements:**
- Search by customer name
- Search by ticket ID
- Search by device type/brand/model
- Filter by date range
- Filter by technician
- Combine multiple filters

**Technical Notes:**
- Add search input to admin dashboard
- Update API endpoint to support search queries
- Add date range picker
- Enhance filter UI

**Acceptance Criteria:**
- [ ] Can search tickets by customer name
- [ ] Can search by ticket ID or device info
- [ ] Date range filtering works
- [ ] Multiple filters can be combined
- [ ] Search is fast and responsive

---

## 🟢 Lower Priority Features

### 7. Reports & Analytics
**Status:** ✅ Complete  
**Priority:** Low  
**Estimated Effort:** High

**Requirements:**
- ✅ Revenue reports by period (daily, weekly, monthly)
- ✅ Average repair time metrics
- ✅ Status distribution charts
- ✅ Technician performance metrics
- ✅ Customer repeat rate
- ✅ Export reports (CSV) - PDF export can be added later

**Technical Notes:**
- ✅ Data aggregation queries implemented in `/api/reports/analytics`
- ✅ Recharts library integrated for charting
- ✅ Report generation and CSV export functionality implemented
- ✅ New reports page/route at `/app/reports`
- ✅ Date range filtering and period selection (daily/weekly/monthly)
- ✅ Interactive charts with tooltips and legends

**Acceptance Criteria:**
- [x] Revenue reports show accurate data with period breakdown
- [x] Charts display properly (Line chart for revenue, Pie chart for status, Bar chart for technicians)
- [x] Reports can be filtered by date range
- [x] Reports can be exported to CSV
- [x] Performance metrics are calculated correctly (avg repair time, repeat rate, technician stats)

---

## 🔮 Future Features (Backlog)

### 8. QR Code Generation for Tickets
**Status:** ✅ Complete  
**Priority:** Medium (for later implementation)  
**Estimated Effort:** Medium

**Requirements:**
- ✅ Generate unique QR code for each ticket (displayed on-demand in ticket modal)
- ✅ QR code encodes direct ticket URL
- ✅ Display QR code in ticket modal
- ✅ Print-friendly QR code view
- ✅ Ability to scan QR code and redirect to ticket page (requires authentication)
- ✅ QR code stickers for physical devices (via print functionality)

**Use Case:**
- Print QR code stickers in shop
- Attach stickers to physical devices
- Scan with phone/tablet to quickly access ticket
- Streamline device tracking and status updates

**Technical Notes:**
- ✅ QR code library integrated (qrcode.react)
- ✅ QR code generated on-demand in ticket modal (not stored, generated dynamically)
- ✅ QR code links to ticket detail page (`/app/tickets/{ticketId}`)
- ✅ Authentication handled by existing ticket route (requires Shopify admin authentication)
- ✅ Mobile-responsive ticket page for scanning

**Acceptance Criteria:**
- [x] QR code generated automatically when ticket is viewed (displayed in ticket modal)
- [x] QR code displays in ticket modal
- [x] QR code can be printed/downloaded (via print button)
- [x] Scanning QR code opens ticket page (with appropriate auth - requires Shopify admin authentication)
- [x] QR code is scannable and links correctly
- [x] Print-friendly view for sticker printing

**Security Considerations:**
- ✅ QR codes link to authenticated ticket detail page
- ✅ Ticket access requires Shopify admin authentication (existing route handles this)
- ✅ QR codes do not expose sensitive customer data directly (only ticket ID)
- ✅ Staff authentication required to view ticket details

---

## 📝 Notes

### Technical Debt & Improvements
- [ ] Error handling improvements
- [ ] Loading states consistency
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Mobile responsiveness improvements
- [ ] Performance optimization (lazy loading, pagination)
- [ ] Unit and integration tests
- [ ] Documentation updates

### Infrastructure
- [ ] Database indexing optimization
- [ ] API rate limiting
- [ ] Caching strategy
- [ ] Backup and recovery procedures
- [ ] Monitoring and logging

---

## 🎯 Current Sprint Focus

**Immediate Next Steps:**
1. Parts Management System (High Priority)
2. Technician Assignment (High Priority)
3. Photo Management (High Priority)

---

**Last Updated:** 2025-01-29  
**Document Owner:** Development Team  
**Review Frequency:** Weekly during active development





