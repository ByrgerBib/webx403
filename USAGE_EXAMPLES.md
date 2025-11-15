# WebX403 Usage Examples

**Real-world scenarios and production patterns.**

---

## Table of Contents

1. [NFT-Gated Discord Bot](#1-nft-gated-discord-bot)
2. [Token-Holder API Access](#2-token-holder-api-access)
3. [Multi-Tenant SaaS Platform](#3-multi-tenant-saas-platform)
4. [Autonomous Trading Bot](#4-autonomous-trading-bot)
5. [Content Creator Platform](#5-content-creator-platform)
6. [Real-Time Dashboard](#6-real-time-dashboard)

---

## 1. NFT-Gated Discord Bot

**Scenario:** Only users holding your NFT collection can access bot commands.

### Architecture

```
Discord Bot → Verify User → Check NFT → Call Protected API
```

### Implementation

**Backend API (`server.js`):**

```javascript
const express = require('express');
const { createWebX403, inMemoryLRU } = require('webx403-server');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const connection = new Connection('https://api.mainnet-beta.solana.com');

// NFT Collection Mint Address
const COLLECTION_MINT = 'YOUR_COLLECTION_MINT_ADDRESS';

// Check if wallet holds collection NFT
async function holdsNFT(walletAddress) {
  try {
    const pubkey = new PublicKey(walletAddress);
    const tokens = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    for (const token of tokens.value) {
      const mint = token.account.data.parsed.info.mint;
      // Check against your collection (simplified - use Metaplex in production)
      if (mint === COLLECTION_MINT && token.account.data.parsed.info.tokenAmount.uiAmount > 0) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('NFT check failed:', error);
    return false;
  }
}

const auth = createWebX403({
  issuer: 'discord-bot-api',
  audience: 'https://bot-api.yourproject.com',
  replayStore: inMemoryLRU(),
  tokenGate: holdsNFT
});

app.use(auth.middleware());

// Bot command endpoints
app.post('/commands/special-role', (req, res) => {
  const wallet = req.webx403User.address;
  res.json({
    success: true,
    message: `✅ Special role granted to ${wallet}`,
    roleId: 'holder-exclusive'
  });
});

app.listen(3000);
```

**Discord Bot (`bot.js`):**

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { WebX403Client } = require('webx403-client');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('interactionCreate', async interaction => {
  if (interaction.commandName === 'verify') {
    // User provides their wallet address
    const walletAddress = interaction.options.getString('wallet');
    
    // Verify ownership via DM (user must sign with wallet)
    const dmChannel = await interaction.user.createDM();
    await dmChannel.send('Please connect your wallet to verify NFT ownership.');
    
    // In practice, you'd use a web interface for wallet connection
    // This is a simplified flow
    
    interaction.reply('Check your DMs to complete verification!');
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

## 2. Token-Holder API Access

**Scenario:** API with tiered access based on token holdings.

### Tiers

| Tier | Min Tokens | Rate Limit | Features |
|------|-----------|------------|----------|
| Free | 0 | 10/min | Basic data |
| Bronze | 1,000 | 100/min | Historical data |
| Silver | 10,000 | 1,000/min | Real-time streams |
| Gold | 100,000 | Unlimited | Priority support |

### Implementation

```javascript
const { createWebX403 } = require('webx403-server');
const { Connection, PublicKey } = require('@solana/web3.js');

const TOKEN_MINT = 'YOUR_TOKEN_MINT_ADDRESS';

async function getTokenBalance(walletAddress) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const pubkey = new PublicKey(walletAddress);
  
  const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    mint: new PublicKey(TOKEN_MINT)
  });

  if (accounts.value.length === 0) return 0;
  
  return accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}

function getTier(balance) {
  if (balance >= 100000) return 'gold';
  if (balance >= 10000) return 'silver';
  if (balance >= 1000) return 'bronze';
  return 'free';
}

const auth = createWebX403({
  issuer: 'data-api',
  audience: 'https://api.dataservice.io',
  tokenGate: async (address) => {
    const balance = await getTokenBalance(address);
    return balance >= 1000; // Minimum bronze tier
  }
});

// Middleware to attach tier info
app.use(auth.middleware());
app.use(async (req, res, next) => {
  if (req.webx403User) {
    const balance = await getTokenBalance(req.webx403User.address);
    req.webx403User.tier = getTier(balance);
    req.webx403User.balance = balance;
  }
  next();
});

// Tiered endpoints
app.get('/data/basic', (req, res) => {
  res.json({ data: 'Public data', tier: req.webx403User.tier });
});

app.get('/data/historical', (req, res) => {
  if (req.webx403User.balance < 1000) {
    return res.status(403).json({ error: 'Bronze tier required (1,000+ tokens)' });
  }
  res.json({ historical: [...] });
});

app.get('/stream/realtime', (req, res) => {
  if (req.webx403User.tier !== 'silver' && req.webx403User.tier !== 'gold') {
    return res.status(403).json({ error: 'Silver tier required (10,000+ tokens)' });
  }
  // Setup SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  // Stream data...
});
```

---

## 3. Multi-Tenant SaaS Platform

**Scenario:** Each wallet is a separate "account" with isolated data.

### Database Schema

```sql
CREATE TABLE users (
  wallet_address VARCHAR(44) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  plan_tier VARCHAR(20) DEFAULT 'free'
);

CREATE TABLE user_data (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) REFERENCES users(wallet_address),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Implementation

```javascript
const { createWebX403 } = require('webx403-server');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const auth = createWebX403({
  issuer: 'saas-platform',
  audience: 'https://app.yourplatform.com'
});

app.use(auth.middleware());

// Auto-create user on first login
app.use(async (req, res, next) => {
  if (req.webx403User) {
    const { address } = req.webx403User;
    
    // Upsert user
    await pool.query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [address]);
    
    req.webx403User.db = pool;
  }
  next();
});

// User-scoped data endpoints
app.get('/api/my-data', async (req, res) => {
  const { address, db } = req.webx403User;
  
  const result = await db.query(`
    SELECT * FROM user_data
    WHERE wallet_address = $1
    ORDER BY created_at DESC
    LIMIT 100
  `, [address]);
  
  res.json({ data: result.rows });
});

app.post('/api/my-data', async (req, res) => {
  const { address, db } = req.webx403User;
  
  const result = await db.query(`
    INSERT INTO user_data (wallet_address, data)
    VALUES ($1, $2)
    RETURNING *
  `, [address, req.body]);
  
  res.json({ created: result.rows[0] });
});
```

---

## 4. Autonomous Trading Bot

**Scenario:** Bot needs to authenticate with exchange API using a keypair.

### Implementation

```javascript
const { WebX403Client } = require('webx403-client');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

class TradingBot {
  constructor(secretKey) {
    this.keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
    this.client = new WebX403Client({ keypair: this.keypair });
    this.apiBase = 'https://api.exchange.com';
  }

  async getMarketData() {
    const result = await this.client.authenticate({
      resource: `${this.apiBase}/market/btc-usdc`,
      method: 'GET'
    });

    if (!result.ok) throw new Error('Auth failed');
    return await result.response.json();
  }

  async placeTrade(side, amount) {
    const result = await this.client.authenticate({
      resource: `${this.apiBase}/orders`,
      method: 'POST',
      body: {
        side,      // 'buy' or 'sell'
        amount,
        wallet: this.keypair.publicKey.toBase58()
      }
    });

    if (!result.ok) throw new Error('Trade failed');
    return await result.response.json();
  }
}

// Usage
const bot = new TradingBot(process.env.BOT_SECRET_KEY);

setInterval(async () => {
  const market = await bot.getMarketData();
  console.log('Current price:', market.price);

  // Simple strategy
  if (market.price < 40000) {
    await bot.placeTrade('buy', 0.01);
  }
}, 60000); // Every minute
```

---

## 5. Content Creator Platform

**Scenario:** Creators can upload content, fans with NFTs can access.

### Implementation

```javascript
const express = require('express');
const multer = require('multer');
const { createWebX403 } = require('webx403-server');

const upload = multer({ dest: 'uploads/' });

// Creator authentication (allow all wallets)
const creatorAuth = createWebX403({
  issuer: 'creator-platform',
  audience: 'https://creators.yourplatform.com'
});

// Fan authentication (require NFT)
const fanAuth = createWebX403({
  issuer: 'fan-platform',
  audience: 'https://fans.yourplatform.com',
  tokenGate: async (address) => {
    return await hasCreatorNFT(address);
  }
});

// Creator endpoints
app.post('/creator/upload', creatorAuth.middleware(), upload.single('content'), (req, res) => {
  const creator = req.webx403User.address;
  
  // Save content metadata to DB
  const contentId = saveContent({
    creator,
    file: req.file.filename,
    title: req.body.title
  });
  
  res.json({ success: true, contentId });
});

// Fan endpoints
app.get('/content/:id', fanAuth.middleware(), (req, res) => {
  const content = getContent(req.params.id);
  
  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }
  
  res.sendFile(content.file);
});
```

---

## 6. Real-Time Dashboard

**Scenario:** WebSocket dashboard with wallet authentication.

### Implementation

```javascript
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { createWebX403 } = require('webx403-server');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const auth = createWebX403({
  issuer: 'dashboard-api',
  audience: 'https://dashboard.yourapp.com'
});

// HTTP authentication endpoint
app.post('/auth', express.json(), async (req, res) => {
  // Client sends Authorization header via HTTP first
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    const challenge = auth.createChallenge('POST', '/auth');
    return res.status(403).json({
      error: 'auth_required',
      challenge: challenge.headerValue
    });
  }

  // Verify
  const result = await auth.verifyAuthorization(authHeader, 'POST', '/auth', req.headers);
  
  if (!result.ok) {
    return res.status(403).json({ error: result.error });
  }

  // Generate session token for WebSocket
  const token = generateSessionToken(result.address);
  
  res.json({ token, address: result.address });
});

// WebSocket connection
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
  
  const address = verifySessionToken(token);
  if (!address) {
    ws.close(4001, 'Invalid token');
    return;
  }

  ws.address = address;
  
  // Stream updates
  const interval = setInterval(() => {
    ws.send(JSON.stringify({
      type: 'update',
      data: getRealtimeData(),
      timestamp: Date.now()
    }));
  }, 1000);

  ws.on('close', () => clearInterval(interval));
});

server.listen(3000);
```

**Client:**

```javascript
import { WebX403Client } from 'webx403-client';

const client = new WebX403Client();
await client.connect('phantom');

// Authenticate via HTTP
const authResult = await client.authenticate({
  resource: 'https://dashboard.yourapp.com/auth',
  method: 'POST'
});

const { token } = await authResult.response.json();

// Connect to WebSocket with token
const ws = new WebSocket(`wss://dashboard.yourapp.com?token=${token}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Dashboard update:', update);
};
```

---

## Common Patterns Summary

| Pattern | Use Case | Key Feature |
|---------|----------|-------------|
| NFT Gating | Exclusive access | `tokenGate` checks NFT ownership |
| Token Tiers | Graduated access | Balance-based permissions |
| Multi-Tenant | SaaS platforms | Wallet = Account ID |
| Bot Authentication | Automated systems | Keypair-based auth |
| WebSocket Auth | Real-time apps | HTTP auth → WS token |

---

## Next Steps

- **Production Deploy**: See [SECURITY.md](SECURITY.md) for hardening tips
- **Protocol Details**: Read [docs/COMPLETE_SPECIFICATION.md](docs/COMPLETE_SPECIFICATION.md)
- **Get Help**: Open an issue on [GitHub](https://github.com/ByrgerBib/webx403/issues)

