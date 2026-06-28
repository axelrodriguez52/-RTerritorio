const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx58_vGZPvMEJcLvCgaPIPnQrJTg4ATBYQAInuRd238zsHhF9n28_8K4gMEcXlUUBEXfA/exec";

let registros = [];
let idToDelete = null;
let currentGPS = null;
let editCurrentGPS = null;

const wizardSection = document.getElementById("wizard-section");
const editSection = document.getElementById("edit-section");
const tableSection = document.getElementById("table-section");

const stepNombre = document.getElementById("step-nombre");
const stepTerritorio = document.getElementById("step-territorio");
const stepFechaInicio = document.getElementById("step-fechaInicio");
const stepFechaFin = document.getElementById("step-fechaFin");

const btnStep1Next = document.getElementById("btn-step1-next");
const btnStep2Back = document.getElementById("btn-step2-back");
const btnStep2Next = document.getElementById("btn-step2-next");
const btnStep2Gps = document.getElementById("btn-step2-gps");
const step2GpsStatus = document.getElementById("step2-gps-status");
const btnStep3Back = document.getElementById("btn-step3-back");
const btnStep3Submit = document.getElementById("btn-step3-submit");
const btnCancelar = document.getElementById("btn-cancelar");

const editNombre = document.getElementById("edit-nombre");
const editTerritorio = document.getElementById("edit-territorio");
const editGps = document.getElementById("edit-gps");
const editFechaInicio = document.getElementById("edit-fechaInicio");
const editFechaFin = document.getElementById("edit-fechaFin");
const btnEditGps = document.getElementById("btn-edit-gps");
const btnEditCancel = document.getElementById("btn-edit-cancel");
const btnEditSave = document.getElementById("btn-edit-save");

const registrosBody = document.getElementById("registros");
const noRecords = document.getElementById("no-records");
const buscador = document.getElementById("buscador");
const btnNuevo = document.getElementById("btn-nuevo");
const confirmModal = document.getElementById("confirm-modal");
const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
const btnCancelarEliminar = document.getElementById("btnCancelarEliminar");
const notification = document.getElementById("notification");

function isOnline() { return navigator.onLine; }
function getPending() { return JSON.parse(localStorage.getItem("rt_pending") || "[]"); }
function savePending(list) { localStorage.setItem("rt_pending", JSON.stringify(list)); }

function showOfflineBanner() {
  var b = document.getElementById("offline-banner");
  if (b) b.style.display = "block";
}
function hideOfflineBanner() {
  var b = document.getElementById("offline-banner");
  if (b) b.style.display = "none";
}

function goToStep(step) {
  document.getElementById("step-1").style.display = "none";
  document.getElementById("step-2").style.display = "none";
  document.getElementById("step-3").style.display = "none";
  document.getElementById("step-" + step).style.display = "block";

  for (var i = 1; i <= 3; i++) {
    var el = document.getElementById("progress-" + i);
    el.className = "progress-step" + (i <= step ? " active" : "") + (i < step ? " completed" : "");
  }
  for (var i = 1; i <= 2; i++) {
    var el = document.getElementById("line-" + i);
    el.className = "progress-line" + (i < step ? " completed" : "");
  }
}

function showWizard() {
  wizardSection.style.display = "block";
  editSection.style.display = "none";
  tableSection.style.display = "none";
  currentGPS = null;
  stepNombre.value = "";
  stepTerritorio.value = "";
  stepFechaInicio.value = "";
  stepFechaFin.value = "";
  step2GpsStatus.style.display = "none";
  goToStep(1);
}

function showTable() {
  wizardSection.style.display = "none";
  editSection.style.display = "none";
  tableSection.style.display = "block";
  cargarRegistros();
}

document.addEventListener("DOMContentLoaded", function() {
  if (!isOnline()) showOfflineBanner();
  showTable();
  programarNotificacion();
});

window.addEventListener("online", function() {
  hideOfflineBanner();
  showNotification("Conexion restaurada", "success");
  syncPending();
});
window.addEventListener("offline", function() {
  showOfflineBanner();
  showNotification("Sin conexion — los registros se guardaran localmente", "error");
});

async function syncPending() {
  var pending = getPending();
  if (pending.length === 0) return;
  var synced = 0;
  for (var i = 0; i < pending.length; i++) {
    try {
      var response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(pending[i])
      });
      var result = await response.json();
      if (result.success) synced++;
    } catch (e) { break; }
  }
  if (synced > 0) {
    savePending(pending.slice(synced));
    showNotification(synced + " registro(s) sincronizado(s)", "success");
    cargarRegistros();
  }
}

btnNuevo.addEventListener("click", showWizard);
btnCancelar.addEventListener("click", showTable);

btnStep1Next.addEventListener("click", function() {
  if (!stepNombre.value.trim()) {
    showNotification("Escribe tu nombre", "error");
    return;
  }
  goToStep(2);
});

btnStep2Gps.addEventListener("click", function() {
  if (!navigator.geolocation) {
    showNotification("Tu navegador no soporta GPS", "error");
    return;
  }
  btnStep2Gps.disabled = true;
  btnStep2Gps.textContent = "...";
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      currentGPS = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      };
      step2GpsStatus.textContent = "Ubicacion: " + currentGPS.lat + ", " + currentGPS.lng;
      step2GpsStatus.style.display = "block";
      stepTerritorio.value = "";
      btnStep2Gps.innerHTML = "&#128205; Ubicacion capturada";
      btnStep2Gps.disabled = false;
    },
    function(err) {
      btnStep2Gps.innerHTML = "&#128205; Usar ubicacion GPS actual";
      btnStep2Gps.disabled = false;
      showNotification("No se pudo obtener la ubicacion", "error");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

btnStep2Back.addEventListener("click", function() { goToStep(1); });
btnStep2Next.addEventListener("click", function() {
  if (!stepTerritorio.value.trim() && !currentGPS) {
    showNotification("Escribe el nombre del territorio o usa GPS", "error");
    return;
  }
  goToStep(3);
});

btnStep3Back.addEventListener("click", function() { goToStep(2); });

btnStep3Submit.addEventListener("click", async function() {
  if (!stepFechaInicio.value) {
    showNotification("Selecciona la fecha de inicio", "error");
    return;
  }

  var datos = {
    action: "create",
    nombre: stepNombre.value.trim(),
    territorio: stepTerritorio.value.trim() || (currentGPS ? currentGPS.lat + ", " + currentGPS.lng : ""),
    fechaInicio: stepFechaInicio.value,
    fechaFin: stepFechaFin.value,
    gps: currentGPS ? currentGPS.lat + ", " + currentGPS.lng : ""
  };

  btnStep3Submit.disabled = true;
  btnStep3Submit.textContent = "Guardando...";

  if (!isOnline()) {
    var pending = getPending();
    pending.push(datos);
    savePending(pending);
    registros.push({
      id: "local_" + Date.now(),
      nombre: datos.nombre,
      territorio: datos.territorio,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin || "",
      gps: datos.gps
    });
    showNotification("Guardado localmente — se sincroniza cuando haya internet", "success");
    btnStep3Submit.disabled = false;
    btnStep3Submit.textContent = "Registrar";
    showTable();
    return;
  }

  try {
    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos)
    });
    var result = await response.json();
    if (result.success) {
      showNotification("Registro creado exitosamente", "success");
      showTable();
    } else {
      showNotification(result.message || "Error al crear registro", "error");
    }
  } catch (error) {
    var pending = getPending();
    pending.push(datos);
    savePending(pending);
    registros.push({
      id: "local_" + Date.now(),
      nombre: datos.nombre,
      territorio: datos.territorio,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin || "",
      gps: datos.gps
    });
    showNotification("Guardado localmente — se sincroniza cuando haya internet", "success");
    showTable();
  } finally {
    btnStep3Submit.disabled = false;
    btnStep3Submit.textContent = "Registrar";
  }
});

async function cargarRegistros() {
  if (!isOnline()) {
    var cached = localStorage.getItem("rt_registros");
    if (cached) {
      registros = JSON.parse(cached);
      renderizarTabla(registros);
    }
    return;
  }
  try {
    var response = await fetch(APPS_SCRIPT_URL + "?action=getAll");
    var result = await response.json();
    if (result.success) {
      registros = result.data;
      localStorage.setItem("rt_registros", JSON.stringify(registros));
      renderizarTabla(registros);
    }
  } catch (error) {
    var cached = localStorage.getItem("rt_registros");
    if (cached) {
      registros = JSON.parse(cached);
      renderizarTabla(registros);
    }
  }
}

buscador.addEventListener("input", function() {
  var term = this.value.toLowerCase();
  var filtrados = registros.filter(function(r) {
    return r.nombre.toLowerCase().includes(term) || r.territorio.toLowerCase().includes(term);
  });
  renderizarTabla(filtrados);
});

btnConfirmarEliminar.addEventListener("click", function() {
  if (idToDelete) {
    ejecutarEliminar(idToDelete);
    confirmModal.style.display = "none";
    idToDelete = null;
  }
});
btnCancelarEliminar.addEventListener("click", function() {
  confirmModal.style.display = "none";
  idToDelete = null;
});
confirmModal.addEventListener("click", function(e) {
  if (e.target === confirmModal) {
    confirmModal.style.display = "none";
    idToDelete = null;
  }
});

function prepararEdicion(id) {
  var registro = registros.find(function(r) { return r.id === id; });
  if (!registro) return;

  wizardSection.style.display = "none";
  editSection.style.display = "block";
  tableSection.style.display = "none";

  editNombre.value = registro.nombre;
  editTerritorio.value = registro.territorio;
  editGps.value = registro.gps || "";
  editFechaInicio.value = fechaAInput(registro.fechaInicio);
  editFechaFin.value = fechaAInput(registro.fechaFin);
  editCurrentGPS = registro.gps ? { lat: registro.gps.split(", ")[0], lng: registro.gps.split(", ")[1] } : null;
  editSection.dataset.editId = id;
}

btnEditGps.addEventListener("click", function() {
  if (!navigator.geolocation) {
    showNotification("Tu navegador no soporta GPS", "error");
    return;
  }
  btnEditGps.disabled = true;
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      editCurrentGPS = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      };
      editGps.value = editCurrentGPS.lat + ", " + editCurrentGPS.lng;
      btnEditGps.disabled = false;
      showNotification("Ubicacion capturada", "success");
    },
    function(err) {
      btnEditGps.disabled = false;
      showNotification("No se pudo obtener la ubicacion", "error");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

btnEditCancel.addEventListener("click", showTable);

btnEditSave.addEventListener("click", async function() {
  var id = editSection.dataset.editId;
  var datos = {
    action: "update",
    id: id,
    nombre: editNombre.value.trim(),
    territorio: editTerritorio.value.trim(),
    fechaInicio: editFechaInicio.value,
    fechaFin: editFechaFin.value,
    gps: editCurrentGPS ? editCurrentGPS.lat + ", " + editCurrentGPS.lng : editGps.value
  };

  if (!datos.nombre || !datos.territorio || !datos.fechaInicio) {
    showNotification("Completa todos los campos obligatorios", "error");
    return;
  }

  btnEditSave.disabled = true;
  btnEditSave.textContent = "Guardando...";

  if (!isOnline()) {
    showNotification("Sin conexion — no se puede editar", "error");
    btnEditSave.disabled = false;
    btnEditSave.textContent = "Guardar";
    return;
  }

  try {
    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos)
    });
    var result = await response.json();
    if (result.success) {
      showNotification("Registro actualizado", "success");
      showTable();
    } else {
      showNotification("Error al actualizar", "error");
    }
  } catch (error) {
    showNotification("Error de conexion", "error");
  } finally {
    btnEditSave.disabled = false;
    btnEditSave.textContent = "Guardar";
  }
});

function confirmarEliminar(id) {
  idToDelete = id;
  confirmModal.style.display = "flex";
}

async function ejecutarEliminar(id) {
  if (!isOnline()) {
    showNotification("Sin conexion — no se puede eliminar", "error");
    return;
  }
  try {
    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "delete", id: id })
    });
    var result = await response.json();
    if (result.success) {
      showNotification("Registro eliminado", "success");
      cargarRegistros();
    }
  } catch (error) {
    showNotification("Error de conexion", "error");
  }
}

function renderizarTabla(data) {
  registrosBody.innerHTML = "";
  if (data.length === 0) {
    noRecords.style.display = "block";
    return;
  }
  noRecords.style.display = "none";
  data.forEach(function(registro) {
    var isLocal = String(registro.id).startsWith("local_");
    var gpsHtml = registro.gps
      ? '<a class="gps-link" href="https://www.google.com/maps?q=' + registro.gps + '" target="_blank">Ver mapa</a>'
      : '<span style="color:var(--text-tertiary)">-</span>';
    var row = document.createElement("tr");
    row.innerHTML =
      "<td>" + escapeHtml(registro.nombre) + "</td>" +
      "<td>" + escapeHtml(registro.territorio) + "</td>" +
      "<td>" + formatoFecha(registro.fechaInicio) + "</td>" +
      "<td>" + (registro.fechaFin ? formatoFecha(registro.fechaFin) : "-") + "</td>" +
      "<td>" + gpsHtml + "</td>" +
      '<td class="actions">' +
        (isLocal
          ? '<span class="sync-badge" title="Pendiente de sincronizar">&#9851;</span>'
          : '<button class="btn-icon edit btn-edit-row" data-id="' + registro.id + '" title="Editar">&#9998;</button>' +
            '<button class="btn-icon delete btn-delete-row" data-id="' + registro.id + '" title="Eliminar">&#128465;</button>') +
      "</td>";
    registrosBody.appendChild(row);
  });

  registrosBody.querySelectorAll(".btn-edit-row").forEach(function(btn) {
    btn.addEventListener("click", function() { prepararEdicion(this.dataset.id); });
  });
  registrosBody.querySelectorAll(".btn-delete-row").forEach(function(btn) {
    btn.addEventListener("click", function() { confirmarEliminar(this.dataset.id); });
  });
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  var dateStr = fecha.split("T")[0];
  var parts = dateStr.split("-");
  if (parts.length === 3) return parts[2] + "/" + parts[1] + "/" + parts[0];
  return fecha;
}

function fechaAInput(fecha) {
  if (!fecha) return "";
  var parts = fecha.split("/");
  if (parts.length === 3) return parts[2] + "-" + parts[1] + "-" + parts[0];
  return "";
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type) {
  notification.textContent = message;
  notification.className = "notification " + type + " show";
  setTimeout(function() { notification.className = "notification"; }, 3000);
}

function programarNotificacion() {
  setInterval(function() {
    var now = new Date();
    if (now.getHours() === 13 && now.getMinutes() === 0) {
      verificarNotificacion();
    }
  }, 60000);
  verificarNotificacion();
}

async function verificarNotificacion() {
  if (!isOnline()) return;
  try {
    var response = await fetch(APPS_SCRIPT_URL + "?action=getNotification");
    var result = await response.json();
    if (result.success) mostrarNotificacion(result.message);
  } catch (e) {}
}

function mostrarNotificacion(mensaje) {
  showNotification(mensaje, "success");
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(function(reg) {
      reg.showNotification("RTerritorio", {
        body: mensaje, icon: "icon-192.png", badge: "icon-192.png",
        tag: "rterritorio-notif", renotify: true
      });
    });
  }
}