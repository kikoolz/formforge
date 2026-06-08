import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib'

export async function generateFilledPdf(
  originalPdfUrl: string,
  submissionData: Record<string, string>
): Promise<Uint8Array> {

  // 1. Download original PDF
  const existingPdfBytes = await fetch(originalPdfUrl).then(r => r.arrayBuffer())

  // 2. Load into pdf-lib
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()
  const page = pages[0]
  const { height } = page.getSize()

  // 3. Write answers onto the PDF
  // We position them starting from top, going down
  let yPosition = height - 120
  const lineHeight = 25
  const xPosition = 150

  Object.entries(submissionData).forEach(([label, value]) => {
    // Skip signature data URLs and empty values
    if (!value || value.startsWith('data:image')) return

    // Write the value on the page
    page.drawText(String(value), {
      x: xPosition,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
      maxWidth: 400,
    })

    yPosition -= lineHeight

    // If we go off the page, add a new page
    if (yPosition < 50) {
      yPosition = height - 80
    }
  })

  // 4. Return as bytes
  return pdfDoc.save()
}
