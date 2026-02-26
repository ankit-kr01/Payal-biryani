# Payal Biryani - Restaurant Ordering System

A complete online ordering system for Payal Biryani restaurant in Bhubaneswar.

## Features

### Customer Website
- Browse menu with Veg/Non-Veg filters
- Add items to cart
- Checkout with multiple payment options (COD, UPI, Card, Wallet)
- Track order by Order ID
- Contact info and location
- View order history
- Raise complaints
- Chat with owner and delivery agent

### Owner Dashboard
- View all orders
- Update order status (pending → received → preparing → cooked → out_for_delivery → delivered)
- Manage menu items (add/edit/delete)
- Toggle item availability
- View statistics
- Handle customer complaints
- Chat with customers and agents

### Delivery Agent Portal
- View available orders
- Accept orders
- Update delivery status
- Chat with customers and owner

## Login Credentials

- **Owner**: username: `owner`, password: `owner123`
- **Agent**: username: `agent1`, password: `agent123`
- **Customer**: Use Google Sign-In, Phone OTP, or Email registration

## Installation & Setup

### Prerequisites
- Node.js 14+
- npm or yarn

### Development Setup
```
bash
# Install dependencies
npm install

# Start development server
npm start
```

Visit http://localhost:3000

### Production Setup

#### Option 1: Using JSON File (Simple)
```
bash
npm install
npm start
```

#### Option 2: Using MongoDB (Recommended for Production)
1. Install MongoDB locally or use MongoDB Atlas
2. Copy `.env.example` to `.env` and configure:
```
env
DATABASE_URL=mongodb://localhost:27017/payal_biryani
SESSION_SECRET=your-secret-key
NODE_ENV=production
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

3. Install production dependencies:
```
bash
npm run install:prod
```

4. Run production server:
```
bash
npm run production
```

## Deployment

### Deploy to Render.com
1. Create a Render account
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy with the following settings:
   - Build Command: `npm install`
   - Start Command: `npm run production` (for MongoDB) or `npm start` (for JSON)

### Deploy to Heroku
1. Create Heroku app
2. Configure environment variables
3. Push to Heroku:
```
bash
heroku create payal-biryani
git push heroku main
```

### Deploy to Glitch.com
1. Go to glitch.com and create new project
2. Import from GitHub
3. Configure environment variables in .env

## API Documentation

### Authentication
- `POST /api/login` - Username/password login
- `POST /api/auth/google` - Google Sign-In
- `POST /api/auth/phone/send-otp` - Send OTP to phone
- `POST /api/auth/phone/verify` - Verify OTP and login
- `POST /api/auth/register` - Email registration
- `POST /api/logout` - Logout
- `GET /api/user` - Get current user

### Orders
- `GET /api/menu` - Get menu items (public)
- `POST /api/orders` - Place order
- `GET /api/track/:id` - Track order

### Customer
- `GET /api/customer/orders` - Get order history
- `GET /api/customer/profile` - Get profile
- `PUT /api/customer/profile` - Update profile
- `POST /api/customer/complaint` - Raise complaint

### Owner (Admin)
- `GET /api/admin/orders` - Get all orders
- `POST /api/admin/order/:id/status` - Update order status
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/complaints` - Get all complaints

### Agent
- `GET /api/agent/orders` - Get assigned orders
- `POST /api/agent/accept/:id` - Accept delivery

### Chat
- `GET /api/chat/:orderId` - Get chat messages
- `POST /api/chat/:orderId` - Send message

## File Structure

```
├── package.json          # Dependencies
├── server.js             # Development server (JSON file storage)
├── server_production.js  # Production server (MongoDB)
├── .env.example          # Environment variables template
├── Procfile              # For deployment
├── data.json             # Data storage (auto-created in dev)
├── public/
│   ├── index.html       # Customer website
│   ├── login.html       # Login page
│   ├── owner.html       # Owner dashboard
│   ├── agent.html       # Delivery agent portal
│   └── customer.html     # Customer dashboard
└── README.md
```

## Production Features

- **Security**: Helmet.js, rate limiting, secure cookies
- **Performance**: Compression, static file caching
- **Scalability**: MongoDB support
- **Notifications**: Email & SMS integration ready
- **Error Handling**: Comprehensive error handling

## License

MIT
