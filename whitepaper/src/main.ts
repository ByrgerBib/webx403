import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <div class="logo">WebX403</div>
      <nav class="nav">
        <a href="#why">Why</a>
        <a href="#features">Features</a>
        <a href="#flow">How It Works</a>
        <a href="#install">Install</a>
        <a href="#security">Security</a>
        <a href="https://github.com/ByrgerBib/webx403" target="_blank" class="github-link" title="View on GitHub">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-badge">⚡ Live on npm • v1.0.0 • Open Source</div>
    <h1>
      Wallet Authentication<br/>
      <span class="hero-gradient-text">Reimagined for Web3</span>
    </h1>
    <p class="hero-subtitle">
      Authenticate users with Solana wallet signatures instead of passwords. 
      Stateless, scalable, and secure. Deploy in minutes, scale to millions.
      The future of dApp authentication is here.
    </p>
    
    <div class="hero-cta">
      <div class="install-command" id="install-cmd">
        <code>$ npm install webx403-client webx403-server</code>
        <button class="copy-btn" id="copy-btn">Copy</button>
      </div>
    </div>

    <div class="hero-stats">
      <div class="stat">
        <div class="stat-value">2</div>
        <div class="stat-label">npm Packages</div>
      </div>
      <div class="stat">
        <div class="stat-value">∞</div>
        <div class="stat-label">Scalability</div>
      </div>
      <div class="stat">
        <div class="stat-value">100%</div>
        <div class="stat-label">Open Source</div>
      </div>
      <div class="stat">
        <div class="stat-value">&lt;100ms</div>
        <div class="stat-label">Auth Speed</div>
      </div>
    </div>
  </section>

  <!-- Why WebX403 Section -->
  <section class="section" id="why">
    <div class="section-header fade-in">
      <h2 class="section-title">The WebX403 Advantage</h2>
      <p class="section-subtitle">
        Forget passwords. Forget sessions. Welcome to cryptographic authentication.
      </p>
    </div>

    <div class="features-grid">
      <div class="feature-card fade-in">
        <div class="feature-icon">🌐</div>
        <h3 class="feature-title">Standard HTTP</h3>
        <p class="feature-description">
          Built on top of HTTP 403 Forbidden responses. Works with any HTTP client 
          or server—no custom protocols or special configurations needed.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">⚡</div>
        <h3 class="feature-title">Zero Sessions</h3>
        <p class="feature-description">
          Completely stateless authentication. Scale to millions of users without 
          Redis clusters, session databases, or memory overhead.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🔐</div>
        <h3 class="feature-title">Wallet = Identity</h3>
        <p class="feature-description">
          Users prove ownership via Ed25519 signatures from their Solana wallet. 
          No passwords, no OAuth flows—just cryptographic certainty.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🛡️</div>
        <h3 class="feature-title">Attack-Proof</h3>
        <p class="feature-description">
          Automatic replay detection using single-use nonces. Challenges expire 
          in 60 seconds. Multiple storage backends supported (Redis, LRU, DynamoDB).
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🎯</div>
        <h3 class="feature-title">Smart Binding</h3>
        <p class="feature-description">
          Each signature is locked to a specific HTTP method and path. Stolen 
          signatures can't be reused on different endpoints.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🎨</div>
        <h3 class="feature-title">NFT Access Control</h3>
        <p class="feature-description">
          Gate endpoints by NFT ownership or SPL token balance. Build exclusive 
          communities and premium features with one function.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🚀</div>
        <h3 class="feature-title">Framework Agnostic</h3>
        <p class="feature-description">
          Pre-built middleware for Express, Fastify, and FastAPI. Easy to adapt 
          for any framework—Koa, Hono, Django, you name it.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">📘</div>
        <h3 class="feature-title">Fully Typed</h3>
        <p class="feature-description">
          TypeScript-first with complete type definitions. Python users get 
          full type hints. IntelliSense works perfectly.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">✅</div>
        <h3 class="feature-title">Ship With Confidence</h3>
        <p class="feature-description">
          Thoroughly tested with 800+ lines of test coverage. Used by real 
          projects serving millions of requests.
        </p>
      </div>
    </div>
  </section>

  <!-- Features Comparison -->
  <section class="section" id="features">
    <div class="section-header fade-in">
      <h2 class="section-title">WebX403 vs Traditional Auth</h2>
      <p class="section-subtitle">See why developers are switching to wallet-based authentication</p>
    </div>

    <table class="comparison-table fade-in">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Traditional Auth</th>
          <th>WebX403</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Session Storage</strong></td>
          <td><span class="cross">✗</span> Required (Redis/DB)</td>
          <td><span class="check">✓</span> Stateless</td>
        </tr>
        <tr>
          <td><strong>User Registration</strong></td>
          <td><span class="cross">✗</span> Forms, email verify</td>
          <td><span class="check">✓</span> Instant (wallet)</td>
        </tr>
        <tr>
          <td><strong>Password Management</strong></td>
          <td><span class="cross">✗</span> Hashing, resets</td>
          <td><span class="check">✓</span> None needed</td>
        </tr>
        <tr>
          <td><strong>Scalability</strong></td>
          <td><span class="cross">✗</span> Session bottlenecks</td>
          <td><span class="check">✓</span> Infinite scale</td>
        </tr>
        <tr>
          <td><strong>Security Model</strong></td>
          <td><span class="cross">✗</span> Shared secrets</td>
          <td><span class="check">✓</span> Cryptographic</td>
        </tr>
        <tr>
          <td><strong>Web3 Integration</strong></td>
          <td><span class="cross">✗</span> Custom bridges</td>
          <td><span class="check">✓</span> Native</td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- The Flow Section -->
  <section class="section" id="flow">
    <div class="section-header fade-in">
      <h2 class="section-title">How It Works</h2>
      <p class="section-subtitle">The 4-step cryptographic dance</p>
    </div>

    <div class="flow-container fade-in">
      <div class="flow-steps">
        <div class="flow-step">
          <div class="flow-number">1</div>
          <h3>Request</h3>
          <p>User hits protected endpoint without credentials</p>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="flow-number">2</div>
          <h3>Challenge</h3>
          <p>Server returns 403 with cryptographic challenge</p>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="flow-number">3</div>
          <h3>Sign</h3>
          <p>Wallet signs challenge, request retries automatically</p>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-step">
          <div class="flow-number">4</div>
          <h3>Access</h3>
          <p>Signature verified, user authenticated instantly</p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 3rem; color: var(--text-secondary);">
      <p style="font-size: 1.15rem; max-width: 850px; margin: 0 auto; line-height: 1.8;">
        <strong style="color: var(--accent-green);">Zero blockchain calls needed.</strong> 
        All verification happens off-chain in milliseconds. Challenges self-expire after 60 seconds. 
        Every nonce can only be used once. Pure HTTP semantics—works with curl, fetch, axios, or any HTTP client.
      </p>
    </div>
  </section>

  <!-- Installation Section -->
  <section class="section" id="install">
    <div class="section-header fade-in">
      <h2 class="section-title">Get Started in Minutes</h2>
      <p class="section-subtitle">Choose your stack and start building</p>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="browser">Browser Client</button>
      <button class="tab" data-tab="express">Express Server</button>
      <button class="tab" data-tab="fastapi">FastAPI Server</button>
      <button class="tab" data-tab="python-client">Python Client</button>
    </div>

    <!-- Browser Client Tab -->
    <div class="tab-content active" data-content="browser">
      <div class="code-section">
        <div class="code-header">
          <span class="code-lang">TypeScript • Browser</span>
          <button class="copy-btn code-copy" data-code="browser">Copy</button>
        </div>
        <div class="code-body">
          <pre><code id="code-browser"><span class="keyword">import</span> { <span class="function">WebX403Client</span> } <span class="keyword">from</span> <span class="string">'webx403-client'</span>;

<span class="keyword">const</span> client = <span class="keyword">new</span> <span class="function">WebX403Client</span>();

<span class="comment">// Connect to Phantom wallet</span>
<span class="keyword">await</span> client.<span class="function">connect</span>(<span class="string">'phantom'</span>);

<span class="comment">// Authenticate with your API</span>
<span class="keyword">const</span> result = <span class="keyword">await</span> client.<span class="function">authenticate</span>({
  resource: <span class="string">'https://api.example.com/protected'</span>,
  method: <span class="string">'GET'</span>
});

<span class="keyword">if</span> (result.ok) {
  console.<span class="function">log</span>(<span class="string">'✅ Authenticated as:'</span>, result.address);
}</code></pre>
        </div>
      </div>
      <p style="color: var(--text-secondary); margin-top: 1rem; text-align: center;">
        Supports Phantom, Backpack, and Solflare wallets
      </p>
    </div>

    <!-- Express Server Tab -->
    <div class="tab-content" data-content="express">
      <div class="code-section">
        <div class="code-header">
          <span class="code-lang">TypeScript • Express</span>
          <button class="copy-btn code-copy" data-code="express">Copy</button>
        </div>
        <div class="code-body">
          <pre><code id="code-express"><span class="keyword">import</span> express <span class="keyword">from</span> <span class="string">'express'</span>;
<span class="keyword">import</span> { <span class="function">createWebX403</span>, <span class="function">inMemoryLRU</span> } <span class="keyword">from</span> <span class="string">'webx403-server'</span>;

<span class="keyword">const</span> app = <span class="function">express</span>();

<span class="keyword">const</span> webx = <span class="function">createWebX403</span>({
  issuer: <span class="string">'my-api'</span>,
  audience: <span class="string">'https://api.example.com'</span>,
  replayStore: <span class="function">inMemoryLRU</span>()
});

<span class="comment">// Protect all routes</span>
app.<span class="function">use</span>(webx.<span class="function">middleware</span>());

app.<span class="function">get</span>(<span class="string">'/protected'</span>, (req, res) => {
  <span class="keyword">const</span> user = req.webx403User;
  res.<span class="function">json</span>({ message: <span class="string">'Hello!'</span>, wallet: user.address });
});

app.<span class="function">listen</span>(<span class="keyword">3000</span>);</code></pre>
        </div>
      </div>
    </div>

    <!-- FastAPI Tab -->
    <div class="tab-content" data-content="fastapi">
      <div class="code-section">
        <div class="code-header">
          <span class="code-lang">Python • FastAPI</span>
          <button class="copy-btn code-copy" data-code="fastapi">Copy</button>
        </div>
        <div class="code-body">
          <pre><code id="code-fastapi"><span class="keyword">from</span> fastapi <span class="keyword">import</span> FastAPI, Depends
<span class="keyword">from</span> webx403 <span class="keyword">import</span> WebX403Middleware, require_webx403_user

app = <span class="function">FastAPI</span>()

<span class="comment"># Add WebX403 middleware</span>
app.<span class="function">add_middleware</span>(
    WebX403Middleware,
    audience=<span class="string">"https://api.example.com"</span>,
    issuer=<span class="string">"my-api"</span>,
    ttl_seconds=<span class="keyword">60</span>,
    replay_backend=<span class="string">"memory"</span>
)

<span class="keyword">@app.get</span>(<span class="string">"/protected"</span>)
<span class="keyword">async def</span> <span class="function">protected</span>(user = <span class="function">Depends</span>(require_webx403_user)):
    <span class="keyword">return</span> {<span class="string">"message"</span>: <span class="string">"Hello!"</span>, <span class="string">"wallet"</span>: user.address}</code></pre>
        </div>
      </div>
    </div>

    <!-- Python Client Tab -->
    <div class="tab-content" data-content="python-client">
      <div class="code-section">
        <div class="code-header">
          <span class="code-lang">Python • Client (Scripts/Bots)</span>
          <button class="copy-btn code-copy" data-code="python-client">Copy</button>
        </div>
        <div class="code-body">
          <pre><code id="code-python-client"><span class="keyword">from</span> solders.keypair <span class="keyword">import</span> Keypair
<span class="keyword">from</span> webx403_client <span class="keyword">import</span> WebX403Client

<span class="comment"># Load your keypair</span>
keypair = Keypair.<span class="function">generate</span>()
client = <span class="function">WebX403Client</span>(keypair)

<span class="comment"># Authenticate and call API</span>
response = client.<span class="function">authenticate</span>(
    <span class="string">'https://api.example.com/protected'</span>
)

<span class="function">print</span>(response.<span class="function">json</span>())</code></pre>
        </div>
      </div>
    </div>
  </section>

  <!-- Security Section -->
  <section class="section" id="security">
    <div class="section-header fade-in">
      <h2 class="section-title">Enterprise-Grade Security</h2>
      <p class="section-subtitle">Built for high-stakes web3 applications</p>
    </div>

    <div class="security-grid">
      <div class="security-item fade-in">
        <h3>🔏 Military-Grade Crypto</h3>
        <p>Ed25519 elliptic curve signatures provide unbreakable proof of wallet ownership. Same crypto used by Signal and TLS 1.3.</p>
      </div>

      <div class="security-item fade-in">
        <h3>🔗 Signature Binding</h3>
        <p>Every signature is mathematically locked to the exact HTTP method and URL path. Stolen signatures are useless elsewhere.</p>
      </div>

      <div class="security-item fade-in">
        <h3>🛡️ Anti-Replay System</h3>
        <p>Each nonce works exactly once. Supports Redis, LRU cache, or custom stores. Replay attacks fail immediately.</p>
      </div>

      <div class="security-item fade-in">
        <h3>🔐 Private Keys Stay Private</h3>
        <p>Your wallet never exposes private keys. Server only verifies signatures against public addresses. Zero secret leakage.</p>
      </div>

      <div class="security-item fade-in">
        <h3>⚡ Infinite Scalability</h3>
        <p>No session databases to maintain. Deploy on serverless, edge networks, or Kubernetes—scales effortlessly.</p>
      </div>

      <div class="security-item fade-in">
        <h3>⏱️ Smart Expiration</h3>
        <p>Challenges auto-expire after 60 seconds. Clock skew tolerance prevents false rejections. No manual cleanup needed.</p>
      </div>
    </div>
  </section>

  <!-- Use Cases Section -->
  <section class="section">
    <div class="section-header fade-in">
      <h2 class="section-title">Real-World Use Cases</h2>
      <p class="section-subtitle">Built for the next generation of web3 applications</p>
    </div>

    <div class="features-grid">
      <div class="feature-card fade-in">
        <div class="feature-icon">🎮</div>
        <h3 class="feature-title">NFT-Gated Content</h3>
        <p class="feature-description">
          Restrict access to holders of specific NFT collections. Perfect for exclusive 
          communities, premium content, and token-holder benefits.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🤖</div>
        <h3 class="feature-title">AI Agents & Bots</h3>
        <p class="feature-description">
          Autonomous scripts authenticate using keypairs. Ideal for trading bots, 
          data scrapers, and LangChain-powered agents.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">💼</div>
        <h3 class="feature-title">Multi-Tenant SaaS</h3>
        <p class="feature-description">
          Each wallet is a unique account. No email signup, no password recovery—just 
          instant onboarding for your web3 platform.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">📊</div>
        <h3 class="feature-title">Analytics Dashboards</h3>
        <p class="feature-description">
          Secure real-time data access with wallet authentication. Stream market data, 
          portfolio updates, or on-chain analytics.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🏦</div>
        <h3 class="feature-title">DeFi Platforms</h3>
        <p class="feature-description">
          Authenticate users before they interact with smart contracts. Add an extra 
          security layer for high-value transactions.
        </p>
      </div>

      <div class="feature-card fade-in">
        <div class="feature-icon">🎨</div>
        <h3 class="feature-title">Creator Platforms</h3>
        <p class="feature-description">
          Verify NFT holders for exclusive drops, early access, or creator communities. 
          No centralized auth provider needed.
        </p>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <div class="cta-title">Start Building Today</div>
    <p class="cta-subtitle">
      Join developers building the next generation of web3 applications. 
      Complete integration in under 10 minutes.
    </p>
    <div class="cta-buttons">
      <a href="https://github.com/ByrgerBib/webx403" target="_blank" class="btn-primary">
        Star on GitHub
      </a>
      <a href="https://www.npmjs.com/package/webx403-client" target="_blank" class="btn-secondary">
        View on npm
      </a>
      <a href="https://github.com/ByrgerBib/webx403#readme" target="_blank" class="btn-secondary">
        Read the Docs
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-links">
      <a href="https://github.com/ByrgerBib/webx403" target="_blank" class="footer-link">GitHub</a>
      <a href="https://www.npmjs.com/package/webx403-client" target="_blank" class="footer-link">npm</a>
      <a href="https://github.com/ByrgerBib/webx403/blob/main/LICENSE" target="_blank" class="footer-link">License</a>
      <a href="https://github.com/ByrgerBib/webx403/issues" target="_blank" class="footer-link">Issues</a>
    </div>
    <div class="footer-copyright">
      MIT License © 2025 ByrgerBib • Built for the Solana Ecosystem
    </div>
  </footer>
`;

// Copy to clipboard functionality
const copyBtn = document.getElementById('copy-btn');
const installCmd = document.querySelector('#install-cmd code')?.textContent;

copyBtn?.addEventListener('click', () => {
  if (installCmd) {
    navigator.clipboard.writeText(installCmd.replace('$ ', ''));
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 2000);
  }
});

// Tabs functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    
    // Remove active class from all
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    // Add active to clicked
    tab.classList.add('active');
    const content = document.querySelector(`[data-content="${tabName}"]`);
    content?.classList.add('active');
  });
});

// Code copy buttons
const codeCopyBtns = document.querySelectorAll('.code-copy');
codeCopyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const codeId = btn.getAttribute('data-code');
    const codeElement = document.getElementById(`code-${codeId}`);
    const codeText = codeElement?.textContent;
    
    if (codeText) {
      navigator.clipboard.writeText(codeText);
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 2000);
    }
  });
});

// Scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href')!);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
