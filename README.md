# TM Companion

App compañera para **Terraforming Mars**: crea partidas y lleva el control de recursos,
producción, TR y parámetros globales (temperatura, oxígeno, océanos y Venus).

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Para probarla en el celular, conectalo a la misma red Wi-Fi
y abre la dirección "Network" que muestra Vite (por ejemplo `http://192.168.0.10:5173`).

## Estructura

- `src/game/` — reglas del juego, sin React (tipos, constantes, lógica de acciones).
- `src/store.ts` — estado de la app, guardado en `localStorage` y deshacer.
- `src/components/` — pantallas y componentes de UI.

## Reglas implementadas

- TR inicial 20 (14 en solitario). Sin Era Corporativa: 1 de producción de cada recurso.
- Subir un parámetro da +1 TR al jugador activo, con los bonus del tablero:
  - Temperatura −24 °C y −20 °C: +1 producción de calor.
  - Temperatura 0 °C: océano extra (+1 TR).
  - Oxígeno 8 %: sube la temperatura (+1 TR).
  - Venus 8 %: robar 1 carta · Venus 16 %: +1 TR.
- Bosque (8 plantas, configurable por jugador) y 8 calor → temperatura.
- Fase de producción: energía → calor, M€ = TR + producción de M€, resto suma su producción,
  rota el jugador inicial.

## Hacia el móvil

Cuando la app esté lista, se empaqueta con [Capacitor](https://capacitorjs.com/):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "TM Companion" com.tmcompanion.app --web-dir dist
npm run build && npx cap add android && npx cap open android
```
