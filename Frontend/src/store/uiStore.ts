import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface UiState {
  toasts: Toast[]
  pushToast: (kind: ToastKind, message: string) => void
  dismissToast: (id: number) => void
}

let toastSeq = 1

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (kind, message) => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    // success/info auto-dismiss; errors stay until dismissed.
    if (kind !== 'error') {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, 4000)
    }
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience accessors for non-component code. */
export const toast = {
  success: (m: string) => useUiStore.getState().pushToast('success', m),
  error: (m: string) => useUiStore.getState().pushToast('error', m),
  info: (m: string) => useUiStore.getState().pushToast('info', m),
}
