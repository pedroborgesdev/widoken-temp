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
$canvasH = 980
$contentH = 680
$gap = 58
$pad = 84

$wallpaper = [System.Drawing.Image]::FromFile((Join-Path $root 'wallpaper.jpg'))
$canvas = New-Object System.Drawing.Bitmap $canvasW, $canvasH
$canvas.SetResolution(144, 144)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$scale = [Math]::Max($canvasW / $wallpaper.Width, $canvasH / $wallpaper.Height)
$dw = $wallpaper.Width * $scale
$dh = $wallpaper.Height * $scale
$g.DrawImage($wallpaper, [single](($canvasW - $dw) / 2), [single](($canvasH - $dh) / 2 - 20), [single]$dw, [single]$dh)

$shots = @()
foreach ($item in $order) {
  $path = Join-Path $root "assets\readme\.theme-shots\$($item.File)"
  $img = [System.Drawing.Image]::FromFile($path)
  $bmp = New-Object System.Drawing.Bitmap $img
  $img.Dispose()
  $shots += @{ Bitmap = $bmp; Label = $item.Label }
}

$sample = $shots[0].Bitmap
$contentScale = $contentH / ($sample.Height - ($pad * 2))
$drawW = $sample.Width * $contentScale
$drawH = $sample.Height * $contentScale
$contentW = ($sample.Width - ($pad * 2)) * $contentScale
$insetX = $pad * $contentScale
$insetY = $pad * $contentScale
$count = $shots.Count
$rowW = ($count * $contentW) + (($count - 1) * $gap)
$originX = ($canvasW - $rowW) / 2
$originY = 92

$font = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
$chip = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(168, 10, 14, 22))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

for ($i = 0; $i -lt $count; $i++) {
  $contentX = $originX + ($i * ($contentW + $gap))
  $g.DrawImage($shots[$i].Bitmap, [single]($contentX - $insetX), [single]($originY - $insetY), [single]$drawW, [single]$drawH)
  $label = $shots[$i].Label
  $textSize = $g.MeasureString($label, $font)
  $chipW = [single]($textSize.Width + 28)
  $chipH = [single]40
  $chipX = [single]($contentX + ($contentW - $chipW) / 2)
  $chipY = [single]($originY + $contentH + 22)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = $chipH
  $path.AddArc($chipX, $chipY, $radius, $radius, 180, 90)
  $path.AddArc(($chipX + $chipW - $radius), $chipY, $radius, $radius, 270, 90)
  $path.AddArc(($chipX + $chipW - $radius), ($chipY + $chipH - $radius), $radius, $radius, 0, 90)
  $path.AddArc($chipX, ($chipY + $chipH - $radius), $radius, $radius, 90, 90)
  $path.CloseFigure()
  $g.FillPath($chip, $path)
  $path.Dispose()
  $labelRect = New-Object System.Drawing.RectangleF $chipX, $chipY, $chipW, $chipH
  $g.DrawString($label, $font, $fill, $labelRect, $format)
}

$out = Join-Path $root 'assets\readme\widget-themes.png'
$canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

foreach ($shot in $shots) { $shot.Bitmap.Dispose() }
$g.Dispose()
$canvas.Dispose()
$wallpaper.Dispose()
Write-Output "wrote $out"
