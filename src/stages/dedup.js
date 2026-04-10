import { isDuplicate } from '../history.js'

export function dedupProspects(prospects, onSkip) {
  return prospects.filter(p => {
    if (isDuplicate(p.placeId, 'wa')) {
      if (onSkip) onSkip(p, 'already-contacted', ['wa'])
      return false
    }
    return true
  })
}
