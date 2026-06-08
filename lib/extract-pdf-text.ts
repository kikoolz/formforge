export interface TextItem {
  str: string
  pageNum: number
  x: number
  y: number
  width: number
  height: number
}

export interface ExtractionResult {
  text: string
  items: TextItem[]
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const uint8Array = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise

  let fullText = ''
  const allItems: TextItem[] = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    fullText += `[Page ${pageNum}]\n${pageText}\n\n`

    for (const item of content.items as any[]) {
      const tx = item.transform?.[4] ?? 0
      const ty = item.transform?.[5] ?? 0
      allItems.push({
        str: item.str || '',
        pageNum,
        x: tx,
        y: ty,
        width: item.width || 0,
        height: item.height || 0,
      })
    }
  }

  return { text: fullText.trim(), items: allItems }
}
