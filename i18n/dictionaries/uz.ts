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

  idleLead: 'Bosing — hech narsa bilmagan mavzuingizni olasiz',
  anyTopic: 'Istalgan mavzu',
  modeQuick: 'Tayyorgarliksiz',
  modeDeep: 'Chuqur research',
  modeBuild: 'Vayb-koding',
  noteBuild: 'Topshiriq tushdi — quring',
  phaseBuild: 'koding',
  statusBuild: 'quring',
  buildDone: 'topshiriq yopildi',
  build: 'Topshiriq',
  toBuild: 'Kodlashni boshlash',
  buildLabel: 'Ish vaqti',
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
  soundLabel: 'Ovoz effektlari',
  soundOnTxt: 'yoqilgan',
  soundOffTxt: 'oʻchirilgan',
  presets: 'Tez tanlash',
  countdownLabel: 'Nutqdan oldin 3·2·1 sanoq',
  skipToSpeech: 'Tayyorman, gapiraman',
  nextTopic: 'Keyingi mavzu',

  st1: 'Nima?',
  st2: 'Nega muhim?',
  st3: 'Endi nima?',

  hookReveal: 'Oʻzingni tekshir',
  hookLabel: 'mohiyati',

  frameMode: 'Kadrga',
  frameHint: 'F yoki teging — chiqish',
  challenge: 'Chaqiriq tashla',
  challengeCopied: 'Havola nusxalandi',
  shareCard: 'Kartochka',

  streak: 'ketma-ket',
  streakDays: 'kun',
  today: 'Kun mavzusi',

  author: 'muallif',
};
