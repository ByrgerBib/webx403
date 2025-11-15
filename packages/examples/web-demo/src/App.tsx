import { useState } from 'react';
import { WebX403Client } from 'webx403-client';

function App() {
  const [client] = useState(() => new WebX403Client());
  const [address, setAddress] = useState<string>();
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const authenticate = async (wallet: 'phantom' | 'backpack' | 'solflare') => {
    setLoading(true);
    setError(undefined);
    
    try {
      await client.connect(wallet);
      
      const result = await client.authenticate({
        resource: 'http://localhost:3000/api/profile',
        method: 'GET'
      });
      
      if (result.ok) {
        setAddress(result.address);
        const responseData = await result.response?.json();
        setData(responseData);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>WebX403 Web Demo</h1>
      
      {!address ? (
        <div>
          <p>Connect your Solana wallet to authenticate:</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => authenticate('phantom')} disabled={loading}>
              {loading ? 'Connecting...' : 'Phantom'}
            </button>
            <button onClick={() => authenticate('backpack')} disabled={loading}>
              Backpack
            </button>
            <button onClick={() => authenticate('solflare')} disabled={loading}>
              Solflare
            </button>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      ) : (
        <div>
          <h2>✅ Authenticated!</h2>
          <p><strong>Wallet:</strong> {address}</p>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
