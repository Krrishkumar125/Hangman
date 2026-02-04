# Hangman Multiplayer Backend

A real-time multiplayer Hangman game backend built with Node.js, Express, and Socket.IO.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.IO
- **Authentication:** JWT + bcryptjs
- **Validation:** express-validator
- **Logging:** Winston
- **External APIs:** Dictionary API for word validation, Random Word API for word generation

## Project Structure

```md
src/
├── config/ # Database, socket, and server configuration
├── controllers/ # Route handlers (auth, room, game)
├── middlewares/ # Auth protection, validation, error handling
├── models/ # MongoDB schemas (User, Room, Game)
├── routes/ # API route definitions
├── services/ # Business logic (room, game, word services)
├── socket/handlers/ # WebSocket event handlers
└── utils/ # Logger and response helpers
```

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repo-url>
   cd Hangman-Backend
   npm install
   ```

2. **Create `.env.example` file**

   ```env
   PORT=8080
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hangman
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=10
   DICTIONARY_API_URL=https://api.dictionaryapi.dev/api/v2/entries/en
   RANDOM_WORD_API_URL=https://random-word-api.herokuapp.com/word
   MAX_PLAYERS_PER_ROOM=6
   MAX_INCORRECT_GUESSES=6
   ```

3. **Start MongoDB** (make sure it's running locally)

4. **Run the server**

```bash
   npm run dev    # development with auto-reload
   npm start      # production
```

## API Endpoints

### Authentication

| Method | Endpoint             | Description         | Auth |
| ------ | -------------------- | ------------------- | ---- |
| POST   | `/api/auth/register` | Create new user     | No   |
| POST   | `/api/auth/login`    | Login and get token | No   |

**Register/Login Body:**

```json
{
  "username": "player1",
  "password": "password123"
}
```

### Rooms

| Method | Endpoint                 | Description        | Auth |
| ------ | ------------------------ | ------------------ | ---- |
| POST   | `/api/room/create`       | Create a new room  | Yes  |
| POST   | `/api/room/join/:roomId` | Join existing room | Yes  |
| POST   | `/api/room/leave`        | Leave current room | Yes  |
| GET    | `/api/room/:roomId`      | Get room info      | Yes  |

**Create Room Body (optional):**

```json
{
  "maxPlayers": 6,
  "password": "roompass"
}
```

### Game

| Method | Endpoint            | Description             | Auth |
| ------ | ------------------- | ----------------------- | ---- |
| GET    | `/api/game/history` | Get user's game history | Yes  |

**Note:** Use `Authorization: Bearer <token>` header for protected routes.

## WebSocket Events

Connect to Socket.IO with auth token:

```javascript
const socket = io("http://localhost:8080", {
  auth: { token: "your_jwt_token" },
});
```

### Client → Server Events

| Event            | Payload      | Description            |
| ---------------- | ------------ | ---------------------- |
| `room:connect`   | `{ roomId }` | Connect socket to room |
| `room:leave`     | -            | Leave current room     |
| `game:start`     | -            | Start game (host only) |
| `game:guess`     | `{ letter }` | Guess a letter         |
| `game:get-state` | -            | Get current game state |

### Server → Client Events

| Event                 | Description                  |
| --------------------- | ---------------------------- |
| `player:joined`       | Player joined the room       |
| `player:left`         | Player left the room         |
| `player:connected`    | Player's socket connected    |
| `player:disconnected` | Player's socket disconnected |
| `host:transferred`    | New host assigned            |
| `game:started`        | Game has started             |
| `game:guess-result`   | Result of a guess            |
| `game:ended`          | Game finished                |
| `game:state`          | Current game state           |
| `error`               | Error message                |

## How the Game Works

1. **Create/Join Room:** One player creates a room and shares the room ID. Others join using the ID.

2. **Start Game:** The host starts the game. System picks a random word from an external API (validated against dictionary).

3. **Word Master:** Each round, one player becomes the "word master" who knows the word but can't guess. This role rotates.

4. **Guessing:** Other players take turns guessing one letter at a time. The turn cycles through players (skipping the word master).

5. **Win/Lose:**
   - Win: All letters guessed before running out of tries
   - Lose: Too many incorrect guesses (default: 6)

6. **Scoring:** Winner gets points based on remaining guesses. Scores persist across rounds.

## Design Decisions

**Why Socket.IO over plain WebSockets?**
Socket.IO handles reconnection, room management, and broadcasting out of the box. Less code to write and maintain.

**Why in-memory room state + MongoDB?**
Active game state lives in memory for speed. Completed games get saved to MongoDB for history. Rooms auto-expire after 24 hours.

**Why external word API with dictionary validation?**
Random words can sometimes be obscure or invalid. The dictionary API confirms the word is real and guessable.

**Why JWT for both REST and WebSocket?**
Keeps authentication consistent. Socket connections validate the same token used for API calls.

**Centralized config file?**
All environment variables go through `server.config.js`. No `process.env` scattered across the codebase. Easier to manage and test.

## Scalability Strategy

Let's be honest - right now this runs on a single server. That's fine for an assignment, but here's what I'd change for production.

### What We Have Now (Single Server)

- **Handles:** Around 500 concurrent games, maybe 3000 connected users
- **State:** Everything lives in a JavaScript Map (`activeRooms`)
- **Database:** One MongoDB instance
- **Process:** Single Node.js process

The obvious bottleneck? That in-memory Map. Can't share it across servers.

### Scaling to 10,000+ Users

Two things need to change:

**1. Move state to Redis**

Right now rooms live in memory. For multiple servers, Redis becomes the shared brain:

```javascript
// Instead of: const activeRooms = new Map();
const redis = require("redis");
const client = redis.createClient();

await client.hSet("rooms", roomId, JSON.stringify(roomData));
```

**2. Socket.IO Redis Adapter**

This lets sockets on different servers talk to each other:

```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Security

### What's Already In Place

- **Passwords:** bcrypt with 10 salt rounds. No plaintext anywhere.
- **Auth tokens:** JWT with 7-day expiry
- **Socket auth:** Middleware checks JWT before allowing connection
- **Input validation:** express-validator on all routes
- **Query safety:** Mongoose handles MongoDB injection risks
- **Error messages:** Generic "Invalid credentials" - doesn't reveal if username exists

### What's Missing (and I know it)

| Gap                | Why It Matters                      | What I'd Add                                 |
| ------------------ | ----------------------------------- | -------------------------------------------- |
| No rate limiting   | Someone could brute-force passwords | `express-rate-limit` - 5 attempts per 15 min |
| No HTTPS           | Tokens sent in plain text           | nginx reverse proxy with Let's Encrypt       |
| JWT secret in .env | If repo leaks, tokens can be forged | AWS Secrets Manager                          |
| No refresh tokens  | Can't revoke compromised sessions   | Token rotation pattern                       |
| CORS set to `*`    | Any site can make requests          | Whitelist actual frontend domain             |
| No XSS protection  | Usernames could contain scripts     | `xss-clean` middleware                       |

### Why Skip These?

Time. For an interview assignment, I focused on core functionality. In a real deployment, every item in that table would be addressed before going live.

## Known Limitations

Being upfront about what doesn't work perfectly.

### By Design (Trade-offs I Made)

**In-memory state isn't persistent**

- Server restart = all active games gone
- Why: Redis adds complexity for an MVP
- Fix: Would use Redis with persistence enabled

**No turn timer**

- Players can sit on their turn forever
- Why: Timer logic + disconnect handling + reconnect edge cases = scope creep
- Fix: 30-second countdown, auto-skip to next player

**Can't join mid-game**

- Room shows "game in progress" and blocks join
- Why: Syncing partial word state to new players is messy
- Future: Could add spectator mode instead

**One game at a time per room**

- Wait for current game to end before starting another
- Why: Avoids queue management complexity
- Future: Auto-start next round after 10 second delay

### Edge Cases That Are Fine

- **Everyone disconnects:** Room sticks around for 24 hours (MongoDB TTL cleans it up)
- **Word master leaves:** Game continues, word stays hidden
- **Word API is down:** Falls back to 18 hardcoded words
- **Two people join at once (1 slot left):** Atomic check prevents both getting in

### Out of Scope

Didn't implement these, not because I can't, but time:

- Automated tests (used Postman manually)
- Global leaderboard
- Paginated game history
- In-game chat
- Custom word lists

## Testing the Game

1. Register two users via `/api/auth/register`
2. Login both to get tokens
3. User 1: Create room via `/api/room/create`
4. User 2: Join room via `/api/room/join/:roomId`
5. Both connect sockets with their tokens
6. Both emit `room:connect` with the roomId
7. User 1 (host): Emit `game:start`
8. Take turns emitting `game:guess` with letters
9. Watch for `game:ended` event

You can use Postman for REST APIs and a Socket.IO client (like `socket.io-client` or Postman's WebSocket feature) for real-time events.

## Author

**Krrish Kumar**  
Backend Developer  
GitHub: [KrrishKumar125](https://github.com/KrrishKumar125)  
LinkedIn: [krrishkumar125](https://www.linkedin.com/in/krrishkumar125/)
