import React, { useState } from 'react';
import { createWalletClient, custom, parseAbi, publicActions } from 'viem';
import { base } from 'viem/chains';

const API_BASE = 'https://agentbureau-api.datafortress.cloud';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_HEX = '0x2105';

type EndpointId = 'fax' | 'invoice' | 'letter';

type Endpoint = {
  id: EndpointId;
  label: string;
  path: string;
  priceLabel: string;
  priceUnits: bigint;
  suggestedTool: string;
  payload: Record<string, unknown>;
  simSuccess: Record<string, unknown>;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: 'fax',
    label: 'Fax API',
    path: '/v1/fax',
    priceLabel: '1.00 USDC',
    priceUnits: 1_000_000n,
    suggestedTool: 'send_fax',
    payload: {
      recipient: '+49123456789',
      content: 'Hello from AgentBureau TypeScript Fax Example!',
    },
    simSuccess: {
      status: 'queued',
      id: 'fax_sim_a1b2c3',
      recipient: '+49123456789',
      pages: 1,
      eta_seconds: 30,
    },
  },
  {
    id: 'invoice',
    label: 'Invoice API',
    path: '/v1/invoices',
    priceLabel: '5.00 USDC',
    priceUnits: 5_000_000n,
    suggestedTool: 'send_german_invoice',
    payload: {
      customer_details: {
        name: 'Max Mustermann GmbH',
        address: 'Hauptstr. 1, 10115 Berlin',
        vat_id: 'DE123456789',
      },
      line_items: [
        { description: 'Consulting hours', quantity: 10, unit_price_eur: 150 },
      ],
    },
    simSuccess: {
      status: 'issued',
      invoice_id: 'inv_sim_xyz789',
      pdf_url: 'https://example.com/sim-invoice.pdf',
      total_eur: 1500,
    },
  },
  {
    id: 'letter',
    label: 'Letter API',
    path: '/v1/letters',
    priceLabel: '3.00 USDC',
    priceUnits: 3_000_000n,
    suggestedTool: 'send_letter',
    payload: {
      recipient_address: {
        name: 'Erika Musterfrau',
        street: 'Beispielweg 42',
        city: 'Munich',
        postal_code: '80331',
        country: 'DE',
      },
      content_pdf_url: 'https://example.com/letter.pdf',
    },
    simSuccess: {
      status: 'scheduled',
      tracking_id: 'ltr_sim_q9w8e7',
      estimated_delivery: '2026-05-04',
    },
  },
];

type Mode = 'sim' | 'live';

type Step =
  | { kind: 'request'; data: any }
  | { kind: '402'; data: any }
  | { kind: 'tx'; hash: string }
  | { kind: 'success'; data: any }
  | { kind: 'error'; message: string };

const fakeTxHash = () =>
  '0x' +
  Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function LivePlayground() {
  const [endpoint, setEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [mode, setMode] = useState<Mode>('sim');
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const pushStep = (s: Step) => setSteps((prev) => [...prev, s]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      pushStep({
        kind: 'error',
        message: 'No injected wallet detected. Install MetaMask or another EIP-1193 wallet.',
      });
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      const cid: string = await window.ethereum.request({ method: 'eth_chainId' });
      setAccount(accounts[0] as `0x${string}`);
      setChainId(parseInt(cid, 16));
    } catch (err: any) {
      pushStep({ kind: 'error', message: err?.message || 'Failed to connect wallet' });
    }
  };

  const switchToBase = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_HEX }],
      });
      setChainId(BASE_CHAIN_ID);
    } catch (err: any) {
      pushStep({ kind: 'error', message: err?.message || 'Failed to switch chain' });
    }
  };

  const runSimulated = async () => {
    pushStep({ kind: 'request', data: { method: 'POST', path: endpoint.path, body: endpoint.payload } });
    await sleep(700);
    pushStep({
      kind: '402',
      data: {
        status: 402,
        error: 'Payment Required',
        payment_link: `ethereum:${USDC_BASE}@${BASE_CHAIN_ID}/transfer?address=0x82064a8b3c4d5e6f7890a1b2c3d4e5f6789abcde&uint256=${endpoint.priceUnits.toString()}`,
        payment_nonce: `nonce_${Math.random().toString(36).slice(2, 8)}`,
        message: `x402 Challenge: Please send ${endpoint.priceLabel} to the vault on Base to execute this action.`,
        suggested_tool: endpoint.suggestedTool,
      },
    });
    await sleep(900);
    const hash = fakeTxHash();
    pushStep({ kind: 'tx', hash });
    await sleep(900);
    pushStep({ kind: 'success', data: endpoint.simSuccess });
  };

  const runLive = async () => {
    if (!window.ethereum) {
      pushStep({
        kind: 'error',
        message: 'No injected wallet detected. Install MetaMask or another EIP-1193 wallet.',
      });
      return;
    }
    if (chainId !== BASE_CHAIN_ID) {
      pushStep({
        kind: 'error',
        message: `Wrong network (chainId ${chainId}). Switch to Base (8453) and try again.`,
      });
      return;
    }

    const wallet = createWalletClient({
      account: account as `0x${string}`,
      chain: base,
      transport: custom(window.ethereum),
    }).extend(publicActions);

    const url = `${API_BASE}${endpoint.path}`;
    pushStep({ kind: 'request', data: { method: 'POST', url, body: endpoint.payload } });

    const initial = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(endpoint.payload),
    });

    if (initial.status !== 402) {
      const body = await initial.json().catch(() => ({}));
      if (initial.ok) {
        pushStep({ kind: 'success', data: body });
      } else {
        pushStep({ kind: 'error', message: `Unexpected status ${initial.status}: ${JSON.stringify(body)}` });
      }
      return;
    }

    const paymentRequired = initial.headers.get('PAYMENT-REQUIRED');
    const challengeJson = await initial.json().catch(() => ({}));
    pushStep({ kind: '402', data: { ...challengeJson, _header: paymentRequired } });

    if (!paymentRequired) {
      pushStep({ kind: 'error', message: 'Missing PAYMENT-REQUIRED header on 402 response.' });
      return;
    }

    const recvMatch = paymentRequired.match(/receiver=([^;]+)/);
    const amtMatch = paymentRequired.match(/amount=([^;]+)/);
    if (!recvMatch || !amtMatch) {
      pushStep({ kind: 'error', message: `Could not parse PAYMENT-REQUIRED: ${paymentRequired}` });
      return;
    }
    const receiver = recvMatch[1] as `0x${string}`;
    const amount = BigInt(amtMatch[1]);

    const hash = await wallet.writeContract({
      address: USDC_BASE,
      abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
      functionName: 'transfer',
      args: [receiver, amount],
    });
    pushStep({ kind: 'tx', hash });

    await wallet.waitForTransactionReceipt({ hash });

    const final = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-SIGNATURE': hash,
      },
      body: JSON.stringify(endpoint.payload),
    });
    const body = await final.json().catch(() => ({}));
    if (final.ok) {
      pushStep({ kind: 'success', data: body });
    } else {
      pushStep({ kind: 'error', message: `Retry failed (${final.status}): ${JSON.stringify(body)}` });
    }
  };

  const handleExecute = async () => {
    setSteps([]);
    setLoading(true);
    try {
      if (mode === 'sim') {
        await runSimulated();
      } else {
        await runLive();
      }
    } catch (err: any) {
      pushStep({ kind: 'error', message: err?.shortMessage || err?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const wrongChain = mode === 'live' && account && chainId !== null && chainId !== BASE_CHAIN_ID;

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50 flex-wrap gap-4">
        <div>
          <h3 className="text-white font-bold">Interactive API Playground</h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'sim'
              ? 'Simulated x402 protocol flow — no wallet, no payment.'
              : 'Live mode spends real USDC on Base mainnet.'}
          </p>
        </div>
        <div className="inline-flex rounded-md bg-slate-950 p-1 border border-slate-700">
          <button
            onClick={() => { setMode('sim'); setSteps([]); }}
            className={`px-3 py-1 text-xs font-semibold rounded ${mode === 'sim' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Simulated
          </button>
          <button
            onClick={() => { setMode('live'); setSteps([]); }}
            className={`px-3 py-1 text-xs font-semibold rounded ${mode === 'live' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Live (Wallet)
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Select Endpoint</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={endpoint.id}
            onChange={(e) =>
              setEndpoint(ENDPOINTS.find((ex) => ex.id === e.target.value) || ENDPOINTS[0])
            }
          >
            {ENDPOINTS.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.label} ({ex.path}) — {ex.priceLabel}
              </option>
            ))}
          </select>

          {mode === 'live' && (
            <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md text-sm">
              {!account ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-500"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-slate-300 font-mono text-xs">
                    {truncate(account)}
                  </div>
                  {wrongChain ? (
                    <button
                      onClick={switchToBase}
                      className="text-xs bg-yellow-500 text-slate-900 px-2 py-1 rounded font-bold"
                    >
                      Switch to Base
                    </button>
                  ) : (
                    <span className="text-xs text-green-400 font-mono">Base · 8453</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleExecute}
              disabled={loading || (mode === 'live' && !account)}
              className="w-full bg-white text-slate-900 font-bold py-3 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Running…' : 'Execute Request'}
            </button>
            {mode === 'live' && (
              <p className="text-[11px] text-slate-500 mt-2">
                You'll be asked to approve a USDC transfer of {endpoint.priceLabel} on Base.
              </p>
            )}
          </div>

          <div className="mt-6 p-4 bg-slate-800 rounded-md border border-slate-700">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Request Payload</p>
            <pre className="mt-2 text-sm text-green-400 overflow-x-auto whitespace-pre-wrap">
{`POST ${endpoint.path}
Content-Type: application/json

${JSON.stringify(endpoint.payload, null, 2)}`}
            </pre>
          </div>
        </div>

        <div className="flex flex-col h-full">
          <label className="block text-sm font-medium text-slate-400 mb-2">Flow</label>
          <div className="flex-grow bg-black rounded-md p-4 font-mono text-xs overflow-auto min-h-[300px] space-y-3">
            {steps.length === 0 ? (
              <p className="text-slate-600 italic">No request executed yet.</p>
            ) : (
              steps.map((step, i) => <StepCard key={i} step={step} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  switch (step.kind) {
    case 'request':
      return (
        <div className="border-l-2 border-slate-600 pl-3">
          <div className="text-slate-400 uppercase tracking-wider mb-1">1 · Request</div>
          <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(step.data, null, 2)}</pre>
        </div>
      );
    case '402':
      return (
        <div className="border-l-2 border-yellow-500 pl-3">
          <div className="text-yellow-400 uppercase tracking-wider mb-1">2 · 402 Payment Required</div>
          <pre className="text-yellow-200 whitespace-pre-wrap">{JSON.stringify(step.data, null, 2)}</pre>
        </div>
      );
    case 'tx':
      return (
        <div className="border-l-2 border-blue-500 pl-3">
          <div className="text-blue-400 uppercase tracking-wider mb-1">3 · USDC Transfer</div>
          <a
            href={`https://basescan.org/tx/${step.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:text-blue-200 break-all underline"
          >
            {step.hash}
          </a>
        </div>
      );
    case 'success':
      return (
        <div className="border-l-2 border-green-500 pl-3">
          <div className="text-green-400 uppercase tracking-wider mb-1">4 · Success</div>
          <pre className="text-green-200 whitespace-pre-wrap">{JSON.stringify(step.data, null, 2)}</pre>
        </div>
      );
    case 'error':
      return (
        <div className="border-l-2 border-red-500 pl-3">
          <div className="text-red-400 uppercase tracking-wider mb-1">Error</div>
          <p className="text-red-200 whitespace-pre-wrap">{step.message}</p>
        </div>
      );
  }
}
