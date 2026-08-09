interface RiskSignal {
    id: string;
    category: string;
    severity: number;
    title: string;
    explanation: string;
    evidence?: string;
}
function severityLabel(s: number): {
    label: string;
    color: string;
} {
    if (s >= 50)
        return { label: 'CRITICAL', color: '#B54A3A' };
    if (s >= 30)
        return { label: 'HIGH', color: '#C9782D' };
    if (s >= 15)
        return { label: 'MEDIUM', color: '#D4761F' };
    return { label: 'LOW', color: '#1061FE' };
}
export function RiskSignalCard({ signal }: {
    signal: RiskSignal;
}) {
    const sev = severityLabel(signal.severity);
    return (<div style={{
            background: '#fafaf8',
            border: `1px solid ${sev.color}30`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px',
        }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.05em',
            color: sev.color,
            background: `${sev.color}15`,
            border: `1px solid ${sev.color}30`,
            borderRadius: '3px',
            padding: '1px 5px',
        }}>
          {sev.label}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#14161a' }}>{signal.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#8a909e' }}>+{signal.severity}</span>
      </div>
      <p style={{ fontSize: '12px', color: '#5B6270', margin: 0, marginBottom: signal.evidence ? '6px' : 0 }}>
        {signal.explanation}
      </p>
      {signal.evidence && (<div className="evidence-text">"{signal.evidence}"</div>)}
    </div>);
}
export function SignalGroup({ title, signals, color }: {
    title: string;
    signals: RiskSignal[];
    color: string;
}) {
    if (!signals || signals.length === 0)
        return null;
    return (<div style={{ marginBottom: '20px' }}>
      <div style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color,
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }}>
        <div style={{ width: '3px', height: '12px', background: color, borderRadius: '2px' }}/>
        {title}
      </div>
      {signals.map((s) => <RiskSignalCard key={s.id} signal={s}/>)}
    </div>);
}
