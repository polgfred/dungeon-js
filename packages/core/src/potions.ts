import { Event } from './types.js';

export type PotionAttributeTarget = 'ST' | 'DX' | 'IQ' | 'MHP';

function potionAttributeOutcomeText(options: {
  target: PotionAttributeTarget;
  change: number;
}): string {
  const { target, change } = options;
  switch (target) {
    case 'ST':
      return `it ${change >= 0 ? 'increases' : 'decreases'} your strength.`;
    case 'DX':
      return `it ${change >= 0 ? 'increases' : 'decreases'} your dexterity.`;
    case 'IQ':
      return `it makes you ${change >= 0 ? 'smarter' : 'dumber'}.`;
    case 'MHP':
      return change >= 0
        ? 'strange energies surge through you.'
        : 'you feel weaker.';
  }
}

export function drinkHealingPotionEvents() {
  return [Event.info('You drink the potion... healing results.')];
}

export function drinkAttributePotionEvents(options: {
  target: PotionAttributeTarget;
  change: number;
}) {
  return [
    Event.info(
      `You drink the potion... ${potionAttributeOutcomeText(options)}`
    ),
  ];
}
