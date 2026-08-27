/* ══════════════════════════════════════════════════════════════════════
   Can this person be offered Base44 at all?

   Base44 only pays out in certain countries, so the free-course funnel
   can only be run at people in them. Nearly every contact carries a phone
   number, and a phone number carries a dialling code, so country is
   knowable for most of the list without asking anybody.

   THIS FILE EXISTS BECAUSE THE RULE WAS ONLY IN A BACKFILL SCRIPT.
   transcription/tag-base44-eligible.js tagged the 27,369 people who were
   already in the CRM and then stopped existing. Nothing evaluated anyone
   who arrived afterwards, so every new contact would have been invisible
   to all three Base44 boards forever. The rule has to run on the live
   path, which means it has to live in lib/.

   UNKNOWN COUNTS AS ELIGIBLE. No phone, or a local-format number that
   could be anywhere, both resolve to eligible. Unknown is not the same as
   ineligible, they cost nothing to email, and the opt-in page and the
   setter call filter them long before anybody wastes money on them.
   India is the one hard exclusion, per the standing rule.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

/* Dialling codes, longest prefix wins. The eligible countries plus the
   common ineligible ones, so a stray match cannot quietly promote
   somebody into the audience. Kept identical to the backfill script: if
   the two ever disagree, people flicker in and out of the boards. */
const DIAL = {
  '1': 'US/CA', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL', '32': 'BE', '33': 'FR',
  '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO', '41': 'CH', '43': 'AT', '44': 'UK', '45': 'DK',
  '46': 'SE', '47': 'NO', '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '54': 'AR', '55': 'BR',
  '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID', '63': 'PH', '64': 'NZ',
  '65': 'SG', '66': 'TH', '81': 'JP', '82': 'KR', '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN',
  '92': 'PK', '94': 'LK', '98': 'IR', '212': 'MA', '213': 'DZ', '216': 'TN', '234': 'NG', '254': 'KE',
  '351': 'PT', '352': 'LU', '353': 'IE', '354': 'IS', '356': 'MT', '357': 'CY', '358': 'FI', '359': 'BG',
  '370': 'LT', '371': 'LV', '372': 'EE', '380': 'UA', '385': 'HR', '386': 'SI', '420': 'CZ', '421': 'SK',
  '880': 'BD', '886': 'TW', '962': 'JO', '964': 'IQ', '965': 'KW', '966': 'SA', '968': 'OM', '971': 'AE',
  '972': 'IL', '973': 'BH', '974': 'QA', '852': 'HK', '853': 'MO', '977': 'NP', '994': 'AZ', '998': 'UZ',
}

/* The full 47-country list, confirmed 2026-08-27. The earlier version of
   this file carried 19, taken from a screenshot that was cut off at
   Switzerland, which excluded the Gulf, East Asia and most of central and
   southern Europe from the Base44 audience. Reconcile re-derives this tag
   every run, so widening the list here is enough: the newly-eligible
   contacts appear on the boards on the next pass without a backfill. */
const ELIGIBLE_COUNTRIES = new Set([
  'US/CA', 'UK', 'AU', 'NZ',
  'AT', 'BE', 'FR', 'DE', 'IE', 'LU', 'NL', 'CH',
  'DK', 'FI', 'IS', 'NO', 'SE',
  'IT', 'ES', 'PT', 'GR', 'MT', 'CY',
  'PL', 'CZ', 'SI', 'EE', 'LT', 'LV', 'SK', 'HR', 'HU', 'RO',
  'JP', 'KR', 'SG', 'TW', 'HK', 'MO',
  'AE', 'QA', 'IL', 'KW', 'SA', 'OM', 'BH',
])

/**
 * Country from a phone number, or null when the number cannot be trusted
 * to carry one. A local-format number with no + prefix could be anywhere,
 * and guessing at it would put people in the wrong bucket silently.
 */
function countryFromPhone(raw) {
  const s = String(raw || '')
  const d = s.replace(/\D/g, '')
  if (!d) return null
  if (!s.trim().startsWith('+') && d.length < 11) return null
  for (const len of [3, 2, 1]) { const p = d.slice(0, len); if (DIAL[p]) return DIAL[p] }
  return null
}

function isIndian(phone, country) {
  if (String(country || '').toUpperCase() === 'IN') return true
  return String(phone || '').replace(/\D/g, '').startsWith('91')
}

/**
 * Should this contact carry base44-eligible?
 * @param {{phone?:string, country?:string}} contact
 */
const ISO_ELIGIBLE = new Set([
  'US', 'CA', 'GB', 'UK', 'AU', 'NZ',
  'AT', 'BE', 'FR', 'DE', 'IE', 'LU', 'NL', 'CH',
  'DK', 'FI', 'IS', 'NO', 'SE',
  'IT', 'ES', 'PT', 'GR', 'MT', 'CY',
  'PL', 'CZ', 'SI', 'EE', 'LT', 'LV', 'SK', 'HR', 'HU', 'RO',
  'JP', 'KR', 'SG', 'TW', 'HK', 'MO',
  'AE', 'QA', 'IL', 'KW', 'SA', 'OM', 'BH',
])

/* AE IS NOT A COUNTRY HERE, IT IS A DEFAULT.
   13,285 contacts in this location carry country AE. Of the 8,717 that
   also have a phone, 4,089 dial US/Canada, 1,225 the UK, 603 Germany,
   549 Australia. They are not Emirati; GHL stamped its default on
   contacts that arrived without a country. Reading that field as
   evidence would have cut 13,285 mostly American and British people out
   of the Base44 audience.

   So the phone wins whenever it parses, and the country field is only a
   fallback for contacts that have no usable number. The asymmetry
   settles it: including a genuine UAE contact costs one wasted email,
   excluding four thousand Americans costs the audience. */
const DEFAULTED_COUNTRY = new Set(['AE'])

function isBase44Eligible(contact) {
  const phone = (contact && contact.phone) || ''
  const country = String((contact && contact.country) || '').trim().toUpperCase()
  if (isIndian(phone, country)) return false

  /* The dialling code is what the person typed. Trust it first. */
  const cc = countryFromPhone(phone)
  if (cc) return ELIGIBLE_COUNTRIES.has(cc)

  /* No usable number. A stated country is better than nothing, unless it
     is the value GHL fills in when it was never told one. */
  if (/^[A-Z]{2}$/.test(country) && !DEFAULTED_COUNTRY.has(country)) {
    return ISO_ELIGIBLE.has(country)
  }
  return true                       // genuinely unknown: include, and filter later
}

/**
 * The derived, add-only tags any contact should carry from location alone.
 *
 * Both of these were written once by a backfill script and by nothing
 * else, so every contact arriving afterwards silently missed them: no
 * Base44 card, and no India suppression. Location tags have to be
 * evaluated wherever a contact is touched, which is here.
 *
 * ADD-ONLY, both of them. A withdrawn eligible tag pulls a card off a
 * board and takes a setter's column with it, and a withdrawn suppression
 * tag starts emailing someone you decided not to email. Neither is worth
 * the tidiness of removing a stale tag.
 */
function locationTags(contact) {
  const t = []
  const phone = (contact && contact.phone) || ''
  const country = (contact && contact.country) || ''
  if (isIndian(phone, country)) t.push('do-not-email-india')
  else if (isBase44Eligible(contact)) t.push('base44-eligible')
  return t
}

module.exports = { isBase44Eligible, locationTags, countryFromPhone, isIndian, DIAL, ELIGIBLE_COUNTRIES }
