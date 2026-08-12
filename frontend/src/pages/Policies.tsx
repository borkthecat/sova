import { useQueries } from '@tanstack/react-query';
import { LockKeyhole, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client';

const protectedPolicies = [
    ['Known vendor + unseen bank account', 'Always require human review'],
    ['Vendor bank-detail change', 'Always require human review and verified-account update'],
    ['Security evaluation unavailable', 'Never auto-execute'],
    ['Ambiguous vendor identity', 'Never auto-execute'],
];
const signals = [['Urgency signal', '5'], ['2x amount anomaly', '20'], ['3x amount anomaly', '30']];
const baselineVendors = ['vendor_apex', 'vendor_brightline', 'vendor_techspark'];

function formatAmount(value: number) {
    return `SGD ${value.toLocaleString()}`;
}

function getBaseline(vendor: any) {
    const amounts = (vendor?.paymentHistory ?? []).map((payment: any) => payment.amount).sort((a: number, b: number) => a - b);
    if (amounts.length === 0) return null;
    const midpoint = Math.floor(amounts.length / 2);
    const median = amounts.length % 2 === 0 ? (amounts[midpoint - 1] + amounts[midpoint]) / 2 : amounts[midpoint];
    return { min: amounts[0], max: amounts.at(-1), median, count: amounts.length };
}

function BaselineCard({ vendor }: { vendor: any }) {
    const baseline = getBaseline(vendor);
    const accounts = vendor?.verifiedAccounts?.map((account: any) => account.masked).join(', ');
    return <section style={{ border: '1px solid #E7E7E2', borderRadius: 9, padding: 14, background: '#fafaf8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}><strong>{vendor?.name ?? 'Loading vendor...'}</strong><span className={`badge ${baseline ? 'badge-blue' : 'badge-amber'}`}>{baseline ? `${baseline.count} payments` : 'Onboarding'}</span></div>
      {baseline ? <div style={{ display: 'grid', gap: 7, fontSize: 12 }}><div><small style={{ color: '#8A909E' }}>Normal payment range</small><strong style={{ display: 'block' }}>{formatAmount(baseline.min)} - {formatAmount(baseline.max)}</strong></div><div><small style={{ color: '#8A909E' }}>Historical median</small><strong style={{ display: 'block' }}>{formatAmount(baseline.median)}</strong></div><div><small style={{ color: '#8A909E' }}>Verified account</small><strong style={{ display: 'block' }}>{accounts || 'None'}</strong></div></div> : <div style={{ fontSize: 12, color: '#5B6270' }}><strong style={{ display: 'block', color: '#14161A', marginBottom: 4 }}>No payment baseline yet</strong>New vendors require human review until enough verified payment history exists. {accounts && <span>Verified account: {accounts}.</span>}</div>}
    </section>;
}

export default function PoliciesPage() {
    const vendorQueries = useQueries({ queries: baselineVendors.map((id) => ({ queryKey: ['vendor', id], queryFn: () => api.getVendor(id) })) });
    const vendors = vendorQueries.map((query) => query.data);

    return <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><SlidersHorizontal size={20} color="#6956C7"/>Policies</h1>
      <p style={{ color: '#8A909E' }}>Policy controls are backend-owned. Protected invariants cannot be disabled by an approver.</p>

      <div className="card" style={{ marginTop: 22 }}><h2 style={{ fontSize: 15, display: 'flex', gap: 7, alignItems: 'center' }}><LockKeyhole size={16} color="#B54A3A"/>Protected invariants</h2>{protectedPolicies.map(([name, description]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E7E7E2', padding: '13px 0', gap: 18 }}><div><strong>{name}</strong><div style={{ color: '#8A909E', fontSize: 12 }}>{description}</div></div><span className="badge badge-red">Locked</span></div>)}</div>

      <div className="card" style={{ marginTop: 14 }}><h2 style={{ fontSize: 15 }}>Tunable signal thresholds</h2>{signals.map(([name, value]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E7E7E2', padding: '13px 0' }}><span>{name}</span><span className="monospace">Severity {value}</span></div>)}</div>

      <div className="card" style={{ marginTop: 14, borderColor: '#cddcfb' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}><div><h2 style={{ fontSize: 15, marginBottom: 4 }}>Financial behaviour baselines</h2><p style={{ color: '#8A909E', fontSize: 12, margin: 0 }}>Trusted historical ranges used by Sova to evaluate payment anomalies.</p></div><span className="badge badge-blue">Policy-backed</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>{vendors.map((vendor, index) => <BaselineCard key={baselineVendors[index]} vendor={vendor}/>)}</div><div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid #E7E7E2', color: '#5B6270', fontSize: 12 }}>Sova raises a moderate signal above 2x the historical median and a high-severity signal above 3x.</div></div>
      <p style={{ color: '#8A909E', fontSize: 12, marginTop: 14 }}>Baseline changes should be made only through a controlled vendor-management workflow with an audit record and role-based approval. The demo deliberately keeps this policy view read-only.</p>
    </div>;
}
