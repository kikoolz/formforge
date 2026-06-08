import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface FieldWithPosition {
  label: string
  page_x: number | null
  page_y: number | null
  page: number
}

export async function generateFilledPdf(
  originalPdfUrl: string,
  submissionData: Record<string, string>,
  fieldsWithPositions: FieldWithPosition[]
): Promise<Uint8Array> {
  const existingPdfBytes = await fetch(originalPdfUrl).then(r => r.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of fieldsWithPositions) {
    const value = submissionData[field.label]
    if (!value || value.startsWith('data:image')) continue

    const pageIndex = (field.page || 1) - 1
    const page = pages[pageIndex]
    if (!page) continue

    const { height } = page.getSize()

    if (field.page_x !== null && field.page_y !== null) {
      page.drawText(String(value).slice(0, 100), {
        x: field.page_x,
        y: height - field.page_y - 12,
        size: 11,
        font,
        color: rgb(0, 0, 0),
        maxWidth: 300,
      })
    }
  }

  const hasPositions = fieldsWithPositions.some(
    f => f.page_x !== null && f.page_y !== null
  )

  if (!hasPositions) {
    const summaryPage = pdfDoc.addPage()
    const { height } = summaryPage.getSize()
    let y = height - 60

    summaryPage.drawText('Submission Summary', {
      x: 50, y,
      size: 16, font,
      color: rgb(0.2, 0.2, 0.8),
    })
    y -= 30

    for (const [label, value] of Object.entries(submissionData)) {
      if (!value || value.startsWith('data:image')) continue
      summaryPage.drawText(`${label}: ${String(value).slice(0, 80)}`, {
        x: 50, y,
        size: 11, font,
        color: rgb(0, 0, 0),
        maxWidth: 500,
      })
      y -= 22
      if (y < 60) break
    }
  }

  return pdfDoc.save()
}
