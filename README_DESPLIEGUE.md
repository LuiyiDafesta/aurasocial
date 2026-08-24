# Guía de Despliegue de Aura Social en Hosting Ferozo

Este documento detalla el procedimiento para compilar y desplegar la aplicación **Aura Social** en un servidor web Apache bajo hosting **Ferozo**.

---

## 1. Estructura del Repositorio para Producción

- **`index.html`**: Archivo de entrada de la aplicación SPA en la raíz del servidor web (`public_html/`).
- **`assets/`**: Chunks compilados de JavaScript y CSS optimizados para producción.
- **`api/index.php`**: Gateway PHP Server-to-Server para orquestación con **n8n** y endpoints de integración con **Socialit** (`/api/social/accounts/sync`, `/api/social/accounts/bind`, `/api/social/publish`, etc.).
- **`.htaccess`**: Archivo de configuración en la raíz que maneja el enrutamiento de la SPA y redirige peticiones `/api/...` y `/webhook/...` al Gateway PHP.
- **`_source/`**: Código fuente de desarrollo (React + TypeScript + Vite + Tailwind CSS).

---

## 2. Requisitos Previos

- **Node.js**: v18 o superior instalado en tu máquina local.
- **NPM**: v9 o superior.

---

## 3. Procedimiento de Compilación y Publicación

1. Abrí una terminal y dirígete a la carpeta `_source/`:
   ```bash
   cd _source
   ```

2. Instalá las dependencias (solo la primera vez o tras añadir paquetes):
   ```bash
   npm install
   ```

3. Ejecutá la compilación de producción:
   ```bash
   npm run build
   ```
   *Vite compilará automáticamente los assets y actualizará `index.html` y `assets/` directamente en la raíz del proyecto.*

4. Subí los cambios a GitHub para sincronizar con Ferozo:
   ```bash
   git add -A
   git commit -m "deploy: update production build and api gateway"
   git push origin main
   ```

---

## 4. Endpoints Disponibles en Ferozo

- `POST https://aurasocial.lsnethub.com/webhook/aurasocial/social/sync` (Webhook de sincronización)
- `POST https://aurasocial.lsnethub.com/api/social/accounts/sync` (Discovery de cuentas)
- `POST https://aurasocial.lsnethub.com/api/social/accounts/bind` (Binding idempotente de marca)
- `POST https://aurasocial.lsnethub.com/api/social/publish` (Publicación Dry Run)
- `GET  https://aurasocial.lsnethub.com/api/social/providers/health` (Estado de salud de proveedores)

---

## 5. Verificación en Producción

1. Ingresá a la URL de tu dominio: `https://aurasocial.lsnethub.com/`.
2. Presioná `Ctrl + F5` para invalidar la caché del navegador.
3. Navegá a **Canales y Redes** para gestionar las cuentas conectadas y disparar la sincronización con n8n.
