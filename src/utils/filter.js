const BLOCKED_DOMAINS = ['instagram.com', 'linktr.ee']

function hasRealWebsite(website) {
  if (!website || !website.trim()) return false

  let href = website.trim()
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    href = 'https://' + href
  }

  let hostname
  try {
    hostname = new URL(href).hostname
  } catch {
    return false
  }

  const isBlocked = BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  return !isBlocked
}

export function filterBusinesses(prospects, onSkip) {
  return prospects.filter(prospect => {
    if (hasRealWebsite(prospect.website)) {
      if (onSkip) onSkip(prospect, 'has-website', prospect.website)
      return false
    }
    return true
  })
}
