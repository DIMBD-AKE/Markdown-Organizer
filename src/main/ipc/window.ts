import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from './channels'

export type ThemeName = 'dark' | 'black' | 'latte' | 'claude' | 'codex'

// Mantle (header bg) + text-token colors per theme. Mirror of CSS vars in
// renderer/src/index.css — keep in sync if a theme is added/changed.
export const THEME_OVERLAY: Record<ThemeName, { color: string; symbolColor: string }> = {
  dark:   { color: '#181825', symbolColor: '#cdd6f4' },
  black:  { color: '#0a0a0a', symbolColor: '#cdd6f4' },
  latte:  { color: '#e6e9ef', symbolColor: '#4c4f69' },
  claude: { color: '#f2f0e9', symbolColor: '#141413' },
  codex:  { color: '#1a1b1d', symbolColor: '#f5f7fa' },
}

export function applyTitleBarOverlay(win: BrowserWindow, theme: ThemeName): void {
  if (process.platform !== 'win32') return
  const { color, symbolColor } = THEME_OVERLAY[theme] ?? THEME_OVERLAY.dark
  try {
    win.setTitleBarOverlay({ color, symbolColor, height: 40 })
  } catch {
    // setTitleBarOverlay only works when titleBarStyle === 'hidden' and the
    // window has an overlay. Older Electron / non-Win32 throws — swallow.
  }
}

export function registerWindowHandlers(): void {
  ipcMain.handle(IPC.CLOSE_WINDOW, () => {
    BrowserWindow.getFocusedWindow()?.close()
  })
  ipcMain.handle(IPC.MINIMIZE_WINDOW, () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })
  ipcMain.handle(IPC.TOGGLE_MAXIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle(IPC.SET_TITLE_BAR_OVERLAY, (e, theme: ThemeName) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? BrowserWindow.getFocusedWindow()
    if (!win) return
    applyTitleBarOverlay(win, theme)
  })
}
