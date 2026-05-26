import { registerProjectHandlers } from './projects'
import { registerFileHandlers } from './files'
import { registerSettingsHandlers } from './settings'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerFileHandlers()
  registerSettingsHandlers()
}
