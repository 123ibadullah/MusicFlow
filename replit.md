# MusicFlow - Spotify-like Music Streaming Platform

## Overview
MusicFlow is a full-stack music streaming platform built with the MERN stack (MongoDB, Express, React, Node.js). It features real-time music playback, personalized recommendations, AI playlist generation, and live listening activity tracking via Socket.IO.

## Architecture

### Project Structure
- **`Backend/`** - Express.js API server (Node.js, ESM)
- **`MusicWebApp/`** - Main user-facing React application (Vite + TailwindCSS)
- **`admin/`** - Admin dashboard React application (Vite + TailwindCSS)

### Technologies
- **Frontend**: React 19, Vite 7, TailwindCSS, Axios, Socket.IO client
- **Backend**: Express 5, Socket.IO, Mongoose, JWT, bcryptjs, Multer
- **Database**: MongoDB (local via Nix, mongod runs on 127.0.0.1:27017)
- **Caching**: Redis (optional, disabled by default via `REDIS_ENABLED=false`)
- **Media**: Cloudinary (for audio/image uploads in production)

## Running the Project

### Workflows
1. **Backend** (`bash start-backend.sh`) - Starts MongoDB + Express API on port 8000
2. **Start application** (`cd MusicWebApp && npm run dev`) - Starts Vite dev server on port 5000 (webview)

### Environment Variables (set via Replit secrets/env)
- `PORT=8000` - Backend server port
- `MONGODB_URI=mongodb://127.0.0.1:27017/musicflow` - MongoDB connection
- `JWT_SECRET` - JWT signing secret
- `REDIS_ENABLED=false` - Disable Redis (no Redis server available)
- `NODE_ENV=development`
- `CORS_ORIGIN=*`
- `VITE_API_URL=http://localhost:8000` - Frontend API base URL

### Optional (for media uploads)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Key Files
- `Backend/server.js` - Express server entry point (loads env from `../.env`)
- `Backend/src/config/mongodb.js` - MongoDB connection
- `Backend/src/config/redis.js` - Redis connection (graceful fallback)
- `Backend/src/controllers/playlistController.js` - Playlist CRUD + AI generation
- `Backend/src/routes/playlistRouter.js` - Playlist routes (cleanup endpoint requires admin auth)
- `MusicWebApp/src/context/PlayerContext.jsx` - Music player state
- `MusicWebApp/src/context/AuthContext.jsx` - Authentication state (token key: `token`)
- `MusicWebApp/src/components/Sidebar.jsx` - Desktop sidebar navigation
- `MusicWebApp/src/components/MobileSidebar.jsx` - Mobile sidebar navigation
- `MusicWebApp/src/components/SongItem.jsx` - Song card component
- `start-backend.sh` - Startup script (MongoDB + backend)

## Code Quality Notes
- No debug artifacts: all `console.log` debug statements removed from frontend and backend controllers; only `console.error` for genuine errors remains
- No skeleton flash on play: `SongItem.jsx` plays immediately without a 500ms loading skeleton
- Auth uses `token` key in localStorage (not `auth_token`)
- All sidebar navigation items always visible (no data-count guards on mobile or desktop)
- `cleanupOldPlaylists` endpoint protected by `authenticateToken` + `authorizeAdmin` middleware

## Deployment
- Target: VM (always-on, WebSockets require persistent connection)
- Build: Compiles MusicWebApp to `Backend/client-dist/` for static serving
- Run: `bash start-backend.sh` (starts MongoDB + Express)
- Backend serves the built frontend on port 8000 in production
