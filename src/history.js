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
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    historyMap = new Map(Object.entries(JSON.parse(raw)))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    historyMap = new Map()
  }
}

export function isDuplicate(placeId) {
  return historyMap.has(placeId)
}

export function recordSend(placeId) {
  historyMap.set(placeId, { sentAt: new Date().toISOString() })
  const obj = Object.fromEntries(historyMap)
  writeFileSync(HISTORY_TMP, JSON.stringify(obj, null, 2), 'utf8')
  renameSync(HISTORY_TMP, HISTORY_FILE)
}
