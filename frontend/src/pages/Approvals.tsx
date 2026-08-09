import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, CheckCircle, XCircle, Clock, AlertTriangle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import { SignalGroup } from '../components/RiskSignalCard';
function StatusBadge({ status }: {
    status: string;
}) {
    const map: Record<string, {
        color: string;
        label: string;
    }> = {
        PENDING_APPROVAL: { color: 'amber', label: 'Held for Review' },
        APPROVED: { color: 'blue', label: 'Approved' },
        REJECTED: { color: 'red', label: 'Rejected' },
        EXECUTED: { color: 'green', label: 'Executed' },
        EXECUTING: { color: 'blue', label: 'Executing' },
        FAILED: { color: 'red', label: 'Failed' },
    };
    const cfg = map[status] ?? { color: 'gray', label: status };
    return <span className={`badge badge-${cfg.color}`}>{cfg.label}</span>;
}
function ApprovalCard({ action }: {
    action: any;
}) {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();
    const approveMutation = useMutation({
        mutationFn: () => api.approveAction(action.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });
    const rejectMutation = useMutation({
        mutationFn: () => api.rejectAction(action.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });
    const isPending = action.status === 'PENDING_APPROVAL';
    const isExecuted = action.status === 'EXECUTED';
    const isRejected = action.status === 'REJECTED';
    return (<div className="card fade-in" style={{
            marginBottom: '16px',
            borderColor: isPending ? 'rgba(245,158,11,0.4)' : isExecuted ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
        }}>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <StatusBadge status={action.status}/>
            {action.hardPoliciesTriggered?.length > 0 && (<span className="badge badge-red">
                <AlertTriangle size={9}/>
                Hard Policy
              </span>)}
            <span style={{ fontSize: '11px', color: '#475569' }}>
              {new Date(action.createdAt).toLocaleString()}
            </span>
          </div>

          <div style={{ fontSize: '16px', fontWeight: '700', color: '#14161A', marginBottom: '4px' }}>
            {action.type === 'SEND_PAYMENT' ? 'Payment' : 'Bank Detail Update'}
            {action.amount && ` · SGD ${action.amount.toLocaleString()}`}
          </div>

          <div style={{ fontSize: '13px', color: '#5B6270' }}>
            {action.vendorName}
            {action.bankAccountLast4 && (<span style={{ marginLeft: '8px', fontFamily: 'monospace' }}>
                {action.bankAccountLast4}
              </span>)}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: '#8A909E', marginBottom: '2px' }}>Risk Score</div>
          <div style={{
            fontSize: '26px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: (action.riskScore ?? 0) >= 100 ? '#B54A3A' : (action.riskScore ?? 0) >= 50 ? '#C9782D' : '#D4761F',
        }}>
            {action.riskScore}
          </div>
        </div>
      </div>

      
      {isPending && (<div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {action.contentSignals?.slice(0, 3).map((s: any) => (<span key={s.id} style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(249,115,22,0.1)',
                    color: '#fb923c',
                    border: '1px solid rgba(249,115,22,0.2)',
                }}>
              {s.title}
            </span>))}
          {action.behavioralSignals?.slice(0, 2).map((s: any) => (<span key={s.id} style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)',
                }}>
              {s.title}
            </span>))}
        </div>)}

      
      <button className="btn-ghost" onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '16px' : 0 }}>
        <span>View Full Analysis</span>
        {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {expanded && (<div className="fade-in" style={{ paddingTop: '16px', borderTop: '1px solid #E7E7E2' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <div className="section-title">Source</div>
            <div style={{ fontSize: '12px', color: '#5B6270' }}>
              {action.sourceContext?.sender && <div>From: {action.sourceContext.sender}</div>}
              {action.sourceContext?.subject && <div>Subject: {action.sourceContext.subject}</div>}
              {action.sourceContext?.type && <div>Type: {action.sourceContext.type}</div>}
            </div>
            {action.sourceContext?.visibleText && (<pre style={{
                    marginTop: '8px',
                    background: '#fafaf8',
                    border: '1px solid #e7e7e2',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '11px',
                    color: '#5B6270',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '120px',
                    overflow: 'auto',
                }}>
                {action.sourceContext.visibleText}
              </pre>)}
            {action.sourceContext?.hiddenText && <div style={{ marginTop: 10 }}><div className="section-title" style={{ color: '#B54A3A' }}>Hidden / injected content detected</div><pre style={{ margin: 0, padding: 10, whiteSpace: 'pre-wrap', background: '#fdf0ee', color: '#8b3b2f', fontSize: 11, borderRadius: 6 }}>{action.sourceContext.hiddenText}</pre></div>}
          </div>

          
          <SignalGroup title="Source Manipulation Signals" signals={action.contentSignals} color="#C9782D"/>
          <SignalGroup title="Financial Behaviour Signals" signals={action.behavioralSignals} color="#B54A3A"/>
          <SignalGroup title="System Signals" signals={action.systemSignals} color="#6956C7"/>

          
          {action.hardPoliciesTriggered?.length > 0 && (<div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#B54A3A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Hard Policy Triggered
              </div>
              {action.hardPoliciesTriggered.map((p: string) => (<div key={p} style={{ fontSize: '12px', color: '#fca5a5' }}>
                  ⚠ {p.replace(/_/g, ' ')}
                </div>))}
              <div style={{ fontSize: '12px', color: '#5B6270', marginTop: '6px' }}>
                Financial identity changes require independent human verification.
              </div>
            </div>)}

          
          {action.counterfactual && (<div className="consequence-box" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: '#f87171', textTransform: 'uppercase', marginBottom: '8px' }}>
                Why Sova Held This
              </div>
              <p className="consequence-text">{action.counterfactual}</p>
            </div>)}

          
          <div style={{ marginBottom: '16px' }}>
            <div className="section-title">Payment Execution</div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px',
                background: '#fafaf8',
                border: '1px solid #e7e7e2',
                borderRadius: '6px',
                fontSize: '13px',
            }}>
              {action.execution ? (<>
                  <CheckCircle size={14} color="#2E9963"/>
                  <span style={{ color: '#34d399', fontWeight: '600' }}>EXECUTED</span>
                  <span style={{ color: '#8A909E', marginLeft: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                    {action.execution.transactionId}
                  </span>
                </>) : isRejected ? (<>
                  <XCircle size={14} color="#B54A3A"/>
                  <span style={{ color: '#f87171', fontWeight: '600' }}>NOT EXECUTED — Rejected</span>
                </>) : isPending ? (<>
                  <Clock size={14} color="#D4761F"/>
                  <span style={{ color: '#fbbf24', fontWeight: '600' }}>NOT EXECUTED — Awaiting human approval</span>
                </>) : (<span style={{ color: '#5B6270' }}>Status: {action.status}</span>)}
            </div>
          </div>
        </div>)}

      
      {isPending && (<div style={{ display: 'flex', gap: '8px', marginTop: expanded ? 0 : '8px', paddingTop: '12px', borderTop: '1px solid #E7E7E2' }}>
          <button className="btn-danger" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {rejectMutation.isPending ? <div className="spinner"/> : <XCircle size={13}/>}
            Reject
          </button>
          <button className="btn-success" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {approveMutation.isPending ? <div className="spinner"/> : <CheckCircle size={13}/>}
            Approve
          </button>
          {(approveMutation.error || rejectMutation.error) && (<span style={{ fontSize: '12px', color: '#f87171', alignSelf: 'center' }}>
              {(approveMutation.error as any)?.message ?? (rejectMutation.error as any)?.message}
            </span>)}
        </div>)}

      
      {action.approval?.decision && !isPending && (<div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E7E7E2', fontSize: '12px', color: '#8A909E' }}>
          Decision by: {action.approval.reviewerId?.slice(0, 8)}... on {new Date(action.approval.decidedAt).toLocaleString()}
        </div>)}
    </div>);
}
export default function ApprovalsPage() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const { data: approvals, isLoading } = useQuery({
        queryKey: ['approvals'],
        queryFn: api.getApprovals,
        refetchInterval: 3000,
    });
    const filtered = approvals?.filter((a: any) => {
        if (filter === 'pending')
            return a.status === 'PENDING_APPROVAL';
        if (filter === 'resolved')
            return ['EXECUTED', 'REJECTED'].includes(a.status);
        return true;
    }) ?? [];
    const pendingCount = approvals?.filter((a: any) => a.status === 'PENDING_APPROVAL').length ?? 0;
    return (<div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={20} color="#1061FE"/>
          Approval Queue
          {pendingCount > 0 && (<span style={{ background: '#B54A3A', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '12px' }}>
              {pendingCount}
            </span>)}
        </h1>
        <p style={{ color: '#8A909E', fontSize: '13px', margin: 0 }}>
          Sova-held payment actions awaiting human verification.
        </p>
      </div>

      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'pending', 'resolved'] as const).map((f) => (<button key={f} className={filter === f ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(f)} style={{ padding: '6px 12px', fontSize: '12px' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>))}
      </div>

      {isLoading && <div className="loading"><div className="spinner"/></div>}

      {!isLoading && filtered.length === 0 && (<div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
          <Shield size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
          <div style={{ fontSize: '14px' }}>No {filter === 'pending' ? 'pending approvals' : 'actions'}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {filter === 'pending' ? 'Process emails from the Inbox to generate approval requests.' : ''}
          </div>
        </div>)}

      {filtered.map((action: any) => (<ApprovalCard key={action.id} action={action}/>))}
    </div>);
}
