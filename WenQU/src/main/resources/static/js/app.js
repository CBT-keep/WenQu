/* ============================================================
   WenQu · 终端知识库 - 应用脚本
   ============================================================ */

/* ============================================================
   CONFIG
   ============================================================ */
const API = '/api';

/* ============================================================
   BOOT ANIMATION
   ============================================================ */
const ASCII_BANNER = [
  '██╗    ██╗███████╗███╗   ██╗ ██████╗ ██╗   ██╗',
  '██║    ██║██╔════╝████╗  ██║██╔═══██╗██║   ██║',
  '██║ █╗ ██║█████╗  ██╔██╗ ██║██║   ██║██║   ██║',
  '██║███╗██║██╔══╝  ██║╚██╗██║██║ ▄ ██║██║   ██║',
  '╚███╔███╔╝███████╗██║ ╚████║╚██████╔╝╚██████╔╝',
  ' ╚══╝╚══╝ ╚══════╝╚═╝  ╚═══╝ ╚═══▀═╝  ╚═════╝ ',
];

function runBootAnimation() {
  const asciiEl = document.getElementById('term-ascii');
  if (!asciiEl) return;
  asciiEl.textContent = ASCII_BANNER.join('\n');

  const bootLines = document.querySelectorAll('.term-boot');
  bootLines.forEach((line, i) => {
    const delay = parseInt(line.getAttribute('data-delay') || '0', 10);
    setTimeout(() => line.classList.add('visible'), 150 + delay);
  });
}

// 页面加载后执行启动动画
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runBootAnimation);
} else {
  runBootAnimation();
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(dark) {
  document.documentElement.classList.toggle('light', !dark);
  const label = dark ? '☾' : '☀';
  document.querySelectorAll('.theme-toggle').forEach(b => { b.textContent = label; });
  localStorage.setItem('wq_theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light');
  const apply = () => applyTheme(isLight);
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
  const btn = document.getElementById('app-theme-btn');
  if (btn && !btn.classList.contains('spin')) {
    btn.classList.add('spin');
    btn.addEventListener('animationend', () => btn.classList.remove('spin'), { once: true });
  }
}

/* 首次访问：优先用系统主题，有存储记录则用存储 */
const savedTheme = localStorage.getItem('wq_theme');
if (savedTheme) {
  applyTheme(savedTheme !== 'light');
} else {
  applyTheme(!window.matchMedia('(prefers-color-scheme:light)').matches);
}

document.getElementById('app-theme-btn').onclick = toggleTheme;

/* 顶栏音乐播放器开关
   库会把 .netease-mini-player 替换成 <nmp-player>，真实可见元素是 .nmpv3-player，
   显隐与右上角定位均通过 html.music-open 类门控（见 style.css） */
(function() {
  const btn = document.getElementById('btn-music');
  if (!btn) return;
  btn.onclick = () => {
    const open = document.documentElement.classList.toggle('music-open');
    btn.classList.toggle('active', open);
  };
})();

/* ============================================================
   STATE
   ============================================================ */
const state = {
  token: localStorage.getItem('wq_token') || null,
  user: (() => { try { return JSON.parse(localStorage.getItem('wq_user') || 'null'); } catch { return null; } })(),
  kbs: [],
  currentKb: null,
  docs: [],
  conversations: [],
  currentConv: null,
  chatMsgs: [],
  editingKbId: null,
  docPollTimers: {},
  recycleAction: null,   // 回收站待认证操作 {type:'doc'|'kb', id, mode:'restore'|'purge', name}
  recycleCache: { docs: [], kbs: [] },
};

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('wq_token', token);
  localStorage.setItem('wq_user', JSON.stringify(user));
}

function clearAuth() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('wq_token');
  localStorage.removeItem('wq_user');
}

/* ============================================================
   API MODULE
   ============================================================ */
class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const HTTP_STATUS_MAP = {
  400: [40000, '请求参数错误'],
  401: [40100, '未登录或 token 无效'],
  403: [40300, '无权限访问该资源'],
  404: [40400, '请求的资源不存在'],
  409: [40900, '资源冲突'],
  422: [42200, '业务校验失败'],
  500: [50000, '系统内部错误'],
  502: [50200, '外部服务错误'],
};

async function api(method, path, body, isForm, silent) {
  const h = {};
  if (state.token) h['Authorization'] = 'Bearer ' + state.token;
  const opts = { method, headers: h };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      h['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(API + path, opts);
  } catch {
    throw new ApiError(0, '无法连接服务器，请检查网络');
  }

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }

  let code = json && typeof json.code === 'number' ? json.code : null;
  let message = json && json.message ? json.message : null;

  if (code === null) {
    const entry = HTTP_STATUS_MAP[res.status];
    if (res.status >= 200 && res.status < 300) {
      code = 0;
    } else {
      code = entry ? entry[0] : 50000;
      message = message || (entry ? entry[1] : '请求失败');
    }
  }

  if (code === 0) return json ? json.data : null;

  if (code === 40100 || code === 40101) {
    handleSessionExpired();
    throw new ApiError(code, message || '未登录或 token 无效');
  }

  if (!silent) toast(message || '请求失败', 'err');
  throw new ApiError(code, message || '请求失败');
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3500);
}

/* ============================================================
   MODAL（统一开/关，带进出场动画；焦点陷阱支持；Esc 关闭）
   ============================================================ */
let _modalRestoreFocus = null;
let _modalKeyHandler = null;

function openModal(id) {
  const m = document.getElementById(id);
  m.classList.add('active');
  _modalRestoreFocus = document.activeElement;
  // 聚焦第一个可聚焦元素
  const focusable = m.querySelectorAll('input,textarea,button:not([disabled])');
  if (focusable.length) setTimeout(() => focusable[0].focus(), 50);
  // 焦点陷阱：Tab 循环
  _modalKeyHandler = e => {
    if (e.key !== 'Tab' || m.classList.contains('closing')) return;
    const f = m.querySelectorAll('input,textarea,button:not([disabled])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  m.addEventListener('keydown', _modalKeyHandler);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m.classList.contains('active') || m.classList.contains('closing')) return;
  m.classList.add('closing');
  m.removeEventListener('keydown', _modalKeyHandler);
  setTimeout(() => {
    m.classList.remove('active', 'closing');
    if (_modalRestoreFocus) { _modalRestoreFocus.focus(); _modalRestoreFocus = null; }
  }, 230);
}

/* ============================================================
   VIEWS
   ============================================================ */
/* 收起并暂停音乐播放器（登出/进入终端时调用） */
function stopMusicPlayer() {
  document.documentElement.classList.remove('music-open');
  const btn = document.getElementById('btn-music');
  if (btn) btn.classList.remove('active');
  try { window.NeteaseMiniPlayer?.pauseAll?.(); } catch { /* 播放器未加载时忽略 */ }
}

function showAuth() {
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('auth-view').classList.remove('fullscreen');
  document.getElementById('app-view').classList.remove('active');
  stopMusicPlayer();
  const inp = document.getElementById('auth-input');
  if (inp) setTimeout(() => inp.focus(), 100);
}

function showTerm() {
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('auth-view').classList.add('fullscreen');
  document.getElementById('app-view').classList.remove('active');
  stopMusicPlayer();
  updateTermTitle();
  const inp = document.getElementById('auth-input');
  if (inp) setTimeout(() => inp.focus(), 100);
}

function showApp() {
  document.getElementById('auth-view').classList.remove('active');
  document.getElementById('app-view').classList.add('active');
  document.getElementById('header-user').textContent =
    state.user?.nickname || state.user?.username || '-';
  updateAppTitle();
  showKbView();
  if (state.currentKb) {
    selectKb(state.currentKb);
  } else {
    renderKbEmpty();
  }
  loadKbs();
}

function updateAppTitle() {
  const u = state.user;
  let s = 'wenqu';
  if (u) s += `@${u.username || u.nickname || 'user'}`;
  if (state.currentKb) s += ` — kb#${state.currentKb.id} ${state.currentKb.name || ''}`;
  if (state.currentConv) s += ` — conv#${state.currentConv.id}`;
  const el = document.getElementById('app-term-title');
  if (el) el.textContent = s;
}

function showKbView() {
  document.getElementById('kb-view').style.display = '';
  document.getElementById('chat-view').style.display = 'none';
}

function showChatView() {
  document.getElementById('kb-view').style.display = 'none';
  document.getElementById('chat-view').style.display = 'flex';
}

/* ============================================================
   TERMINAL (auth + app)
   ============================================================ */
const authOutput = document.getElementById('auth-output');
const authInput  = document.getElementById('auth-input');
const authMirrorBefore = document.getElementById('auth-mirror-before');
const authMirrorAfter  = document.getElementById('auth-mirror-after');
const authCursor = document.getElementById('auth-cursor');
const termPromptEl = document.getElementById('term-prompt');
const termTitleEl = document.getElementById('auth-term-title');
const termFileInput = document.getElementById('term-file-input');

const term = {
  mode: 'auth',            // auth | app | chat
  curKb: null,             // 当前知识库 {id,name,...}
  curConv: null,           // 当前会话 {id,kbId,...}
  history: [],
  histIdx: 0,
  draft: '',
  pendingConfirm: null,    // {msg, cb}
  busy: false,             // 流式回答进行中
  pendingInput: null,      // {hint, mask, onSubmit} 交互式输入中（mask=true 不回显，用于密码/邀请码等）
};

function promptStr() {
  if (term.pendingInput) return term.pendingInput.mask ? 'password>' : 'input>';
  if (term.mode === 'auth') return 'kb>';
  if (term.mode === 'chat') return 'chat>';
  return term.curKb ? `wq@kb:${term.curKb.id}$` : 'wq@wenqu$';
}

function updatePrompt() {
  termPromptEl.textContent = promptStr();
}

function updateTermTitle() {
  const u = state.user;
  let s = 'wenqu';
  if (u) s += `@${u.username || u.nickname || 'user'}`;
  if (term.curKb) s += ` — kb#${term.curKb.id} ${term.curKb.name || ''}`;
  if (term.curConv) s += ` — conv#${term.curConv.id}`;
  termTitleEl.textContent = s;
  updatePrompt();
}

function syncAuthMirror() {
  const v = authInput.value;
  const focused = document.activeElement === authInput;
  const caret = typeof authInput.selectionStart === 'number' ? authInput.selectionStart : v.length;
  const masked = term.pendingInput?.mask ? v.replace(/[^\n]/g, '•') : v;
  authMirrorBefore.textContent = masked.slice(0, caret);
  authMirrorAfter.textContent = masked.slice(caret);
  if (focused || v) {
    authCursor.style.display = 'inline-block';
    authInput.placeholder = '';
  } else {
    authCursor.style.display = 'none';
    authInput.placeholder = term.pendingInput ? (term.pendingInput.mask ? '输入密码...' : '输入内容...') : '输入命令...';
  }
}
authInput.addEventListener('input', syncAuthMirror);
authInput.addEventListener('focus', syncAuthMirror);
authInput.addEventListener('blur', syncAuthMirror);
authInput.addEventListener('compositionend', syncAuthMirror);
authInput.addEventListener('keyup', syncAuthMirror);
authInput.addEventListener('click', syncAuthMirror);
authInput.addEventListener('select', syncAuthMirror);
document.addEventListener('selectionchange', syncAuthMirror);
syncAuthMirror();

function termPrint(html) {
  const div = document.createElement('div');
  div.className = 'term-line';
  div.innerHTML = html;
  authOutput.appendChild(div);
  authOutput.scrollTop = authOutput.scrollHeight;
}

function termPrintEmpty() {
  termPrint('&nbsp;');
}

function termPrintErr(err) {
  termPrint(`<span class="term-err">✗ ${esc(err.message || '操作失败')}</span>`);
}

function termConfirm(msg, cb) {
  term.pendingConfirm = { msg, cb };
  termPrint(`<span class="term-warn">⚠ 确认：</span>${esc(msg)} <span class="term-dim">(y/n)</span>`);
}

/* ---- 命令历史 ---- */
function navHistory(dir) {
  if (!term.history.length) return;
  if (dir < 0) {
    if (term.histIdx === term.history.length) term.draft = authInput.value;
    if (term.histIdx > 0) {
      term.histIdx--;
      authInput.value = term.history[term.histIdx];
    }
  } else {
    if (term.histIdx < term.history.length) {
      term.histIdx++;
      authInput.value = term.histIdx === term.history.length ? term.draft : term.history[term.histIdx];
    }
  }
  syncAuthMirror();
}

/* ---- Tab 补全 ---- */
const TERM_COMPLETIONS = [
  'help', 'theme', 'clear', 'gui', 'logout', 'whoami', 'status', 'kb', 'doc', 'conv', 'chat',
  'login', 'register',
  'kb list', 'kb show', 'kb create', 'kb edit', 'kb delete', 'kb use',
  'doc list', 'doc show', 'doc upload', 'doc delete', 'doc reprocess',
  'trash list', 'trash restore', 'trash purge',
  'conv list', 'conv new', 'conv open', 'conv delete', 'conv show',
  'chat ask',
];

function completeTab() {
  const v = authInput.value;
  if (!v) return;
  const tokens = v.split(/\s+/);
  const pool = term.mode === 'auth' ? AUTH_COMMANDS : TERM_COMPLETIONS;
  let candidates;
  if (tokens.length === 1) {
    candidates = pool.filter(c => c.startsWith(tokens[0].toLowerCase()));
  } else {
    const grp = tokens[0].toLowerCase();
    candidates = pool
      .filter(c => c.startsWith(grp + ' ') && c.split(' ')[1].startsWith(tokens[1].toLowerCase()))
      .map(c => c.split(' ')[1]);
  }
  if (!candidates.length) return;
  if (candidates.length === 1) {
    authInput.value = tokens.slice(0, -1).concat(candidates[0]).join(' ') + ' ';
  } else {
    termPrint(`<span class="term-dim">${candidates.join('  ')}</span>`);
  }
  syncAuthMirror();
}

/* ---- 输入分发 ---- */
authInput.addEventListener('keydown', async e => {
  if (e.isComposing || e.keyCode === 229) return;

  // 交互式输入模式（密码/向导）：关闭 Tab / 上下历史 / Tab 补全
  if (term.pendingInput) {
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = authInput.value;
    authInput.value = '';
    syncAuthMirror();
    await termSubmitInput(value);
    return;
  }

  if (e.key === 'Tab') { e.preventDefault(); completeTab(); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); navHistory(-1); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); navHistory(1); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const raw = authInput.value.trim();
  authInput.value = '';
  syncAuthMirror();
  if (!raw) return;

  term.history.push(raw);
  term.histIdx = term.history.length;
  termPrint(`<span class="term-prompt">${promptStr()}</span> ${esc(maskSensitiveCmd(raw))}`);

  try {
    await termDispatch(raw);
    // 含密码的 login/register 不进历史（避免回放泄露）：遮罩后再次压入历史
    const c0 = parseArgs(raw)[0]?.toLowerCase();
    if (raw && (c0 === 'login' || c0 === 'register') && parseArgs(raw).length > 2) {
      term.history[term.history.length - 1] = maskSensitiveCmd(raw);
    }
  } catch (err) {
    const isAuth = err instanceof ApiError && (err.code === 40100 || err.code === 40101);
    if (!isAuth) termPrintErr(err);
  }
});

async function termDispatch(raw) {
  if (term.pendingConfirm) {
    const { cb } = term.pendingConfirm;
    term.pendingConfirm = null;
    const a = raw.toLowerCase();
    if (a === 'y' || a === 'yes') { await cb(true); return; }
    if (a === 'n' || a === 'no') { await cb(false); return; }
    term.pendingConfirm = { cb };
    termPrint('<span class="term-warn">请输入 y 或 n</span>');
    return;
  }

  if (term.mode === 'chat') {
    termChatInput(raw);
    return;
  }

  const words = parseArgs(raw);
  if (!words.length) return;
  const c0 = words[0].toLowerCase();
  const c1 = words[1] ? words[1].toLowerCase() : null;
  const args = words.slice(2);

  if (term.mode === 'auth' && !AUTH_COMMANDS.includes(c0)) {
    termPrint('<span class="term-warn">请先登录：</span><span class="term-hl">login &lt;用户名&gt; &lt;密码&gt;</span> 或 <span class="term-hl">register</span> 注册');
    return;
  }

  if (term.mode !== 'auth' && (c0 === 'login' || c0 === 'register')) {
    termPrint('<span class="term-warn">已登录，如需切换账号请先 </span><span class="term-hl">logout</span>');
    return;
  }

  const fn = TERM_CMDS[c0];
  if (!fn) {
    termPrint(`<span class="term-err">未知命令：${esc(c0)}</span> — 输入 <span class="term-hl">help</span> 查看帮助`);
    return;
  }
  await fn(c1, args, words);
}

function parseArgs(raw) {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const out = [];
  let m;
  while ((m = re.exec(raw))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// 对 login/register 命令回显时遮罩密码，避免明文泄露到终端输出
function maskSensitiveCmd(raw) {
  const words = parseArgs(raw);
  if (!words.length) return raw;
  const c0 = words[0].toLowerCase();
  if (c0 !== 'login' && c0 !== 'register') return raw;
  if (words.length < 2) return raw;
  // login <用户名> <密码>：密码遮罩；register <用户名> [密码] [昵称]：遮罩密码、保留昵称
  const username = words[1];
  const hiddenCount = words.length - 2;
  let masked = words[0] + ' ' + username;
  if (hiddenCount > 0) masked += ' ' + '*'.repeat(Math.min(hiddenCount, 4));
  return masked;
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const a of args) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) flags[m[1]] = m[2];
    else positional.push(a);
  }
  return { flags, positional };
}

function num(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}

function stripBrackets(s) {
  if (!s) return s;
  const pairs = [['[', ']'], ['<', '>'], ['(', ')'], ['{', '}']];
  for (const [o, c] of pairs) {
    if (s.startsWith(o) && s.endsWith(c) && s.length >= 2) return s.slice(1, -1);
  }
  return s;
}

/* ---- 登录/登出 ---- */
// 交互式输入（向导步骤）：注册一次性回调，回车提交；mask=true 时不回显（密码等敏感输入）
function termAskInput(hint, { mask = false, onSubmit }) {
  term.pendingInput = { hint, mask, onSubmit };
  updatePrompt();
  termPrint(`<span class="term-dim">${esc(hint)}${mask ? '（输入不回显）' : ''}</span>`);
  authInput.focus();
}

// 密码输入（SSH 风格，不回显）
function termAskPassword(hint, onSubmit) {
  termAskInput(hint, { mask: true, onSubmit });
}

// 交互式输入提交：分发给 pendingInput 注册的回调
async function termSubmitInput(value) {
  const ctx = term.pendingInput;
  term.pendingInput = null;
  updatePrompt();
  if (!ctx) return;
  if (ctx.mask && !value) {
    termPrint('<span class="term-warn">密码不能为空</span>');
    return;
  }
  await ctx.onSubmit(value);
}

async function cmdLogin(args) {
  if (args.length < 1) {
    termPrint('<span class="term-warn">用法：login &lt;用户名&gt; [密码]</span><span class="term-dim"> — 未提供密码时将交互式输入</span>');
    return;
  }
  const username = args[0];
  const password = args.slice(1).join(' ');
  if (password) {
    // 直接提供密码仍立即认证；命令行回显已由 maskSensitiveCmd 遮罩
    termPrint('<span class="term-dim">认证中...</span>');
    const data = await api('POST', '/auth/login', { username, password });
    saveAuth(data.token, data.user);
    termPrint('<span class="term-ok">✓ 登录成功</span> — ' + esc(data.user?.nickname || data.user?.username || username));
    enterAppTerm();
    return;
  }
  termAskPassword('请输入密码', async password => {
    try {
      termPrint('<span class="term-dim">认证中...</span>');
      const data = await api('POST', '/auth/login', { username, password });
      saveAuth(data.token, data.user);
      termPrint('<span class="term-ok">✓ 登录成功</span> — ' + esc(data.user?.nickname || data.user?.username || username));
      enterAppTerm();
    } catch (err) {
      const isAuth = err instanceof ApiError && (err.code === 40100 || err.code === 40101);
      if (isAuth) { handleSessionExpired(); return; }
      termPrintErr(err);
    }
  });
}

async function cmdRegister(args) {
  const USERNAME_RE = /^[A-Za-z0-9_]{2,20}$/;
  const preset = args[0] ? stripBrackets(args[0]) : null;
  if (args.length > 1) {
    termPrint('<span class="term-warn">出于安全考虑，密码不再通过命令行输入，请按向导逐步填写</span>');
  }
  termPrint(`<span class="term-hl">— 注册向导 —</span><span class="term-dim">逐步输入，回车确认；邀请码请向管理员获取</span>`);

  const askUsername = () => termAskInput('第 1/4 步 · 请输入用户名（2~20 位字母/数字/下划线，不含空格）', {
    onSubmit: u => {
      u = (u || '').trim();
      if (!u) { termPrint('<span class="term-warn">用户名不能为空</span>'); askUsername(); return; }
      if (!USERNAME_RE.test(u)) {
        termPrint('<span class="term-warn">用户名格式不合法：需为 2~20 位字母/数字/下划线，且不含空格</span>');
        askUsername();
        return;
      }
      askNickname(u);
    }
  });

  const askNickname = username => termAskInput(`第 2/4 步 · 为 [${username}] 设置昵称（可选，直接回车跳过）`, {
    onSubmit: nickname => askInvite(username, (nickname || '').trim() || undefined)
  });

  const askInvite = (username, nickname) => termAskInput(`第 3/4 步 · 请输入邀请码（防批量注册，向管理员获取）`, {
    onSubmit: code => {
      code = (code || '').trim();
      if (!code) { termPrint('<span class="term-warn">邀请码不能为空</span>'); askInvite(username, nickname); return; }
      askPassword(username, nickname, code);
    }
  });

  const askPassword = (username, nickname, inviteCode) => termAskPassword(
    `第 4/4 步 · 请为账号 [${username}] 设置登录密码（6~32 位，只输入密码本身）`, password => {
      if (/\s/.test(password)) {
        termPrint('<span class="term-warn">密码不能包含空格，请重新设置</span>');
        askPassword(username, nickname, inviteCode);
        return;
      }
      if (password.length < 6 || password.length > 32) {
        termPrint('<span class="term-warn">密码长度需在 6~32 位之间，请重新设置</span>');
        askPassword(username, nickname, inviteCode);
        return;
      }
      termAskPassword('请再次输入同一密码以确认（两次一致才会注册）', confirm => {
        if (confirm !== password) {
          termPrint('<span class="term-err">✗ 两次输入的密码不一致，请重新设置</span>');
          askPassword(username, nickname, inviteCode);
          return;
        }
        submitRegister(username, password, nickname, inviteCode);
      });
    });

  const submitRegister = async (username, password, nickname, inviteCode) => {
    termPrint('<span class="term-dim">提交注册...</span>');
    try {
      await api('POST', '/auth/register', { username, password, nickname, inviteCode });
      termPrint(`<span class="term-ok">✓ 注册成功</span> — 用户名 <span class="term-hl">${esc(username)}</span>，现在可以用 <span class="term-hl">login ${esc(username)}</span> 登录`);
    } catch (err) {
      const isAuth = err instanceof ApiError && (err.code === 40100 || err.code === 40101);
      if (isAuth) { handleSessionExpired(); return; }
      termPrintErr(err);
      termPrint('<span class="term-dim">可重新运行 <span class="term-hl">register</span> 再试</span>');
    }
  };

  if (preset) {
    if (!USERNAME_RE.test(preset)) {
      termPrint('<span class="term-warn">命令行提供的用户名格式不合法，请在向导中重新输入</span>');
      askUsername();
      return;
    }
    termPrint(`<span class="term-dim">用户名：</span><span class="term-ok">${esc(preset)}</span>`);
    askNickname(preset);
  } else {
    askUsername();
  }
}

function enterAppTerm() {
  term.mode = 'app';
  term.curKb = null;
  term.curConv = null;
  updatePrompt();
  showTerm();
  termPrint('<span class="term-dim">输入 </span><span class="term-hl">help</span><span class="term-dim"> 查看全部命令，</span><span class="term-hl">gui</span><span class="term-dim"> 切换到可视化界面</span>');
}

function resetGuiState() {
  stopAllDocPolls();
  state.currentKb = null;
  state.currentConv = null;
  state.kbs = [];
  state.docs = [];
  state.conversations = [];
  state.chatMsgs = [];
  state.editingKbId = null;
  document.getElementById('kb-search').value = '';
  document.getElementById('chat-messages').innerHTML = '';
  renderKbEmpty();
  showKbView();
}

function doLogout() {
  clearAuth();
  resetGuiState();
  term.mode = 'auth';
  term.curKb = null;
  term.curConv = null;
  term.busy = false;
  term.pendingConfirm = null;
  term.pendingInput = null;
  updatePrompt();
  updateTermTitle();
  showAuth();
  termPrintEmpty();
  termPrint('<span class="term-ok">已登出</span> — 输入 <span class="term-hl">help</span> 查看命令');
  toast('已登出', 'info');
}

function handleSessionExpired() {
  clearAuth();
  resetGuiState();
  term.mode = 'auth';
  term.curKb = null;
  term.curConv = null;
  term.busy = false;
  term.pendingConfirm = null;
  term.pendingInput = null;
  updatePrompt();
  updateTermTitle();
  showAuth();
  termPrintEmpty();
  termPrint('<span class="term-warn">登录已过期，请重新登录</span>');
  toast('登录已过期，请重新登录', 'err');
}

const AUTH_COMMANDS = ['help', 'login', 'register', 'theme', 'clear'];

/* ============================================================
   TERMINAL COMMANDS
   ============================================================ */
const TERM_CMDS = {
  login: (c1, args, words) => cmdLogin(words.slice(1)),
  register: (c1, args, words) => cmdRegister(words.slice(1)),

  /* ---- 通用 ---- */
  async help(c1) {
    const loggedIn = term.mode !== 'auth';
    if (!loggedIn) {
      termPrint('<span class="term-hl">可用命令</span><span class="term-muted">（登录后可使用全部命令）</span>');
      const authLines = [
        ['help', '显示帮助'],
        ['login <用户名> <密码>', '登录'],
        ['register [用户名]', '注册（交互式向导：需邀请码，密码二次确认）'],
        ['theme', '切换明/暗主题'],
        ['clear', '清屏'],
      ];
      for (const [u, d] of authLines) {
        termPrint(`  <span class="term-ok">${u}</span> <span class="term-dim">— ${d}</span>`);
      }
      return;
    }
    const H = {
      '': [
        ['help [命令]', '显示帮助'],
        ['status', '查看当前状态'],
        ['whoami', '显示当前用户'],
        ['theme', '切换明/暗主题'],
        ['gui', '切换到可视化界面'],
        ['clear', '清屏'],
        ['logout', '退出登录'],
        ['kb list|show|create|edit|delete|use', '知识库管理'],
        ['doc list|show|upload|delete|reprocess', '文档管理'],
        ['trash list|restore|purge', '回收站（恢复/永久删除，需密码）'],
        ['conv list|new|open|delete|show', '会话管理'],
        ['chat [ask <问题>]', '对话模式 / 直接提问'],
      ],
      kb: [
        ['kb list [关键字]', '列出知识库'],
        ['kb show <id>', '知识库详情'],
        ['kb create <名称> [描述] [分块大小] [重叠]', '创建知识库'],
        ['kb edit <id> [--name=] [--desc=] [--chunk=] [--overlap=]', '编辑知识库（全量更新）'],
        ['kb delete <id>', '删除知识库（级联）'],
        ['kb use <id>', '设为当前知识库'],
      ],
      doc: [
        ['doc list [kbId]', '文档列表（默认当前知识库）'],
        ['doc show <id>', '文档详情'],
        ['doc upload [kbId]', '上传文档（弹出文件选择）'],
        ['doc delete <id>', '删除文档（进入回收站）'],
        ['doc reprocess <id>', '重新处理文档'],
      ],
      trash: [
        ['trash list [doc|kb]', '查看回收站（默认全部）'],
        ['trash restore doc <id>', '恢复文档（需密码）'],
        ['trash restore kb <id>', '恢复知识库及其下文档（需密码）'],
        ['trash purge doc <id>', '永久删除文档，不可恢复（需密码）'],
        ['trash purge kb <id>', '永久删除知识库，不可恢复（需密码）'],
      ],
      conv: [
        ['conv list', '会话列表'],
        ['conv new [kbId]', '创建会话（默认当前知识库）'],
        ['conv open <id>', '打开会话并加载消息历史'],
        ['conv show <id>', '会话详情'],
        ['conv delete <id>', '删除会话'],
      ],
      chat: [
        ['chat', '进入对话模式（直接输入问题，exit 退出）'],
        ['chat ask <问题>', '在当前会话直接提问'],
      ],
    };
    const lines = H[c1] || H[''];
    termPrint(`<span class="term-hl">${c1 ? c1 + ' 命令' : '全部命令'}</span><span class="term-muted">（Tab 补全 · ↑↓ 历史）</span>`);
    for (const [u, d] of lines) {
      termPrint(`  <span class="term-ok">${u}</span> <span class="term-dim">— ${d}</span>`);
    }
  },

  theme() {
    toggleTheme();
    const isLight = document.documentElement.classList.contains('light');
    termPrint(`<span class="term-dim">已切换至${isLight ? '浅色' : '暗色'}主题</span>`);
  },

  clear() {
    authOutput.innerHTML = '';
  },

  gui() {
    if (term.mode === 'auth') { termPrint('<span class="term-warn">请先登录</span>'); return; }
    state.currentKb = term.curKb;
    state.currentConv = term.curConv;
    showApp();
    termPrintEmpty();
  },

  logout() {
    if (term.mode === 'auth') { termPrint('<span class="term-warn">尚未登录</span>'); return; }
    api('POST', '/auth/logout').catch(() => {});
    doLogout();
  },

  async whoami() {
    let u = state.user;
    try {
      const me = await api('GET', '/auth/me');
      if (me) u = me;
    } catch {}
    if (!u) { termPrint('<span class="term-warn">未登录</span>'); return; }
    termPrint(`用户：<span class="term-ok">${esc(u.nickname || u.username)}</span>（${esc(u.username)}）· 角色：${esc(u.role || 'USER')}`);
  },

  async status() {
    const u = state.user;
    termPrint(`用户：<span class="term-ok">${esc(u?.nickname || u?.username || '-')}</span>`);
    if (term.curKb) termPrint(`当前知识库：<span class="term-hl">#${term.curKb.id} ${esc(term.curKb.name)}</span>`);
    if (term.curConv) termPrint(`当前会话：<span class="term-hl">#${term.curConv.id}</span>（${esc(term.curConv.title || '')}）`);
    try {
      const d = await api('GET', '/kbs?page=1&pageSize=1');
      termPrint(`知识库总数：${d?.total ?? '-'}`);
    } catch {}
    try {
      const d = await api('GET', '/conversations?page=1&pageSize=1');
      termPrint(`会话总数：${d?.total ?? '-'}`);
    } catch {}
  },

  /* ---- 知识库 ---- */
  async kb(c1, args) {
    switch (c1) {
      case 'list': {
        const kw = (args[0] || '').toLowerCase();
        const d = await api('GET', '/kbs?page=1&pageSize=100');
        const list = (d?.list || []).filter(k => !kw || k.name.toLowerCase().includes(kw));
        if (!list.length) {
          termPrint('<span class="term-dim">没有知识库 — 用 <span class="term-hl">kb create &lt;名称&gt;</span> 创建</span>');
          return;
        }
        for (const k of list) {
          const cur = term.curKb?.id === k.id ? ' <span class="term-ok">[当前]</span>' : '';
          termPrint(`<span class="term-hl">#${k.id}</span> ${esc(k.name)}<span class="term-muted"> — ${k.docCount || 0} 文档 · ${k.chunkCount || 0} 分块 · chunk:${k.chunkSize || 400}/ov:${k.overlap || 80}</span>${cur}`);
        }
        termPrint(`<span class="term-dim">共 ${list.length} 条 · kb show &lt;id&gt; 详情 · kb use &lt;id&gt; 设为当前</span>`);
        break;
      }
      case 'show': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：kb show &lt;id&gt;</span>'); return; }
        const k = await api('GET', `/kbs/${id}`);
        termPrint(`<span class="term-hl">#${k.id}</span> ${esc(k.name)}`);
        termPrint(`  描述：${esc(k.description || '-')}`);
        termPrint(`  分块大小：${k.chunkSize} · 重叠：${k.overlap}`);
        termPrint(`  文档：${k.docCount} · 分块：${k.chunkCount} · 创建：${new Date(k.createdAt).toLocaleString()}`);
        break;
      }
      case 'create': {
        const { flags, positional } = parseFlags(args);
        const name = positional[0] ? stripBrackets(positional[0]) : null;
        if (!name) { termPrint('<span class="term-warn">用法：kb create &lt;名称&gt; [描述] [分块大小] [重叠]</span>'); return; }
        // 智能解析：非数字→描述，第一个数字→分块大小，第二个数字→重叠；兼容 --desc=/--chunk=/--overlap= flag
        let description = flags.desc || '';
        let chunkSize = flags.chunk !== undefined ? num(flags.chunk, 400) : null;
        let overlap = flags.overlap !== undefined ? num(flags.overlap, 80) : null;
        for (const a of positional.slice(1)) {
          const v = stripBrackets(a);
          if (/^\d+$/.test(v)) {
            if (chunkSize === null) chunkSize = num(v, 400);
            else if (overlap === null) overlap = num(v, 80);
          } else if (!description) {
            description = v;
          }
        }
        chunkSize = chunkSize === null ? 400 : chunkSize;
        overlap = overlap === null ? 80 : overlap;
        const k = await api('POST', '/kbs', {
          name,
          description,
          chunkSize,
          overlap,
        });
        termPrint(`<span class="term-ok">✓ 已创建</span> <span class="term-hl">#${k.id}</span> ${esc(k.name)} — <span class="term-hl">kb use ${k.id}</span> 设为当前`);
        break;
      }
      case 'edit': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：kb edit &lt;id&gt; [--name=] [--desc=] [--chunk=] [--overlap=]</span>'); return; }
        const { flags } = parseFlags(args);
        const old = await api('GET', `/kbs/${id}`);
        const k = await api('PUT', `/kbs/${id}`, {
          name: flags.name ?? old.name,
          description: flags.desc !== undefined ? flags.desc : old.description,
          chunkSize: flags.chunk !== undefined ? num(flags.chunk, old.chunkSize) : old.chunkSize,
          overlap: flags.overlap !== undefined ? num(flags.overlap, old.overlap) : old.overlap,
        });
        termPrint(`<span class="term-ok">✓ 已更新</span> <span class="term-hl">#${k.id}</span> ${esc(k.name)}`);
        if (term.curKb?.id === k.id) { term.curKb = k; updateTermTitle(); }
        break;
      }
      case 'delete': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：kb delete &lt;id&gt;</span>'); return; }
        const k = await api('GET', `/kbs/${id}`);
        termConfirm(`删除知识库「${k.name}」？其下所有文档将一并进入回收站`, async ok => {
          if (!ok) { termPrint('<span class="term-dim">已取消</span>'); return; }
          await api('DELETE', `/kbs/${id}`);
          if (term.curKb?.id === id) { term.curKb = null; term.curConv = null; }
          updateTermTitle();
          termPrint(`<span class="term-ok">✓ 已删除 #${id}</span>`);
        });
        break;
      }
      case 'use': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：kb use &lt;id&gt;</span>'); return; }
        const k = await api('GET', `/kbs/${id}`);
        term.curKb = k;
        updateTermTitle();
        termPrint(`<span class="term-ok">✓ 当前知识库</span> → <span class="term-hl">#${k.id}</span> ${esc(k.name)} — <span class="term-hl">doc list</span> 查看文档`);
        break;
      }
      default:
        await TERM_CMDS.help('kb');
    }
  },

  /* ---- 文档 ---- */
  async doc(c1, args) {
    switch (c1) {
      case 'list': {
        const kbId = num(args[0]) || term.curKb?.id;
        if (!kbId) { termPrint('<span class="term-warn">请先 <span class="term-hl">kb use &lt;id&gt;</span> 或使用 <span class="term-hl">doc list &lt;kbId&gt;</span></span>'); return; }
        const d = await api('GET', `/kbs/${kbId}/documents?page=1&pageSize=100`);
        const list = d?.list || [];
        if (!list.length) {
          termPrint('<span class="term-dim">该知识库暂无文档 — <span class="term-hl">doc upload</span> 上传</span>');
          return;
        }
        const ST = { READY: 'ok', FAILED: 'err', UPLOADED: 'dim', PARSING: 'warn', CHUNKING: 'warn', EMBEDDING: 'warn' };
        for (const x of list) {
          termPrint(`<span class="term-hl">#${x.id}</span> ${esc(x.name)} <span class="term-${ST[x.status] || 'dim'}">${x.status}</span> <span class="term-muted">${fmtSize(x.size)} · ${x.chunkCount} 分块</span>`);
        }
        termPrint(`<span class="term-dim">共 ${list.length} 条 · doc show &lt;id&gt; 详情 · doc delete &lt;id&gt; 删除</span>`);
        break;
      }
      case 'show': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：doc show &lt;id&gt;</span>'); return; }
        const x = await api('GET', `/documents/${id}`);
        termPrint(`<span class="term-hl">#${x.id}</span> ${esc(x.name)} · ${esc(x.type || '')}`);
        termPrint(`  状态：${x.status}${x.errorMsg ? ` <span class="term-err">（${esc(x.errorMsg)}）</span>` : ''}`);
        termPrint(`  大小：${fmtSize(x.size)} · 分块：${x.chunkCount}`);
        termPrint(`  创建：${new Date(x.createdAt).toLocaleString()}`);
        break;
      }
      case 'upload': {
        const kbId = num(args[0]) || term.curKb?.id;
        if (!kbId) { termPrint('<span class="term-warn">请先 <span class="term-hl">kb use &lt;id&gt;</span> 或使用 <span class="term-hl">doc upload &lt;kbId&gt;</span></span>'); return; }
        termPrint('<span class="term-dim">请选择文件（.txt/.md/.docx/.pdf/.xls/.xlsx/.ppt/.pptx/.html/.csv/.epub，≤20MB）...</span>');
        termFileInput.onchange = async () => {
          const f = termFileInput.files[0];
          termFileInput.value = '';
          if (!f) { termPrint('<span class="term-warn">已取消上传</span>'); return; }
          if (f.size > 20 * 1024 * 1024) { termPrintErr(new Error('文件超过 20MB')); return; }
          const fd = new FormData();
          fd.append('file', f);
          const x = await api('POST', `/kbs/${kbId}/documents`, fd, true);
          termPrint(`<span class="term-ok">✓ 已上传</span> <span class="term-hl">#${x.id}</span> ${esc(x.name)} <span class="term-dim">（${x.status}）— <span class="term-hl">doc list</span> 查看处理进度</span>`);
        };
        termFileInput.click();
        break;
      }
      case 'delete': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：doc delete &lt;id&gt;</span>'); return; }
        const x = await api('GET', `/documents/${id}`);
        termConfirm(`删除文档「${x.name}」？（进入回收站，可恢复）`, async ok => {
          if (!ok) { termPrint('<span class="term-dim">已取消</span>'); return; }
          await api('DELETE', `/documents/${id}`);
          termPrint(`<span class="term-ok">✓ 已删除 #${id}</span> <span class="term-dim">— trash restore doc ${id} 可恢复</span>`);
        });
        break;
      }
      case 'reprocess': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：doc reprocess &lt;id&gt;</span>'); return; }
        await api('POST', `/documents/${id}/reprocess`);
        termPrint(`<span class="term-ok">✓ 已触发重新处理 #${id}</span> <span class="term-dim">— <span class="term-hl">doc list</span> 查看进度</span>`);
        break;
      }
      default:
        await TERM_CMDS.help('doc');
    }
  },

  /* ---- 回收站 ---- */
  async trash(c1, args) {
    const KIND_LABEL = { doc: '文档', kb: '知识库' };
    const loadDocs = () => api('GET', '/recycle/documents');
    const loadKbs = () => api('GET', '/recycle/kbs');
    switch (c1) {
      case 'list': {
        const kind = (args[0] || '').toLowerCase();
        if (kind && kind !== 'doc' && kind !== 'kb') {
          termPrint('<span class="term-warn">用法：trash list [doc|kb]</span>');
          return;
        }
        if (kind !== 'doc') {
          const kbs = await loadKbs();
          if (!kbs.length) termPrint('<span class="term-dim">回收站中没有知识库</span>');
          for (const k of kbs) {
            termPrint(`<span class="term-hl">#${k.id}</span> ${esc(k.name)} <span class="term-muted">— ${k.docCount || 0} 文档 · 删除于 ${fmtTime(k.deletedAt)}</span>`);
          }
        }
        if (kind !== 'kb') {
          const docs = await loadDocs();
          if (!docs.length) termPrint('<span class="term-dim">回收站中没有文档</span>');
          for (const d of docs) {
            termPrint(`<span class="term-hl">#${d.id}</span> ${esc(d.name)} <span class="term-muted">— ${esc(d.kbName || 'kb#' + d.kbId)} · ${fmtSize(d.size)} · ${d.chunkCount || 0} 分块 · 删除于 ${fmtTime(d.deletedAt)}</span>`);
          }
        }
        termPrint(`<span class="term-dim">trash restore doc|kb &lt;id&gt; 恢复 · trash purge doc|kb &lt;id&gt; 永久删除（均需密码）</span>`);
        break;
      }
      case 'restore':
      case 'purge': {
        const kind = (args[0] || '').toLowerCase();
        const id = num(args[1]);
        if ((kind !== 'doc' && kind !== 'kb') || !id) {
          termPrint(`<span class="term-warn">用法：trash ${c1} doc|kb &lt;id&gt;</span>`);
          return;
        }
        const list = kind === 'doc' ? await loadDocs() : await loadKbs();
        const item = list.find(x => x.id === id);
        if (!item) {
          termPrint(`<span class="term-err">回收站中不存在该${KIND_LABEL[kind]}：#${id}</span> — 用 <span class="term-hl">trash list</span> 查看`);
          return;
        }
        const verb = c1 === 'purge' ? '永久删除' : '恢复';
        termConfirm(
          `${verb}${KIND_LABEL[kind]}「${item.name}」${c1 === 'purge' ? '？此操作不可恢复！' : ''}`,
          ok => {
            if (!ok) { termPrint('<span class="term-dim">已取消</span>'); return; }
            termAskPassword('请输入密码完成身份认证', async pwd => {
              try {
                termPrint('<span class="term-dim">认证中...</span>');
                const path = kind === 'doc' ? `/documents/${id}/${c1}` : `/kbs/${id}/${c1}`;
                await api('POST', path, { password: pwd });
                termPrint(`<span class="term-ok">✓ 已${verb} #${id} ${esc(item.name)}</span>`);
              } catch (err) {
                termPrintErr(err);
              }
            });
          }
        );
        break;
      }
      default:
        await TERM_CMDS.help('trash');
    }
  },

  /* ---- 会话 ---- */
  async conv(c1, args) {
    switch (c1) {
      case 'list': {
        const d = await api('GET', '/conversations?page=1&pageSize=100');
        const list = d?.list || [];
        if (!list.length) {
          termPrint('<span class="term-dim">没有会话 — <span class="term-hl">conv new</span> 创建</span>');
          return;
        }
        for (const c of list) {
          const cur = term.curConv?.id === c.id ? ' <span class="term-ok">[当前]</span>' : '';
          termPrint(`<span class="term-hl">#${c.id}</span> ${esc(c.title || '新对话')} <span class="term-muted">kb#${c.kbId} · ${new Date(c.createdAt).toLocaleString()}</span>${cur}`);
        }
        termPrint(`<span class="term-dim">共 ${list.length} 条 · conv open &lt;id&gt; 打开 · conv delete &lt;id&gt; 删除</span>`);
        break;
      }
      case 'new': {
        const kbId = num(args[0]) || term.curKb?.id;
        if (!kbId) { termPrint('<span class="term-warn">请先 <span class="term-hl">kb use &lt;id&gt;</span> 或使用 <span class="term-hl">conv new &lt;kbId&gt;</span></span>'); return; }
        const c = await api('POST', '/conversations', { kbId });
        term.curConv = c;
        updateTermTitle();
        termPrint(`<span class="term-ok">✓ 已创建会话</span> <span class="term-hl">#${c.id}</span> — <span class="term-hl">chat</span> 进入对话，或 <span class="term-hl">chat ask &lt;问题&gt;</span> 直接提问`);
        break;
      }
      case 'open': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：conv open &lt;id&gt;</span>'); return; }
        const c = await api('GET', `/conversations/${id}`);
        term.curConv = c;
        if (term.curKb?.id !== c.kbId) {
          try { term.curKb = await api('GET', `/kbs/${c.kbId}`); } catch {}
        }
        updateTermTitle();
        termPrint(`<span class="term-hl">#${c.id}</span> ${esc(c.title || '新对话')} <span class="term-muted">kb#${c.kbId} · ${new Date(c.createdAt).toLocaleString()}</span>`);
        const d = await api('GET', `/conversations/${id}/messages?page=1&pageSize=50`);
        const msgs = d?.list || [];
        if (!msgs.length) { termPrint('<span class="term-dim">（暂无消息）</span>'); return; }
        for (const m of msgs) {
          const who = m.role === 'user' ? '<span class="term-hl">me&gt;</span>' : '<span class="term-ok">ai&gt;</span>';
          termPrint(`${who} ${esc(m.content)}`);
        }
        termPrint(`<span class="term-dim">— 共 ${msgs.length} 条历史消息，<span class="term-hl">chat</span> 继续对话 —</span>`);
        break;
      }
      case 'show': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：conv show &lt;id&gt;</span>'); return; }
        const c = await api('GET', `/conversations/${id}`);
        termPrint(`<span class="term-hl">#${c.id}</span> ${esc(c.title || '新对话')}`);
        termPrint(`  知识库：#${c.kbId} · 创建：${new Date(c.createdAt).toLocaleString()}`);
        break;
      }
      case 'delete': {
        const id = num(args[0]);
        if (!id) { termPrint('<span class="term-warn">用法：conv delete &lt;id&gt;</span>'); return; }
        const c = await api('GET', `/conversations/${id}`);
        termConfirm(`删除会话「${c.title || '新对话'}」？`, async ok => {
          if (!ok) { termPrint('<span class="term-dim">已取消</span>'); return; }
          await api('DELETE', `/conversations/${id}`);
          if (term.curConv?.id === id) { term.curConv = null; updateTermTitle(); }
          termPrint(`<span class="term-ok">✓ 已删除会话 #${id}</span>`);
        });
        break;
      }
      default:
        await TERM_CMDS.help('conv');
    }
  },

  /* ---- 对话 ---- */
  async chat(c1, args) {
    if (c1 === 'ask') {
      const q = args.join(' ');
      if (!q) { termPrint('<span class="term-warn">用法：chat ask &lt;问题&gt;</span>'); return; }
      if (term.mode === 'auth') { termPrint('<span class="term-warn">请先登录</span>'); return; }
      const conv = await ensureConv();
      if (!conv) return;
      termPrint(`<span class="term-hl">me&gt;</span> ${esc(q)}`);
      await termAsk(conv.id, conv.kbId, q);
      return;
    }
    if (c1 !== null) { await TERM_CMDS.help('chat'); return; }
    if (term.mode === 'auth') { termPrint('<span class="term-warn">请先登录</span>'); return; }
    const conv = await ensureConv();
    if (!conv) return;
    term.mode = 'chat';
    updatePrompt();
    termPrint('<span class="term-ok">已进入对话模式</span> — <span class="term-dim">直接输入问题提问，<span class="term-hl">exit</span> 退出</span>');
  },
};

async function ensureConv() {
  if (term.curConv) return term.curConv;
  const kbId = term.curKb?.id;
  if (!kbId) {
    termPrint('<span class="term-warn">请先 <span class="term-hl">kb use &lt;id&gt;</span> 选择知识库</span>');
    return null;
  }
  const c = await api('POST', '/conversations', { kbId });
  term.curConv = c;
  updateTermTitle();
  termPrint(`<span class="term-dim">（已自动创建会话 #${c.id}）</span>`);
  return c;
}

async function termChatInput(raw) {
  const lower = raw.toLowerCase();
  if (lower === 'exit' || lower === 'quit') {
    term.mode = 'app';
    updatePrompt();
    termPrint('<span class="term-dim">已退出对话模式</span>');
    return;
  }
  termPrint(`<span class="term-hl">me&gt;</span> ${esc(raw)}`);
  const conv = term.curConv;
  if (!conv) {
    termPrint('<span class="term-warn">会话已失效，请 <span class="term-hl">conv new</span> 或 <span class="term-hl">conv open</span></span>');
    term.mode = 'app';
    updatePrompt();
    return;
  }
  await termAsk(conv.id, conv.kbId, raw);
}

async function termAsk(convId, kbId, q) {
  if (term.busy) { termPrint('<span class="term-warn">正在生成回答，请稍候...</span>'); return; }
  term.busy = true;
  const line = document.createElement('div');
  line.className = 'term-line';
  line.innerHTML = '<div class="term-ai-md"><span class="term-ok">ai&gt;</span> <span class="term-ai-text md"></span></div><span class="term-blink">▍</span>';
  authOutput.appendChild(line);
  const textEl = line.querySelector('.term-ai-text');
  const blinkEl = line.querySelector('.term-blink');
  const scroll = () => { authOutput.scrollTop = authOutput.scrollHeight; };
  scroll();

  let fullContent = '';
  let sources = [];

  const handlePart = part => {
    const lines = part.split('\n');
    let eventType = '';
    const dataLines = [];
    for (const l of lines) {
      if (l.startsWith('event: ')) eventType = l.slice(7).trim();
      else if (l.startsWith('data: ')) dataLines.push(l.slice(6));
    }
    const dataStr = dataLines.join('\n');
    if (!eventType || !dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (eventType === 'meta') {
        if (data.conversationId) term.curConv = { id: data.conversationId, kbId, title: term.curConv?.title || '新对话' };
      } else if (eventType === 'delta') {
        fullContent += data.content || '';
        textEl.innerHTML = renderMarkdown(fullContent);
        scroll();
      } else if (eventType === 'done') {
        fullContent = data.fullContent || fullContent;
        sources = data.sources || [];
        textEl.innerHTML = renderMarkdown(fullContent);
        blinkEl.remove();
        scroll();
      } else if (eventType === 'error') {
        textEl.textContent = '错误：' + (data.message || '未知错误');
        blinkEl.remove();
        scroll();
      }
    } catch {}
  };

  try {
    const resp = await fetch(API + '/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token,
      },
      body: JSON.stringify({ conversationId: convId, kbId, question: q }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      let j = null;
      try { j = JSON.parse(text); } catch { j = null; }
      let code = j && typeof j.code === 'number' ? j.code : null;
      let msg = j && j.message ? j.message : null;
      if (code === null) {
        const entry = HTTP_STATUS_MAP[resp.status];
        code = entry ? entry[0] : 50000;
        msg = msg || (entry ? entry[1] : '请求失败');
      }
      if (code === 40100 || code === 40101) {
        handleSessionExpired();
      }
      textEl.textContent = '请求失败：' + (msg || '请求失败');
      blinkEl.remove();
      term.busy = false;
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const p of parts) handlePart(p);
    }
    if (buf.trim()) handlePart(buf);
  } catch (err) {
    textEl.textContent = '请求失败：' + (err.message || '未知错误');
    blinkEl.remove();
    scroll();
    term.busy = false;
    return;
  }

  if (sources.length) {
    termPrint('<span class="term-dim">引用来源：</span>');
    sources.forEach((s, i) => {
      termPrint(`  <span class="term-muted">[${i + 1}]</span> ${esc(s.documentName)} <span class="term-dim">› ${esc(s.sectionPath || '')}</span> <span class="term-ok">${(s.similarity * 100).toFixed(0)}%</span>`);
    });
  }
  term.busy = false;
  updateTermTitle();
}

/* ============================================================
   KB MODULE
   ============================================================ */
function renderKbListSkeleton() {
  const el = document.getElementById('kb-list');
  el.innerHTML = [1,2,3].map(() =>
    `<div class="sidebar-item skeleton" style="margin-bottom:2px;padding:8px">
       <div class="kb-avatar"><div class="kb-av" style="opacity:.2"></div><div class="kb-text"><div class="name" style="height:14px;width:80px">&nbsp;</div><div class="meta" style="height:10px;width:120px;margin-top:4px">&nbsp;</div></div></div>
     </div>`
  ).join('');
}

function renderDocListSkeleton() {
  const el = document.getElementById('doc-list');
  if (!el) return;
  el.innerHTML = [1,2,3].map(() =>
    `<div class="doc-item skeleton"><div class="doc-name">&nbsp;</div><div>&nbsp;</div><div>&nbsp;</div><div>&nbsp;</div></div>`
  ).join('');
}

function renderStatsSkeleton() {
  const body = document.getElementById('kb-body');
  if (!body) return;
  // 只在统计卡片尚未渲染时显示骨架（已有 .val 的跳过）
  if (body.querySelector('.stat-card .val[data-count]')) return;
  const statsEl = body.querySelector('.kb-stats');
  if (statsEl) {
    statsEl.innerHTML = [1,2,3,4].map(() =>
      `<div class="stat-card skeleton"><div class="val" style="height:28px;width:50px">&nbsp;</div><div class="lbl" style="height:12px;width:60px;margin-top:4px">&nbsp;</div></div>`
    ).join('');
  }
}

async function loadKbs() {
  try {
    renderKbListSkeleton();
    const data = await api('GET', '/kbs?page=1&pageSize=100');
    state.kbs = data?.list || [];
    renderKbList();
  } catch {}
}

function renderKbList(filter = '') {
  const el = document.getElementById('kb-list');
  const q = filter.toLowerCase();
  el.innerHTML = '';
  state.kbs
    .filter(k => !q || k.name.toLowerCase().includes(q))
    .forEach(k => {
      const item = document.createElement('div');
      item.className = 'sidebar-item' + (state.currentKb?.id === k.id ? ' active' : '');
      const init = (k.name || '?').trim().charAt(0).toUpperCase();
      item.innerHTML = `
        <div class="kb-avatar">
          <span class="kb-av" data-kb-av>${esc(init)}</span>
          <div class="kb-text">
            <div class="name">${esc(k.name)}</div>
            <div class="meta">${k.docCount || 0} 文档 · ${k.chunkCount || 0} 分块</div>
          </div>
        </div>`;
      item.onclick = () => selectKb(k);
      el.appendChild(item);
    });
}

async function selectKb(kb) {
  state.currentKb = kb;
  updateAppTitle();
  renderKbList(document.getElementById('kb-search').value);
  showKbView();
  stopAllDocPolls();
  if (isMobile()) closeMobileSidebar();
  document.getElementById('kb-title').textContent = kb.name;
  document.getElementById('btn-upload-doc').style.display = '';
  document.getElementById('btn-edit-kb').style.display = '';
  document.getElementById('btn-del-kb').style.display = '';
  document.getElementById('btn-start-chat').style.display = '';

  const body = document.getElementById('kb-body');
  // 一次性拼完整 HTML 再赋值：innerHTML += 会序列化重建 DOM，
  // 会把动画启动后置为 0 的文本固化、并让 rAF 更新到已脱离文档的旧节点
  let html = `<div class="kb-stats">${statsHtml(kb)}</div>`;
  if (kb.description) {
    html += `<p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">${esc(kb.description)}</p>`;
  }
  html += `<div class="sidebar-title" style="padding-left:0">文档列表</div><div class="doc-list" id="doc-list"></div>`;
  body.innerHTML = html;
  renderStats(kb, true);
  loadDocs(kb.id);
}

/* 统计卡片：HTML 生成 + 渲染 + 数据回流刷新 */
function statsHtml(kb) {
  return `<div class="stat-card"><div class="val" data-count="${kb.docCount || 0}">${kb.docCount || 0}</div><div class="lbl">文档数</div></div>
    <div class="stat-card"><div class="val" data-count="${kb.chunkCount || 0}">${kb.chunkCount || 0}</div><div class="lbl">分块数</div></div>
    <div class="stat-card"><div class="val">${kb.chunkSize || 400}</div><div class="lbl">分块大小</div></div>
    <div class="stat-card"><div class="val">${kb.overlap || 80}</div><div class="lbl">重叠</div></div>`;
}

function renderStats(kb, animate) {
  const statsEl = document.querySelector('#kb-body .kb-stats');
  if (!statsEl) return;
  statsEl.innerHTML = statsHtml(kb);
  if (animate) {
    statsEl.querySelectorAll('.val[data-count]').forEach(el => animateCount(el, el.dataset.count));
  }
}

/* 从 state.kbs 取最新数据回填统计卡片（上传/轮询终态后调用） */
function refreshKbStats() {
  if (!state.currentKb) return;
  const fresh = state.kbs.find(k => k.id === state.currentKb.id);
  if (fresh) {
    state.currentKb = fresh;
    renderStats(fresh, false);
  }
}

function renderKbEmpty() {
  document.getElementById('kb-title').textContent = '选择一个知识库';
  ['btn-upload-doc', 'btn-edit-kb', 'btn-del-kb', 'btn-start-chat'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  const body = document.getElementById('kb-body');
  body.innerHTML = `<div class="empty-state" id="kb-empty">
    <div class="empty-title">kb&gt;</div>
    <p class="empty-desc">选择左侧知识库查看详情<br>或点击 <b>+</b> 创建新知识库</p>
  </div>`;
}

function stopAllDocPolls() {
  Object.keys(state.docPollTimers).forEach(id => {
    clearInterval(state.docPollTimers[id]);
    delete state.docPollTimers[id];
  });
}

async function loadDocs(kbId) {
  try {
    renderDocListSkeleton();
    renderStatsSkeleton();
    const data = await api('GET', `/kbs/${kbId}/documents?page=1&pageSize=100`);
    if (state.currentKb?.id !== kbId) return;
    state.docs = data?.list || [];
    renderDocs();
  } catch {}
}

function renderDocs() {
  const el = document.getElementById('doc-list');
  if (!el) return;
  el.innerHTML = '';
  if (!state.docs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-title" style="font-size:28px">暂无文档</div>
      <p class="empty-desc">上传文档或拖拽文件到此处</p>
    </div>`;
    return;
  }
  state.docs.forEach(d => {
    const item = document.createElement('div');
    item.className = 'doc-item';
    const badgeCls = 'badge badge-' + d.status.toLowerCase();
    item.innerHTML = `
      <div class="doc-name">${esc(d.name)}</div>
      <span class="${badgeCls}">${d.status}</span>
      <div class="doc-size">${fmtSize(d.size)}</div>
      <div class="doc-actions">
        ${d.status !== 'READY' && d.status !== 'FAILED' ? '' : `<button class="btn-sm" onclick="reprocessDoc(${d.id})">重处理</button>`}
        <button class="btn-sm btn-err" onclick="deleteDoc(${d.id})">删</button>
      </div>`;
    el.appendChild(item);
    if (!['READY', 'FAILED'].includes(d.status)) pollDoc(d.kbId, d.id);
  });
}

function pollDoc(kbId, docId) {
  if (state.docPollTimers[docId]) return;
  state.docPollTimers[docId] = setInterval(async () => {
    try {
      const d = await api('GET', `/documents/${docId}`);
      if (!d) return;
      if (state.currentKb?.id !== kbId) return;
      const idx = state.docs.findIndex(x => x.id === docId);
      if (idx >= 0) state.docs[idx] = d;
      if (['READY', 'FAILED'].includes(d.status)) {
        clearInterval(state.docPollTimers[docId]);
        delete state.docPollTimers[docId];
        renderDocs();
        if (state.currentKb) loadKbs().then(refreshKbStats);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 40400 || err.code === 40401)) {
        clearInterval(state.docPollTimers[docId]);
        delete state.docPollTimers[docId];
        if (state.currentKb?.id === kbId) renderDocs();
      } else if (err instanceof ApiError && (err.code === 40100 || err.code === 40101)) {
        clearInterval(state.docPollTimers[docId]);
        delete state.docPollTimers[docId];
      }
    }
  }, 5000);
}

async function reprocessDoc(id) {
  try {
    await api('POST', `/documents/${id}/reprocess`);
    toast('已触发重新处理', 'ok');
    loadDocs(state.currentKb.id);
  } catch {}
}

async function deleteDoc(id) {
  if (!confirm('确认删除该文档？删除后可在回收站恢复。')) return;
  try {
    await api('DELETE', `/documents/${id}`);
    toast('已删除，可在回收站恢复', 'ok');
    loadDocs(state.currentKb.id);
    loadKbs().then(refreshKbStats);
  } catch {}
}

/* ============================================================
   RECYCLE BIN（GUI）
   ============================================================ */
function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleString() : '-';
}

document.getElementById('btn-recycle').onclick = openRecycleModal;

async function openRecycleModal() {
  openModal('modal-recycle');
  await refreshRecycleModal();
}

async function refreshRecycleModal() {
  if (!document.getElementById('modal-recycle').classList.contains('active')) return;
  const loading = '<div style="color:var(--text-dim);font-size:13px;padding:6px 0">加载中...</div>';
  document.getElementById('recycle-doc-list').innerHTML = loading;
  document.getElementById('recycle-kb-list').innerHTML = loading;
  try {
    const [docs, kbs] = await Promise.all([
      api('GET', '/recycle/documents'),
      api('GET', '/recycle/kbs'),
    ]);
    state.recycleCache.docs = docs || [];
    state.recycleCache.kbs = kbs || [];
  } catch {
    state.recycleCache.docs = [];
    state.recycleCache.kbs = [];
  }
  renderRecycleLists();
}

function recycleItemHtml(item, type) {
  const meta = type === 'doc'
    ? `${esc(item.kbName || 'kb#' + item.kbId)} · ${fmtSize(item.size)} · ${item.chunkCount || 0} 分块`
    : `${item.docCount || 0} 个文档`;
  return `
    <div class="doc-name">${esc(item.name)}</div>
    <span class="badge badge-dim">${esc(item.type ? ('.' + item.type) : (type === 'doc' ? '文档' : '知识库'))}</span>
    <div class="doc-size">${meta}<br><span style="font-size:11px;opacity:.75">删除于 ${fmtTime(item.deletedAt)}</span></div>
    <div class="doc-actions">
      <button class="btn-sm" onclick="recycleAct('${type}', ${item.id}, 'restore')">恢复</button>
      <button class="btn-sm btn-err" onclick="recycleAct('${type}', ${item.id}, 'purge')">永久删除</button>
    </div>`;
}

function renderRecycleLists() {
  const emptyHint = '<div style="color:var(--text-dim);font-size:13px;padding:4px 0">暂无内容</div>';
  const docs = state.recycleCache.docs;
  const kbs = state.recycleCache.kbs;
  document.getElementById('recycle-doc-list').innerHTML = docs.length
    ? docs.map(d => `<div class="doc-item">${recycleItemHtml(d, 'doc')}</div>`).join('')
    : emptyHint;
  document.getElementById('recycle-kb-list').innerHTML = kbs.length
    ? kbs.map(k => `<div class="doc-item">${recycleItemHtml(k, 'kb')}</div>`).join('')
    : emptyHint;
}

/* 回收站最终操作入口：弹密码认证模态框（供内联 onclick 调用） */
function recycleAct(type, id, mode) {
  const cache = type === 'doc' ? state.recycleCache.docs : state.recycleCache.kbs;
  const item = cache.find(x => x.id === id);
  const name = item?.name || ('#' + id);
  state.recycleAction = { type, id, mode, name };
  document.getElementById('modal-password-title').textContent =
    mode === 'purge' ? `永久删除${type === 'doc' ? '文档' : '知识库'}` : `恢复${type === 'doc' ? '文档' : '知识库'}`;
  document.getElementById('modal-password-desc').textContent =
    (mode === 'purge'
      ? `即将永久删除「${name}」，此操作不可恢复！`
      : `即将恢复「${name}」。`)
    + '请输入登录密码完成身份认证。';
  document.getElementById('mp-password').value = '';
  document.getElementById('mp-err').textContent = '';
  openModal('modal-password');
}

async function confirmPasswordAction() {
  const a = state.recycleAction;
  if (!a) return;
  const pwd = document.getElementById('mp-password').value;
  const errEl = document.getElementById('mp-err');
  if (!pwd) { errEl.textContent = '请输入密码'; return; }
  errEl.textContent = '';
  const path = a.type === 'doc' ? `/documents/${a.id}/${a.mode}` : `/kbs/${a.id}/${a.mode}`;
  try {
    await api('POST', path, { password: pwd }, false, true);
    closeModal('modal-password');
    state.recycleAction = null;
    toast(a.mode === 'purge' ? '已永久删除' : '已恢复', 'ok');
    await refreshRecycleModal();
    loadKbs().then(refreshKbStats);
    if (state.currentKb) loadDocs(state.currentKb.id);
  } catch (err) {
    if (err.code === 40100 || err.code === 40101) return;
    errEl.textContent = err.message || '认证失败';
  }
}

document.getElementById('modal-recycle-close').onclick =
  document.getElementById('modal-recycle-ok').onclick = () => closeModal('modal-recycle');

document.getElementById('modal-password-close').onclick =
  document.getElementById('modal-password-cancel').onclick = () => {
    state.recycleAction = null;
    closeModal('modal-password');
  };

document.getElementById('modal-password-ok').onclick = confirmPasswordAction;
document.getElementById('mp-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); confirmPasswordAction(); }
});

/* KB CRUD */
document.getElementById('btn-new-kb').onclick = () => openKbModal();
document.getElementById('btn-edit-kb').onclick = () => {
  if (!state.currentKb) return;
  openKbModal(state.currentKb);
};
document.getElementById('btn-del-kb').onclick = async () => {
  if (!state.currentKb || !confirm('确认删除知识库「' + state.currentKb.name + '」？其下所有文档将一并进入回收站。')) return;
  try {
    await api('DELETE', `/kbs/${state.currentKb.id}`);
    toast('已删除，可在回收站恢复', 'ok');
    stopAllDocPolls();
    state.currentKb = null;
    renderKbEmpty();
    showKbView();
    loadKbs();
  } catch {}
};

function openKbModal(kb) {
  state.editingKbId = kb?.id || null;
  document.getElementById('modal-kb-title').textContent = kb ? '编辑知识库' : '新建知识库';
  document.getElementById('mk-name').value = kb?.name || '';
  document.getElementById('mk-desc').value = kb?.description || '';
  document.getElementById('mk-chunk').value = kb?.chunkSize || 400;
  document.getElementById('mk-overlap').value = kb?.overlap || 80;
  document.getElementById('mk-err').textContent = '';
  openModal('modal-kb');
}

document.getElementById('modal-kb-close').onclick =
  document.getElementById('modal-kb-cancel').onclick = () => closeModal('modal-kb');

document.getElementById('modal-kb-ok').onclick = async () => {
  const body = {
    name: document.getElementById('mk-name').value.trim(),
    description: document.getElementById('mk-desc').value.trim(),
    chunkSize: parseInt(document.getElementById('mk-chunk').value) || 400,
    overlap: parseInt(document.getElementById('mk-overlap').value) || 80,
  };
  const errEl = document.getElementById('mk-err');
  errEl.textContent = '';
  if (!body.name) { errEl.textContent = '名称不能为空'; return; }
  try {
    if (state.editingKbId) {
      await api('PUT', `/kbs/${state.editingKbId}`, body);
      toast('已更新', 'ok');
    } else {
      await api('POST', '/kbs', body);
      toast('已创建', 'ok');
    }
    closeModal('modal-kb');
    loadKbs();
  } catch (err) {
    if (err.code !== 40100 && err.code !== 40101) errEl.textContent = err.message;
  }
};

/* Upload */
async function uploadFile(file) {
  if (!state.currentKb) { toast('请先选择知识库', 'err'); return; }
  if (!file) { toast('请选择文件', 'err'); return; }
  if (file.size > 20 * 1024 * 1024) { toast('文件超过 20MB', 'err'); return; }
  const fd = new FormData();
  fd.append('file', file);
  try {
    await api('POST', `/kbs/${state.currentKb.id}/documents`, fd, true);
    toast('上传成功', 'ok');
    loadDocs(state.currentKb.id);
    // 同步刷新侧边栏计数与统计卡片
    loadKbs().then(refreshKbStats);
  } catch (err) {
    if (err.code !== 40100 && err.code !== 40101) toast(err.message, 'err');
  }
}

document.getElementById('btn-upload-doc').onclick = () => {
  document.getElementById('upload-file').value = '';
  document.getElementById('upload-err').textContent = '';
  openModal('modal-upload');
};

document.getElementById('modal-upload-close').onclick =
  document.getElementById('modal-upload-cancel').onclick = () => closeModal('modal-upload');

document.getElementById('modal-upload-ok').onclick = async () => {
  const file = document.getElementById('upload-file').files[0];
  const errEl = document.getElementById('upload-err');
  errEl.textContent = '';
  if (!file) { errEl.textContent = '请选择文件'; return; }
  if (file.size > 20 * 1024 * 1024) { errEl.textContent = '文件超过 20MB'; return; }
  await uploadFile(file);
  closeModal('modal-upload');
};

document.getElementById('kb-search').addEventListener('input', e =>
  renderKbList(e.target.value)
);

/* ============================================================
   CHAT MODULE
   ============================================================ */
document.getElementById('btn-new-chat').onclick = async () => {
  if (!state.currentKb) { toast('请先选择一个知识库', 'warn'); return; }
  try {
    const conv = await api('POST', '/conversations', { kbId: state.currentKb.id });
    state.currentConv = conv;
    updateAppTitle();
    state.chatMsgs = [];
    document.getElementById('chat-title').textContent = conv.title || '新对话';
    document.getElementById('chat-messages').innerHTML = '';
    showChatView();
    loadConversations();
  } catch {}
};

document.getElementById('btn-start-chat').onclick = () =>
  document.getElementById('btn-new-chat').click();
document.getElementById('btn-back-kb').onclick = showKbView;

async function loadConversations() {
  try {
    const data = await api('GET', '/conversations?page=1&pageSize=100');
    state.conversations = data?.list || [];
  } catch {}
}

document.getElementById('btn-send').onclick = sendChat;
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

let isStreaming = false;

async function doSend(q) {
  if (isStreaming) return;
  if (!q || !state.currentConv || !state.currentKb) return;

  appendMsg('user', q);
  lastUserText = q;
  const assistantEl = appendMsg('assistant', '', true);
  isStreaming = true;
  document.getElementById('btn-send').disabled = true;

  const handlePart = part => {
    const lines = part.split('\n');
    let eventType = '';
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
    }
    const dataStr = dataLines.join('\n');
    if (!eventType || !dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (eventType === 'delta') {
        fullContent += data.content || '';
        setAssistantText(assistantEl, fullContent, true);
      } else if (eventType === 'done') {
        fullContent = data.fullContent || fullContent;
        sources = data.sources || [];
        setAssistantText(assistantEl, fullContent, false);
        if (sources.length) renderSources(assistantEl, sources);
        assistantEl.dataset.rawText = fullContent;
      } else if (eventType === 'error') {
        setAssistantText(assistantEl, '错误：' + (data.message || '未知错误'), false);
      }
    } catch {}
  };

  try {
    const resp = await fetch(API + '/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token,
      },
      body: JSON.stringify({
        conversationId: state.currentConv.id,
        kbId: state.currentKb.id,
        question: q,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      let j = null;
      try { j = JSON.parse(text); } catch { j = null; }
      let code = j && typeof j.code === 'number' ? j.code : null;
      let msg = j && j.message ? j.message : null;
      if (code === null) {
        const entry = HTTP_STATUS_MAP[resp.status];
        code = entry ? entry[0] : 50000;
        msg = msg || (entry ? entry[1] : '请求失败');
      }
      if (code === 40100 || code === 40101) {
        handleSessionExpired(); return;
      }
      throw new ApiError(code, msg || '请求失败');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let fullContent = '';
    let sources = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) handlePart(part);
    }
    if (buf.trim()) handlePart(buf);
  } catch (err) {
    setAssistantText(assistantEl, '请求失败：' + err.message, false);
  } finally {
    isStreaming = false;
    document.getElementById('btn-send').disabled = false;
    document.getElementById('chat-messages').scrollTop =
      document.getElementById('chat-messages').scrollHeight;
  }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  input.value = '';
  await doSend(q);
}

function appendMsg(role, content, isPlaceholder) {
  const el = document.createElement('div');
  el.className = 'msg msg-' + role;
  if (isPlaceholder) {
    el.innerHTML = '<div class="md"></div><span class="cursor"></span>';
  } else {
    el.textContent = content;
  }
  if (role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-sm btn-ghost';
    copyBtn.textContent = '复制';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(el.dataset.rawText || el.textContent);
      toast('已复制', 'ok');
    };
    actions.appendChild(copyBtn);
    const regenBtn = document.createElement('button');
    regenBtn.className = 'btn-sm btn-ghost regen-btn';
    regenBtn.textContent = '重新生成';
    regenBtn.onclick = () => regenerateMsg();
    actions.appendChild(regenBtn);
    el.appendChild(actions);
    // 去掉上一条 AI 消息的重新生成按钮
    const msgs = document.querySelectorAll('#chat-messages .msg-assistant .regen-btn');
    msgs.forEach((btn, i) => { if (i < msgs.length - 1) btn.remove(); });
    el.dataset.rawText = content || '';
  }
  document.getElementById('chat-messages').appendChild(el);
  document.getElementById('chat-messages').scrollTop =
    document.getElementById('chat-messages').scrollHeight;
  return el;
}

let lastUserText = '';
function regenerateMsg() {
  if (!lastUserText) return;
  const msgs = document.getElementById('chat-messages');
  const lastAssistant = msgs.querySelector('.msg-assistant:last-of-type');
  if (lastAssistant) lastAssistant.remove();
  const lastUser = msgs.querySelector('.msg-user:last-of-type');
  if (lastUser) lastUser.remove();
  doSend(lastUserText);
}

function setAssistantText(el, text, showCursor) {
  const md = el.querySelector('.md') || document.createElement('div');
  md.className = 'md';
  if (!el.contains(md)) el.prepend(md);
  md.innerHTML = renderMarkdown(text);
  let cursor = el.querySelector('.cursor');
  if (showCursor) {
    if (!cursor) { cursor = document.createElement('span'); cursor.className = 'cursor'; }
    el.appendChild(cursor);
  } else if (cursor) {
    cursor.remove();
  }
  document.getElementById('chat-messages').scrollTop =
    document.getElementById('chat-messages').scrollHeight;
}

function renderSources(el, sources) {
  const srcEl = document.createElement('div');
  srcEl.className = 'msg-sources';
  srcEl.innerHTML =
    '<div class="src-title">引用来源</div>' +
    sources
      .map(
        s =>
          `<div class="src-item"><span>${esc(s.documentName)} › ${esc(s.sectionPath || '')}</span><span class="sim">${(s.similarity * 100).toFixed(0)}%</span></div>`
      )
      .join('');
  el.appendChild(srcEl);
}

/* ============================================================
   LOGOUT
   ============================================================ */
document.getElementById('btn-logout').addEventListener('click', async () => {
  if (!confirm('确定要登出吗？')) return;
  try { await api('POST', '/auth/logout'); } catch {}
  doLogout();
});

document.getElementById('btn-term').onclick = () => {
  term.curKb = state.currentKb;
  term.curConv = state.currentConv;
  updateTermTitle();
  showTerm();
};

/* ============================================================
   UTILS
   ============================================================ */
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtSize(b) {
  if (!b) return '-';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function animateCount(el, target) {
  const n = parseInt(target) || 0;
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches || n === 0) { el.textContent = n; return; }
  const dur = 600;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(n * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = '0';
  requestAnimationFrame(step);
}

/* ============================================================
   MARKDOWN RENDERER（轻量、安全，先转义再注入）
   支持：标题/加粗/斜体/行内代码/代码块/列表/引用/链接/分隔线
   ============================================================ */
function mdInline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_ \n])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const href = /^(https?:\/\/|mailto:|#)/i.test(url) ? url : '#';
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + label + '</a>';
  });
  return s;
}

function renderMarkdown(src) {
  if (!src) return '';
  const text = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

  const blocks = [];
  let txt = text.replace(/```([\w+-]*)\r?\n?([\s\S]*?)```/g, (m, lang, code) => {
    blocks.push({ lang, code });
    return '\u0000B' + (blocks.length - 1) + '\u0000';
  });

  const lines = txt.split('\n');
  const out = [];
  let para = [], list = null, quote = null;

  const flushPara = () => {
    if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + list.items.map(i => '<li>' + i + '</li>').join('') + '</' + tag + '>');
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote) { out.push('<blockquote>' + quote.join('<br>') + '</blockquote>'); quote = null; }
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const t = raw.trim();

    const cb = /^\u0000B(\d+)\u0000$/.exec(t);
    if (cb) {
      flushAll();
      const b = blocks[+cb[1]];
      out.push('<pre class="md-code"><code>' + esc(b.code || '') + '</code></pre>');
      continue;
    }

    if (t === '') { flushAll(); continue; }

    const h = /^(#{1,6})\s+(.+)$/.exec(t);
    if (h) { flushAll(); const l = h[1].length; out.push('<h' + l + '>' + mdInline(h[2]) + '</h' + l + '>'); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); out.push('<hr>'); continue; }

    const bq = /^&gt;\s?(.*)$/.exec(raw.trim()) || (raw.startsWith('>') ? /^>\s?(.*)$/.exec(raw) : null);
    if (bq) { flushPara(); flushList(); (quote = quote || []).push(mdInline(bq[1])); continue; }

    const ul = /^[-*+]\s+(.*)$/.exec(t);
    if (ul) { flushPara(); flushQuote(); (list = list || { ordered: false, items: [] }).items.push(mdInline(ul[1])); continue; }

    const ol = /^\d+[.)]\s+(.*)$/.exec(t);
    if (ol) { flushPara(); flushQuote(); (list = list || { ordered: true, items: [] }).items.push(mdInline(ol[1])); continue; }

    flushList(); flushQuote();
    para.push(mdInline(t));
  }
  flushAll();
  return out.join('\n');
}

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
const sidebarEl = () => document.getElementById('sidebar');
const caretEl = () => document.getElementById('sidebar-caret');
const menuBtn = () => document.getElementById('btn-app-menu');

function isMobile() { return window.matchMedia('(max-width:900px)').matches; }

function closeMobileSidebar() {
  document.getElementById('app-body').classList.remove('sidebar-open');
  if (menuBtn()) menuBtn().textContent = '☰';
}

function setCollapsed(collapsed) {
  sidebarEl().classList.toggle('collapsed', collapsed);
  const c = caretEl();
  if (c) {
    c.textContent = collapsed ? '▶' : '◀';
    c.setAttribute('aria-expanded', String(!collapsed));
  }
  localStorage.setItem('wq_sidebar_collapsed', collapsed ? 'true' : 'false');
}

// 桌面：caret 折叠/展开
if (caretEl()) {
  caretEl().onclick = () => setCollapsed(!sidebarEl().classList.contains('collapsed'));
}

// 移动端：菜单按钮开关侧边栏抽屉
if (menuBtn()) {
  menuBtn().onclick = () => {
    const open = !document.getElementById('app-body').classList.contains('sidebar-open');
    document.getElementById('app-body').classList.toggle('sidebar-open', open);
    menuBtn().textContent = open ? '✕' : '☰';
  };
}

// 点击内容区域关闭移动端抽屉
const contentArea = document.getElementById('content-area');
if (contentArea) {
  contentArea.addEventListener('click', () => {
    if (isMobile() && document.getElementById('app-body').classList.contains('sidebar-open')) closeMobileSidebar();
  });
}

// Esc：优先关闭最上层模态框，其次收起移动端抽屉
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const openModals = document.querySelectorAll('.modal-overlay.active:not(.closing)');
  if (openModals.length) { closeModal(openModals[openModals.length - 1].id); return; }
  if (isMobile() && document.getElementById('app-body').classList.contains('sidebar-open')) closeMobileSidebar();
});

// 初始化侧边栏状态（仅桌面）
if (!isMobile() && localStorage.getItem('wq_sidebar_collapsed') === 'true') {
  setCollapsed(true);
}

window.addEventListener('resize', () => {
  const sb = sidebarEl();
  if (isMobile()) {
    sb.classList.remove('collapsed');
    closeMobileSidebar();
  } else {
    // 从移动端切回桌面时，恢复记住的折叠状态
    const want = localStorage.getItem('wq_sidebar_collapsed') === 'true';
    if (sb.classList.contains('collapsed') !== want) setCollapsed(want);
  }
});

/* ============================================================
   DRAG & DROP UPLOAD（document 级监听 + pointer-events:none 覆盖层，杜绝闪烁）
   ============================================================ */
{
  const dropZone = document.getElementById('drop-zone');
  let dragDepth = 0;   // dragenter/dragleave 成对计数
  let hideTimer = null;

  const canUploadNow = () =>
    state.currentKb &&
    document.getElementById('app-view').classList.contains('active') &&
    document.getElementById('kb-view').style.display !== 'none';

  const show = () => { clearTimeout(hideTimer); dropZone.style.display = 'flex'; };
  const hide = () => {
    // 延迟一帧隐藏，吸收 enter/leave 的快速抖动
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { dropZone.style.display = 'none'; }, 80);
  };

  document.addEventListener('dragenter', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    if (canUploadNow()) show();
  });

  document.addEventListener('dragleave', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth--;
    if (dragDepth <= 0) { dragDepth = 0; hide(); }
  });

  document.addEventListener('dragover', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();   // 必须 preventDefault 才允许 drop
  });

  document.addEventListener('drop', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepth = 0;
    clearTimeout(hideTimer);
    dropZone.style.display = 'none';
    // 浏览器默认行为是打开文件，必须阻止
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  });

  // 拖拽被取消（Esc / 拖出窗口）时兜底复位
  window.addEventListener('dragend', () => { dragDepth = 0; dropZone.style.display = 'none'; });
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
window.addEventListener('keydown', e => {
  // 终端视图不拦截
  if (document.getElementById('auth-view').classList.contains('active')) return;
  const inInput = ['INPUT','TEXTAREA'].includes(document.target.tagName);

  // Ctrl/Cmd+K 聚焦搜索
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('kb-search')?.focus();
    return;
  }
  // / 聚焦搜索（不在输入框时）
  if (e.key === '/' && !inInput) {
    e.preventDefault();
    document.getElementById('kb-search')?.focus();
    return;
  }
  // ? 打开快捷键帮助（模态框已打开时不重复触发）
  if (e.key === '?' && !inInput && !document.querySelector('.modal-overlay.active')) {
    e.preventDefault();
    openModal('modal-shortcuts');
    return;
  }
  // Ctrl/Cmd+Enter 在聊天输入框内发送
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement?.id === 'chat-input') {
    e.preventDefault();
    sendChat();
    return;
  }
});

/* 快捷键模态框关闭 */
document.getElementById('modal-shortcuts-close').onclick =
  document.getElementById('modal-shortcuts-ok').onclick = () => closeModal('modal-shortcuts');

/* ============================================================
   INIT
   ============================================================ */
if (state.token && state.user) {
  enterAppTerm();
} else {
  showAuth();
}
