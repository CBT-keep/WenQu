/* ============================================================
   WenQu · 终端知识库 - 应用脚本
   ============================================================ */

/* ============================================================
   CONFIG
   ============================================================ */
const API = '/api';

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
  applyTheme(isLight);
}

applyTheme(localStorage.getItem('wq_theme') !== 'light');

document.getElementById('app-theme-btn').onclick = toggleTheme;

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

async function api(method, path, body, isForm) {
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

  toast(message || '请求失败', 'err');
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
  setTimeout(() => el.remove(), 3500);
}

/* ============================================================
   VIEWS
   ============================================================ */
function showAuth() {
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('auth-view').classList.remove('fullscreen');
  document.getElementById('app-view').classList.remove('active');
  const inp = document.getElementById('auth-input');
  if (inp) setTimeout(() => inp.focus(), 100);
}

function showTerm() {
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('auth-view').classList.add('fullscreen');
  document.getElementById('app-view').classList.remove('active');
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
  pendingPass: null,       // {username, isRegister} 密码输入中
};

function promptStr() {
  if (term.pendingPass) return 'password>';
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
  const masked = term.pendingPass ? v.replace(/[^\n]/g, '•') : v;
  authMirrorBefore.textContent = masked.slice(0, caret);
  authMirrorAfter.textContent = masked.slice(caret);
  if (focused || v) {
    authCursor.style.display = 'inline-block';
    authInput.placeholder = '';
  } else {
    authCursor.style.display = 'none';
    authInput.placeholder = term.pendingPass ? '输入密码...' : '输入命令...';
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

  // 密码输入模式：关闭 Tab / 上下历史 / Tab 补全
  if (term.pendingPass) {
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const pwd = authInput.value;
    authInput.value = '';
    syncAuthMirror();
    await termSubmitPass(pwd);
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
// 交互式密码提交（SSH 风格，不回显明文）
async function termSubmitPass(password) {
  const ctx = term.pendingPass;
  term.pendingPass = null;
  updatePrompt();
  if (!ctx) return;
  if (!password) {
    termPrint('<span class="term-warn">密码不能为空</span>');
    return;
  }
  try {
    if (ctx.isRegister) {
      await api('POST', '/auth/register', { username: ctx.username, password, nickname: ctx.nickname });
      termPrint('<span class="term-ok">✓ 注册成功</span> — 现在可以用 <span class="term-hl">login</span> 命令登录');
      return;
    }
    termPrint('<span class="term-dim">认证中...</span>');
    const data = await api('POST', '/auth/login', { username: ctx.username, password });
    saveAuth(data.token, data.user);
    termPrint('<span class="term-ok">✓ 登录成功</span> — ' + esc(data.user?.nickname || data.user?.username || ctx.username));
    enterAppTerm();
  } catch (err) {
    const isAuth = err instanceof ApiError && (err.code === 40100 || err.code === 40101);
    if (isAuth) { handleSessionExpired(); return; }
    termPrintErr(err);
  }
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
  // 未提供密码 → 交互式输入（SSH 风格，不回显）
  term.pendingPass = { username, isRegister: false };
  updatePrompt();
  termPrint('<span class="term-dim">请输入密码（输入不回显）</span>');
  authInput.focus();
}

async function cmdRegister(args) {
  if (args.length < 1) {
    termPrint('<span class="term-warn">用法：register &lt;用户名&gt; [昵称]</span><span class="term-dim"> — 密码将交互式输入</span>');
    return;
  }
  const username = args[0];
  const nickname = args.slice(1).join(' ') || undefined;
  term.pendingPass = { username, isRegister: true, nickname };
  updatePrompt();
  termPrint('<span class="term-dim">设置密码（输入不回显）</span>');
  authInput.focus();
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
  term.pendingPass = null;
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
  term.pendingPass = null;
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
        ['register <用户名> <密码> [昵称]', '注册'],
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
        ['doc delete <id>', '删除文档'],
        ['doc reprocess <id>', '重新处理文档'],
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
        termConfirm(`删除知识库「${k.name}」？将级联删除所有文档`, async ok => {
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
        termPrint('<span class="term-dim">请选择文件（.txt/.md/.docx，≤20MB）...</span>');
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
        termConfirm(`删除文档「${x.name}」？`, async ok => {
          if (!ok) { termPrint('<span class="term-dim">已取消</span>'); return; }
          await api('DELETE', `/documents/${id}`);
          termPrint(`<span class="term-ok">✓ 已删除 #${id}</span>`);
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
  line.innerHTML = '<span class="term-ok">ai&gt;</span> <span class="term-ai-text"></span><span class="term-blink">▍</span>';
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
        textEl.textContent = fullContent;
        scroll();
      } else if (eventType === 'done') {
        fullContent = data.fullContent || fullContent;
        sources = data.sources || [];
        textEl.textContent = fullContent;
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
async function loadKbs() {
  try {
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
  if (isMobile()) {
    const body = document.getElementById('app-body');
    if (body.classList.contains('sidebar-open')) {
      body.classList.remove('sidebar-open');
      menuBtn().textContent = '☰';
    }
  }
  document.getElementById('kb-title').textContent = kb.name;
  document.getElementById('btn-upload-doc').style.display = '';
  document.getElementById('btn-edit-kb').style.display = '';
  document.getElementById('btn-del-kb').style.display = '';
  document.getElementById('btn-start-chat').style.display = '';

  const body = document.getElementById('kb-body');
  body.innerHTML = '';
  body.innerHTML += `<div class="kb-stats">
    <div class="stat-card"><div class="val">${kb.docCount || 0}</div><div class="lbl">文档数</div></div>
    <div class="stat-card"><div class="val">${kb.chunkCount || 0}</div><div class="lbl">分块数</div></div>
    <div class="stat-card"><div class="val">${kb.chunkSize || 400}</div><div class="lbl">分块大小</div></div>
    <div class="stat-card"><div class="val">${kb.overlap || 80}</div><div class="lbl">重叠</div></div>
  </div>`;
  if (kb.description) {
    body.innerHTML += `<p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">${esc(kb.description)}</p>`;
  }
  body.innerHTML += `<div class="sidebar-title" style="padding-left:0">文档列表</div><div class="doc-list" id="doc-list"></div>`;
  loadDocs(kb.id);
}

function renderKbEmpty() {
  document.getElementById('kb-title').textContent = '选择一个知识库';
  ['btn-upload-doc', 'btn-edit-kb', 'btn-del-kb', 'btn-start-chat'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  const body = document.getElementById('kb-body');
  body.innerHTML = `<div class="empty-state" id="kb-empty">
    <div class="icon">kb&gt;</div>
    <p>选择左侧知识库查看详情<br>或点击 <b>+</b> 创建新知识库</p>
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
    el.innerHTML = '<div class="empty-state"><p>暂无文档</p></div>';
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
        if (state.currentKb) loadKbs();
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
  }, 2000);
}

async function reprocessDoc(id) {
  try {
    await api('POST', `/documents/${id}/reprocess`);
    toast('已触发重新处理', 'ok');
    loadDocs(state.currentKb.id);
  } catch {}
}

async function deleteDoc(id) {
  if (!confirm('确认删除该文档？')) return;
  try {
    await api('DELETE', `/documents/${id}`);
    toast('已删除', 'ok');
    loadDocs(state.currentKb.id);
    loadKbs();
  } catch {}
}

/* KB CRUD */
document.getElementById('btn-new-kb').onclick = () => openKbModal();
document.getElementById('btn-edit-kb').onclick = () => {
  if (!state.currentKb) return;
  openKbModal(state.currentKb);
};
document.getElementById('btn-del-kb').onclick = async () => {
  if (!state.currentKb || !confirm('确认删除知识库「' + state.currentKb.name + '」？将级联删除所有文档。')) return;
  try {
    await api('DELETE', `/kbs/${state.currentKb.id}`);
    toast('已删除', 'ok');
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
  document.getElementById('modal-kb').classList.add('active');
}

document.getElementById('modal-kb-close').onclick =
  document.getElementById('modal-kb-cancel').onclick = () =>
    document.getElementById('modal-kb').classList.remove('active');

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
    document.getElementById('modal-kb').classList.remove('active');
    loadKbs();
  } catch (err) {
    if (err.code !== 40100 && err.code !== 40101) errEl.textContent = err.message;
  }
};

/* Upload */
document.getElementById('btn-upload-doc').onclick = () => {
  document.getElementById('upload-file').value = '';
  document.getElementById('upload-err').textContent = '';
  document.getElementById('modal-upload').classList.add('active');
};

document.getElementById('modal-upload-close').onclick =
  document.getElementById('modal-upload-cancel').onclick = () =>
    document.getElementById('modal-upload').classList.remove('active');

document.getElementById('modal-upload-ok').onclick = async () => {
  const file = document.getElementById('upload-file').files[0];
  const errEl = document.getElementById('upload-err');
  errEl.textContent = '';
  if (!file) { errEl.textContent = '请选择文件'; return; }
  if (file.size > 20 * 1024 * 1024) { errEl.textContent = '文件超过 20MB'; return; }
  const fd = new FormData();
  fd.append('file', file);
  try {
    await api('POST', `/kbs/${state.currentKb.id}/documents`, fd, true);
    toast('上传成功', 'ok');
    document.getElementById('modal-upload').classList.remove('active');
    loadDocs(state.currentKb.id);
  } catch (err) {
    if (err.code !== 40100 && err.code !== 40101) errEl.textContent = err.message;
  }
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

async function sendChat() {
  if (isStreaming) return;
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  if (!q || !state.currentConv || !state.currentKb) return;
  input.value = '';

  appendMsg('user', q);
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

function appendMsg(role, content, isPlaceholder) {
  const el = document.createElement('div');
  el.className = 'msg msg-' + role;
  if (isPlaceholder) {
    el.innerHTML = '<span class="cursor"></span>';
  } else {
    el.textContent = content;
  }
  document.getElementById('chat-messages').appendChild(el);
  document.getElementById('chat-messages').scrollTop =
    document.getElementById('chat-messages').scrollHeight;
  return el;
}

function setAssistantText(el, text, showCursor) {
  el.textContent = text;
  if (showCursor) {
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);
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

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
const sidebarEl = () => document.getElementById('sidebar');
const caretEl = () => document.getElementById('sidebar-caret');
const menuBtn = () => document.getElementById('btn-app-menu');

function isMobile() { return window.matchMedia('(max-width:900px)').matches; }

function setCollapsed(collapsed) {
  const sb = sidebarEl();
  sb.classList.toggle('collapsed', collapsed);
  const c = caretEl();
  if (c) c.textContent = collapsed ? '▶' : '◀';
  localStorage.setItem('wq_sidebar_collapsed', collapsed ? 'true' : 'false');
}

// 桌面：caret 折叠/展开
if (caretEl()) {
  caretEl().onclick = () => setCollapsed(!sidebarEl().classList.contains('collapsed'));
}

// 移动端：菜单按钮开关侧边栏覆盖层
if (menuBtn()) {
  menuBtn().onclick = () => {
    document.getElementById('app-body').classList.toggle('sidebar-open');
    menuBtn().textContent = document.getElementById('app-body').classList.contains('sidebar-open') ? '✕' : '☰';
  };
}

// 点击内容区域关闭移动端侧边栏
const contentArea = document.getElementById('content-area');
if (contentArea) {
  contentArea.addEventListener('click', () => {
    if (isMobile() && document.getElementById('app-body').classList.contains('sidebar-open')) {
      document.getElementById('app-body').classList.remove('sidebar-open');
      menuBtn().textContent = '☰';
    }
  });
}

// 初始化侧边栏状态（仅桌面）
if (!isMobile() && localStorage.getItem('wq_sidebar_collapsed') === 'true') {
  setCollapsed(true);
}

window.addEventListener('resize', () => {
  const sb = sidebarEl();
  if (isMobile()) {
    sb.classList.remove('collapsed');
    document.getElementById('app-body').classList.remove('sidebar-open');
    if (menuBtn()) menuBtn().textContent = '☰';
  }
});

/* ============================================================
   INIT
   ============================================================ */
if (state.token && state.user) {
  enterAppTerm();
} else {
  showAuth();
}
