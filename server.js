const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = 'data.json';

// Initialize data file
let data = {
  users: [],
  menu_items: [],
  orders: [],
  otp_store: {},
  chats: [],
  complaints: []
};

// Load existing data or create defaults
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.log('Error loading data, using defaults');
  }
}

// Ensure all required fields exist
if (!data.otp_store) data.otp_store = {};
if (!data.chats) data.chats = [];
if (!data.complaints) data.complaints = [];

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (simulated - in production use Twilio)
function sendOTP(phone, otp) {
  console.log(`OTP for ${phone}: ${otp}`);
  return true;
}

// Initialize default data if empty
if (data.users.length === 0) {
  data.users = [
    { id: 1, username: 'owner', password: bcrypt.hashSync('owner123', 10), role: 'owner', name: 'Restaurant Owner', phone: '+919876543210', email: 'owner@payalbiryani.com', auth_provider: 'email' },
    { id: 2, username: 'agent1', password: bcrypt.hashSync('agent123', 10), role: 'agent', name: 'Delivery Agent 1', phone: '9876543210', email: 'agent1@payalbiryani.com', auth_provider: 'email' },
    { id: 3, username: 'agent2', password: bcrypt.hashSync('agent123', 10), role: 'agent', name: 'Delivery Agent 2', phone: '9876543211', email: 'agent2@payalbiryani.com', auth_provider: 'email' }
  ];
  saveData();
}

if (data.menu_items.length === 0) {
  data.menu_items = [
    { id: 1, name: 'Chicken Biryani', description: 'Aromatic basmati rice layered with tender chicken and rich spices', price: 220, category: 'nonveg', image: '', available: true },
    { id: 2, name: 'Mutton Biryani', description: 'Premium mutton cooked with fragrant rice and authentic masala', price: 320, category: 'nonveg', image: '', available: true },
    { id: 3, name: 'Egg Biryani', description: 'Perfectly boiled eggs layered with spiced basmati rice', price: 190, category: 'nonveg', image: '', available: true },
    { id: 4, name: 'Chicken 65', description: 'Spicy, crispy fried chicken - a perfect starter', price: 180, category: 'nonveg', image: '', available: true },
    { id: 5, name: 'Chicken Lollipop', description: 'Crispy, spicy chicken lollipops - our customer favorite!', price: 200, category: 'nonveg', image: '', available: true },
    { id: 6, name: 'Fish Fry', description: 'Crispy fried fish made with fresh catch of the day', price: 250, category: 'nonveg', image: '', available: true },
    { id: 7, name: 'Veg Biryani', description: 'Delicious mix of fresh vegetables with aromatic basmati rice', price: 180, category: 'veg', image: '', available: true },
    { id: 8, name: 'Paneer Biryani', description: 'Soft paneer cubes layered with spiced rice', price: 200, category: 'veg', image: '', available: true },
    { id: 9, name: 'Mushroom Biryani', description: 'Savory mushrooms cooked with aromatic basmati rice', price: 190, category: 'veg', image: '', available: true },
    { id: 10, name: 'Veg Fried Rice', description: 'Stir-fried rice with fresh vegetables and soy sauce', price: 150, category: 'veg', image: '', available: true },
    { id: 11, name: 'Paneer Tikka', description: 'Grilled paneer with bell peppers and aromatic spices', price: 220, category: 'veg', image: '', available: true },
    { id: 12, name: 'Veg Manchurian', description: 'Crispy vegetable balls in savory manchurian sauce', price: 160, category: 'veg', image: '', available: true }
  ];
  saveData();
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'payal-biryani-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Unauthorized' });
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.json({ success: false, message: 'Access denied' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Login with username/password
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required' });
  }
  
  const user = data.users.find(u => u.username === username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }
  
  req.session.user = { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    name: user.name, 
    auth_provider: user.auth_provider,
    phone: user.phone,
    email: user.email
  };
  
  res.json({ success: true, user: req.session.user });
});

// Google Sign-In
app.post('/api/auth/google', (req, res) => {
  const { googleToken, name, email, googleId } = req.body;
  
  console.log('Google Sign-In attempt:', { googleId, email, name });
  
  // Check if user exists with this Google ID
  let user = data.users.find(u => u.google_id === googleId && u.auth_provider === 'google');
  
  if (!user) {
    // Check if user exists with this email
    user = data.users.find(u => u.email === email);
    
    if (user) {
      // Link Google account to existing user
      user.google_id = googleId;
      user.auth_provider = 'google';
    } else {
      // Create new user
      user = {
        id: Date.now(),
        username: email.split('@')[0].toLowerCase() + '_' + Date.now().toString().slice(-4),
        name: name || email.split('@')[0],
        email: email,
        google_id: googleId,
        phone: '',
        role: 'customer',
        auth_provider: 'google',
        password: ''
      };
      data.users.push(user);
      console.log('Created new Google user:', user.username);
    }
    saveData();
  }
  
  req.session.user = { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    name: user.name,
    auth_provider: user.auth_provider,
    email: user.email,
    phone: user.phone
  };
  
  res.json({ success: true, user: req.session.user });
});

// Phone OTP - Send OTP
app.post('/api/auth/phone/send-otp', (req, res) => {
  const { phone } = req.body;
  
  console.log('OTP request for phone:', phone);
  
  if (!phone || phone.length < 10) {
    return res.json({ success: false, message: 'Invalid phone number' });
  }
  
  // Generate OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  // Store OTP
  data.otp_store[phone] = {
    otp: otp,
    expiresAt: expiresAt,
    attempts: 0
  };
  saveData();
  
  // Send OTP (simulated)
  sendOTP(phone, otp);
  
  console.log('OTP generated:', otp, 'for phone:', phone);
  
  // Always return OTP for development
  res.json({ 
    success: true, 
    message: 'OTP sent successfully',
    dev_otp: otp 
  });
});

// Phone OTP - Verify OTP and Login/Signup
app.post('/api/auth/phone/verify', (req, res) => {
  const { phone, otp } = req.body;
  
  console.log('OTP verify attempt for phone:', phone, 'OTP:', otp);
  
  if (!phone || !otp) {
    return res.json({ success: false, message: 'Phone number and OTP required' });
  }
  
  const otpData = data.otp_store[phone];
  
  if (!otpData) {
    return res.json({ success: false, message: 'OTP not requested. Please request OTP first.' });
  }
  
  if (Date.now() > otpData.expiresAt) {
    delete data.otp_store[phone];
    saveData();
    return res.json({ success: false, message: 'OTP expired. Please request a new OTP.' });
  }
  
  if (otpData.attempts >= 3) {
    delete data.otp_store[phone];
    saveData();
    return res.json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
  }
  
  if (otpData.otp !== otp) {
    otpData.attempts++;
    saveData();
    return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
  }
  
  // OTP verified - Create or update user
  let user = data.users.find(u => u.phone === phone);
  
  if (!user) {
    // Create new user
    user = {
      id: Date.now(),
      username: 'user_' + phone.slice(-4) + '_' + Date.now().toString().slice(-4),
      name: 'Customer',
      phone: phone,
      email: '',
      google_id: '',
      role: 'customer',
      auth_provider: 'phone',
      password: ''
    };
    data.users.push(user);
    console.log('Created new phone user:', user.username);
  }
  
  saveData();
  
  // Clean up OTP
  delete data.otp_store[phone];
  saveData();
  
  // Create session
  req.session.user = { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    name: user.name,
    auth_provider: user.auth_provider,
    phone: user.phone,
    email: user.email
  };
  
  console.log('Phone login success for user:', user.username);
  res.json({ success: true, user: req.session.user });
});

// Phone login with password
app.post('/api/auth/phone/login', (req, res) => {
  const { phone, password } = req.body;
  
  if (!phone || !password) {
    return res.json({ success: false, message: 'Phone and password required' });
  }
  
  const user = data.users.find(u => u.phone === phone);
  
  if (!user) {
    return res.json({ success: false, message: 'User not found. Please sign up first.' });
  }
  
  // For phone_password users, verify password
  if (user.auth_provider === 'phone_password') {
    if (!user.password || !bcrypt.compareSync(password, user.password)) {
      return res.json({ success: false, message: 'Invalid password' });
    }
  } else {
    return res.json({ success: false, message: 'Please use OTP login for this account' });
  }
  
  req.session.user = { 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    name: user.name,
    auth_provider: user.auth_provider,
    phone: user.phone,
    email: user.email
  };
  
  res.json({ success: true, user: req.session.user });
});

// Customer registration (email/password)
app.post('/api/auth/register', (req, res) => {
  const { username, password, name, email, phone } = req.body;
  
  if (!username || !password || !name) {
    return res.json({ success: false, message: 'Username, password and name are required' });
  }
  
  // Check if username exists
  if (data.users.find(u => u.username === username)) {
    return res.json({ success: false, message: 'Username already exists' });
  }
  
  // Check if email exists
  if (email && data.users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'Email already registered' });
  }
  
  // Check if phone exists
  if (phone && data.users.find(u => u.phone === phone)) {
    return res.json({ success: false, message: 'Phone number already registered' });
  }
  
  const newUser = {
    id: Date.now(),
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    email: email || '',
    phone: phone || '',
    google_id: '',
    role: 'customer',
    auth_provider: 'email'
  };
  
  data.users.push(newUser);
  saveData();
  
  console.log('New user registered:', username);
  
  req.session.user = { 
    id: newUser.id, 
    username: newUser.username, 
    role: newUser.role, 
    name: newUser.name,
    auth_provider: newUser.auth_provider,
    email: newUser.email,
    phone: newUser.phone
  };
  
  res.json({ success: true, user: req.session.user });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/user', (req, res) => {
  res.json({ user: req.session.user || null });
});

// ==================== CUSTOMER ROUTES ====================

// Get customer profile
app.get('/api/customer/profile', requireAuth, (req, res) => {
  const user = data.users.find(u => u.id === req.session.user.id);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.json({ success: false, message: 'User not found' });
  }
});

// Update customer profile
app.put('/api/customer/profile', requireAuth, (req, res) => {
  const { name, email, phone, address } = req.body;
  const userIndex = data.users.findIndex(u => u.id === req.session.user.id);
  
  if (userIndex === -1) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  if (name) data.users[userIndex].name = name;
  if (email) data.users[userIndex].email = email;
  if (phone) data.users[userIndex].phone = phone;
  if (address) data.users[userIndex].address = address;
  
  saveData();
  
  req.session.user = { ...req.session.user, ...data.users[userIndex] };
  
  res.json({ success: true, message: 'Profile updated' });
});

// Get customer order history
app.get('/api/customer/orders', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const user = data.users.find(u => u.id === userId);
  
  // Get orders by phone or user ID
  const orders = data.orders
    .filter(o => o.customer_phone === user.phone || o.customer_id === userId)
    .map(o => {
      const agent = data.users.find(u => u.id === o.delivery_agent_id);
      const complaint = data.complaints.find(c => c.order_id === o.id);
      return { 
        ...o, 
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null,
        has_complaint: !!complaint,
        complaint_status: complaint ? complaint.status : null
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ success: true, orders });
});

// Track specific order
app.get('/api/customer/track/:id', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const user = data.users.find(u => u.id === userId);
  const orderId = parseInt(req.params.id);
  
  const order = data.orders.find(o => o.id === orderId && (o.customer_phone === user.phone || o.customer_id === userId));
  
  if (!order) {
    return res.json({ success: false, message: 'Order not found' });
  }
  
  const agent = order.delivery_agent_id ? data.users.find(u => u.id === order.delivery_agent_id) : null;
  const complaint = data.complaints.find(c => c.order_id === order.id);
  
  res.json({ 
    success: true, 
    order: { 
      ...order, 
      agent_name: agent ? agent.name : null,
      agent_phone: agent ? agent.phone : null,
      complaint: complaint || null
    }
  });
});

// Raise complaint
app.post('/api/customer/complaint', requireAuth, (req, res) => {
  const { order_id, subject, message } = req.body;
  const userId = req.session.user.id;
  const user = data.users.find(u => u.id === userId);
  
  if (!order_id || !subject || !message) {
    return res.json({ success: false, message: 'Order ID, subject and message are required' });
  }
  
  // Verify order belongs to user
  const order = data.orders.find(o => o.id === order_id && (o.customer_phone === user.phone || o.customer_id === userId));
  
  if (!order) {
    return res.json({ success: false, message: 'Order not found' });
  }
  
  const complaint = {
    id: Date.now(),
    order_id: parseInt(order_id),
    customer_id: userId,
    customer_name: user.name,
    customer_phone: user.phone,
    subject,
    message,
    status: 'pending', // pending, resolved
    created_at: new Date().toISOString(),
    response: ''
  };
  
  data.complaints.push(complaint);
  saveData();
  
  res.json({ success: true, message: 'Complaint submitted successfully', complaint_id: complaint.id });
});

// Get complaints for an order
app.get('/api/customer/complaints/:orderId', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const orderId = parseInt(req.params.orderId);
  
  const complaints = data.complaints.filter(c => c.order_id === orderId && c.customer_id === userId);
  
  res.json({ success: true, complaints });
});

// ==================== CHAT ROUTES ====================

// Get chat messages
app.get('/api/chat/:orderId', requireAuth, (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  
  // Verify user has access to this order
  const order = data.orders.find(o => o.id === orderId);
  if (!order) {
    return res.json({ success: false, message: 'Order not found' });
  }
  
  // Get messages for this order
  const messages = data.chats
    .filter(c => c.order_id === orderId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  res.json({ success: true, messages });
});

// Send chat message
app.post('/api/chat/:orderId', requireAuth, (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const { message, to_role } = req.body;
  const userId = req.session.user.id;
  const user = data.users.find(u => u.id === userId);
  
  if (!message) {
    return res.json({ success: false, message: 'Message is required' });
  }
  
  // Verify order exists
  const order = data.orders.find(o => o.id === orderId);
  if (!order) {
    return res.json({ success: false, message: 'Order not found' });
  }
  
  // Determine who can chat with whom
  let canSend = false;
  if (userRole === 'customer') {
    canSend = order.customer_phone === user.phone || order.customer_id === userId;
  } else if (userRole === 'owner') {
    canSend = true; // Owner can chat on any order
  } else if (userRole === 'agent') {
    canSend = order.delivery_agent_id === userId;
  }
  
  if (!canSend) {
    return res.json({ success: false, message: 'You cannot chat on this order' });
  }
  
  const chat = {
    id: Date.now(),
    order_id: orderId,
    user_id: userId,
    user_name: user.name,
    user_role: userRole,
    message,
    to_role: to_role || 'all', // customer, owner, agent
    created_at: new Date().toISOString(),
    read: false
  };
  
  data.chats.push(chat);
  saveData();
  
  res.json({ success: true, message: 'Message sent', chat });
});

// ==================== ORDER ROUTES ====================

// Get menu items (public)
app.get('/api/menu', (req, res) => {
  const items = data.menu_items.filter(i => i.available).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  res.json(items);
});

// Get all menu items (owner)
app.get('/api/admin/menu', requireAuth, requireRole(['owner']), (req, res) => {
  const items = data.menu_items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  res.json(items);
});

// Add menu item (owner)
app.post('/api/admin/menu', requireAuth, requireRole(['owner']), (req, res) => {
  const { name, description, price, category, image, available } = req.body;
  const newItem = {
    id: Date.now(),
    name, description, price, category, image: image || '',
    available: available !== false
  };
  data.menu_items.push(newItem);
  saveData();
  res.json({ success: true, id: newItem.id });
});

// Update menu item (owner)
app.put('/api/admin/menu/:id', requireAuth, requireRole(['owner']), (req, res) => {
  const { name, description, price, category, image, available } = req.body;
  const idx = data.menu_items.findIndex(i => i.id == req.params.id);
  if (idx !== -1) {
    data.menu_items[idx] = { ...data.menu_items[idx], name, description, price, category, image: image || '', available };
    saveData();
  }
  res.json({ success: true });
});

// Delete menu item (owner)
app.delete('/api/admin/menu/:id', requireAuth, requireRole(['owner']), (req, res) => {
  data.menu_items = data.menu_items.filter(i => i.id != req.params.id);
  saveData();
  res.json({ success: true });
});

// Get all orders (owner)
app.get('/api/admin/orders', requireAuth, requireRole(['owner']), (req, res) => {
  const orders = data.orders
    .map(o => {
      const agent = data.users.find(u => u.id === o.delivery_agent_id);
      const complaint = data.complaints.find(c => c.order_id === o.id);
      return { 
        ...o, 
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null,
        has_complaint: !!complaint,
        complaint_status: complaint ? complaint.status : null
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// Update order status (owner) - Extended status flow
app.post('/api/admin/order/:id/status', requireAuth, requireRole(['owner']), (req, res) => {
  const { status, note } = req.body;
  const idx = data.orders.findIndex(o => o.id == req.params.id);
  
  const validStatuses = ['pending', 'received', 'preparing', 'cooked', 'out_for_delivery', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.json({ success: false, message: 'Invalid status' });
  }
  
  if (idx !== -1) {
    const oldStatus = data.orders[idx].order_status;
    data.orders[idx].order_status = status;
    data.orders[idx].status_note = note || '';
    data.orders[idx].status_updated_at = new Date().toISOString();
    data.orders[idx].status_history = data.orders[idx].status_history || [];
    data.orders[idx].status_history.push({
      status,
      note: note || '',
      updated_at: new Date().toISOString(),
      updated_by: req.session.user.name
    });
    saveData();
    console.log(`Order ${data.orders[idx].id} status changed from ${oldStatus} to ${status}`);
  }
  res.json({ success: true });
});

// Get delivery agent orders
app.get('/api/agent/orders', requireAuth, requireRole(['agent']), (req, res) => {
  const orders = data.orders
    .filter(o => o.delivery_agent_id === req.session.user.id || (!o.delivery_agent_id && o.order_status === 'cooked'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// Accept order (agent)
app.post('/api/agent/accept/:id', requireAuth, requireRole(['agent']), (req, res) => {
  const idx = data.orders.findIndex(o => o.id == req.params.id);
  if (idx !== -1) {
    data.orders[idx].delivery_agent_id = req.session.user.id;
    data.orders[idx].order_status = 'out_for_delivery';
    data.orders[idx].status_updated_at = new Date().toISOString();
    saveData();
  }
  res.json({ success: true });
});

// Update order status (agent)
app.post('/api/agent/update/:id', requireAuth, requireRole(['agent', 'owner']), (req, res) => {
  const { status, note } = req.body;
  const idx = data.orders.findIndex(o => o.id == req.params.id);
  if (idx !== -1) {
    data.orders[idx].order_status = status;
    data.orders[idx].status_note = note || '';
    data.orders[idx].status_updated_at = new Date().toISOString();
    saveData();
  }
  res.json({ success: true });
});

// Place order (customer)
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_address, items, total_amount, payment_method, customer_id, notes } = req.body;
  
  if (!customer_name || !customer_phone || !items || !total_amount) {
    return res.json({ success: false, message: 'Missing required fields' });
  }
  
  const newOrder = {
    id: Date.now(),
    customer_id: customer_id || null,
    customer_name,
    customer_phone,
    customer_address: customer_address || '',
    items,
    total_amount,
    payment_method: payment_method || 'COD',
    payment_status: 'pending',
    order_status: 'pending',
    delivery_agent_id: null,
    status_note: notes || '',
    notes: notes || '',
    created_at: new Date().toISOString(),
    status_history: [{
      status: 'pending',
      note: 'Order placed',
      updated_at: new Date().toISOString(),
      updated_by: 'System'
    }]
  };
  
  data.orders.push(newOrder);
  saveData();
  
  console.log('New order placed:', newOrder.id, 'by', customer_name);
  
  res.json({ success: true, order_id: newOrder.id, order: newOrder });
});

// Track order (customer - public)
app.get('/api/track/:id', (req, res) => {
  const order = data.orders.find(o => o.id == req.params.id);
  if (order) {
    const agent = order.delivery_agent_id ? data.users.find(u => u.id === order.delivery_agent_id) : null;
    res.json({ 
      success: true, 
      order: {
        ...order,
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null
      }
    });
  } else {
    res.json({ success: false, message: 'Order not found' });
  }
});

// ==================== COMPLAINT ROUTES (Owner) ====================

// Get all complaints (owner)
app.get('/api/admin/complaints', requireAuth, requireRole(['owner']), (req, res) => {
  const complaints = data.complaints
    .map(c => {
      const order = data.orders.find(o => o.id === c.order_id);
      return { ...c, order };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(complaints);
});

// Respond to complaint (owner)
app.post('/api/admin/complaint/:id/respond', requireAuth, requireRole(['owner']), (req, res) => {
  const { response } = req.body;
  const idx = data.complaints.findIndex(c => c.id == req.params.id);
  
  if (idx !== -1) {
    data.complaints[idx].response = response;
    data.complaints[idx].status = 'resolved';
    data.complaints[idx].responded_at = new Date().toISOString();
    data.complaints[idx].responded_by = req.session.user.name;
    saveData();
  }
  
  res.json({ success: true });
});

// ==================== STATS ROUTES (Owner) ====================

// Get dashboard stats (owner)
app.get('/api/admin/stats', requireAuth, requireRole(['owner']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const totalOrders = data.orders.length;
  const todayOrders = data.orders.filter(o => o.created_at.startsWith(today)).length;
  const pendingOrders = data.orders.filter(o => o.order_status === 'pending' || o.order_status === 'received').length;
  const totalRevenue = data.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const todayRevenue = data.orders
    .filter(o => o.created_at.startsWith(today))
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalCustomers = data.users.filter(u => u.role === 'customer').length;
  const totalAgents = data.users.filter(u => u.role === 'agent').length;
  const pendingComplaints = data.complaints.filter(c => c.status === 'pending').length;
  
  res.json({
    success: true,
    stats: {
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      totalCustomers,
      totalAgents,
      pendingComplaints
    }
  });
});

// Get restaurant info
app.get('/api/info', (req, res) => {
  const owner = data.users.find(u => u.role === 'owner');
  res.json({ 
    phone: owner?.phone || '+919876543210', 
    name: owner?.name || 'Payal Biryani',
    email: owner?.email || 'info@payalbiryani.com'
  });
});

// ==================== PAGE ROUTES ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

app.get('/agent', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.listen(PORT, () => {
  console.log(`\n🍚 Payal Biryani App running at http://localhost:${PORT}\n`);
  console.log('Login Credentials:');
  console.log('  Owner: username: owner, password: owner123');
  console.log('  Agent: username: agent1, password: agent123');
  console.log('  Customer: Use Google Sign-In, Phone OTP, or Email registration');
  console.log('');
});
