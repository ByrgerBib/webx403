import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebX403Client } from '../packages/ts-client/src/index';

describe('WebX403Client', () => {
  let client: WebX403Client;

  beforeEach(() => {
    client = new WebX403Client();
    
    // Mock window.solana for testing
    global.window = {
      solana: {
        publicKey: {
          toBase58: () => '5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR'
        },
        isConnected: true,
        signMessage: vi.fn(async (message: Uint8Array) => {
          return {
            signature: new Uint8Array(64).fill(1) // Mock signature
          };
        })
      }
    } as any;
  });

  describe('connect', () => {
    it('should connect to phantom wallet', async () => {
      await expect(client.connect('phantom')).resolves.not.toThrow();
    });

    it('should throw error if wallet not found', async () => {
      global.window = {} as any;
      await expect(client.connect('phantom')).rejects.toThrow();
    });
  });

  describe('signChallenge', () => {
    it('should sign a challenge', async () => {
      await client.connect('phantom');
      
      const challenge = btoa(JSON.stringify({
        v: 1,
        alg: 'ed25519-solana',
        nonce: 'test-nonce',
        ts: '2025-11-05T10:30:00Z',
        aud: 'https://api.example.com',
        method: 'GET',
        path: '/protected',
        uaBind: false,
        originBind: true,
        serverId: 'test',
        exp: '2025-11-05T10:31:00Z',
        ext: {}
      }));

      const result = await client.signChallenge(challenge);
      
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('address');
      expect(result.address).toBe('5Gv8q5tGXPDwPM4x8Zhqrz5kQr5yL8m9z3K8fD6tY8hR');
    });
  });

  describe('authenticate', () => {
    it('should handle 403 challenge and retry', async () => {
      await client.connect('phantom');
      
      const mockFetch = vi.fn()
        // First call returns 403 with challenge
        .mockResolvedValueOnce({
          status: 403,
          ok: false,
          headers: new Map([
            ['WWW-Authenticate', 'WebX403 realm="test", version="1", challenge="eyJ2IjoxfQ"']
          ])
        })
        // Second call returns 200
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({ success: true })
        });

      global.fetch = mockFetch as any;

      const result = await client.authenticate({
        resource: 'https://api.example.com/protected'
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return response if not 403', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ data: 'public' })
      });

      global.fetch = mockFetch as any;

      const result = await client.authenticate({
        resource: 'https://api.example.com/public'
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('detectWallets', () => {
  it('should detect installed wallets', async () => {
    const { detectWallets } = await import('../packages/ts-client/src/index');
    
    global.window = {
      solana: {},
      phantom: { solana: {} }
    } as any;

    const wallets = await detectWallets();
    expect(wallets).toContain('phantom');
  });

  it('should return empty array if no wallets', async () => {
    const { detectWallets } = await import('../packages/ts-client/src/index');
    
    global.window = {} as any;

    const wallets = await detectWallets();
    expect(wallets).toEqual([]);
  });
});
