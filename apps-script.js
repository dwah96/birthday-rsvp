function doPost(e) {
  try {
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        message: "資料格式錯誤，請重新送出。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var EXPECTED_KEY = "sam-birthday-2026-private-key";
    if (data.eventKey !== EXPECTED_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: false, 
        message: "驗證失敗，請使用正式邀請連結。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.honeypot) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }

    var guestName = data.guestName || "";
    var instagram = data.instagram || "";
    var phone = String(data.phone || "").trim();
    var gender = data.gender || "";
    var attending = data.attendingStatus === "yes" ? "Going" : "Not going";
    var femalePlusOnes = parseInt(data.femalePlusOnes, 10) || 0;
    var malePlusOnes = parseInt(data.malePlusOnes, 10) || 0;
    var notes = data.notes || "";
    var timestamp = data.timestamp || new Date().toISOString();

    if (phone && !/^\d{10}$/.test(phone)) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        message: "手機號碼需為 10 位數字。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    function getOrCreateSheet(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        if (sheetName === "All RSVPs") {
          var headerRow = [
            "Name",
            "Instagram",
            "Phone",
            "Gender",
            "Going or not",
            "Guest type",
            "Invited by",
            "Bill split needed",
            "Notes",
            "Submitted at",
            "Status"
          ];
          sheet.appendRow(headerRow);
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, headerRow.length).setFontWeight("bold");
        }
      }
      return sheet;
    }

    var allSheet = getOrCreateSheet("All RSVPs");
    var girlsSheet = getOrCreateSheet("Girls");
    var guysSheet = getOrCreateSheet("Guys");

    // Setup queries in Girls and Guys sheets if they don't have them
    if (girlsSheet.getLastRow() === 0) {
      girlsSheet.getRange("A1").setFormula("=QUERY('All RSVPs'!A:K, \"SELECT * WHERE D = 'Female' AND E = 'Going' AND K = 'Active'\", 1)");
    }
    if (guysSheet.getLastRow() === 0) {
      guysSheet.getRange("A1").setFormula("=QUERY('All RSVPs'!A:K, \"SELECT * WHERE D = 'Male' AND E = 'Going' AND K = 'Active'\", 1)");
    }

    var mainBillSplit = gender === "Male" ? "Yes" : "No";

    var mainRow = [
      guestName,
      instagram,
      phone,
      gender,
      attending,
      "Main guest",
      "",
      mainBillSplit,
      notes,
      timestamp,
      "Active"
    ];

    allSheet.appendRow(mainRow);

    if (attending === "Going") {
      for (var f = 0; f < femalePlusOnes; f++) {
        var fRow = [
          "Female plus one", "", "", "Female", "Going",
          "Plus one", guestName, "No", "", timestamp, "Active"
        ];
        allSheet.appendRow(fRow);
      }

      for (var m = 0; m < malePlusOnes; m++) {
        var mRow = [
          "Male plus one", "", "", "Male", "Going",
          "Plus one", guestName, "Yes", "", timestamp, "Active"
        ];
        allSheet.appendRow(mRow);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      ok: true,
      message: "RSVP 已成功送出。"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      ok: false, 
      message: "伺服器錯誤：" + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
