import type { CardTag, Discount, Payment, Player, PurchaseKind } from './types';

export interface PaymentRules {
  /** La carta tiene etiqueta de edificio: acepta acero. */
  steel: boolean;
  /** La carta tiene etiqueta espacial: acepta titanio. */
  titanium: boolean;
}

export const paymentValue = (p: Player, pay: Payment) =>
  pay.megacredits + pay.steel * p.steelValue + pay.titanium * p.titaniumValue;

export const canAfford = (p: Player, pay: Payment) =>
  pay.megacredits >= 0 &&
  pay.steel >= 0 &&
  pay.titanium >= 0 &&
  pay.megacredits <= p.resources.megacredits &&
  pay.steel <= p.resources.steel &&
  pay.titanium <= p.resources.titanium;

/** Completa con M€ lo que no cubren el acero y el titanio elegidos. */
export function paymentWith(p: Player, cost: number, steel: number, titanium: number): Payment {
  const covered = steel * p.steelValue + titanium * p.titaniumValue;
  return { megacredits: Math.max(0, cost - covered), steel, titanium };
}

/**
 * Pago más eficiente para un costo dado. Prioridades:
 * 1. no pagar de más (el acero/titanio sobrante no da vuelto),
 * 2. gastar la menor cantidad de M€ posible,
 * 3. conservar el titanio, que es más escaso.
 * Devuelve null si el jugador no puede pagar.
 */
export function bestPayment(p: Player, cost: number, rules: PaymentRules): Payment | null {
  if (cost <= 0) return { megacredits: 0, steel: 0, titanium: 0 };
  const maxSteel = rules.steel ? Math.min(p.resources.steel, Math.ceil(cost / p.steelValue)) : 0;
  const maxTitanium = rules.titanium ? Math.min(p.resources.titanium, Math.ceil(cost / p.titaniumValue)) : 0;

  let best: Payment | null = null;
  let bestScore: number[] = [];
  for (let t = 0; t <= maxTitanium; t++) {
    for (let s = 0; s <= maxSteel; s++) {
      const pay = paymentWith(p, cost, s, t);
      if (!canAfford(p, pay)) continue;
      const score = [paymentValue(p, pay) - cost, pay.megacredits, t];
      if (!best || isLower(score, bestScore)) {
        best = pay;
        bestScore = score;
      }
    }
  }
  return best;
}

function isLower(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

export function describePayment(pay: Payment): string {
  const parts: string[] = [];
  if (pay.steel) parts.push(`${pay.steel} acero`);
  if (pay.titanium) parts.push(`${pay.titanium} titanio`);
  if (pay.megacredits || parts.length === 0) parts.push(`${pay.megacredits} M€`);
  return parts.join(' + ');
}

/**
 * Descuentos que aplican a una compra. Cada efecto descuenta una vez por carta,
 * aunque la carta tenga varias etiquetas del mismo tipo. En proyectos estándar
 * solo aplican descuentos por etiqueta (p. ej. Thorgate en la planta de energía).
 */
export function applicableDiscounts(p: Player, kind: PurchaseKind, tags: CardTag[]): Discount[] {
  return p.discounts.filter((d) => (d.scope === 'all' ? kind === 'card' : tags.includes(d.scope)));
}
