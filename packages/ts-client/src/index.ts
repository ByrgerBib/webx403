import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export type WalletProvider = 'phantom' | 'backpack' | 'solflare';

export interface AuthOptions {
  resource: string;
  method?: string;
  headers?: Record<string, string>;
  wallet?: WalletProvider;
  body?: any;
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

interface SolanaWallet {
  publicKey?: PublicKey;
  signMessage?(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array }>;
  connect?(): Promise<{ publicKey: PublicKey }>;
  isConnected?: boolean;
}

declare global {
  interface Window {
    solana?: SolanaWallet;
    phantom?: { solana: SolanaWallet };
    backpack?: SolanaWallet;
    solflare?: SolanaWallet;
  }
}

function base64urlEncode(data: string | Uint8Array): string {
  let binary = '';
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
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

function parseWWWAuthenticate(header: string): { challenge: string } | null {
  const match = header.match(/challenge="([^"]+)"/);
  return match ? { challenge: match[1] } : null;
}

export class WebX403Client {
  private wallet?: WalletProvider;
  private walletInstance?: SolanaWallet;

  constructor(opts?: { wallet?: WalletProvider }) {
    this.wallet = opts?.wallet;
  }

  async connect(wallet?: WalletProvider): Promise<void> {
    const provider = wallet || this.wallet;
    if (!provider) {
      throw new Error('No wallet provider specified');
    }

    if (typeof window === 'undefined') {
      throw new Error('Wallet connection only available in browser');
    }

    let walletObj: SolanaWallet | undefined;

    switch (provider) {
      case 'phantom':
        walletObj = window.phantom?.solana || window.solana;
        break;
      case 'backpack':
        walletObj = window.backpack;
        break;
      case 'solflare':
        walletObj = window.solflare;
        break;
      default:
        throw new Error(`Unknown wallet provider: ${provider}`);
    }

    if (!walletObj) {
      throw new Error(`${provider} wallet not found. Please install it.`);
    }

    if (!walletObj.isConnected && walletObj.connect) {
      await walletObj.connect();
    }

    this.walletInstance = walletObj;
    this.wallet = provider;
  }

  private async signChallenge(challengeB64: string): Promise<{ signature: string; address: string }> {
    if (!this.walletInstance) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    if (!this.walletInstance.publicKey) {
      throw new Error('Wallet public key not available');
    }

    const challengeJson = base64urlDecode(challengeB64);
    const challenge: Challenge = JSON.parse(challengeJson);
    const signingString = buildSigningString(challenge);
    const message = new TextEncoder().encode(signingString);

    if (!this.walletInstance.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    const { signature } = await this.walletInstance.signMessage(message, 'utf8');

    return {
      signature: bs58.encode(signature),
      address: this.walletInstance.publicKey.toBase58()
    };
  }

  async authenticate(options: AuthOptions): Promise<Response> {
    const method = options.method || 'GET';
    const headers = { ...options.headers };

    const response1 = await fetch(options.resource, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response1.status !== 403) {
      return response1;
    }

    const wwwAuth = response1.headers.get('WWW-Authenticate');
    if (!wwwAuth || !wwwAuth.startsWith('WebX403')) {
      return response1;
    }

    const parsed = parseWWWAuthenticate(wwwAuth);
    if (!parsed) {
      throw new Error('Failed to parse challenge');
    }

    if (!this.walletInstance) {
      await this.connect(options.wallet);
    }

    const signed = await this.signChallenge(parsed.challenge);

    const challengeJson = base64urlDecode(parsed.challenge);
    const challenge: Challenge = JSON.parse(challengeJson);

    const nonce = generateNonce();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const bind = `${challenge.method}:${challenge.path}`;

    const authHeader = `WebX403 addr="${signed.address}", sig="${signed.signature}", challenge="${parsed.challenge}", ts="${ts}", nonce="${nonce}", bind="${bind}"`;

    const response2 = await fetch(options.resource, {
      method,
      headers: {
        ...headers,
        'Authorization': authHeader
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    return response2;
  }

  getAddress(): string {
    return this.walletInstance?.publicKey?.toBase58() || '';
  }

  disconnect(): void {
    if (this.walletInstance && (this.walletInstance as any).disconnect) {
      (this.walletInstance as any).disconnect();
    }
    this.walletInstance = undefined;
  }
}

export async function detectWallets(): Promise<WalletProvider[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  const wallets: WalletProvider[] = [];
  if (window.phantom?.solana || window.solana) wallets.push('phantom');
  if (window.backpack) wallets.push('backpack');
  if (window.solflare) wallets.push('solflare');

  return wallets;
}

export { base64urlEncode, base64urlDecode, buildSigningString };
