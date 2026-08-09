import { Routes, Route, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Building2, ClipboardList, FileText, FlaskConical, Inbox, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import Overview from './pages/Overview';
import InboxPage from './pages/Inbox';
import ApprovalsPage from './pages/Approvals';
import AuditLogPage from './pages/AuditLog';
import AttackLabPage from './pages/AttackLab';
import VendorsPage from './pages/Vendors';
import PoliciesPage from './pages/Policies';
import { api } from './api/client';
type NavItemProps = {
    to: string;
    icon: typeof Inbox;
    label: string;
    badge?: number;
};
function NavItem({ to, icon: Icon, label, badge }: NavItemProps) {
    return (<NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <Icon size={17} strokeWidth={1.8}/>
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </NavLink>);
}
export default function App() {
    const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: api.getStats, refetchInterval: 5000 });
    const pendingCount = stats?.heldForReview ?? 0;
    const auditVerified = stats?.auditIntegrity === 'VERIFIED';
    return (<div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img src="/sova-logo.png" alt="Sova"/></div>
        <p className="nav-heading">Monitor</p>
        <nav>
          <NavItem to="/" icon={LayoutDashboard} label="Overview"/>
          <NavItem to="/inbox" icon={Inbox} label="Inbox"/>
          <NavItem to="/approvals" icon={ClipboardList} label="Approvals" badge={pendingCount}/>
        </nav>
        <p className="nav-heading nav-heading-spaced">Records & control</p>
        <nav>
          <NavItem to="/audit" icon={FileText} label="Audit log"/>
          <NavItem to="/vendors" icon={Building2} label="Vendors"/>
          <NavItem to="/policies" icon={SlidersHorizontal} label="Policies"/>
          <NavItem to="/attack-lab" icon={FlaskConical} label="Attack lab"/>
        </nav>
        <div className="sidebar-spacer"/>
        <div className="integrity-card">
          <span className={`integrity-dot${auditVerified ? '' : ' warning'}`}/>
          <div><strong>{auditVerified ? 'Audit integrity verified' : 'Checking audit integrity'}</strong><small>{auditVerified ? 'Tamper-evident chain is intact' : 'Waiting for the latest verification'}</small></div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="search-box" aria-label="Search"><span>⌕</span><input placeholder="Search vendors, actions, audit records…"/><kbd>⌘K</kbd></div>
          <div className="topbar-spacer"/>
          <div className="environment"><span className="environment-dot"/>Production <em>·</em> Meridian Group Pte Ltd</div>
          <NavLink to="/approvals" className="notification" aria-label="Open approvals"><Bell size={16}/>{pendingCount ? <b>{pendingCount}</b> : null}</NavLink>
          <div className="user"><span>JT</span><div><strong>Jia Tan</strong><small>Approver · Finance Ops</small></div></div>
        </header>
        <main className="page-content"><Routes>
          <Route path="/" element={<Overview />}/>
          <Route path="/inbox" element={<InboxPage />}/>
          <Route path="/approvals" element={<ApprovalsPage />}/>
          <Route path="/audit" element={<AuditLogPage />}/>
          <Route path="/vendors" element={<VendorsPage />}/>
          <Route path="/policies" element={<PoliciesPage />}/>
          <Route path="/attack-lab" element={<AttackLabPage />}/>
        </Routes></main>
      </div>
    </div>);
}
