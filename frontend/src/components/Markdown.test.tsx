import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

describe('Markdown leve do conteúdo', () => {
  it('separa parágrafos e renderiza código e negrito', () => {
    const { container } = render(<Markdown text={'Use `gcc -c` aqui.\n\nO **shell** expande.'} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(screen.getByText('gcc -c', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText('shell', { selector: 'strong' })).toBeInTheDocument()
  })

  it('renderiza listas com marcadores e numeradas', () => {
    const { container } = render(<Markdown text={'- um\n- dois\n\n1. primeiro\n2. segundo'} />)
    expect(container.querySelectorAll('ul > li')).toHaveLength(2)
    expect(container.querySelectorAll('ol > li')).toHaveLength(2)
  })

  it('nunca interpreta HTML do texto', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)>'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})
