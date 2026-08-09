# Sova demo guide

## Start the demo

From this folder, run `npm run dev:backend` in one terminal and `npm run dev:frontend` in another. Open `http://localhost:3000`.

## A clear 3-minute recording flow

1. Start on **Overview**. Introduce Sova as the safety layer between an AI agent's proposed financial action and execution.
2. Open **Inbox** and select **Attack: Prompt Injection + Bank Change**. Explain that hidden instructions try to bypass controls while the invoice requests a bank change.
3. Select **Process with Agent**. Point out manipulation signals, the new-bank-account hard policy, and the held status. No payment was executed.
4. Open **Approvals**, expand the held action, and use **Reject** to demonstrate the human control point.
5. Open **Audit log** and show the verified, tamper-evident chain.
6. Return to **Inbox**, select **Normal Payment**, and process it. Contrast safe automatic execution with the blocked attack.
7. Optional: use **Attack lab** to alter a preset amount or bank account and run the same decision pipeline.

## Extended reliability sequence

1. Reset with `npm run demo:reset` so the result is deterministic.
2. Process **Normal Payment**, then process **Duplicate Invoice Replay**. Explain that Sova returns the original action and does not create a second payment.
3. Process **Vendor ID Confusion Attack**. The agent claims the wrong trusted vendor ID while the sender maps to Apex; Sova holds it because trusted identity facts conflict.
4. Process **Bank Detail Update Request**, open **Approvals**, and approve it. Then open **Vendors** to show the newly verified masked account. Explain that the email did not update the vendor master; the authorised approval did.
5. Open **Policies** and show that financial-identity and identity-ambiguity invariants are locked rather than being risk-score settings.
6. In **Approvals**, expand the prompt-injection attack to show visible source content separately from hidden/injected content.
7. If asked about reliability, run `npm run test:concurrency`, `npm run eval`, and `npm run eval:holdout` and explain exactly what each suite proves.

## Claims that are safe to make

- Sova validates payment proposals, applies deterministic source and behavioural signals, requires review for a known vendor's new bank account, and records decisions in a tamper-evident audit chain.
- This is a local demonstration: payments, users, vendor data, and transactions are simulated.

## Not included in this prototype

- Production identity, role management, secrets management, or multi-tenant isolation.
- Live email, ERP/accounting, banking, vendor-verification, or LLM integrations.
- Production deployment, monitoring, backups, rate limiting, or an independent security review.
- A guarantee that every fraud or prompt-injection technique will be detected.

## Verification commands

```bash
npm run test
npm run test:integration
npm run test:playwright
npm run eval
npm run eval:holdout
npm run test:concurrency
```

Run `npm run setup` once to install packages, create the local SQLite database, and seed the demo data.
