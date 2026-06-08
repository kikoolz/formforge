import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'FormForge <noreply@formforge.app>'

// Email sent to form owner when someone submits
export async function sendSubmissionNotification({
  to,
  formTitle,
  submissionData,
  pdfUrl,
}: {
  to: string
  formTitle: string
  submissionData: Record<string, string>
  pdfUrl: string | null
}) {
  const rows = Object.entries(submissionData)
    .filter(([, v]) => v && !v.startsWith('data:image'))
    .map(([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1f1f2e;color:#a0a0b0;
                   font-size:13px;width:35%">${k}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f1f2e;color:#ffffff;
                   font-size:13px">${v}</td>
      </tr>
    `).join('')

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New submission: ${formTitle}`,
    html: `
      <div style="background:#0a0a0f;min-height:100vh;padding:40px 20px;
                  font-family:system-ui,sans-serif">
        <div style="max-width:560px;margin:0 auto">
          <h1 style="color:#ffffff;font-size:20px;margin:0 0 6px">
            New submission received
          </h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 24px">
            Someone just submitted your form: <strong style="color:#a0a0b0">${formTitle}</strong>
          </p>

          <div style="background:#111118;border:1px solid #1f1f2e;border-radius:12px;
                      overflow:hidden">
            <table style="width:100%;border-collapse:collapse">
              ${rows}
            </table>
          </div>

          ${pdfUrl ? `
            <div style="margin-top:20px">
              <a href="${pdfUrl}"
                 style="display:inline-block;background:#6366f1;color:#ffffff;
                        text-decoration:none;padding:10px 20px;border-radius:8px;
                        font-size:14px;font-weight:500">
                Download Filled PDF
              </a>
            </div>
          ` : ''}

          <p style="color:#3f3f50;font-size:12px;margin-top:32px">
            FormForge — formforge.app
          </p>
        </div>
      </div>
    `
  })
}

// Welcome email sent on signup
export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to FormForge',
    html: `
      <div style="background:#0a0a0f;min-height:100vh;padding:40px 20px;
                  font-family:system-ui,sans-serif">
        <div style="max-width:560px;margin:0 auto;text-align:center">
          <h1 style="color:#ffffff;font-size:28px;margin:0 0 12px">
            Welcome, ${name}!
          </h1>
          <p style="color:#71717a;font-size:16px;margin:0 0 32px">
            Turn your PDFs into fillable forms in seconds.
            Your first 3 forms are completely free.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display:inline-block;background:#6366f1;color:#ffffff;
                    text-decoration:none;padding:14px 28px;border-radius:10px;
                    font-size:15px;font-weight:600">
            Go to Dashboard →
          </a>
        </div>
      </div>
    `
  })
}
