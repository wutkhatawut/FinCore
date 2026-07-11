export interface Transaction {
  id?: number;
  date: string;
  type: "รายรับ" | "รายจ่าย";
  category: string;
  amount: number;
  notes: string;
}

export interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expensesByCategory: Record<string, number>;
  incomesByCategory: Record<string, number>;
  transactions: Transaction[];
}

export type CategoryType = "รายรับ" | "รายจ่าย";

export const CATEGORIES: Record<CategoryType, { name: string; icon: string; color: string }[]> = {
  รายจ่าย: [
    { name: "อาหารและเครื่องดื่ม", icon: "Utensils", color: "bg-amber-100 text-amber-700 border-amber-200" },
    { name: "การเดินทาง", icon: "Car", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { name: "ช้อปปิ้ง", icon: "ShoppingBag", color: "bg-pink-100 text-pink-700 border-pink-200" },
    { name: "ที่อยู่อาศัยและค่าไฟ", icon: "Home", color: "bg-purple-100 text-purple-700 border-purple-200" },
    { name: "ความบันเทิง", icon: "Film", color: "bg-red-100 text-red-700 border-red-200" },
    { name: "สุขภาพและการแพทย์", icon: "HeartPulse", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { name: "การศึกษา", icon: "GraduationCap", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    { name: "เบ็ดเตล็ด/อื่นๆ", icon: "FileText", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ],
  รายรับ: [
    { name: "เงินเดือน/ค่าจ้าง", icon: "Briefcase", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { name: "ธุรกิจส่วนตัว/ค้าขาย", icon: "TrendingUp", color: "bg-teal-100 text-teal-700 border-teal-200" },
    { name: "การลงทุน", icon: "Coins", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { name: "เงินช่วยเหลือ/ของขวัญ", icon: "Gift", color: "bg-purple-100 text-purple-700 border-purple-200" },
    { name: "รายรับอื่นๆ", icon: "PlusCircle", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ],
};
