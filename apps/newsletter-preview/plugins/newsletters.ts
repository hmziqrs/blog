import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

const NEWSLETTERS_DIR = path.resolve(__dirname, '../../../content/newsletters')

export function newslettersPlugin(): Plugin {
  const virtualModuleId = 'virtual:newsletters'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'newsletters',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        if (!fs.existsSync(NEWSLETTERS_DIR)) {
          return 'export const newsletters = []'
        }

        const files = fs
          .readdirSync(NEWSLETTERS_DIR)
          .filter((f) => f.endsWith('.md'))
          .sort()

        const newsletters = files.map((file) => {
          const slug = file.replace(/\.md$/, '')
          const content = fs.readFileSync(path.join(NEWSLETTERS_DIR, file), 'utf-8')
          return { slug, content }
        })

        return `export const newsletters = ${JSON.stringify(newsletters)}`
      }
    },
  }
}
