<#
.SYNOPSIS
Windows counterpart of scripts/lib/tracker-compose.sh - the .env/port/container-ownership helpers
the Docker launchers rely on.

.DESCRIPTION
Dot-source it (no -Mode) to get the functions, or run it with -Mode to do one job:

  -Mode Preflight -EnvOut <file>   Resolve every published host port from the environment and .env,
                                   reclaim leftover one-off containers of this project, and fail
                                   (exit 1) when anything else owns a port we need. On success it
                                   writes `set "NAME=VALUE"` lines to <file> for the caller to
                                   `call`, so the .bat and Compose agree on every port.
  -Mode CleanupOneOff              Remove same-project one-off `docker compose run` containers that
                                   Compose left behind.

Written for Windows PowerShell 5.1 (what every Windows box has out of the box) - no PS7-only
syntax - and exercised by scripts/test/tracker-compose.ps1.test.ps1.

Nothing here ever stops or removes a container outside this Compose project, or kills a host
process: a foreign owner is reported, never touched.
#>
[CmdletBinding()]
param(
    [ValidateSet('', 'Preflight', 'CleanupOneOff')]
    [string]$Mode = '',
    [string]$EnvOut = '',
    [string]$RepoRoot = ''
)

# Host-port variables docker-compose.yml reads, plus the one variable that decides which containers
# belong to us. Only these are honoured from .env - the file is parsed, never executed.
$script:TrackerEnvKeys = @(
    'COMPOSE_PROJECT_NAME',
    'DB_PORT',
    'MINIO_PORT',
    'MINIO_CONSOLE_PORT',
    'REDIS_PORT',
    'APP_PORT',
    'FRONTEND_PORT'
)

function Get-TrackerEnvValue {
    param([string]$Name)
    return [Environment]::GetEnvironmentVariable($Name, 'Process')
}

function Set-TrackerEnvValue {
    param([string]$Name, [string]$Value)
    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
}

# Compose reads .env itself; the launcher has to read it too, or a FRONTEND_PORT set there would
# publish the UI on one port while the launcher polls another. Precedence matches Compose: a value
# already in the environment wins over the file.
function Import-TrackerEnvFile {
    param([string]$Path = '.env')

    if (-not (Test-Path -LiteralPath $Path)) { return }

    foreach ($rawLine in (Get-Content -LiteralPath $Path)) {
        $line = $rawLine.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { continue }
        if ($line.StartsWith('export ')) { $line = $line.Substring(7) }

        $separator = $line.IndexOf('=')
        if ($separator -lt 1) { continue }

        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()
        if ($value.Length -ge 2) {
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        # Whitelist, not a dot-source of the file: a stray line in .env can never run a command.
        if ($script:TrackerEnvKeys -notcontains $key) { continue }
        if (-not [string]::IsNullOrEmpty((Get-TrackerEnvValue $key))) { continue }

        Set-TrackerEnvValue $key $value
    }
}

# Mirrors compose-go's NormalizeProjectName: lowercase, drop everything outside [a-z0-9_-], then
# trim leading separators. Needed because one-off `docker compose run` containers are named
# <project>-<service>-run-<hash> and are only findable by their project label.
function Get-TrackerProjectName {
    param([string]$RepoRoot = (Get-Location).Path)

    $explicit = Get-TrackerEnvValue 'COMPOSE_PROJECT_NAME'
    if (-not [string]::IsNullOrEmpty($explicit)) { return $explicit }

    $name = (Split-Path -Leaf $RepoRoot).ToLowerInvariant()
    $name = $name -replace '[^a-z0-9_-]', ''
    return ($name -replace '^[_-]+', '')
}

function Invoke-TrackerDocker {
    param([string[]]$DockerArgs)

    $output = & docker @DockerArgs 2>$null
    if ($null -eq $output) { return @() }
    # PowerShell unrolls a single-element array on return, so every call site wraps this in @(...)
    # rather than trusting the shape of what comes back.
    return @($output | Where-Object { $_ -ne '' })
}

function Test-TrackerPortListener {
    param([int]$Port)

    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $listening)
    }

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(500)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Get-TrackerHostListenerDescription {
    param([int]$Port)

    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) { return '' }

    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $listening) { return '' }

    $process = Get-Process -Id $listening.OwningProcess -ErrorAction SilentlyContinue
    if ($null -eq $process) { return ("pid " + $listening.OwningProcess) }
    return ("pid " + $listening.OwningProcess + " (" + $process.ProcessName + ")")
}

<#
Returns an object with Kind and Detail describing who holds a host port:
  free            - nothing is listening
  tracker-service - a normal container of this Compose project (compose up recreates it in place)
  tracker-oneoff  - a leftover `docker compose run` container of this project (safe to remove)
  other-container - some other container on this daemon
  host-process    - a plain process on this machine
  busy-unknown    - something is listening but we cannot attribute it
#>
function Get-TrackerPortOwner {
    param([int]$Port, [string]$Project)

    $publishFilter = "publish=$Port"
    $projectFilter = "label=com.docker.compose.project=$Project"
    $oneOffFilter = 'label=com.docker.compose.oneoff=True'

    $oneOff = @(Invoke-TrackerDocker @('ps', '--filter', $publishFilter, '--filter', $projectFilter, '--filter', $oneOffFilter, '--format', '{{.Names}}'))
    if ($oneOff.Count -gt 0) {
        return [pscustomobject]@{ Kind = 'tracker-oneoff'; Detail = $oneOff[0] }
    }

    $ours = @(Invoke-TrackerDocker @('ps', '--filter', $publishFilter, '--filter', $projectFilter, '--format', '{{.Names}}'))
    if ($ours.Count -gt 0) {
        return [pscustomobject]@{ Kind = 'tracker-service'; Detail = $ours[0] }
    }

    $foreign = @(Invoke-TrackerDocker @('ps', '--filter', $publishFilter, '--format', '{{.Names}} (image {{.Image}})'))
    if ($foreign.Count -gt 0) {
        return [pscustomobject]@{ Kind = 'other-container'; Detail = $foreign[0] }
    }

    if (-not (Test-TrackerPortListener -Port $Port)) {
        return [pscustomobject]@{ Kind = 'free'; Detail = '' }
    }

    $description = Get-TrackerHostListenerDescription -Port $Port
    if ([string]::IsNullOrEmpty($description)) {
        return [pscustomobject]@{ Kind = 'busy-unknown'; Detail = '' }
    }
    return [pscustomobject]@{ Kind = 'host-process'; Detail = $description }
}

function Remove-TrackerContainer {
    param([string]$Id)
    Invoke-TrackerDocker @('rm', '-f', $Id) | Out-Null
}

# One-off `docker compose run` containers survive `docker compose down` (only `down
# --remove-orphans` collects them) and are invisible to `docker compose ps`, so a killed
# `compose run --service-ports` session keeps its published ports until someone notices. Anything
# not running is pure litter; the running ones are only removed when they sit on a port we need.
function Remove-TrackerStaleOneOffContainer {
    param([string]$Project, [switch]$IncludeRunning)

    $rows = @(Invoke-TrackerDocker @('ps', '-a', '--filter', "label=com.docker.compose.project=$Project", '--filter', 'label=com.docker.compose.oneoff=True', '--format', '{{.ID}}|{{.Names}}|{{.State}}'))
    foreach ($row in $rows) {
        $parts = $row.Split('|')
        if ($parts.Count -lt 3) { continue }
        $id = $parts[0]
        $name = $parts[1]
        $state = $parts[2]
        if (-not $IncludeRunning -and @('running', 'restarting', 'paused') -contains $state) { continue }

        Remove-TrackerContainer -Id $id
        Write-Host "Removed leftover one-off container $name (left behind by 'docker compose run')."
    }
}

function Find-TrackerFreePort {
    param([int]$Start)

    $candidate = $Start
    while (Test-TrackerPortListener -Port $candidate) { $candidate++ }
    return $candidate
}

function Write-TrackerPortConflict {
    param([string]$Variable, [int]$Port, [string]$Label, [string]$Kind, [string]$Detail, [string]$Project)

    Write-Host ''
    Write-Host "ERROR: host port $Port ($Label) is already in use."
    switch ($Kind) {
        'other-container' {
            Write-Host "  Owner: Docker container $Detail, which is not part of the '$Project' Compose project."
            Write-Host "  Free it with 'docker rm -f <name>', or publish Tracker elsewhere:"
        }
        'host-process' {
            Write-Host "  Owner: a process on this machine - $Detail."
            Write-Host '  Stop that process, or publish Tracker elsewhere:'
        }
        default {
            Write-Host "  Something is listening on $Port, but it could not be attributed to a container or process."
            Write-Host '  Stop it, or publish Tracker elsewhere:'
        }
    }
    Write-Host ''
    Write-Host "    set $Variable=<free port> && start-tracker-docker.bat"
    Write-Host ''
    Write-Host "  (or set $Variable in .env - see .env.example. Only the host-side port changes;"
    Write-Host '  containers keep talking to each other on their internal ports.)'
}

# Returns $true when the port is usable (free, already ours, or reclaimed).
function Test-TrackerRequiredPort {
    param([string]$Variable, [int]$Port, [string]$Label, [string]$Project)

    $owner = Get-TrackerPortOwner -Port $Port -Project $Project
    switch ($owner.Kind) {
        'free' { return $true }
        'tracker-service' { return $true }
        'tracker-oneoff' {
            Write-Host "Host port $Port was held by leftover one-off container '$($owner.Detail)' (from 'docker compose run')."
            Write-Host "  Removing it so $Label can bind $Port again."
            Remove-TrackerContainer -Id $owner.Detail
            return $true
        }
        default {
            Write-TrackerPortConflict -Variable $Variable -Port $Port -Label $Label -Kind $owner.Kind -Detail $owner.Detail -Project $Project
            return $false
        }
    }
}

# docker-compose.yml keeps the traditional MinIO host ports as defaults so a plain `docker compose
# up` stays predictable. The launcher is more forgiving: when a *foreign* process owns 9000/9001 and
# the developer has not pinned the variable, publish MinIO on free high ports instead. Only host
# publishing changes - app -> MinIO traffic is always http://minio:9000 on the Compose network.
function Set-TrackerMinioAutoShift {
    param([string]$Variable, [int]$Default, [int]$FirstCandidate, [string]$Project)

    if (-not [string]::IsNullOrEmpty((Get-TrackerEnvValue $Variable))) { return }

    $owner = Get-TrackerPortOwner -Port $Default -Project $Project
    if (@('free', 'tracker-service', 'tracker-oneoff') -contains $owner.Kind) { return }

    $chosen = Find-TrackerFreePort -Start $FirstCandidate
    Set-TrackerEnvValue $Variable ([string]$chosen)
    $detail = $owner.Detail
    if ([string]::IsNullOrEmpty($detail)) { $detail = 'another listener' }
    Write-Host "Host port $Default is in use by $detail; using $Variable=$chosen for this run."
}

function Get-TrackerPortOrDefault {
    param([string]$Variable, [int]$Default)

    $value = Get-TrackerEnvValue $Variable
    if ([string]::IsNullOrEmpty($value)) {
        Set-TrackerEnvValue $Variable ([string]$Default)
        return $Default
    }
    return [int]$value
}

function Invoke-TrackerPreflight {
    param([string]$RepoRoot, [string]$EnvOut)

    Import-TrackerEnvFile -Path (Join-Path $RepoRoot '.env')
    $project = Get-TrackerProjectName -RepoRoot $RepoRoot

    # `docker compose down` does NOT collect one-off `docker compose run` containers, and `docker
    # compose ps` does not show them - so an interrupted `compose run --service-ports` session can
    # keep holding 5173 while everything looks stopped. Clear the dead ones before touching ports.
    Remove-TrackerStaleOneOffContainer -Project $project

    Set-TrackerMinioAutoShift -Variable 'MINIO_PORT' -Default 9000 -FirstCandidate 19000 -Project $project
    Set-TrackerMinioAutoShift -Variable 'MINIO_CONSOLE_PORT' -Default 9001 -FirstCandidate 19001 -Project $project

    $ports = @(
        @{ Variable = 'APP_PORT'; Default = 8080; Label = 'backend API' },
        @{ Variable = 'FRONTEND_PORT'; Default = 5173; Label = 'frontend dev server' },
        @{ Variable = 'DB_PORT'; Default = 5432; Label = 'PostgreSQL' },
        @{ Variable = 'REDIS_PORT'; Default = 6379; Label = 'Redis' },
        @{ Variable = 'MINIO_PORT'; Default = 9000; Label = 'MinIO API' },
        @{ Variable = 'MINIO_CONSOLE_PORT'; Default = 9001; Label = 'MinIO console' }
    )

    if ((Get-TrackerPortOrDefault -Variable 'MINIO_PORT' -Default 9000) -eq
        (Get-TrackerPortOrDefault -Variable 'MINIO_CONSOLE_PORT' -Default 9001)) {
        $bumped = Find-TrackerFreePort -Start ((Get-TrackerPortOrDefault -Variable 'MINIO_PORT' -Default 9000) + 1)
        Set-TrackerEnvValue 'MINIO_CONSOLE_PORT' ([string]$bumped)
    }

    $ok = $true
    foreach ($port in $ports) {
        $resolved = Get-TrackerPortOrDefault -Variable $port.Variable -Default $port.Default
        if (-not (Test-TrackerRequiredPort -Variable $port.Variable -Port $resolved -Label $port.Label -Project $project)) {
            $ok = $false
        }
    }

    if (-not $ok) { return 1 }

    if (-not [string]::IsNullOrEmpty($EnvOut)) {
        $lines = @()
        foreach ($port in $ports) {
            $lines += ('set "' + $port.Variable + '=' + (Get-TrackerEnvValue $port.Variable) + '"')
        }
        Set-Content -LiteralPath $EnvOut -Value $lines -Encoding ASCII
    }
    return 0
}

if ([string]::IsNullOrEmpty($RepoRoot)) {
    if ($PSScriptRoot) {
        $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    } else {
        $RepoRoot = (Get-Location).Path
    }
}

switch ($Mode) {
    'Preflight' {
        exit (Invoke-TrackerPreflight -RepoRoot $RepoRoot -EnvOut $EnvOut)
    }
    'CleanupOneOff' {
        Import-TrackerEnvFile -Path (Join-Path $RepoRoot '.env')
        Remove-TrackerStaleOneOffContainer -Project (Get-TrackerProjectName -RepoRoot $RepoRoot) -IncludeRunning
        exit 0
    }
    default {
        # Dot-sourced as a library: the functions above are all this file provides.
    }
}
