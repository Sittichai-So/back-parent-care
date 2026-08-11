const crypto = require('crypto')

// Excludes visually ambiguous characters (0/O, 1/I) so a code is easy to read
// aloud or retype by hand. Shared by household invite codes, user codes, and
// household-member claim codes — anywhere a short human-shareable code is
// needed.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const generateShortCode = (length = 8) => {
  const bytes = crypto.randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}

const generateInviteCode = (length = 8) => generateShortCode(length)

// A user's own shareable code (shown on their profile), used for exact-match
// lookup when adding an existing account to a household.
const generateUserCode = (length = 8) => generateShortCode(length)

// Longer than the other codes: a claim code links a real account to an
// existing member profile's full history (medicines, appointments, vitals),
// so it warrants more entropy than a code meant only to be read aloud.
const generateClaimCode = (length = 12) => generateShortCode(length)

module.exports = {
  generateShortCode,
  generateInviteCode,
  generateUserCode,
  generateClaimCode
}
