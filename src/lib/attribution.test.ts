import { describe, expect, it } from 'vitest'
import { describeTouch, mergeAttribution, touchFrom } from './attribution'

const NOW = new Date('2026-10-12T13:00:00Z')
const at = (path: string) => new URL(`https://glamourlindoia.com.br${path}`)

describe('origem da visita', () => {
  it('usa as UTMs quando existem', () => {
    const touch = touchFrom(at('/?utm_source=Instagram&utm_medium=bio&utm_campaign=natal'), '', NOW)
    expect(touch).toMatchObject({ source: 'instagram', medium: 'bio', campaign: 'natal', landing: '/?utm_source=Instagram&utm_medium=bio&utm_campaign=natal' })
  })

  it('clique de anúncio do Google vira google / cpc e guarda o gclid', () => {
    const touch = touchFrom(at('/produto/brinco?gclid=abc123'), 'https://www.google.com/', NOW)
    expect(touch).toMatchObject({ source: 'google', medium: 'cpc', ids: { gclid: 'abc123' } })
  })

  it('reconhece Instagram, Facebook, WhatsApp e busca orgânica pelo site de origem', () => {
    expect(touchFrom(at('/'), 'https://l.instagram.com/', NOW)).toMatchObject({ source: 'instagram', medium: 'social' })
    expect(touchFrom(at('/'), 'https://lm.facebook.com/l.php', NOW)).toMatchObject({ source: 'facebook', medium: 'social' })
    expect(touchFrom(at('/'), 'https://web.whatsapp.com/', NOW)).toMatchObject({ source: 'whatsapp' })
    expect(touchFrom(at('/'), 'https://www.google.com.br/', NOW)).toMatchObject({ source: 'google', medium: 'organic' })
    expect(touchFrom(at('/'), 'https://www.lindoiashopping.com.br/lojas/', NOW)).toMatchObject({
      source: 'lindoiashopping.com.br',
      medium: 'referral',
    })
  })

  it('acesso direto ou vindo do próprio site não conta como canal', () => {
    expect(touchFrom(at('/'), '', NOW)).toBeNull()
    expect(touchFrom(at('/categoria/brincos'), 'https://glamourlindoia.com.br/', NOW)).toBeNull()
  })

  it('primeiro canal fica, último é atualizado; sem nada vira "direto"', () => {
    const insta = touchFrom(at('/?utm_source=instagram&utm_medium=bio'), '', NOW)
    const google = touchFrom(at('/'), 'https://www.google.com/', NOW)
    const first = mergeAttribution(null, insta, NOW)
    const second = mergeAttribution(first, google, NOW)
    expect(second?.first.source).toBe('instagram')
    expect(second?.last.source).toBe('google')
    expect(mergeAttribution(second, null, NOW)).toBe(second)
    expect(mergeAttribution(null, null, NOW)?.first.source).toBe('direto')
  })

  it('descreve o canal em uma linha', () => {
    expect(describeTouch({ source: 'instagram', medium: 'bio', campaign: 'natal' })).toBe('instagram / bio · campanha natal')
    expect(describeTouch({ source: 'direto', medium: '(none)' })).toBe('direto')
    expect(describeTouch(null)).toBe('direto')
  })
})
