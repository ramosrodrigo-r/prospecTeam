import { isDuplicate } from '../history.js'

export function dedupProspects(prospects) {
  return prospects.filter(p => !isDuplicate(p.placeId))
}
