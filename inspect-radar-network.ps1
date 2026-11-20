$ErrorActionPreference = 'Stop'
$outputDir = Join-Path $PSScriptRoot 'logs'
$resultPath = Join-Path $outputDir 'radar-network-inspection.json'
$capture = Join-Path $outputDir 'radar-network.etl'
$captureText = Join-Path $outputDir 'radar-network.txt'
$started = $false
$result = @{ success = $false; time = (Get-Date).ToString('o'); error = $null }
try {
    $adapter = Get-NetAdapter | Where-Object { "$($_.InterfaceGuid)" -eq '{28595A8B-1CFB-4BA6-B654-61B23B34E537}' }
    if (-not $adapter -or $adapter.InterfaceDescription -ne 'Realtek PCIe GbE Family Controller') {
        throw 'The expected radar adapter is missing.'
    }
    $components = @(& pktmon list)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot list packet monitor components.' }
    $components | Set-Content -LiteralPath (Join-Path $outputDir 'radar-network-components.txt')
    $lines = @($components | Where-Object { $_ -match 'Realtek PCIe GbE Family Controller' })
    if ($lines.Count -ne 1 -or $lines[0] -notmatch '^\s*(\d+)\s') {
        throw 'Cannot uniquely identify the radar network component.'
    }
    $componentId = $Matches[1]
    $result.componentId = $componentId
    & pktmon start --capture --comp $componentId --pkt-size 64 --file-size 8 --file-name $capture | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start capture; any existing capture is left untouched.' }
    $started = $true
    Start-Sleep -Seconds 12
    & pktmon stop | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop this packet capture.' }
    $started = $false
    & pktmon etl2txt $capture --out $captureText --verbose | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot convert capture to text.' }
    $result.success = $true
} catch {
    $result.error = $_.Exception.Message
} finally {
    if ($started) { & pktmon stop | Out-Null }
    $result | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
