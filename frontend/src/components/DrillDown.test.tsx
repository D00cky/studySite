import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Kit } from './DrillDown'

describe('kit mínimo', () => {
  it('copia o comando de um item do kit', async () => {
    const user = userEvent.setup()
    render(<Kit items={[{ term: 'git status', use: 'Ver o que mudou.' }, { term: 'git add -p', use: 'Escolher trechos.' }]} />)
    await user.click(screen.getByRole('button', { name: 'Copiar git add -p' }))
    expect(await navigator.clipboard.readText()).toBe('git add -p')
  })
})
