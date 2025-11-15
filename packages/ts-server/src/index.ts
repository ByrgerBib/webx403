import { PublicKey } from '@solana/web3.js';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { createHash, randomBytes } from 'crypto';

ed25519.etc.sha512Sync = (...messages) => {
  const hash = createHash('sha512');
  for (const message of messages) {
    hash.update(message);
  }
  return Uint8Array.from(hash.digest());
};

// Types
export interface WebX403Config {
  issuer: string;
  audience: string;
  ttlSeconds?: number;
  bindMethodPath?: boolean;
  originBinding?: boolean;
  uaBinding?: boolean;
  replayStore?: ReplayStore;
  tokenGate?: (address: string) => Promise<boolean>;
  clockSkewSeconds?: number;
}

export interface Challenge {
  v: number;
  alg: string;
  nonce: string;
  ts: string;
  aud: string;
  method: string;
  path: string;
  uaBind: boolean;
  originBind: boolean;
  serverId: string;
  exp: string;
  ext?: Record<string, unknown>;
}

export interface AuthorizationParams {
  addr: string;
  sig: string;
  challenge: string;
  ts: string;
  nonce: string;
  bind?: string;
}

export interface VerifyResult {
  ok: boolean;
  address?: string;
  challenge?: Challenge;
  error?: string;
}

export interface ReplayStore {
  check(key: string, ttlSeconds: number): Promise<boolean>;
  store(key: string, ttlSeconds: number): Promise<void>;
}

export interface WebX403User {
  address: string;
  challenge?: Challenge;
}

// Utility functions
function base64urlEncode(data: string | Buffer): string {
  const base64 = Buffer.isBuffer(data)
    ? data.toString('base64')
    : Buffer.from(data).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function generateNonce(): string {
  return randomBytes(16).toString('base64url');
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function addSeconds(date: Date | string, seconds: number): Date {
  const d = new Date(date);
  d.setSeconds(d.getSeconds() + seconds);
  return d;
}

function parseAuthorizationHeader(header: string): AuthorizationParams | null {
  if (!header.startsWith('WebX403 ')) {
    return null;
  }

  const params: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let result;
  
  while ((result = regex.exec(header)) !== null) {
    params[result[1]] = result[2];
  }

  if (!params.addr || !params.sig || !params.challenge || !params.ts || !params.nonce) {
    return null;
  }

  return {
    addr: params.addr,
    sig: params.sig,
    challenge: params.challenge,
    ts: params.ts,
    nonce: params.nonce,
    bind: params.bind
  };
}

function buildSigningString(challenge: Challenge): string {
  const lines = [
    'WebX403 Challenge',
    '',
    `domain: ${challenge.aud}`,
    `server: ${challenge.serverId}`,
    `nonce: ${challenge.nonce}`,
    `ts: ${challenge.ts}`,
    `method: ${challenge.method}`,
    `path: ${challenge.path}`,
    '',
    `payload: ${JSON.stringify(challenge, Object.keys(challenge).sort())}`
  ];
  
  return lines.join('\n');
}

// In-memory LRU replay store
export class InMemoryReplayStore implements ReplayStore {
  private cache = new Map<string, number>();
  private maxSize = 10000;

  async check(key: string, _ttlSeconds: number): Promise<boolean> {
    const expiry = this.cache.get(key);
    if (!expiry) return false;
    
    if (Date.now() > expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async store(key: string, ttlSeconds: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, Date.now() + (ttlSeconds * 1000));
    
    if (Math.random() < 0.01) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Main functions
export function createChallenge(
  method: string,
  path: string,
  config: WebX403Config,
  ext?: Record<string, unknown>
): { headerValue: string; challengeJson: Challenge } {
  const now = new Date();
  const ttl = config.ttlSeconds || 60;
  
  const challenge: Challenge = {
    v: 1,
    alg: 'ed25519',
    nonce: generateNonce(),
    ts: getCurrentTimestamp(),
    aud: config.audience,
    method,
    path,
    uaBind: config.uaBinding || false,
    originBind: config.originBinding || false,
    serverId: config.issuer,
    exp: addSeconds(now, ttl).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ext: ext || {}
  };

  const challengeEncoded = base64urlEncode(JSON.stringify(challenge, Object.keys(challenge).sort()));
  const headerValue = `WebX403 realm="${config.issuer}", version="1", challenge="${challengeEncoded}"`;

  return { headerValue, challengeJson: challenge };
}

export async function verifyAuthorization(
  authHeader: string,
  method: string,
  path: string,
  config: WebX403Config,
  headers?: Record<string, string>
): Promise<VerifyResult> {
  const params = parseAuthorizationHeader(authHeader);
  if (!params) {
    return { ok: false, error: 'Invalid authorization header' };
  }

  let challenge: Challenge;
  try {
    const challengeJson = base64urlDecode(params.challenge);
    challenge = JSON.parse(challengeJson);
  } catch {
    return { ok: false, error: 'Invalid challenge format' };
  }

  if (challenge.v !== 1) {
    return { ok: false, error: 'Unsupported protocol version' };
  }

  if (challenge.alg !== 'ed25519') {
    return { ok: false, error: 'Unsupported algorithm' };
  }

  const expiry = new Date(challenge.exp);
  if (new Date() > expiry) {
    return { ok: false, error: 'Challenge expired' };
  }

  if (challenge.aud !== config.audience) {
    return { ok: false, error: 'Invalid audience' };
  }

  if (challenge.serverId !== config.issuer) {
    return { ok: false, error: 'Invalid server ID' };
  }

  const clientTs = new Date(params.ts);
  const now = new Date();
  const skew = config.clockSkewSeconds || 120;
  const diff = Math.abs(now.getTime() - clientTs.getTime()) / 1000;
  
  if (diff > skew) {
    return { ok: false, error: 'Timestamp outside allowed skew' };
  }

  if (config.bindMethodPath && params.bind) {
    const [bindMethod, ...bindPathParts] = params.bind.split(':');
    const bindPath = bindPathParts.join(':');
    
    if (bindMethod !== method || bindPath !== path) {
      return { ok: false, error: 'Bind parameter mismatch' };
    }
  }

  if (challenge.originBind && headers) {
    const origin = headers['origin'] || headers['referer'];
    if (!origin) {
      return { ok: false, error: 'Origin binding required but not provided' };
    }
    
    try {
      const originUrl = new URL(origin);
      const audUrl = new URL(challenge.aud);
      if (originUrl.origin !== audUrl.origin) {
        return { ok: false, error: 'Origin binding mismatch' };
      }
    } catch {
      return { ok: false, error: 'Invalid origin format' };
    }
  }

  if (challenge.uaBind && headers) {
    if (!headers['user-agent']) {
      return { ok: false, error: 'User-Agent binding required but not provided' };
    }
  }

  if (config.replayStore) {
    const replayKey = `${params.addr}:${params.nonce}`;
    const isReplay = await config.replayStore.check(replayKey, config.ttlSeconds || 60);
    
    if (isReplay) {
      return { ok: false, error: 'Nonce already used (replay detected)' };
    }
    
    await config.replayStore.store(replayKey, config.ttlSeconds || 60);
  }

  // ✅ FIXED: Proper Ed25519 verification
  try {
    const publicKey = new PublicKey(params.addr);
    const signature = bs58.decode(params.sig);
    const signingString = buildSigningString(challenge);
    const messageBytes = new TextEncoder().encode(signingString);
    
    const verified = await ed25519.verify(signature, messageBytes, publicKey.toBuffer());
    
    if (!verified) {
      return { ok: false, error: 'Invalid signature' };
    }
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: `Signature verification failed: ${err.message}` };
  }

  if (config.tokenGate) {
    try {
      const allowed = await config.tokenGate(params.addr);
      if (!allowed) {
        return { ok: false, error: 'Token gate check failed' };
      }
    } catch (error) {
      const err = error as Error;
      return { ok: false, error: `Token gate error: ${err.message}` };
    }
  }

  return { ok: true, address: params.addr, challenge };
}

// Express middleware
export function webX403Middleware(config: WebX403Config) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      const { headerValue } = createChallenge(req.method, req.path, config);
      res.status(403);
      res.set('WWW-Authenticate', headerValue);
      res.json({
        error: 'wallet_auth_required',
        detail: 'Sign the challenge using your Solana wallet and resend the request.'
      });
      return;
    }

    const result = await verifyAuthorization(
      authHeader,
      req.method,
      req.path,
      config,
      req.headers
    );

    if (!result.ok) {
      const { headerValue } = createChallenge(req.method, req.path, config);
      res.status(403);
      res.set('WWW-Authenticate', headerValue);
      res.json({
        error: result.error,
        detail: 'Authentication failed. Please sign the new challenge.'
      });
      return;
    }

    req.webx403User = { 
      address: result.address,
      challenge: result.challenge 
    };
    next();
  };
}

// Fastify plugin
export function fastifyWebX403Plugin(config: WebX403Config) {
  return async (request: any, reply: any) => {
    const authHeader = request.headers['authorization'];
    
    if (!authHeader) {
      const { headerValue } = createChallenge(request.method, request.url, config);
      reply.status(403);
      reply.header('WWW-Authenticate', headerValue);
      return {
        error: 'wallet_auth_required',
        detail: 'Sign the challenge using your Solana wallet and resend the request.'
      };
    }

    const result = await verifyAuthorization(
      authHeader,
      request.method,
      request.url,
      config,
      request.headers
    );

    if (!result.ok) {
      const { headerValue } = createChallenge(request.method, request.url, config);
      reply.status(403);
      reply.header('WWW-Authenticate', headerValue);
      return {
        error: result.error,
        detail: 'Authentication failed. Please sign the new challenge.'
      };
    }

    request.webx403User = { 
      address: result.address,
      challenge: result.challenge 
    };
  };
}

// Factory function
export function createWebX403(config: WebX403Config) {
  return {
    createChallenge: (method: string, path: string, ext?: Record<string, unknown>) => 
      createChallenge(method, path, config, ext),
    
    verifyAuthorization: (authHeader: string, method: string, path: string, headers?: Record<string, string>) =>
      verifyAuthorization(authHeader, method, path, config, headers),
    
    middleware: () => webX403Middleware(config),
    
    fastifyHook: () => fastifyWebX403Plugin(config)
  };
}

// Helper for getting user from request
export function getWebX403User(req: any): WebX403User | null {
  return req.webx403User || null;
}

// Export utility functions
export const utils = {
  base64urlEncode,
  base64urlDecode,
  generateNonce,
  getCurrentTimestamp,
  parseAuthorizationHeader,
  buildSigningString
};

// Export default configured instance
export function inMemoryLRU(): ReplayStore {
  return new InMemoryReplayStore();
}
