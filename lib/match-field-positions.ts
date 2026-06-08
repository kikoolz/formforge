import type { DetectedField } from '@/types'
import type { TextItem } from './extract-pdf-text'

interface MatchedField extends DetectedField {
  page_x: number | null
  page_y: number | null
}

interface TextLine {
  pageNum: number
  x: number
  y: number
  text: string
}

const Y_TOLERANCE = 5

function groupIntoLines(items: TextItem[]): TextLine[] {
  const sorted = [...items].sort((a, b) => a.pageNum - b.pageNum || b.y - a.y)
  const lines: TextLine[] = []

  for (const item of sorted) {
    const str = item.str.trim()
    if (!str) continue

    const last = lines[lines.length - 1]
    if (
      last &&
      last.pageNum === item.pageNum &&
      Math.abs(last.y - item.y) <= Y_TOLERANCE
    ) {
      last.text += ' ' + str
    } else {
      lines.push({ pageNum: item.pageNum, x: item.x, y: item.y, text: str })
    }
  }

  return lines
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let intersection = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++
  }
  const union = new Set([...wordsA, ...wordsB])
  return intersection / union.size
}

function normalize(s: string): string {
  return s.replace(/[^a-z0-9\s]/g, '').toLowerCase().trim()
}

export function matchFieldPositions(
  fields: DetectedField[],
  items: TextItem[]
): MatchedField[] {
  const lines = groupIntoLines(items)

  return fields.map(field => {
    const normLabel = normalize(field.label)

    let bestScore = 0
    let bestLine: TextLine | null = null

    for (const line of lines) {
      const normLine = normalize(line.text)
      const score = similarity(normLabel, normLine)
      if (score > bestScore) {
        bestScore = score
        bestLine = line
      }
    }

    if (bestLine && bestScore > 0.3) {
      return {
        ...field,
        page: bestLine.pageNum,
        page_x: bestLine.x,
        page_y: bestLine.y,
      }
    }

    return { ...field, page_x: null, page_y: null }
  })
}

export { type TextLine, groupIntoLines }
