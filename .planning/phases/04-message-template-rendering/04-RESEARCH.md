# Phase 4: Message Template Rendering - Research

**Researched:** 2026-03-30
**Domain:** String template rendering, Node.js file I/O, pipeline stage pattern
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMPL-01 | Bot substitui variáveis (`{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}`) no template de mensagem fixo | Regex global replace com fallback para null/undefined — implementável em stdlib pura Node.js 24; nenhuma biblioteca externa necessária |
</phase_requirements>

---

## Summary

Esta fase é a mais simples do projeto em termos de dependências externas: zero. A substituição de variáveis `{{chave}}` em um texto plano é resolvida inteiramente com `String.prototype.replace` e uma expressão regular global. O arquivo de template vive em `templates/outreach.txt` (texto puro, editável sem JavaScript), lido uma vez com `fs.readFileSync` e processado por uma função pura `renderTemplate(template, vars)`.

O projeto já estabeleceu todos os padrões relevantes: módulo utilitário em `src/utils/`, função pura recebendo e retornando valor, stage de pipeline em `src/stages/`, testes em `node:test` + `node:assert/strict`. A fase 4 segue exatamente os mesmos padrões sem introduzir nenhuma convenção nova.

O único ponto de atenção é o tratamento de placeholders cujo valor no prospect é `null` ou `undefined`: o campo `rating` de prospects retornados pela Places API pode ser `null` (negócios sem avaliações). O comportamento correto é substituir por uma string vazia ou `"N/A"` — nunca deixar `{{rating}}` literal no texto final, nunca lançar exceção.

**Recomendação principal:** Implementar `renderTemplate(template, vars)` como função pura em `src/utils/template.js`, com fallback `String(val ?? '')` para cada variável. O stage `src/stages/render.js` lê o arquivo e delega à função pura. Testes cobrem tanto o caso feliz quanto os campos nulos.

---

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que usar |
|------------|--------|-----------|--------------|
| `node:fs` | built-in (Node 24) | `readFileSync` para carregar o template | Sem dependência externa; já em uso no projeto |
| `node:path` | built-in | Construção de caminho portável para `templates/outreach.txt` | Garante separadores corretos independente do SO |
| `node:test` | built-in | Framework de testes | Padrão já estabelecido nas fases 1–3 |
| `node:assert/strict` | built-in | Asserções | Padrão já estabelecido nas fases 1–3 |

### Sem dependências externas

Nenhum pacote npm novo. Mustache, Handlebars, EJS e similares são overkill para substituição simples de 4 variáveis em uma string. Regex + replace resolvem o problema sem introduzir dependências.

### Alternativas Consideradas

| Ao invés de | Poderia usar | Trade-off |
|-------------|-------------|-----------|
| Regex + `String.replace` | Handlebars / Mustache | Template engines trazem parciais, loops, condicionais — nenhum desses recursos está no escopo de v1; dependência desnecessária |
| `String.replace` com regex global | `split(placeholder).join(value)` | Ambos funcionam; regex é mais idiomático e trata múltiplas ocorrências do mesmo placeholder |
| Fallback `val ?? ''` | Lançar erro para campos ausentes | Lançar erro quebraria o pipeline inteiro para um campo opcional como `rating`; fallback é mais resiliente |
| `readFileSync` síncrono | `fs.readFile` assíncrono | CLI sequencial não se beneficia de I/O assíncrono aqui; síncrono é mais simples e consistente com `history.js` |

**Instalação:** Nenhuma. Apenas Node.js 24+ (já disponível: v24.13.1).

---

## Architecture Patterns

### Estrutura de Arquivos desta Fase

```
templates/
└── outreach.txt            # Template editável por não-desenvolvedor

src/
├── utils/
│   └── template.js         # renderTemplate(template, vars) — função pura
└── stages/
    └── render.js           # Stage do pipeline: lê arquivo + chama renderTemplate

tests/unit/
└── template.test.js        # Testes de renderTemplate (e opcionalmente render.js)
```

### Pattern 1: Função pura `renderTemplate`

**O que é:** Recebe o conteúdo do template como string e um objeto de variáveis, retorna a string com todos os placeholders substituídos. Não faz I/O. Idêntico ao padrão de `filterBusinesses` e `dedupProspects`: recebe input, retorna output, sem efeitos colaterais.

**Quando usar:** Toda transformação de dado no pipeline é implementada como função pura testável isoladamente.

**Exemplo:**

```javascript
// src/utils/template.js
export function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key]
    return val != null ? String(val) : ''
  })
}
```

Comportamento verificado:
- `{{nome}}` com `vars.nome = "Padaria Central"` → `"Padaria Central"`
- `{{rating}}` com `vars.rating = null` → `""` (string vazia, sem crash)
- `{{rating}}` com `vars.rating = undefined` → `""` (string vazia, sem crash)
- Placeholder desconhecido `{{xyz}}` sem chave correspondente → `""` (não deixa literal)
- Múltiplas ocorrências do mesmo placeholder → todas substituídas (flag `g`)

### Pattern 2: Stage `render.js` como wrapper de I/O

**O que é:** `stages/render.js` lê `templates/outreach.txt` uma vez e aplica `renderTemplate`. Separa o I/O (leitura de arquivo) da lógica pura (substituição), tornando a lógica testável sem mock de filesystem.

**Quando usar:** Sempre que um stage precisar de I/O + transformação — separar em módulo utilitário puro + wrapper de stage.

**Exemplo:**

```javascript
// src/stages/render.js
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTemplate } from '../utils/template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = join(__dirname, '..', '..', 'templates', 'outreach.txt')

export function renderMessage(prospect) {
  const template = readFileSync(TEMPLATE_PATH, 'utf8')
  return renderTemplate(template, {
    nome:      prospect.name      ?? '',
    rating:    prospect.rating    ?? '',
    categoria: prospect.categoria ?? '',
    cidade:    prospect.cidade    ?? ''
  })
}
```

### Pattern 3: Template `outreach.txt` com sintaxe `{{variavel}}`

**O que é:** Arquivo texto puro editável, sem lógica. Placeholders seguem a sintaxe `{{variavel}}` com chaves duplas.

**Exemplo de conteúdo:**

```
Olá, {{nome}}!

Vi que o {{categoria}} de vocês ainda não tem site próprio.
Nosso time pode criar um site profissional para vocês em até 5 dias.

{{nome}} tem avaliação {{rating}} no Google — um site ajudaria a atrair ainda mais clientes em {{cidade}}.

Posso te mandar mais detalhes?
```

### Anti-Patterns a Evitar

- **Substituição sequencial com `replace` simples (sem flag `g`):** `template.replace('{{nome}}', val)` substitui apenas a primeira ocorrência. Usar regex com `/\{\{nome\}\}/g` ou uma regex dinâmica com flag `g`.
- **`eval` ou `new Function` para interpolação:** Overengineering perigoso para strings controladas.
- **Lançar exceção para campo `null`:** `String(null)` produz `"null"` — sempre usar `val ?? ''` explicitamente.
- **Re-ler o arquivo em cada prospect:** Carregar `outreach.txt` uma vez por pipeline run (ou por chamada a `renderMessage`), não uma vez por prospect em um loop crítico — embora para o volume de v1 (~20 prospects) a diferença seja desprezível.
- **Usar template engine externa:** Handlebars/Mustache resolvem problemas que este projeto não tem (parciais, helpers, loops). Zero benefício para 4 variáveis.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Template engine completa | Parser de `{{}}` + escaping + condicionais | `String.replace` com regex | 4 variáveis simples não justificam dependência externa |
| Parsing de arquivo de config | YAML/JSON parser customizado | `.txt` puro + `readFileSync` | Não-desenvolvedor edita `.txt`; nenhum parser necessário |

**Insight chave:** A complexidade desta fase está no tratamento de null/undefined nos campos do prospect, não no mecanismo de substituição. O regex com fallback `val ?? ''` resolve ambos em uma linha.

---

## Common Pitfalls

### Pitfall 1: `String(null)` produz `"null"` literal

**O que dá errado:** `String(null)` retorna a string `"null"`, não string vazia. Se `vars.rating` for `null` e o código usar `String(vars[key])` sem verificação de null, a mensagem enviada conterá a palavra `"null"`.

**Por que acontece:** `String()` é uma conversão de tipo, não uma operação de fallback.

**Como evitar:** Sempre usar `val != null ? String(val) : ''` ou `String(val ?? '')`.

**Sinais de alerta:** Mensagem renderizada contém a palavra `"null"` ou `"undefined"`.

### Pitfall 2: Placeholder não substituído (regex sem flag `g`)

**O que dá errado:** `template.replace('{{nome}}', 'Padaria')` substitui apenas a primeira ocorrência. Se o template usar `{{nome}}` duas vezes, a segunda permanece como `{{nome}}` literal.

**Por que acontece:** `String.replace` com string como primeiro argumento substitui apenas a primeira ocorrência.

**Como evitar:** Usar regex com flag global: `/\{\{(\w+)\}\}/g` — substitui todas as ocorrências em uma única passagem, independentemente de quantas vezes cada variável aparece.

**Sinais de alerta:** Segundo `{{nome}}` no template permanece literal após renderização.

### Pitfall 3: Caminho do template quebrado dependendo do cwd

**O que dá errado:** `readFileSync('./templates/outreach.txt')` funciona quando rodado do raiz do projeto mas falha quando o cwd é diferente.

**Por que acontece:** Caminho relativo é resolvido em relação ao cwd do processo, não ao arquivo fonte.

**Como evitar:** Usar `import.meta.url` para construir o caminho absoluto: `join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates', 'outreach.txt')`.

**Sinais de alerta:** `ENOENT: no such file or directory, open './templates/outreach.txt'` ao rodar os testes de fora do raiz do projeto.

### Pitfall 4: Prospect shape não tem `categoria` e `cidade` no formato atual

**O que dá errado:** O prospect retornado por `fetchProspects` (de `src/stages/fetch.js`) contém `name`, `rating`, `phone`, `website`, `email` — mas **não** `categoria` nem `cidade`. O CLI recebe `--category` e `--city` como argumentos separados.

**Por que acontece:** `fetchProspects` foi projetado para retornar apenas os campos do Google Places. `categoria` e `cidade` são parâmetros de busca, não atributos do negócio.

**Como evitar:** O stage `render.js` precisa receber não apenas o prospect mas também os parâmetros `{ cidade, categoria }` da busca atual. Duas abordagens viáveis:
1. `renderMessage(prospect, { cidade, categoria })` — parâmetros explícitos
2. `renderMessage({ ...prospect, cidade, categoria })` — prospect enriquecido antes da renderização

A opção 1 é mais explícita sobre separação de responsabilidades. A opção 2 é mais simples de passar pelo pipeline. O planner deve decidir qual adotar — ambas são válidas.

**Sinais de alerta:** `{{categoria}}` ou `{{cidade}}` permanecem literais na mensagem renderizada.

---

## Code Examples

Padrões verificados em Node.js 24.13.1 (ambiente do projeto):

### renderTemplate — substituição com fallback para null

```javascript
// src/utils/template.js
// Verificado: regex /\{\{(\w+)\}\}/g captura chaves com letras, dígitos e _
export function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key]
    return val != null ? String(val) : ''
  })
}
```

### Casos de teste cobertos

```javascript
// tests/unit/template.test.js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate } from '../../src/utils/template.js'

describe('renderTemplate', () => {
  it('substitui todas as variáveis', () => {
    const tmpl = 'Olá {{nome}}, categoria {{categoria}} em {{cidade}}, nota {{rating}}'
    const result = renderTemplate(tmpl, {
      nome: 'Padaria Central', categoria: 'padaria', cidade: 'São Paulo', rating: '4.2'
    })
    assert.ok(result.includes('Padaria Central'))
    assert.ok(result.includes('padaria'))
    assert.ok(result.includes('São Paulo'))
    assert.ok(result.includes('4.2'))
    assert.ok(!result.includes('{{'))
  })

  it('substitui rating null por string vazia sem crash', () => {
    const result = renderTemplate('nota: {{rating}}', { rating: null })
    assert.equal(result, 'nota: ')
    assert.ok(!result.includes('{{'))
    assert.ok(!result.includes('null'))
  })

  it('substitui rating undefined por string vazia', () => {
    const result = renderTemplate('nota: {{rating}}', {})
    assert.equal(result, 'nota: ')
  })

  it('substitui múltiplas ocorrências do mesmo placeholder', () => {
    const result = renderTemplate('{{nome}} e {{nome}}', { nome: 'A' })
    assert.equal(result, 'A e A')
  })
})
```

### Leitura do arquivo de template com caminho absoluto

```javascript
// src/stages/render.js
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTemplate } from '../utils/template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = join(__dirname, '..', '..', 'templates', 'outreach.txt')

export function renderMessage(prospect, { cidade, categoria }) {
  const template = readFileSync(TEMPLATE_PATH, 'utf8')
  return renderTemplate(template, {
    nome:      prospect.name   ?? '',
    rating:    prospect.rating ?? '',
    categoria: categoria       ?? '',
    cidade:    cidade          ?? ''
  })
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node.js 24.13.1) |
| Config file | none — runner via CLI |
| Quick run command | `node --test tests/unit/template.test.js` |
| Full suite command | `node --test tests/unit/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMPL-01 | renderTemplate substitui `{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}` | unit | `node --test tests/unit/template.test.js` | Wave 0 |
| TMPL-01 | renderTemplate com `rating: null` retorna string sem `{{rating}}` literal e sem crash | unit | `node --test tests/unit/template.test.js` | Wave 0 |
| TMPL-01 | renderTemplate com prospect completo não deixa nenhum `{{` literal na saída | unit | `node --test tests/unit/template.test.js` | Wave 0 |
| TMPL-01 | `templates/outreach.txt` existe e contém os 4 placeholders | smoke (manual ou file existence check) | `node -e "require('fs').readFileSync('templates/outreach.txt','utf8')"` | Wave 0 |

### Sampling Rate

- Por commit de tarefa: `node --test tests/unit/template.test.js`
- Por merge de wave: `node --test tests/unit/*.test.js`
- Phase gate: suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/template.test.js` — cobre TMPL-01 (função pura renderTemplate)
- [ ] `templates/outreach.txt` — template editável com os 4 placeholders
- [ ] `src/utils/template.js` — criado no Plan 02 (não no Wave 0)
- [ ] `src/stages/render.js` — criado no Plan 02 (não no Wave 0)

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Mudança | Impacto |
|-----------------|-----------------|---------|---------|
| Template engines (Handlebars, EJS, Mustache) para qualquer substituição | `String.replace` + regex para 4 variáveis fixas | Template engines eram padrão em projetos Express/Rails — em CLIs simples, stdlib é suficiente | Zero dependências externas |
| Interpolação de string JS com template literals `` `Olá ${nome}` `` | Template em arquivo externo com `{{placeholder}}` | Template literals exigem código para editar a mensagem | Não-desenvolvedor pode editar a mensagem sem tocar em JS |
| `require('fs')` (CJS) | `import { readFileSync } from 'node:fs'` (ESM) | Node.js 12+ | Consistente com `"type": "module"` do projeto |

**Deprecated/outdated:**
- Template literals hardcoded no código JS: funciona mas impede que não-desenvolvedor edite a mensagem sem abrir um editor de código — violaria o critério de sucesso 3 da fase.

---

## Open Questions

1. **Como `categoria` e `cidade` chegam ao stage de renderização**
   - O que sabemos: O shape atual do prospect (`name`, `rating`, `phone`, `website`, `email`) não inclui `categoria` nem `cidade`. Esses valores vêm dos args do CLI (`--city`, `--category`).
   - O que não está claro: Se o pipeline irá enriquecer o prospect com esses campos antes de render.js, ou se render.js recebe os dois como parâmetros separados.
   - Recomendação: Adotar `renderMessage(prospect, { cidade, categoria })` — mantém o prospect imutável e torna explícito que categoria/cidade são contexto de busca, não atributos do negócio. O planner deve fazer a decisão formal.

2. **Fallback para `rating` — string vazia ou `"N/A"`**
   - O que sabemos: O critério de sucesso aceita ambos (`""` ou `"N/A"`).
   - O que não está claro: Qual comunicação é melhor para o destinatário da mensagem se `rating` for null.
   - Recomendação: String vazia é mais limpa — a frase que usa `{{rating}}` no template pode ser escrita de forma que funcione com e sem o valor. O planner/desenvolvedor pode ajustar o template se preferir `"N/A"`.

---

## Sources

### Primary (HIGH confidence)

- Node.js 24.13.1 (verificado em runtime no ambiente do projeto): `node:fs`, `node:path`, `String.replace`, regex `\{\{(\w+)\}\}`
- Código existente do projeto (`src/stages/fetch.js`, `src/utils/filter.js`, `src/stages/dedup.js`, `src/history.js`) — padrões de estrutura, nomenclatura e testes verificados por inspeção direta
- `package.json` do projeto — confirma `"type": "module"`, Node.js >=21, `node --test` como test runner
- Resultado de `node --test tests/unit/*.test.js` — 54 testes passando, suite verde antes desta fase

### Secondary (MEDIUM confidence)

- Nenhuma fonte secundária necessária — toda a tecnologia desta fase é stdlib pura.

### Tertiary (LOW confidence)

- Nenhuma fonte de baixa confiança — a fase não usa nenhuma biblioteca externa.

---

## Metadata

**Breakdown de confiança:**
- Stack padrão: HIGH — apenas stdlib Node.js 24, verificada em runtime; padrões idênticos ao código já existente no projeto
- Arquitetura: HIGH — padrão de função pura + stage wrapper já estabelecido nas fases 2 e 3
- Pitfalls: HIGH — todos derivados de comportamentos verificáveis de `String(null)`, `String.replace` sem flag `g`, e `import.meta.url`; nenhuma especulação

**Data da pesquisa:** 2026-03-30
**Válido até:** 2026-06-30 (stdlib Node.js estável; nenhuma dependência externa)
