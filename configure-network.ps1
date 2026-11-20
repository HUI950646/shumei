$ErrorActionPreference = 'Stop'
$resultPath = Join-Path $PSScriptRoot 'config/network-setup-result.json'
$result = @{ success = $false; time = (Get-Date).ToString('o'); adapters = @(); error = $null }
try {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator permission is required to configure device network addresses.'
    }
    $devices = @(
        @{ Guid = '{28595A8B-1CFB-4BA6-B654-61B23B34E537}'; Description = 'Realtek PCIe GbE Family Controller'; Address = '192.168.10.50' },
        @{ Guid = '{ACFDAC16-7E58-4AC0-A1F2-541964F9E1FD}'; Description = 'ASIX AX88179 USB 3.0 to Gigabit Ethernet Adapter'; Address = '192.168.1.50' }
    )
    # Validate both device identities before changing either interface.
    $adapters = @(Get-NetAdapter)
    foreach ($device in $devices) {
        $matches = @($adapters | Where-Object { "$($_.InterfaceGuid)" -eq $device.Guid })
        if ($matches.Count -ne 1 -or $matches[0].InterfaceDescription -ne $device.Description -or $matches[0].Status -ne 'Up') {
            throw "Device adapter is missing or disconnected: $($device.Description)"
        }
        $device.Index = $matches[0].ifIndex
        $addresses = @(Get-NetIPAddress -InterfaceIndex $device.Index -AddressFamily IPv4)
        if ($addresses | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne $device.Address }) {
            throw "Unexpected IPv4 configuration on $($device.Description); review it before changing."
        }
        if (Get-NetRoute -InterfaceIndex $device.Index -AddressFamily IPv4 | Where-Object DestinationPrefix -eq '0.0.0.0/0') {
            throw "The device interface has a default route; review it before changing."
        }
    }
    foreach ($device in $devices) {
        if (-not (Get-NetIPAddress -InterfaceIndex $device.Index -AddressFamily IPv4 | Where-Object IPAddress -eq $device.Address)) {
            New-NetIPAddress -InterfaceIndex $device.Index -IPAddress $device.Address -PrefixLength 24 -AddressFamily IPv4 | Out-Null
        }
        $result.adapters += @{ interfaceIndex = $device.Index; address = $device.Address; prefixLength = 24 }
    }
    $result.success = $true
} catch {
    $result.error = $_.Exception.Message
} finally {
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
if (-not $result.success) { exit 1 }
