# Run after capture.mjs. Places dashboard-raw.png on wallpaper.png and writes assets/readme/dashboard.png.
# If the raw shot is already gone, the window is taken from the current dashboard.png.
Add-Type -AssemblyName System.Drawing

$wallpaperPath = 'C:\Repositorios\widoken-temp\wallpaper.png'
$dashPath = 'C:\Repositorios\widoken-temp\assets\readme\dashboard-raw.png'
$outPath = 'C:\Repositorios\widoken-temp\assets\readme\dashboard.png'
$radius = 28
$canvasW = 1680
$canvasH = 1000

function Add-RoundRect([System.Drawing.Drawing2D.GraphicsPath]$path, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
}

function Copy-Image([System.Drawing.Image]$source, [System.Drawing.Rectangle]$crop) {
  $copy = New-Object System.Drawing.Bitmap $crop.Width, $crop.Height
  $graphics = [System.Drawing.Graphics]::FromImage($copy)
  $graphics.DrawImage($source, (New-Object System.Drawing.Rectangle 0, 0, $crop.Width, $crop.Height), $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $copy
}

if (Test-Path -LiteralPath $dashPath) {
  $file = [System.Drawing.Image]::FromFile($dashPath)
  $dash = Copy-Image $file (New-Object System.Drawing.Rectangle 0, 0, $file.Width, $file.Height)
  $file.Dispose()
  $targetW = [int]($canvasW * 0.86)
  $targetH = [int]($dash.Height * $targetW / $dash.Width)
} else {
  $file = [System.Drawing.Image]::FromFile($outPath)
  $targetW = 1445
  $targetH = 930
  $dash = Copy-Image $file (New-Object System.Drawing.Rectangle 118, 35, $targetW, $targetH)
  $file.Dispose()
}

$wallFile = [System.Drawing.Image]::FromFile($wallpaperPath)
$wall = Copy-Image $wallFile (New-Object System.Drawing.Rectangle 0, 0, $wallFile.Width, $wallFile.Height)
$wallFile.Dispose()

$bmp = New-Object System.Drawing.Bitmap $canvasW, $canvasH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$scale = [Math]::Max($canvasW / $wall.Width, $canvasH / $wall.Height)
$dw = [int]($wall.Width * $scale)
$dh = [int]($wall.Height * $scale)
$g.DrawImage($wall, [int](($canvasW - $dw) / 2), [int](($canvasH - $dh) / 2), $dw, $dh)

$x = [int](($canvasW - $targetW) / 2)
$y = [int](($canvasH - $targetH) / 2)

$window = New-Object System.Drawing.Bitmap $targetW, $targetH
$windowGraphics = [System.Drawing.Graphics]::FromImage($window)
$windowGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$windowGraphics.DrawImage($dash, 0, 0, $targetW, $targetH)
$windowGraphics.Dispose()

$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(80, 0, 0, 0))
$shadowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
Add-RoundRect $shadowPath ($x + 12) ($y + 18) $targetW $targetH $radius
$g.FillPath($shadow, $shadowPath)

$brush = New-Object System.Drawing.TextureBrush $window
$brush.TranslateTransform($x, $y)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
Add-RoundRect $path $x $y $targetW $targetH $radius
$g.FillPath($brush, $path)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $dash.Dispose(); $wall.Dispose(); $window.Dispose()
$shadow.Dispose(); $shadowPath.Dispose(); $brush.Dispose(); $path.Dispose()
Get-Item -LiteralPath $outPath | Select-Object Length
