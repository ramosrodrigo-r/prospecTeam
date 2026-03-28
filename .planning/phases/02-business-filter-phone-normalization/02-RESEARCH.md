# Phase 2: Business Filter + Phone Normalization - Research

**Researched:** 2026-03-28
**Domain:** Node.js pure functions — URL hostname parsing + Brazilian phone E.164 normalization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Filtro de domínios bloqueados**
- D-01: Lista fixa de domínios bloqueados: `instagram.com` e `linktr.ee` apenas — não estender com outros bio-links nesta fase
- D-02: Match por hostname: qualquer URL cujo hostname termine em `.instagram.com`, `instagram.com`, `.linktr.ee`, ou `linktr.ee` é considerada "sem site real" (inclui subdomínios como `www.instagram.com`, `m.instagram.com`)
- D-03: URLs sem protocolo (ex: `instagram.com/business`) → prefixar `https://` antes de parsear com `new URL()` para extrair hostname

**Tratamento de websites vazios e mal-formatados**
- D-04: `null`, `""` (string vazia) e strings de apenas espaços são tratados como ausência de site — negócio é incluído no output
- D-05: URLs que falham ao parsear (hostname não extraível via `new URL()`) são tratadas como sem site real — negócio é incluído no output (err on the side of contact)

**Localização dos módulos**
- D-06: `src/utils/filter.js` exporta `filterBusinesses(prospects)` — recebe array, retorna array filtrado
- D-07: `src/utils/phone.js` exporta `normalizePhone(raw)` — recebe string, retorna string E.164 ou `null` se falhar

**Integração no pipeline**
- D-08: `filterBusinesses()` é chamado dentro de `stages/fetch.js` em `fetchProspects()`, logo após acumular todos os resultados de paginação — `bin/prospect.js` já recebe apenas os prospects válidos
- D-09: `normalizePhone()` não é chamado em `fetch.js` — é utilitário puro. A Fase 5 (Evolution API) importa e usa `normalizePhone` na hora do envio

**Normalização de telefone brasileiro**
- D-10: Normalizar qualquer DDD válido do Brasil (não apenas SP/11) — formato final: `55` + DDD (2 dígitos) + número (8 ou 9 dígitos)
- D-11: Telefone fixo (8 dígitos após DDD) — formato: `5511XXXXXXXX` (12 dígitos totais)
- D-12: Celular (9 dígitos após DDD) — formato: `5511XXXXXXXXX` (13 dígitos totais)
- D-13: Número sem DDD identificável (apenas 8 ou 9 dígitos) → falha de normalização → `console.warn` com o valor bruto, retornar `null`
- D-14: Variantes de entrada a cobrir (mínimo 10): `+55 (11) 98765-4321`, `+5511987654321`, `(11) 98765-4321`, `11987654321`, `5511987654321`, `11 98765-4321`, `(11)987654321`, `11987654321`, `(11) 3456-7890`, `11 3456-7890`

**Testes (node:test)**
- D-15: Usar `node:test` built-in (padrão do projeto — Phase 1 já estabeleceu)
- D-16: Arquivo de testes: `tests/unit/filter.test.js` e `tests/unit/phone.test.js`
- D-17: Padrão RED → GREEN: criar testes primeiro (podem falhar), depois implementar até passar

### Claude's Discretion
- Regex exata para extração de DDD e dígitos do número
- Lógica de detecção de fixo vs. celular (8 vs. 9 dígitos após DDD)
- Estrutura interna dos testes (agrupamento com `describe`)

### Deferred Ideas (OUT OF SCOPE)
- Lista de domínios configurável (blocked-domains.json) — não necessária agora
- Outros bio-link domains (beacons.ai, bio.link, etc.) — adicionar somente se aparecerem em dados reais
- Normalização de telefone aplicada em `fetch.js` — decidido que fica na Fase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-02 | Bot filtra negócios sem site real (campo ausente ou URL do Instagram) | URL hostname parsing via `new URL()`, blocked-domain list `instagram.com`/`linktr.ee`, null/empty/whitespace detection |
| WA-03 | Bot normaliza números brasileiros para formato E.164 antes de enviar | Digit-stripping regex + length-based DDD detection covers all 10 required variants; `console.warn` + `null` return for failures |
</phase_requirements>

---

## Summary

Phase 2 delivers two pure utility functions and their unit tests. No external libraries are required — both functions use only Node.js built-ins (`node:url` WHATWG API for hostname parsing, native string/regex operations for phone normalization).

The filter logic (`src/utils/filter.js`) reads the `website` field already present in each prospect object, handles null/empty/whitespace as "no real website", uses `new URL()` (prefixing `https://` when the string has no protocol) to extract a hostname, and checks whether that hostname is `instagram.com`, `linktr.ee`, or any subdomain of either. Parsing failures are caught with a try/catch and treated as "no real website" per D-05.

The phone normalizer (`src/utils/phone.js`) strips all non-digit characters first (handles `+`, spaces, hyphens, parens), then branches on digit count: 10 or 11 digits = DDD present, prepend `55`; 12 or 13 digits starting with `55` = already complete; anything else = log with `console.warn` and return `null`. This approach was verified live against all 10 required input variants and produces the correct `55DDXXXXXXXXX` output.

**Primary recommendation:** Implement both functions as pure ESM modules with no dependencies. Use digit-length branching for phone normalization and WHATWG `URL` for hostname extraction. Write tests first (RED) using `node:test` + `node:assert/strict`, consistent with Phase 1 pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:url` (WHATWG URL) | Node.js >=21 (built-in) | Parse URL strings, extract hostname | Zero-dep, spec-compliant, handles Unicode/Punycode automatically |
| `node:test` | Node.js >=21 (built-in) | Unit test runner | Project standard established in Phase 1 |
| `node:assert/strict` | Node.js >=21 (built-in) | Assertions in tests | Project standard established in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No external dependencies | — | — | Both functions are pure logic over primitives |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WHATWG `new URL()` | `url.parse()` (legacy) | Legacy API is deprecated; WHATWG API is the current standard and available in Node.js 21 |
| Digit-length branching | `libphonenumber-js` | Library adds ~300 KB bundle; digit-length approach is sufficient for Brazilian numbers and requires zero dependencies |

**Installation:** No additional packages required.

---

## Architecture Patterns

### Recommended Project Structure (additions for Phase 2)
```
src/
├── utils/
│   ├── env.js           # existing — env validation pattern reference
│   ├── filter.js        # NEW — filterBusinesses(prospects)
│   └── phone.js         # NEW — normalizePhone(raw)
├── stages/
│   └── fetch.js         # MODIFIED — imports and calls filterBusinesses()
tests/
└── unit/
    ├── fetch.test.js    # existing — test pattern reference
    ├── filter.test.js   # NEW
    └── phone.test.js    # NEW
```

### Pattern 1: URL Hostname Extraction with Protocol-Prefixing

**What:** Extract hostname from any website string, including protocol-less variants like `instagram.com/business`. Wrap `new URL()` in try/catch; treat failures as "no site".

**When to use:** Any time a `website` field from Google Places must be classified.

**Example:**
```javascript
// Source: verified against Node.js v24 (matches docs at nodejs.org/api/url.html)
const BLOCKED = ['instagram.com', 'linktr.ee']

function hasRealWebsite(website) {
  if (!website || !website.trim()) return false

  let href = website.trim()
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    href = 'https://' + href
  }

  let hostname
  try {
    hostname = new URL(href).hostname  // throws TypeError for invalid URLs
  } catch {
    return false  // D-05: parse failure → treat as no site
  }

  const isBlocked = BLOCKED.some(d => hostname === d || hostname.endsWith('.' + d))
  return !isBlocked
}
```

### Pattern 2: Brazilian Phone Normalization via Digit-Length Branching

**What:** Strip all non-digit characters, then branch on digit count to determine whether DDD and country code are already present.

**When to use:** Any raw phone string from Google Places `nationalPhoneNumber` field.

**Example:**
```javascript
// Source: verified live against Node.js v24, all 10 D-14 variants pass
export function normalizePhone(raw) {
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')

  // 13 digits: 55 + DDD(2) + mobile(9) — already complete
  // 12 digits: 55 + DDD(2) + landline(8) — already complete
  if (
    (digits.length === 13 || digits.length === 12) &&
    digits.startsWith('55')
  ) {
    return digits
  }

  // 11 digits: DDD(2) + mobile(9) — prepend 55
  // 10 digits: DDD(2) + landline(8) — prepend 55
  if (digits.length === 11 || digits.length === 10) {
    return '55' + digits
  }

  // Anything else: can't identify DDD
  console.warn(`[phone] normalizePhone: unrecognized format, skipping — raw="${raw}"`)
  return null
}
```

### Pattern 3: filterBusinesses Integration Point in fetch.js

**What:** Call `filterBusinesses(results)` at the end of `fetchProspects()`, after the pagination loop completes, before returning.

**When to use:** D-08 specifies this exact integration point.

**Example:**
```javascript
// In src/stages/fetch.js — modification to existing fetchProspects()
import { filterBusinesses } from '../utils/filter.js'

// ... existing pagination loop accumulates results ...

return filterBusinesses(results)  // replaces bare `return results`
```

### Anti-Patterns to Avoid

- **Parsing URLs without protocol-prefixing:** `new URL('instagram.com/foo')` throws `TypeError`. Always check for `http`/`https` prefix and add `https://` if absent.
- **Using `url.parse()` (legacy Node.js API):** This API is deprecated and does not follow the WHATWG URL standard. Use `new URL()`.
- **Throwing on normalization failure:** Per D-13 and requirement WA-03, `normalizePhone` must log and return `null`, not throw. Throwing would crash the pipeline (violates OPS-02 in v2).
- **Applying `normalizePhone` in `fetch.js`:** Locked out by D-09. The normalizer is wired only in Phase 5.
- **Using `.includes()` for domain matching:** `'instagram.com'.includes('instagram.com')` would also match `notinstagram.com`. Always use `hostname === d || hostname.endsWith('.' + d)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing | Custom regex to extract hostname | `new URL()` built-in | Handles protocol, Punycode, IPv6, percent-encoding edge cases |
| Phone digit extraction | Custom character-by-character loop | `raw.replace(/\D/g, '')` | One-liner, handles all separators (`+`, space, `-`, `(`, `)`) |
| Test assertions | Custom `if/throw` checks | `node:assert/strict` | Provides `deepEqual`, `equal`, `throws`, proper diff output |

**Key insight:** Both functions require only string manipulation over well-known inputs. Adding any external package (`libphonenumber-js`, `phone`, `validator`) would violate the project's minimal-dependency philosophy for zero gain.

---

## Common Pitfalls

### Pitfall 1: `new URL()` Throws on Protocol-Less Strings

**What goes wrong:** `new URL('instagram.com/business')` throws `TypeError: Invalid URL` at runtime — it does NOT silently return a partial result.

**Why it happens:** The WHATWG URL spec requires an absolute URL (with scheme) when no base is provided. A string like `instagram.com/business` is treated as a relative path reference, not a hostname.

**How to avoid:** Always check `href.startsWith('http://') || href.startsWith('https://')` before calling `new URL()`. Prepend `https://` if absent. Wrap the entire call in try/catch regardless.

**Warning signs:** `TypeError: Invalid URL` in test output or runtime stack traces from `filter.js`.

### Pitfall 2: Subdomain Matching — `endsWith` vs. `includes`

**What goes wrong:** `hostname.includes('instagram.com')` matches `notinstagram.com` as blocked. `hostname === 'instagram.com'` misses `www.instagram.com`.

**Why it happens:** Simple string equality or `includes` don't account for the subdomain boundary.

**How to avoid:** Use `hostname === d || hostname.endsWith('.' + d)`. This catches `www.instagram.com`, `m.instagram.com`, `business.instagram.com`, etc., while rejecting `notinstagram.com`.

**Warning signs:** A business with `www.instagram.com/page` passes the filter (false negative), or a business with `notinstagram.com` is incorrectly blocked (false positive).

### Pitfall 3: Phone Digit Count Off-by-One (the `+55` prefix in raw input)

**What goes wrong:** `'+5511987654321'.replace(/\D/g, '')` produces `5511987654321` (13 digits). Without careful branching, this could be incorrectly handled as needing `55` prepended, producing `555511987654321` (15 digits).

**Why it happens:** The `+` is stripped by `\D`, leaving country code digits intact. You must check both digit count AND whether `55` is already the prefix.

**How to avoid:** The correct check is `(digits.length === 13 || digits.length === 12) && digits.startsWith('55')` — only treat as complete if the prefix is already `55`.

**Warning signs:** Output like `555511XXXXXXXXX` (15 digits) in test assertions.

### Pitfall 4: `filterBusinesses` Mutating the Input Array

**What goes wrong:** Using `Array.splice()` or `delete` on the input array modifies the caller's reference, creating subtle bugs in tests and downstream stages.

**Why it happens:** JavaScript arrays are passed by reference.

**How to avoid:** Always use `Array.filter()` which returns a new array. `return prospects.filter(p => !hasRealWebsite(p.website))` — no mutation.

### Pitfall 5: Test Script Glob Ordering

**What goes wrong:** `node --test tests/unit/*.test.js` may not include new test files if they don't match the glob order or if the glob is cached.

**Why it happens:** The shell expands `*.test.js` at invocation time. New files added mid-session are picked up on next run.

**How to avoid:** No special action needed — this is expected shell behavior. Confirm the new test files are present before running the test suite. The project's `npm test` command uses this exact glob.

---

## Code Examples

Verified patterns from official sources:

### Hostname Extraction with Error Handling

```javascript
// Source: verified against Node.js v24 (nodejs.org/api/url.html)
function getHostname(website) {
  if (!website || !website.trim()) return null

  let href = website.trim()
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    href = 'https://' + href
  }

  try {
    return new URL(href).hostname
  } catch {
    return null
  }
}
```

### Blocked Domain Check

```javascript
// Source: verified live — handles www./m./any subdomain correctly
const BLOCKED_DOMAINS = ['instagram.com', 'linktr.ee']

function isBlockedDomain(hostname) {
  return BLOCKED_DOMAINS.some(
    d => hostname === d || hostname.endsWith('.' + d)
  )
}
```

### filterBusinesses Pure Function

```javascript
// Source: D-06, follows env.js module style (src/utils/env.js)
export function filterBusinesses(prospects) {
  return prospects.filter(prospect => !hasRealWebsite(prospect.website))
}
```

### node:test Structure (matches existing fetch.test.js pattern)

```javascript
// Source: tests/unit/fetch.test.js — established project pattern
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterBusinesses } from '../../src/utils/filter.js'

describe('filterBusinesses', () => {
  it('includes business with null website', () => {
    const result = filterBusinesses([{ website: null }])
    assert.equal(result.length, 1)
  })

  it('excludes business with real website', () => {
    const result = filterBusinesses([{ website: 'https://minhapadaria.com.br' }])
    assert.equal(result.length, 0)
  })
})
```

### console.warn Logging Pattern (matches project style)

```javascript
// Source: CONTEXT.md established patterns — consistent with fetch.js error handling
console.warn(`[phone] normalizePhone: unrecognized format, skipping — raw="${raw}"`)
return null
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `url.parse()` (Node.js legacy) | `new URL()` (WHATWG) | Node.js 10+ | Legacy API is deprecated; WHATWG is the browser-compatible standard |
| `node-phone` / `libphonenumber-js` for normalization | Digit-length branching (zero-dep) | N/A — project constraint | Sufficient for Brazilian numbers; no dependency overhead |

**Deprecated/outdated:**
- `require('url').parse()`: Deprecated since Node.js 11.0.0. Returns different object shape than WHATWG. Do not use.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node.js >= 21) |
| Config file | None — invoked directly via `node --test` |
| Quick run command | `node --test tests/unit/filter.test.js tests/unit/phone.test.js` |
| Full suite command | `npm test` (expands to `node --test tests/unit/*.test.js`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-02 | `null` website → business included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | `""` website → business included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | whitespace-only website → business included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | `instagram.com/business` (no protocol) → included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | `https://www.instagram.com/business` → included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | `https://linktr.ee/business` → included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | `https://minhapadaria.com.br` → excluded | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| SRCH-02 | parse-failing URL → included | unit | `node --test tests/unit/filter.test.js` | Wave 0 |
| WA-03 | 10 D-14 variants → correct `55DDXXXXXXXXX` output | unit | `node --test tests/unit/phone.test.js` | Wave 0 |
| WA-03 | 8/9-digit number (no DDD) → `null` + console.warn | unit | `node --test tests/unit/phone.test.js` | Wave 0 |
| WA-03 | `null` input → `null` output (no crash) | unit | `node --test tests/unit/phone.test.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/unit/filter.test.js tests/unit/phone.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/filter.test.js` — covers SRCH-02 (all 8 filter behaviors above)
- [ ] `tests/unit/phone.test.js` — covers WA-03 (all 11 phone behaviors above)

*(No framework install needed — `node:test` is built into Node.js 21+)*

---

## Open Questions

1. **DDD validation depth**
   - What we know: D-10 says "any valid Brazilian DDD". There are 67 valid DDDs in Brazil (11–99, not all assigned).
   - What's unclear: Should invalid DDDs (e.g., `55`, `00`) be rejected?
   - Recommendation: Do not validate DDD range in Phase 2. Digit-length branching is sufficient; Evolution API will surface invalid numbers at send time (Phase 5). Keeping the check simple avoids false rejections.

2. **`fetch.js` test suite after D-08 integration**
   - What we know: `filterBusinesses` will be called inside `fetchProspects()`. Existing `fetch.test.js` tests use `websiteUri: 'https://padaria.com'` which would now be filtered out.
   - What's unclear: Should existing `fetch.test.js` tests be updated to expect filtered output?
   - Recommendation: Yes — the test for "returns mapped prospects from a single-page response" currently asserts a business WITH a real website is returned. After D-08 integration, that same business would be filtered out. Update the mock in that test to use `websiteUri: null` (or an Instagram URL) so it still appears in results. Document this in the plan as a required fetch.test.js update.

---

## Sources

### Primary (HIGH confidence)
- Node.js v24 official docs (`nodejs.org/api/url.html`) — URL constructor behavior, TypeError on invalid input, hostname extraction
- Live Node.js v24.13.1 execution — verified all 10 D-14 phone variants and all 8 filter URL cases produce correct output

### Secondary (MEDIUM confidence)
- Node.js `node:test` official docs (`nodejs.org/api/test.html`) — confirmed `describe`/`it`/`assert` API stable in Node.js 21+

### Tertiary (LOW confidence)
- GitHub Gist: Brazilian phone regex patterns (gist.github.com/imaginamundo) — informed digit-length approach but not used directly; actual implementation derived from first-principles digit counting

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both functions use only Node.js built-ins, verified at runtime
- Architecture: HIGH — integration points are explicitly specified in CONTEXT.md (D-06 through D-09)
- Pitfalls: HIGH — all 5 pitfalls verified via live Node.js execution or direct code inspection
- Test map: HIGH — test commands use same pattern as existing `npm test` script

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (stable built-in APIs; 180 days)
