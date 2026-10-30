# Actualizaciones APK (sin Play Store)

## Automático (recomendado)

Cada **push a `main`** dispara `.github/workflows/release-apk.yml`:

1. Compila un APK Android (WebView → tu URL de Render).
2. Publica un **GitHub Release** `v1.2.<número>` con `pingo.apk`.
3. Actualiza `update.json` y las versiones en `changelog.js`.
4. Render vuelve a desplegar; la app detecta la nueva versión y ofrece descargar.

No hace falta WebIntoApp para releases nuevos.

### Primera instalación

1. Espera a que Actions termine (pestaña **Actions** del repo).
2. En **Releases**, descarga `pingo.apk`.
3. En el teléfono: permitir instalar apps desconocidas.
4. Si antes usabas un APK de WebIntoApp, **desinstálalo** primero (otra firma).

### URL del juego dentro del APK

Por defecto: `https://pingo-halloween.onrender.com`  
Cámbiala en `android/version.properties` (`PINGO_WEB_URL`) o con el secret/variable de entorno `PINGO_WEB_URL` en Actions.

### Evitar un release

Incluye `[skip apk]` en el mensaje del commit.

### Disparo manual

Actions → **Release APK** → **Run workflow**.

## Manual (legacy)

Si generas el APK a mano, edita `src/main/resources/static/update.json`:

```json
{
  "version": "1.3.0",
  "apkVersion": "1.3.0",
  "build": "abc1234",
  "force": false,
  "apkUrl": "https://github.com/Pamtufla/PINGO/releases/download/v1.3.0/pingo.apk",
  "notes": "Qué hay de nuevo…"
}
```

Si `force` es `true`, no se puede saltar la actualización.
