# iOS: preparación y validación pendiente

Este contenedor SwiftUI/WKWebView reutiliza el mismo juego HTTPS y Supabase, como Android. Requiere conexión al abrirlo. No se ha compilado en Windows: no hay macOS/Xcode ni certificados de Apple en este entorno.

En un Mac con Xcode y herramientas de línea de comandos seleccionadas:

1. Instala XcodeGen (`brew install xcodegen`).
2. Desde `ios`, ejecuta `xcodegen generate`.
3. Compila para simulador:
   `xcodebuild -project Pingo.xcodeproj -scheme Pingo -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
4. Abre `Pingo.xcodeproj`. En Signing & Capabilities selecciona tu equipo y un identificador de aplicación disponible.
5. Selecciona un iPhone/iPad conectado o simulador y ejecuta Product > Run. Para distribuir: Product > Archive, Validate App y Distribute App.
6. Configura `PingoWebURL` en `project.yml` con tu despliegue HTTPS y vuelve a generar. Aplica primero la migración SQL y despliega los recursos web de esta revisión.
7. Antes de subir una versión, actualiza MARKETING_VERSION/CURRENT_PROJECT_VERSION y publica `iosVersion` y el enlace real `appStoreUrl` en update.json. No existe aún un registro de App Store confirmado; no se inventó una URL.

Comprobar en dispositivo: dos jugadores, cierre/reapertura, micrófono con permiso denegado y concedido, interrupción/reconexión de red, auriculares, teclado, orientación, áreas seguras y tamaños de texto. WebRTC conserva el servicio STUN existente; redes con NAT restrictivo pueden necesitar TURN, que no está configurado en el proyecto.

La persistencia usa el almacén WKWebView predeterminado por instalación y origen. Borrar la app o cambiar el dominio puede perder los datos locales; exporta una copia antes. No se utilizan identificadores de hardware. El contenedor no instala APK ni código nativo descargado: dirige las actualizaciones de iOS a App Store. El sitio incluye juegos HTML5 remotos; la admisión en App Store, contenido y requisitos de las secciones 4.2/4.7 deben validarse durante la revisión de Apple. Un contenedor compilable no equivale a aprobación de tienda.

Referencias oficiales:
- https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- https://developer.apple.com/app-store/review/guidelines/
