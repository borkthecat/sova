import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
function OutcomeBadge({ eventType }: {
    eventType: string;
}) {
    if (eventType === 'PAYMENT_EXECUTED')
        return <span className="badge badge-green">Executed</span>;
    if (eventType === 'HUMAN_REJECTED')
        return <span className="badge badge-red">Rejected</span>;
    if (eventType === 'HELD_FOR_REVIEW')
        return <span className="badge badge-amber">Held</span>;
    if (eventType === 'HUMAN_APPROVED')
        return <span className="badge badge-blue">Approved</span>;
    if (eventType === 'PROPOSAL_RECEIVED')
        return <span className="badge badge-gray">Received</span>;
    if (eventType === 'EVALUATION_COMPLETE')
        return <span className="badge badge-purple">Evaluated</span>;
    return <span className="badge badge-gray">{eventType.replace(/_/g, ' ')}</span>;
}
export default function AuditLogPage() {
    const [showAll, setShowAll] = useState(false);
    const { data: entries, isLoading } = useQuery({ queryKey: ['audit'], queryFn: () => api.getAuditLog(), refetchInterval: 10000 });
    const { data: verify } = useQuery({ queryKey: ['audit-verify'], queryFn: api.verifyAudit, refetchInterval: 10000 });
    const displayEntries = showAll ? entries : entries?.slice(0, 50);
    return (<div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#1061FE"/>
            Audit Log
          </h1>
          <p style={{ color: '#8A909E', fontSize: '13px', margin: 0 }}>
            Tamper-evident append-only log of all Sova decisions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {verify && (<div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: verify.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${verify.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                fontSize: '12px',
                color: verify.valid ? '#34d399' : '#f87171',
            }}>
              {verify.valid ? <ShieldCheck size={13}/> : <ShieldAlert size={13}/>}
              {verify.valid ? `Integrity Verified (${verify.entries} entries)` : 'Chain Broken!'}
            </div>)}
          <a href="/api/audit/export.csv" download style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa',
            fontSize: '12px',
            textDecoration: 'none',
        }}>
            <Download size={12}/>
            Export CSV
          </a>
        </div>
      </div>

      {isLoading && <div className="loading"><div className="spinner"/></div>}

      {entries && entries.length === 0 && (<div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
          No audit entries yet. Process some emails to generate entries.
        </div>)}

      {displayEntries && displayEntries.length > 0 && (<div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 140px 100px 120px',
                gap: '0',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#475569',
            }}>
            <div>Time</div>
            <div>Event</div>
            <div>Vendor</div>
            <div>Risk</div>
            <div>Decision</div>
          </div>

          {displayEntries.map((entry: any, i: number) => (<div key={entry.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 140px 100px 120px',
                    gap: '0',
                    padding: '10px 16px',
                    borderBottom: i < displayEntries.length - 1 ? '1px solid #f0f0ec' : 'none',
                    fontSize: '12px',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                }} onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2EF')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ color: '#8A909E', fontSize: '11px' }}>
                {new Date(entry.createdAt).toLocaleTimeString()}
              </div>
              <div>
                <OutcomeBadge eventType={entry.eventType}/>
              </div>
              <div style={{ color: '#5B6270' }}>
                {entry.action?.vendorId?.replace('vendor_', '') ?? '—'}
              </div>
              <div style={{ color: '#8A909E' }}>
                {entry.action?.riskScore > 0 ? entry.action.riskScore : '—'}
              </div>
              <div>
                {entry.action?.decision === 'ALLOW' && <span style={{ color: '#34d399', fontSize: '11px' }}>ALLOW</span>}
                {entry.action?.decision === 'REQUIRE_APPROVAL' && <span style={{ color: '#fbbf24', fontSize: '11px' }}>HOLD</span>}
                {!entry.action?.decision && <span style={{ color: '#475569', fontSize: '11px' }}>—</span>}
              </div>
            </div>))}
        </div>)}

      {entries && entries.length > 50 && (<div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button className="btn-ghost" onClick={() => setShowAll(!showAll)} style={{ fontSize: '12px' }}>
            {showAll ? 'Show less' : `Show all ${entries.length} entries`}
          </button>
        </div>)}
    </div>);
}
