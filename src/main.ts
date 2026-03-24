import './style.css'

type Phase = 'ready' | 'aiming' | 'dash' | 'upgrade' | 'victory' | 'defeat'
type EnemyKind = 'chaser' | 'burst' | 'shooter' | 'boss'

type Upgrade = {
  id: string
  name: string
  desc: string
  apply: (state: GameState) => void
}

type GameState = {
  phase: Phase
  level: number
  score: number
  hp: number
  maxHp: number
  combo: number
  bestCombo: number
  dashPower: number
  dashWidth: number
  reverseCharges: number
  reverseActive: boolean
  kills: number
  build: string[]
  bossIncoming: boolean
  slowmo: number
}

type Enemy = {
  id: number
  x: number
  y: number
  r: number
  hp: number
  speed: number
  kind: EnemyKind
  alive: boolean
  flash: number
  vx?: number
  vy?: number
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
<div class="shell">
  <header class="topbar">
    <div>
      <div class="eyebrow">微信 H5 动作爽游原型 · Vertical Slice</div>
      <h1>一秒翻盘</h1>
      <p class="subtitle">拖拽瞄准，松手冲刺。残血进入逆转时刻，把濒死局势硬生生打成神反杀。</p>
    </div>
    <div class="topbar-actions">
      <button id="muteBtn" class="ghost-btn">音效：开</button>
      <button id="restartBtn" class="ghost-btn">重开一局</button>
    </div>
  </header>

  <section class="hero-strip card">
    <div>
      <span class="mini">核心卖点</span>
      <strong>10 秒上手，30 秒上头</strong>
    </div>
    <div>
      <span class="mini">当前版本</span>
      <strong>Boss / Build / 逆转闭环已接通</strong>
    </div>
    <div>
      <span class="mini">目标场景</span>
      <strong>微信内竖屏试玩与 Demo 演示</strong>
    </div>
  </section>

  <section class="hud">
    <div class="card stat-card">
      <div class="stat-head">
        <span>生命</span>
        <em id="dangerTag" class="danger-tag hidden">逆转临界</em>
      </div>
      <div class="bar"><i id="hpBar"></i></div>
      <strong id="hpText">100 / 100</strong>
    </div>
    <div class="card stats-grid">
      <div><span>关卡</span><strong id="levelText">1</strong></div>
      <div><span>分数</span><strong id="scoreText">0</strong></div>
      <div><span>连击</span><strong id="comboText">0</strong></div>
      <div><span>逆转</span><strong id="reverseText">1</strong></div>
    </div>
  </section>

  <section class="arena-wrap">
    <canvas id="game" width="390" height="720"></canvas>
    <div class="overlay status" id="status"></div>
    <div class="overlay combo-float hidden" id="comboFloat"></div>
    <div class="overlay tip" id="tip">按住拖拽，松手冲刺。撞穿敌人，残血时会亮起逆转时刻。</div>
    <div class="overlay flash hidden" id="flashText"></div>
    <div class="overlay center hidden" id="upgradePanel">
      <div class="panel">
        <div class="panel-title">选一个强化</div>
        <div class="panel-subtitle">每一关都要更疯一点。</div>
        <div class="upgrade-list" id="upgradeList"></div>
      </div>
    </div>
    <div class="overlay center hidden" id="endPanel">
      <div class="panel end-panel">
        <div class="panel-title" id="endTitle">这把很秀</div>
        <p id="endDesc"></p>
        <div class="summary" id="summary"></div>
        <button id="endRestartBtn" class="primary-btn">再来一把</button>
      </div>
    </div>
  </section>

  <section class="bottom-sheet">
    <div class="card instruction-card">
      <h2>爽点节奏</h2>
      <ol>
        <li>单指拖拽，立刻看懂玩法</li>
        <li>松手高速冲刺，吃到撞击反馈</li>
        <li>残血进入逆转时刻，制造翻盘高潮</li>
        <li>清场后强化 Build，形成每局差异</li>
        <li>第 3 关 Boss 战验证完整循环</li>
      </ol>
    </div>
    <div class="card build-card">
      <div class="build-header">
        <h2>本局 Build</h2>
        <span id="buildMood">还在热身</span>
      </div>
      <div id="buildTags" class="tags"><span>未成型</span></div>
    </div>
  </section>
</div>
`

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ctx = canvas.getContext('2d')!

const hpBar = document.querySelector<HTMLElement>('#hpBar')!
const hpText = document.querySelector<HTMLElement>('#hpText')!
const levelText = document.querySelector<HTMLElement>('#levelText')!
const scoreText = document.querySelector<HTMLElement>('#scoreText')!
const comboText = document.querySelector<HTMLElement>('#comboText')!
const reverseText = document.querySelector<HTMLElement>('#reverseText')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const tipEl = document.querySelector<HTMLElement>('#tip')!
const buildTags = document.querySelector<HTMLElement>('#buildTags')!
const buildMood = document.querySelector<HTMLElement>('#buildMood')!
const dangerTag = document.querySelector<HTMLElement>('#dangerTag')!
const comboFloat = document.querySelector<HTMLElement>('#comboFloat')!
const upgradePanel = document.querySelector<HTMLElement>('#upgradePanel')!
const upgradeList = document.querySelector<HTMLElement>('#upgradeList')!
const endPanel = document.querySelector<HTMLElement>('#endPanel')!
const endTitle = document.querySelector<HTMLElement>('#endTitle')!
const endDesc = document.querySelector<HTMLElement>('#endDesc')!
const summary = document.querySelector<HTMLElement>('#summary')!
const flashText = document.querySelector<HTMLElement>('#flashText')!
const muteBtn = document.querySelector<HTMLButtonElement>('#muteBtn')!

const audioCtx = typeof window !== 'undefined' && 'AudioContext' in window ? new AudioContext() : null
let audioEnabled = true
let comboFloatTimer = 0
let flashTimer = 0
let hintTimer = 0
let firstDashDone = false
let bossHintShown = false

function setMuteLabel() {
  muteBtn.textContent = `音效：${audioEnabled ? '开' : '关'}`
}

muteBtn.addEventListener('click', async () => {
  audioEnabled = !audioEnabled
  setMuteLabel()
  if (audioEnabled && audioCtx?.state === 'suspended') {
    await audioCtx.resume().catch(() => undefined)
  }
})

document.querySelector('#restartBtn')!.addEventListener('click', resetGame)
document.querySelector('#endRestartBtn')!.addEventListener('click', resetGame)

const W = canvas.width
const H = canvas.height

const player = { x: W / 2, y: H - 110, r: 16, vx: 0, vy: 0, flash: 0 }

let game: GameState
let enemies: Enemy[] = []
let particles: Particle[] = []
let enemyId = 0
let aiming = false
let aimX = 0
let aimY = 0
let lastTime = 0
let levelResolved = false

const upgrades: Upgrade[] = [
  { id: 'power', name: '暴烈冲刺', desc: '冲刺伤害大幅提升，碰撞更狠。', apply: (s) => { s.dashPower += 10; s.build.push('暴烈冲刺') } },
  { id: 'width', name: '裂空轨迹', desc: '冲刺判定更宽，更容易清场。', apply: (s) => { s.dashWidth += 8; s.build.push('裂空轨迹') } },
  { id: 'reverse', name: '逆转心流', desc: '额外获得 1 次逆转机会，残局更能翻。', apply: (s) => { s.reverseCharges += 1; s.build.push('逆转心流') } },
  { id: 'heal', name: '余烬回路', desc: '立刻回复 30 生命，并提升最大生命。', apply: (s) => { s.maxHp += 10; s.hp = Math.min(s.maxHp, s.hp + 30); s.build.push('余烬回路') } },
  { id: 'combo', name: '连锁渴望', desc: '连击更容易叠高，分数增长更快。', apply: (s) => { s.combo += 2; s.build.push('连锁渴望') } },
]

function freshState(): GameState {
  return { phase: 'ready', level: 1, score: 0, hp: 100, maxHp: 100, combo: 0, bestCombo: 0, dashPower: 22, dashWidth: 0, reverseCharges: 1, reverseActive: false, kills: 0, build: [], bossIncoming: false, slowmo: 0 }
}

function playTone(freq: number, duration = 0.08, type: OscillatorType = 'sine', gainValue = 0.035) {
  if (!audioEnabled || !audioCtx) return
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => undefined)
  }
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.value = gainValue
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + duration)
}

function pulseSound(kind: 'dash' | 'hit' | 'kill' | 'reverse' | 'boss') {
  if (kind === 'dash') {
    playTone(190, 0.09, 'triangle', 0.04)
    playTone(260, 0.06, 'sine', 0.022)
  } else if (kind === 'hit') {
    playTone(280, 0.05, 'square', 0.022)
  } else if (kind === 'kill') {
    playTone(520, 0.08, 'triangle', 0.03)
    playTone(760, 0.12, 'sine', 0.02)
  } else if (kind === 'reverse') {
    playTone(180, 0.2, 'sawtooth', 0.03)
    playTone(480, 0.25, 'triangle', 0.026)
  } else if (kind === 'boss') {
    playTone(120, 0.18, 'square', 0.03)
    playTone(150, 0.24, 'triangle', 0.026)
  }
}

function showFlash(text: string, danger = false) {
  flashText.textContent = text
  flashText.classList.remove('hidden', 'danger')
  if (danger) flashText.classList.add('danger')
  flashTimer = 0.75
}

function showCombo(text: string) {
  comboFloat.textContent = text
  comboFloat.classList.remove('hidden')
  comboFloatTimer = 0.6
}

function resetGame() {
  game = freshState()
  Object.assign(player, { x: W / 2, y: H - 110, vx: 0, vy: 0, flash: 0 })
  particles = []
  enemies = []
  enemyId = 0
  aiming = false
  levelResolved = false
  firstDashDone = false
  bossHintShown = false
  hintTimer = 0
  comboFloat.classList.add('hidden')
  flashText.classList.add('hidden')
  upgradePanel.classList.add('hidden')
  endPanel.classList.add('hidden')
  tipEl.textContent = '按住拖拽，松手冲刺。撞穿敌人，残血时会亮起逆转时刻。'
  statusEl.textContent = '第一关 · 先打出第一波爽感'
  spawnLevel()
  updateHud()
}

function makeEnemy(kind: EnemyKind, x?: number, y?: number): Enemy {
  if (kind === 'boss') return { id: ++enemyId, x: x ?? W / 2, y: y ?? 150, r: 34, hp: 170, speed: 42, kind, alive: true, flash: 0, vx: 110, vy: 0 }
  return {
    id: ++enemyId,
    x: x ?? 50 + Math.random() * (W - 100),
    y: y ?? 70 + Math.random() * (H * 0.45),
    r: kind === 'burst' ? 13 : kind === 'shooter' ? 15 : 14,
    hp: kind === 'burst' ? 12 + game.level * 3 : kind === 'shooter' ? 16 + game.level * 4 : 18 + game.level * 5,
    speed: kind === 'chaser' ? 42 + game.level * 4 : kind === 'burst' ? 28 + game.level * 3 : 18 + game.level * 2,
    kind,
    alive: true,
    flash: 0,
  }
}

function spawnLevel() {
  enemies = []
  levelResolved = false
  if (game.level === 3) {
    game.bossIncoming = true
    enemies.push(makeEnemy('boss'))
    enemies.push(makeEnemy('shooter', 90, 250))
    enemies.push(makeEnemy('burst', 300, 270))
    statusEl.textContent = 'Boss 登场 · 坍缩之眼'
    tipEl.textContent = 'Boss 会横向压迫。先切小怪，再回身打核心。'
    showFlash('BOSS 来了')
    pulseSound('boss')
  } else {
    game.bossIncoming = false
    const total = Math.min(3 + game.level, 8)
    for (let i = 0; i < total; i += 1) {
      const kinds: EnemyKind[] = ['chaser', 'burst', 'shooter']
      const kind = kinds[Math.min(kinds.length - 1, Math.floor(Math.random() * Math.min(1 + game.level / 2, 3)))]
      enemies.push(makeEnemy(kind))
    }
  }
  game.phase = 'ready'
}

function chooseUpgrades() {
  game.phase = 'upgrade'
  upgradePanel.classList.remove('hidden')
  const choices = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3)
  upgradeList.innerHTML = ''
  choices.forEach((upgrade) => {
    const button = document.createElement('button')
    button.className = 'upgrade-btn'
    button.innerHTML = `<strong>${upgrade.name}</strong><span>${upgrade.desc}</span>`
    button.addEventListener('click', () => {
      upgrade.apply(game)
      upgradePanel.classList.add('hidden')
      game.level += 1
      pulseSound('kill')
      if (game.level > 4) finishGame(true)
      else {
        statusEl.textContent = `第 ${game.level} 关 · Build 继续发疯`
        tipEl.textContent = game.level === 3 ? '下一关会进 Boss，先准备一波大的。' : '继续压节奏，把这局 Build 堆起来。'
        spawnLevel()
        updateHud()
      }
    })
    upgradeList.appendChild(button)
  })
}

function finishGame(victory: boolean) {
  game.phase = victory ? 'victory' : 'defeat'
  endPanel.classList.remove('hidden')
  endTitle.textContent = victory ? '漂亮，这把通了' : '差一点就翻盘了'
  endDesc.textContent = victory ? '这一版已经有 demo 质感了：上手快、反馈足、闭环完整。' : '这把已经有那个味儿了，再来一局很容易打出真正神图。'
  summary.innerHTML = `
    <div><span>最终关卡</span><strong>${game.level}</strong></div>
    <div><span>分数</span><strong>${game.score}</strong></div>
    <div><span>击杀</span><strong>${game.kills}</strong></div>
    <div><span>最高连击</span><strong>${game.bestCombo}</strong></div>
  `
}

function updateHud() {
  const hpRate = game.hp / game.maxHp
  hpBar.style.width = `${hpRate * 100}%`
  hpText.textContent = `${Math.max(0, Math.ceil(game.hp))} / ${game.maxHp}`
  levelText.textContent = String(game.level)
  scoreText.textContent = String(game.score)
  comboText.textContent = String(game.combo)
  reverseText.textContent = String(game.reverseCharges)
  buildTags.innerHTML = game.build.length ? game.build.map((tag) => `<span>${tag}</span>`).join('') : '<span>未成型</span>'
  buildMood.textContent = game.build.length >= 4 ? '已经成型' : game.build.length >= 2 ? '逐渐离谱' : '还在热身'
  if (hpRate < 0.25 && game.reverseCharges > 0) {
    statusEl.textContent = '逆转时刻已亮起 · 残血才是你的主场'
    dangerTag.classList.remove('hidden')
  } else {
    dangerTag.classList.add('hidden')
  }
}

function screenShake(intensity = 8) {
  canvas.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`
  setTimeout(() => { canvas.style.transform = 'translate(0,0)' }, 60)
}

function burst(x: number, y: number, color: string, count = 18) {
  for (let i = 0; i < count; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.7 + Math.random() * 0.4, size: 2 + Math.random() * 4, color })
}

function tryReverse() {
  if (game.hp / game.maxHp < 0.25 && game.reverseCharges > 0 && !game.reverseActive) {
    game.reverseActive = true
    game.reverseCharges -= 1
    game.slowmo = 0.8
    player.flash = 0.9
    burst(player.x, player.y, '#8ef7ff', 26)
    screenShake(12)
    statusEl.textContent = '逆转启动 · 一波清场！'
    tipEl.textContent = '现在别怂，冲进去收人头。'
    showFlash('逆转时刻', true)
    showCombo('翻盘启动')
    pulseSound('reverse')
    updateHud()
  }
}

function pointerToCanvas(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
}

canvas.addEventListener('pointerdown', (e) => {
  if (game.phase !== 'ready') return
  aiming = true
  game.phase = 'aiming'
  const pos = pointerToCanvas(e)
  aimX = pos.x
  aimY = pos.y
})
canvas.addEventListener('pointermove', (e) => {
  if (!aiming) return
  const pos = pointerToCanvas(e)
  aimX = pos.x
  aimY = pos.y
})
window.addEventListener('pointerup', () => {
  if (!aiming || game.phase !== 'aiming') return
  aiming = false
  const dx = player.x - aimX
  const dy = player.y - aimY
  const len = Math.max(40, Math.hypot(dx, dy))
  const power = Math.min(560, len * 2.45)
  player.vx = (dx / len) * power
  player.vy = (dy / len) * power
  game.phase = 'dash'
  tipEl.textContent = '好，继续找角度。残血时会爆出逆转时刻。'
  if (!firstDashDone) {
    firstDashDone = true
    showFlash('冲！')
  }
  pulseSound('dash')
})

function hitEnemy(enemy: Enemy) {
  const damage = game.dashPower + (game.reverseActive ? 22 : 0) + (enemy.kind === 'boss' ? 2 : 0)
  enemy.hp -= damage
  enemy.flash = 0.14
  game.combo += 1
  game.bestCombo = Math.max(game.bestCombo, game.combo)
  game.score += 20 + game.combo * 3
  game.slowmo = Math.max(game.slowmo, 0.08)
  burst(enemy.x, enemy.y, enemy.kind === 'burst' ? '#ff7a7a' : enemy.kind === 'boss' ? '#ffd26a' : '#9f7aff', 10)
  pulseSound('hit')

  if (game.combo > 0 && game.combo % 5 === 0) {
    showCombo(`${game.combo} 连击`)
  }

  if (enemy.hp <= 0) {
    enemy.alive = false
    game.kills += 1
    game.score += enemy.kind === 'boss' ? 600 : 60 + game.level * 10
    burst(enemy.x, enemy.y, enemy.kind === 'burst' ? '#ff9469' : enemy.kind === 'boss' ? '#fff099' : '#7cf3ff', enemy.kind === 'boss' ? 46 : 22)
    screenShake(enemy.kind === 'boss' ? 18 : enemy.kind === 'burst' ? 14 : 8)
    showFlash(enemy.kind === 'boss' ? 'Boss 击破' : '清场击杀')
    pulseSound('kill')
    if (enemy.kind === 'burst') {
      enemies.forEach((other) => {
        if (!other.alive) return
        const d = Math.hypot(other.x - enemy.x, other.y - enemy.y)
        if (d < 90) {
          other.hp -= 12
          other.flash = 0.18
        }
      })
    }
    if (game.reverseActive) game.hp = Math.min(game.maxHp, game.hp + 8)
  }
}

function update(dtRaw: number) {
  const dt = dtRaw * (game.slowmo > 0 ? 0.45 : 1)
  if (game.phase === 'victory' || game.phase === 'defeat' || game.phase === 'upgrade') return

  if (game.slowmo > 0) game.slowmo = Math.max(0, game.slowmo - dtRaw * 1.2)
  if (flashTimer > 0) {
    flashTimer -= dtRaw
    if (flashTimer <= 0) flashText.classList.add('hidden')
  }
  if (comboFloatTimer > 0) {
    comboFloatTimer -= dtRaw
    if (comboFloatTimer <= 0) comboFloat.classList.add('hidden')
  }

  hintTimer += dtRaw
  if (!firstDashDone && hintTimer > 5) {
    tipEl.textContent = '拖出一条线，再松手。第一下先把手感吃进去。'
    hintTimer = -999
  }
  if (game.level === 3 && !bossHintShown && game.phase === 'ready') {
    bossHintShown = true
    showFlash('先切小怪')
  }

  particles = particles.filter((p) => p.life > 0)
  particles.forEach((p) => {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.96
    p.vy *= 0.96
  })

  enemies.forEach((enemy) => {
    if (!enemy.alive) return
    enemy.flash = Math.max(0, enemy.flash - dt)
    if (enemy.kind === 'boss') {
      enemy.x += (enemy.vx ?? 0) * dt
      if (enemy.x < 60 || enemy.x > W - 60) enemy.vx = -(enemy.vx ?? 0)
      const by = 150 + Math.sin(performance.now() / 500) * 18
      enemy.y += (by - enemy.y) * 0.06
    } else {
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      const d = Math.hypot(dx, dy) || 1
      if (game.phase !== 'dash') {
        enemy.x += (dx / d) * enemy.speed * dt
        enemy.y += (dy / d) * enemy.speed * dt
      }
    }
    const d = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    if (d < enemy.r + player.r + 2) {
      const damageRate = enemy.kind === 'boss' ? 18 : enemy.kind === 'shooter' ? 10 : 14
      game.hp -= damageRate * dt * 10
      game.combo = Math.max(0, game.combo - 1)
      tryReverse()
      if (game.hp <= 0) finishGame(false)
    }
  })

  if (game.phase === 'dash') {
    const speedMul = game.reverseActive ? 1.18 : 1
    player.x += player.vx * dt * speedMul
    player.y += player.vy * dt * speedMul
    player.vx *= 0.985
    player.vy *= 0.985
    if (player.x < player.r || player.x > W - player.r) {
      player.vx *= -1
      player.x = Math.min(W - player.r, Math.max(player.r, player.x))
      screenShake(6)
      game.slowmo = Math.max(game.slowmo, 0.04)
    }
    if (player.y < player.r || player.y > H - player.r) {
      player.vy *= -1
      player.y = Math.min(H - player.r, Math.max(player.r, player.y))
      screenShake(6)
      game.slowmo = Math.max(game.slowmo, 0.04)
    }
    enemies.forEach((enemy) => {
      if (!enemy.alive) return
      const d = Math.hypot(enemy.x - player.x, enemy.y - player.y)
      if (d < enemy.r + player.r + game.dashWidth) hitEnemy(enemy)
    })
    if (Math.hypot(player.vx, player.vy) < 28) {
      player.vx = 0
      player.vy = 0
      game.phase = 'ready'
      game.reverseActive = false
    }
  }

  enemies = enemies.filter((enemy) => enemy.alive)
  if (enemies.length === 0 && !levelResolved) {
    levelResolved = true
    game.score += game.bossIncoming ? 500 : 100
    statusEl.textContent = game.bossIncoming ? 'Boss 已倒下 · 去拿最终强化' : `第 ${game.level} 关清场 · 选个强化继续疯`
    tipEl.textContent = game.bossIncoming ? '这波打得漂亮，拿强化收尾。' : '强化是这局的第二个爽点，选个最离谱的。'
    updateHud()
    setTimeout(() => chooseUpgrades(), 460)
  }

  player.flash = Math.max(0, player.flash - dt)
  updateHud()
}

function drawArena() {
  ctx.clearRect(0, 0, W, H)
  const gradient = ctx.createLinearGradient(0, 0, 0, H)
  gradient.addColorStop(0, '#060816')
  gradient.addColorStop(1, '#120b24')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = `rgba(120,120,255,${0.03 + (i % 3) * 0.015})`
    ctx.fillRect(0, i * 42 + ((Date.now() / 40) % 42), W, 1)
  }

  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  })

  enemies.forEach((enemy) => {
    const color = enemy.kind === 'burst' ? '#ff7b72' : enemy.kind === 'shooter' ? '#ffe16b' : enemy.kind === 'boss' ? '#ffd56f' : '#9d8cff'
    ctx.save()
    ctx.translate(enemy.x, enemy.y)
    ctx.shadowBlur = enemy.kind === 'boss' ? 28 : 16
    ctx.shadowColor = color
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = enemy.kind === 'boss' ? 4 : 2
    ctx.strokeStyle = enemy.kind === 'boss' ? 'rgba(255,240,180,0.65)' : 'rgba(255,255,255,0.35)'
    ctx.stroke()
    if (enemy.kind === 'boss') {
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke()
    }
    if (enemy.flash > 0) {
      ctx.globalAlpha = enemy.flash * 2.8
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, enemy.r + 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  })

  if (aiming) {
    ctx.strokeStyle = 'rgba(120,245,255,0.95)'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(player.x, player.y)
    ctx.lineTo(aimX, aimY)
    ctx.stroke()
    ctx.setLineDash([])

    const dragPower = Math.min(1, Math.hypot(player.x - aimX, player.y - aimY) / 220)
    ctx.beginPath()
    ctx.arc(player.x, player.y, 28 + dragPower * 18, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(145,246,255,${0.15 + dragPower * 0.45})`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(player.x, player.y)
  ctx.shadowBlur = game.reverseActive ? 28 : 18
  ctx.shadowColor = game.reverseActive ? '#91f6ff' : '#78b7ff'
  ctx.fillStyle = game.reverseActive ? '#d5ffff' : '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 0, player.r + (player.flash > 0 ? 2 : 0), 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(120,183,255,0.45)'
  ctx.stroke()
  ctx.restore()

  if (game.hp / game.maxHp < 0.25 && game.reverseCharges > 0) {
    ctx.fillStyle = 'rgba(255,90,120,0.08)'
    ctx.fillRect(0, 0, W, H)
  }
}

function loop(ts: number) {
  const dt = Math.min(0.024, (ts - lastTime) / 1000 || 0.016)
  lastTime = ts
  update(dt)
  drawArena()
  requestAnimationFrame(loop)
}

setMuteLabel()
resetGame()
requestAnimationFrame(loop)
