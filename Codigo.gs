var SHEET_NAME = "Hoja 1";
var USERS_SHEET = "Usuarios";

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e.parameter.action;

  if (action === "login") {
    return validarLogin(e.parameter.user, e.parameter.pass);
  } else if (action === "getAll") {
    return getAllRegistros(e.parameter.user);
  } else if (action === "getOne") {
    return getOneRegistro(e.parameter.id);
  }

  return jsonResponse({ success: false, message: "Accion no valida" });
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  if (data.action === "create") {
    return crearRegistro(data);
  } else if (data.action === "update") {
    return actualizarRegistro(data);
  } else if (data.action === "delete") {
    return eliminarRegistro(data.id, data.currentUser);
  }

  return jsonResponse({ success: false, message: "Accion no valida" });
}

function validarLogin(user, pass) {
  if (!user || !pass) {
    return jsonResponse({ success: false, message: "Usuario y contrasena requeridos" });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET);

  if (!sheet) {
    return jsonResponse({ success: false, message: "Hoja de Usuarios no encontrada" });
  }

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === user && String(data[i][1]).trim() === pass) {
      return jsonResponse({
        success: true,
        message: "Login exitoso",
        user: data[i][0],
        nombre: data[i][2] || data[i][0],
        rol: data[i][3] || "usuario"
      });
    }
  }

  return jsonResponse({ success: false, message: "Usuario o contrasena incorrectos" });
}

function getAllRegistros(currentUser) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var registros = [];

  for (var i = 1; i < data.length; i++) {
    registros.push({
      nombre: data[i][0],
      territorio: data[i][1],
      fechaInicio: data[i][2],
      fechaFin: data[i][3],
      id: data[i][4],
      creado: data[i][5],
      creadoPor: data[i][6] || ""
    });
  }

  return jsonResponse({ success: true, data: registros });
}

function getOneRegistro(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === id) {
      return jsonResponse({
        success: true,
        data: {
          nombre: data[i][0],
          territorio: data[i][1],
          fechaInicio: data[i][2],
          fechaFin: data[i][3],
          id: data[i][4],
          creado: data[i][5],
          creadoPor: data[i][6] || ""
        }
      });
    }
  }

  return jsonResponse({ success: false, message: "Registro no encontrado" });
}

function crearRegistro(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var id = generateId();
  var now = new Date().toISOString().split("T")[0];

  sheet.appendRow([
    data.nombre,
    data.territorio,
    data.fechaInicio,
    data.fechaFin || "",
    id,
    now,
    data.currentUser || ""
  ]);

  return jsonResponse({ success: true, id: id, message: "Registro creado" });
}

function actualizarRegistro(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET);
  if (!sheet) return "usuario";
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === user) {
      return String(data[i][3]).trim() || "usuario";
    }
  }
  return "usuario";
}

function generateId() {
  return Utilities.getUuid().split("-")[0] + Date.now().toString(36);
}
