import './style.css'

type Phase = 'ready' | 'aiming' | 'dash' | 'upgrade' | 'victory' | 'defeat'
type EnemyKind = 'chaser' | 'burst' | 'shooter' | 'boss'
type Screen = 'intro' | 'game'

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
  dashTrail: number
  critWindow: number
  dashCount: number
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
  orbit?: number
  cooldown?: number
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

type TrailMark = {
  x: number
  y: number
  r: number
  life: number
  color: string
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
<div class="shell shell-intro" id="shell">
  <section class="intro-screen" id="introScreen">
    <div class="intro-card card">
      <div class="eyebrow">团队开发中 · 微信 H5 可玩原型</div>
      <h1>一秒翻盘</h1>
      <p class="subtitle intro-subtitle">拖拽瞄准，松手冲刺。残血触发逆转时刻，把这局从快输打成神反杀。</p>

      <div class="hero-strip intro-strip">
        <div>
          <span class="mini">目标</span>
          <strong>10 秒上手，30 秒上头</strong>
        </div>
        <div>
          <span class="mini">版本</span>
          <strong>Boss / 强化 / 逆转闭环</strong>
        </div>
      </div>

      <div class="intro-block">
        <h2>怎么玩</h2>
        <div class="quick-rules quick-rules-large">
          <span>按住拖拽瞄准</span>
          <span>松手冲刺穿怪</span>
          <span>残血触发逆转</span>
          <span>第 3 关迎战 Boss</span>
        </div>
      </div>

      <div class="intro-block intro-list">
        <div><strong>爽点：</strong> 一条线穿两只，连击和闪字一起爆。</div>
        <div><strong>策略：</strong> 先切脆皮，再吃强化，Build 会越来越成型。</div>
        <div><strong>提示：</strong> 这是竖屏手感原型，建议手机直接打开试玩。</div>
      </div>

      <div class="intro-actions">
        <button id="startBtn" class="primary-btn">开始游戏</button>
        <button id="openHelpBtn" class="ghost-btn">先看看帮助</button>
      </div>
    </div>
  </section>

  <section class="game-screen hidden" id="gameScreen">
    <header class="topbar compact-topbar">
      <div class="topbar-copy compact-copy">
        <div class="eyebrow">一秒翻盘</div>
        <p class="subtitle compact-subtitle">先活下来，再打出神反杀。</p>
      </div>
      <div class="topbar-actions compact-actions">
        <button id="helpBtn" class="ghost-btn slim-btn">帮助</button>
        <button id="restartBtn" class="ghost-btn slim-btn">重开</button>
      </div>
    </header>

    <section class="hud compact-hud">
      <div class="card stat-card">
        <div class="stat-head">
          <span>生命</span>
          <em id="dangerTag" class="danger-tag hidden">危险但能翻</em>
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

    <section class="arena-wrap arena-main">
      <canvas id="game" width="390" height="720"></canvas>
      <div class="overlay status" id="status"></div>
      <div class="overlay flash hidden" id="flashText"></div>
      <div class="overlay combo-float hidden" id="comboFloat"></div>
      <div class="overlay tip" id="tip">按住拖拽，松手冲刺。撞穿敌人，残血时会亮起逆转时刻。</div>
      <div class="overlay center hidden" id="upgradePanel">
        <div class="panel">
          <div class="panel-title">选一个强化</div>
          <div class="panel-subtitle">这一把的风格，开始长出来了。</div>
          <div class="upgrade-list" id="upgradeList"></div>
        </div>
      </div>
      <div class="overlay center hidden" id="endPanel">
        <div class="panel end-panel">
          <div class="panel-title" id="endTitle">这把很秀</div>
          <p id="endDesc"></p>
          <div class="summary" id="summary"></div>
          <div class="end-actions">
            <button id="endHelpBtn" class="ghost-btn">查看帮助</button>
            <button id="endRestartBtn" class="primary-btn">再来一把</button>
          </div>
        </div>
      </div>
    </section>

    <section class="bottom-sheet single-line-sheet game-build-strip">
      <div class="card build-card compact-card full-width-card">
        <div class="build-inline">
          <h2>本局 Build</h2>
          <div id="buildTags" class="tags"><span>未成型</span></div>
        </div>
      </div>
    </section>
  </section>

  <div class="modal hidden" id="helpModal">
    <div class="modal-backdrop" id="helpBackdrop"></div>
    <div class="modal-panel panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">帮助 / 游戏说明</div>
          <div class="panel-subtitle">先懂规则，再进主窗口狠狠干。</div>
        </div>
        <button id="closeHelpBtn" class="ghost-btn slim-btn">关闭</button>
      </div>
      <div class="help-grid">
        <div class="help-card">
          <h3>核心操作</h3>
          <p>按住拖拽瞄准，松手后角色会朝反方向高速冲刺。冲刺中撞到敌人就会造成伤害。</p>
        </div>
        <div class="help-card">
          <h3>逆转机制</h3>
          <p>生命过低时会亮起逆转窗口。抓住这一波穿怪，往往能直接反杀翻盘。</p>
        </div>
        <div class="help-card">
          <h3>敌人与 Boss</h3>
          <p>小怪分追击、扑脸、绕压三类。第 3 关会出现 Boss，先清小怪更稳。</p>
        </div>
        <div class="help-card">
          <h3>Build 方向</h3>
          <p>暴烈冲刺偏爆发，裂空轨迹偏手感，逆转心流偏容错，回血类适合稳通关。</p>
        </div>
      </div>
      <div class="modal-actions">
        <button id="playFromHelpBtn" class="primary-btn">进入游戏</button>
      </div>
    </div>
  </div>
</div>
`

const shell = document.querySelector<HTMLElement>('#shell')!
const introScreen = document.querySelector<HTMLElement>('#introScreen')!
const gameScreen = document.querySelector<HTMLElement>('#gameScreen')!
const helpModal = document.querySelector<HTMLElement>('#helpModal')!
const startBtn = document.querySelector<HTMLButtonElement>('#startBtn')!
const openHelpBtn = document.querySelector<HTMLButtonElement>('#openHelpBtn')!
const helpBtn = document.querySelector<HTMLButtonElement>('#helpBtn')!
const closeHelpBtn = document.querySelector<HTMLButtonElement>('#closeHelpBtn')!
const playFromHelpBtn = document.querySelector<HTMLButtonElement>('#playFromHelpBtn')!
const helpBackdrop = document.querySelector<HTMLElement>('#helpBackdrop')!
const endHelpBtn = document.querySelector<HTMLButtonElement>('#endHelpBtn')!

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
const upgradePanel = document.querySelector<HTMLElement>('#upgradePanel')!
const upgradeList = document.querySelector<HTMLElement>('#upgradeList')!
const endPanel = document.querySelector<HTMLElement>('#endPanel')!
const endTitle = document.querySelector<HTMLElement>('#endTitle')!
const endDesc = document.querySelector<HTMLElement>('#endDesc')!
const summary = document.querySelector<HTMLElement>('#summary')!
const flashText = document.querySelector<HTMLElement>('#flashText')!
const comboFloat = document.querySelector<HTMLElement>('#comboFloat')!
const dangerTag = document.querySelector<HTMLElement>('#dangerTag')!

document.querySelector('#restartBtn')!.addEventListener('click', resetGame)
document.querySelector('#endRestartBtn')!.addEventListener('click', resetGame)

const W = canvas.width
const H = canvas.height

const player = { x: W / 2, y: H - 110, r: 16, vx: 0, vy: 0, flash: 0 }

let currentScreen: Screen = 'intro'
let game: GameState
let enemies: Enemy[] = []
let particles: Particle[] = []
let trails: TrailMark[] = []
let enemyId = 0
let aiming = false
let aimX = 0
let aimY = 0
let lastTime = 0
let levelResolved = false
let flashTimer = 0
let comboFloatTimer = 0
let pulse = 0

const upgrades: Upgrade[] = [
  { id: 'power', name: '暴烈冲刺', desc: '冲刺伤害大幅提升，碰撞更狠。', apply: (s) => { s.dashPower += 10; s.build.push('暴烈冲刺') } },
  { id: 'width', name: '裂空轨迹', desc: '冲刺判定更宽，更容易清场。', apply: (s) => { s.dashWidth += 8; s.build.push('裂空轨迹') } },
  { id: 'reverse', name: '逆转心流', desc: '额外获得 1 次逆转机会，残血时更容易翻盘。', apply: (s) => { s.reverseCharges += 1; s.build.push('逆转心流') } },
  { id: 'heal', name: '余烬回路', desc: '立刻回复 30 生命，并提升最大生命。', apply: (s) => { s.maxHp += 10; s.hp = Math.min(s.maxHp, s.hp + 30); s.build.push('余烬回路') } },
  { id: 'combo', name: '连锁渴望', desc: '起手连击更高，首轮就更容易滚雪球。', apply: (s) => { s.combo += 2; s.build.push('连锁渴望') } },
]

function freshState(): GameState {
  return {
    phase: 'ready',
    level: 1,
    score: 0,
    hp: 100,
    maxHp: 100,
    combo: 0,
    bestCombo: 0,
    dashPower: 22,
    dashWidth: 0,
    reverseCharges: 1,
    reverseActive: false,
    kills: 0,
    build: [],
    bossIncoming: false,
    slowmo: 0,
    dashTrail: 0,
    critWindow: 0,
    dashCount: 0,
  }
}

function setScreen(screen: Screen) {
  currentScreen = screen
  const intro = screen === 'intro'
  introScreen.classList.toggle('hidden', !intro)
  gameScreen.classList.toggle('hidden', intro)
  shell.classList.toggle('shell-intro', intro)
  shell.classList.toggle('shell-game', !intro)
}

function openHelp() {
  helpModal.classList.remove('hidden')
}

function closeHelp() {
  helpModal.classList.add('hidden')
}

startBtn.addEventListener('click', () => {
  setScreen('game')
  closeHelp()
  resetGame()
})
openHelpBtn.addEventListener('click', openHelp)
helpBtn.addEventListener('click', openHelp)
closeHelpBtn.addEventListener('click', closeHelp)
helpBackdrop.addEventListener('click', closeHelp)
playFromHelpBtn.addEventListener('click', () => {
  setScreen('game')
  closeHelp()
  resetGame()
})
endHelpBtn.addEventListener('click', openHelp)

function showFlash(text: string, danger = false) {
  flashText.textContent = text
  flashText.classList.remove('hidden', 'danger')
  if (danger) flashText.classList.add('danger')
  flashTimer = 0.75
}

function showCombo(text: string) {
  comboFloat.textContent = text
  comboFloat.classList.remove('hidden')
  comboFloatTimer = 0.68
}

function resetGame() {
  game = freshState()
  Object.assign(player, { x: W / 2, y: H - 110, vx: 0, vy: 0, flash: 0 })
  particles = []
  trails = []
  enemies = []
  enemyId = 0
  aiming = false
  levelResolved = false
  flashText.classList.add('hidden')
  comboFloat.classList.add('hidden')
  dangerTag.classList.add('hidden')
  upgradePanel.classList.add('hidden')
  endPanel.classList.add('hidden')
  tipEl.textContent = '按住拖拽，松手冲刺。撞穿敌人，残血时会亮起逆转时刻。'
  statusEl.textContent = '第一关 · 先打出第一波爽感'
  spawnLevel()
  updateHud()
}

function makeEnemy(kind: EnemyKind, x?: number, y?: number): Enemy {
  if (kind === 'boss') return { id: ++enemyId, x: x ?? W / 2, y: y ?? 150, r: 34, hp: 170, speed: 42, kind, alive: true, flash: 0, vx: 110, vy: 0, cooldown: 1.8 }
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
    orbit: Math.random() * Math.PI * 2,
    cooldown: 1 + Math.random() * 0.8,
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
    tipEl.textContent = 'Boss 会横向压迫。先切小怪，再抓弱点。'
    showFlash('BOSS 来了')
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
      if (game.level > 4) finishGame(true)
      else {
        statusEl.textContent = `第 ${game.level} 关 · Build 继续发疯`
        tipEl.textContent = game.level === 3 ? '别贪刀，先找一条能连续穿怪的线。' : '你已经不是白板了，开始打成型局。'
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
  endDesc.textContent = victory ? '这一版已经有爽感、节奏点和一次值得分享的反杀体验。' : '这把已经有那个味儿了，再来一局很容易打出真正神图。'
  summary.innerHTML = `
    <div><span>最终关卡</span><strong>${game.level}</strong></div>
    <div><span>分数</span><strong>${game.score}</strong></div>
    <div><span>击杀</span><strong>${game.kills}</strong></div>
    <div><span>最高连击</span><strong>${game.bestCombo}</strong></div>
  `
}

function updateHud() {
  hpBar.style.width = `${(game.hp / game.maxHp) * 100}%`
  hpText.textContent = `${Math.max(0, Math.ceil(game.hp))} / ${game.maxHp}`
  levelText.textContent = String(game.level)
  scoreText.textContent = String(game.score)
  comboText.textContent = String(game.combo)
  reverseText.textContent = String(game.reverseCharges)
  buildTags.innerHTML = game.build.length ? game.build.map((tag) => `<span>${tag}</span>`).join('') : '<span>未成型</span>'
  const inDanger = game.hp / game.maxHp < 0.25 && game.reverseCharges > 0
  dangerTag.classList.toggle('hidden', !inDanger)
  if (inDanger) statusEl.textContent = '逆转时刻已亮起 · 残血才是你的主场'
}

function screenShake(intensity = 8) {
  canvas.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`
  setTimeout(() => { canvas.style.transform = 'translate(0,0)' }, 60)
}

function burst(x: number, y: number, color: string, count = 18) {
  for (let i = 0; i < count; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.7 + Math.random() * 0.4, size: 2 + Math.random() * 4, color })
}

function addTrail(x: number, y: number, color: string) {
  trails.push({ x, y, r: 11 + Math.random() * 6, life: 0.28, color })
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
    tipEl.textContent = '现在别怂，找一条能穿两只以上的线。'
    showFlash('逆转时刻', true)
    showCombo('反杀窗口已开')
    updateHud()
  }
}

function pointerToCanvas(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
}

canvas.addEventListener('pointerdown', (e) => {
  if (currentScreen !== 'game' || game.phase !== 'ready') return
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
  game.dashTrail = 0.24
  game.critWindow = 0.18
  game.dashCount += 1
  tipEl.textContent = '好，继续找角度。残血时会爆出逆转时刻。'
})

function hitEnemy(enemy: Enemy) {
  const crit = game.critWindow > 0
  const damage = game.dashPower + (game.reverseActive ? 22 : 0) + (crit ? 10 : 0) + (enemy.kind === 'boss' ? 2 : 0)
  enemy.hp -= damage
  enemy.flash = crit ? 0.22 : 0.14
  game.combo += 1
  game.bestCombo = Math.max(game.bestCombo, game.combo)
  game.score += 20 + game.combo * 3 + (crit ? 12 : 0)
  game.slowmo = Math.max(game.slowmo, crit ? 0.12 : 0.08)
  burst(enemy.x, enemy.y, enemy.kind === 'burst' ? '#ff7a7a' : enemy.kind === 'boss' ? '#ffd26a' : '#9f7aff', crit ? 16 : 10)
  if (game.combo >= 3) showCombo(`${game.combo} 连击`)
  if (enemy.hp <= 0) {
    enemy.alive = false
    game.kills += 1
    game.score += enemy.kind === 'boss' ? 600 : 60 + game.level * 10
    burst(enemy.x, enemy.y, enemy.kind === 'burst' ? '#ff9469' : enemy.kind === 'boss' ? '#fff099' : '#7cf3ff', enemy.kind === 'boss' ? 46 : 22)
    screenShake(enemy.kind === 'boss' ? 18 : enemy.kind === 'burst' ? 14 : 8)
    showFlash(enemy.kind === 'boss' ? 'Boss 击破' : crit ? '暴击清场' : '清场击杀')
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
  pulse += dtRaw
  const dt = dtRaw * (game.slowmo > 0 ? 0.45 : 1)
  if (currentScreen !== 'game') return
  if (game.phase === 'victory' || game.phase === 'defeat' || game.phase === 'upgrade') return

  if (game.slowmo > 0) game.slowmo = Math.max(0, game.slowmo - dtRaw * 1.2)
  if (game.dashTrail > 0) game.dashTrail = Math.max(0, game.dashTrail - dtRaw)
  if (game.critWindow > 0) game.critWindow = Math.max(0, game.critWindow - dtRaw)
  if (flashTimer > 0) {
    flashTimer -= dtRaw
    if (flashTimer <= 0) flashText.classList.add('hidden')
  }
  if (comboFloatTimer > 0) {
    comboFloatTimer -= dtRaw
    if (comboFloatTimer <= 0) comboFloat.classList.add('hidden')
  }

  particles = particles.filter((p) => p.life > 0)
  particles.forEach((p) => {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.96
    p.vy *= 0.96
  })

  trails = trails.filter((t) => t.life > 0)
  trails.forEach((t) => {
    t.life -= dtRaw
    t.r *= 0.992
  })

  enemies.forEach((enemy) => {
    if (!enemy.alive) return
    enemy.flash = Math.max(0, enemy.flash - dt)
    enemy.cooldown = Math.max(0, (enemy.cooldown ?? 0) - dt)
    if (enemy.kind === 'boss') {
      enemy.x += (enemy.vx ?? 0) * dt
      if (enemy.x < 60 || enemy.x > W - 60) enemy.vx = -(enemy.vx ?? 0)
      const by = 150 + Math.sin(performance.now() / 500) * 18
      enemy.y += (by - enemy.y) * 0.06
      if ((enemy.cooldown ?? 0) <= 0) {
        enemy.cooldown = 1.5
        burst(enemy.x, enemy.y + 12, '#ffd56f', 8)
      }
    } else {
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      const d = Math.hypot(dx, dy) || 1
      if (game.phase !== 'dash') {
        if (enemy.kind === 'shooter') {
          enemy.orbit = (enemy.orbit ?? 0) + dt * 1.6
          enemy.x += (dx / d) * enemy.speed * dt * 0.58 + Math.cos(enemy.orbit ?? 0) * 16 * dt
          enemy.y += (dy / d) * enemy.speed * dt * 0.42 + Math.sin(enemy.orbit ?? 0) * 18 * dt
        } else if (enemy.kind === 'burst') {
          const lunge = (enemy.cooldown ?? 0) <= 0 ? 1.9 : 1
          if ((enemy.cooldown ?? 0) <= 0) enemy.cooldown = 1.2
          enemy.x += (dx / d) * enemy.speed * dt * lunge
          enemy.y += (dy / d) * enemy.speed * dt * lunge
        } else {
          enemy.x += (dx / d) * enemy.speed * dt
          enemy.y += (dy / d) * enemy.speed * dt
        }
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
    if (game.dashTrail > 0) addTrail(player.x, player.y, game.reverseActive ? '#9cf9ff' : '#9ab8ff')
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
    tipEl.textContent = game.bossIncoming ? '这一把已经有演示价值了。' : '现在选强化，决定下一关怎么爽。'
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

  trails.forEach((t) => {
    ctx.globalAlpha = Math.max(0, t.life * 1.8)
    ctx.fillStyle = t.color
    ctx.beginPath()
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  })

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
    ctx.globalAlpha = enemy.kind === 'boss' ? 0.95 : 0.92
    ctx.beginPath()
    ctx.arc(0, 0, enemy.r + Math.sin(pulse * (enemy.kind === 'boss' ? 5 : 8)) * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = enemy.kind === 'boss' ? 4 : 2
    ctx.strokeStyle = enemy.kind === 'boss' ? 'rgba(255,240,180,0.65)' : 'rgba(255,255,255,0.35)'
    ctx.stroke()
    if (enemy.kind === 'boss') {
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke()
    }
    if (enemy.kind === 'shooter') {
      ctx.strokeStyle = 'rgba(255,245,180,0.8)'
      ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, 7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(-7, 7); ctx.stroke()
    }
    if (enemy.kind === 'burst') {
      ctx.strokeStyle = 'rgba(255,180,160,0.9)'
      ctx.beginPath()
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6
        const r = enemy.r + 5
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
  })

  if (aiming) {
    const dx = player.x - aimX
    const dy = player.y - aimY
    const len = Math.max(20, Math.hypot(dx, dy))
    const aimPower = Math.min(1, len / 180)
    ctx.strokeStyle = 'rgba(120,245,255,0.95)'
    ctx.lineWidth = 3 + aimPower * 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(player.x, player.y)
    ctx.lineTo(aimX, aimY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(120,245,255,0.18)'
    ctx.beginPath()
    ctx.arc(player.x, player.y, 28 + aimPower * 18, 0, Math.PI * 2)
    ctx.fill()
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
  if (game.phase === 'dash') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(10, 0)
    ctx.stroke()
  }
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

resetGame()
setScreen('intro')
requestAnimationFrame(loop)
