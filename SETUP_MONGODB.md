# MongoDB Atlas Setup Guide

## Option 1: Use MongoDB Atlas (Recommended - Free Cloud Database)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email
3. Verify your email

### Step 2: Create Free Cluster
1. After login, click "Create a Cluster"
2. Select "Free" tier (M0)
3. Choose your preferred region (closest to you)
4. Click "Create Cluster" (may take 1-2 minutes)

### Step 3: Create Database User
1. Click "Database Access" in left menu
2. Click "Add New Database User"
3. Create username/password (remember these!)
   - Username: `payalbiryani`
   - Password: `PayalBiryani@2024`
4. Click "Add User"

### Step 4: Configure Network Access
1. Click "Network Access" in left menu
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5: Get Connection String
1. Click "Database" in left menu
2. Click "Connect" on your cluster
3. Select "Drivers"
4. Copy the connection string:
```
mongodb+srv://payalbiryani:PayalBiryani@2024@payal-biryani.xxxxx.mongodb.net/payal_biryani?retryWrites=true&w=majority
```

---

## Option 2: Use MongoDB Community Server (Local Installation)

### Windows Installation
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Create data directory:
   
```
   md C:\data\db
   
```
4. Start MongoDB:
   
```
   "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
   
```

---

## Quick Setup (For Immediate Use)

### If using MongoDB Atlas:
Copy the connection string you got from Step 5 above

### If using local MongoDB:
```
mongodb://localhost:27017/payal_biryani
```

---

## Update Your .env File

Create a `.env` file in the project root with:

```
# Server
PORT=3000
NODE_ENV=production

# Database - REPLACE with your MongoDB Atlas connection string
DATABASE_URL=mongodb+srv://payalbiryani:PayalBiryani@2024@payal-biryani.xxxxx.mongodb.net/payal_biryani?retryWrites=true&w=majority

# Session Secret - Generate a random string
SESSION_SECRET=payal-biryani-super-secret-key-12345

# Restaurant Info
RESTAURANT_NAME=Payal Biryani
RESTAURANT_PHONE=+919876543210
RESTAURANT_EMAIL=info@payalbiryani.com

# Security
BCRYPT_ROUNDS=10
```

---

## Run with MongoDB

```
bash
# Install production dependencies
npm install

# Run production server (uses MongoDB)
npm run production
```

---

## Troubleshooting

### Connection Error
- Check your network access settings in MongoDB Atlas
- Make sure IP is allowed (0.0.0.0/0)

### Authentication Error
- Verify username and password in connection string
- Check Database Access in Atlas dashboard

### Port Already in Use
- Change PORT in .env to 3001 or another number
