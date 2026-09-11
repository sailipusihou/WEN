# ============================================================
# Low Flame 一键部署脚本（在本地 Windows 电脑运行）
#
# 作用：本地代码改动 -> 推送 GitHub -> 服务器自动更新上线
#
# 用法：
#   .\scripts\deploy\deploy.ps1
#   或带改动说明：.\scripts\deploy\deploy.ps1 "修复了商品页价格显示"
#
# 首次使用会提示输入服务器密码（也可提前设置环境变量 SSH_PASS）
# ============================================================

param(
    [string]$Message = ""
)

# 注意：不使用 Stop，否则 git 的 warning（stderr）会导致脚本中断
$ErrorActionPreference = "Continue"

# ---------- 配置区 ----------
$ServerIP   = "43.110.46.49"
$AppDir     = "/var/www/lowflame"
$Proxy      = "http://127.0.0.1:7890"
# ----------------------------

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $ProjectDir

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Low Flame 一键部署" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "项目目录: $ProjectDir"
Write-Host "目标服务器: $ServerIP"
Write-Host ""

# ---------- 0. 获取服务器密码 ----------
if (-not $env:SSH_PASS) {
    Write-Host "未检测到环境变量 SSH_PASS" -ForegroundColor Yellow
    try {
        $env:SSH_PASS = Read-Host "请输入服务器 root 密码"
    } catch {
        Write-Host "无法读取输入。请先设置环境变量：" -ForegroundColor Red
        Write-Host '  $env:SSH_PASS="你的密码"' -ForegroundColor Gray
        exit 1
    }
}
if (-not $env:SSH_PASS) {
    Write-Host "密码为空，已取消。" -ForegroundColor Red
    exit 1
}

# ---------- 1. 检查本地改动 ----------
$changes = git status --porcelain 2>&1
$needCommit = $false

if ($changes) {
    Write-Host "[1/4] 检测到本地改动：" -ForegroundColor Green
    git status --short 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    $needCommit = $true
    Write-Host ""
} else {
    Write-Host "[1/4] 本地无代码改动" -ForegroundColor Yellow
}

# ---------- 2. 提交并推送 ----------
if ($needCommit) {
    if (-not $Message) {
        try {
            $Message = Read-Host "请输入本次改动说明"
        } catch {
            $Message = ""
        }
    }
    if (-not $Message) {
        $Message = "update: 内容更新"
    }

    Write-Host "[2/4] 提交改动..." -ForegroundColor Green
    git add -A 2>&1 | Out-Null
    git commit -m $Message 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "提交失败（可能没有实际变化）" -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/4] 跳过提交" -ForegroundColor Gray
}

Write-Host "[2/4] 推送代码到 GitHub（经代理 $Proxy）..." -ForegroundColor Green
git -c http.proxy=$Proxy -c https.proxy=$Proxy push origin master 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "推送失败！请确认 FlClash 代理已开启（端口 7890）" -ForegroundColor Red
    exit 1
}
Write-Host "    推送成功" -ForegroundColor Green
Write-Host ""

# ---------- 3. 检查部署工具 ----------
node -e "require('ssh2')" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[3/4] 首次运行，安装部署工具（约 30 秒）..." -ForegroundColor Yellow
    npm install ssh2 --no-save 2>&1 | Out-Null
} else {
    Write-Host "[3/4] 部署工具就绪" -ForegroundColor Green
}

# ---------- 4. 服务器更新 ----------
Write-Host ""
Write-Host "[4/4] 在服务器上更新（拉代码 -> 装依赖 -> 构建 -> 重启）" -ForegroundColor Green
Write-Host "     预计 1-2 分钟，请耐心等待..." -ForegroundColor Gray
Write-Host ""

$sshScript = Join-Path $ScriptDir "ssh-run.cjs"
node $sshScript run "bash $AppDir/scripts/deploy/update.sh 2>&1 | tail -25"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "服务器更新失败，请查看上面的错误信息" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "  网站: https://lowflame.store" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
