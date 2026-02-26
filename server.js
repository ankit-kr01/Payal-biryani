const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = 'data.json';

// Initialize data file
let data = {
  users: [],
  menu_items: [],
  orders: []
};

// Load existing data or create defaults
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.log('Error loading data, using defaults');
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize default data if empty
if (data.users.length === 0) {
  data.users = [
    { id: 1, username: 'owner', password: bcrypt.hashSync('owner123', 10), role: 'owner', name: 'Restaurant Owner', phone: '+91 98765 43210' },
    { id: 2, username: 'agent1', password: bcrypt.hashSync('agent123', 10), role: 'agent', name: 'Delivery Agent 1', phone: '9876543210' },
    { id: 3, username: 'agent2', password: bcrypt.hashSync('agent123', 10), role: 'agent', name: 'Delivery Agent 2', phone: '9876543211' }
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

// API Routes

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = data.users.find(u => u.username === username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }
  
  req.session.user = { id: user.id, username: user.username, role: user.role, name: user.name };
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
      return { ...o, agent_name: agent ? agent.name : null };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// Get delivery agent orders
app.get('/api/agent/orders', requireAuth, requireRole(['agent']), (req, res) => {
  const orders = data.orders
    .filter(o => o.delivery_agent_id === req.session.user.id || (!o.delivery_agent_id && o.order_status === 'accepted'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// Accept order (agent)
app.post('/api/agent/accept/:id', requireAuth, requireRole(['agent']), (req, res) => {
  const idx = data.orders.findIndex(o => o.id == req.params.id);
  if (idx !== -1) {
    data.orders[idx].delivery_agent_id = req.session.user.id;
    data.orders[idx].order_status = 'accepted';
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
    saveData();
  }
  res.json({ success: true });
});

// Place order (customer)
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_address, items, total_amount, payment_method } = req.body;
  const newOrder = {
    id: Date.now(),
    customer_name,
    customer_phone,
    customer_address,
    items,
    total_amount,
    payment_method,
    payment_status: 'pending',
    order_status: 'pending',
    delivery_agent_id: null,
    status_note: '',
    created_at: new Date().toISOString()
  };
  data.orders.push(newOrder);
  saveData();
  res.json({ success: true, order_id: newOrder.id });
});

// Track order (customer)
app.get('/api/track/:id', (req, res) => {
  const order = data.orders.find(o => o.id == req.params.id);
  res.json(order || null);
});

// Get restaurant info
app.get('/api/info', (req, res) => {
  const owner = data.users.find(u => u.role === 'owner');
  res.json({ phone: owner?.phone || '+91 98765 43210', name: owner?.name || 'Payal Biryani' });
});

// Serve frontend
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

app.listen(PORT, () => {
  console.log(`\n🍚 Payal Biryani App running at http://localhost:${PORT}\n`);
  console.log('Login Credentials:');
  console.log('  Owner: username: owner, password: owner123');
  console.log('  Agent: username: agent1, password: agent123');
  console.log('');
});
