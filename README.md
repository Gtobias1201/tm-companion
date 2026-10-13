# TM Companion

App compañera para **Terraforming Mars**. Reemplaza los cubitos del tablero de jugador: lleva recursos,
producción, TR, parámetros globales, turnos, hitos, premios y la puntuación final, en un celular o en
varios a la vez.

Publicada en GitHub Pages: cada merge a `main` se despliega solo.

## Qué hace

- **Partida solitaria**: en un solo celular, con el límite de generaciones del modo solitario.
- **Partida online**: cada jugador en su celular. El anfitrión comparte un código o QR y los demás se
  unen; las conexiones son directas entre celulares (WebRTC con PeerJS).
- **Armado de la partida**: corporaciones del catálogo con sus M€, producción y efectos;
  cartas iniciales; preludios; tableros Tharsis, Hellas y Elysium; Era Corporativa y Venus Next.
- **Reglas que la app aplica sola**: bonus de los parámetros globales, bosques, calor a temperatura,
  fase de producción e investigación, 2 acciones por turno, pasar, hitos y premios, bosques finales y
  ranking con desempate.
- **Pagos**: calcula el pago más eficiente con acero y titanio y aplica descuentos (Thorgate, Earth
  Office, etc.).
- **Deshacer** e historial de la partida. Las partidas se guardan en el celular.
- **Guía de uso** dentro de la app y modo día/noche.

## Desarrollo

Requiere Node 22.

```bash
npm install
npm run dev
```

Abrí http://localhost:5173. Para probar en el celular, conectalo a la misma red Wi-Fi y abrí la
dirección "Network" que muestra Vite (por ejemplo `http://192.168.0.10:5173`).

| Comando              | Qué hace                                               |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Servidor de desarrollo                                 |
| `npm test`           | Tests de las reglas del juego (Vitest)                 |
| `npm run test:watch` | Tests en modo observación                              |
| `npm run typecheck`  | Chequeo de tipos de TypeScript                         |
| `npm run format`     | Formatea el código con Prettier                        |
| `npm run check`      | Tipos + formato + tests: lo mismo que corre en cada PR |
| `npm run build`      | Versión de producción en `dist/`                       |
| `npm run preview`    | Sirve `dist/` para probar la versión de producción     |

### Probar el modo online sin internet

```bash
npx peerjs --port 9000                       # servidor PeerJS local
VITE_PEER_SERVER=localhost:9000 npm run dev
```

Sin `VITE_PEER_SERVER` la app usa el servidor público de PeerJS.

## Estructura

```
src/
├── game/            Reglas del juego, sin React. Se importan siempre desde 'src/game' (index.ts)
│   ├── types.ts         Tipos de la partida guardada (Game, Player…)
│   ├── constants.ts     Límites de los parámetros, recursos, proyectos estándar, descuentos
│   ├── boards.ts        Tableros con sus hitos y premios
│   ├── catalog.ts       Corporaciones y preludios
│   ├── actions.ts       Todas las acciones posibles (Action)
│   ├── reducer.ts       applyAction: aplica una acción y devuelve la partida nueva
│   ├── setup.ts         Armado de la partida (corporación → cartas → preludios)
│   ├── globals.ts       Parámetros globales y sus bonus del tablero
│   ├── turns.ts         Acciones por turno y paso de turno
│   ├── phases.ts        Producción, investigación y final de la partida
│   ├── payment.ts       Pagos con acero/titanio y descuentos
│   ├── scoring.ts       Puntos de victoria, premios y ranking
│   ├── state.ts         Consultas sobre la partida (de quién es el turno, si terminó…)
│   ├── normalize.ts     Completa partidas guardadas con versiones viejas de la app
│   └── rules.test.ts    Tests de las reglas
├── store.ts         Estado de la app: partidas guardadas en localStorage y deshacer
├── components/
│   ├── Home.tsx         Pantalla de inicio
│   ├── setup/           Crear partida
│   ├── game/            Pantalla de la partida y sus paneles y diálogos
│   ├── guide/           Guía de uso (topics.tsx tiene el contenido)
│   └── ui/              Piezas genéricas: modal, íconos, selector de color, gestos
├── net/             Mensajes y conexiones PeerJS (protocolo, latido, reconexión)
├── online/          Modo online: sala, anfitrión, invitado y su UI
└── styles/          CSS por sección; index.css los importa en orden
```

### Cómo fluye un cambio

Toda modificación de la partida es una `Action` que pasa por `applyAction(game, action)`. La función
no modifica la partida recibida: devuelve una copia nueva, o la misma si la acción no cambió nada (por
ejemplo, subir un parámetro que ya está al máximo). Así funcionan el deshacer, el guardado y el modo
online sin código especial.

Para agregar una regla nueva:

1. Si hace falta, agregá la acción a `Action` en `game/actions.ts`.
2. Implementala en `game/reducer.ts` (o en el módulo de su tema) y escribí el registro con `log`.
3. Agregá un test en `game/rules.test.ts`.
4. Si la partida guardada tiene un campo nuevo, completalo en `game/normalize.ts` para que las
   partidas viejas sigan abriendo.

## Modo online

- El **anfitrión** tiene la partida de verdad: recibe las acciones de los invitados, las valida
  (cada uno solo puede mover su jugador), las aplica y le manda el estado a todos.
- Los **invitados** muestran el estado que llega y mandan acciones. Si se corta la conexión, las
  acciones quedan en cola con un número de secuencia; al reconectar se reenvían y el anfitrión aplica
  cada una una sola vez.
- Un **latido** cada 2 s en ambos sentidos detecta conexiones muertas (pantalla bloqueada, cambio de
  Wi-Fi a datos). A los ~9 s sin respuesta aparece el aviso y se reintenta con espera creciente
  (1 a 8 s), y al volver a la app o recuperar la red se reintenta en el momento.
- El código online se carga solo cuando se usa, para que la app abra más rápido.

## Calidad

En cada pull request corren tipos, formato, tests y build (`.github/workflows/ci.yml`). El despliegue
a GitHub Pages también corre los tests antes de publicar.

## Hacia el móvil

Cuando la app esté lista, se empaqueta con [Capacitor](https://capacitorjs.com/):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "TM Companion" com.tmcompanion.app --web-dir dist
npm run build && npx cap add android && npx cap open android
```
