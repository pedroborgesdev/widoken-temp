# Run after capture-themes.mjs. Builds assets/readme/widget-themes.png from the theme shots and wallpaper.jpg.
Add-Type -AssemblyName System.Drawing

$root = 'C:\Repositorios\widoken-temp'
$order = @(
  @{ File = 'monokai-black.png'; Label = 'Monokai Black' },
  @{ File = 'dark.png'; Label = 'Dark' },
  @{ File = 'dracula.png'; Label = 'Dracula' },
  @{ File = 'nord.png'; Label = 'Nord' },
  @{ File = 'catppuccin.png'; Label = 'Catppuccin' },
  @{ File = 'tokyo-night.png'; Label = 'Tokyo Night' },
  @{ File = 'gruvbox.png'; Label = 'Gruvbox' },
  @{ File = 'solarized-dark.png'; Label = 'Solarized' },
  @{ File = 'monokai.png'; Label = 'Monokai' }
)

$canvasW = 1680
$canvasH = 945
$gap = 6
$labelGap = 14
$chipH = 40
$sideMargin = 72

function Measure-Shot([System.Drawing.Bitmap]$source) {
  $minX = $source.Width
  $minY = $source.Height
  $maxX = 0
  $maxY = 0
  $solidMinY = $source.Height
  $solidMaxY = 0
  for ($y = 0; $y -lt $source.Height; $y += 2) {
    for ($x = 0; $x -lt $source.Width; $x += 2) {
      $alpha = $source.GetPixel($x, $y).A
      if ($alpha -gt 12) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
      if ($alpha -gt 210) {
        if ($y -lt $solidMinY) { $solidMinY = $y }
        if ($y -gt $solidMaxY) { $solidMaxY = $y }
      }
    }
  }
  $minX = [Math]::Max(0, $minX - 2)
  $minY = [Math]::Max(0, $minY - 2)
  $maxX = [Math]::Min($source.Width - 1, $maxX + 2)
  $maxY = [Math]::Min($source.Height - 1, $maxY + 2)
  $rect = New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
  return @{
    Bitmap = $source.Clone($rect, $source.PixelFormat)
    SolidTop = [Math]::Max(0, $solidMinY - $minY)
    SolidBottom = [Math]::Min($rect.Height, ($solidMaxY - $minY + 1))
  }
}

function Add-RoundRect([System.Drawing.Drawing2D.GraphicsPath]$path, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $d = [Math]::Min($r, [Math]::Min($w, $h))
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
}

$wallpaper = [System.Drawing.Image]::FromFile((Join-Path $root 'wallpaper.jpg'))
$canvas = New-Object System.Drawing.Bitmap $canvasW, $canvasH
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::FromArgb(255, 196, 142, 78))
$g.DrawImage($wallpaper, 0, 0, $canvasW, $canvasH)

$shots = @()
foreach ($item in $order) {
  $path = Join-Path $root "assets\readme\.theme-shots\$($item.File)"
  $img = [System.Drawing.Image]::FromFile($path)
  $full = New-Object System.Drawing.Bitmap $img
  $img.Dispose()
  $measured = Measure-Shot $full
  $full.Dispose()
  $shots += @{ Bitmap = $measured.Bitmap; Label = $item.Label; SolidTop = $measured.SolidTop; SolidBottom = $measured.SolidBottom }
}

$sample = $shots[0].Bitmap
$labelRoom = $chipH + $labelGap
$contentH = $canvasH - ($labelRoom * 2) - 28
$contentScale = $contentH / $sample.Height
$count = $shots.Count
$drawWidths = @()
$rowW = 0
foreach ($shot in $shots) {
  $drawW = $shot.Bitmap.Width * $contentScale
  $drawWidths += $drawW
  $rowW += $drawW
}
$rowW += $gap * ($count - 1)
$maxRow = $canvasW - ($sideMargin * 2)
if ($rowW -gt $maxRow) {
  $contentScale = $contentScale * ($maxRow / $rowW)
  $contentH = $sample.Height * $contentScale
  $drawWidths = @()
  $rowW = 0
  foreach ($shot in $shots) {
    $drawW = $shot.Bitmap.Width * $contentScale
    $drawWidths += $drawW
    $rowW += $drawW
  }
  $rowW += $gap * ($count - 1)
}

$originX = ($canvasW - $rowW) / 2
$originY = [Math]::Round(($canvasH - $contentH) / 2 + 18)

$font = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$chipWidths = @()
foreach ($shot in $shots) {
  $chipWidths += $g.MeasureString($shot.Label, $font).Width + 28
}
$chipLeft = $canvasW
$chipRight = 0
$cursor = $originX
for ($i = 0; $i -lt $count; $i++) {
  $chipX = $cursor + ($drawWidths[$i] - $chipWidths[$i]) / 2
  if ($chipX -lt $chipLeft) { $chipLeft = $chipX }
  if (($chipX + $chipWidths[$i]) -gt $chipRight) { $chipRight = $chipX + $chipWidths[$i] }
  $cursor += $drawWidths[$i] + $gap
}
$inset = 20
$shift = 0
if ($chipLeft -lt $inset) { $shift = $inset - $chipLeft }
if (($chipRight + $shift) -gt ($canvasW - $inset)) { $shift -= ($chipRight + $shift) - ($canvasW - $inset) }
$originX += $shift

$fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
$chip = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(168, 10, 14, 22))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$cursor = $originX
for ($i = 0; $i -lt $count; $i++) {
  $drawW = $drawWidths[$i]
  $drawH = $shots[$i].Bitmap.Height * $contentScale
  $g.DrawImage($shots[$i].Bitmap, [single]$cursor, [single]$originY, [single]$drawW, [single]$drawH)

  $bodyTop = $originY + ($shots[$i].SolidTop * $contentScale)
  $bodyBottom = $originY + ($shots[$i].SolidBottom * $contentScale)
  $textSize = $g.MeasureString($shots[$i].Label, $font)
  $chipW = [single]($textSize.Width + 28)
  $chipX = [single]($cursor + ($drawW - $chipW) / 2)
  $chipY = if ($i % 2 -eq 0) { [single]($bodyBottom + $labelGap) } else { [single]($bodyTop - $labelGap - $chipH) }
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundRect $path $chipX $chipY $chipW $chipH $chipH
  $g.FillPath($chip, $path)
  $path.Dispose()
  $labelRect = New-Object System.Drawing.RectangleF $chipX, $chipY, $chipW, $chipH
  $g.DrawString($shots[$i].Label, $font, $fill, $labelRect, $format)

  $cursor += $drawW + $gap
}

$out = Join-Path $root 'assets\readme\widget-themes.png'
$canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

foreach ($shot in $shots) { $shot.Bitmap.Dispose() }
$g.Dispose()
$canvas.Dispose()
$wallpaper.Dispose()
Write-Output "wrote $out"
