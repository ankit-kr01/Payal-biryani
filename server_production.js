require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/payal_biryani';

// Initialize MongoDB
let db;
let usersCollection;
let menuItemsCollection;
let ordersCollection;
let chatsCollection;
let complaintsCollection;
let otpStoreCollection;

// Twilio setup
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

// Email transporter
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB default
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Connect to MongoDB
async function connectDB() {
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = client.db();
    usersCollection = db.collection('users');
    menuItemsCollection = db.collection('menu_items');
    ordersCollection = db.collection('orders');
    chatsCollection = db.collection('chats');
    complaintsCollection = db.collection('complaints');
    otpStoreCollection = db.collection('otp_store');

    console.log('✅ Connected to MongoDB');

    // Create indexes
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 });
    await usersCollection.createIndex({ phone: 1 });
    await usersCollection.createIndex({ google_id: 1 });
    await menuItemsCollection.createIndex({ category: 1, available: 1 });
    await ordersCollection.createIndex({ customer_id: 1, created_at: -1 });
    await ordersCollection.createIndex({ customer_phone: 1 });
    await chatsCollection.createIndex({ order_id: 1, created_at: -1 });
    await complaintsCollection.createIndex({ order_id: 1, created_at: -1 });

    // Initialize default data
    await initializeDefaultData();

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize default data
async function initializeDefaultData() {
  try {
    // Check if default users exist
    const userCount = await usersCollection.countDocuments();
    if (userCount === 0) {
      const defaultUsers = [
        {
          id: Date.now(),
          username: 'owner',
          password: await bcrypt.hash('owner123', parseInt(process.env.BCRYPT_ROUNDS) || 10),
          role: 'owner',
          name: process.env.RESTAURANT_NAME || 'Restaurant Owner',
          phone: process.env.RESTAURANT_PHONE || '+919876543210',
          email: process.env.RESTAURANT_EMAIL || 'owner@payalbiryani.com',
          auth_provider: 'email',
          created_at: new Date(),
          is_active: true
        },
        {
          id: Date.now() + 1,
          username: 'agent1',
          password: await bcrypt.hash('agent123', parseInt(process.env.BCRYPT_ROUNDS) || 10),
          role: 'agent',
          name: 'Delivery Agent 1',
          phone: '9876543210',
          email: 'agent1@payalbiryani.com',
          auth_provider: 'email',
          created_at: new Date(),
          is_active: true
        }
      ];

      await usersCollection.insertMany(defaultUsers);
      console.log('✅ Default users created');
    }

    // Check if menu items exist
    const menuCount = await menuItemsCollection.countDocuments();
    if (menuCount === 0) {
      const defaultMenuItems = [
        { id: Date.now(), name: 'Chicken Biryani', description: 'Aromatic basmati rice layered with tender chicken and rich spices', price: 220, category: 'nonveg', image: '', available: true, created_at: new Date() },
        { id: Date.now() + 1, name: 'Mutton Biryani', description: 'Premium mutton cooked with fragrant rice and authentic masala', price: 320, category: 'nonveg', image: '', available: true, created_at: new Date() },
        { id: Date.now() + 2, name: 'Egg Biryani', description: 'Perfectly boiled eggs layered with spiced basmati rice', price: 190, category: 'nonveg', image: '', available: true, created_at: new Date() },
        { id: Date.now() + 3, name: 'Chicken 65', description: 'Spicy, crispy fried chicken - a perfect starter', price: 180, category: 'nonveg', image: '', available: true, created_at: new Date() },
        { id: Date.now() + 4, name: 'Veg Biryani', description: 'Delicious mix of fresh vegetables with aromatic basmati rice', price: 180, category: 'veg', image: '', available: true, created_at: new Date() },
        { id: Date.now() + 5, name: 'Paneer Biryani', description: 'Soft paneer cubes layered with spiced rice', price: 200, category: 'veg', image: '', available: true, created_at: new Date() }
      ];

      await menuItemsCollection.insertMany(defaultMenuItems);
      console.log('✅ Default menu items created');
    }

  } catch (error) {
    console.error('❌ Error initializing default data:', error);
  }
}

// Utility functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(phone, otp) {
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: `Your Payal Biryani verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`📱 OTP sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('❌ Twilio error:', error.message);
      return false;
    }
  } else {
    console.log(`📱 OTP for ${phone}: ${otp} (Twilio not configured)`);
    return true;
  }
}

async function sendEmail(to, subject, html) {
  if (emailTransporter) {
    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      });
      console.log(`📧 Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Email error:', error.message);
      return false;
    }
  }
  return false;
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com"]
    }
  }
}));

app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(session({
  secret: process.env.SESSION_SECRET || 'payal-biryani-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Auth middleware
const requireAuth = async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const user = await usersCollection.findOne({ id: req.session.user.id, is_active: true });
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Login with username/password
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password required' });
    }

    const user = await usersCollection.findOne({ username, is_active: true });

    if (!user || !await bcrypt.compare(password, user.password)) {
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Google Sign-In
app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleToken, name, email, googleId } = req.body;

    console.log('Google Sign-In attempt:', { googleId, email, name });

    // Check if user exists with this Google ID
    let user = await usersCollection.findOne({ google_id: googleId, auth_provider: 'google', is_active: true });

    if (!user) {
      // Check if user exists with this email
      user = await usersCollection.findOne({ email, is_active: true });

      if (user) {
        // Link Google account to existing user
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { google_id: googleId, auth_provider: 'google' } }
        );
      } else {
        // Create new user
        user = {
          id: Date.now(),
          username: email.split('@')[0].toLowerCase() + '_' + Date.now().toString().slice(-4),
          name: name || email.split('@')[0],
          email,
          google_id: googleId,
          phone: '',
          role: 'customer',
          auth_provider: 'google',
          password: '',
          created_at: new Date(),
          is_active: true
        };
        await usersCollection.insertOne(user);
        console.log('✅ Created new Google user:', user.username);
      }
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
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Phone OTP - Send OTP
app.post('/api/auth/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    console.log('OTP request for phone:', phone);

    if (!phone || phone.length < 10) {
      return res.json({ success: false, message: 'Invalid phone number' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    await otpStoreCollection.updateOne(
      { phone },
      {
        $set: {
          otp,
          expiresAt,
          attempts: 0,
          created_at: new Date()
        }
      },
      { upsert: true }
    );

    // Send OTP
    const sent = await sendOTP(phone, otp);

    if (!sent) {
      return res.json({ success: false, message: 'Failed to send OTP' });
    }

    console.log('✅ OTP generated for:', phone);

    // Return OTP only in development
    res.json({
      success: true,
      message: 'OTP sent successfully',
      dev_otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Phone OTP - Verify OTP and Login/Signup
app.post('/api/auth/phone/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    console.log('OTP verify attempt for phone:', phone);

    if (!phone || !otp) {
      return res.json({ success: false, message: 'Phone number and OTP required' });
    }

    const otpData = await otpStoreCollection.findOne({ phone });

    if (!otpData) {
      return res.json({ success: false, message: 'OTP not requested. Please request OTP first.' });
    }

    if (new Date() > otpData.expiresAt) {
      await otpStoreCollection.deleteOne({ phone });
      return res.json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }

    if (otpData.attempts >= 3) {
      await otpStoreCollection.deleteOne({ phone });
      return res.json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
    }

    if (otpData.otp !== otp) {
      await otpStoreCollection.updateOne(
        { phone },
        { $inc: { attempts: 1 } }
      );
      return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified - Create or update user
    let user = await usersCollection.findOne({ phone, is_active: true });

    if (!user) {
      // Create new user
      user = {
        id: Date.now(),
        username: 'user_' + phone.slice(-4) + '_' + Date.now().toString().slice(-4),
        name: 'Customer',
        phone,
        email: '',
        google_id: '',
        role: 'customer',
        auth_provider: 'phone',
        password: '',
        created_at: new Date(),
        is_active: true
      };
      await usersCollection.insertOne(user);
      console.log('✅ Created new phone user:', user.username);
    }

    // Clean up OTP
    await otpStoreCollection.deleteOne({ phone });

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

    console.log('✅ Phone login success for user:', user.username);
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Customer registration (email/password)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, email, phone } = req.body;

    if (!username || !password || !name) {
      return res.json({ success: false, message: 'Username, password and name are required' });
    }

    // Check if username exists
    if (await usersCollection.findOne({ username, is_active: true })) {
      return res.json({ success: false, message: 'Username already exists' });
    }

    // Check if email exists
    if (email && await usersCollection.findOne({ email, is_active: true })) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    // Check if phone exists
    if (phone && await usersCollection.findOne({ phone, is_active: true })) {
      return res.json({ success: false, message: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
      name,
      email: email || '',
      phone: phone || '',
      google_id: '',
      role: 'customer',
      auth_provider: 'email',
      created_at: new Date(),
      is_active: true
    };

    await usersCollection.insertOne(newUser);

    console.log('✅ New user registered:', username);

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get current user
app.get('/api/user', (req, res) => {
  res.json({ user: req.session.user || null });
});

// ==================== ORDER ROUTES ====================

// Get menu items (public)
app.get('/api/menu', async (req, res) => {
  try {
    const items = await menuItemsCollection
      .find({ available: true })
      .sort({ category: 1, name: 1 })
      .toArray();
    res.json(items);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Place order (customer)
app.post('/api/orders', async (req, res) => {
  try {
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
      created_at: new Date(),
      status_history: [{
        status: 'pending',
        note: 'Order placed',
        updated_at: new Date(),
        updated_by: 'System'
      }]
    };

    await ordersCollection.insertOne(newOrder);

    console.log('✅ New order placed:', newOrder.id, 'by', customer_name);

    // Send email notification if configured
    if (emailTransporter) {
      const owner = await usersCollection.findOne({ role: 'owner', is_active: true });
      if (owner && owner.email) {
        await sendEmail(
          owner.email,
          'New Order Received - Payal Biryani',
          `<h2>New Order #${newOrder.id}</h2>
          <p><strong>Customer:</strong> ${customer_name}</p>
          <p><strong>Phone:</strong> ${customer_phone}</p>
          <p><strong>Address:</strong> ${customer_address}</p>
          <p><strong>Total:</strong> ₹${total_amount}</p>
          <p><strong>Items:</strong> ${items.map(item => `${item.name} x${item.quantity}`).join(', ')}</p>`
        );
      }
    }

    res.json({ success: true, order_id: newOrder.id, order: newOrder });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Track order (public)
app.get('/api/track/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await ordersCollection.findOne({ id: orderId });

    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    const agent = order.delivery_agent_id ? await usersCollection.findOne({ id: order.delivery_agent_id }) : null;

    res.json({
      success: true,
      order: {
        ...order,
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== CUSTOMER ROUTES ====================

// Get customer profile
app.get('/api/customer/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update customer profile
app.put('/api/customer/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    await usersCollection.updateOne(
      { id: req.user.id },
      { $set: updateData }
    );

    req.session.user = { ...req.session.user, ...updateData };

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get customer order history
app.get('/api/customer/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await ordersCollection
      .find({
        $or: [
          { customer_phone: req.user.phone },
          { customer_id: userId }
        ]
      })
      .sort({ created_at: -1 })
      .toArray();

    const ordersWithAgents = await Promise.all(orders.map(async (order) => {
      const agent = order.delivery_agent_id ? await usersCollection.findOne({ id: order.delivery_agent_id }) : null;
      const complaint = await complaintsCollection.findOne({ order_id: order.id });
      return {
        ...order,
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null,
        has_complaint: !!complaint,
        complaint_status: complaint ? complaint.status : null
      };
    }));

    res.json({ success: true, orders: ordersWithAgents });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== OWNER ROUTES ====================

// Get all orders (owner)
app.get('/api/admin/orders', requireAuth, requireRole(['owner']), async (req, res) => {
  try {
    const orders = await ordersCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const agent = order.delivery_agent_id ? await usersCollection.findOne({ id: order.delivery_agent_id }) : null;
      const complaint = await complaintsCollection.findOne({ order_id: order.id });
      return {
        ...order,
        agent_name: agent ? agent.name : null,
        agent_phone: agent ? agent.phone : null,
        has_complaint: !!complaint,
        complaint_status: complaint ? complaint.status : null
      };
    }));

    res.json(ordersWithDetails);
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update order status (owner)
app.post('/api/admin/order/:id/status', requireAuth, requireRole(['owner']), async (req, res) => {
  try {
    const { status, note } = req.body;
    const orderId = parseInt(req.params.id);

    const validStatuses = ['pending', 'received', 'preparing', 'cooked', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: 'Invalid status' });
    }

    const order = await ordersCollection.findOne({ id: orderId });
    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    const oldStatus = order.order_status;
    const statusHistory = order.status_history || [];
    statusHistory.push({
      status,
      note: note || '',
      updated_at: new Date(),
      updated_by: req.user.name
    });

    await ordersCollection.updateOne(
      { id: orderId },
      {
        $set: {
          order_status: status,
          status_note: note || '',
          status_updated_at: new Date(),
          status_history
        }
      }
    );

    console.log(`✅ Order ${orderId} status changed from ${oldStatus} to ${status}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get dashboard stats (owner)
app.get('/api/admin/stats', requireAuth, requireRole(['owner']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalOrders = await ordersCollection.countDocuments();
    const todayOrders = await ordersCollection.countDocuments({
      created_at: { $gte: new Date(today) }
    });
    const pendingOrders = await ordersCollection.countDocuments({
      order_status: { $in: ['pending', 'received'] }
    });

    const revenueResult = await ordersCollection.aggregate([
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]).toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const todayRevenueResult = await ordersCollection.aggregate([
      { $match: { created_at: { $gte: new Date(today) } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]).toArray();
    const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

    const totalCustomers = await usersCollection.countDocuments({ role: 'customer', is_active: true });
    const totalAgents = await usersCollection.countDocuments({ role: 'agent', is_active: true });
    const pendingComplaints = await complaintsCollection.countDocuments({ status: 'pending' });

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
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== AGENT ROUTES ====================

// Get delivery agent orders
app.get('/api/agent/orders', requireAuth, requireRole(['agent']), async (req, res) => {
  try {
    const orders = await ordersCollection
      .find({
        $or: [
          { delivery_agent_id: req.user.id },
          { delivery_agent_id: null, order_status: 'cooked' }
        ]
      })
      .sort({ created_at: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    console.error('Get agent orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept order (agent)
app.post('/api/agent/accept/:id', requireAuth, requireRole(['agent']), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const result = await ordersCollection.updateOne(
      { id: orderId, delivery_agent_id: null, order_status: 'cooked' },
      {
        $set: {
          delivery_agent_id: req.user.id,
          order_status: 'out_for_delivery',
          status_updated_at: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.json({ success: false, message: 'Order not available or already taken' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== COMPLAINT ROUTES ====================

// Raise complaint
app.post('/api/customer/complaint', requireAuth, async (req, res) => {
  try {
    const { order_id, subject, message } = req.body;

    if (!order_id || !subject || !message) {
      return res.json({ success: false, message: 'Order ID, subject and message are required' });
    }

    // Verify order belongs to user
    const order = await ordersCollection.findOne({
      id: parseInt(order_id),
      $or: [
        { customer_phone: req.user.phone },
        { customer_id: req.user.id }
      ]
    });

    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    const complaint = {
      id: Date.now(),
      order_id: parseInt(order_id),
      customer_id: req.user.id,
      customer_name: req.user.name,
      customer_phone: req.user.phone,
      subject,
      message,
      status: 'pending',
      created_at: new Date(),
      response: ''
    };

    await complaintsCollection.insertOne(complaint);

    res.json({ success: true, message: 'Complaint submitted successfully', complaint_id: complaint.id });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all complaints (owner)
app.get('/api/admin/complaints', requireAuth, requireRole(['owner']), async (req, res) => {
  try {
    const complaints = await complaintsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    const complaintsWithOrders = await Promise.all(complaints.map(async (complaint) => {
      const order = await ordersCollection.findOne({ id: complaint.order_id });
      return { ...complaint, order };
    }));

    res.json(complaintsWithOrders);
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Respond to complaint (owner)
app.post('/api/admin/complaint/:id/respond', requireAuth, requireRole(['owner']), async (req, res) => {
  try {
    const { response } = req.body;
    const complaintId = parseInt(req.params.id);

    await complaintsCollection.updateOne(
      { id: complaintId },
      {
        $set: {
          response,
          status: 'resolved',
          responded_at: new Date(),
          responded_by: req.user.name
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Respond to complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== CHAT ROUTES ====================

// Get chat messages
app.get('/api/chat/:orderId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);

    // Verify user has access to this order
    const order = await ordersCollection.findOne({ id: orderId });
    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    const messages = await chatsCollection
      .find({ order_id: orderId })
      .sort({ created_at: 1 })
      .toArray();

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send chat message
app.post('/api/chat/:orderId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { message, to_role } = req.body;

    if (!message) {
      return res.json({ success: false, message: 'Message is required' });
    }

    // Verify order exists
    const order = await ordersCollection.findOne({ id: orderId });
    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    // Determine who can chat with whom
    let canSend = false;
    if (req.user.role === 'customer') {
      canSend = order.customer_phone === req.user.phone || order.customer_id === req.user.id;
    } else if (req.user.role === 'owner') {
      canSend = true; // Owner can chat on any order
    } else if (req.user.role === 'agent') {
      canSend = order.delivery_agent_id === req.user.id;
    }

    if (!canSend) {
      return res.json({ success: false, message: 'You cannot chat on this order' });
    }

    const chat = {
      id: Date.now(),
      order_id: orderId,
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      message,
      to_role: to_role || 'all',
      created_at: new Date(),
      read: false
    };

    await chatsCollection.insertOne(chat);

    res.json({ success: true, message: 'Message sent', chat });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
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

// Get restaurant info
app.get('/api/info', async (req, res) => {
  try {
    const owner = await usersCollection.findOne({ role: 'owner', is_active: true });
    res.json({
      phone: owner?.phone || process.env.RESTAURANT_PHONE || '+919876543210',
      name: owner?.name || process.env.RESTAURANT_NAME || 'Payal Biryani',
      email: owner?.email || process.env.RESTAURANT_EMAIL || 'info@payalbiryani.com'
    });
  } catch (error) {
    console.error('Get info error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🍚 Payal Biryani Production Server running at http://localhost:${PORT}\n`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database:', process.env.DATABASE_URL ? 'MongoDB' : 'Local JSON');
    console.log('SMS Service:', process.env.TWILIO_ACCOUNT_SID ? 'Twilio' : 'Disabled');
    console.log('Email Service:', process.env.EMAIL_USER ? 'Enabled' : 'Disabled');
    console.log('\nLogin Credentials:');
    console.log('  Owner: username: owner, password: owner123');
    console.log('  Agent: username: agent1, password: agent123');
    console.log('  Customer: Use Google Sign-In, Phone OTP, or Email registration');
    console.log('');
  });
}

startServer().catch(console.error);
