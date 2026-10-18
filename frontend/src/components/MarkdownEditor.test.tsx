import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TextArea } from './Field'
import { MarkdownEditor } from './MarkdownEditor'

function Harness() {
  const [value, setValue] = useState('')
  return <MarkdownEditor label="Achados" value={value} onChange={setValue} />
}

describe('editor markdown', () => {
  it('escreve em markdown e visualiza o resultado', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByText(/Markdown/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Achados'), '## Resultado{enter}{enter}`gcc -c` gerou o .o')
    await user.click(screen.getByRole('tab', { name: 'Visualizar' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Resultado' })).toBeInTheDocument()
    expect(screen.getByText('gcc -c', { selector: 'code' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Escrever' }))
    expect(screen.getByLabelText('Achados')).toHaveValue('## Resultado\n\n`gcc -c` gerou o .o')
  })
})

describe('janela de editor', () => {
  it('mostra linhas e caracteres numa linha de status que acompanha a digitação', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByText('Ln 1 · 0 caracteres')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Achados'), 'gcc{enter}ld')
    expect(screen.getByText('Ln 2 · 6 caracteres')).toBeInTheDocument()
  })

  it('a área de texto simples também tem a linha de status, sem abas de markdown', async () => {
    const user = userEvent.setup()
    render(<TextArea label="Nota de retomada" />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Nota de retomada'), 'a')
    expect(screen.getByText('Ln 1 · 1 caractere')).toBeInTheDocument()
  })
})
