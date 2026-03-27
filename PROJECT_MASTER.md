# PROJECT_MASTER.md — MusicFlow

---

## 1. Project Overview

**Name:** MusicFlow

**Short description:** MusicFlow is a full-stack music streaming web application built with the MERN stack. It lets users browse songs and albums, create playlists, like tracks, get personalized recommendations, and stream audio — all in real time. An admin dashboard lets administrators upload and manage the music library. A live listener counter shows how many users are actively listening at any given moment.

---

## 2. Problem Statement

Spotify, Apple Music, and similar platforms exist — but building one yourself forces you to deeply understand how audio streaming, real-time features, personalization engines, and production-grade APIs actually work under the hood.

The concrete problem: music students and hobbyist developers have no reference implementation they can fully read, understand, and explain. Most tutorials only cover fragments — login here, CRUD there. Nothing shows a complete, connected, working system.

MusicFlow was built to close that gap. It is a complete reference platform covering the full surface area of a modern streaming app: authentication, media uploads, a smart recommendation engine, real-time socket activity, Redis caching, and an admin workflow.

---

## 3. Solution

MusicFlow is a working Spotify-like streaming platform where:

- Users sign up, log in, and get their own personalized library
- Admins upload songs and albums (audio files and cover images go to Cloudinary)
- The audio player runs entirely in the browser using the HTML5 Audio API
- Recommendations are generated server-side by analysing what the user has played and liked
- Redis optionally caches expensive queries to reduce database load
- Socket.IO pushes a live count of active listeners to every connected client in real time

Every layer — database, API, frontend state, UI — is wired together into a coherent, end-to-end working system.

---

## 4. Features

**User-facing:**
- Sign up and log in with JWT-based authentication
- Browse all songs filtered by language, artist, duration, or popularity
- Browse albums and drill into any album to see its tracks
- Full audio player: play, pause, seek, volume, next, previous, shuffle, repeat
- Like and unlike songs; view your liked songs list
- Recently played history, auto-updated as you listen
- Personalized song recommendations based on your listening history
- Trending songs ranked by global play count
- Create, rename, and delete personal playlists
- Add or remove songs from any playlist
- AI-style playlist generation from a text prompt (keyword-based matching)
- Real-time "X users listening right now" counter
- Dark mode / light mode toggle
- Responsive design — works on desktop and mobile

**Admin-facing:**
- Dedicated admin dashboard (separate React app)
- Upload songs with audio file and cover image (stored in Cloudinary)
- Upload albums with cover image
- View song and album listings
- Role-based access control — admin routes are protected separately from user routes

---

## 5. Tech Stack (With Why)

### Frontend — React 19 + Vite
React was chosen because the music player requires a lot of shared state (current track, play status, volume, time, playlist queue) that needs to reach many different components at once. React's Context API handles this cleanly. Vite replaces Create React App for dramatically faster development server startup and hot reload.

### Styling — Tailwind CSS
Tailwind was chosen for speed. Writing utility classes directly in JSX avoids switching between files and keeps component styles co-located. Dark mode support is built into Tailwind's `dark:` prefix, making the theme toggle trivial to implement.

### State Management — React Context API
There are three global contexts: `PlayerContext` (music player state and all song/album/playlist data), `AuthContext` (user session), and `ThemeContext` (dark mode + toast notifications). Redux was not needed — the app state is not deeply nested or extremely complex, and Context avoids adding a dependency.

### Backend — Node.js + Express 5
Node.js is the natural choice for a media streaming API because it handles I/O non-blockingly, which matters when multiple users are hitting the server. Express 5 is minimal, unopinionated, and easy to structure into modular routes and controllers.

### Database — MongoDB + Mongoose
MongoDB fits a music app well because song and user data is naturally document-shaped. A user's liked songs, recently played history, and playlists are all arrays within one document — no complex joins needed. Mongoose adds schema validation and a clean query API on top.

### Authentication — JWT + bcryptjs
JSON Web Tokens let the app stay stateless on the server side. The server does not store sessions — it just issues a signed token at login, and the client sends it back on every request. bcryptjs handles password hashing before storage so plaintext passwords are never saved.

### Real-time — Socket.IO
Socket.IO handles the live listener count and "currently listening" feed. WebSockets are the right tool here because the server needs to push updates to all clients when the count changes, without clients polling every second.

### Media Storage — Cloudinary
Cloudinary is used for audio and image uploads. Storing binary files in MongoDB would balloon the database; Cloudinary offloads that entirely and provides a CDN URL that the browser can stream directly.

### Caching — Redis (optional)
Redis is used as an in-memory cache for expensive queries like the full song list, trending, and recommendations. It is optional — the app detects whether Redis is available and falls back to hitting MongoDB directly if not. This keeps the project runnable in environments without Redis.

---

## 6. Complete End-to-End Working Flow

### Example: user plays a song

1. **User opens the app** — React mounts. `AuthContext` checks `localStorage` for a saved JWT token. If found, it validates the token against the backend and sets the `user` object and `isAuthenticated = true`.

2. **Data loads** — `PlayerContext` fires on mount and calls three backend endpoints: `GET /api/song/list`, `GET /api/album/list`, and `GET /api/playlist/user-playlists`. Responses populate `songsData`, `albumsData`, and `playlists` in the global context. Every component that needs this data reads it from context — no prop drilling.

3. **User clicks play on a song card** — `SongItem` calls `playWithId(songId, queue)` from `PlayerContext`. The context finds the song object in `songsData`, sets it as the active `track`, stores the queue as `currentPlaylist`, and sets the `src` attribute of a shared hidden `<audio>` element.

4. **Audio loads and plays** — The context listens for the browser's `canplay` event on that audio element. Once fired, it calls `audio.play()`, sets `playStatus = true`, and the player bar at the bottom of the page renders the track info and starts animating the progress bar.

5. **Progress tracking** — An `onTimeUpdate` listener on the audio element fires continuously. It reads `audioRef.current.currentTime` and `audioRef.current.duration`, updates the `time` state in context, and the seek bar moves accordingly.

6. **Backend is notified** — After 15 seconds of continuous playback, `PlayerContext` sends a `POST /api/song/play/:songId` request to increment the song's `playCount` in MongoDB. This throttle prevents count inflation from rapid skipping.

7. **Recently played is updated** — As soon as the song starts, `addToRecentlyPlayed(song)` is called. The front end adds the song to `recentlyPlayed` state instantly (optimistic update) and sends a `POST /api/song/recently-played` request to persist it in the user's MongoDB document.

8. **Live listener count updates** — When play starts, the frontend emits `user_started_listening` over the Socket.IO connection. The backend counts connected sockets in a `Set`, broadcasts the new total with a `users_listening` event, and the player bar shows "X users listening right now."

9. **User skips to next track** — `next()` is called. It reads `currentPlaylistIndex`, increments it (or picks a random index if shuffle is on), finds that song in `currentPlaylist`, updates `track`, loads the new `src`, and the whole flow repeats from step 4.

---

## 7. System Architecture

```
Browser (React SPA)
    │
    ├── AuthContext  →  JWT in localStorage
    ├── PlayerContext → audio element, songs/albums/playlists state
    └── ThemeContext  → dark mode, toasts
         │
         ▼ HTTP (Axios) + WebSocket (Socket.IO)
         │
Express API Server (Node.js, port 8000)
    │
    ├── /api/auth      →  authController
    ├── /api/song      →  songController + songService
    ├── /api/album     →  albumController
    ├── /api/playlist  →  playlistController
    └── /api/admin     →  adminController (protected by role)
         │
         ├── Redis (optional cache layer, TTL 10 min)
         │
         └── MongoDB (mongoose models)
                ├── User
                ├── Song
                ├── Album
                └── Playlist

Cloudinary (CDN)
    ← audio files and cover images stored and served from here
```

The frontend is a pure SPA — it talks to the backend only through HTTP and WebSocket. The backend is stateless: all session information lives in the JWT token the client sends. MongoDB is the source of truth. Redis sits in front of MongoDB for read-heavy queries.

---

## 8. Database Design

### User
```
name, email, password (bcrypt hash)
role: "user" | "admin"
likedSongs: [ref → Song]
recentlyPlayed: [{ song: ref → Song, playedAt: Date }]
isActive: Boolean (soft delete)
```
The `likedSongs` and `recentlyPlayed` are arrays stored directly in the user document. This means a single `findById` + `populate` gives everything needed for recommendations — no separate query required. The tradeoff is that these arrays can grow large, but for a typical music app user they stay manageable.

### Song
```
name, artist, album, language, genre
image: Cloudinary URL
file: Cloudinary audio URL
duration, playCount, likeCount
desc
```
`playCount` and `likeCount` are maintained as integers on the song document. Incrementing them with `$inc` is an atomic MongoDB operation — no race conditions even with concurrent requests.

### Album
```
name, desc
bgColor (hex — used for the background gradient in the UI)
image: Cloudinary URL
```
The `bgColor` field is a design choice: it lets the UI set a dynamic gradient behind the player that matches the album artwork, giving the app the Spotify-like coloured background effect.

### Playlist
```
name, description
user: ref → User
songs: [ref → Song]
isAIGenerated: Boolean
```
Playlists belong to one user and hold an ordered array of song references. The `isAIGenerated` flag marks playlists created by the prompt-based generator so the UI can display them differently.

---

## 9. API Design

### Auth
| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | /api/auth/register | Create account, return JWT |
| POST | /api/auth/login | Verify credentials, return JWT |
| GET | /api/auth/profile | Get logged-in user's profile |
| PUT | /api/auth/update-profile | Update name, email |
| PUT | /api/auth/change-password | Change password |
| DELETE | /api/auth/delete-account | Soft-delete account |

### Songs
| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | /api/song/list | List songs (filters: language, artist, duration, sort) |
| POST | /api/song/add | Admin: upload song with audio + image |
| POST | /api/song/like | Add song to liked songs |
| POST | /api/song/unlike | Remove song from liked songs |
| GET | /api/song/liked-songs | Get current user's liked songs |
| POST | /api/song/recently-played | Record a play in history |
| GET | /api/song/recently-played | Get current user's recent history |
| GET | /api/song/recommendations | Personalized song suggestions |
| GET | /api/song/trending | Top songs by play count |
| POST | /api/song/play/:songId | Increment play count |

### Albums
| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | /api/album/list | List all albums |
| POST | /api/album/add | Admin: create album |

### Playlists
| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | /api/playlist/create | Create a new playlist |
| GET | /api/playlist/user-playlists | Get current user's playlists |
| GET | /api/playlist/:id | Get a specific playlist |
| POST | /api/playlist/add-song | Add a song to a playlist |
| POST | /api/playlist/remove-song | Remove a song from a playlist |
| DELETE | /api/playlist/delete/:id | Delete a playlist |
| POST | /api/playlist/generate | Generate playlist from text prompt |
| DELETE | /api/playlist/cleanup-old | Admin: delete orphaned playlists |

All non-public endpoints require a `Bearer <token>` header. Admin-only endpoints additionally check `req.user.role === 'admin'`.

---

## 10. Core Logic Deep Dive

### Music Player

The player runs entirely off one hidden `<audio>` element whose reference lives in `PlayerContext`. When `playWithId(id, queue)` is called:

1. The song is found in `songsData` by ID
2. `track` state is updated (the player bar re-renders immediately with the new song name and artwork)
3. `audioRef.current.src` is set to the Cloudinary audio URL and `audio.load()` is called
4. A `canplay` event listener (registered with `{ once: true }` so it does not accumulate) fires when the browser has buffered enough to start
5. `audio.play()` is called inside that listener, and `playStatus` is set to `true`

The `{ once: true }` detail is important — without it, clicking next/previous rapidly would stack multiple `canplay` listeners, causing overlapping plays.

### Recommendation Logic

Located in `Backend/src/services/songService.js`:

1. Fetch the user's `recentlyPlayed` and `likedSongs` with `populate`
2. Extract all unique `language` and `artist` values from those songs
3. Query MongoDB for songs matching `{ $or: [{ language: ... }, { artist: ... }] }` while excluding songs the user already knows (interacted songs are in an `excludeIds` set)
4. Sort by `playCount DESC, createdAt DESC` — popular songs the user hasn't heard yet bubble up first
5. If fewer than 10 results are found, pad the list with globally trending songs

This is not machine learning — it is collaborative-style filtering done through simple query logic. It works well for a portfolio project and is explainable in an interview in under a minute.

### Trending Logic

Trending is a single sorted query: `Song.find({}).sort({ playCount: -1 }).limit(10)`. The `playCount` field is incremented atomically via `$inc` every time a user genuinely listens (past the 15-second mark). No complex algorithm needed — the most-played songs surface naturally.

### Playlist System

Playlists are owned by a user and store song references in an array. Operations:
- **Create:** A new `Playlist` document is inserted with `user: userId` and an empty `songs` array
- **Add song:** `findOne({ _id: playlistId, user: userId })` ensures ownership. The song ID is pushed only if it is not already present (checked with `.some()` before pushing)
- **Remove song:** The `songs` array is filtered with `.filter(s => s.toString() !== songId)`. If the array length doesn't change, the song was not in the playlist — a 404 is returned
- **AI generate:** Keywords are extracted from the user's prompt, matched against song names, artists, genres, and descriptions in MongoDB using a `$regex` query, and saved as a new playlist

### Like / Unlike System

Optimistic update pattern:
1. The frontend immediately updates `likedSongs` state (the heart icon fills/unfills instantly)
2. An API call is sent in the background (`POST /api/song/like` or `unlike`)
3. If the API call fails, the state is rolled back to what it was before — the user sees an error toast and the heart reverts

On the backend, `$addToSet` adds the song to the user's `likedSongs` without duplicating, and `$pull` removes it cleanly. The song's `likeCount` is incremented/decremented via `$inc` in the same operation.

### Recently Played System

When a song starts playing, `addToRecentlyPlayed(song)` fires immediately:
- Frontend: prepends the song to `recentlyPlayed` in state, trims the array to the 20 most recent, re-sorts by `playedAt`
- Backend: the user's `recentlyPlayed` array is updated with the song reference and current timestamp, trimmed to the last 50 entries

The 15-second threshold (used for play count) does not gate recently played — a song is considered "played" the moment the user starts it.

---

## 11. Performance & Optimization

### Redis Caching

Redis is used for the three most expensive reads:
- **Song list** — the full song catalogue, cached for 10 minutes
- **Trending** — cached for 60 seconds (short TTL because play counts change frequently)
- **Recommendations** — cached per user ID for 60 seconds

When an admin adds or removes a song, `cacheDel` is called for the song list key so the next request hits MongoDB fresh.

If Redis is unavailable (the `REDIS_ENABLED` env var is set to `false`), the cache utility no-ops silently and all requests go straight to MongoDB. This made local development much simpler.

### Query Efficiency

- `recentlyPlayed` is trimmed to 50 entries at write time so it never grows unbounded
- All `populate` calls specify only the fields needed, not the entire document
- The `playCount` increment uses MongoDB's `$inc` — a single atomic operation, not a read-then-write

### Frontend Rendering

- `useCallback` and `useMemo` are used throughout `PlayerContext` to prevent functions and derived values from being recreated on every render
- The seek bar uses a ref directly (`seekBg.current`) rather than state for the progress update, so the bar updates without triggering a React re-render cycle on every animation frame
- Song cards do not individually fetch data — they all read from the shared `songsData` in context, so there is exactly one network request for the full song list

---

## 12. Security

### JWT Authentication

The server signs tokens with a `JWT_SECRET` environment variable using `jsonwebtoken`. The token payload contains `{ userId, role }`. The `authMiddleware` verifies the signature on every protected request and attaches the decoded payload to `req.user`. If the token is missing, expired, or tampered with, a 401 is returned immediately.

### Password Hashing

Passwords are hashed with bcryptjs (salt rounds = 10) before being stored in MongoDB. The plaintext password is never saved anywhere. On login, `bcrypt.compare()` checks the candidate password against the stored hash.

### Admin Route Protection

Admin routes go through two middleware layers: `authenticateToken` (checks the JWT is valid) and then `authorizeAdmin` (checks `req.user.role === 'admin'`). A regular user with a valid token still cannot reach admin endpoints.

### Protected Frontend Routes

A `PrivateRoute` component in the React app checks `isAuthenticated` from `AuthContext`. If `false`, the user is redirected to `/login` before any protected page renders. The check is also run on app startup by attempting to validate the stored token against the backend.

### No Plaintext Secrets in Code

All secrets (`JWT_SECRET`, Cloudinary credentials, MongoDB URI) are loaded from environment variables. Nothing sensitive is hardcoded.

---

## 13. Edge Cases & Error Handling

**Backend is down:** Axios calls in `PlayerContext` and `AuthContext` are wrapped in `try/catch`. A toast notification fires with a user-friendly message. The app does not crash — it just shows empty states and disables features that need the server.

**Redis is down:** The `cache.js` utility checks `REDIS_ENABLED` before every operation and returns `null` on a cache miss. The controller then falls through to the MongoDB query. The user experience is unaffected, just slightly slower.

**Empty data:** The home page and all listing pages show placeholder text and a call-to-action button when collections are empty, rather than blank white space or an error.

**Song file missing:** If `audioRef.current.src` points to a broken URL, the browser fires an `error` event on the audio element. The player handles this by showing a toast and stopping playback cleanly rather than freezing.

**Duplicate song in playlist:** Checked server-side with `.some()` before pushing. The API still returns 200 and the updated playlist — the duplicate is just silently ignored.

**Concurrent likes:** Both the like and unlike endpoints use MongoDB's `$addToSet` and `$pull`, which are atomic. No race condition can cause a song to be liked twice or unliked when it was never liked.

**Rapid next/previous clicks:** Event listeners are registered with `{ once: true }` so only one `canplay` handler fires even if the user clicks rapidly. Each call to `next()` or `previous()` pauses the audio, resets `currentTime`, assigns a new `src`, and registers a fresh listener.

---

## 14. Limitations

- **No real audio files in demo:** The database starts empty. An admin must upload songs through the admin dashboard before the app shows any content. There is no seeded demo data.

- **No real-time playlist collaboration:** Two users cannot co-edit a playlist simultaneously. Playlists are strictly single-user.

- **No actual AI:** The "AI playlist generator" is keyword matching against song metadata — it is not a machine learning model. It works, but it is unsophisticated compared to real recommendation systems.

- **Single-server architecture:** The app runs on one server. There is no horizontal scaling, load balancing, or queue worker for background jobs. Fine for a portfolio project, not production-scale.

- **No audio transcoding or adaptive bitrate:** Songs are served directly from Cloudinary at whatever quality they were uploaded. There is no HLS or DASH streaming for adaptive quality.

- **Redis is optional and not persistent:** If the server restarts, all cached data is lost. This is fine because the cache is just a speed optimisation — MongoDB is the source of truth.

---

## 15. Tradeoffs

**Context API over Redux:** Redux would add boilerplate and a learning curve with no meaningful benefit at this app's scale. Context works fine for three isolated global states. The tradeoff is that large state updates in `PlayerContext` could cause unnecessary re-renders in distant components — mitigated with `useCallback` and `useMemo`.

**Redis optional:** Making Redis optional meant the app can run anywhere without a Redis install. The tradeoff is extra conditional logic in the cache utility and slightly less consistent performance depending on the environment.

**No ML for recommendations:** A real recommendation engine needs usage data from thousands of users and a training pipeline. Building one from scratch would take months and require a data science stack. The keyword/preference approach gives "good enough" results and is fully explainable in an interview.

**MongoDB over SQL:** A relational database like PostgreSQL would handle complex many-to-many queries (user–song–playlist relationships) more naturally at scale. MongoDB was chosen for developer speed and because the data shape (nested arrays of liked songs, recent plays) maps naturally to documents.

**Cloudinary over S3:** Cloudinary has a free tier and a simpler SDK for a student project. S3 would be cheaper at scale and more commonly seen in production, but it adds IAM setup complexity.

---

## 16. Challenges Faced

**HTML5 Audio and React state:** The biggest technical challenge was keeping the audio element and React state in sync. The audio element is a DOM object — it has its own internal state (paused, playing, buffering) that React does not know about. Solving this required listening to the audio element's events (`canplay`, `timeupdate`, `onplay`, `onpause`) and using those to update React state, rather than the other way around.

**Listener accumulation bug:** Early versions of `next()` and `previous()` registered a new `canplay` event listener every time they were called without removing the old one. Rapid skipping caused multiple handlers to stack up, resulting in songs playing on top of each other. The fix was `{ once: true }` and pausing + resetting the audio before assigning a new `src`.

**JWT token management across tabs:** If the user logged out in one tab, other open tabs still had the token in `localStorage` and continued making authenticated requests. Solved by listening to the `storage` event on `window`, which fires when `localStorage` changes in another tab, and clearing the auth state accordingly.

**Redis graceful fallback:** Getting Redis to fail silently without crashing the server required careful error handling in the cache utility — wrapping every Redis operation in a try/catch and returning `null` so the controller always has a known return value to work with.

**Cloudinary upload through the backend:** Audio files need to be uploaded to Cloudinary from the backend (not directly from the browser, to keep the API secret server-side). Multer buffers the file in memory, then streams it to Cloudinary. Managing this correctly without running out of memory or hitting Cloudinary's file-size limits required careful middleware configuration.

---

## 17. Future Improvements

- **Seed data script:** Add a script that populates the database with sample songs and albums so the app works immediately after setup, without manual admin uploads.

- **WebRTC / HLS streaming:** Replace direct Cloudinary URL streaming with HLS to support adaptive bitrate and offline caching.

- **Collaborative playlists:** Let users share a playlist with other users and edit it together in real time using Socket.IO.

- **Better recommendations:** Collect play events into a time-series store, compute item-item collaborative filtering offline, and serve pre-computed recommendations on demand.

- **Search autocomplete:** Add an Elasticsearch or Atlas Search layer for typo-tolerant, full-text search across songs, albums, and artists.

- **Horizontal scaling:** Move the Socket.IO adapter to Redis Pub/Sub so multiple backend instances can share WebSocket state.

- **End-to-end tests:** Add Playwright tests covering the critical paths: login → search → play song → add to playlist → logout.

- **Mobile app:** Convert the React web app to React Native (or wrap it in Expo) so users can stream on mobile with background audio support.

---

## 18. How to Run

### Prerequisites

- Node.js 18+
- MongoDB (local install or MongoDB Atlas)
- A `.env` file in the project root (see below)
- (Optional) Redis server and `REDIS_ENABLED=true`
- (Optional) Cloudinary account for media uploads

### Environment Variables (`.env` in project root)

```
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/musicflow
JWT_SECRET=your_secret_here
NODE_ENV=development
CORS_ORIGIN=*
REDIS_ENABLED=false
VITE_API_URL=http://localhost:8000

# Optional (for admin media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Start Backend

```bash
bash start-backend.sh
# Starts MongoDB + Express API on port 8000
```

### Start Frontend

```bash
cd MusicWebApp
npm install
npm run dev
# Vite dev server on port 5000
```

### Start Admin Dashboard (optional)

```bash
cd admin
npm install
npm run dev
```

Open `http://localhost:5000` in your browser. Log in or create an account. To add songs, use the admin dashboard — you need to create a user and manually set their `role` to `"admin"` in MongoDB, or register through the admin panel.

---

## 19. Interview Ready Section

---

### "Tell me about this project in 2 minutes."

> MusicFlow is a full-stack music streaming app — think a smaller-scale Spotify — built with MongoDB, Express, React, and Node.js. The idea was to build something that covers the full surface area of a real product: authentication, media uploads, a working audio player, personalised recommendations, and real-time features.
>
> On the backend there is a REST API with JWT authentication and role-based access control — regular users and admins have different permissions. Songs and images are uploaded to Cloudinary and served from there. MongoDB stores all the user data, song metadata, playlists, and listening history. Redis sits in front of MongoDB as an optional cache for expensive queries like the full song list and trending tracks.
>
> The frontend is a React single-page application using Context API for global state. The music player is the most technically interesting part — it wraps a single HTML5 audio element and keeps React state synchronised with the browser's own audio state through event listeners. There is also Socket.IO for a live listener count that updates in real time across all connected clients.
>
> The personalised recommendations work by looking at what the user has listened to and liked, extracting their preferred languages and artists, and querying for songs that match those preferences but which the user has not interacted with yet.
>
> Overall it was a project about connecting a lot of moving parts into a coherent system — and making sure each part fails gracefully when something goes wrong.

---

### "Why did you build this project?"

> I wanted to build something substantial enough to force me to solve real engineering problems, not just CRUD tutorials. A music streaming app touches authentication, file uploads, audio APIs, real-time features, caching, and personalisation all at once. I could not skip any layer — they all have to work together. That is what made it a good learning project.

---

### "Why MERN stack?"

> MongoDB fits well because user profiles with nested liked songs and recently played lists map naturally to documents. Express is lightweight and lets you structure the API exactly how you want. React's component model and Context API are a natural fit for the music player — a lot of components need to read and update the same playback state. Node.js is non-blocking, which matters when you have many users streaming concurrently. The whole stack is JavaScript, which keeps context-switching low.

---

### "What was the biggest challenge?"

> Keeping the HTML5 audio element in sync with React state. The audio element has its own internal lifecycle — it buffers, stalls, plays, pauses — completely outside of React's control. Getting React to reflect the true state of the player required listening to native browser events (`canplay`, `timeupdate`, `onplay`, `onpause`) and using those to drive state updates. There was also a subtle bug where rapid skipping stacked multiple event listeners and caused songs to play on top of each other. Fixing that with `{ once: true }` was a clean solution once I understood what was happening.

---

### "What did you learn?"

> A few things stand out. First, the importance of optimistic UI updates — updating the state before the server responds and rolling back on failure makes the app feel instant. Second, Redis as a caching layer and why graceful fallback matters — the app should work the same whether Redis is up or down, just potentially slower. Third, how real-time WebSockets integrate into a REST API architecture — they solve a different class of problem and the two approaches complement each other. And fourth, just how much work goes into a feature that seems simple from the outside, like a music player with skip and shuffle.

---

### "What would you improve if you had more time?"

> Three things. First, add a proper data seeding script so the app is usable immediately without manual admin uploads. Second, replace the keyword-based recommendation engine with a proper collaborative filtering model — I would need a dataset and an offline training pipeline, but the API interface would stay the same. Third, add end-to-end tests covering the critical user flows — right now all testing is manual, and that is the first thing that breaks down when the codebase grows.
