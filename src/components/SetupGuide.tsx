import React, { useState } from "react";
import { Copy, Check, ExternalLink, Settings, Database, RefreshCw, FileText } from "lucide-react";

interface SetupGuideProps {
  onRefresh: () => void;
}

export default function SetupGuide({ onRefresh }: SetupGuideProps) {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const gasCode = `/**
 * Google Apps Script Web App for Personal Finance Tracker Database
 * 
 * คัดลอกโค้ดนี้ไปวางใน Google Apps Script ของคุณเพื่อเริ่มต้นใช้งานหรือเปิดฟังก์ชันการลบข้อมูล
 */

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Transactions");
  
  if (!sheet) {
    sheet = ss.insertSheet("Transactions");
    sheet.appendRow(["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน", "หมายเหตุ"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  try {
    var sheet = setupSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var jsonArray = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = {};
      record["id"] = i + 1; // ใช้แถวจริงใน Google Sheets เพื่อความแม่นยำในการระบุแถว
      record["date"] = row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : "";
      record["type"] = row[1] || "";
      record["category"] = row[2] || "";
      record["amount"] = Number(row[3]) || 0;
      record["notes"] = row[4] || "";
      jsonArray.push(record);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: jsonArray }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = setupSheet();
    var postData;
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No data provided or invalid format");
    }
    
    // หากเป็นการส่งคำสั่งลบข้อมูล
    if (postData.action === "delete") {
      var ids = postData.ids;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new Error("No IDs provided for deletion");
      }
      
      // เรียงลำดับแถวจากมากไปน้อยเพื่อไม่ให้ส่งผลกระทบต่อแถวอื่นขณะลบ
      ids.sort(function(a, b) { return b - a; });
      
      var deletedCount = 0;
      var lastRow = sheet.getLastRow();
      
      for (var k = 0; k < ids.length; k++) {
        var rowNum = Number(ids[k]);
        if (rowNum > 1 && rowNum <= lastRow) {
          sheet.deleteRow(rowNum);
          deletedCount++;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Deleted " + deletedCount + " transaction(s) successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // บันทึกข้อมูลรายการตามปกติ
    var date = postData.date ? new Date(postData.date) : new Date();
    var type = postData.type || "รายจ่าย";
    var category = postData.category || "ทั่วไป";
    var amount = Number(postData.amount) || 0;
    var notes = postData.notes || "";
    
    sheet.appendRow([date, type, category, amount, notes]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Transaction added successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkStatus = () => {
    setIsChecking(true);
    setTimeout(() => {
      onRefresh();
      setIsChecking(false);
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" id="setup-guide">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white text-center">
        <Database className="w-12 h-12 mx-auto mb-2 opacity-90" />
        <h2 className="text-2xl font-bold font-sans tracking-tight">ตั้งค่าฐานข้อมูล Google Sheets</h2>
        <p className="text-emerald-50 text-sm mt-1 max-w-md mx-auto">
          เชื่อมโยงระบบกับ Google Sheets ส่วนตัวของคุณใน 5 ขั้นตอนง่ายๆ เพื่อบันทึกข้อมูลอย่างปลอดภัย
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            ขั้นตอนการเชื่อมต่อฐานข้อมูล
          </h3>

          <ol className="space-y-4 text-sm text-slate-600 list-decimal pl-5">
            <li className="leading-relaxed">
              สร้างหรือเปิด <span className="font-bold text-slate-800">Google Sheet</span> ที่ต้องการเก็บข้อมูลขึ้นมา
            </li>
            <li className="leading-relaxed">
              ไปที่เมนูบนตารางของท่าน: เลือก <span className="font-bold text-slate-800">ส่วนขยาย (Extensions)</span> &gt;{" "}
              <span className="font-bold text-slate-800">Apps Script</span>
            </li>
            <li className="leading-relaxed">
              ลบโค้ดที่มีอยู่ทั้งหมดออก จากนั้นคัดลอกโค้ดจากกล่องด้านล่างนี้ไปวางแทนที่
            </li>
            <li className="leading-relaxed">
              กดบันทึกแล้วกด <span className="font-bold text-slate-800">การทำให้ใช้งานได้ (Deploy)</span> &gt;{" "}
              <span className="font-bold text-slate-800">การทำให้ใช้งานได้ใหม่ (New deployment)</span>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-500">
                <li>เลือกประเภทเป็น <span className="font-bold text-slate-700">เว็บแอป (Web app)</span></li>
                <li>ตั้งค่าการเข้าถึง: ผู้ใช้เป็นบัญชีของคุณ และกำหนดให้ <span className="font-bold text-slate-700">"ทุกคน" (Anyone)</span> เข้าถึงได้</li>
                <li>กดปุ่ม Deploy และให้สิทธิ์การเข้าถึงข้อมูลตามขั้นตอนของ Google</li>
              </ul>
            </li>
            <li className="leading-relaxed">
              คัดลอก <span className="font-bold text-slate-800">URL ของเว็บแอป (Web app URL)</span> ที่ลงท้ายด้วย `/exec` ไปตั้งค่าในแผง Secrets หรือใส่ในไฟล์ <span className="font-bold text-emerald-600">.env</span> ที่ตัวแปร <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">GAS_WEBAPP_URL</span>
            </li>
          </ol>
        </div>

        {/* Code Block Container */}
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <FileText className="w-3.5 h-3.5" />
              Code.gs
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกโค้ด</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-b-xl overflow-x-auto text-xs font-mono max-h-64 leading-relaxed">
            {gasCode}
          </pre>
        </div>

        {/* Call to Action */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-slate-800">กรอกข้อมูลและบันทึกลงตัวแปรเรียบร้อยแล้วใช่หรือไม่?</p>
            <p className="text-xs text-slate-500">กรุณากดตรวจสอบระบบอีกครั้งหลังจากเปลี่ยนค่าในไฟล์ .env</p>
          </div>
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "กำลังเชื่อมต่อ..." : "ตรวจสอบสถานะอีกครั้ง"}
          </button>
        </div>
      </div>
    </div>
  );
}
