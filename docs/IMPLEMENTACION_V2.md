# Actualización integral de Pingo — informe de implementación

Trabajo local, sin commit, push ni cambios en Supabase de producción.

## Implementado

- Historial completo: `players` conserva participantes aunque salgan. `participated` distingue quienes jugaron de quienes solo estuvieron en lobby; `connected` y `last_seen` describen conexión, no pertenencia al historial. Una identidad por instalación y la unicidad `(room_id, client_id)` evitan duplicados. Reconectar recupera la cartilla, sustituciones, marcas, puesto y estadísticas del servidor.
- Modo clásico y podio configurable. Clásico termina al completar la primera cartilla; podio termina en tres finalistas, o en el total inicial si hay menos de tres. Si ya existe un finalista y no quedan competidores activos, termina con los puestos alcanzados. Desconexión involuntaria: 90 segundos de margen; salida explícita: inmediata. Un finalista no cambia su cartilla ni participa en minijuegos nuevos. Llegadas simultáneas se ordenan por el bloqueo transaccional de la sala, sin posiciones duplicadas. Finalizar manualmente una partida aún activa cuenta como cancelación y no concede coronas.
- Sustituciones: 0–3 por jugador, configurables. Una observación imposible cambia por un reto difícil; la inversa requiere habilitación. No se sustituyen casillas marcadas, libres o verdes. El servidor conserva el resultado y el contador. El catálogo incluye categoría/dificultad; los retos nuevos evitan actividades físicas arriesgadas y solicitan consentimiento para fotos. Las cartillas ya guardadas no se regeneran.
- Coronas: una para el primer puesto de una partida válida; ninguna para segundo/tercero ni cancelaciones. En sala, `pingo_crowns` tiene una clave única por partida y solo escribe el servidor. Se conceden al terminar, independientemente de que el anfitrión archive el historial. En solo, un registro local por matchId impide duplicación. Se muestran separadas las coronas de práctica y online para no presentar el contador local editable como un resultado competitivo verificado.
- Identidad aleatoria de instalación con credencial privada; no usa nombre ni hardware. La base guarda solo su hash. El almacenamiento web de cada origen mantiene la identidad al reabrir. Copia privada JSON exportable/restaurable para reinstalaciones o cambio de equipo; sin esa copia o conservación del almacén no se promete recuperación automática. No hay cuentas ni sincronización automática entre dispositivos.
- Casillas verdes: 0–3, sin reemplazar el centro libre ni los retos. Dos minijuegos jugables: **Preguntas relámpago** (aritmética) y **Encuentra el diferente**. Rondas de 20 segundos, una respuesta por participante, gana la primera correcta validada por el servidor. Los participantes elegibles se fijan al abrir la ronda; los desconectados no bloquean el vencimiento. La casilla del iniciador se marca si gana; opcionalmente se marca por participar al resolverse o vencer. Los rivales ganadores acumulan victorias de minijuego, sin alterar otra casilla. No hay penalización monetaria ni física por fallar. Solo incluye práctica de ambos juegos.
- Actualizaciones: SemVer con prereleases/build metadata; distingue error, versión vigente, actualización y aviso pospuesto. La revisión manual ignora el aplazamiento. La versión Android procede del binario mediante User-Agent; descargar no cambia la versión instalada. Las respuestas inválidas, falta de Internet o comprobaciones desactivadas no se presentan como “actualizado”. Descarga única desde el repositorio oficial, con SHA-256 publicado por CI. Android verifica además paquete, firma y versionCode antes de abrir el instalador del sistema. Una app Android antigua que no comunica su versión requiere instalación manual de la nueva base. iOS solo ofrece App Store cuando existe un enlace oficial configurado.
- Preparación iOS: contenedor SwiftUI/WKWebView, permiso de micrófono, almacenamiento persistente, navegación restringida al origen y proyecto reproducible con XcodeGen. Se mantienen áreas seguras y se permite zoom en la web. Instrucciones en `ios/README.md`.

## Causas corregidas

1. `leave()` borraba el registro del jugador. El historial tomaba una lista de jugadores todavía conectados. Ahora el registro dura toda la partida y el archivo toma exclusivamente participantes persistidos.
2. `upsertPlayer()` ponía a cero los contadores al volver. Ahora reconectar no sobrescribe el estado previo.
3. El candado del archivo se insertaba antes de los resultados en otra petición. Un fallo dejaba el historial incompleto e irreintentable. Ahora ambos se guardan en una transacción; se verificó un fallo inyectado a mitad de la inserción y su posterior reintento.
4. Actualizar y guardar estaban permitidos por políticas abiertas y el cliente elegía posiciones. Las nuevas RPC verifican la credencial y autoridad, bloquean la sala, derivan estadísticas de las marcas, asignan puestos y conceden coronas. Las escrituras directas quedan deshabilitadas.
5. El actualizador usaba un dato local escrito al descargar como si probara una instalación, ocultaba algunas actualizaciones y podía lanzar dos descargas. Se eliminó esa lógica.

## Archivos principales

- `supabase/migration_v2.sql`: migración aditiva, autoridad de juego, archivo atómico, coronas y permisos.
- `src/main/resources/static/js/multiplayer.js`: llamadas serializadas a las RPC, reconexión y snapshots con revisión. El estado del juego se consulta cada 4 segundos; el chat y voz conservan Supabase Realtime/WebRTC.
- `app.js`, `rules.js`, `minigames.js`, `backup.js`, `updater.js`: interacción, reglas, minijuegos, persistencia y actualizador.
- `index.html`, `css/styles.css`: opciones, panel de juego, coronas y casillas verdes.
- `android/.../MainActivity.java`, `VerifiedUpdater.java`, `res/xml/file_paths.xml`: versión nativa y descarga verificada, con canal web limitado al origen principal.
- `.github/workflows/release-apk.yml`: SHA-256 del APK publicado en el manifiesto.
- `ios/project.yml`, `ios/Pingo/PingoApp.swift`, `ios/README.md`: preparación iOS.

## Pruebas ejecutadas y resultados

- `node --test tests/rules.test.cjs`: **7 pruebas aprobadas**: SemVer, manifiestos actuales/nuevos/inválidos, sin conexión, versión nativa, aplazamiento manual, separación iOS/APK, procedencia/hash/descarga única, coronas tras recarga, deduplicación y revisiones fuera de orden.
- `psql ... -v ON_ERROR_STOP=1 -f supabase/schema.sql -f supabase/migration_v2.sql`: migración ejecutada en **PostgreSQL 18 temporal local**, y vuelta a ejecutar para comprobar idempotencia. Se incluyó `extensions` en search_path para la ubicación de pgcrypto en Supabase.
- `psql ... -v ON_ERROR_STOP=1 -f tests/integration.sql`: **todos los bloques aprobados**, con rollback. Seis participantes y cinco salidas; reconexión; guardado tras desconexiones; fallo parcial de archivo y reintento; podio de dos; segundo puesto; repetición de finalización y corona única; credencial falsa y anfitrión; límite de sustitución; casilla verde/respuesta validada; respuesta repetida o tardía; desconexión y vencimiento de minijuego; modo participación; revisión obsoleta; clásico; exclusión de jugadores que solo estuvieron en lobby.
- `psql ... -v ON_ERROR_STOP=1 -f tests/security.sql`: **aprobado** con el rol `anon`: escrituras directas y acceso a credenciales/contraseñas bloqueados; archivo solo idempotente y sin coronas competitivas. Cambios del test revertidos con rollback.
- `node tests/concurrency.cjs`: **aprobado** con dos conexiones SQL concurrentes: puestos únicos 1/2 y una corona.
- `node tests/browser.cjs`: **aprobado** en Edge headless, tamaño móvil 390×844, dos contextos independientes y RPC contra PostgreSQL local. Crear/unirse/iniciar, podio de dos, resultados sincronizados y archivo; juego verde en solo, solución, recarga y corona; carga de una cartilla en formato v1 sin regenerarla. Captura local en `target/results-mobile.png`. Las fuentes externas se bloquearon deliberadamente; no se accedió al Supabase real. El adaptador de pruebas no sustituye una prueba de PostgREST y Realtime en producción.
- `node --check` sobre los JavaScript: sin errores de sintaxis.
- `.\mvnw.cmd test`: **BUILD SUCCESS**, una prueba Spring Boot aprobada.

Para repetir navegador se necesita Playwright y Edge instalados, y `PINGO_TEST_DATABASE` apuntando exclusivamente a una base desechable con el esquema y la migración aplicados. Si Playwright está fuera del proyecto, usar `NODE_PATH` a sus módulos. Los tests de navegador crean datos sintéticos en esa base; nunca utilizar la URL de producción. La prueba SQL revierte sus datos y la de concurrencia elimina sus propias filas.

## Despliegue y compatibilidad

1. Terminar y archivar las salas de la versión anterior antes del cambio. Copiar la base y exportar progreso local.
2. En una instalación nueva, aplicar primero `schema.sql`; en una existente, **no volver a ejecutar el esquema abierto anterior**. Aplicar `migration_v2.sql` desde SQL Editor de Supabase.
3. Desplegar los archivos web de esta revisión junto con la migración. Los clientes anteriores con escritura directa dejan de poder escribir: deben recargar. Esto es necesario para que no eludan las nuevas reglas. Una sala antigua no tenía credenciales que permitieran demostrar la propiedad de sus jugadores; no se ofrece una adopción insegura de esos identificadores.
4. El histórico antiguo permanece en sus tablas y claves locales. Cartillas solo v1 comprobadas. No se prometen recuperar participantes que la versión vieja ya borró ni reanudar salas antiguas con el nuevo protocolo.
5. Compilar y publicar un APK nuevo con el workflow para incluir el puente verificado y el SHA-256. No se publicó un APK ni se modificó el manifiesto para anunciar una versión inexistente.
6. Para iOS seguir `ios/README.md`. Apple requiere validar compilación, firma y distribución en su entorno; la revisión de tienda es independiente de que compile.

## Pendientes reales y límites

- Aplicar la migración en Supabase producción: **hecho** (`pingo_v2_rpc_authority_history_crowns` vía MCP, 2026-10-30). Falta desplegar el frontend v2 a Render (push a `main`).
- Android: código preparado; **no se compiló ni se probó el instalador en dispositivo**, no se encontró Android SDK disponible en este entorno. Confirmar permisos de instalación, firma existente y actualización real en teléfono.
- iOS: **no compilado** por ausencia de macOS/Xcode/certificados. Falta registro/enlace App Store real, firma, pruebas en iPhone/iPad y evaluación de tienda. El contenedor carga el juego web remoto; no se garantiza aprobación de Apple.
- Ocho minijuegos no implementados: dibujo, memoria, reflejos, palabra, secuencia, precisión, código secreto y duelo. El registro modular deja explícitos solo los dos disponibles; añadir una competición requiere interfaz y validación de servidor, no solo registrar un nombre.
- Las observaciones y retos físicos siguen siendo autodeclarados, como en el juego original; la base valida estructura y resultados, no puede demostrar que alguien vio un disfraz o realizó un reto. Las coronas solo locales no son resistentes a edición manual del almacenamiento.
- El chat/voz conserva su implementación previa y no se probó en teléfonos ni redes distintas. Solo hay STUN: algunas redes requieren un TURN externo.
- Sin cuenta, copia o respaldo conservado, reinstalar/borrar datos puede perder identidad y progreso. Las coronas online sobreviven en servidor, pero requieren recuperar la misma credencial. No hay recuperación por nombre ni hardware.
