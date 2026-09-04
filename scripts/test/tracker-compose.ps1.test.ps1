<#
Tests for scripts/windows/tracker-compose.ps1 - the Windows launcher's .env/port/container-ownership
helpers.

`docker` is faked with a PowerShell function (the helper always invokes it as a command, so the
function table shadows the real binary) and the two host-listener probes are overridden, so the
suite needs no Docker daemon, no network, and no Windows.

Run with: pwsh -NoProfile -File scripts/test/tracker-compose.ps1.test.ps1
#>
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$suiteDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $suiteDir '..')).Path
$repoRoot = (Resolve-Path (Join-Path $repoRoot '..')).Path

. (Join-Path $repoRoot 'scripts/windows/tracker-compose.ps1')

$script:TestsRun = 0
$script:TestsFailed = 0

function Assert-Equal {
    param($Expected, $Actual, [string]$Name)
    $script:TestsRun++
    if ([string]$Expected -eq [string]$Actual) {
        Write-Host "  ok: $Name"
    } else {
        $script:TestsFailed++
        Write-Host "  FAIL: $Name"
        Write-Host "        expected [$Expected] but got [$Actual]"
    }
}

function Assert-True {
    param($Condition, [string]$Name)
    Assert-Equal -Expected 'True' -Actual ([bool]$Condition) -Name $Name
}

function Assert-False {
    param($Condition, [string]$Name)
    Assert-Equal -Expected 'False' -Actual ([bool]$Condition) -Name $Name
}

function Assert-Contains {
    param([string]$Haystack, [string]$Needle, [string]$Name)
    $script:TestsRun++
    if ($Haystack -like "*$Needle*") {
        Write-Host "  ok: $Name"
    } else {
        $script:TestsFailed++
        Write-Host "  FAIL: $Name"
        Write-Host "        expected [$Haystack] to contain [$Needle]"
    }
}

# --- fakes ------------------------------------------------------------------------------------
$global:FakeContainers = @()
$global:FakeRemoved = @()
$global:FakeListening = @()

function Add-FakeContainer {
    param([string]$Id, [string]$Name, [string]$Project, [string]$OneOff = 'False',
          [string]$State = 'running', [string]$Image = 'node:22-alpine', [int]$Publish = 0)
    $global:FakeContainers += ,([pscustomobject]@{
        Id = $Id; Name = $Name; Project = $Project; OneOff = $OneOff
        State = $State; Image = $Image; Publish = $Publish
    })
}

function Reset-Fakes {
    $global:FakeContainers = @()
    $global:FakeRemoved = @()
    $global:FakeListening = @()
}

# Shadows the real `docker` binary for everything the helper calls.
function global:docker {
    $arguments = @($args)
    if ($arguments[0] -eq 'rm') {
        $global:FakeRemoved += $arguments[2]
        $global:FakeContainers = @($global:FakeContainers | Where-Object { $_.Id -ne $arguments[2] -and $_.Name -ne $arguments[2] })
        return
    }
    if ($arguments[0] -ne 'ps') { return }

    $all = $false
    $wantPublish = $null
    $wantProject = $null
    $wantOneOff = $null
    $format = '{{.Names}}'
    for ($i = 1; $i -lt $arguments.Count; $i++) {
        switch -Wildcard ($arguments[$i]) {
            '-a' { $all = $true }
            '--filter' {
                $filter = $arguments[$i + 1]
                if ($filter -like 'publish=*') { $wantPublish = [int]($filter -replace '^publish=', '') }
                elseif ($filter -like 'label=com.docker.compose.project=*') { $wantProject = $filter -replace '^label=com.docker.compose.project=', '' }
                elseif ($filter -like 'label=com.docker.compose.oneoff=*') { $wantOneOff = $filter -replace '^label=com.docker.compose.oneoff=', '' }
            }
            '--format' { $format = $arguments[$i + 1] }
        }
    }

    $matches = $global:FakeContainers
    if (-not $all) { $matches = @($matches | Where-Object { $_.State -eq 'running' }) }
    if ($null -ne $wantPublish) { $matches = @($matches | Where-Object { $_.Publish -eq $wantPublish }) }
    if ($null -ne $wantProject) { $matches = @($matches | Where-Object { $_.Project -eq $wantProject }) }
    if ($null -ne $wantOneOff) { $matches = @($matches | Where-Object { $_.OneOff -eq $wantOneOff }) }

    foreach ($container in $matches) {
        switch ($format) {
            '{{.Names}}' { $container.Name }
            '{{.Names}} (image {{.Image}})' { "$($container.Name) (image $($container.Image))" }
            '{{.ID}}|{{.Names}}|{{.State}}' { "$($container.Id)|$($container.Name)|$($container.State)" }
            default { $container.Name }
        }
    }
}

# The real probes need Windows APIs or a live socket; drive them from a fixture instead.
function Test-TrackerPortListener {
    param([int]$Port)
    return ($global:FakeListening -contains $Port)
}

function Get-TrackerHostListenerDescription {
    param([int]$Port)
    if ($global:FakeListening -contains $Port) { return 'pid 4242 (node)' }
    return ''
}

$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("tracker-ps-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workRoot | Out-Null

function Clear-TrackerEnv {
    foreach ($key in @('COMPOSE_PROJECT_NAME', 'DB_PORT', 'MINIO_PORT', 'MINIO_CONSOLE_PORT', 'REDIS_PORT', 'APP_PORT', 'FRONTEND_PORT', 'SOME_OTHER_KEY')) {
        [Environment]::SetEnvironmentVariable($key, $null, 'Process')
    }
}

Write-Host 'tracker-compose.ps1.test.ps1'

# --- Import-TrackerEnvFile ---------------------------------------------------------------------
$envFile = Join-Path $workRoot '.env'
@(
    '# Host port overrides',
    'FRONTEND_PORT=5199',
    '',
    '  APP_PORT = 8099',
    'DB_PORT="5499"',
    'export REDIS_PORT=6399',
    'MINIO_PORT=$(New-Item /tmp/tracker-ps-injection-canary)',
    'SOME_OTHER_KEY=ignored',
    'no-equals-sign-line'
) | Set-Content -LiteralPath $envFile

Clear-TrackerEnv
Import-TrackerEnvFile -Path $envFile
Assert-Equal '5199' $env:FRONTEND_PORT '.env supplies FRONTEND_PORT'
Assert-Equal '8099' $env:APP_PORT 'whitespace around key/value is trimmed'
Assert-Equal '5499' $env:DB_PORT 'quoted values are unquoted'
Assert-Equal '6399' $env:REDIS_PORT 'an "export " prefix is tolerated'
Assert-Equal '$(New-Item /tmp/tracker-ps-injection-canary)' $env:MINIO_PORT '.env is parsed, never executed'
Assert-False (Test-Path '/tmp/tracker-ps-injection-canary') 'no command from .env ran'
Assert-Equal '' ([string]$env:SOME_OTHER_KEY) 'unknown keys are ignored'

Clear-TrackerEnv
$env:FRONTEND_PORT = '6000'
Import-TrackerEnvFile -Path $envFile
Assert-Equal '6000' $env:FRONTEND_PORT 'an existing environment value beats the .env file, like Compose'

Clear-TrackerEnv
Import-TrackerEnvFile -Path (Join-Path $workRoot 'definitely-absent')
Assert-Equal '' ([string]$env:FRONTEND_PORT) 'a missing .env file is not an error'

# --- Get-TrackerProjectName --------------------------------------------------------------------
$env:COMPOSE_PROJECT_NAME = 'custom-name'
Assert-Equal 'custom-name' (Get-TrackerProjectName -RepoRoot $workRoot) 'COMPOSE_PROJECT_NAME wins when set'
Clear-TrackerEnv

$trackerDir = Join-Path $workRoot 'Tracker-BE'
New-Item -ItemType Directory -Path $trackerDir | Out-Null
Assert-Equal 'tracker-be' (Get-TrackerProjectName -RepoRoot $trackerDir) 'the project name is derived from the directory like Compose derives it'

$oddDir = Join-Path $workRoot '_My Tracker!'
New-Item -ItemType Directory -Path $oddDir | Out-Null
Assert-Equal 'mytracker' (Get-TrackerProjectName -RepoRoot $oddDir) 'directory names are normalised'

# --- Get-TrackerPortOwner ----------------------------------------------------------------------
Reset-Fakes
Assert-Equal 'free' (Get-TrackerPortOwner -Port 5173 -Project 'tracker-be').Kind 'an unused port is reported free'

$global:FakeListening = @(5173)
$owner = Get-TrackerPortOwner -Port 5173 -Project 'tracker-be'
Assert-Equal 'host-process' $owner.Kind 'a host process holding the port is reported as such'
Assert-Equal 'pid 4242 (node)' $owner.Detail 'the host process is described'
$global:FakeListening = @()

Add-FakeContainer -Id 'svc1' -Name 'taskpriority-frontend' -Project 'tracker-be' -Publish 5173
$owner = Get-TrackerPortOwner -Port 5173 -Project 'tracker-be'
Assert-Equal 'tracker-service' $owner.Kind 'our own service container is recognised'
Assert-Equal 'taskpriority-frontend' $owner.Detail 'the service container is named'

Reset-Fakes
Add-FakeContainer -Id 'run1' -Name 'tracker-be-frontend-run-abc123' -Project 'tracker-be' -OneOff 'True' -Publish 5173
$owner = Get-TrackerPortOwner -Port 5173 -Project 'tracker-be'
Assert-Equal 'tracker-oneoff' $owner.Kind "a leftover 'docker compose run' container is reclaimable"

Reset-Fakes
Add-FakeContainer -Id 'other1' -Name 'other-app-web' -Project 'someone-else' -Image 'nginx:latest' -Publish 5173
$owner = Get-TrackerPortOwner -Port 5173 -Project 'tracker-be'
Assert-Equal 'other-container' $owner.Kind "another project's container is a foreign owner"
Assert-Equal 'other-app-web (image nginx:latest)' $owner.Detail 'the foreign container is named with its image'
Assert-Equal 'free' (Get-TrackerPortOwner -Port 8080 -Project 'tracker-be').Kind 'an unrelated container on another port leaves ours free'

# --- Remove-TrackerStaleOneOffContainer --------------------------------------------------------
Reset-Fakes
Add-FakeContainer -Id 'dead1' -Name 'tracker-be-frontend-run-dead' -Project 'tracker-be' -OneOff 'True' -State 'exited' -Publish 5173
Add-FakeContainer -Id 'live1' -Name 'tracker-be-frontend-run-live' -Project 'tracker-be' -OneOff 'True' -State 'running' -Publish 5174
Add-FakeContainer -Id 'svc2' -Name 'taskpriority-app' -Project 'tracker-be' -State 'exited' -Publish 8080
Add-FakeContainer -Id 'foreign' -Name 'other-run' -Project 'other' -OneOff 'True' -State 'exited' -Publish 9999

Remove-TrackerStaleOneOffContainer -Project 'tracker-be' | Out-Null
Assert-True ($global:FakeRemoved -contains 'dead1') 'an exited one-off container is cleaned up'
Assert-False ($global:FakeRemoved -contains 'live1') 'a running one-off container is left alone'
Assert-False ($global:FakeRemoved -contains 'svc2') 'our own stopped service containers are never removed'
Assert-False ($global:FakeRemoved -contains 'foreign') "another project's containers are never touched"

Remove-TrackerStaleOneOffContainer -Project 'tracker-be' -IncludeRunning | Out-Null
Assert-True ($global:FakeRemoved -contains 'live1') 'the stop path also removes running one-off containers'

# --- Test-TrackerRequiredPort ------------------------------------------------------------------
Reset-Fakes
Assert-True (Test-TrackerRequiredPort -Variable 'FRONTEND_PORT' -Port 5173 -Label 'frontend' -Project 'tracker-be') 'a free port passes the preflight'

Add-FakeContainer -Id 'run2' -Name 'tracker-be-frontend-run-xyz' -Project 'tracker-be' -OneOff 'True' -Publish 5173
Assert-True (Test-TrackerRequiredPort -Variable 'FRONTEND_PORT' -Port 5173 -Label 'frontend' -Project 'tracker-be') 'a leftover one-off container is reclaimed instead of failing'
Assert-True ($global:FakeRemoved -contains 'tracker-be-frontend-run-xyz') 'the reclaimed one-off container is removed'

Reset-Fakes
Add-FakeContainer -Id 'other2' -Name 'unrelated-app' -Project 'someone-else' -Image 'nginx' -Publish 5173
$conflictOutput = (Test-TrackerRequiredPort -Variable 'FRONTEND_PORT' -Port 5173 -Label 'frontend dev server' -Project 'tracker-be' 6>&1 | Out-String)
Assert-Contains $conflictOutput 'unrelated-app' 'a foreign container conflict names the owner'
Assert-Contains $conflictOutput 'set FRONTEND_PORT=<free port>' 'the conflict message says how to override the port'
Assert-Equal 0 $global:FakeRemoved.Count 'a foreign container is never removed automatically'

# --- Set-TrackerMinioAutoShift -----------------------------------------------------------------
Reset-Fakes
Clear-TrackerEnv
Add-FakeContainer -Id 'minio-foreign' -Name 'someones-minio' -Project 'other' -Image 'minio/minio' -Publish 9000
$global:FakeListening = @(9000)
Set-TrackerMinioAutoShift -Variable 'MINIO_PORT' -Default 9000 -FirstCandidate 19000 -Project 'tracker-be' | Out-Null
Assert-Equal '19000' $env:MINIO_PORT 'a foreign owner on 9000 shifts MinIO to a free high port'

Clear-TrackerEnv
$env:MINIO_PORT = '9000'
Set-TrackerMinioAutoShift -Variable 'MINIO_PORT' -Default 9000 -FirstCandidate 19000 -Project 'tracker-be' | Out-Null
Assert-Equal '9000' $env:MINIO_PORT 'an explicitly pinned MINIO_PORT is never shifted'

Reset-Fakes
Clear-TrackerEnv
Set-TrackerMinioAutoShift -Variable 'MINIO_PORT' -Default 9000 -FirstCandidate 19000 -Project 'tracker-be' | Out-Null
Assert-Equal '' ([string]$env:MINIO_PORT) 'a free 9000 is left alone'

# --- Invoke-TrackerPreflight -------------------------------------------------------------------
Reset-Fakes
Clear-TrackerEnv
$envOut = Join-Path $workRoot 'ports.cmd'
$status = Invoke-TrackerPreflight -RepoRoot $trackerDir -EnvOut $envOut
Assert-Equal 0 $status 'a clean machine passes the preflight'
$written = (Get-Content -LiteralPath $envOut) -join "`n"
foreach ($variable in @('APP_PORT=8080', 'FRONTEND_PORT=5173', 'DB_PORT=5432', 'REDIS_PORT=6379', 'MINIO_PORT=9000', 'MINIO_CONSOLE_PORT=9001')) {
    Assert-Contains $written $variable "the preflight exports $variable for the launcher"
}

Reset-Fakes
Clear-TrackerEnv
Add-FakeContainer -Id 'other3' -Name 'unrelated-app' -Project 'someone-else' -Image 'nginx' -Publish 5173
$status = Invoke-TrackerPreflight -RepoRoot $trackerDir -EnvOut (Join-Path $workRoot 'ports2.cmd') 6>&1 | Select-Object -Last 1
Assert-Equal 1 $status 'a foreign owner on 5173 fails the preflight'
Assert-False (Test-Path (Join-Path $workRoot 'ports2.cmd')) 'a failed preflight writes no port file'

Remove-Item -Recurse -Force $workRoot
Clear-TrackerEnv

Write-Host ''
if ($script:TestsFailed -eq 0) {
    Write-Host "tracker-compose.ps1.test.ps1: $($script:TestsRun) passed"
    exit 0
}
Write-Host "tracker-compose.ps1.test.ps1: $($script:TestsFailed) of $($script:TestsRun) FAILED"
exit 1
