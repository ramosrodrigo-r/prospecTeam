import { isDuplicate } from '../history.js'

export function dedupProspects(prospects) {
  return prospects.filter(p => {
    const waDone = isDuplicate(p.placeId, 'wa')
    const emailDone = isDuplicate(p.placeId, 'email')
    // Keep prospect if at least one channel still pending
    return !waDone || !emailDone
  })
}
