import { registerProjectHandlers } from './projects'
import { registerFileHandlers } from './files'
import { registerSettingsHandlers } from './settings'
import { registerSearchHandlers } from './search'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerFileHandlers()
  registerSettingsHandlers()
  registerSearchHandlers()
}
