import { isDuplicate } from '../history.js'

export function dedupProspects(prospects, onSkip) {
  return prospects.filter(p => {
    const waDone = isDuplicate(p.placeId, 'wa')
    const emailDone = isDuplicate(p.placeId, 'email')
    if (waDone && emailDone) {
      if (onSkip) onSkip(p, 'already-contacted', ['wa', 'email'])
      return false
    }
    return true
  })
}
