import { registerProjectHandlers } from './projects'
import { registerFileHandlers } from './files'
import { registerSettingsHandlers } from './settings'
import { registerSearchHandlers } from './search'
import { registerUpdaterHandlers } from './updater'
import { registerWindowHandlers } from './window'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerFileHandlers()
  registerSettingsHandlers()
  registerSearchHandlers()
  registerUpdaterHandlers()
  registerWindowHandlers()
}
