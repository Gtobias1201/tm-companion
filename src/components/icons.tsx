import {
  IconBolt,
  IconBuilding,
  IconDiamond,
  IconDroplet,
  IconFlame,
  IconFlask,
  IconHammer,
  IconLeaf,
  IconPlanet,
  IconRocket,
  IconTemperature,
  IconWind,
  IconWorld,
  type Icon,
} from '@tabler/icons-react';
import type { CardTag, GlobalKey, ResourceKey } from '../game/types';

const RESOURCE_ICONS: Record<ResourceKey, Icon | null> = {
  megacredits: null,
  steel: IconHammer,
  titanium: IconDiamond,
  plants: IconLeaf,
  energy: IconBolt,
  heat: IconFlame,
};

const GLOBAL_ICONS: Record<GlobalKey, Icon> = {
  temperature: IconTemperature,
  oxygen: IconWind,
  oceans: IconDroplet,
  venus: IconPlanet,
};

const TAG_ICONS: Record<CardTag, Icon> = {
  building: IconBuilding,
  space: IconRocket,
  earth: IconWorld,
  science: IconFlask,
  power: IconBolt,
  venus: IconPlanet,
};

interface IconProps {
  size?: number;
}

export function ResourceIcon({ resource, size = 16 }: IconProps & { resource: ResourceKey }) {
  const I = RESOURCE_ICONS[resource];
  if (!I) return <span className="mc-glyph" aria-hidden>M€</span>;
  return <I size={size} stroke={1.75} aria-hidden />;
}

export function GlobalIcon({ param, size = 16 }: IconProps & { param: GlobalKey }) {
  const I = GLOBAL_ICONS[param];
  return <I size={size} stroke={1.75} aria-hidden />;
}

export function TagIcon({ tag, size = 16 }: IconProps & { tag: CardTag }) {
  const I = TAG_ICONS[tag];
  return <I size={size} stroke={1.75} aria-hidden />;
}

// ---------- Losetas ----------

/** Colores de las losetas, iguales en ambos temas (como las fichas físicas). */
export const TILE_COLORS = { greenery: '#5fae3a', city: '#9ea3a8', ocean: '#3d8fd6' } as const;

const HEX_R = 6; // radio (centro a vértice) de cada loseta
const HEX_HALF_W = (Math.sqrt(3) / 2) * HEX_R;
const HEX_GAP = 1.6;

/** Puntos de un hexágono con punta arriba, como las losetas del tablero. */
function hexPoints(cx: number, cy: number, r = HEX_R) {
  const hw = (Math.sqrt(3) / 2) * r;
  return [
    [cx, cy - r],
    [cx + hw, cy - r / 2],
    [cx + hw, cy + r / 2],
    [cx, cy + r],
    [cx - hw, cy + r / 2],
    [cx - hw, cy - r / 2],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

// Panal: dos arriba y una abajo encajada entre ambas, con la misma separación entre las tres
const PAD = 0.8;
const TOP_LEFT = { x: PAD + HEX_HALF_W, y: PAD + HEX_R };
const TOP_RIGHT = { x: TOP_LEFT.x + 2 * HEX_HALF_W + HEX_GAP, y: TOP_LEFT.y };
const BOTTOM = {
  x: (TOP_LEFT.x + TOP_RIGHT.x) / 2,
  y: TOP_LEFT.y + 1.5 * HEX_R + HEX_GAP * (Math.sqrt(3) / 2),
};
const HONEYCOMB_W = TOP_RIGHT.x + HEX_HALF_W + PAD;
const HONEYCOMB_H = BOTTOM.y + HEX_R + PAD;

/** Ícono de "colocar loseta": bosque, océano y ciudad en un mini panal. */
export function TileIcon({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={(size * HONEYCOMB_H) / HONEYCOMB_W}
      viewBox={`0 0 ${HONEYCOMB_W.toFixed(2)} ${HONEYCOMB_H.toFixed(2)}`}
      aria-hidden
    >
      <polygon points={hexPoints(TOP_LEFT.x, TOP_LEFT.y)} fill={TILE_COLORS.greenery} stroke="#2b2b2b" strokeWidth={0.8} />
      <polygon points={hexPoints(TOP_RIGHT.x, TOP_RIGHT.y)} fill={TILE_COLORS.ocean} stroke="#2b2b2b" strokeWidth={0.8} />
      <polygon points={hexPoints(BOTTOM.x, BOTTOM.y)} fill={TILE_COLORS.city} stroke="#2b2b2b" strokeWidth={0.8} />
    </svg>
  );
}

/** Una sola loseta del color de su tipo, para la hoja de opciones. */
export function SingleTileIcon({ kind, size = 28 }: IconProps & { kind: keyof typeof TILE_COLORS }) {
  const w = 2 * HEX_HALF_W + 2 * PAD;
  const h = 2 * HEX_R + 2 * PAD;
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w.toFixed(2)} ${h.toFixed(2)}`} aria-hidden>
      <polygon points={hexPoints(w / 2, h / 2)} fill={TILE_COLORS[kind]} stroke="#2b2b2b" strokeWidth={0.8} />
    </svg>
  );
}
