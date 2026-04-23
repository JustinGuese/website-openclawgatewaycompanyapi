---
title: cURL & Bash Example
description: Using curl and Foundry's cast for command-line interactions.
---

# cURL & Bash Example

This script demonstrates how to use `curl` for HTTP requests and Foundry's `cast` for interacting with the Base network.

```bash
#!/bin/bash

# Configuration
RPC_URL="https://mainnet.base.org"
USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
PRIVATE_KEY="your_private_key_here"
API_URL="https://agentbureau-api.datafortress.cloud/v1/fax"

PAYLOAD='{"recipient": "+49123456789", "content": "Hello from cURL!"}'

# 1. Initial Call (Expect 402)
RESPONSE=$(curl -s -i -X POST $API_URL \
     -H "Content-Type: application/json" \
     -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP | awk '{print $2}')

if [ "$HTTP_STATUS" -eq 402 ]; then
    # Extract receiver and amount from PAYMENT-REQUIRED header
    PAYMENT_HEADER=$(echo "$RESPONSE" | grep -i "PAYMENT-REQUIRED")
    RECEIVER=$(echo "$PAYMENT_HEADER" | sed -n 's/.*receiver=\([^;]*\);.*/\1/p')
    AMOUNT=$(echo "$PAYMENT_HEADER" | sed -n 's/.*amount=\([^;]*\);.*/\1/p')

    echo "Payment Required: $AMOUNT raw units to $RECEIVER"

    # 2. Send USDC using cast
    TX_HASH=$(cast send $USDC_ADDRESS "transfer(address,uint256)" $RECEIVER $AMOUNT \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        --json | jq -r '.transactionHash')

    echo "Transaction sent: $TX_HASH. Waiting for confirmation..."
    sleep 5

    # 3. Retry with Tx-Hash
    curl -X POST $API_URL \
         -H "Content-Type: application/json" \
         -H "PAYMENT-SIGNATURE: $TX_HASH" \
         -d "$PAYLOAD"
else
    echo "Unexpected status: $HTTP_STATUS"
fi
```

