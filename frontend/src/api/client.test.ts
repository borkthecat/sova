import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
describe('API client', () => {
    afterEach(() => vi.restoreAllMocks());
    it('sends the approver token and JSON content type', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ heldForReview: 2 }), { status: 200 }));
        await expect(api.getStats()).resolves.toEqual({ heldForReview: 2 });
        expect(fetchMock).toHaveBeenCalledWith('/api/stats', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer demo-approver-token', 'Content-Type': 'application/json' }) }));
    });
    it('turns API failures into useful errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Not authorised' }), { status: 401 }));
        await expect(api.getApprovals()).rejects.toThrow('Not authorised');
    });
});
