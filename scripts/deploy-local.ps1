# Local Deployment Script for DevOps Project
# This script helps test the production setup locally

param(
    [switch]$Build,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Clean,
    [string]$Service = "",
    [switch]$TunnelStart,
    [switch]$TunnelStop,
    [switch]$TunnelLogs,
    [switch]$AllInOne,
    [switch]$LocalOverride
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Err {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Err "Docker is not running. Please start Docker Desktop."
        return $false
    }
}

function Build-Application {
    Write-Info "Building application..."

    if (!(Test-Path ".env.prod")) {
        Write-Info "Creating .env.prod from example..."
        if (Test-Path ".env.prod.example") {
            Copy-Item ".env.prod.example" ".env.prod"
            Write-Info "Please edit .env.prod with your actual values before starting services."
        } else {
            Write-Err ".env.prod.example not found. Please provide a valid .env.prod."
            throw ".env.prod.example missing"
        }
    }

    docker-compose -f docker-compose.prod.yml build
    Write-Success "Application built successfully!"
}

function Start-Services {
    param([switch]$UseLocalOverride = $false)
    Write-Info "Starting production services..."

    if (!(Test-Path ".env.prod")) {
        Write-Err ".env.prod file not found. Run with -Build first."
        return
    }

    # Create data directories
    $directories = @("data/mysql", "data/prometheus", "data/grafana")
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "Created directory: $dir"
        }
    }

    if ($UseLocalOverride) {
        docker-compose -f docker-compose.prod.yml -f docker-compose.local.yml up -d --build
    }
    else {
        docker-compose -f docker-compose.prod.yml up -d
    }

    Write-Success "Services started successfully!"
    Write-Info "Application: http://localhost:3000"
    Write-Info "Grafana: http://localhost:3001 (admin/admin)"
    Write-Info "Prometheus: http://localhost:9090"

    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 30

    # Health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "Application is healthy!"
        } else {
            Write-Err "Application health check returned status $($response.StatusCode)"
        }
    }
    catch {
        Write-Err "Application health check failed. Check logs with -Logs"
    }
}

function Stop-Services {
    Write-Info "Stopping services..."
    docker-compose -f docker-compose.prod.yml down
    Write-Success "Services stopped!"
}

function Show-Logs {
    if ($Service) {
        Write-Info "Showing logs for service: $Service"
        docker-compose -f docker-compose.prod.yml logs -f $Service
    }
    else {
        Write-Info "Showing logs for all services..."
        docker-compose -f docker-compose.prod.yml logs -f
    }
}

function Clean-Environment {
    Write-Info "Cleaning up environment..."
    docker-compose -f docker-compose.prod.yml down -v --remove-orphans

    # Remove data directories
    $directories = @("data")
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force
            Write-Info "Removed directory: $dir"
        }
    }

    # Clean Docker images
    docker system prune -f
    Write-Success "Environment cleaned!"
}

function Start-Tunnel {
    Write-Info "Starting Cloudflare Tunnel (Quick Tunnel) for app:3000..."
    if (!(Test-Path ".env.prod")) {
        Write-Err ".env.prod file not found. Run with -Build first and configure values."
        return
    }
    # Start only the tunnel service in the same compose project as prod services
    docker-compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml up -d cloudflared
    Write-Success "Cloudflare Tunnel started. Fetching URL from logs..."
    try {
        docker-compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml logs --tail 50 cloudflared
        Write-Info 'If you don''t see the URL above yet, wait a few seconds and run -TunnelLogs.'
    } catch {
        Write-Err "Could not read cloudflared logs. Use -TunnelLogs to retry."
    }
}

function Stop-Tunnel {
    Write-Info "Stopping Cloudflare Tunnel..."
    docker-compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml stop cloudflared | Out-Null
    docker-compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml rm -f cloudflared | Out-Null
    Write-Success "Cloudflare Tunnel stopped and removed."
}

function Logs-Tunnel {
    Write-Info "Tailing Cloudflare Tunnel logs..."
    docker-compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml logs -f cloudflared
}

# Main execution
if (!(Test-DockerRunning)) {
    exit 1
}

if ($Build) {
    Build-Application
}
elseif ($Start) {
    Start-Services
}
elseif ($Stop) {
    Stop-Services
}
elseif ($Logs) {
    Show-Logs
}
elseif ($Clean) {
    Clean-Environment
}
elseif ($TunnelStart) {
    Start-Tunnel
}
elseif ($TunnelStop) {
    Stop-Tunnel
}
elseif ($TunnelLogs) {
    Logs-Tunnel
}
elseif ($AllInOne) {
    Build-Application
    Start-Services -UseLocalOverride:$LocalOverride
    Start-Tunnel
}
else {
    Write-Host "DevOps Local Deployment Script"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\deploy-local.ps1 -Build          # Build the application"
    Write-Host "  .\deploy-local.ps1 -Start          # Start all services"
    Write-Host "  .\deploy-local.ps1 -Stop           # Stop all services"
    Write-Host "  .\deploy-local.ps1 -Logs           # Show logs for all services"
    Write-Host "  .\deploy-local.ps1 -Logs -Service app  # Show logs for specific service"
    Write-Host "  .\deploy-local.ps1 -Clean          # Clean up everything"
    Write-Host "  .\deploy-local.ps1 -AllInOne       # Build + Start + Quick Tunnel"
    Write-Host "  .\deploy-local.ps1 -AllInOne -LocalOverride  # AllInOne using docker-compose.local override"
    Write-Host ""
    Write-Host "  # Cloudflare Tunnel (public URL without opening ports)"
    Write-Host "  .\deploy-local.ps1 -TunnelStart    # Start tunnel for http://localhost:3000"
    Write-Host "  .\deploy-local.ps1 -TunnelLogs     # Tail tunnel logs to see the public URL"
    Write-Host "  .\deploy-local.ps1 -TunnelStop     # Stop and remove the tunnel"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy-local.ps1 -Build"
    Write-Host "  .\deploy-local.ps1 -Start"
    Write-Host "  .\deploy-local.ps1 -Logs -Service mysql"
    Write-Host "  .\deploy-local.ps1 -Stop"
    Write-Host "  .\deploy-local.ps1 -TunnelStart"
    Write-Host "  .\deploy-local.ps1 -TunnelLogs"
    Write-Host "  .\deploy-local.ps1 -TunnelStop"
}