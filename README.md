# Payal Biryani - Restaurant Ordering System

A complete online ordering system for Payal Biryani restaurant in Bhubaneswar.

## Features

### Customer Website
- Browse menu with Veg/Non-Veg filters
- Add items to cart
- Checkout with multiple payment options (COD, UPI, Card, Wallet)
- Track order by Order ID
- Contact info and location

### Owner Dashboard
- View all orders
- Update order status
- Manage menu items (add/edit/delete)
- Toggle item availability
- View statistics

### Delivery Agent Portal
- View available orders
- Accept orders
- Update delivery status
- Mark as undeliverable with reasons

## Login Credentials

- **Owner**: username: `owner`, password: `owner123`
- **Agent**: username: `agent1`, password: `agent123`

## How to Deploy on Glitch.com (Free)

1. Go to [glitch.com](https://glitch.com) and sign up
2. Click "New Project" → "Import from GitHub" (or paste code manually)
3. If importing manually:
   - Create a new project
   - Copy all files: package.json, server.js, and the public folder
   - Create each file in Glitch's editor
4. The app will auto-deploy and give you a URL like `your-project.glitch.me`

## Local Development

```
bash
npm install
npm start
```

Visit http://localhost:3000

## File Structure

```
├── package.json      # Dependencies
├── server.js         # Backend API
├── data.json         # Data storage (auto-created)
├── public/
│   ├── index.html    # Customer website
│   ├── login.html    # Login page
│   ├── owner.html    # Owner dashboard
│   └── agent.html    # Delivery agent portal
└── README.md
