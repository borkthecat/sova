import { Router } from "express";
import { getAllVendors, getVendorById } from "../vendors/vendorService";
import { maskLast4 } from "../vendors/bankFingerprint";
const router = Router();
router.get("/", async (req, res) => {
    try {
        const vendors = await getAllVendors();
        res.json(vendors.map((v) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            domain: v.domain,
            verifiedAccounts: v.bankAccounts.map((a) => ({
                last4: a.last4,
                masked: maskLast4(a.last4),
                verifiedAt: a.verifiedAt,
                isActive: a.isActive,
            })),
            paymentCount: v.payments.length,
            totalPaid: v.payments.reduce((sum, p) => sum + p.amount, 0),
        })));
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch vendors" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const vendor = await getVendorById(req.params.id);
        if (!vendor) {
            res.status(404).json({ error: "Vendor not found" });
            return;
        }
        res.json({
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
            domain: vendor.domain,
            verifiedAccounts: vendor.verifiedAccounts.map((a) => ({
                masked: maskLast4(a.last4),
                last4: a.last4,
                verifiedAt: a.verifiedAt,
                isActive: a.isActive,
            })),
            paymentHistory: vendor.paymentHistory.map((p) => ({
                amount: p.amount,
                currency: p.currency,
                accountMasked: maskLast4(p.accountLast4),
                executedAt: p.executedAt,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch vendor" });
    }
});
router.get("/:id/history", async (req, res) => {
    try {
        const vendor = await getVendorById(req.params.id);
        if (!vendor) {
            res.status(404).json({ error: "Vendor not found" });
            return;
        }
        res.json({
            vendorId: vendor.id,
            vendorName: vendor.name,
            payments: vendor.paymentHistory.map((p) => ({
                amount: p.amount,
                currency: p.currency,
                accountMasked: maskLast4(p.accountLast4),
                executedAt: p.executedAt,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});
export { router as vendorRoutes };
