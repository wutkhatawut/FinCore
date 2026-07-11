import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GoogleSheetService, Transaction } from "../services/GoogleSheetService.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-123456789";
const APP_PASSWORD = process.env.APP_PASSWORD || "admin";

// In-Memory Cache configuration
interface Cache {
  transactions: Transaction[] | null;
  lastFetched: number;
}

const cache: Cache = {
  transactions: null,
  lastFetched: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to calculate dashboard data
function calculateDashboardData(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  const expensesByCategory: Record<string, number> = {};
  const incomesByCategory: Record<string, number> = {};

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "รายรับ") {
      totalIncome += amount;
      incomesByCategory[tx.category] = (incomesByCategory[tx.category] || 0) + amount;
    } else if (tx.type === "รายจ่าย") {
      totalExpense += amount;
      expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + amount;
    }
  });

  const balance = totalIncome - totalExpense;
  const recentTransactions = [...transactions].reverse();

  return {
    totalIncome,
    totalExpense,
    balance,
    expensesByCategory,
    incomesByCategory,
    transactions: recentTransactions,
  };
}

// Middleware to verify JWT token
export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "กรุณาล็อกอินก่อนใช้งาน" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "เซสชันหมดอายุหรือรหัสโทเค็นไม่ถูกต้อง" });
      return;
    }
    req.user = user;
    next();
  });
};

/**
 * POST /api/login
 * รับพาสเวิร์ดจากหน้าบ้าน ถ้าตรงกับ APP_PASSWORD ให้ส่ง JWT Token กลับไป
 */
router.post("/login", (req: Request, res: Response): void => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, message: "กรุณากรอกรหัสผ่าน" });
      return;
    }

    if (password !== APP_PASSWORD) {
      res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
      return;
    }

    // สร้าง JWT Token อายุการใช้งาน 7 วัน
    const token = jwt.sign({ authorized: true }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการล็อกอิน", error: error.message });
  }
});

/**
 * GET /api/dashboard
 * ดึงข้อมูลทั้งหมดจาก GAS มาคำนวณสรุปยอดรายรับ รายจ่าย ยอดคงเหลือ และแยกตามหมวดหมู่
 */
router.get("/dashboard", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const now = Date.now();

    // Fetch from sheets if cache is empty, expired, or force refresh is requested
    if (!cache.transactions || forceRefresh || (now - cache.lastFetched > CACHE_TTL)) {
      console.log(`Fetching fresh transactions from Google Sheets... Reason: ${!cache.transactions ? "no cache" : forceRefresh ? "force refresh" : "cache expired"}`);
      cache.transactions = await GoogleSheetService.getAllTransactions();
      cache.lastFetched = now;
    } else {
      console.log("Serving dashboard data from in-memory cache...");
    }

    const dashboardData = calculateDashboardData(cache.transactions);

    res.json({
      success: true,
      isConfigured: true,
      data: dashboardData,
    });
  } catch (error: any) {
    if (error.message && (error.message.includes("GAS_WEBAPP_URL") || error.message.includes("placeholder"))) {
      res.json({
        success: false,
        isConfigured: false,
        error: "CONFIG_REQUIRED",
        message: "ยังไม่ได้ระบุตำแหน่งของฐานข้อมูล Google Sheets (GAS_WEBAPP_URL)",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลสรุปผลได้",
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions
 * บันทึกรายรับรายจ่ายใหม่ส่งต่อไปที่ Google Sheets ผ่าน GAS
 */
router.post("/transactions", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, category, amount, notes, date } = req.body;

    if (!type || !category || !amount) {
      res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน (ประเภท, หมวดหมู่, จำนวนเงิน)" });
      return;
    }

    const txDate = date || new Date().toISOString();

    const newTx: Omit<Transaction, "id"> = {
      date: txDate,
      type,
      category,
      amount: Number(amount),
      notes: notes || "",
    };

    // 1. ส่งคำขอบันทึกไปที่ Google Sheets (รอผลลัพธ์)
    const success = await GoogleSheetService.addTransaction(newTx);

    if (success) {
      // 2. ตรวจสอบให้มั่นใจว่าแคชถูกโหลดเข้ามาในระบบแล้ว
      if (!cache.transactions) {
        cache.transactions = await GoogleSheetService.getAllTransactions();
        cache.lastFetched = Date.now();
      } else {
        // คำนวณ ID ของรายการใหม่ (ซึ่งใน Google Sheets แถวแรกคือหัวตาราง ดังนั้น ID จะเท่ากับ จำนวนแถวข้อมูลที่มีอยู่แล้ว + 2)
        const newId = cache.transactions.length + 2;
        cache.transactions.push({
          id: newId,
          ...newTx,
        });
      }

      // 3. คำนวณข้อมูลสรุปแดชบอร์ดใหม่จากแคชที่อัปเดตแล้ว
      const dashboardData = calculateDashboardData(cache.transactions);

      res.json({
        success: true,
        message: "บันทึกรายการสำเร็จ",
        data: dashboardData,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "ล้มเหลวในการบันทึกข้อมูลลงชีต",
      });
    }
  } catch (error: any) {
    if (error.message && (error.message.includes("GAS_WEBAPP_URL") || error.message.includes("placeholder"))) {
      res.status(400).json({
        success: false,
        error: "CONFIG_REQUIRED",
        message: "ยังไม่ได้ระบุตำแหน่งของฐานข้อมูล Google Sheets (GAS_WEBAPP_URL)",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions/delete
 * ลบรายการธุรกรรม (รองรับทั้งรายการเดี่ยวและหลายรายการพร้อมกัน)
 */
router.post("/transactions/delete", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: "กรุณาระบุรายการที่ต้องการลบ" });
      return;
    }

    // 1. ส่งคำขอลบไปยัง Google Sheets (รอผลลัพธ์)
    const success = await GoogleSheetService.deleteTransactions(ids);

    if (success) {
      // 2. ปรับปรุงข้อมูลในแคช
      if (!cache.transactions) {
        // หากไม่มีแคช ให้ไปดึงใหม่สดๆ เลย
        cache.transactions = await GoogleSheetService.getAllTransactions();
        cache.lastFetched = Date.now();
      } else {
        // กรองแถวที่ถูกลบออกจากแคช
        const numericIds = ids.map(Number);
        let updatedList = cache.transactions.filter(tx => tx.id && !numericIds.includes(tx.id));
        
        // เรียงลำดับ ID จากมากไปน้อยเพื่อคำนวณการเลื่อนแถว (เหมือนการลบแถวใน Google Sheets จากล่างขึ้นบน)
        const sortedDeletedIds = [...numericIds].sort((a, b) => b - a);
        
        for (const deletedId of sortedDeletedIds) {
          updatedList = updatedList.map(tx => {
            if (tx.id && tx.id > deletedId) {
              return { ...tx, id: tx.id - 1 };
            }
            return tx;
          });
        }
        
        cache.transactions = updatedList;
      }

      // 3. คำนวณข้อมูลแดชบอร์ดใหม่หลังอัปเดตแคช
      const dashboardData = calculateDashboardData(cache.transactions);

      res.json({
        success: true,
        message: "ลบรายการสำเร็จ",
        data: dashboardData,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "ล้มเหลวในการลบข้อมูลจากชีต",
      });
    }
  } catch (error: any) {
    if (error.message && (error.message.includes("GAS_WEBAPP_URL") || error.message.includes("placeholder"))) {
      res.status(400).json({
        success: false,
        error: "CONFIG_REQUIRED",
        message: "ยังไม่ได้ระบุตำแหน่งของฐานข้อมูล Google Sheets (GAS_WEBAPP_URL)",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลบข้อมูล",
      error: error.message,
    });
  }
});

export default router;
