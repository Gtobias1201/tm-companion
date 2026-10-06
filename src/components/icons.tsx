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
