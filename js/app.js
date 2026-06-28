const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx58_vGZPvMEJcLvCgaPIPnQrJTg4ATBYQAInuRd238zsHhF9n28_8K4gMEcXlUUBEXfA/exec";

let registros = [];
let idToDelete = null;
let idToEdit = null;
let currentGPS = null;

const form = document.getElementById("registro-form");
const nombreInput = document.getElementById("nombre");
const territorioInput = document.getElementById("territorio");
const fechaInicioInput = document.getElementById("fechaInicio");
const fechaFinInput = document.getElementById("fechaFin");
const editIdInput = document.getElementById("editId");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const formTitle = document.getElementById("form-title");
const registrosBody = document.getElementById("registros");
const noRecords = document.getElementById("no-records");
const buscador = document.getElementById("buscador");
const confirmModal = document.getElementById("confirm-modal");
const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
const btnCancelarEliminar = document.getElementById("btnCancelarEliminar");
const editModal = document.getElementById("edit-modal");
const btnConfirmarEditar = document.getElementById("btnConfirmarEditar");
const btnCancelarEditar = document.getElementById("btnCancelarEditar");
const notification = document.getElementById("notification");
const gpsCoords = document.getElementById("gpsCoords");
const btnGPS = document.getElementById("btnGPS");

function isOnline() {
  return navigator.onLine;
}

function getPending() {
  return JSON.parse(localStorage.getItem("rt_pending") || "[]");
}

function savePending(list) {
  localStorage.setItem("rt_pending", JSON.stringify(list));
}

function showOfflineBanner() {
  var banner = document.getElementById("offline-banner");
  if (banner) banner.style.display = "block";
}

function hideOfflineBanner() {
  var banner = document.getElementById("offline-banner");
  if (banner) banner.style.display = "none";
}

document.addEventListener("DOMContentLoaded", function() {
  if (!isOnline()) showOfflineBanner();
  cargarRegistros();
  verificarNotificacion();
  programarNotificacion();
});

btnGPS.addEventListener("click", function() {
  if (!navigator.geolocation) {
    showNotification("Tu navegador no soporta GPS", "error");
    return;
  }

  btnGPS.textContent = "...";
  btnGPS.disabled = true;

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      currentGPS = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      };
      gpsCoords.value = currentGPS.lat + ", " + currentGPS.lng;
      btnGPS.innerHTML = "&#128205;";
      btnGPS.disabled = false;
      showNotification("Ubicacion capturada", "success");
    },
    function(err) {
      btnGPS.innerHTML = "&#128205;";
      btnGPS.disabled = false;
      showNotification("No se pudo obtener la ubicacion", "error");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
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
    } catch (e) {
      break;
    }
  }

  if (synced > 0) {
    savePending(pending.slice(synced));
    showNotification(synced + " registro(s) sincronizado(s)", "success");
    cargarRegistros();
  }
}

form.addEventListener("submit", function(e) {
  e.preventDefault();

  var datos = {
    action: "create",
    nombre: nombreInput.value.trim(),
    territorio: territorioInput.value.trim(),
    fechaInicio: fechaInicioInput.value,
    fechaFin: fechaFinInput.value,
    gps: currentGPS ? currentGPS.lat + ", " + currentGPS.lng : ""
  };

  if (!datos.nombre || !datos.territorio || !datos.fechaInicio) {
    showNotification("Por favor completa todos los campos obligatorios", "error");
    return;
  }

  if (editIdInput.value) {
    datos.action = "update";
    datos.id = editIdInput.value;
    actualizarRegistro(datos);
  } else {
    agregarRegistro(datos);
  }
});

btnCancelar.addEventListener("click", cancelarEdicion);

buscador.addEventListener("input", function() {
  var term = this.value.toLowerCase();
  var filtrados = registros.filter(function(r) {
    return r.nombre.toLowerCase().includes(term) ||
           r.territorio.toLowerCase().includes(term);
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

btnConfirmarEditar.addEventListener("click", function() {
  if (idToEdit) {
    var registro = registros.find(function(r) { return r.id === idToEdit; });
    if (registro) {
      nombreInput.value = registro.nombre;
      territorioInput.value = registro.territorio;
      fechaInicioInput.value = fechaAInput(registro.fechaInicio);
      fechaFinInput.value = fechaAInput(registro.fechaFin);
      editIdInput.value = registro.id;

      formTitle.textContent = "Editar Registro";
      btnGuardar.textContent = "Actualizar";
      btnCancelar.style.display = "inline-block";

      document.getElementById("form-section").scrollIntoView({ behavior: "smooth" });
    }
    editModal.style.display = "none";
    idToEdit = null;
  }
});

btnCancelarEditar.addEventListener("click", function() {
  editModal.style.display = "none";
  idToEdit = null;
});

editModal.addEventListener("click", function(e) {
  if (e.target === editModal) {
    editModal.style.display = "none";
    idToEdit = null;
  }
});

async function cargarRegistros() {
  if (!isOnline()) {
    var cached = localStorage.getItem("rt_registros");
    if (cached) {
      registros = JSON.parse(cached);
      renderizarTabla(registros);
    } else {
      showNotification("Sin conexion — sin datos guardados", "error");
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
    } else {
      showNotification("Error al cargar registros", "error");
    }
  } catch (error) {
    var cached = localStorage.getItem("rt_registros");
    if (cached) {
      registros = JSON.parse(cached);
      renderizarTabla(registros);
      showNotification("Usando datos guardados localmente", "error");
    } else {
      showNotification("Error de conexion", "error");
    }
  }
}

async function agregarRegistro(datos) {
  if (!isOnline()) {
    var pending = getPending();
    pending.push(datos);
    savePending(pending);

    var temp = {
      id: "local_" + Date.now(),
      nombre: datos.nombre,
      territorio: datos.territorio,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin || ""
    };
    registros.push(temp);
    renderizarTabla(registros);

    showNotification("Guardado localmente — se sincroniza cuando haya internet", "success");
    limpiarFormulario();
    return;
  }

  try {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos)
    });

    var result = await response.json();

    if (result.success) {
      showNotification("Registro creado exitosamente", "success");
      limpiarFormulario();
      cargarRegistros();
    } else {
      showNotification(result.message || "Error al crear registro", "error");
    }
  } catch (error) {
    var pending = getPending();
    pending.push(datos);
    savePending(pending);

    var temp = {
      id: "local_" + Date.now(),
      nombre: datos.nombre,
      territorio: datos.territorio,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin || ""
    };
    registros.push(temp);
    renderizarTabla(registros);

    showNotification("Guardado localmente — se sincroniza cuando haya internet", "success");
    limpiarFormulario();
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Registrar";
  }
}

async function actualizarRegistro(datos) {
  if (!isOnline()) {
    showNotification("Sin conexion — no se puede editar", "error");
    return;
  }

  try {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Actualizando...";

    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos)
    });

    var result = await response.json();

    if (result.success) {
      showNotification("Registro actualizado exitosamente", "success");
      limpiarFormulario();
      cargarRegistros();
    } else {
      showNotification("Error al actualizar registro", "error");
    }
  } catch (error) {
    showNotification("Error de conexion", "error");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Registrar";
  }
}

function prepararEdicion(id) {
  var registro = registros.find(function(r) { return r.id === id; });
  if (!registro) return;

  idToEdit = id;
  editModal.style.display = "flex";
}

function cancelarEdicion() {
  limpiarFormulario();
}

function limpiarFormulario() {
  form.reset();
  editIdInput.value = "";
  formTitle.textContent = "Nuevo Registro";
  btnGuardar.textContent = "Registrar";
  btnCancelar.style.display = "none";
  currentGPS = null;
  gpsCoords.value = "";
}

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
    } else {
      showNotification("Error al eliminar registro", "error");
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
          : '<button class="btn-icon edit" onclick="prepararEdicion(\'' + registro.id + '\')" title="Editar">&#9998;</button>' +
            '<button class="btn-icon delete" onclick="confirmarEliminar(\'' + registro.id + '\')" title="Eliminar">&#128465;</button>') +
      "</td>";
    registrosBody.appendChild(row);
  });
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  var dateStr = fecha.split("T")[0];
  var parts = dateStr.split("-");
  if (parts.length === 3) {
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return fecha;
}

function fechaAInput(fecha) {
  if (!fecha) return "";
  var parts = fecha.split("/");
  if (parts.length === 3) {
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }
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

  setTimeout(function() {
    notification.className = "notification";
  }, 3000);
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

    if (result.success) {
      mostrarNotificacion(result.message);
    }
  } catch (e) {}
}

function mostrarNotificacion(mensaje) {
  showNotification(mensaje, "success");

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(function(reg) {
      reg.showNotification("RTerritorio", {
        body: mensaje,
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: "rterritorio-notif",
        renotify: true
      });
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification("RTerritorio", { body: mensaje, icon: "icon-192.png" });
  }
}