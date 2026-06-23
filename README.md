# RTerritorio - App de Registro de Territorios

Aplicación web para registrar nombre, territorio, fecha de inicio y fecha de finalización. Los registros se almacenan en Google Sheets y se sincronizan en tiempo real entre múltiples dispositivos. Incluye sistema de login con usuario y contraseña.

## Configuración (10 minutos)

### Paso 1: Crear Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com) y crea una hoja nueva
2. Nombra la hoja "RTerritorio"
3. Crea **dos hojas** (pestañas):

**Hoja 1 (datos):** Encabezados en fila 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| **Nombre** | **Territorio** | **Fecha Inicio** | **Fecha Fin** | **ID** | **Creado** |

**Hoja 2 (Usuarios):** Nombre de la hoja: `Usuarios`. Encabezados en fila 1:

| A | B | C |
|---|---|---|
| **usuario** | **contraseña** | **nombre completo** |

Ejemplo de usuarios:

| usuario | contraseña | nombre completo |
|---------|-----------|-----------------|
| admin | 1234 | Administrador |
| juan | abc | Juan Pérez |

### Paso 2: Abrir Apps Script

1. En tu Google Sheet, ve a **Extensiones → Apps Script**
2. Borra todo el código por defecto
3. Copia y pega el contenido del archivo `Codigo.gs`
4. Haz clic en **Guardar**

### Paso 3: Desplegar como Web App

1. Haz clic en **Implementar → Implementar nueva implementación**
2. Selecciona **App web**
3. Configura:
   - **Descripción**: "RTerritorio API"
   - **Ejecutar como**: **Yo**
   - **Quién tiene acceso**: **Cualquier persona**
4. Haz clic en **Implementar**
5. **Copia la URL** (empieza con `https://script.google.com/macros/s/.../exec`)

### Paso 4: Configurar la app

1. Abre `js/app.js`
2. Reemplaza la URL en la línea 6
3. Guarda

### Paso 5: Publicar la app (acceso desde cualquier red)

Para que la app sea accesible desde cualquier dispositivo y red, necesitas publicarla en un hosting gratuito:

**Opción A - GitHub Pages (Recomendado):**
1. Crea una cuenta en [GitHub](https://github.com)
2. Crea un repositorio llamado `RTerritorio`
3. Sube todos los archivos de esta carpeta
4. Ve a **Settings → Pages → Source: main branch**
5. Tu app estará en `https://TU_USUARIO.github.io/RTerritorio/`

**Opción B - Netlify:**
1. Ve a [Netlify](https://netlify.com)
2. Arrastra la carpeta `RTerritorio` al área de deploy
3. Obtienes una URL pública como `https://tu-app.netlify.app`

**Opción C - Vercel:**
1. Ve a [Vercel](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Se despliega automáticamente

### Paso 6: Acceder desde múltiples dispositivos

Una vez publicada, cualquier persona con la URL y las credenciales puede acceder desde cualquier dispositivo y red.

## Uso

1. **Login**: Ingresa con el usuario y contraseña que creaste en la hoja "Usuarios"
2. **Registrar**: Llena el formulario y haz clic en "Registrar"
3. **Editar**: Haz clic en ✏️ en la tabla
4. **Eliminar**: Haz clic en 🗑️ y confirma
5. **Buscar**: Escribe en el campo de búsqueda
6. **Exportar**: Haz clic en "Exportar Excel"
7. **Salir**: Haz clic en "Salir" para cerrar sesión

## Estructura de Archivos

```
RTerritorio/
├── index.html          # Página principal con login
├── Codigo.gs           # Código para Google Apps Script
├── iniciar.bat         # Iniciar servidor local (Windows)
├── css/
│   └── styles.css      # Estilos responsive
├── js/
│   ├── app.js          # Lógica CRUD + autenticación
│   └── export.js       # Exportación a Excel
└── README.md           # Este archivo
```

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| "Error de conexión" | Asegúrate de estar en `http://localhost:8000` o en la URL publicada |
| "Usuario o contraseña incorrectos" | Verifica que la hoja "Usuarios" tenga los datos correctos |
| URL incorrecta | Debe empezar con `https://script.google.com/macros/s/.../exec` |
| No carga en otro dispositivo | Si es local, verifica que estén en la misma red y usa la IP |
| "Hoja de Usuarios no encontrada" | Crea la hoja llamada exactamente "Usuarios" en el Sheet |
