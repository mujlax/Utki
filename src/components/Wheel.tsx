import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import confetti from 'canvas-confetti'
import { Wheel as RouletteWheel, type WheelDataType } from 'react-custom-roulette'
import type { Prize, Rarity } from '../lib/types'

const rarityAccent: Record<Rarity, string> = {
  1: '#9e9e9e',
  2: '#4caf50',
  3: '#00acc1',
  4: '#ff9800',
}

interface WeightedPrize {
  prize: Prize
  weight: number
}

interface WheelProps {
  weightedPrizes: WeightedPrize[]
  targetPrizeId?: string
  revealedPrize?: Prize
  revealedRarity?: Rarity
  isWaitingForResult: boolean
  onSpinStart?: () => void
  onSpinComplete?: () => void
}

interface WheelSegment {
  label: string
  color: string
  prize?: Prize
}

const SPIN_DURATION_SECONDS = 1.5

export const Wheel = ({
  weightedPrizes,
  targetPrizeId,
  revealedPrize,
  revealedRarity,
  isWaitingForResult,
  onSpinStart,
  onSpinComplete,
}: WheelProps) => {
  const [mustStartSpinning, setMustStartSpinning] = useState(false)
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0)
  const [detectedPrize, setDetectedPrize] = useState<Prize | null>(null)

  const activeSpinTargetRef = useRef<string | null>(null)
  const completedTargetRef = useRef<string | null>(null)
  const inFlightTargetRef = useRef<string | null>(null)

  const segments = useMemo<WheelSegment[]>(() => {
    const active = weightedPrizes.filter(({ prize, weight }) => prize.active && weight > 0)

    if (active.length === 0) {
      return [
        {
          label: 'Нет призов',
          color: rarityAccent[1],
        },
        {
          label: 'Добавьте в Google Sheets',
          color: rarityAccent[2],
        },
      ]
    }

    return active.map(({ prize }) => ({
      label: prize.name,
      color: rarityAccent[prize.rarity],
      prize,
    }))
  }, [weightedPrizes])

  const wheelData = useMemo<WheelDataType[]>(() => {
    if (segments.length === 0) {
      return []
    }

    const buildOption = (segment: WheelSegment): WheelDataType => ({
      option: segment.label,
      style: {
        backgroundColor: segment.color,
        textColor: '#fff',
        fontWeight: 600,
        fontSize: 14,
      },
    })

    if (segments.length === 1) {
      // The roulette component requires at least two segments to render correctly.
      const duplicated = segments[0]
      return [buildOption(duplicated), buildOption(duplicated)]
    }

    return segments.map(buildOption)
  }, [segments])

  const highlightedIndex = useMemo(() => {
    if (detectedPrize) {
      return segments.findIndex((segment) => segment.prize?.prizeId === detectedPrize.prizeId)
    }
    if (revealedPrize) {
      return segments.findIndex((segment) => segment.prize?.prizeId === revealedPrize.prizeId)
    }
    return -1
  }, [detectedPrize, revealedPrize, segments])

  useEffect(() => {
    if (!targetPrizeId) {
      activeSpinTargetRef.current = null
      inFlightTargetRef.current = null
      setMustStartSpinning(false)
      return
    }

    if (mustStartSpinning) {
      return
    }

    if (activeSpinTargetRef.current === targetPrizeId || completedTargetRef.current === targetPrizeId) {
      return
    }

    const index = segments.findIndex((segment) => segment.prize?.prizeId === targetPrizeId)
    if (index === -1) {
      onSpinComplete?.()
      return
    }

    activeSpinTargetRef.current = targetPrizeId
    inFlightTargetRef.current = targetPrizeId
    setCurrentPrizeIndex(index)
    setDetectedPrize(null)
    setMustStartSpinning(true)
    onSpinStart?.()
  }, [targetPrizeId, segments, mustStartSpinning, onSpinComplete, onSpinStart])

  const handleStopSpinning = () => {
    setMustStartSpinning(false)
    const prize = segments[currentPrizeIndex]?.prize ?? null
    setDetectedPrize(prize)

    const targetId = inFlightTargetRef.current
    if (targetId) {
      completedTargetRef.current = targetId
    }
    activeSpinTargetRef.current = null
    inFlightTargetRef.current = null
    onSpinComplete?.()
  }

  useEffect(() => {
    if (!revealedPrize || !revealedRarity || revealedRarity <= 1) {
      return
    }
    confetti({
      particleCount: 120 + revealedRarity * 20,
      spread: 70 + revealedRarity * 5,
      origin: { y: 0.6 },
      scalar: 0.9 + revealedRarity * 0.1,
    })
  }, [revealedPrize, revealedRarity])

  const displayedPrize = detectedPrize ?? revealedPrize ?? null
  const displayedRarity =
    detectedPrize?.rarity ?? revealedRarity ?? displayedPrize?.rarity ?? null

  const statusText = (() => {
    if (isWaitingForResult) {
      return 'Ожидаем результат...'
    }
    if (mustStartSpinning) {
      return 'Крутим колесо...'
    }
    if (displayedPrize) {
      return displayedPrize.name
    }
    return '???'
  })()

  return (
    <Card variant="outlined" sx={{ width: '100%', maxWidth: 700, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="h6" alignSelf="flex-start">
            Колесо удачи
          </Typography>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 700,
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {wheelData.length > 0 ? (
                <RouletteWheel
                  mustStartSpinning={mustStartSpinning}
                  prizeNumber={currentPrizeIndex % wheelData.length}
                  data={wheelData}
                  spinDuration={SPIN_DURATION_SECONDS}
                  onStopSpinning={handleStopSpinning}
                  outerBorderColor="#1a1a1a"
                  outerBorderWidth={8}
                  innerBorderColor="#1a1a1a"
                  innerBorderWidth={8}
                  radiusLineColor="#1a1a1a"
                  radiusLineWidth={2}
                  perpendicularText
                  textDistance={60}
                  disableInitialAnimation
                  pointerProps={{
                    style: {
                      filter: highlightedIndex === -1 ? undefined : 'drop-shadow(0 0 6px rgba(0,0,0,0.4))',
                    },
                  }}
                />
              ) : null}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: { xs: '36%', md: '28%' },
                  aspectRatio: '1',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  border: `6px solid ${displayedRarity ? rarityAccent[displayedRarity] : '#1a1a1a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  textAlign: 'center',
                  px: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  pointerEvents: 'none',
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 0.5, minHeight: '1.2em' }}
                >
                  {isWaitingForResult ? 'Связь с сервером' : 'Выпал приз'}
                </Typography>
                <Typography variant="body1" fontWeight={700} textAlign="center">
                  {statusText}
                </Typography>
                {displayedRarity ? (
                  <Chip
                    label={displayedRarity}
                    size="small"
                    sx={{
                      mt: 0.5,
                      backgroundColor: rarityAccent[displayedRarity],
                      color: '#fff',
                    }}
                  />
                ) : null}
              </Box>
              {(isWaitingForResult || mustStartSpinning) && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <CircularProgress color="secondary" size={80} thickness={3} />
                </Box>
              )}
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Колесо собирается из активных призов Google Sheets и анимируется при каждой крутке.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
