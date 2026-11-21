import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

// Shared link preview (WhatsApp, LinkedIn, Slack, X…). Rendered once at build time.
export const alt = 'Miaustico: practise the Spanish past tenses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const [cat, logo] = await Promise.all([
    readFile(join(process.cwd(), 'public/images/login/logincat.png'), 'base64'),
    readFile(join(process.cwd(), 'public/images/login/logo.png'), 'base64'),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#2F54BA',
          padding: '72px 80px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <img src={`data:image/png;base64,${logo}`} width={186} height={40} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 680 }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: 'white', lineHeight: 1.05, letterSpacing: -2 }}>
            Practise the Spanish past tenses.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(255,255,255,0.85)' }}>
            Indefinido, imperfecto and pretérito perfecto, one cat at a time.
          </div>
        </div>
        <img
          src={`data:image/png;base64,${cat}`}
          width={382}
          height={602}
          alt=""
          style={{ position: 'absolute', right: -20, bottom: 0 }}
        />
      </div>
    ),
    size
  )
}
