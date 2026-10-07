import antigravityLogo from '../assets/providers/antigravity.png'
import claudeLogo from '../assets/providers/claude.png'
import cursorLogo from '../assets/providers/cursor.png'
import copilotLogo from '../assets/providers/github-copilot.png'
import openaiLogo from '../assets/providers/openai.png'

export const providerNames: Record<string, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  copilot: 'GitHub Copilot'
}

export const providerLogos: Record<string, string> = {
  claude: claudeLogo,
  openai: openaiLogo,
  cursor: cursorLogo,
  antigravity: antigravityLogo,
  copilot: copilotLogo
}

export function providerName(id: string): string {
  return providerNames[id] ?? id
}
