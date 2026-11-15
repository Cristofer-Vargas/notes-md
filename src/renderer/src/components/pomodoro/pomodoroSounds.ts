import type { PomodoroSound } from '../../../../shared/pomodoro'

const tones: Record<PomodoroSound, number[]> = {
  open: [660],
  focus: [440, 554],
  break: [554, 440],
  pause: [440, 370],
  complete: [523, 659, 784]
}

let audioContext: AudioContext | null = null

export function playPomodoroSound(sound: PomodoroSound): void {
  try {
    audioContext ??= new AudioContext()
    const context = audioContext
    const play = (): void => {
      const start = context.currentTime + 0.02
      tones[sound].forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const volume = context.createGain()
        const at = start + index * 0.11
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        volume.gain.setValueAtTime(0.0001, at)
        volume.gain.exponentialRampToValueAtTime(0.035, at + 0.015)
        volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
        oscillator.connect(volume)
        volume.connect(context.destination)
        oscillator.start(at)
        oscillator.stop(at + 0.19)
        oscillator.onended = () => { oscillator.disconnect(); volume.disconnect() }
      })
    }
    if (context.state === 'running') play()
    else void context.resume().then(play).catch(() => {})
  } catch {
    // Audio is optional and must not affect the timer.
  }
}
