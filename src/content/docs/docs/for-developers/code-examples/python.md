---
title: Python Example
description: A complete Python client using httpx and web3.py.
---

# Python Example

This example demonstrates how to call an AgentBureau endpoint, handle the `402 Payment Required` response, send USDC on Base, and retry the request.

```python
import httpx
from web3 import Web3
import time

# Configuration
RPC_URL = "https://mainnet.base.org"
USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
PRIVATE_KEY = "your_private_key_here"
API_URL = "https://agentbureau-api.datafortress.cloud/v1/fax"

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

# 1. Initial Call (Expect 402)
payload = {
    "recipient": "+49123456789",
    "content": "Hello from Python!"
}

response = httpx.post(API_URL, json=payload)

if response.status_code == 402:
    payment_link = response.headers.get("PAYMENT-LINK")
    # Format: ethereum:0xWalletAddress@8453/transfer?address=0xUSDC&uint256=AmountRaw
    
    # Extract details (simplified parsing)
    wallet_address = response.headers.get("PAYMENT-REQUIRED").split("=")[1].split(";")[0]
    amount_raw = int(response.headers.get("PAYMENT-REQUIRED").split("=")[2])
    
    print(f"Payment Required: {amount_raw} raw units to {wallet_address}")

    # 2. Send USDC
    usdc_abi = [{"constant":False,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]
    usdc_contract = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi)
    
    nonce = w3.eth.get_transaction_count(account.address)
    tx = usdc_contract.functions.transfer(wallet_address, amount_raw).build_transaction({
        'chainId': 8453,
        'gas': 100000,
        'gasPrice': w3.eth.gas_price,
        'nonce': nonce,
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction).hex()
    
    print(f"Transaction sent: {tx_hash}. Waiting for confirmation...")
    
    # 3. Wait for confirmation
    w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # 4. Retry with Tx-Hash
    final_response = httpx.post(
        API_URL, 
        json=payload, 
        headers={"PAYMENT-SIGNATURE": tx_hash}
    )
    
    print(final_response.json())
else:
    print(f"Unexpected status: {response.status_code}")
```

