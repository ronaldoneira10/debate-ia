# Debate IA — backend REST (sin sockets)

Dos IAs (Gemini) debaten el tema **Inteligencia Artificial VS Trabajo Humano**.
Se puede abrir desde varias computadoras por `IP:puerto` y todas ven lo mismo.

## Estructura

```
debate-ia/
├── data/                 # debate.json (se crea solo; guarda el debate)
├── public/               # frontend
│   ├── app.js
│   ├── index.html
│   └── style.css
├── src/
│   ├── config/           # env.js (variables y keys) y gemini.js (un cliente por key)
│   ├── controllers/      # debate.controller.js (recibe la petición, responde)
│   ├── middlewares/      # logger, notFound, errorHandler
│   ├── routes/           # index.js y debate.routes.js
│   ├── services/         # debate (estado), gemini, prompts, storage
│   └── server.js
├── .env / .env.example
├── package.json
└── README.md
```

## Cómo se sincroniza sin sockets

El servidor guarda el estado del debate en memoria (y en `data/debate.json`).
Cada pantalla pregunta cada 1.5 segundos `GET /api/debate/estado?desde=N`
y el servidor responde solo con los mensajes que esa pantalla aún no tiene.
Es *polling*: HTTP normal, sin ninguna librería extra.

## Una pantalla = un lado

Cada computador elige su lado: abre `http://HOST:3000/?lado=izquierda`
en una y `http://HOST:3000/?lado=derecha` en la otra (o sin `?lado=` y
elige con los botones). El debate se puede iniciar cuando las dos
pantallas están conectadas. Una pantalla sigue "conectada" mientras
consulta el estado; si pasan 6 segundos sin consultar, su lado queda libre.

## Conectar las dos computadoras con el puerto de Visual Studio Code

1. En la computadora anfitriona: `npm run dev` (puerto 3000).
2. En VS Code abre la pestaña **Puertos** (panel inferior, junto a Terminal).
3. **Reenviar un puerto** (*Forward a Port*) → `3000`.
4. Clic derecho sobre el puerto → **Visibilidad del puerto → Público**.
5. Copia la **Dirección reenviada** (algo como `https://xxxx-3000.use.devtunnels.ms`).
6. Esa pantalla abre `<dirección>/?lado=izquierda`; la otra computadora abre `<dirección>/?lado=derecha`.

## Endpoints

| Método | Ruta                       | Qué hace                                             |
|--------|----------------------------|------------------------------------------------------|
| GET    | `/api`                     | Comprueba que la API funciona                        |
| GET    | `/api/debate/estado?desde=N&clienteId=X` | Estado, lados conectados y mensajes nuevos |
| POST   | `/api/debate/unirse`       | `{ lado, clienteId }` — esta pantalla toma un lado   |
| POST   | `/api/debate/iniciar`      | `{ clienteId }` — inicia (400 si falta un lado, 409 si ya corre) |

`estado` puede ser: `inactivo`, `en_curso`, `terminado`, `error`.

## Instalación

```bash
npm install
cp .env.example .env     # y pon las 2 API keys (una por lado)
npm run dev
```

## Una API key de Gemini por pantalla

Cada IA usa su propia key, así cada una tiene su propia cuota:

```env
GEMINI_API_KEY_IZQUIERDA=...   # IA izquierda (defiende el trabajo humano)
GEMINI_API_KEY_DERECHA=...     # IA derecha (defiende la IA)
GEMINI_API_KEY_JUEZ=...        # opcional: el jurado (si falta, usa la de la izquierda)
GEMINI_API_KEY=...             # opcional: respaldo para el lado que no tenga la suya
```

Las keys viven solo en el servidor (`.env`); el navegador nunca las ve.
Para que la cuota sea realmente independiente, crea cada key con una
**cuenta de Google / proyecto distinto** en https://aistudio.google.com/apikey
(dos keys del mismo proyecto comparten cuota).

En la otra computadora abre `http://IP_DEL_SERVIDOR:3000`
(el servidor escucha en `0.0.0.0`; si no conecta, revisa el firewall de Windows).

## Ajustes

- `NUM_RONDAS` (en `.env`): cuántas veces responde cada lado.
- `GEMINI_MODEL` (en `.env`): modelo de Gemini.
- Los prompts de cada IA están en `src/services/prompts.service.js`.
