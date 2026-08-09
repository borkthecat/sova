import { LockKeyhole, SlidersHorizontal } from 'lucide-react';
const protectedPolicies = [
    ['Known vendor + unseen bank account', 'Always require human review'],
    ['Vendor bank-detail change', 'Always require human review and verified-account update'],
    ['Security evaluation unavailable', 'Never auto-execute'],
    ['Ambiguous vendor identity', 'Never auto-execute'],
];
const signals = [['Urgency signal', '5'], ['2× amount anomaly', '20'], ['3× amount anomaly', '30']];
export default function PoliciesPage() {
    return <div style={{ padding: '32px', maxWidth: '900px' }}><h1 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><SlidersHorizontal size={20} color="#6956C7"/>Policies</h1><p style={{ color: '#8A909E' }}>Policy controls are backend-owned. Protected invariants cannot be disabled by an approver.</p>
    <div className="card" style={{ marginTop: 22 }}><h2 style={{ fontSize: 15, display: 'flex', gap: 7, alignItems: 'center' }}><LockKeyhole size={16} color="#B54A3A"/>Protected invariants</h2>{protectedPolicies.map(([name, description]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E7E7E2', padding: '13px 0', gap: 18 }}><div><strong>{name}</strong><div style={{ color: '#8A909E', fontSize: 12 }}>{description}</div></div><span className="badge badge-red">Locked</span></div>)}</div>
    <div className="card" style={{ marginTop: 14 }}><h2 style={{ fontSize: 15 }}>Tunable signal thresholds</h2>{signals.map(([name, value]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E7E7E2', padding: '13px 0' }}><span>{name}</span><span className="monospace">Severity {value}</span></div>)}<p style={{ color: '#8A909E', fontSize: 12, marginTop: 14 }}>Editable policy administration is intentionally not exposed in this local demo.</p></div>
  </div>;
}
