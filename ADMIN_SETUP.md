# Admin Panel Setup Guide

## Overview
The admin panel is now protected with role-based authentication. Only users with the `admin` role can access the admin panel.

## Setting Up an Admin User

### Method 1: Through MongoDB (Direct Database Update)

1. Start your MongoDB server
2. Open MongoDB Compass or use the MongoDB shell
3. Connect to your database (usually `musicflow`)
4. Go to the `users` collection
5. Find the user you want to make admin
6. Click "Edit Document" and add the field:
   ```json
   "role": "admin"
   ```
7. Save the document

### Method 2: Through Code (One-Time Setup)

You can create a temporary script to set a user as admin:

1. Create a file `Backend/scripts/setAdmin.js`:
```javascript
import mongoose from 'mongoose';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const setAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Replace with the email of the user you want to make admin
    const email = 'your-admin-email@example.com';
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }
    
    user.role = 'admin';
    await user.save();
    
    console.log(`User ${email} is now an admin!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

setAdminUser();
```

2. Run the script:
```bash
cd Backend
node scripts/setAdmin.js
```

### Method 3: During Registration (Development Only)

For development purposes, you can modify the registration logic to automatically set the first user as admin. Add this to `Backend/src/controllers/authController.js` in the `registerUser` function:

```javascript
// Add after user creation
const userCount = await User.countDocuments();
if (userCount === 1) {
  // Make first user admin
  user.role = 'admin';
  await user.save();
}
```

## Accessing the Admin Panel

1. Navigate to the admin panel URL (usually `http://localhost:5173` or your admin frontend URL)
2. You will be redirected to the login page
3. Enter your **admin user** credentials
4. After successful login, you'll have access to:
   - Add/Remove Songs
   - Add/Remove Albums
   - View all data

## Security Features

- **Role-based Access Control**: Only users with `role: 'admin'` can access admin routes
- **Protected Backend Routes**: All add/remove operations require admin authentication
- **Token-based Authentication**: JWT tokens are used for secure authentication
- **Auto-redirect**: Non-admin users are automatically redirected to the login page

## Troubleshooting

### "Access denied" Error
- Make sure your user has the `role: 'admin'` field in the database
- Clear browser localStorage and try logging in again

### Can't See Admin Panel
- Check that you're accessing the correct URL (admin frontend, not main app)
- Verify your token is stored in localStorage as `auth_token`

### Backend Auth Errors
- Make sure the `JWT_SECRET` in your `.env` file matches across all applications
- Check that the Authorization header is being sent with requests

## Creating Multiple Admins

You can create multiple admin users by repeating Method 1 or Method 2 for different email addresses.

## Notes

- Admin users can still access the main music app as regular users
- The main app doesn't use role-based restrictions (all authenticated users can like songs, create playlists, etc.)
- Regular users cannot access admin routes even if they try to navigate there directly

