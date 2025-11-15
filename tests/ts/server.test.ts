import { describe, it, expect, beforeEach } from 'vitest';
import {
  createChallenge,
  verifyAuthorization,
  createWebX403,
  InMemoryReplayStore,
  utils
} from '../packages/ts-server/src/index';

describe('createChallenge', () => {
  const config = {
    issuer: 'test-server',
    audience: 'https://api.example.com',
    ttlSeconds: 60,
    bindMethodPath: true,
    originBinding: true
  };

  it('should create a valid challenge', () => {
    const { headerValue, challengeJson } = createChallenge('GET', '/protected', config);

    expect(headerValue).toContain('WebX403');
    expect(headerValue).toContain('realm="test-server"');
    expect(headerValue).toContain('version="1"');
    expect(headerValue).toContain('challenge="');

    expect(challengeJson.v).toBe(1);
    expect(challengeJson.alg).toBe('ed25519-solana');
    expect(challengeJson.aud).toBe('https://api.example.com');
    expect(challengeJson.method).toBe('GET');
    expect(challengeJson.path).toBe('/protected');
    expect(challengeJson.serverId).toBe('test-server');
  });

  it('should include nonce and timestamps', () => {
    const { challengeJson } = createChallenge('GET', '/protected', config);

    expect(challengeJson.nonce).toBeTruthy();
    expect(challengeJson.ts).toBeTruthy();
    expect(challengeJson.exp).toBeTruthy();

    const expTime = new Date(challengeJson.exp);
    const now = new Date(challengeJson.ts);
    const diff = (expTime.getTime() - now.getTime()) / 1000;

    expect(diff).toBeCloseTo(60, 0);
  });

  it('should set binding flags', () => {
    const { challengeJson } = createChallenge('POST', '/api/data', config);

    expect(challengeJson.originBind).toBe(true);
    expect(challengeJson.uaBind).toBe(false);
  });
});

describe('InMemoryReplayStore', () => {
  let store: InMemoryReplayStore;

  beforeEach(() => {
    store = new InMemoryReplayStore();
  });

  it('should store and check nonces', async () => {
    const key = 'test-nonce-1';
    
    // Initially should not exist
    expect(await store.check(key, 60)).toBe(false);

    // Store it
    await store.store(key, 60);

    // Now should exist
    expect(await store.check(key, 60)).toBe(true);
  });

  it('should expire old nonces', async () => {
    const key = 'test-nonce-2';
    
    // Store with 0 TTL (immediately expired)
    await store.store(key, 0);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should be expired
    expect(await store.check(key, 0)).toBe(false);
  });

  it('should handle LRU eviction', async () => {
    // Note: This test would need to fill the store beyond maxSize
    // For now, just verify it doesn't crash
    for (let i = 0; i < 100; i++) {
      await store.store(`nonce-${i}`, 60);
    }

    expect(await store.check('nonce-99', 60)).toBe(true);
  });
});

describe('utils', () => {
  describe('base64urlEncode/Decode', () => {
    it('should encode and decode correctly', () => {
      const original = 'Hello, World!';
      const encoded = utils.base64urlEncode(original);
      const decoded = utils.base64urlDecode(encoded);

      expect(decoded).toBe(original);
    });

    it('should handle special characters', () => {
      const original = '{"test": "value+/="}';
      const encoded = utils.base64urlEncode(original);
      const decoded = utils.base64urlDecode(encoded);

      expect(decoded).toBe(original);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });

  describe('parseAuthorizationHeader', () => {
    it('should parse valid header', () => {
      const header = 'WebX403 addr="5Gv8...", sig="3kYz...", challenge="eyJ2...", ts="2025-11-05T10:30:00Z", nonce="X8p2..."';
      
      const params = utils.parseAuthorizationHeader(header);

      expect(params).toBeTruthy();
      expect(params?.addr).toBe('5Gv8...');
      expect(params?.sig).toBe('3kYz...');
      expect(params?.challenge).toBe('eyJ2...');
      expect(params?.ts).toBe('2025-11-05T10:30:00Z');
      expect(params?.nonce).toBe('X8p2...');
    });

    it('should return null for invalid header', () => {
      const header = 'Bearer token123';
      
      const params = utils.parseAuthorizationHeader(header);

      expect(params).toBeNull();
    });

    it('should return null if missing required fields', () => {
      const header = 'WebX403 addr="5Gv8..."';
      
      const params = utils.parseAuthorizationHeader(header);

      expect(params).toBeNull();
    });
  });

  describe('buildSigningString', () => {
    it('should build correct signing string', () => {
      const challenge = {
        v: 1,
        alg: 'ed25519-solana',
        nonce: 'test-nonce',
        ts: '2025-11-05T10:30:00Z',
        aud: 'https://api.example.com',
        method: 'GET',
        path: '/protected',
        uaBind: false,
        originBind: true,
        serverId: 'test-server',
        exp: '2025-11-05T10:31:00Z',
        ext: {}
      };

      const signingString = utils.buildSigningString(challenge);

      expect(signingString).toContain('WebX403 Challenge');
      expect(signingString).toContain('domain: https://api.example.com');
      expect(signingString).toContain('server: test-server');
      expect(signingString).toContain('nonce: test-nonce');
      expect(signingString).toContain('method: GET');
      expect(signingString).toContain('path: /protected');
      expect(signingString).toContain('payload:');
    });
  });
});

describe('createWebX403', () => {
  it('should create configured instance', () => {
    const webx = createWebX403({
      issuer: 'my-api',
      audience: 'https://api.example.com',
      ttlSeconds: 60
    });

    expect(webx.createChallenge).toBeDefined();
    expect(webx.verifyAuthorization).toBeDefined();
    expect(webx.middleware).toBeDefined();
    expect(webx.fastifyHook).toBeDefined();
  });

  it('should create challenge with config', () => {
    const webx = createWebX403({
      issuer: 'my-api',
      audience: 'https://api.example.com',
      ttlSeconds: 120
    });

    const { challengeJson } = webx.createChallenge('GET', '/test');

    expect(challengeJson.serverId).toBe('my-api');
    expect(challengeJson.aud).toBe('https://api.example.com');
  });
});

describe('verifyAuthorization', () => {
  const config = {
    issuer: 'test-server',
    audience: 'https://api.example.com',
    ttlSeconds: 60,
    clockSkewSeconds: 120
  };

  it('should reject invalid authorization header format', async () => {
    const result = await verifyAuthorization(
      'Bearer token123',
      'GET',
      '/protected',
      config
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid authorization header');
  });

  it('should reject expired challenge', async () => {
    // Create a challenge that's already expired
    const challenge = {
      v: 1,
      alg: 'ed25519-solana',
      nonce: 'test',
      ts: '2020-01-01T00:00:00Z',
      aud: 'https://api.example.com',
      method: 'GET',
      path: '/protected',
      uaBind: false,
      originBind: false,
      serverId: 'test-server',
      exp: '2020-01-01T00:01:00Z',
      ext: {}
    };

    const challengeB64 = utils.base64urlEncode(JSON.stringify(challenge));
    const authHeader = `WebX403 addr="test", sig="test", challenge="${challengeB64}", ts="2025-11-05T10:30:00Z", nonce="test"`;

    const result = await verifyAuthorization(
      authHeader,
      'GET',
      '/protected',
      config
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should reject wrong audience', async () => {
    const challenge = {
      v: 1,
      alg: 'ed25519-solana',
      nonce: 'test',
      ts: new Date().toISOString(),
      aud: 'https://wrong.com',
      method: 'GET',
      path: '/protected',
      uaBind: false,
      originBind: false,
      serverId: 'test-server',
      exp: new Date(Date.now() + 60000).toISOString(),
      ext: {}
    };

    const challengeB64 = utils.base64urlEncode(JSON.stringify(challenge));
    const authHeader = `WebX403 addr="test", sig="test", challenge="${challengeB64}", ts="${new Date().toISOString()}", nonce="test"`;

    const result = await verifyAuthorization(
      authHeader,
      'GET',
      '/protected',
      config
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('audience');
  });
});
