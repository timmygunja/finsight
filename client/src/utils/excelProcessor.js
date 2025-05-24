const XLSX = require("xlsx");

/**
 * Process Excel files and extract data
 * @param {Buffer} buffer - File buffer
 * @returns {Object} Processed data
 */
async function processExcelFile(buffer) {
  try {
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Extract data from all sheets
    const result = {};

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip empty sheets
      if (jsonData.length === 0) return;

      // Extract headers (first row)
      const headers = jsonData[0];

      // Convert to array of objects with headers as keys
      const data = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row.length === 0) continue; // Skip empty rows

        const rowData = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            // Skip empty headers
            rowData[headers[j]] = row[j];
          }
        }
        data.push(rowData);
      }

      result[sheetName] = {
        headers,
        data,
        rowCount: jsonData.length - 1,
        columnCount: headers.length,
      };
    });

    // Add summary information
    result.summary = {
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
    };

    return result;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    throw new Error("Failed to process Excel file");
  }
}

module.exports = { processExcelFile };
