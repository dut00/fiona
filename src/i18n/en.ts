import type { pl } from './pl'

export const en: typeof pl = {
  tagline: 'Find the tone that makes glass sing',

  warnTitle: 'Before you start',
  warnIntro:
    'Fiona plays a loud, pure tone exactly at an object’s resonant frequency. That can be dangerous:',
  warnHearing: 'Hearing — a long, loud, high-pitched tone can permanently damage your hearing. Never hold the speaker to your ear; take breaks.',
  warnShards: 'Shards — if the glass breaks, shards can fly far. Wear safety glasses, keep your distance, never hold the glass in your hand.',
  warnOthers: 'Surroundings — pets (especially dogs and cats) and other people may find the sound very unpleasant.',
  warnProperty: 'Property — don’t experiment on valuable items or things that aren’t yours.',
  warnReality:
    'Honestly: a phone speaker is usually too weak to shatter a glass — you will see/hear the glass “sing”. Breaking it realistically needs a powerful external speaker and thin crystal.',
  warnCheckbox: 'I understand the risks and use this app at my own responsibility.',
  warnContinue: 'Continue',

  step1: '1. Measure',
  step1Hint: 'Press the button, then gently tap the glass (fingernail or teaspoon). Keep the phone close.',
  listen: 'Listen',
  listening: 'Tap the glass…',
  cancel: 'Cancel',
  analyzing: 'Analysing…',
  noTap: 'No tap detected. Try tapping harder or closer to the microphone.',
  micDenied: 'Microphone access denied. Allow the microphone in your browser settings.',
  micUnsupported: 'Microphone unavailable. The app needs HTTPS and a modern browser.',
  micError: 'Microphone error: {msg}',
  noPeak: 'No clear tone found. Tap again.',

  resonance: 'Resonant frequency',
  tapsAveraged: 'average of {n} taps',
  addTap: 'Add a tap',
  remeasure: 'Measure again',
  tapToPick: 'Tap another peak on the chart to select it (e.g. a higher vibration mode).',
  fineAdjust: 'Manual adjust',

  step2: '2. Excite',
  play: 'Play',
  stop: 'STOP',
  tune: 'Tune to resonance',
  tuneHint:
    'Tuning: the app plays and nudges the tone around the measured frequency, listening for where the glass answers loudest (usually ~3 s). Then it keeps playing the found tone. Put the phone next to the glass, microphone facing it.',
  tuning: 'Searching for resonance… (measurement {n})',
  tunedPlaying: 'Tuned: {f} Hz — still playing',
  tuned: 'Tuned: {f} Hz',
  tunedGain: 'Glass responds +{db} dB above baseline',
  volume: 'Volume',
  volumeWarn: 'High volume — protect your hearing!',
  autoStopped: 'Stopped automatically after {s} s (hearing protection). Take a break.',
  timeLeft: 'auto-stop in {s} s',
  micLevel: 'Microphone level',
  iosMute: 'iPhone: turn off silent mode (side switch), otherwise you will hear nothing.',

  history: 'History',
  historyEmpty: 'No saved measurements.',
  save: 'Save',
  namePlaceholder: 'Name, e.g. wine glass',
  use: 'Use',
  delete: 'Delete',
  saved: 'Saved',

  eggTitle: 'Oops… too high!',
  eggText: 'All that’s left are its legs… and some eggs for breakfast. 🍳',
  eggReplay: 'Encore!',
  close: 'Close',
  about: 'How does it work?',
  footer: 'Fiona — named after the princess from “Shrek” who {link}.',
  footerLink: 'sang with a little bird',
}
