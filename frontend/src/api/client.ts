const BASE_URL = '/api';
const APPROVER_TOKEN = 'demo-approver-token';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${APPROVER_TOKEN}`,
            ...(options?.headers || {}),
        },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}
export const api = {
    getStats: () => request<any>('/stats'),
    getEmails: () => request<any[]>('/demo/emails'),
    getEmail: (id: string) => request<any>(`/demo/emails/${id}`),
    processEmail: (id: string) => request<any>(`/demo/emails/${id}/process`, { method: 'POST', body: '{}' }),
    getApprovals: () => request<any[]>('/approvals'),
    getApproval: (id: string) => request<any>(`/approvals/${id}`),
    approveAction: (id: string) => request<any>(`/approvals/${id}/approve`, { method: 'POST', body: '{}' }),
    rejectAction: (id: string) => request<any>(`/approvals/${id}/reject`, { method: 'POST', body: '{}' }),
    getVendors: () => request<any[]>('/vendors'),
    getVendor: (id: string) => request<any>(`/vendors/${id}`),
    getAuditLog: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request<any[]>(`/audit${qs}`);
    },
    verifyAudit: () => request<any>('/audit/verify'),
    runAttack: (body: any) => request<any>('/attack-lab/run', { method: 'POST', body: JSON.stringify(body) }),
};
