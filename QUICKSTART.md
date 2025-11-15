# WebX403 Quick Start

**From zero to wallet-authenticated API in 5 minutes.**

---

## Prerequisites

- Node.js 18+ or Python 3.8+
- A Solana wallet (Phantom recommended)
- 5 minutes of your time

---

## Step 1: Choose Your Stack

<details>
<summary><strong>🟢 Node.js + Express</strong></summary>

### Create New Project

```bash
mkdir my-protected-api
cd my-protected-api
npm init -y
npm install express webx403-server
```

### Create `server.js`

```javascript
const express = require('express');
const { createWebX403, inMemoryLRU } = require('webx403-server');

const app = express();

// Configure WebX403
const auth = createWebX403({
  issuer: 'my-app',
  audience: 'http://localhost:3000',
  replayStore: inMemoryLRU()
});

// Protect all routes
app.use(auth.middleware());

// Your first protected endpoint
app.get('/hello', (req, res) => {
  res.json({
    message: `Hello, ${req.webx403User.address}!`,
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
});
```

### Run It

```bash
node server.js
```

**Done!** Your API now requires wallet authentication.

</details>

<details>
<summary><strong>🐍 Python + FastAPI</strong></summary>

### Create New Project

```bash
mkdir my-protected-api
cd my-protected-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn webx403
```

### Create `main.py`

```python
from fastapi import FastAPI, Depends
from webx403 import WebX403Middleware, require_webx403_user

app = FastAPI(title="My Protected API")

# Add WebX403 middleware
app.add_middleware(
    WebX403Middleware,
    audience="http://localhost:8000",
    issuer="my-app",
    ttl_seconds=60,
    replay_backend="memory"
)

# Your first protected endpoint
@app.get("/hello")
async def hello(user = Depends(require_webx403_user)):
    return {
        "message": f"Hello, {user.address}!",
        "wallet": user.address
    }
```

### Run It

```bash
uvicorn main:app --reload
```

**Done!** API protected at `http://localhost:8000`

</details>

---

## Step 2: Test with curl (Manual Flow)

### 1. Request without auth (get 403 + challenge)

```bash
curl -v http://localhost:3000/hello
```

**Response:**
```
< HTTP/1.1 403 Forbidden
< WWW-Authenticate: WebX403 realm="my-app", version="1", challenge="eyJ2IjoxLC..."
{
  "error": "wallet_auth_required",
  "detail": "Sign the challenge using your Solana wallet..."
}
```

### 2. Extract challenge, sign it, retry

*(This is what the client SDK does automatically)*

---

## Step 3: Use the Client SDK

### Install Client

```bash
npm install webx403-client
```

### Test from Browser Console

```javascript
import { WebX403Client } from 'webx403-client';

const client = new WebX403Client();
await client.connect('phantom');

const result = await client.authenticate({
  resource: 'http://localhost:3000/hello',
  method: 'GET'
});

console.log(result);
// { ok: true, address: "ABC123...", response: Response }
```

**Success!** You're authenticated.

---

## Step 4: Build a Frontend

### React Example

```bash
npx create-react-app my-wallet-app
cd my-wallet-app
npm install webx403-client
```

**src/App.js:**

```jsx
import { useState } from 'react';
import { WebX403Client } from 'webx403-client';

function App() {
  const [client] = useState(() => new WebX403Client());
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  const login = async () => {
    await client.connect('phantom');
    const result = await client.authenticate({
      resource: 'http://localhost:3000/hello'
    });

    if (result.ok) {
      setUser(result.address);
      const data = await result.response.json();
      setMessage(data.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>WebX403 Demo</h1>
      {!user ? (
        <button onClick={login}>Connect Wallet</button>
      ) : (
        <div>
          <p>✅ Connected as: <code>{user}</code></p>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;
```

```bash
npm start
```

**You now have a full wallet-authenticated stack!** 🎉

---

## Common Patterns

### Pattern 1: Public + Protected Routes

```javascript
const express = require('express');
const { createWebX403 } = require('webx403-server');

const app = express();
const auth = createWebX403({ /* ... */ });

// Public routes
app.get('/public', (req, res) => {
  res.json({ message: 'Public data' });
});

// Protected routes
const protectedRouter = express.Router();
protectedRouter.use(auth.middleware());

protectedRouter.get('/private', (req, res) => {
  res.json({ message: 'Secret data', wallet: req.webx403User.address });
});

app.use('/api', protectedRouter);
```

### Pattern 2: NFT-Gated Endpoint

```javascript
const auth = createWebX403({
  issuer: 'nft-club',
  audience: 'https://api.myclub.io',
  tokenGate: async (address) => {
    // Check if wallet owns required NFT
    const hasNFT = await checkNFTOwnership(address, 'YOUR_NFT_COLLECTION');
    return hasNFT;
  }
});
```

### Pattern 3: Role-Based Access

```javascript
protectedRouter.get('/admin', async (req, res) => {
  const wallet = req.webx403User.address;
  
  // Check admin list
  if (!isAdmin(wallet)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  res.json({ message: 'Admin panel' });
});
```

---

## Troubleshooting

### ❌ "Wallet not found"

**Solution:** Install the wallet extension (Phantom/Backpack/Solflare) and refresh the page.

### ❌ "Challenge expired"

**Solution:** System clock skew. Ensure your server time is accurate (NTP sync recommended).

### ❌ "CORS error in browser"

**Solution:** Configure CORS on your server:

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### ❌ "Nonce already used"

**Solution:** Replay attack detected (this is good!). The nonce was reused. Check if client is retrying unnecessarily.

---

## Next Steps

- **Production Setup**: [SECURITY.md](SECURITY.md) – Enable HTTPS, Redis replay store, origin binding
- **Advanced Examples**: [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) – Token gating, multi-wallet, LangChain
- **Protocol Details**: [docs/COMPLETE_SPECIFICATION.md](docs/COMPLETE_SPECIFICATION.md) – How it works under the hood

---

**Questions?** Open an issue on [GitHub](https://github.com/ByrgerBib/webx403/issues)

