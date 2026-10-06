import type { DiscountScope, ResourceKey } from './types';

/**
 * Corporaciones y preludios con sus efectos de inicio. Datos verificados contra el
 * código de la versión digital (github.com/terraforming-mars/terraforming-mars).
 */

type Amounts = Partial<Record<ResourceKey, number>>;

export interface CorporationDef {
  id: string;
  name: string;
  expansion: string;
  startingMC: number;
  production?: Amounts;
  stock?: Amounts;
  greeneryCost?: number;
  titaniumValue?: number;
  cardCost?: number;
  /** Beginner Corporation: las cartas iniciales no se pagan. */
  freeInitialCards?: boolean;
  /** Id en DISCOUNT_CARDS: el descuento se carga solo al jugador. */
  discountId?: string;
  /** Efecto que la app no aplica sola, como recordatorio. */
  note?: string;
}

export interface PreludeDef {
  id: string;
  name: string;
  expansion: string;
  production?: Amounts;
  /** Recursos que da (o cuesta, si es negativo) al jugarlo. */
  stock?: Amounts;
  tr?: number;
  temperature?: number;
  oxygen?: number;
  oceans?: number;
  note?: string;
}

export const CREDICOR_REBATE = { minCost: 20, amount: 4 };

export const CORPORATIONS: CorporationDef[] = [
  { id: 'beginner', name: 'Beginner Corporation', expansion: 'Base', startingMC: 42, freeInitialCards: true },
  { id: 'credicor', name: 'CrediCor', expansion: 'Base', startingMC: 57, note: 'Recibe 4 M€ al pagar algo de costo 20 o más (automático)' },
  { id: 'ecoline', name: 'EcoLine', expansion: 'Base', startingMC: 36, production: { plants: 2 }, stock: { plants: 3 }, greeneryCost: 7 },
  { id: 'helion', name: 'Helion', expansion: 'Base', startingMC: 42, production: { heat: 3 }, note: 'Puede usar calor como M€' },
  { id: 'interplanetary-cinematics', name: 'Interplanetary Cinematics', expansion: 'Base', startingMC: 30, stock: { steel: 20 }, note: 'Recibe 2 M€ al jugar un evento' },
  { id: 'inventrix', name: 'Inventrix', expansion: 'Base', startingMC: 45, note: 'Primera acción: robar 3 cartas · requisitos ±2' },
  { id: 'mining-guild', name: 'Mining Guild', expansion: 'Base', startingMC: 30, production: { steel: 1 }, stock: { steel: 5 }, note: '+1 producción de acero al recibir acero/titanio por colocar losetas' },
  { id: 'phobolog', name: 'PhoboLog', expansion: 'Base', startingMC: 23, stock: { titanium: 10 }, titaniumValue: 4 },
  { id: 'tharsis-republic', name: 'Tharsis Republic', expansion: 'Base', startingMC: 40, note: 'Primera acción: colocar una ciudad · +1 prod. M€ por ciudad' },
  { id: 'thorgate', name: 'Thorgate', expansion: 'Base', startingMC: 48, production: { energy: 1 }, discountId: 'thorgate' },
  { id: 'unmi', name: 'United Nations Mars Initiative', expansion: 'Base', startingMC: 40, note: 'Acción: 3 M€ por +1 TR si subiste TR esta generación' },
  { id: 'saturn-systems', name: 'Saturn Systems', expansion: 'Corporate Era', startingMC: 42, production: { titanium: 1 }, note: '+1 prod. M€ por cada etiqueta jupiteriana jugada' },
  { id: 'teractor', name: 'Teractor', expansion: 'Corporate Era', startingMC: 60, discountId: 'teractor' },
  { id: 'cheung-shing-mars', name: 'Cheung Shing MARS', expansion: 'Prelude', startingMC: 44, production: { megacredits: 3 }, discountId: 'cheung-shing-mars' },
  { id: 'point-luna', name: 'Point Luna', expansion: 'Prelude', startingMC: 38, production: { titanium: 1 }, note: 'Roba 1 carta por cada etiqueta Tierra' },
  { id: 'robinson-industries', name: 'Robinson Industries', expansion: 'Prelude', startingMC: 47, note: 'Acción: 4 M€ para subir tu producción más baja' },
  { id: 'valley-trust', name: 'Valley Trust', expansion: 'Prelude', startingMC: 37, discountId: 'valley-trust', note: 'Primera acción: robar 3 preludios y jugar 1' },
  { id: 'vitor', name: 'Vitor', expansion: 'Prelude', startingMC: 48, note: 'Primera acción: financiar un premio gratis · 3 M€ por carta con PV' },
  { id: 'aphrodite', name: 'Aphrodite', expansion: 'Venus Next', startingMC: 47, production: { plants: 1 }, note: '2 M€ cada vez que sube Venus' },
  { id: 'celestic', name: 'Celestic', expansion: 'Venus Next', startingMC: 42, note: 'Primera acción: robar 2 cartas con flotadores' },
  { id: 'manutech', name: 'Manutech', expansion: 'Venus Next', startingMC: 35, production: { steel: 1 }, note: 'Gana el recurso cada vez que sube su producción' },
  { id: 'morning-star-inc', name: 'Morning Star Inc.', expansion: 'Venus Next', startingMC: 50, note: 'Requisitos de Venus ±2' },
  { id: 'viron', name: 'Viron', expansion: 'Venus Next', startingMC: 48, note: 'Acción: reutilizar una acción azul ya usada' },
  { id: 'aridor', name: 'Aridor', expansion: 'Colonies', startingMC: 40, note: '+1 prod. M€ por cada tipo de etiqueta nueva' },
  { id: 'arklight', name: 'Arklight', expansion: 'Colonies', startingMC: 45, production: { megacredits: 2 } },
  { id: 'polyphemos', name: 'Polyphemos', expansion: 'Colonies', startingMC: 50, production: { megacredits: 5 }, stock: { titanium: 5 }, cardCost: 5 },
  { id: 'poseidon', name: 'Poseidon', expansion: 'Colonies', startingMC: 45, note: '+1 prod. M€ por cada colonia colocada' },
  { id: 'stormcraft', name: 'Stormcraft Incorporated', expansion: 'Colonies', startingMC: 48, note: 'Los flotadores valen 2 calor' },
  { id: 'arcadian-communities', name: 'Arcadian Communities', expansion: 'Promo', startingMC: 40, stock: { steel: 10 } },
  { id: 'astrodrill', name: 'Astrodrill', expansion: 'Promo', startingMC: 35, note: 'Empieza con 3 asteroides' },
  { id: 'factorum', name: 'Factorum', expansion: 'Promo', startingMC: 37, production: { steel: 1 } },
  { id: 'kuiper-cooperative', name: 'Kuiper Cooperative', expansion: 'Promo', startingMC: 33, production: { titanium: 1 } },
  { id: 'mons-insurance', name: 'Mons Insurance', expansion: 'Promo', startingMC: 48, production: { megacredits: 4 }, note: 'Los demás jugadores pierden 2 prod. M€' },
  { id: 'pharmacy-union', name: 'Pharmacy Union', expansion: 'Promo', startingMC: 54 },
  { id: 'philares', name: 'Philares', expansion: 'Promo', startingMC: 47 },
  { id: 'polder-tech-dutch', name: 'PolderTech Dutch', expansion: 'Promo', startingMC: 35, note: 'Primera acción: océano y bosque juntos' },
  { id: 'recyclon', name: 'Recyclon', expansion: 'Promo', startingMC: 38, production: { steel: 1 } },
  { id: 'splice', name: 'Splice', expansion: 'Promo', startingMC: 44 },
  { id: 'tycho-magnetics', name: 'Tycho Magnetics', expansion: 'Promo', startingMC: 42, production: { energy: 1 } },
];

export const PRELUDES: PreludeDef[] = [
  { id: 'acquired-space-agency', name: 'Acquired Space Agency', expansion: 'Prelude', stock: { titanium: 6 }, note: 'Robá 2 cartas espaciales' },
  { id: 'allied-banks', name: 'Allied Banks', expansion: 'Prelude', production: { megacredits: 4 }, stock: { megacredits: 3 } },
  { id: 'aquifer-turbines', name: 'Aquifer Turbines', expansion: 'Prelude', production: { energy: 2 }, stock: { megacredits: -3 }, oceans: 1 },
  { id: 'biofuels', name: 'Biofuels', expansion: 'Prelude', production: { energy: 1, plants: 1 }, stock: { plants: 2 } },
  { id: 'biolab', name: 'Biolab', expansion: 'Prelude', production: { plants: 1 }, note: 'Robá 3 cartas' },
  { id: 'biosphere-support', name: 'Biosphere Support', expansion: 'Prelude', production: { plants: 2, megacredits: -1 } },
  { id: 'business-empire', name: 'Business Empire', expansion: 'Prelude', production: { megacredits: 6 }, stock: { megacredits: -6 } },
  { id: 'dome-farming', name: 'Dome Farming', expansion: 'Prelude', production: { megacredits: 2, plants: 1 } },
  { id: 'donation', name: 'Donation', expansion: 'Prelude', stock: { megacredits: 21 } },
  { id: 'early-settlement', name: 'Early Settlement', expansion: 'Prelude', production: { plants: 1 }, note: 'Colocá una ciudad' },
  { id: 'eccentric-sponsor', name: 'Eccentric Sponsor', expansion: 'Prelude', note: 'Jugá una carta con 25 M€ de descuento' },
  { id: 'ecology-experts', name: 'Ecology Experts', expansion: 'Prelude', production: { plants: 1 }, note: 'Jugá una carta ignorando requisitos globales' },
  { id: 'experimental-forest', name: 'Experimental Forest', expansion: 'Prelude', oxygen: 1, note: 'Colocá el bosque y robá 2 cartas de plantas' },
  { id: 'galilean-mining', name: 'Galilean Mining', expansion: 'Prelude', production: { titanium: 2 }, stock: { megacredits: -5 } },
  { id: 'great-aquifer', name: 'Great Aquifer', expansion: 'Prelude', oceans: 2 },
  { id: 'huge-asteroid', name: 'Huge Asteroid', expansion: 'Prelude', temperature: 3, stock: { megacredits: -5 } },
  { id: 'io-research-outpost', name: 'Io Research Outpost', expansion: 'Prelude', production: { titanium: 1 }, note: 'Robá 1 carta' },
  { id: 'loan', name: 'Loan', expansion: 'Prelude', production: { megacredits: -2 }, stock: { megacredits: 30 } },
  { id: 'martian-industries', name: 'Martian Industries', expansion: 'Prelude', production: { energy: 1, steel: 1 }, stock: { megacredits: 6 } },
  { id: 'metal-rich-asteroid', name: 'Metal-Rich Asteroid', expansion: 'Prelude', temperature: 1, stock: { titanium: 4, steel: 4 } },
  { id: 'metals-company', name: 'Metals Company', expansion: 'Prelude', production: { megacredits: 1, steel: 1, titanium: 1 } },
  { id: 'mining-operations', name: 'Mining Operations', expansion: 'Prelude', production: { steel: 2 }, stock: { steel: 4 } },
  { id: 'mohole', name: 'Mohole', expansion: 'Prelude', production: { heat: 3 }, stock: { heat: 3 } },
  { id: 'mohole-excavation', name: 'Mohole Excavation', expansion: 'Prelude', production: { steel: 1, heat: 2 }, stock: { heat: 2 } },
  { id: 'nitrogen-shipment', name: 'Nitrogen Shipment', expansion: 'Prelude', production: { plants: 1 }, tr: 1, stock: { megacredits: 5 } },
  { id: 'orbital-construction-yard', name: 'Orbital Construction Yard', expansion: 'Prelude', production: { titanium: 1 }, stock: { titanium: 4 } },
  { id: 'polar-industries', name: 'Polar Industries', expansion: 'Prelude', production: { heat: 2 }, oceans: 1 },
  { id: 'power-generation', name: 'Power Generation', expansion: 'Prelude', production: { energy: 3 } },
  { id: 'research-network', name: 'Research Network', expansion: 'Prelude', production: { megacredits: 1 }, note: 'Robá 3 cartas' },
  { id: 'self-sufficient-settlement', name: 'Self-Sufficient Settlement', expansion: 'Prelude', production: { megacredits: 2 }, note: 'Colocá una ciudad' },
  { id: 'smelting-plant', name: 'Smelting Plant', expansion: 'Prelude', oxygen: 2, stock: { steel: 5 } },
  { id: 'society-support', name: 'Society Support', expansion: 'Prelude', production: { plants: 1, energy: 1, heat: 1, megacredits: -1 } },
  { id: 'supplier', name: 'Supplier', expansion: 'Prelude', production: { energy: 2 }, stock: { steel: 4 } },
  { id: 'supply-drop', name: 'Supply Drop', expansion: 'Prelude', stock: { titanium: 3, steel: 8, plants: 3 } },
  { id: 'unmi-contractor', name: 'UNMI Contractor', expansion: 'Prelude', tr: 3, note: 'Robá 1 carta' },
];

export const PRELUDES_PER_PLAYER = 2;
export const MAX_INITIAL_CARDS = 10;

export const findCorporation = (id: string | null | undefined) => CORPORATIONS.find((c) => c.id === id);
export const findPrelude = (id: string) => PRELUDES.find((p) => p.id === id);

export const expansionsOf = <T extends { expansion: string }>(list: T[]) => [...new Set(list.map((x) => x.expansion))];

const RES_SHORT: Record<ResourceKey, string> = {
  megacredits: 'M€',
  steel: 'acero',
  titanium: 'titanio',
  plants: 'plantas',
  energy: 'energía',
  heat: 'calor',
};

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Resumen corto en español de lo que da una corporación o un preludio. */
export function describeEffects(e: {
  startingMC?: number;
  production?: Amounts;
  stock?: Amounts;
  tr?: number;
  temperature?: number;
  oxygen?: number;
  oceans?: number;
  greeneryCost?: number;
  titaniumValue?: number;
  cardCost?: number;
  freeInitialCards?: boolean;
  discount?: { amount: number; scope: DiscountScope; label: string };
}): string {
  const parts: string[] = [];
  if (e.startingMC !== undefined) parts.push(`${e.startingMC} M€`);
  for (const [k, v] of Object.entries(e.production ?? {}) as [ResourceKey, number][]) {
    parts.push(`${signed(v)} prod. ${RES_SHORT[k]}`);
  }
  for (const [k, v] of Object.entries(e.stock ?? {}) as [ResourceKey, number][]) {
    parts.push(v < 0 && k === 'megacredits' ? `paga ${-v} M€` : `${signed(v)} ${RES_SHORT[k]}`);
  }
  if (e.tr) parts.push(`+${e.tr} TR`);
  if (e.temperature) parts.push(`temperatura +${e.temperature}`);
  if (e.oxygen) parts.push(`oxígeno +${e.oxygen}`);
  if (e.oceans) parts.push(`${e.oceans} océano${e.oceans > 1 ? 's' : ''}`);
  if (e.greeneryCost) parts.push(`bosque con ${e.greeneryCost} plantas`);
  if (e.titaniumValue) parts.push(`titanio vale ${e.titaniumValue}`);
  if (e.cardCost !== undefined) parts.push(`cartas a ${e.cardCost} M€`);
  if (e.freeInitialCards) parts.push('10 cartas iniciales gratis');
  if (e.discount) parts.push(`−${e.discount.amount} en ${e.discount.label}`);
  return parts.join(' · ');
}
