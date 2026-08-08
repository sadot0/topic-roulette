/** Русский — источник правды И источника типа Dict.
    Пропуск ключа в en/uz станет ошибкой компиляции */
export const ru = {
  brand: 'Рулетка тем',
  tagline: 'одна тема · ресёрч · минута на камеру',

  spin: 'Крутить',
  spinAgain: 'Следующая',
  skipSpin: 'Пропустить',

  modeQuick: 'Без подготовки',
  modeDeep: 'Глубокий ресёрч',
  noteQuick: 'Говори сразу, как есть',
  noteDeep: 'Сначала изучи, потом расскажи',

  stReady: 'ожидание',
  stSpin: 'выборка',
  stLocked: 'тема выбрана',

  progress: 'открыто',
  kbd: 'пробел',

  research: 'Ресёрч',
  speech: 'Речь',
  min: 'мин',
  settings: 'Настройки',
  settingsNote: 'длительность в минутах',
  done: 'Готово',

  pause: 'Пауза',
  resume: 'Продолжить',
  close: 'Закрыть',
  phaseResearch: 'ресёрч',
  phaseSpeech: 'речь',
  statusResearch: 'изучай',
  statusSpeech: 'говори',
  statusPaused: 'пауза',
  researchDone: 'ресёрч окончен',
  timeUp: 'время',
  toSpeech: 'Начать речь',
  skipToSpeech: 'Пропустить',
  nextTopic: 'Следующая тема',

  st1: 'Что?',
  st2: 'И что?',
  st3: 'Что дальше?',

  hookReveal: 'Проверить себя',
  hookLabel: 'суть',

  frameMode: 'В кадр',
  frameHint: 'нажми F, чтобы выйти',
  challenge: 'Бросить вызов',
  challengeCopied: 'Ссылка скопирована',
  shareCard: 'Карточка',

  streak: 'подряд',
  streakDays: 'дней',
  today: 'Тема дня',

  author: 'автор',
};

/* Значения — string, а не литералы: иначе en/uz не смогут
   присвоить свои строки. Ключи при этом остаются жёсткими,
   и пропуск любого станет ошибкой компиляции */
export type Dict = { [K in keyof typeof ru]: string };
