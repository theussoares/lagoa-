import type { GuideText } from '~/types/content'
import { REDEMPTION_CODE_LENGTH, REDEMPTION_CODE_TTL_MINUTES, REWARD_HOLD_DAYS, VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'

export const GUIDE_TEXTS: GuideText[] = [
  {
    id: 'getStarted',
    slug: 'get-started',
    title: 'Getting started: from WhatsApp to the first stamp',
    description: 'What happens from the first contact until your club is running at the counter.',
    body: [
      { kind: 'p', text: 'Setting up the club takes a few steps, and the Lagoa+ team handles the onboarding with you, at no cost.' },
      { kind: 'ol', items: [
        'You message the network on WhatsApp and tell us about your shop.',
        'The Lagoa+ team replies within 24 hours and talks with you before approving.',
        'Once the shop is approved, you build the club together: goal, reward and rules.',
        'You print the poster with the shop QR and put it at the counter.',
        'At the first sale, generate the visit QR and show it to the customer.',
      ] },
      { kind: 'h2', text: 'Do I need new equipment?' },
      { kind: 'p', text: 'No. The Counter runs in the browser of the computer, tablet or phone already in your shop. Customers do not download an app either: the wallet opens in the browser and can be installed on the home screen.' },
    ],
  },
  {
    id: 'generateQr',
    slug: 'generate-visit-qr',
    title: 'Generating the visit QR at the sale',
    description: 'How to record the visit in the Counter in a few seconds and what makes the QR secure.',
    body: [
      { kind: 'p', text: `At the sale, you open the Counter and generate the visit QR. Each QR works once and expires in ${VISIT_QR_TTL_MINUTES} minutes.` },
      { kind: 'h2', text: 'Two types of QR' },
      { kind: 'ul', items: [
        'Stamp: the customer earns the visit stamp.',
        'By amount: you enter the purchase amount and, with points per real, the customer earns proportional points.',
      ] },
      { kind: 'h2', text: 'The customer scans it' },
      { kind: 'p', text: 'The customer points the camera at the QR. If they prefer, they type the short code shown on screen. Anyone without a card leaves with one. You never type the customer\'s phone number.' },
      { kind: 'h2', text: 'Anti-fraud' },
      { kind: 'p', text: 'Each customer earns at most one rewarding visit per time window you define (for example, once a day). If the customer tries earlier, the refusal does not use up the QR.' },
    ],
  },
  {
    id: 'redemption',
    slug: 'redemption',
    title: 'Redemption: validating and handing over the reward',
    description: 'The step by step to check the customer\'s code and hand over the reward at the counter.',
    body: [
      { kind: 'p', text: `When the card is complete, the customer generates a code of ${REDEMPTION_CODE_LENGTH} letters and numbers that is valid for about ${REDEMPTION_CODE_TTL_MINUTES} minutes.` },
      { kind: 'ol', items: [
        'The customer shows the code on their phone screen.',
        'You type the code into the Counter and check it.',
        'If it is valid, the Counter shows the reward. You hand it over and confirm.',
        'The customer\'s next card can already start ahead, if the welcome rule is on.',
      ] },
      { kind: 'p', text: `A reward the customer does not redeem is kept for ${REWARD_HOLD_DAYS} days. The code is single-use and validation is always done on the server.` },
    ],
  },
  {
    id: 'bonusRules',
    slug: 'bonus-rules',
    title: 'Bonus rules: birthday, referral and surprise day',
    description: 'How to turn on the rules that bring traffic on slow days and attract new customers.',
    body: [
      { kind: 'p', text: 'Bonus rules are optional. Turn on only the ones that make sense for your shop. If two rules land on the same day, the bigger one applies: they do not add up.' },
      { kind: 'ul', items: [
        'Welcome: the card starts with 2 stamps. People who start ahead are in a hurry to finish.',
        'Referral (bring a friend): whoever refers earns +1 when their friend makes a first visit.',
        'Birthday: on the customer\'s birthday, each visit is worth two stamps.',
        'Surprise day: double stamps only on the day you choose, great for a slow day.',
      ] },
      { kind: 'h2', text: 'About birthdays' },
      { kind: 'p', text: 'The customer enters the day and month in their profile. The first date is free; after that, changing it is locked for 365 days, so the bonus does not become a double every day.' },
    ],
  },
]
