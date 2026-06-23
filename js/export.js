function exportarAExcel(datos) {
  const headers = ["Nombre", "Territorio", "Fecha Inicio", "Fecha Fin"];
  const rows = datos.map(function(r) {
    return [
      r.nombre,
      r.territorio,
      r.fechaInicio ? formatoFechaExport(r.fechaInicio) : "",
      r.fechaFin ? formatoFechaExport(r.fechaFin) : ""
    ];
  });

  const wsData = [headers].concat(rows);
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registros");

  const fecha = new Date().toISOString().split("T")[0];
  const filename = "registros_territorio_" + fecha + ".xlsx";

  XLSX.writeFile(wb, filename);

  showNotification("Excel descargado: " + filename, "success");
}

function formatoFechaExport(fecha) {
  if (!fecha) return "";
  const parts = fecha.split("-");
  if (parts.length === 3) {
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return fecha;
}
