import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import type { Prize } from '../../lib/types'

interface PrizeManagerProps {
  prizes: Prize[]
  onSave: (prize: Prize) => void
  isSaving: boolean
}

type EditablePrize = Prize & {
  directBuyPriceInput: string
}

export const PrizeManager = ({ prizes, onSave, isSaving }: PrizeManagerProps) => {
  const [editable, setEditable] = useState<Record<string, EditablePrize>>({})

  useEffect(() => {
    const mapped = prizes.reduce<Record<string, EditablePrize>>((acc, prize) => {
      acc[prize.prizeId] = {
        ...prize,
        directBuyPriceInput:
          prize.directBuyPrice !== undefined ? String(prize.directBuyPrice) : '',
        removeAfterWin: Boolean(prize.removeAfterWin),
        removedFromWheel: Boolean(prize.removedFromWheel),
      }
      return acc
    }, {})
    setEditable(mapped)
  }, [prizes])

  const handleFieldChange = (
    prizeId: string,
    field: keyof EditablePrize,
    value: string | number | boolean,
  ) => {
    setEditable((prev) => ({
      ...prev,
      [prizeId]: {
        ...prev[prizeId],
        [field]: value,
      },
    }))
  }

  const handleSave = (prizeId: string) => {
    const record = editable[prizeId]
    if (!record) return
    const directBuyPrice =
      record.directBuyPriceInput.trim() === ''
        ? undefined
        : Number(record.directBuyPriceInput)
    const payload: Prize = {
      prizeId: record.prizeId,
      name: record.name,
      description: record.description,
      rarity: record.rarity,
      baseWeight: Number(record.baseWeight),
      directBuyEnabled: record.directBuyEnabled,
      directBuyPrice,
      active: record.active,
      removeAfterWin: record.removeAfterWin ?? false,
      removedFromWheel: record.removedFromWheel ?? false,
    }
    onSave(payload)
  }

  const rows = useMemo(() => Object.values(editable), [editable])

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Администрирование призов</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Редкость</TableCell>
                  <TableCell>Активен</TableCell>
                  <TableCell>Удалять после выигрыша</TableCell>
                  <TableCell>Удален из колеса</TableCell>
                  <TableCell>Покупка</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((prize) => (
                  <TableRow key={prize.prizeId} hover>
                    <TableCell>
                      <TextField
                        value={prize.name}
                        size="small"
                        onChange={(event) =>
                          handleFieldChange(prize.prizeId, 'name', event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={prize.description}
                        size="small"
                        onChange={(event) =>
                          handleFieldChange(prize.prizeId, 'description', event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={prize.rarity}
                        size="small"
                        InputProps={{ inputProps: { min: 1, max: 4, step: 1 } }}
                        type="number"
                        onChange={(event) =>
                          handleFieldChange(
                            prize.prizeId,
                            'rarity',
                            Number(event.target.value),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prize.active}
                        onChange={(event) =>
                          handleFieldChange(prize.prizeId, 'active', event.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(prize.removeAfterWin)}
                        onChange={(event) =>
                          handleFieldChange(
                            prize.prizeId,
                            'removeAfterWin',
                            event.target.checked,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(prize.removedFromWheel)}
                        onChange={(event) =>
                          handleFieldChange(
                            prize.prizeId,
                            'removedFromWheel',
                            event.target.checked,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prize.directBuyEnabled}
                        onChange={(event) =>
                          handleFieldChange(
                            prize.prizeId,
                            'directBuyEnabled',
                            event.target.checked,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={prize.directBuyPriceInput}
                        size="small"
                        type="number"
                        disabled={!prize.directBuyEnabled}
                        onChange={(event) =>
                          handleFieldChange(
                            prize.prizeId,
                            'directBuyPriceInput',
                            event.target.value,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSave(prize.prizeId)}
                        disabled={isSaving}
                      >
                        Сохранить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
