import type { Dict } from './ru';

/* Узбекская латиница: в oʻ и gʻ стоит U+02BB (ʻ), гортанная
   смычка — U+02BC (ʼ). Машинописный апостроф здесь ошибка,
   носитель видит её мгновенно */
export const uz: Dict = {
  brand: 'Mavzular ruletkasi',
  tagline: 'bitta mavzu · research · kamera oldida bir daqiqa',

  spin: 'Aylantirish',
  spinAgain: 'Keyingisi',
  skipSpin: 'Tashlab ketish',

  modeQuick: 'Tayyorgarliksiz',
  modeDeep: 'Chuqur research',
  noteQuick: 'Bor gapni darrov ayt',
  noteDeep: 'Avval oʻrgan, keyin gapir',

  stReady: 'kutish',
  stSpin: 'tanlash',
  stLocked: 'mavzu tanlandi',

  progress: 'ochilgan',
  kbd: 'boʻshliq',

  research: 'Research',
  speech: 'Nutq',
  min: 'daq',
  settings: 'Sozlamalar',
  settingsNote: 'davomiylik daqiqada',
  done: 'Tayyor',

  pause: 'Pauza',
  resume: 'Davom ettirish',
  close: 'Yopish',
  phaseResearch: 'research',
  phaseSpeech: 'nutq',
  statusResearch: 'oʻrgan',
  statusSpeech: 'gapir',
  statusPaused: 'pauzada',
  researchDone: 'research tugadi',
  timeUp: 'vaqt',
  toSpeech: 'Nutqni boshlash',
  skipToSpeech: 'Oʻtkazib yuborish',
  nextTopic: 'Keyingi mavzu',

  st1: 'Nima?',
  st2: 'Nega muhim?',
  st3: 'Endi nima?',

  hookReveal: 'Oʻzingni tekshir',
  hookLabel: 'mohiyati',

  frameMode: 'Kadrga',
  frameHint: 'chiqish uchun F',
  challenge: 'Chaqiriq tashla',
  challengeCopied: 'Havola nusxalandi',
  shareCard: 'Kartochka',

  streak: 'ketma-ket',
  streakDays: 'kun',
  today: 'Kun mavzusi',

  author: 'muallif',
};
