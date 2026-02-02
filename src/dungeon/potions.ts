import { Event } from './types.js';

export type PotionAttributeTarget = 'ST' | 'DX' | 'IQ' | 'MHP';

function potionAttributeOutcomeText(options: {
  target: PotionAttributeTarget;
  change: number;
}): string {
  const { target, change } = options;
  switch (target) {
    case 'ST':
      return `The potion ${change >= 0 ? 'increases' : 'decreases'} your strength.`;
    case 'DX':
      return `The potion ${change >= 0 ? 'increases' : 'decreases'} your dexterity.`;
    case 'IQ':
      return `The potion makes you ${change >= 0 ? 'smarter' : 'dumber'}.`;
    case 'MHP':
      return change >= 0
        ? 'Strange energies surge through you.'
        : 'You feel weaker.';
  }
}

export function drinkHealingPotionEvents() {
  return [
    Event.info('You drink the potion...'),
    Event.info('Healing results.'),
  ];
}

export function drinkAttributePotionEvents(options: {
  target: PotionAttributeTarget;
  change: number;
}) {
  return [
    Event.info('You drink the potion...'),
    Event.info(potionAttributeOutcomeText(options)),
  ];
}
