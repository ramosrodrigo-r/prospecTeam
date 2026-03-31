import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const HISTORY_FILE = join(DATA_DIR, 'history.json')
const HISTORY_TMP = HISTORY_FILE + '.tmp'

let historyMap = new Map()

export function loadHistory() {
  mkdirSync(DATA_DIR, { recursive: true })
  try {
    const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'))
    // Migration: old schema { sentAt } -> new schema { wa, email }
    const migrated = Object.fromEntries(
      Object.entries(raw).map(([id, val]) => {
        if (val.sentAt !== undefined && val.wa === undefined) {
          return [id, { wa: val.sentAt, email: null }]
        }
        return [id, val]
      })
    )
    historyMap = new Map(Object.entries(migrated))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    historyMap = new Map()
  }
}

export function isDuplicate(placeId, channel) {
  const entry = historyMap.get(placeId)
  if (!entry) return false
  return entry[channel] != null
}

export function recordSend(placeId, channel) {
  const existing = historyMap.get(placeId) ?? { wa: null, email: null }
  historyMap.set(placeId, { ...existing, [channel]: new Date().toISOString() })
  const obj = Object.fromEntries(historyMap)
  writeFileSync(HISTORY_TMP, JSON.stringify(obj, null, 2), 'utf8')
  renameSync(HISTORY_TMP, HISTORY_FILE)
}
