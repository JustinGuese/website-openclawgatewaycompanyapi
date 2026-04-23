---
title: TypeScript Example
description: A complete TypeScript client using fetch and viem.
---

# TypeScript Example

This example demonstrates how to call an AgentBureau endpoint using `fetch` and handle the blockchain transaction using `viem`.

```typescript
import { createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Configuration
const PRIVATE_KEY = '0x...';
const API_URL = 'https://agentbureau-api.datafortress.cloud/v1/fax';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const account = privateKeyToAccount(PRIVATE_KEY);
const client = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

async function sendFax() {
  const payload = {
    recipient: '+49123456789',
    content: 'Hello from TypeScript!',
  };

  // 1. Initial Call (Expect 402)
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 402) {
    const paymentRequired = response.headers.get('PAYMENT-REQUIRED');
    // Simplified parsing logic
    const walletMatch = paymentRequired?.match(/receiver=([^;]+)/);
    const amountMatch = paymentRequired?.match(/amount=([^;]+)/);

    if (!walletMatch || !amountMatch) throw new Error('Invalid payment header');

    const receiver = walletMatch[1] as `0x${string}`;
    const amount = BigInt(amountMatch[1]);

    console.log(`Payment Required: ${amount} raw units to ${receiver}`);

    // 2. Send USDC
    const hash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
      functionName: 'transfer',
      args: [receiver, amount],
    });

    console.log(`Transaction sent: ${hash}. Waiting for confirmation...`);

    // 3. Retry with Tx-Hash (Wait a few seconds for indexing)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const finalResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-SIGNATURE': hash,
      },
      body: JSON.stringify(payload),
    });

    console.log(await finalResponse.json());
  }
}

sendFax();
```

