/**
 * Google Apps Script Web App for Personal Finance Tracker Database
 * 
 * วิธีการติดตั้งใน Google Sheets:
 * 1. เปิด Google Sheet ที่คุณต้องการใช้เป็นฐานข้อมูล
 * 2. ไปที่ menu 'ส่วนขยาย' (Extensions) > 'Apps Script'
 * 3. ลบโค้ดเริ่มต้นทั้งหมดในไฟล์ `รหัส.gs` (Code.gs) แล้วคัดลอกโค้ดด้านล่างนี้ไปวางแทน
 * 4. กดปุ่มบันทึกโครงการ (รูปแผ่นดิสก์)
 * 5. กดปุ่ม 'การทำให้ใช้งานได้' (Deploy) > 'การทำให้ใช้งานได้ใหม่' (New deployment)
 * 6. เลือกประเภทการทำให้ใช้งานได้เป็น 'เว็บแอป' (Web app)
 * 7. ตั้งค่าการเข้าถึงดังนี้:
 *    - Execute as: 'Me' (อีเมลของคุณ)
 *    - Who has access: 'Anyone' (ทุกคน - เพื่อให้เซิร์ฟเวอร์ Express เรียกใช้ได้โดยไม่ต้องมีบัญชี Google)
 * 8. กดปุ่ม 'Deploy' และยินยอมสิทธิ์ (Authorize access) หากมีป๊อปอัปแจ้งเตือน
 * 9. คัดลอก 'URL ของเว็บแอป' (Web app URL) ที่ลงท้ายด้วย `/exec` มาใส่ในไฟล์ `.env` ของคุณที่ตัวแปร `GAS_WEBAPP_URL`
 */

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Transactions");
  
  if (!sheet) {
    sheet = ss.insertSheet("Transactions");
    // เขียนหัวข้อคอลัมน์ (คอลัมน์: วันที่, ประเภท, หมวดหมู่, จำนวนเงิน, หมายเหตุ)
    sheet.appendRow(["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน", "หมายเหตุ"]);
    // จัดรูปแบบหัวตาราง
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  try {
    var sheet = setupSheet();
    var data = sheet.getDataRange().getValues();
    
    // ถ้ามีแต่แถวหัวตาราง (มีข้อมูลแถวเดียว) ให้ส่งอาเรย์ว่างกลับไป
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var jsonArray = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = {};
      
      // แปลงแถวข้อมูลเป็นอ็อบเจกต์ JSON
      record["id"] = i + 1; // ใช้หมายเลขแถวจริงใน Google Sheets เป็น ID (แถว 2, 3, 4...) เพื่อความแม่นยำในการลบและแก้ไข
      record["date"] = row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : "";
      record["type"] = row[1] || "";
      record["category"] = row[2] || "";
      record["amount"] = Number(row[3]) || 0;
      record["notes"] = row[4] || "";
      
      jsonArray.push(record);
    }
    
    // ส่งผลลัพธ์ข้อมูลทั้งหมดกลับเป็น JSON
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
    
    // ตรวจสอบข้อมูลดิบที่ส่งเข้ามา
    var postData;
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No data provided or invalid format");
    }
    
    // จัดการลบรายการ (รองรับแบบเดี่ยวและกลุ่ม)
    if (postData.action === "delete") {
      var ids = postData.ids;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new Error("No transaction IDs (row numbers) provided for deletion");
      }
      
      // เรียงลำดับแถวจากมากไปน้อยเพื่อไม่ให้ดัชนีแถวคลาดเคลื่อนเวลาลบทีละแถว
      ids.sort(function(a, b) { return b - a; });
      
      var deletedCount = 0;
      var lastRow = sheet.getLastRow();
      
      for (var k = 0; k < ids.length; k++) {
        var rowNum = Number(ids[k]);
        // ตรวจสอบว่าอยู่ในช่วงแถวที่ถูกต้อง (ไม่ลบแถวหัวตารางที่ 1 และไม่เกินแถวสุดท้าย)
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
    
    // การบันทึกข้อมูลแบบปกติ
    var date = postData.date ? new Date(postData.date) : new Date();
    var type = postData.type || "รายจ่าย";
    var category = postData.category || "ทั่วไป";
    var amount = Number(postData.amount) || 0;
    var notes = postData.notes || "";
    
    // เพิ่มแถวข้อมูลลงในชีต "Transactions"
    sheet.appendRow([date, type, category, amount, notes]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Transaction added successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
