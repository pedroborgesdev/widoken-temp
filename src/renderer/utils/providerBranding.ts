import antigravityLogo from '../assets/providers/antigravity.png'
import claudeLogo from '../assets/providers/claude.png'
import cursorLogo from '../assets/providers/cursor.png'
import deepseekLogo from '../assets/providers/deepseek.png'
import huggingFaceLogo from '../assets/providers/huggingface.png'
import copilotLogo from '../assets/providers/github-copilot.png'
import openaiLogo from '../assets/providers/openai.png'

export const providerNames: Record<string, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  copilot: 'GitHub Copilot',
  deepseek: 'DeepSeek',
  huggingface: 'Hugging Face'
}

export const providerLogos: Record<string, string> = {
  claude: claudeLogo,
  openai: openaiLogo,
  cursor: cursorLogo,
  antigravity: antigravityLogo,
  copilot: copilotLogo,
  deepseek: deepseekLogo,
  huggingface: huggingFaceLogo
}

export function providerName(id: string): string {
  return providerNames[id] ?? id
}
