$ErrorActionPreference = 'Stop'

$php = 'C:\xampp\php\php.exe'
if (-not (Test-Path -LiteralPath $php -PathType Leaf)) {
    throw 'XAMPP PHP was not found at C:\xampp\php\php.exe.'
}

$email = (Read-Host 'Administrator email').Trim()
$name = (Read-Host 'Administrator full name').Trim()
$passwordSecure = Read-Host 'Password (at least 8 characters)' -AsSecureString
$confirmationSecure = Read-Host 'Confirm password' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$confirmationPointer = [IntPtr]::Zero
$plainPassword = $null
$confirmation = $null
$exitCode = 1

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmationSecure)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)

    if ($plainPassword -cne $confirmation) {
        throw 'The passwords do not match.'
    }

    $env:WAFAA_ADMIN_EMAIL = $email
    $env:WAFAA_ADMIN_NAME = $name
    $env:WAFAA_ADMIN_PASSWORD = $plainPassword
    & $php (Join-Path $PSScriptRoot 'create_first_admin.php')
    $exitCode = $LASTEXITCODE
}
finally {
    Remove-Item Env:WAFAA_ADMIN_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:WAFAA_ADMIN_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:WAFAA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($confirmationPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer)
    }
    $passwordSecure.Dispose()
    $confirmationSecure.Dispose()
}

exit $exitCode
