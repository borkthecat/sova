import { useQuery } from '@tanstack/react-query';
import { Building2, Landmark } from 'lucide-react';
import { api } from '../api/client';
export default function VendorsPage() {
    const { data: vendors, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: api.getVendors });
    return <div style={{ padding: '32px', maxWidth: '1000px' }}>
    <h1 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Building2 size={20} color="#1061FE"/>Vendors</h1>
    <p style={{ color: '#8A909E' }}>Trusted vendor records used for independent financial identity verification.</p>
    {isLoading ? <div className="loading">Loading trusted records…</div> : <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>{vendors?.map((vendor: any) => <section className="card" key={vendor.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><div><h2 style={{ fontSize: 16 }}>{vendor.name}</h2><div style={{ color: '#5B6270', fontSize: 13 }}>{vendor.email ?? 'No verified contact'} · {vendor.domain ?? 'No verified domain'}</div></div><span className="badge badge-green">Trusted record</span></div>
      <div style={{ display: 'flex', gap: 30, marginTop: 16, fontSize: 13 }}><span><Landmark size={14} style={{ verticalAlign: 'middle', marginRight: 5 }}/>{vendor.verifiedAccounts.map((account: any) => account.masked).join(', ') || 'No verified account'}</span><span>{vendor.paymentCount} historical payments</span><span>SGD {Number(vendor.totalPaid ?? 0).toLocaleString()} total</span></div>
    </section>)}</div>}
  </div>;
}
