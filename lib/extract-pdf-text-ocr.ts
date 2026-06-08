import { ocrSpaceExtract } from './ocr-space'
import type { TextItem } from './extract-pdf-text'

export async function extractPdfTextWithOcr(pdfBuffer: ArrayBuffer): Promise<{ text: string; items: TextItem[] }> {
  const apiKey = process.env.OCR_SPACE_API_KEY

  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY is not set')
  }

  const text = await ocrSpaceExtract(pdfBuffer, apiKey)

  return {
    text,
    items: [],
  }
}
