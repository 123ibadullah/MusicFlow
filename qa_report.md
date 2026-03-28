# Autonomous QA Test Report: MusicFlow

This report outlines critical bugs and vulnerabilities uncovered through a mix of simulated interactions, targeted backend boundary testing, codebase review, and concurrency analysis. 

---

## 🛑 Security & Backend Vulnerabilities

### 1. NoSQL Injection in Login Endpoint
- **Where Found:** Backend API (`/api/auth/login`) / `authController.js`
- **Severity:** **CRITICAL**
- **Steps to Reproduce:** Send a POST request with an object instead of a string: `{"email": {"$gt": ""}, "password": "any"}`. Since `req.body.email` isn't strictly typed as a string before querying MongoDB, this can bypass the email check and authenticate the first matched user if the password checks out, or leak user presence.
- **Suggested Fix:** Add input sanitization or enforce `typeof email === 'string'` in the auth controller before calling `User.findOne()`.

### 2. File Upload Form Crash (Missing Array Check)
- **Where Found:** Backend API (`/api/song/add`) / `songController.js`
- **Severity:** High
- **Steps to Reproduce:** Send the form without any files attached. The backend checks `if (!req.files || !req.files["image"])`. If `req.files["image"]` is empty, it's evaluated properly, but if an attacker sends an invalid array structure or large malformed payload without `multer`, it crashes.
- **Suggested Fix:** Ensure strict file existence checks and `body-parser` JSON limiters (`express.json({ limit: "10kb" })`).

---

## 📉 Database & Performance

### 3. In-Memory Big-O Collapse for Song Listing
- **Where Found:** `listSong` inside `songController.js` (Line 131)
- **Severity:** **CRITICAL**
- **Steps to Reproduce:** Accumulate 10,000+ songs in the Database. Hit the `/api/song/list?duration=short` endpoint.
- **Details:** The backend executes `await Song.find(filter).lean()` pulling the *entire database of songs* into Node's RAM. It then uses `.filter()` and `.sort()` on the JavaScript array. This will catastrophically crash the server (Out of Memory) under modest load.
- **Suggested Fix:** Offload sorting, pagination, and duration/popularity filtering directly entirely to MongoDB using the Aggregation Pipeline natively.

### 4. Race Condition: Desynced Song `likeCount` 
- **Where Found:** `likeSong` inside `songController.js` (Line 260)
- **Severity:** High
- **Steps to Reproduce:** Rapidly double-click or hammer the "Like" button in the UI for a song (or send concurrent POST requests).
- **Details:** The controller checks memory state `if (!user.likedSongs.includes(songId))` and then pushes to the array and increments `Song` play count. In concurrent execution, both requests evaluate `includes` to false, saving duplicate references and incrementing the `likeCount` globally by +2 instead of +1, permanently desyncing the data.
- **Suggested Fix:** Swap from memory modifications to atomic DB operations: `User.updateOne({ _id: userId }, { $addToSet: { likedSongs: songId } })`, then conditionally `$inc` the count only if `modifiedCount > 0`.

---

## ⚡ Real-Time (Socket.IO)

### 5. Inaccurate Listener Count Tracking
- **Where Found:** `server.js` (Lines 151-165)
- **Severity:** Medium
- **Steps to Reproduce:** Log in and start listening to music. Open the same app in 5 different browser tabs.
- **Details:** The Socket server logs `activeSockets.add(socket.id);` and broadcasts `activeSockets.size` to display "Total Users Listening". Because it blindly counts socket connections rather than unique user sessions, 1 user opening 5 tabs displays as 5 independent listeners globally.
- **Suggested Fix:** Pass the `userId` natively in the socket payload/auth, and use a `Set` matching `userId` rather than the fleeting `socket.id`.

### 6. Missing Disconnect Cleanup for Recently Played
- **Where Found:** `server.js` Socket disconnect logic / `addToRecentlyPlayed`
- **Severity:** Low
- **Details:** If an authenticated user drops connection while a song is playing, the `user_listening` event state is never explicitly rolled back for that specific song globally.
- **Suggested Fix:** Map `socket.id` to specific `userId`s and cleanly remove them from the "Currently Listening to X" live UI list when `disconnect` fires.

---

## 💻 Frontend UX Edge Cases (React)

### 7. Player Desync when Skipping Empty Playlists
- **Where Found:** `PlayerContext.jsx` 
- **Severity:** Medium
- **Steps to Reproduce:** Have an empty liked songs list, or filter for an artist with 0 songs. Attempt to click "Next" or "Previous".
- **Details:** The Context does not strictly boundary-check if `songs.length === 0` in all skip scenarios, allowing the player to fall into a locked unplayable blank state rather than gracefully disabling the next/prev buttons.
- **Suggested Fix:** Disable the player controls via CSS/boolean state if the queue/current playlist matrix is empty.
