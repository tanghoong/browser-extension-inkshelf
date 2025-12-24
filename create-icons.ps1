# Create Placeholder Icons Script
# This PowerShell script creates simple colored placeholder icons for development

Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$color = [System.Drawing.Color]::FromArgb(0, 102, 204) # #0066cc

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Fill with color
    $brush = New-Object System.Drawing.SolidBrush($color)
    $graphics.FillRectangle($brush, 0, 0, $size, $size)
    
    # Add white "M" for Markdown
    $font = New-Object System.Drawing.Font("Arial", [int]($size * 0.5), [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $graphics.DrawString("M", $font, $whiteBrush, $rect, $format)
    
    # Save
    $filename = "icons/icon$size.png"
    $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    
    Write-Host "Created $filename"
    
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host "All placeholder icons created successfully!"
