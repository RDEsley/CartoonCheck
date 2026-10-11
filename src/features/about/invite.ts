// The donation invitation. Everything stays on this device: clearing the site
// data brings the invitation back. The app still never learns who donated.
const visitsKey = 'cartoon-check:visits'
const visitCountedKey = 'cartoon-check:visit-counted'
const inviteSeenKey = 'cartoon-check:donation-invite-seen'
const cardHiddenKey = 'cartoon-check:donation-card-hidden'

/** The card at the foot of the app shows up from this visit on. */
export const cardAfterVisits = 3
/** The sheet opens by itself from this visit on, a single time. */
export const inviteAfterVisits = 5
/** How long the sheet keeps its buttons locked, so it is read before a tap. */
export const inviteLockMs = 2000

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // No storage: the invitation simply is not remembered.
  }
}

/** Counts one visit per opening of the app, not per screen, and returns the total. */
export function countVisit() {
  const visits = Number(read(visitsKey)) || 0
  try {
    if (sessionStorage.getItem(visitCountedKey) !== null) return visits
    sessionStorage.setItem(visitCountedKey, '1')
  } catch {
    return visits
  }
  write(visitsKey, String(visits + 1))
  return visits + 1
}

export const inviteSeen = () => read(inviteSeenKey) === '1'
export const markInviteSeen = () => {
  write(inviteSeenKey, '1')
}
export const cardHidden = () => read(cardHiddenKey) === '1'
export const hideCard = () => {
  write(cardHiddenKey, '1')
}

/** Whoever copied the Pix code does not need to be invited again. */
export function settleInvite() {
  markInviteSeen()
  hideCard()
}
