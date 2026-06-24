const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbz6vIXpFLwN6T_sL6D2hRgFmk1Y546BnW9AsCz2TKXcs1tkAsJIpcu0qnDSCFckuyPg/exec";

let registros = [];
let idToDelete = null;
let currentUser = null;
let heartbeatInterval = null;
let onlineInterval = null;

const loginScreen = document.getElementById("login-screen");
const appContent = document.getElementById("app-content");
const loginForm = document.getElementById("login-form");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const loginError = document.getElementById("loginError");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userDisplay = document.getElementById("userDisplay");

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
const onlineSection = document.getElementById("online-section");
const onlineList = document.getElementById("online-list");

var APP_VERSION = "v4";

document.addEventListener("DOMContentLoaded", function() {
  var savedVersion = localStorage.getItem("rt_version");
  if (savedVersion !== APP_VERSION) {
    localStorage.removeItem("rt_session");
    localStorage.setItem("rt_version", APP_VERSION);
  }

  var saved = localStorage.getItem("rt_session");
  if (saved) {
    currentUser = JSON.parse(saved);
    if (!currentUser.rol) {
      localStorage.removeItem("rt_session");
      return;
    }
    showApp();
  }
});

loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  login();
});

btnLogin.addEventListener("click", login);

btnLogout.addEventListener("click", function() {
  fetch(APPS_SCRIPT_URL + "?action=logout&user=" + encodeURIComponent(currentUser.user));
  clearInterval(heartbeatInterval);
  clearInterval(onlineInterval);
  localStorage.removeItem("rt_session");
  currentUser = null;
  loginScreen.style.display = "flex";
  appContent.style.display = "none";
  loginUser.value = "";
  loginPass.value = "";
  loginError.style.display = "none";
});

async function login() {
  var user = loginUser.value.trim();
  var pass = loginPass.value;

  if (!user || !pass) {
    loginError.textContent = "Ingresa usuario y contraseña";
    loginError.style.display = "block";
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Ingresando...";
  loginError.style.display = "none";

  try {
    var response = await fetch(APPS_SCRIPT_URL + "?action=login&user=" + encodeURIComponent(user) + "&pass=" + encodeURIComponent(pass));
    var result = await response.json();

    if (result.success) {
      currentUser = { user: result.user, nombre: result.nombre, rol: result.rol };
      localStorage.setItem("rt_session", JSON.stringify(currentUser));
      showApp();
    } else {
      loginError.textContent = result.message;
      loginError.style.display = "block";
    }
  } catch (error) {
    loginError.textContent = "Error de conexión. Verifica la URL.";
    loginError.style.display = "block";
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Ingresar";
  }
}

function showApp() {
  loginScreen.style.display = "none";
  appContent.style.display = "block";
  userDisplay.textContent = (currentUser.nombre || currentUser.user) + " (" + currentUser.rol + ")";

  if (isAdmin()) {
    btnExportar.style.display = "inline-block";
    onlineSection.style.display = "block";
    cargarOnline();
    onlineInterval = setInterval(cargarOnline, 10000);
  } else {
    btnExportar.style.display = "none";
    onlineSection.style.display = "none";
  }

  iniciarHeartbeat();
  cargarRegistros();
}

function iniciarHeartbeat() {
  heartbeatInterval = setInterval(function() {
    fetch(APPS_SCRIPT_URL + "?action=heartbeat&user=" + encodeURIComponent(currentUser.user));
  }, 30000);
}

async function cargarOnline() {
  try {
    var response = await fetch(APPS_SCRIPT_URL + "?action=getOnline");
    var result = await response.json();
    if (result.success) {
      renderOnlineUsers(result.data);
    }
  } catch (e) {}
}

function renderOnlineUsers(users) {
  onlineList.innerHTML = "";
  if (users.length === 0) {
    onlineList.innerHTML = '<p class="online-empty">No hay usuarios conectados</p>';
    return;
  }
  users.forEach(function(u) {
    var div = document.createElement("div");
    div.className = "online-user";
    div.innerHTML = '<span class="online-dot"></span>' +
      '<span class="online-name">' + escapeHtml(u.nombre) + '</span>' +
      '<span class="online-role">' + escapeHtml(u.rol) + '</span>';
    onlineList.appendChild(div);
  });
}

function isAdmin() {
  return currentUser && currentUser.rol === "admin";
}

function canEdit(registro) {
  return isAdmin() || registro.creadoPor === currentUser.user;
}

form.addEventListener("submit", function(e) {
  e.preventDefault();

  var datos = {
    nombre: nombreInput.value.trim(),
    territorio: territorioInput.value.trim(),
    fechaInicio: fechaInicioInput.value,
    fechaFin: fechaFinInput.value,
    currentUser: currentUser.user
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

btnExportar.addEventListener("click", function() {
  if (!isAdmin()) {
    showNotification("Solo el administrador puede exportar", "error");
    return;
  }
  if (registros.length === 0) {
    showNotification("No hay registros para exportar", "error");
    return;
  }
  exportarAExcel(registros);
});

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
    var response = await fetch(APPS_SCRIPT_URL + "?action=getAll&user=" + encodeURIComponent(currentUser.user));
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
      showNotification("Error al crear registro", "error");
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

  if (!canEdit(registro)) {
    showNotification("No puedes editar registros de otros usuarios", "error");
    return;
  }

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
  var registro = registros.find(function(r) { return r.id === id; });
  if (!registro) return;

  if (!canEdit(registro)) {
    showNotification("No puedes eliminar registros de otros usuarios", "error");
    return;
  }

  idToDelete = id;
  confirmModal.style.display = "flex";
}

async function ejecutarEliminar(id) {
  try {
    var response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "delete", id: id, currentUser: currentUser.user })
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
    var editable = canEdit(registro);
    var row = document.createElement("tr");
    row.innerHTML =
      "<td>" + escapeHtml(registro.nombre) + "</td>" +
      "<td>" + escapeHtml(registro.territorio) + "</td>" +
      "<td>" + formatoFecha(registro.fechaInicio) + "</td>" +
      "<td>" + (registro.fechaFin ? formatoFecha(registro.fechaFin) : "-") + "</td>" +
      '<td class="actions">' +
        (editable
          ? '<button class="btn-icon edit" onclick="prepararEdicion(\'' + registro.id + '\')" title="Editar">&#9998;</button>' +
            '<button class="btn-icon delete" onclick="confirmarEliminar(\'' + registro.id + '\')" title="Eliminar">&#128465;</button>'
          : '<span class="text-lock" title="Registro de otro usuario">&#128274;</span>') +
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
