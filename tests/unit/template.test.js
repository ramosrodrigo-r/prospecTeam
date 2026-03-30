import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate } from '../../src/utils/template.js'

describe('renderTemplate', () => {
  it('substitui todas as 4 variaveis', () => {
    const tmpl = 'Ola {{nome}}, categoria {{categoria}} em {{cidade}}, nota {{rating}}'
    const result = renderTemplate(tmpl, {
      nome: 'Padaria Central', categoria: 'padaria', cidade: 'Sao Paulo', rating: '4.2'
    })
    assert.ok(result.includes('Padaria Central'))
    assert.ok(result.includes('padaria'))
    assert.ok(result.includes('Sao Paulo'))
    assert.ok(result.includes('4.2'))
    assert.ok(!result.includes('{{'))
  })

  it('substitui rating null por string vazia sem crash', () => {
    const result = renderTemplate('nota: {{rating}}', { rating: null })
    assert.equal(result, 'nota: ')
    assert.ok(!result.includes('{{'))
    assert.ok(!result.includes('null'))
  })

  it('substitui chave ausente por string vazia', () => {
    const result = renderTemplate('nota: {{rating}}', {})
    assert.equal(result, 'nota: ')
    assert.ok(!result.includes('{{'))
  })

  it('substitui multiplas ocorrencias do mesmo placeholder', () => {
    const result = renderTemplate('{{nome}} e {{nome}}', { nome: 'A' })
    assert.equal(result, 'A e A')
  })

  it('nenhum placeholder literal quando todos os valores sao null', () => {
    const tmpl = '{{nome}} {{rating}} {{categoria}} {{cidade}}'
    const result = renderTemplate(tmpl, { nome: null, rating: null, categoria: null, cidade: null })
    assert.ok(!result.includes('{{'))
    assert.ok(!result.includes('null'))
    assert.ok(!result.includes('undefined'))
  })
})
