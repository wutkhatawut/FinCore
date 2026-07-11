import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  LogOut, 
  User, 
  Calendar, 
  Search, 
  Filter, 
  FileText, 
  Settings, 
  ChevronRight, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";
import Login from "./components/Login.js";
import SetupGuide from "./components/SetupGuide.js";
import FinanceChart from "./components/FinanceChart.js";
import CategoryIcon from "./components/CategoryIcon.js";
import { Transaction, DashboardData, CATEGORIES, CategoryType } from "./types.js";

// Local helper to calculate dashboard statistics on client side in serverless mode
function calculateDashboardData(transactions: Transaction[]): DashboardData {
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

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isAuthChecking, setIsAuthChecking] = useState(false);

  // App state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<CategoryType>("รายจ่าย");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    // Format YYYY-MM-DD
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Search & filter state for history
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ทั้งหมด" | "รายรับ" | "รายจ่าย">("ทั้งหมด");
  const [filterCategory, setFilterCategory] = useState<string>("ทั้งหมด");

  // Chart view tab
  const [chartTab, setChartTab] = useState<CategoryType>("รายจ่าย");

  // Selection states for deletion
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    idsToDelete: number[];
  }>({
    isOpen: false,
    message: "",
    idsToDelete: [],
  });

  // Update default category when formType changes
  useEffect(() => {
    if (CATEGORIES[formType] && CATEGORIES[formType].length > 0) {
      setFormCategory(CATEGORIES[formType][0].name);
    }
  }, [formType]);
  // Fetch dashboard data
  const fetchDashboard = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const gasUrl = localStorage.getItem("local_gas_webapp_url");
      if (!gasUrl) {
        setIsConfigured(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch(gasUrl, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! status: ${response.status}`);
      }

      const resData = await response.json();

      if (resData.success) {
        const rawTransactions: Transaction[] = resData.data || [];
        const calculated = calculateDashboardData(rawTransactions);
        setDashboardData(calculated);
        setIsConfigured(true);
      } else {
        setError(resData.error || "ล้มเหลวในการดึงข้อมูลจาก Google Sheets");
      }
    } catch (err: any) {
      console.error("fetchDashboard serverless error:", err);
      setError("ไม่สามารถเชื่อมโยง Google Sheets โดยตรงได้ กรุณาตรวจสอบ URL ของตัวเว็บแอป หรือล้างการตั้งค่าที่หน้าล็อกอินเพื่อกำหนดค่าใหม่");
    } finally {
      setIsLoading(false);
    }
  };
  // Trigger fetch on token load or change
  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setDashboardData(null);
    setIsConfigured(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("กรุณากรอกจำนวนเงินให้ถูกต้องและมากกว่า 0");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const gasUrl = localStorage.getItem("local_gas_webapp_url");
      if (!gasUrl) {
        alert("ไม่พบลิงก์เชื่อมต่อ Google Sheets");
        setIsSaving(false);
        return;
      }

      const newTx = {
        date: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        type: formType,
        category: formCategory,
        amount: amountNum,
        notes: formNotes,
      };

      const response = await fetch(gasUrl, {
        method: "POST",
        body: JSON.stringify(newTx),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! status: ${response.status}`);
      }

      const resData = await response.json();

      if (resData.success) {
        setSaveSuccess(true);
        setFormAmount("");
        setFormNotes("");
        
        await fetchDashboard();
        
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(resData.error || "เกิดข้อผิดพลาดในการบันทึกรายการลง Google Sheets");
      }
    } catch (err: any) {
      console.error("Add transaction serverless error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets โดยตรง");
    } finally {
      setIsSaving(false);
    }
  };

  // If not logged in, render Login page
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculate filtered transactions
  const allTransactions = dashboardData?.transactions || [];
  const totalIncome = dashboardData?.totalIncome ?? 0;
  const totalExpense = dashboardData?.totalExpense ?? 0;
  const expensePercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;

  const filteredTransactions = allTransactions.filter((tx) => {
    const matchesSearch = tx.notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ทั้งหมด" || tx.type === filterType;
    const matchesCategory = filterCategory === "ทั้งหมด" || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Toggle single item selection
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered items
  const handleToggleSelectAll = () => {
    const filteredIds = filteredTransactions
      .map((tx) => tx.id)
      .filter((id): id is number => typeof id === "number");

    const allAreSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allAreSelected) {
      // Deselect only the filtered ones
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered ones (union with previous selection)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Delete transaction handler (supports single & bulk) - opens custom modal
  const handleDeleteTransactions = (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return;

    const confirmMessage = idsToDelete.length === 1
      ? "คุณแน่ใจหรือเปล่าว่าต้องการลบรายการนี้?"
      : `คุณแน่ใจหรือเปล่าว่าต้องการลบ ${idsToDelete.length} รายการที่เลือกไว้?`;

    setConfirmModal({
      isOpen: true,
      message: confirmMessage,
      idsToDelete: idsToDelete,
    });
  };

  // Actual execution of deletion
  const executeDeleteTransactions = async () => {
    const idsToDelete = confirmModal.idsToDelete;
    if (idsToDelete.length === 0) return;

    setIsDeleting(true);
    // Close confirm modal immediately to give feedback, but we could also close it after success.
    // Closing it immediately with isDeleting flag preventing double-clicks is usually better.
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      const gasUrl = localStorage.getItem("local_gas_webapp_url");
      if (!gasUrl) {
        alert("ไม่พบลิงก์เชื่อมต่อ Google Sheets");
        setIsDeleting(false);
        return;
      }

      const response = await fetch(gasUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          ids: idsToDelete,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! status: ${response.status}`);
      }

      const resData = await response.json();

      if (resData.success) {
        setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
        await fetchDashboard();
      } else {
        alert(resData.error || "เกิดข้อผิดพลาดในการลบรายการ");
      }
    } catch (err: any) {
      console.error("Delete transaction serverless error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets เพื่อลบข้อมูล");
    } finally {
      setIsDeleting(false);
      setConfirmModal({ isOpen: false, message: "", idsToDelete: [] });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">WalletFlow</h1>
              <p className="text-[11px] text-slate-400 font-medium">Single User Ledger • Personal</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700">ผู้ใช้เซิร์ฟเวอร์เลส</p>
              <p className="text-[9px] text-indigo-600 uppercase tracking-widest font-extrabold">Serverless Mode</p>
            </div>
            {token && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer shadow-sm"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Verification / Setup Warning */}
        {!isConfigured && (
          <div className="mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-amber-900 text-lg">ยังไม่ได้เชื่อมต่อ Google Sheets</h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  ระบบไม่พบค่า <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">GAS_WEBAPP_URL</span> ที่ถูกต้องในไฟล์ระบบ 
                  โปรดปฏิบัติตามคู่มือด้านล่างนี้เพื่อสร้าง API Bridge และเชื่อมโยง Google Sheet ของคุณเข้ากับแอปเพื่อบันทึกข้อมูลถาวร
                </p>
              </div>
            </div>
            <SetupGuide onRefresh={fetchDashboard} />
          </div>
        )}

        {isConfigured && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle Column (Form & Charts) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Summary Cards */}
              {isLoading && !dashboardData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white h-28 rounded-2xl border border-slate-200"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="summary-cards">
                  {/* Income Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">รายรับทั้งหมด (Income)</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ฿{(dashboardData?.totalIncome ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  {/* Expense Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">รายจ่ายทั้งหมด (Expenses)</p>
                    <p className="text-2xl font-bold text-rose-500">
                      ฿{(dashboardData?.totalExpense ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 w-full h-1 bg-rose-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${expensePercent}%` }}></div>
                    </div>
                  </div>

                  {/* Balance Card */}
                  <div className="bg-indigo-900 text-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">ยอดคงเหลือรวม (Balance)</p>
                    <p className="text-2xl font-bold">
                      ฿{(dashboardData?.balance ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-indigo-300 mt-3 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-400" />
                      คำนวณแบบรีลไทม์ผ่าน Google Sheets
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction Input Form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="add-transaction-form">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  บันทึกธุรกรรมใหม่ (New Transaction)
                </h2>

                <form onSubmit={handleAddTransaction} className="space-y-5">
                  {/* Type Select buttons */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ประเภทธุรกรรม (Transaction Type)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormType("รายจ่าย")}
                        className={`py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formType === "รายจ่าย"
                            ? "border-rose-600 bg-rose-50 text-rose-700 text-sm shadow-sm"
                            : "border-slate-100 bg-slate-50 text-slate-400 text-sm opacity-60 hover:opacity-100 hover:border-slate-200"
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        รายจ่าย (Expense)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType("รายรับ")}
                        className={`py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formType === "รายรับ"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 text-sm shadow-sm"
                            : "border-slate-100 bg-slate-50 text-slate-400 text-sm opacity-60 hover:opacity-100 hover:border-slate-200"
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        รายรับ (Income)
                      </button>
                    </div>
                  </div>

                  {/* Category & Amount Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Selection */}
                    <div>
                      <label htmlFor="form-category" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">หมวดหมู่ (Category)</label>
                      <select
                        id="form-category"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none font-medium text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
                      >
                        {CATEGORIES[formType].map((cat) => (
                          <option key={cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label htmlFor="form-amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">จำนวนเงิน (Amount - THB)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-base">฿</span>
                        <input
                          id="form-amount"
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono font-bold text-base transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes & Date Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Notes */}
                    <div>
                      <label htmlFor="form-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">หมายเหตุ (Notes)</label>
                      <input
                        id="form-notes"
                        type="text"
                        placeholder="เช่น ค่าอาหารกลางวัน, เงินเดือน, ของใช้"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm transition-all"
                      />
                    </div>

                    {/* Date picker */}
                    <div>
                      <label htmlFor="form-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">วันที่ทำรายการ (Date)</label>
                      <input
                        id="form-date"
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Success indicator toast */}
                  {saveSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                      บันทึกข้อมูลสำเร็จและกำลังส่งข้อมูลลง Google Sheets...
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>กำลังเชื่อมต่อ Google Sheets...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>บันทึกรายการ (Save Transaction)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Chart Analysis Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="charts-analysis">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 mb-4 gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none">สถิติหมวดหมู่ (Category Statistics)</h2>
                    <span className="text-xs text-slate-400 mt-1 block">วิเคราะห์ยอดการใช้จ่ายและรายรับรายประเภท</span>
                  </div>
                  
                  {/* Category Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setChartTab("รายจ่าย")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartTab === "รายจ่าย"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      รายจ่าย
                    </button>
                    <button
                      onClick={() => setChartTab("รายรับ")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartTab === "รายรับ"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      รายรับ
                    </button>
                  </div>
                </div>

                {isLoading && !dashboardData ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <FinanceChart 
                    categoryData={chartTab === "รายจ่าย" ? (dashboardData?.expensesByCategory || {}) : (dashboardData?.incomesByCategory || {})} 
                    type={chartTab} 
                  />
                )}
              </div>

            </div>

            {/* Right Column (Recent Activity & Filters) */}
            <div className="space-y-8 lg:col-span-1">
              
              {/* Transactions List Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="recent-transactions">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none font-sans">รายการล่าสุด</h2>
                    <span className="text-xs text-slate-400 mt-1 block">บันทึกธุรกรรมทั้งหมดของคุณ</span>
                  </div>
                  <button 
                    onClick={() => fetchDashboard()}
                    disabled={isLoading}
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 transition-all cursor-pointer shadow-sm"
                    title="โหลดข้อมูลใหม่"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Filter and Search controls */}
                <div className="space-y-3 mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาหมวดหมู่หรือโน้ต..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-1.5 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  {/* Filters Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Filter Type */}
                    <div>
                      <select
                        value={filterType}
                        onChange={(e: any) => setFilterType(e.target.value)}
                        className="w-full py-1.5 px-2 border border-slate-200 rounded-lg text-slate-600 bg-white focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
                        <option value="รายรับ">รายรับ</option>
                        <option value="รายจ่าย">รายจ่าย</option>
                      </select>
                    </div>

                    {/* Filter Category */}
                    <div>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full py-1.5 px-2 border border-slate-200 rounded-lg text-slate-600 bg-white focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="ทั้งหมด">หมวดหมู่: ทั้งหมด</option>
                        {/* Unique categories from actual list */}
                        {Array.from(new Set(allTransactions.map(t => t.category))).map(catName => (
                          <option key={catName} value={catName}>{catName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select All and Bulk Delete controls */}
                  {filteredTransactions.length > 0 && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-1">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {filteredTransactions.every((tx) => tx.id && selectedIds.includes(tx.id)) ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                            <span>ยกเลิกเลือกทั้งหมด</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                            <span>เลือกทั้งหมด ({filteredTransactions.length})</span>
                          </>
                        )}
                      </button>

                      {selectedIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTransactions(selectedIds)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบที่เลือก ({selectedIds.length})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Transaction Items */}
                <div className="space-y-3 overflow-y-auto max-h-[38rem] pr-1" id="transactions-scroller">
                  {isLoading && allTransactions.length === 0 ? (
                    [1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="flex items-center gap-3 py-2 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0"></div>
                        <div className="space-y-1.5 w-full">
                          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                          <div className="h-3 bg-slate-50 rounded w-1/3"></div>
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-12 shrink-0"></div>
                      </div>
                    ))
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx, idx) => {
                      const isIncome = tx.type === "รายรับ";
                      // Find category color if defined, otherwise slate fallback
                      const categoryMetadata = [
                        ...CATEGORIES.รายจ่าย,
                        ...CATEGORIES.รายรับ,
                      ].find((c) => c.name === tx.category);

                      const pillColor = categoryMetadata?.color || "bg-slate-100 text-slate-700 border-slate-200";

                      return (
                        <div
                          key={tx.id || idx}
                          className="flex items-center justify-between p-3.5 bg-white border border-slate-200/60 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox for Bulk Delete */}
                            {tx.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleSelect(tx.id!)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 shrink-0 cursor-pointer"
                              >
                                {selectedIds.includes(tx.id) ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                                )}
                              </button>
                            )}
                            <div className={`p-2.5 rounded-xl border ${pillColor} shrink-0`}>
                              <CategoryIcon name={tx.category} className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                                {tx.category}
                              </h4>
                              {tx.notes && (
                                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[130px] sm:max-w-[200px]">
                                  {tx.notes}
                                </p>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {tx.date ? tx.date.split(" ")[0] : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 ml-2">
                            <div className="text-right">
                              <p className={`text-xs font-bold leading-none ${isIncome ? "text-emerald-600" : "text-rose-500"}`}>
                                {isIncome ? "+" : "-"} ฿{tx.amount.toLocaleString("th-TH")}
                              </p>
                              <span className="text-[9px] text-slate-400 font-medium block mt-1">
                                {tx.type}
                              </span>
                            </div>
                            {/* Individual Delete Button */}
                            {tx.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransactions([tx.id!])}
                                disabled={isDeleting}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-semibold">ไม่พบรายการธุรกรรม</p>
                      <p className="text-slate-300 text-[11px] mt-0.5">ลองเปลี่ยนเงื่อนไขค้นหาหรือตัวกรอง</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setConfirmModal({ isOpen: false, message: "", idsToDelete: [] })}
          />
          
          {/* Modal Container */}
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-sans">ยืนยันการลบรายการ</h3>
                <p className="text-sm text-slate-500 font-medium font-sans">
                  {confirmModal.message}
                </p>
                <p className="text-xs text-rose-500 font-semibold bg-rose-50/50 px-2.5 py-1 rounded-lg border border-rose-100/40 w-fit mt-2">
                  * การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, message: "", idsToDelete: [] })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-bold transition-all cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeDeleteTransactions}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/10 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันการลบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
