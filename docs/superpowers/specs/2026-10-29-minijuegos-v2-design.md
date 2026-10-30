# Minijuegos v2 — diseño

Fecha: 2026-10-29  
Estado: pendiente de revisión del usuario  
Alcance: sustituir quiz/odd por minijuegos interactivos; validación en cliente; dueño de casilla únicamente.

## Objetivos

- Minijuegos más divertidos e interactivos en móvil (dedo, micrófono, ritmo).
- No interrumpir a otros jugadores de la sala.
- Reintentos ilimitados hasta completar.
- Encajar con el bingo existente (casilla `mini`, panel `#miniPanel`, RPC `mini_start` / `mini_answer`).

## Decisiones acordadas

| Tema | Decisión |
|------|----------|
| Quién juega | Solo el dueño de la casilla |
| Fallo | Reintentos ilimitados |
| Minijuegos viejos | Eliminados (quiz / odd) |
| Dibujo | Plantilla/silueta a rellenar (~70% cobertura) |
| Arquitectura | Validación en cliente; servidor acepta `win` |
| Ocultar panel | Cancela el reto en servidor (`cancelled`) y libera la sala |
| Ritmo | Estilo Phigros simplificado (“Phi-mini”) |

## Pool de tipos (elección uniforme al azar)

1. `draw` — trazar/rellenar silueta  
2. `tongue` — trabalenguas por voz  
3. `dash` — habilidad física (taps / swipes)  
4. `rhythm` — Phi-mini  

## Flujo general

1. Jugador toca casilla `mini` propia sin marcar.
2. Cliente (o servidor en sala) crea un reto `live` con `kind` aleatorio y datos públicos del desafío.
3. Solo el dueño ve `#miniPanel` centrado sobre la cartilla. Otros clientes **ignoran** `room.game` si no están en `eligible`.
4. El dueño puede fallar y reintentar en local sin cerrar el reto.
5. Al cumplir la meta local, envía `mini_answer` con respuesta `win` → servidor marca la casilla del dueño y pone `status: won`.
6. **OCULTAR** → `mini_cancel` (o equivalente): `status: cancelled`, se borra/libera `rooms.game`, la casilla sigue sin marcar; al volver a tocarla se genera un reto nuevo (puede ser otro `kind`).

Modo solo (sin sala): todo en cliente; al ganar se llama al callback de marcar casilla existente.

## Multijugador (RPC)

### `mini_start`

- Solo dueño, partida `live`, casilla `mini` válida sin marcar.
- Rechazar si ya hay `game.status = live` (otro reto activo).
- `eligible`: array con **solo** el `client_id` del dueño.
- Payload público según `kind` (sin secretos útiles para trampas graves; fiesta OK).
- Secreto en `pingo_game_secrets.answer` = `'win'` (constante para tipos skill).

### `mini_answer`

- Solo si `eligible` contiene al cliente, `status = live`, id coincide.
- Respuesta debe ser `'win'`.
- Marca `card.marked[index] = true` del dueño, `status = won`, `mini_wins++` según reglas actuales de reward (mantener comportamiento de `reward` ya existente).

### `mini_cancel` (nuevo)

- Solo el dueño (`owner`) o el mismo eligible.
- Pone `game.status = cancelled` (o `game = null`).
- No marca casilla.

### Cliente `remote`

- Si `!eligible.includes(me)` → no renderizar panel (y no mostrar toast de minijuego ajeno).
- Si eligible y `live` → render del kind correspondiente.
- Si `won` / `cancelled` / `lost` → actualizar/cerrar UI local.

Un solo `game` por sala: cancelar al ocultar evita bloquear minijuegos de otros.

## Minijuego: draw

- Título: “Traza al personaje”.
- Lista de ~8–12 siluetas SVG simples (personajes reconocibles pop/videojuegos/cine; paths geometricos, no assets con copyright complejo).
- Canvas: silueta fantasma + capa de pintura táctil.
- Victoria: cobertura ≥ 70% de píxeles de la máscara de silueta.
- Controles: Limpiar; progreso visible; victoria automática al umbral.

## Minijuego: tongue

- Título: “Trabajenguas”.
- Pool de 8–10 frases cortas en español en pantalla.
- Botón HABLAR → `webkitSpeechRecognition` / `SpeechRecognition` con `lang = es-ES`.
- Victoria: ≥ 60% de tokens/palabras clave de la frase aparecen en el transcript normalizado.
- Fallback si no hay Speech API (p. ej. WebView limitado): grabación por nivel de audio + duración mínima (~frase length) + botón “Lo dije”; documentar que es más permisivo.
- Reutilizar permiso de micrófono ya pedido por chat cuando sea posible.

## Minijuego: dash

- Título: “Ráfaga”.
- Variante aleatoria:
  - `taps`: 25 toques en zona grande
  - `swipes`: 8 deslizamientos horizontales (distancia mínima)
  - `combo`: 15 taps + 3 swipes
- Barra de progreso; vibrate corto opcional (`navigator.vibrate`).
- Victoria al cumplir contadores.

## Minijuego: rhythm (Phi-mini)

Inspirado en Phigros, acotado a fiesta móvil ~12–15 s.

- Juicio: círculo o línea central.
- Notas se mueven desde bordes hacia el juicio.
- Gestos: tap (tap note); swipe direccional (pocas drag notes).
- Chart fija por seed del reto: 8–14 notas, BPM ~110–130.
- Audio: pulsación con `AudioContext` (sin canciones con copyright); feedback visual fuerte del beat.
- Juicios: Perfect / Good / Miss (márgenes holgados).
- Victoria: ≥ 70% de notas con al menos Good.
- Fallo de chart: reinicio local de la misma chart (mismo seed); no consume intento de servidor.

## UI / UX

- Panel sigue en `.grid-stage` (centro del bingo), no tapa el chat.
- Cada kind monta su UI dentro de `#miniPanel` (canvas / mic / zona dash / canvas ritmo).
- Textos claros de progreso y error; sin temporizador global de ronda.
- `prefers-reduced-motion`: ritmo sigue jugable con menos partículas; dash/draw sin animaciones decorativas.

## Fuera de alcance

- IA que evalúe dibujos
- Subida de audio/trazos al servidor
- Voto de la sala
- Charts Phigros reales / música licenciada
- Antitrampa fuerte
- Restaurar quiz/odd

## Archivos previstos

- `src/main/resources/static/js/minigames.js` — registro, render por kind, validadores
- Posible `minigames-assets.js` o SVG inline para siluetas
- `css/styles.css` — canvas, pads, notas de ritmo
- `supabase/migration_v4_minigames_v2.sql` — `mini_start` kinds nuevos + `mini_cancel`
- Ajustes menores en `app.js` si hace falta al tocar casilla / cancelar

## Criterios de aceptación

1. En sala, solo el dueño ve y juega el minijuego; el resto no ve el panel.
2. Los cuatro kinds pueden salir al azar; quiz/odd no aparecen.
3. Fallar y reintentar no marca la casilla ni cierra el reto hasta ganar o cancelar.
4. OCULTAR cancela en servidor y otro jugador puede iniciar su propio minijuego después.
5. Al ganar, la casilla queda marcada y sincronizada.
6. En iPhone/Android (Safari / WebView / Chrome) draw y dash funcionan; tongue usa Speech API o fallback; rhythm es jugable al tacto.
7. Modo solo marca la casilla al completar sin RPC.
