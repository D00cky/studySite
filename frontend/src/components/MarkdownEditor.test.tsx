import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
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
