export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function setDeferredPrompt(prompt: BeforeInstallPromptEvent | null) {
  deferredPrompt = prompt
}

export function getDeferredPrompt() {
  return deferredPrompt
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) return null
  deferredPrompt.prompt()
  const result = await deferredPrompt.userChoice
  deferredPrompt = null
  return result.outcome
}
