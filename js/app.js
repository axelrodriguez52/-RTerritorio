const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0blKDUCUDVZaPcWPsH9GfSW-6OQ-_x6t-3DMVnnthJ46qQ2ukJKovXoRn0VGqjjmbEg/exec";

let registros = [];
let idToDelete = null;

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
const btnExportar = document.getElementById("btnExportar");
const confirmModal = document.getElementById("confirm-modal");
const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
const btnCancelarEliminar = document.getElementById("btnCancelarEliminar");
const notification = document.getElementById("notification");

document.addEventListener("DOMContentLoaded", function() {
  cargarRegistros();
});

form.addEventListener("submit", function(e) {
  e.preventDefault();

  var datos = {
    nombre: nombreInput.value.trim(),
    territorio: territorioInput.value.trim(),
    fechaInicio: fechaInicioInput.value,
    fechaFin: fechaFinInput.value
  };

  if (!datos.nombre || !datos.territorio || !datos.fechaInicio) {
    showNotification("Por favor completa todos los campos obligatorios", "error");
    return;
  }

  if (editIdInput.value) {
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

async function cargarRegistros() {
  try {
    var response = await fetch(APPS_SCRIPT_URL + "?action=getAll");
    var result = await response.json();

    if (result.success) {
      registros = result.data;
      renderizarTabla(registros);
    } else {
      showNotification("Error al cargar registros", "error");
    }
  } catch (error) {
    showNotification("Error de conexión", "error");
    console.error(error);
  }
}

async function agregarRegistro(datos) {
  try {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "create", ...datos })
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
    showNotification("Error de conexión", "error");
    console.error(error);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Registrar";
  }
}

async function actualizarRegistro(datos) {
  try {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Actualizando...";

    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "update", ...datos })
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
    showNotification("Error de conexión", "error");
    console.error(error);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Registrar";
  }
}

function prepararEdicion(id) {
  var registro = registros.find(function(r) { return r.id === id; });
  if (!registro) return;

  nombreInput.value = registro.nombre;
  territorioInput.value = registro.territorio;
  fechaInicioInput.value = registro.fechaInicio;
  fechaFinInput.value = registro.fechaFin || "";
  editIdInput.value = registro.id;

  formTitle.textContent = "Editar Registro";
  btnGuardar.textContent = "Actualizar";
  btnCancelar.style.display = "inline-block";

  document.getElementById("form-section").scrollIntoView({ behavior: "smooth" });
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
}

function confirmarEliminar(id) {
  idToDelete = id;
  confirmModal.style.display = "flex";
}

async function ejecutarEliminar(id) {
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
    showNotification("Error de conexión", "error");
    console.error(error);
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
    var row = document.createElement("tr");
    row.innerHTML =
      "<td>" + escapeHtml(registro.nombre) + "</td>" +
      "<td>" + escapeHtml(registro.territorio) + "</td>" +
      "<td>" + formatoFecha(registro.fechaInicio) + "</td>" +
      "<td>" + (registro.fechaFin ? formatoFecha(registro.fechaFin) : "-") + "</td>" +
      '<td class="actions">' +
        '<button class="btn-icon edit" onclick="prepararEdicion(\'' + registro.id + '\')" title="Editar">&#9998;</button>' +
        '<button class="btn-icon delete" onclick="confirmarEliminar(\'' + registro.id + '\')" title="Eliminar">&#128465;</button>' +
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