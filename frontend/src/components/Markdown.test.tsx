import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('renderiza títulos, blocos de código e listas de tarefas', () => {
    const { container } = render(<Markdown text={'## Achados\n\n```c\nint x = 1;\n```\n\n- [x] compilou\n- [ ] linkou'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Achados' })).toBeInTheDocument()
    expect(container.querySelector('pre > code')).toHaveTextContent('int x = 1;')
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
  })

  it('abre links em nova aba e remove links perigosos', () => {
    render(<Markdown text={'[ok](https://example.test) e [mau](javascript:alert(1))'} />)
    expect(screen.getByRole('link', { name: 'ok' })).toHaveAttribute('target', '_blank')
    expect(screen.queryByRole('link', { name: 'mau' })?.getAttribute('href') ?? '').not.toMatch(/javascript/i)
  })

  it('nunca interpreta HTML do texto', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)>'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})

describe('blocos de código', () => {
  it('colore a sintaxe conforme a linguagem do bloco', () => {
    const { container } = render(<Markdown text={'```c\nint main(void) { return 0; }\n```'} />)
    const code = container.querySelector('pre > code')!
    expect(code).toHaveClass('hljs')
    expect(code.querySelector('.hljs-keyword, .hljs-type')).not.toBeNull()
  })

  it('tem um botão para copiar o código', async () => {
    const user = userEvent.setup()
    render(<Markdown text={'```bash\ngcc -c hello.c\n```'} />)
    await user.click(screen.getByRole('button', { name: 'Copiar código' }))
    expect(await navigator.clipboard.readText()).toBe('gcc -c hello.c')
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument()
  })

  it('mostra a linguagem do bloco na barra acima do código', () => {
    render(<Markdown text={'```bash\nls -l\n```'} />)
    expect(screen.getByText('bash', { selector: '.code-lang' })).toBeInTheDocument()
  })
})
