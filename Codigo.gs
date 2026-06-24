var SHEET_NAME = "Hoja 1";
var USERS_SHEET = "Usuarios";
var SESSIONS_SHEET = "Sesiones";

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e.parameter.action;

  if (action === "login") return validarLogin(e.parameter.user, e.parameter.pass);
  if (action === "getAll") return getAllRegistros(e.parameter.user);
  if (action === "heartbeat") return heartbeat(e.parameter.user);
  if (action === "logout") return logout(e.parameter.user);
  if (action === "getOnline") return getOnlineUsers();

  return jsonResponse({ success: false, message: "Accion no valida" });
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  if (data.action === "create") return crearRegistro(data);
  if (data.action === "update") return actualizarRegistro(data);
  if (data.action === "delete") return eliminarRegistro(data.id, data.currentUser);

  return jsonResponse({ success: false, message: "Accion no valida" });
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SESSIONS_SHEET) {
      sheet.appendRow(["usuario", "nombre", "rol", "ultimo_heartbeat"]);
    }
  }
  return sheet;
}

function validarLogin(user, pass) {
  if (!user || !pass) return jsonResponse({ success: false, message: "Usuario y contrasena requeridos" });

  var sheet = getOrCreateSheet(USERS_SHEET);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === user.toLowerCase() && String(data[i][1]).trim() === pass) {
      var userRol = String(data[i][3]).trim() || "usuario";
      var nombre = data[i][2] || data[i][0];

      registrarSesion(user, nombre, userRol);

      return jsonResponse({
        success: true,
        message: "Login exitoso",
        user: data[i][0],
        nombre: nombre,
        rol: userRol
      });
    }
  }

  return jsonResponse({ success: false, message: "Usuario o contrasena incorrectos" });
}

function registrarSesion(user, nombre, rol) {
  var sheet = getOrCreateSheet(SESSIONS_SHEET);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === user.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(new Date());
      return;
    }
  }

  sheet.appendRow([user, nombre, rol, new Date()]);
}

function heartbeat(user) {
  if (!user) return jsonResponse({ success: false, message: "Usuario requerido" });

  var sheet = getOrCreateSheet(SESSIONS_SHEET);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === user.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(new Date());
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false });
}

function logout(user) {
  if (!user) return jsonResponse({ success: false, message: "Usuario requerido" });

  var sheet = getOrCreateSheet(SESSIONS_SHEET);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === user.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false });
}

function getOnlineUsers() {
  var sheet = getOrCreateSheet(SESSIONS_SHEET);
  var data = sheet.getDataRange().getValues();
  var online = [];
  var now = new Date();
  var timeout = 90 * 1000;

  for (var i = 1; i < data.length; i++) {
    var lastHeartbeat = data[i][3];
    if (lastHeartbeat instanceof Date) {
      var diff = now.getTime() - lastHeartbeat.getTime();
      if (diff < timeout) {
        online.push({
          user: data[i][0],
          nombre: data[i][1],
          rol: data[i][2]
        });
      } else {
        sheet.deleteRow(i + 1);
        i--;
      }
    }
  }

  return jsonResponse({ success: true, data: online });
}

function formatearFecha(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    var d = valor.getUTCDate();
    var m = valor.getUTCMonth() + 1;
    var y = valor.getUTCFullYear();
    return (d < 10 ? "0" + d : d) + "/" + (m < 10 ? "0" + m : m) + "/" + y;
  }
  var s = String(valor).split("T")[0];
  var parts = s.split("-");
  if (parts.length === 3) return parts[2] + "/" + parts[1] + "/" + parts[0];
  return valor;
}

function getAllRegistros(currentUser) {
  var sheet = getOrCreateSheet(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var registros = [];

  for (var i = 1; i < data.length; i++) {
    registros.push({
      nombre: data[i][0],
      territorio: data[i][1],
      fechaInicio: formatearFecha(data[i][2]),
      fechaFin: formatearFecha(data[i][3]),
      id: data[i][4],
      creado: formatearFecha(data[i][5]),
      creadoPor: data[i][6] || ""
    });
  }

  return jsonResponse({ success: true, data: registros });
}

function crearRegistro(data) {
  var sheet = getOrCreateSheet(SHEET_NAME);
  var id = generateId();
  var now = new Date().toISOString().split("T")[0];

  sheet.appendRow([data.nombre, data.territorio, data.fechaInicio, data.fechaFin || "", id, now, data.currentUser || ""]);

  return jsonResponse({ success: true, id: id, message: "Registro creado" });
}

function actualizarRegistro(data) {
  var sheet = getOrCreateSheet(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var userRol = getUserRol(data.currentUser);

  for (var i = 1; i < values.length; i++) {
    if (values[i][4] === data.id) {
      if (userRol !== "admin" && values[i][6] !== data.currentUser) {
        return jsonResponse({ success: false, message: "No tienes permiso para editar este registro" });
      }
      sheet.getRange(i + 1, 1).setValue(data.nombre);
      sheet.getRange(i + 1, 2).setValue(data.territorio);
      sheet.getRange(i + 1, 3).setValue(data.fechaInicio);
      sheet.getRange(i + 1, 4).setValue(data.fechaFin || "");
      return jsonResponse({ success: true, message: "Registro actualizado" });
    }
  }

  return jsonResponse({ success: false, message: "Registro no encontrado" });
}

function eliminarRegistro(id, currentUser) {
  var sheet = getOrCreateSheet(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var userRol = getUserRol(currentUser);

  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === id) {
      if (userRol !== "admin" && data[i][6] !== currentUser) {
        return jsonResponse({ success: false, message: "No tienes permiso para eliminar este registro" });
      }
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: "Registro eliminado" });
    }
  }

  return jsonResponse({ success: false, message: "Registro no encontrado" });
}

function getUserRol(user) {
  if (!user) return "usuario";
  var sheet = getOrCreateSheet(USERS_SHEET);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === user.toLowerCase()) {
      return String(data[i][3]).trim() || "usuario";
    }
  }
  return "usuario";
}

function generateId() {
  return Utilities.getUuid().split("-")[0] + Date.now().toString(36);
}
