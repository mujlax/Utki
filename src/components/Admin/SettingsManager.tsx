import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import type { WheelSetting, WheelLevelKey } from '../../lib/types'

interface SettingsManagerProps {
  settings: WheelSetting[]
  onSave: (setting: WheelSetting) => void
  isSaving: boolean
}

const bonusOptions = [
  { value: '', label: 'Нет' },
  { value: 'freeSpin', label: 'Бесплатная крутка' },
  { value: '+luck', label: '+к удаче' },
]

export const SettingsManager = ({ settings, onSave, isSaving }: SettingsManagerProps) => {
  const [editable, setEditable] = useState<Record<WheelLevelKey, WheelSetting>>(
    {} as Record<WheelLevelKey, WheelSetting>,
  )

  useEffect(() => {
    const mapped = settings.reduce<Record<WheelLevelKey, WheelSetting>>((acc, setting) => {
      acc[setting.level] = { ...setting }
      return acc
    }, {} as Record<WheelLevelKey, WheelSetting>)
    setEditable(mapped)
  }, [settings])

  const handleFieldChange = (
    level: WheelLevelKey,
    field: keyof WheelSetting,
    value: number | string,
  ) => {
    setEditable((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]:
          field === 'seriesBonusType'
            ? (value === '' ? undefined : value)
            : typeof prev[level][field] === 'number'
            ? Number(value)
            : value,
      },
    }))
  }

  const handleSave = (level: WheelLevelKey) => {
    const setting = editable[level]
    if (!setting) return
    onSave(setting)
  }

  const rows = useMemo(() => Object.values(editable), [editable])

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h6">Настройки уровней колеса</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Уровень</TableCell>
                  <TableCell>Стоимость</TableCell>
                  <TableCell>Шаг удачи</TableCell>
                  <TableCell>Максимум удачи</TableCell>
                  <TableCell>Бонус серии</TableCell>
                  <TableCell>Тип бонуса</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((setting) => (
                  <TableRow key={setting.level} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{setting.level}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={setting.spinCost}
                        size="small"
                        type="number"
                        onChange={(event) =>
                          handleFieldChange(setting.level, 'spinCost', event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={setting.pityStep}
                        size="small"
                        type="number"
                        onChange={(event) =>
                          handleFieldChange(setting.level, 'pityStep', event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={setting.pityMax}
                        size="small"
                        type="number"
                        onChange={(event) =>
                          handleFieldChange(setting.level, 'pityMax', event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={setting.seriesBonusEvery}
                        size="small"
                        type="number"
                        onChange={(event) =>
                          handleFieldChange(
                            setting.level,
                            'seriesBonusEvery',
                            event.target.value,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={setting.seriesBonusType ?? ''}
                        size="small"
                        onChange={(event) =>
                          handleFieldChange(
                            setting.level,
                            'seriesBonusType',
                            event.target.value,
                          )
                        }
                      >
                        {bonusOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSave(setting.level)}
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
