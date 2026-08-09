# Sova

Sova is a security gate for AI-driven accounts-payable workflows. It reads an untrusted email or invoice proposal, extracts the proposed payment, independently checks it against trusted vendor records and policy, then either allows execution or routes it to human review.

## What it demonstrates

- Email and PDF invoice intake with extracted payment evidence
- Canonical vendor-identity resolution from backend-owned records
- Verified-bank-account enforcement and human review for bank-detail changes
- Detection of prompt injection, hidden content, reply-to mismatches, identity conflicts, duplicate invoices, and payment anomalies
- Tamper-evident audit events, approval state controls, and replay protection
- A custom Attack Lab for composing a payment email and inspecting Sova's extraction and decision evidence

The payment executor and external bank/vendor verification are simulated for this prototype.

## Run locally

```bash
npm run setup
npm run dev
```

Open `http://127.0.0.1:3000`. Reset the deterministic demo data with:

```bash
npm run demo:reset
```

## Verify

```bash
npm run test
npm run test:integration
npm run test:playwright
npm run eval
npm run eval:holdout
npm run test:concurrency
```

The evaluation suites use local deterministic fixtures. Passing them demonstrates regression coverage; it is not a claim of universal fraud or prompt-injection detection.

## Demo flow

1. Open Inbox and process a normal vendor invoice to show a safe auto-execution.
2. Process an invoice with a changed bank account or hidden instruction to show a hold.
3. Open the approval queue and show the evidence, then approve or reject.
4. Open Audit Log to show the tamper-evident decision trail.
5. Use Attack Lab to edit a message and demonstrate the extracted proposal and policy signals.

For the full recording sequence and prototype limitations, see [DEMO.md](DEMO.md).
