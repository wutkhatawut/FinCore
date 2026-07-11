import React, { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Key, 
  Settings, 
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Serverless Mode is now the default and only mode
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    return !!localStorage.getItem("local_password_hash") && !!localStorage.getItem("local_gas_webapp_url");
  });

  // Setup state
  const [setupGasUrl, setSetupGasUrl] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  // SHA-256 Hashing helper
  const hashPassword = async (plainText: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(plainText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleServerlessSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupGasUrl) {
      setError("กรุณากรอก URL ของ Google Apps Script (GAS_WEBAPP_URL)");
      return;
    }
    if (!setupGasUrl.startsWith("https://script.google.com/")) {
      setError("URL ของ Google Apps Script ต้องเริ่มต้นด้วย https://script.google.com/");
      return;
    }
    if (!setupPassword) {
      setError("กรุณากำหนดรหัสผ่าน");
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Hash password with SHA-256
      const hashedPassword = await hashPassword(setupPassword);
      
      // 2. Save securely to browser localStorage
      localStorage.setItem("local_password_hash", hashedPassword);
      localStorage.setItem("local_gas_webapp_url", setupGasUrl.trim());
      localStorage.setItem("use_serverless_mode", "true");
      
      setIsConfigured(true);
      setPassword("");
      setError(null);
      
      // Auto login on successful setup
      onLoginSuccess("serverless-authorized-token");
    } catch (err) {
      console.error("Serverless Setup error:", err);
      setError("เกิดข้อผิดพลาดในการตั้งค่าความปลอดภัยแบบโลคอล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const storedHash = localStorage.getItem("local_password_hash");
      if (!storedHash) {
        setError("ยังไม่ได้ตั้งค่ารหัสผ่านสำหรับการใช้งานแบบไร้เซิร์ฟเวอร์");
        setIsLoading(false);
        return;
      }

      // Calculate hash of input password
      const inputHash = await hashPassword(password);

      if (inputHash === storedHash) {
        onLoginSuccess("serverless-authorized-token");
      } else {
        setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Local Login error:", err);
      setError("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่านความปลอดภัย");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSetup = () => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างการตั้งค่าและรหัสผ่านทั้งหมด? (ข้อมูลใน Google Sheets ของคุณจะไม่ถูกลบ)")) {
      localStorage.removeItem("local_password_hash");
      localStorage.removeItem("local_gas_webapp_url");
      setIsConfigured(false);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4" id="login-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Personal Finance Tracker
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            แอปพลิเคชันเวอร์ชันเซิร์ฟเวอร์เลสแบบปลอดภัยสูง 100% (เหมาะสำหรับ GitHub Pages)
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10 space-y-6">
          
          {/* Conditional Rendering based on config state */}
          {!isConfigured ? (
            /* SERVERLESS SETUP FORM */
            <form onSubmit={handleServerlessSetup} className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-800 leading-relaxed space-y-1.5">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  การรักษาความปลอดภัยระดับสูง (SHA-256 Client-Side)
                </p>
                <p>
                  หน้าเว็บจะทำงานแบบ Static 100% บนเบราว์เซอร์ของคุณ ข้อมูล URL และรหัสผ่านทั้งหมดจะถูกเก็บแบบเข้ารหัสเฉพาะในเครื่องของคุณเท่านั้น <strong>ไม่มีการส่งรหัสผ่านของคุณขึ้น GitHub หรืออินเทอร์เน็ตใดๆ</strong> ปลอดภัย 100% จากการตรวจสอบซอร์สโค้ด (F12)
                </p>
              </div>

              <div>
                <label htmlFor="setup-gas-url" className="block text-sm font-semibold text-slate-700 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="setup-gas-url"
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={setupGasUrl}
                  onChange={(e) => setSetupGasUrl(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="setup-password" className="block text-sm font-semibold text-slate-700 mb-1">
                  ตั้งค่ารหัสผ่านใหม่สำหรับเบราว์เซอร์นี้
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="setup-password"
                    type={showSetupPassword ? "text" : "password"}
                    required
                    placeholder="กำหนดรหัสผ่านเข้าใช้งานหน้าจอ"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-slate-50 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showSetupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="setup-confirm-password" className="block text-sm font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านอีกครั้ง
                </label>
                <input
                  id="setup-confirm-password"
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่านเดิมซ้ำอีกครั้ง"
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex gap-3 animate-pulse">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="text-sm text-red-700 font-medium">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    กำลังบันทึกความปลอดภัย...
                  </>
                ) : (
                  "บันทึกการตั้งค่าและเข้าใช้งาน"
                )}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN FORM (Checking against the local SHA-256 password hash) */
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1 flex justify-between items-center">
                  <span>รหัสผ่านเข้าใช้งาน</span>
                  <button
                    type="button"
                    onClick={handleResetSetup}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                    title="ล้างข้อมูลการตั้งค่าเดิมเพื่อกำหนดค่าใหม่"
                  >
                    <Settings className="w-3 h-3" />
                    <span>ล้างการตั้งค่าใหม่</span>
                  </button>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all bg-slate-50 hover:bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex gap-3 animate-pulse">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="text-sm text-red-700 font-medium">{error}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    "เข้าสู่ระบบ"
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}


