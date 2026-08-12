import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleAlert, FileCheck2, FlaskConical, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type DemoResult = {
    id: string;
    label: string;
    outcome: 'executed' | 'held' | 'blocked';
    result: any;
};

const SCENARIOS = [
    { id: 'email-apex-normal', label: 'Verified invoice', outcome: 'executed' as const },
    { id: 'email-apex-attack', label: 'Concealed bank-change attack', outcome: 'held' as const },
    { id: 'email-apex-large-payment', label: 'High-value anomaly', outcome: 'held' as const },
    { id: 'email-apex-duplicate', label: 'Duplicate invoice replay', outcome: 'blocked' as const },
];

function formatMoney(amount?: number) {
    return amount ? `SGD ${amount.toLocaleString()}` : 'Payment details unavailable';
}

function DecisionReceipt({ item }: { item: DemoResult }) {
    const action = item.result.action;
    const guard = item.result.agentGuardResult ?? {};
    const signals = [...(guard.contentSignals ?? []), ...(guard.behavioralSignals ?? []), ...(guard.systemSignals ?? [])];
    const held = item.outcome !== 'executed';
    const duplicate = item.outcome === 'blocked';
    const proposedBank = action?.bankAccount ?? action?.proposedBankAccount;
    const checks = duplicate ? ['Duplicate or replay detected'] : [...(guard.hardPoliciesTriggered ?? []).map((policy: string) => policy.replaceAll('_', ' ')), ...signals.map((signal: any) => signal.title)].slice(0, 3);

    return <article className={`decision-receipt ${held ? 'decision-receipt-hold' : 'decision-receipt-allow'}`}>
      <div className="decision-receipt-topline">
        <div><span className="sova-eyebrow">Decision receipt</span><h3>{item.label}</h3></div>
        <span className={`badge ${held ? 'badge-amber' : 'badge-green'}`}>{held ? item.outcome === 'blocked' ? 'Blocked' : 'Held for review' : 'Executed'}</span>
      </div>
      <div className="receipt-grid">
        <div><small>AI proposed</small><strong>{formatMoney(action?.amount)}</strong><span>{action?.vendorName ?? 'Unknown vendor'} · {proposedBank ? `••••${proposedBank.slice(-4)}` : 'bank update'}</span></div>
        <div><small>Trusted evidence</small><strong>{duplicate ? 'Replay matched an existing payment' : held ? 'Independent verification required' : 'Vendor and bank record matched'}</strong><span>{duplicate ? 'No second payment is created from the same invoice.' : held ? 'Email content cannot change financial identity.' : 'Known financial identity allowed execution.'}</span></div>
        <div><small>Sova decision</small><strong>{duplicate ? 'Replay blocked' : `Risk ${guard.riskScore ?? 0}`}</strong><span>{duplicate ? 'NO NEW EXECUTION' : guard.decision ?? (held ? 'REQUIRE APPROVAL' : 'ALLOW')}</span></div>
      </div>
      {checks.length > 0 && <div className="receipt-checks"><span>What changed</span>{checks.map((check: string) => <b key={check}>{check}</b>)}</div>}
      <p className="receipt-counterfactual">{duplicate ? 'This request matched a payment already recorded by Sova, so it could not create a second execution.' : guard.counterfactual}</p>
    </article>;
}

export default function DemoRunPage() {
    const [results, setResults] = useState<DemoResult[]>([]);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();
    const runScenario = async () => {
        setRunning(true);
        setError('');
        setResults([]);
        const nextResults: DemoResult[] = [];
        try {
            for (const scenario of SCENARIOS) {
                const result = await api.processEmail(scenario.id);
                nextResults.push({ ...scenario, result });
                setResults([...nextResults]);
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['stats'] }),
                queryClient.invalidateQueries({ queryKey: ['approvals'] }),
            ]);
        } catch (err: any) {
            setError(err.message ?? 'The guided scenario could not complete.');
        } finally {
            setRunning(false);
        }
    };
    const impact = useMemo(() => {
        const protectedAmount = results.filter((item) => item.outcome !== 'executed').reduce((sum, item) => sum + (item.result.action?.amount ?? 0), 0);
        return { protectedAmount, protectedCount: results.filter((item) => item.outcome !== 'executed').length };
    }, [results]);

    return <div className="sova-page demo-run-page">
      <header className="demo-run-hero">
        <div><span className="sova-eyebrow">Guided demo</span><h1>The AI proposes. Sova verifies.</h1><p>One live run proves that legitimate work continues while untrusted changes are contained before money moves.</p></div>
        <button className="btn-primary demo-run-button" onClick={runScenario} disabled={running}><Play size={15} fill="currentColor"/>{running ? `Running ${results.length + 1} of ${SCENARIOS.length}` : 'Run guided scenario'}</button>
      </header>
      <section className="demo-steps" aria-label="Guided scenario steps">{SCENARIOS.map((scenario, index) => {
          const completed = results.some((result) => result.id === scenario.id);
          return <div key={scenario.id} className={completed ? 'demo-step complete' : 'demo-step'}><span>{completed ? <CheckCircle2 size={15}/> : index + 1}</span><strong>{scenario.label}</strong>{index < SCENARIOS.length - 1 && <ArrowRight size={14}/>}</div>;
      })}</section>
      {error && <div className="error-box">{error}</div>}
      {results.length > 0 && <section className="impact-panel"><div className="impact-icon"><ShieldCheck size={22}/></div><div><span className="sova-eyebrow">Live impact</span><h2>{impact.protectedCount} risky actions contained before execution</h2><p>{formatMoney(impact.protectedAmount)} was protected from unverified execution in this scenario. Every decision is recorded in the tamper-evident audit chain.</p></div><div className="impact-metrics"><div><strong>{results.length}</strong><span>actions analyzed</span></div><div><strong>{impact.protectedCount}</strong><span>reviewed or blocked</span></div></div></section>}
      <section className="receipts-section"><div className="section-heading"><div><span className="sova-eyebrow">Explainable controls</span><h2>Decision receipts</h2><p>Each receipt separates the AI's proposed action from the trusted evidence Sova used to decide.</p></div>{results.length === 0 && <FileCheck2 size={25} color="#1061fe"/>}</div>{results.map((item) => <DecisionReceipt key={item.id} item={item}/>)}</section>
      {results.length === SCENARIOS.length && !running && <section className="demo-finale"><div><Sparkles size={18} color="#6956c7"/><div><h2>Finish with a live adversarial test</h2><p>Open Attack Lab, change the message yourself, and show that Sova still produces a decision receipt from real evidence.</p></div></div><Link className="btn-ghost" to="/attack-lab"><FlaskConical size={14}/>Open Attack Lab</Link></section>}
      {results.length === 0 && <section className="demo-empty"><CircleAlert size={20}/><p>Run the scenario to build the evidence trail used in your final hackathon walkthrough.</p></section>}
    </div>;
}
