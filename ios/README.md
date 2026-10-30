# iOS — compilar e instalar

El contenedor SwiftUI/WKWebView carga `https://pingo-halloween.onrender.com` (configurable con `PingoWebURL`).

## Cómo jugar ya (sin cuenta Apple)

1. En el iPhone abre el juego en **Safari**.
2. Compartir → **Añadir a pantalla de inicio**.
3. O toca **INSTALAR EN IPHONE** en la home de Pingo.

Eso funciona hoy. No es un IPA nativo, pero abre a pantalla completa y guarda datos locales del WebView/Safari.

## Release automático (GitHub Actions)

En cada push a `main`, el job **ios** (macOS):

1. Genera el proyecto con XcodeGen.
2. Compila **simulador** → `pingo-ios-simulator-<ver>.zip` en el Release.
3. Si hay secretos de firma Apple → exporta **`pingo.ipa`** al mismo Release.

### Secretos del repo (Settings → Secrets)

| Secret | Uso |
|--------|-----|
| `APPLE_TEAM_ID` | Team ID de developer.apple.com |
| `APPLE_CERTIFICATE_BASE64` | Certificado distribución `.p12` en base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Clave del `.p12` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Perfil **Ad Hoc** (o App Store) en base64 |
| `IOS_TESTFLIGHT_URL` | (opcional) enlace TestFlight público |
| `IOS_APP_STORE_URL` | (opcional) `https://apps.apple.com/...` |

Sin esos secretos el Release sigue saliendo (APK + zip simulador). El IPA firmado aparece cuando configures la firma.

### Instalar el IPA del Release

- **AltStore** / **Sideloadly** / Apple Configurator con tu Apple ID, o
- Sube el IPA a **TestFlight** (cuenta Developer de pago) y pon el enlace en `IOS_TESTFLIGHT_URL`.

iOS **no** permite instalar un IPA “a lo Android” solo tocando el enlace, salvo que esté firmado y el dispositivo autorizado.

## Compilar en un Mac

```bash
brew install xcodegen
cd ios
python3 scripts/gen_icon.py
xcodegen generate
open Pingo.xcodeproj
```

Simulador:

```bash
xcodebuild -project Pingo.xcodeproj -scheme Pingo -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Dispositivo: en Xcode elige tu Team, conecta el iPhone y Run / Archive.

## Actualizaciones

`update.json` lleva `iosVersion`, y opcionalmente `iosIpaUrl`, `testFlightUrl`, `appStoreUrl`. La app nativa (`PingoIOS/x.y.z` en el User-Agent) ofrece actualizar por esos enlaces.
