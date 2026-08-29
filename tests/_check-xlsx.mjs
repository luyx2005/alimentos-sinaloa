import * as XLSX from "xlsx";
const file = process.argv[2];
const wb = XLSX.readFile(file);
console.log("hojas:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
  console.log(`\n--- ${name} (${rows.length} filas) ---`);
  console.log(JSON.stringify(rows[0]));
  console.log(JSON.stringify(rows[1]));
  console.log("última:", JSON.stringify(rows[rows.length - 1]));
}
