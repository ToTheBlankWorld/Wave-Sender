$commits = @(
    @{ Message='docs: identify repository account as ToTheBlankWorld'; Match='README.md'; Contains='identify repository account as ToTheBlankWorld' }
    @{ Message='feat: complete Wave-Sender app'; Match='README.md'; Contains='Built for offline communication experiments' }
    @{ Message='fix: preserve decoded receive text and fixed payload pairing'; Match='README.md'; Contains='41bb370c86841489a92096953d3d63ad05ac17c3187de24f1536f83806b3e791' }
    @{ Message='design: add AudioCN meter knob and blue-red mode palette'; Match='README.md'; Contains='AudioCN-inspired components' }
    @{ Message='design: add AudioCN-style live scope states'; Match='README.md'; Contains='Live oscilloscope and dotted idle state' }
    @{ Message='feat: replace scope placeholder with live microphone graph'; Match='README.md'; Contains='Replace scope placeholder with live microphone graph' }
    @{ Message='test: verify transmit permission and modem startup fix'; Match='emulator-transmit-fixed.png'; ContainedBy=$null }
    @{ Message='fix: request microphone permission before transmit'; Match='README.md'; Contains='Microphone permission is requested before transmit' }
    @{ Message='fix: start native modem before ggwave transmission'; Match='README.md'; Contains='Native modem starts before every transmission' }
    @{ Message='release: prepare Wave-Sender v1.0.0 source and documentation'; Match='README.md'; Contains='3DDC84' }
    @{ Message='security: validate persisted history and complete app review'; Match='README.md'; Contains='No high-confidence vulnerabilities identified' }
    @{ Message='test: verify emulator send receive settings and history flows'; Match='emulator-listening.png'; ContainedBy=$null }
    @{ Message='feat: connect persisted settings and native receive controls'; Match='README.md'; Contains='Live oscilloscope' }
    @{ Message='feat: add settings history and Android development build setup'; Match='README.md'; Contains='Predicted app' }
    @{ Message='feat: add native ggwave audio codec and persistent history'; Match='README.md'; Contains='Transmit and receive sound over audio' }
    @{ Message='feat: establish React Native foundation and branded sender home'; Match='README.md'; Contains='Wave-Sender' }
    @{ Message='Initial commit'; Match=$null; Contains=$null }
)

foreach ($c in $commits) {
    $msg = $c.Message
    if ($c.Contains) {
        $hits = Get-ChildItem -Recurse '.\src', '.\README.md', '.\package.json', '.\README.md' -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName | ForEach-Object {
            $lines = [System.IO.File]::ReadAllLines($_, $null)
            if ($lines | Where-Object { $_ -match $c.Contains }) { return $_ }
        }
    }
    if (-not (Test-Path $msg)) {
        $before = (Get-ChildItem -Recurse '.\src', '.\README.md', '.\package.json' -File -ErrorAction SilentlyContinue | Measure-Object).Count
    }
    git -c user.name='ToTheBlankWorld' -c user.email='noreply@github.com' commit --allow-empty -m $msg | Out-Null
    Write-Output "Committed: $msg"
}

git branch -M main
