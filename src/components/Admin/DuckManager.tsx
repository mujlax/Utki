import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { User } from '../../lib/types'

interface DuckManagerProps {
  users: User[]
  onAdd: (payload: { userId: string; amount: number; note: string }) => void
  isSaving: boolean
  onSuccess?: () => void
}

export const DuckManager = ({ users, onAdd, isSaving, onSuccess }: DuckManagerProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const wasSavingRef = useRef(false)

  useEffect(() => {
    // Отслеживаем переход от сохранения к завершению
    if (wasSavingRef.current && !isSaving && onSuccess) {
      // Очищаем форму после успешного сохранения
      setSelectedUser(null)
      setAmount('')
      setNote('')
      onSuccess()
    }
    wasSavingRef.current = isSaving
  }, [isSaving, onSuccess])

  const userOptions = useMemo(
    () => users.map((u) => ({ label: `${u.name} (${u.userId})`, value: u.userId, user: u })),
    [users],
  )

  const canSubmit = selectedUser && note.trim() && Number.isFinite(Number(amount))

  const handleSubmit = () => {
    if (!selectedUser) return
    const parsed = Number(amount)
    if (!Number.isFinite(parsed)) return
    onAdd({ userId: selectedUser.userId, amount: parsed, note: note.trim() })
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Управление уточками</Typography>
          <Autocomplete
            options={userOptions}
            onChange={(_e, option) => setSelectedUser(option?.user ?? null)}
            renderInput={(params) => <TextField {...params} label="Пользователь" />}
          />
          <Box display="flex" gap={2}>
            <TextField
              label="Количество"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Примечание"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ flex: 2 }}
            />
          </Box>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            Добавить уточки
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}


