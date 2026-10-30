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

## Nueva base de actualizaciones verificadas

El workflow ahora publica `sha256` junto al APK. Los APK construidos con esta revisión leen su versión real de `BuildConfig` y verifican HTTPS, SHA-256, paquete, firma y versionCode antes de abrir el instalador. Descargar nunca marca una versión como instalada. La instalación requiere la confirmación y los permisos de Android.

Los APK anteriores no tienen este puente; instalar la nueva base manualmente desde el release oficial. No inventar `sha256`: obtenerlo del APK final firmado (PowerShell: `Get-FileHash pingo.apk -Algorithm SHA256`).

Para iOS configurar `iosVersion` y `appStoreUrl` solo después de disponer del registro oficial. La app no intentará instalar APK en iOS. Ver `ios/README.md`.

La actualización del juego necesita también `supabase/migration_v2.sql`; consultar `docs/IMPLEMENTACION_V2.md` antes del despliegue.
