import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../database/client";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                role: string;
                email: string;
            };
        }
    }
}
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    try {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { token } });
        if (!user) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
        req.user = { id: user.id, name: user.name, role: user.role, email: user.email };
        next();
    }
    catch {
        res.status(500).json({ error: "Auth check failed" });
    }
}
export async function requireApprover(req: Request, res: Response, next: NextFunction): Promise<void> {
    await requireAuth(req, res, () => {
        if (req.user?.role !== "APPROVER") {
            res.status(403).json({ error: "APPROVER role required" });
            return;
        }
        next();
    });
}
