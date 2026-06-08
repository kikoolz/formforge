export async function ocrSpaceExtract(
  pdfBuffer: ArrayBuffer,
  apiKey: string,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  formData.append("file", blob, "document.pdf");
  formData.append("apikey", apiKey);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    const msg = result?.ErrorMessage || `OCR.space returned ${response.status}`;
    throw new Error(msg);
  }

  if (result?.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] || "OCR.space processing error");
  }

  const parsedResults = result?.ParsedResults ?? [];

  if (parsedResults.length === 0) {
    return "";
  }

  return parsedResults
    .map((r: any, i: number) => `--- Page ${i + 1} ---\n${r.ParsedText || ""}`)
    .join("\n\n")
    .trim();
}
