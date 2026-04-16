import { h } from 'vue'
import * as Tone from 'tone'
import { useMessage } from 'naive-ui'

export type NotifierOptions = { keepAliveOnHover?: boolean; duration?: number }

export function useUiNotifier() {
  const message = useMessage()

  async function playSuccessTone() {
    await Tone.start()
    const synth = new Tone.Synth().toDestination()
    const now = Tone.now()
    synth.triggerAttackRelease('C4', '8n', now)
    synth.triggerAttackRelease('G4', '8n', now + 0.1)
    synth.triggerAttackRelease('F4', '8n', now + 0.2)
  }

  async function playErrorTone() {
    await Tone.start()
    const synth = new Tone.Synth().toDestination()
    const now = Tone.now()
    synth.triggerAttackRelease('D4', '8n', now)
    synth.triggerAttackRelease('D4', '8n', now + 0.2)
  }

  async function success(msg: string, opts?: NotifierOptions) {
    try {
      await playSuccessTone()
    } catch {
      // ignore tone errors to ensure message still appears
    }
    message.success(() => h('span', { 'data-testid': 'success-message' }, msg), opts)
  }

  function warn(msg: string, opts?: NotifierOptions) {
    message.warning(() => h('span', { 'data-testid': 'warning-message' }, msg), opts)
  }

  function info(msg: string, opts?: NotifierOptions) {
    message.info(() => h('span', { 'data-testid': 'info-message' }, msg), opts)
  }

  async function error(msg: string, opts?: NotifierOptions) {
    message.error(() => h('span', { 'data-testid': 'error-message' }, msg), opts)
    playErrorTone().catch(() => {})
  }

  function notifyError(msg: string, opts?: NotifierOptions) {
    message.error(() => h('span', { 'data-testid': 'error-message' }, msg), opts)
  }

  function speak(text: string) {
    text = text.split('').join(', ')
    const utterance = new SpeechSynthesisUtterance()
    utterance.text = text
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
  }

  return {
    success,
    warn,
    info,
    error,
    notifyError,
    speak,
    playSuccessTone,
    playErrorTone
  }
}
