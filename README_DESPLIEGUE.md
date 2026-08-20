# Guía de Despliegue de Aura Social en Hosting Ferozo

Este documento detalla el procedimiento para compilar y desplegar la aplicación **Aura Social** en un servidor web Apache bajo hosting **Ferozo**.

---

## 1. Estructura del Repositorio

- **`_source/`**: Contiene el código fuente completo del frontend (React + TypeScript + Vite + Tailwind CSS).
- **`.htaccess`**: Archivo de configuración en la raíz que maneja el enrutamiento de la SPA (redirección a `index.html` para que no existan errores 404 al recargar rutas).

---

## 2. Requisitos Previos

- **Node.js**: v18 o superior instalado en tu máquina local.
- **NPM**: v9 o superior.

---

## 3. Procedimiento de Compilación

1. Abre una terminal y dirígete a la carpeta `_source/`:
   ```bash
   cd _source
   ```

2. Instala las dependencias (solo la primera vez o tras añadir nuevos paquetes):
   ```bash
   npm install
   ```

3. Configura tus variables de entorno en `_source/.env`:
   ```env
   VITE_SUPABASE_URL=https://eeykrgnwfarrljkotvmw.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   VITE_APP_TIMEZONE=America/Argentina/Buenos_Aires
   ```

4. Ejecuta la compilación de producción:
   ```bash
   npm run build
   ```

   Este comando generará la carpeta compilada `_source/dist/` con todos los archivos HTML, CSS, JavaScript y assets listos para producción.

---

## 4. Procedimiento de Subida a Ferozo

1. Conéctate a tu hosting Ferozo vía FTP (o mediante el Administrador de Archivos del panel cPanel/Ferozo).
2. Ubícate en la raíz pública del dominio (usualmente `public_html/` o `httpdocs/`).
3. Sube:
   - Todo el **contenido** generado dentro de `_source/dist/` (`index.html`, `assets/`, `favicon.ico`, etc.).
   - El archivo **`.htaccess`** que se encuentra en la raíz del repositorio.

---

## 5. Verificación en Producción

1. Ingresa a la URL de tu dominio (ej. `https://tu-dominio.com/`).
2. Navega a una subruta (ej. `https://tu-dominio.com/contenidos`).
3. Recarga la página con `Ctrl + F5`: gracias a la regla de `.htaccess`, la página debe cargar limpiamente sin mostrar error 404 de Apache ni pantalla en blanco.
