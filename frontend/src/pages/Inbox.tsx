import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Paperclip, Play, CheckCircle, Clock, Eye, FileText } from 'lucide-react';
import { api } from '../api/client';
const SCENARIO_COLORS: Record<string, string> = {
    ALLOW: '#2E9963',
    REQUIRE_APPROVAL: '#D4761F',
};
function EmailRow({ email, onProcess }: {
    email: any;
    onProcess: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const handleProcess = async () => {
        setProcessing(true);
        try {
            const r = await onProcess(email.id);
            setResult(r);
        }
        finally {
            setProcessing(false);
        }
    };
    const scenarioColor = SCENARIO_COLORS[email.scenario] ?? '#5B6270';
    return (<div className="card fade-in" style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        
        <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: email.scenario === 'REQUIRE_APPROVAL' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Mail size={16} color={email.scenario === 'REQUIRE_APPROVAL' ? '#f87171' : '#60a5fa'}/>
        </div>

        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email.subject}
            </div>
            <span className="badge" style={{
            background: `${scenarioColor}20`,
            color: scenarioColor,
            border: `1px solid ${scenarioColor}40`,
            flexShrink: 0,
        }}>
              {email.label}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#8A909E' }}>From: {email.sender}</div>
          {email.attachment && <a href={email.attachment.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, color: '#1061fe', fontSize: 11.5, fontWeight: 600 }}><Paperclip size={13}/>{email.attachment.fileName}</a>}
        </div>

        
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn-ghost" onClick={() => setExpanded(!expanded)} style={{ padding: '6px 10px' }}>
            <Eye size={13}/>
          </button>
          {!result && (<button className="btn-primary" onClick={handleProcess} disabled={processing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
              {processing ? (<>
                  <div className="spinner"/>
                  <span>Processing...</span>
                </>) : (<>
                  <Play size={12}/>
                  <span>Process with Agent</span>
                </>)}
            </button>)}
          {result && (<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {result.agentGuardResult?.duplicate && <span className="badge badge-red">Duplicate blocked</span>}
              {result.agentGuardResult?.status === 'PENDING_APPROVAL' && (<span className="badge badge-amber">
                  <Clock size={10}/>
                  Held for Review
                </span>)}
              {result.agentGuardResult?.status === 'EXECUTED' && (<span className="badge badge-green">
                  <CheckCircle size={10}/>
                  Auto-Executed
                </span>)}
              {result.agentGuardResult?.status === 'REJECTED' && (<span className="badge badge-red">Rejected</span>)}
              <span style={{ fontSize: '11px', color: '#8A909E' }}>
                Risk: {result.agentGuardResult?.riskScore}
              </span>
            </div>)}
        </div>
      </div>

      
      {result && (<div style={{
                marginTop: '12px', padding: '14px 16px', borderRadius: '10px',
                background: result.agentGuardResult?.status === 'EXECUTED' ? '#edf8f2' : '#fff8ed',
                border: `1px solid ${result.agentGuardResult?.status === 'EXECUTED' ? '#cde7d7' : '#f2d4aa'}`,
            }}>
          <div style={{ fontSize: '11px', color: '#8A909E', marginBottom: '6px' }}>
            Agent extracted: <span style={{ color: '#3f4652', fontWeight: '600' }}>
              {result.action?.type} · {result.action?.vendorName} · SGD {result.action?.amount?.toLocaleString()} · ••••{result.action?.bankAccount?.slice(-4)}
            </span>
          </div>
          <div style={{ fontSize: '11px' }}>
            Sova: <span style={{ color: result.agentGuardResult?.status === 'EXECUTED' ? '#287e52' : '#9a6100', fontWeight: '700' }}>
              {result.agentGuardResult?.decision}
            </span>
            {result.agentGuardResult?.status === 'PENDING_APPROVAL' && (<a href="/approvals" style={{ marginLeft: '8px', color: '#60a5fa', fontSize: '11px' }}>
                View in Approvals →
              </a>)}
          </div>
        </div>)}

      
      {expanded && (<div style={{ marginTop: '12px', borderTop: '1px solid #E7E7E2', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#8A909E', marginBottom: '6px' }}>Email message</div>
          <pre style={{
                background: '#fafaf8',
                border: '1px solid #e7e7e2',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                color: '#5B6270',
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: 'inherit',
            }}>
            {email.messageBody ?? email.visibleBody}
          </pre>
          {email.attachment && <a href={email.attachment.url} target="_blank" rel="noreferrer" className="card" style={{ marginTop: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, color: '#14161a' }}><FileText size={17} color="#b54a3a"/><span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 12 }}>{email.attachment.fileName}</strong><small style={{ color: '#8a909e' }}>Supplier invoice PDF · extracted by the agent as untrusted evidence</small></span><span style={{ color: '#1061fe', fontSize: 11, fontWeight: 700 }}>Open PDF</span></a>}
        </div>)}
    </div>);
}
export default function InboxPage() {
    const { data: emails, isLoading, error } = useQuery({ queryKey: ['emails'], queryFn: api.getEmails });
    const queryClient = useQueryClient();
    const handleProcess = async (id: string) => {
        const result = await api.processEmail(id);
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        return result;
    };
    return (<div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={20} color="#1061FE"/>
          Inbox
        </h1>
        <p style={{ color: '#8A909E', fontSize: '13px', margin: 0 }}>
          Seeded emails and invoices. Click "Process with Agent" to run through the full AI agent → Sova pipeline.
        </p>
      </div>

      {isLoading && <div className="loading"><div className="spinner"/></div>}
      {error && <div className="error-box">Failed to load emails</div>}

      {emails && (<div>
          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
            {emails.length} emails • Real backend pipeline • No fake state
          </div>
          {emails.map((email: any) => (<EmailRow key={email.id} email={email} onProcess={handleProcess}/>))}
        </div>)}
    </div>);
}
