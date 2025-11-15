# webx403-client — Python SDK

Lightweight **Python client** for authenticating with **WebX403**-protected APIs using Solana wallets.

---

## 🚀 Installation

```bash
pip install webx403-client
# or
poetry add webx403-client
```

---

## ⚡ Quick Start

```python
import asyncio
from nacl.signing import SigningKey
import base58
from webx403_client import WebX403Client


async def main():
    # Generate or load signing key (use secure storage in production)
    signing_key = SigningKey.generate()
    public_key = base58.b58encode(bytes(signing_key.verify_key)).decode()
    print(f"Wallet address: {public_key}")

    # Initialize client
    async with WebX403Client(signing_key) as client:
        # Authenticate against protected API
        result = await client.authenticate(
            resource="https://api.example.com/protected",
            method="GET",
        )

        if result.ok and result.response:
            data = await result.response.json()
            print("✅ Authenticated:", data)
        else:
            print("❌ Authentication failed:", result.error)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🧩 API Overview

### `WebX403Client(signing_key: SigningKey)`

Authenticate any Python-based agent or service using a Solana wallet key.

**Key Methods:**

| Method                                                          | Description                             |
| --------------------------------------------------------------- | --------------------------------------- |
| `authenticate(resource, method='GET', headers=None, body=None)` | Authenticates and executes a request    |
| `create_challenge(resource, method)`                            | Returns the authentication challenge    |
| `sign_challenge(challenge)`                                     | Signs the challenge with the wallet key |

---

## 📚 Documentation

* [**Usage Examples → Python Client**](../../USAGE_EXAMPLES.md#4-python-client)
* [**Protocol Specification**](../../docs/SPEC.md)
* [**Security Guide**](../../SECURITY.md)

---

## 🪪 License

[MIT](../../LICENSE)

