interface HtmlEmailOptions {
  title: string;
  body: string;
  previewText?: string;
}

export function renderHtmlEmail({ title, body, previewText = "" }: HtmlEmailOptions) {
  const safePreview = previewText
    ? `<span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        color: #f8fafc;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .container {
        width: 100%;
        padding: 32px 16px;
        box-sizing: border-box;
      }
      .card {
        max-width: 520px;
        margin: 0 auto;
        background: #111827;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 18px;
        padding: 36px;
        box-shadow: 0 25px 45px rgba(15, 23, 42, 0.45);
      }
      h1 {
        margin: 0 0 16px;
        font-size: 24px;
        line-height: 1.3;
        color: #ffffff;
        letter-spacing: -0.01em;
      }
      p {
        margin: 0 0 18px;
        font-size: 15px;
        line-height: 1.7;
        color: #e2e8f0;
      }
      a {
        color: #8b93ff;
        font-weight: 600;
      }
      .button {
        display: inline-block;
        padding: 14px 26px;
        border-radius: 999px;
        background: linear-gradient(135deg, #7c3aed, #6366f1);
        color: #ffffff !important;
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-size: 13px;
      }
      .footer {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 32px;
      }
    </style>
  </head>
  <body>
    ${safePreview}
    <div class="container">
      <div class="card">
        <h1>${title}</h1>
        <div>${body}</div>
        <p class="footer">
          &copy; ${new Date().getFullYear()} Shujia. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>`;
}
