#!/usr/bin/env bash
# Widoken ad production - VOICE-OVER layer.
#
# Neural PT-BR TTS (Piper / VITS). Original script, machine-synthesised voice.
# The rendered WAV stems are committed under public/audio/vo so the render is
# reproducible without re-running the model.
#
# Model: rhasspy/piper-voices  pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx
#        Licensed under SIL Open Font License 1.1 (voice), MIT (piper).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$ROOT/public/audio/vo"
CACHE="${PIPER_VOICES:-$HOME/.cache/widoken-ad/piper-voices}"
VENV="${PIPER_VENV:-/tmp/opencode/.ttsvenv}"
URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx"

mkdir -p "$CACHE" "$OUT"

if [ ! -f "$CACHE/pt_BR-faber-medium.onnx" ]; then
  echo "downloading piper voice model..."
  curl -sSL -o "$CACHE/pt_BR-faber-medium.onnx" "$URL"
  curl -sSL -o "$CACHE/pt_BR-faber-medium.onnx.json" "${URL}.json"
fi

if [ ! -x "$VENV/bin/piper" ]; then
  echo "creating piper venv..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q piper-tts
fi

# id | text
LINES=(
  "01|Você não quer um tanque de guerra pra matar uma formiga."
  "02|Isso tudo... só pra ver o seu uso?"
  "03|Conheça o Widoken."
  "04|Suas ferramentas de IA, reunidas num widget compacto."
  "05|Quanto você usou, quanto resta e quando renova. Tudo à vista."
  "06|E quando a sua IA está trabalhando, você sabe."
  "07|Widoken. Simples, direto, no controle."
)

for entry in "${LINES[@]}"; do
  id="${entry%%|*}"
  text="${entry#*|}"
  printf '%s' "$text" > "$OUT/.line-$id.txt"
  "$VENV/bin/piper" \
    -m "$CACHE/pt_BR-faber-medium.onnx" \
    -c "$CACHE/pt_BR-faber-medium.onnx.json" \
    -i "$OUT/.line-$id.txt" \
    -f "$OUT/vo-$id.wav" \
    --length-scale 1.02 \
    --noise-scale 0.62 \
    --noise-w-scale 0.75 \
    --sentence-silence 0.22
  rm -f "$OUT/.line-$id.txt"
  printf 'vo-%s.wav  %s  %ss\n' "$id" "$text" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/vo-$id.wav")"
done

echo "voice-over rendered into $OUT"
