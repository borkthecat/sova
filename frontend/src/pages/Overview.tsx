import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Clock3, Play, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
function Metric({ label, value, note, tone }: {
    label: string;
    value: number | string;
    note: string;
    tone: string;
}) {
    return <div className="sova-metric"><div className="sova-metric-label"><span style={{ background: tone }}/>{label}</div><strong style={{ color: tone }}>{value}</strong><small>{note}</small></div>;
}
export default function Overview() {
    const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: api.getStats, refetchInterval: 5000 });
    const { data: approvals } = useQuery({ queryKey: ['approvals'], queryFn: api.getApprovals, refetchInterval: 5000 });
    const held = approvals?.filter((action: any) => action.status === 'PENDING_APPROVAL').slice(0, 4) ?? [];
    return <div className="sova-page sova-overview">
    <div className="sova-page-header"><div><h1>Overview</h1><p>Sova monitors AI-proposed financial actions and holds suspicious transactions before execution.</p></div><div className="sova-header-actions"><Link className="btn-ghost" to="/inbox">Open inbox</Link><Link className="btn-primary" to="/approvals">Review {stats?.heldForReview ?? 0} held actions</Link></div></div>
    <section className="sova-demo-banner"><div><span className="sova-eyebrow">Hackathon demo</span><h2>Show the payment decision boundary in under a minute.</h2><p>Run a legitimate payment, a concealed bank-change attack, a high-value anomaly, and a duplicate replay through the live backend.</p></div><Link className="btn-primary" to="/demo-run"><Play size={14} fill="currentColor"/>Run guided scenario</Link></section>
    <section className="sova-kpis">
      <Metric label="Actions monitored" value={stats?.paymentsInspected ?? 0} note="All-time local demo" tone="#1061fe"/>
      <Metric label="Auto-executed" value={stats?.automaticallyExecuted ?? 0} note="Known financial identity" tone="#2e9963"/>
      <Metric label="Held for review" value={stats?.heldForReview ?? 0} note="Human decision required" tone="#d4761f"/>
      <Metric label="Rejected" value={stats?.rejected ?? 0} note="No payment executed" tone="#b54a3a"/>
      <Metric label="Audit integrity" value={stats?.auditIntegrity === 'VERIFIED' ? 'Verified' : 'Checking'} note={`${stats?.auditEntries ?? 0} recorded events`} tone="#6956c7"/>
    </section>
    <div className="sova-overview-grid">
      <section className="sova-panel"><div className="sova-panel-title"><span className="sova-status-dot"/>Actions requiring attention<Link to="/approvals">View queue</Link></div>{held.length ? held.map((action: any) => <Link className="sova-action-row" to="/approvals" key={action.id}><div><strong>{action.vendorName}</strong><small>{action.type.replaceAll('_', ' ')} · {action.currency} {action.amount?.toLocaleString()}</small></div><div><span className="badge badge-amber">Held</span><small>Risk {action.riskScore}</small></div></Link>) : <div className="sova-empty"><ShieldCheck size={20}/>No held actions. Protected workflows are clear.</div>}</section>
      <aside className="sova-panel sova-invariant"><div className="sova-panel-title">Protected invariant</div><h2>Financial identity cannot change from an email alone.</h2><p>Known vendor + unseen bank account always requires human review, regardless of the model’s confidence.</p><Link to="/policies">Inspect policies <ArrowRight size={14}/></Link></aside>
    </div>
    <section className="sova-panel sova-flow"><div className="sova-panel-title">Sova decision boundary</div><div><span>Untrusted content</span><ArrowRight /><span>AI proposal</span><ArrowRight /><strong>Sova verifies</strong><ArrowRight /><span>Execute or review</span></div><small>The AI can propose an action; it cannot authorize or execute one.</small></section>
    <section className="sova-panel sova-trust-card"><div><CheckCircle2 size={18} color="#2e9963"/><div><strong>Trusted evidence</strong><p>Vendor records, account fingerprints, payment history, approvals, and audit chain.</p></div></div><div><TriangleAlert size={18} color="#d4761f"/><div><strong>Untrusted evidence</strong><p>Email content, attachments, agent output, sender-provided details, and browser state.</p></div></div><div><Clock3 size={18} color="#1061fe"/><div><strong>Safe by default</strong><p>If trusted evaluation is unavailable, the action is held for review.</p></div></div></section>
  </div>;
}
