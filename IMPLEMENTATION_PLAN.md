# Payal Biryani - Implementation Plan

## Issues to Fix:
1. ✅ OTP login - OTP is generated but needs to be displayed properly
2. ✅ Google Sign-In - Need to verify backend API works
3. ✅ User registration - Need to ensure data persists

## New Features to Implement:

### Phase 1: Authentication & User Management (Priority 1)
- [ ] Fix OTP display on phone login
- [ ] Fix Google Sign-In callback
- [ ] Ensure all users are saved to data.json
- [ ] Create customer login page with order history

### Phase 2: Customer Dashboard (Priority 2)
- [ ] View all previous orders
- [ ] Track current order status
- [ ] Raise complaint for orders
- [ ] Add comments/notes to orders

### Phase 3: Order Management (Priority 3)
- [ ] Owner can change order status: pending → received → preparing → cooked → out_for_delivery → delivered
- [ ] Add status timestamps
- [ ] Customer sees real-time status updates

### Phase 4: Communication (Priority 4)
- [ ] Chat system between customer and owner
- [ ] Chat system between customer and delivery agent

---

## Technical Implementation:

### Backend (server.js) - API Updates:
1. Fix phone OTP endpoints to ensure proper response
2. Add customer-specific endpoints:
   - GET /api/customer/orders - Get customer's order history
   - POST /api/customer/complaint - Raise complaint
   - GET/POST /api/customer/chat - Chat with owner/driver
3. Update order status flow for owner
4. Add more status options

### Frontend Updates:
1. Create customer dashboard (modify public/index.html or create new page)
2. Add order tracking section
3. Add complaint form
4. Add chat interface
5. Update owner dashboard for new order statuses

---

## Order Status Flow:
- pending (just placed)
- received (owner confirmed)
- preparing (being cooked)
- cooked (ready)
- out_for_delivery (with driver)
- delivered (completed)
- cancelled (if needed)
