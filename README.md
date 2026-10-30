# Pingo de Halloween

Bingo competitivo en tiempo real. **Spring Boot** sirve el frontend; **Supabase** sincroniza salas y el histórico.

## Deploy en Render (Blueprint)

1. Sube/commitea este repo a GitHub (`Pamtufla/PINGO`).
2. Entra a [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
3. **New Blueprint Instance** → elige el repo **PINGO**.
4. Render lee `render.yaml` y crea el Web Service `pingo-halloween`.
5. **Apply** → espera el build.
6. Abre la URL `https://pingo-halloween.onrender.com` (o la que te asigne).

No hace falta configurar Postgres en Render: el juego online usa Supabase desde el navegador (`src/main/resources/static/js/config.js`).

## Local

```bash
./mvnw spring-boot:run
```

→ http://localhost:8080/

## Estructura

```
render.yaml                          → Blueprint Render
system.properties                    → Java 17
src/main/resources/static/
  index.html
  css/
  js/config.js                       → URL + anon key Supabase
  js/multiplayer.js
  js/app.js
supabase/schema.sql                  → tablas (ya aplicadas en el proyecto)
```

## Supabase

Proyecto: `oyymnewahufepciblafy`  
Tablas: `rooms`, `players`, `match_results` (con RLS).

## Actualización integral v2 (trabajo local)

Ver [informe y despliegue](docs/IMPLEMENTACION_V2.md), [migración requerida](supabase/migration_v2.sql) y [preparación iOS](ios/README.md). No desplegar solo los archivos web sin aplicar la migración. Antes del cambio, terminar las salas antiguas: el nuevo protocolo de identidad y escritura no admite clientes anteriores.
