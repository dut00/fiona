import { MicrophoneError } from '../audio/engine'
import type { Key } from '../i18n'

export interface AppError {
  key: Key
  msg?: string
}

/** Turns anything thrown while opening/using the microphone into a translatable message. */
export function toAppError(e: unknown): AppError {
  if (e instanceof MicrophoneError) {
    const key: Record<MicrophoneError['kind'], Key> = {
      denied: 'micDenied',
      unsupported: 'micUnsupported',
      silent: 'micSilent',
      other: 'micError',
    }
    return { key: key[e.kind], msg: e.message }
  }
  return { key: 'micError', msg: String(e) }
}
