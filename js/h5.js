/* 中南点点原型 · 移动端（复刻 uni-app /ywViews/bbs/*） */
(function () {
  const { esc, toast, avatar, imgSrc, fmtNum } = UI;
  const phone = document.getElementById('phone');
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  const panel = document.getElementById('protoPanel');
  const B = '/ywViews/bbs';
  const HOME = B + '/home/index';
  const A = 'assets/h5/';
  const H5 = window.H5 = { pages: {}, page: null, path: '', query: {}, state: null, visited: 0 };

  // 浮层与 toast 挂到手机容器里，桌面预览时不会溢出到外框
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && (n.classList.contains('ui-layer') || n.classList.contains('ui-toast-box'))) phone.appendChild(n);
  }))).observe(document.body, { childList: true });

  /* ---------- 路由 ---------- */
  H5.go = (path, query) => {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const target = '#' + path + qs;
    if (location.hash === target) route(); else location.hash = target;
  };
  H5.replace = (path, query) => {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    history.replaceState(null, '', '#' + path + qs);
    route();
  };
  H5.back = () => { if (H5.visited > 1) history.back(); else H5.go(HOME); };

  function route() {
    const { path, query } = UI.parseHash();
    const p = H5.pages[path];
    if (!p) { H5.replace(HOME); return; }
    H5.visited++;
    UI.closeAll();
    H5.page = p; H5.path = path; H5.query = query;
    H5.state = p.init ? p.init(query) : {};
    document.title = p.title || '中南点点';
    view.innerHTML = p.render(H5.state);
    view.scrollTop = 0;
    renderTabbar();
    p.mounted && p.mounted(view, H5.state, false);
  }
  H5.refresh = () => {
    const p = H5.page;
    if (!p) return;
    UI.patch(view, p.render(H5.state));
    renderTabbar();
    p.mounted && p.mounted(view, H5.state, true);
  };
  window.addEventListener('hashchange', route);
  window.addEventListener('zndd:change', () => { H5.refresh(); UI.refreshLayers(); renderPanel(); });

  /* 事件委托：data-act 点击、data-in 输入，先找页面自身处理，再找全局处理 */
  const GLOBAL = {};
  UI.delegate(view, 'click', '[data-act]', (e, el) => {
    const name = el.dataset.act;
    const fn = (H5.page.acts || {})[name] || GLOBAL[name];
    if (!fn) return;
    e.stopPropagation();
    UI.guard(fn)(el, H5.state, e);
  });
  UI.delegate(view, 'input', '[data-in]', (e, el) => {
    const fn = (H5.page.inputs || {})[el.dataset.in];
    if (fn) UI.guard(fn)(el, H5.state, e);
  });
  view.addEventListener('keydown', e => {
    const el = e.target.closest('[data-enter]');
    if (el && e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const fn = (H5.page.acts || {})[el.dataset.enter];
      if (fn) UI.guard(fn)(el, H5.state, e);
    }
  });
  view.addEventListener('scroll', () => { if (H5.page && H5.page.onScroll) H5.page.onScroll(view, H5.state); }, { passive: true });
  /* 投票：详情卡 / 统计 / 我的投票 共用 data-vote，发布与编辑页的投票编辑器用 data-vote-ed / data-vote-in */
  UI.delegate(view, 'click', '[data-vote]', UI.guard((e, el) => VoteUI.onCard(el, {
    state: H5.state, refresh: H5.refresh, canInteract: can,
    openStats: id => H5.go(B + '/profile/voteDetail', { id }),
    openPost: id => H5.go(B + '/post/detail', { id })
  })));
  ['input', 'change', 'click'].forEach(t => view.addEventListener(t, e => {
    const st = H5.state;
    if (!H5.page || !H5.page.voteEditor || !st || !st.vote) return;
    if (VoteUI.onEditor(e, st.vote, H5.refresh) === 'remove') { st.vote = null; H5.refresh(); }
  }));

  GLOBAL.back = () => H5.back();
  GLOBAL.go = el => H5.go(el.dataset.path, el.dataset.q ? Object.fromEntries(new URLSearchParams(el.dataset.q)) : undefined);
  GLOBAL.post = el => H5.go(B + '/post/detail', { id: el.dataset.id });
  GLOBAL.pm = el => {
    const id = el.dataset.uid;
    if (!id) return;
    if (id === Store.me().id) return toast('不能给本人发私信');
    H5.go(B + '/profile/sx/chat', { peer: id });
  };
  GLOBAL.preview = el => UI.preview(el.getAttribute('src'));
  GLOBAL.likePost = el => {
    if (!can()) return;
    Store.togglePostLike(el.dataset.id);
  };

  /* ---------- 公共组件 ---------- */
  const TABS = [
    { key: 'home', label: '首页', path: HOME, icon: 'tab-home.svg', active: 'tab-home-active.svg' },
    { key: 'publish', label: '发布', path: B + '/post/publish', icon: 'tab-publish.svg', active: 'tab-publish.svg' },
    { key: 'message', label: '消息', path: B + '/message/index', icon: 'tab-message.svg', active: 'tab-message-active.svg' },
    { key: 'profile', label: '我的', path: B + '/profile/index', icon: 'tab-profile-inactive.svg', active: 'tab-profile.svg' }
  ];
  function renderTabbar() {
    const cur = H5.page && H5.page.tab;
    tabbar.classList.toggle('is-show', !!cur);
    if (!cur) return;
    const unread = Store.unreadNotices();
    tabbar.innerHTML = TABS.map(t => `<button class="tabbar__item ${t.key === cur ? 'is-active' : ''}" data-tab="${t.key}">
      <img src="${A}${t.key === cur ? t.active : t.icon}" alt="">${esc(t.label)}${t.key === 'message' && unread ? `<span class="red-dot">${unread > 99 ? '99+' : unread}</span>` : ''}</button>`).join('');
  }
  tabbar.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    const t = TABS.find(x => x.key === b.dataset.tab);
    if (t.key === 'publish') H5.go(t.path, { from: H5.path });
    else if (H5.page.tab !== t.key) H5.go(t.path);
  });

  const BACK_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e323f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  const navbar = (title, cls = '') => `<div class="navbar ${cls}"><button class="navbar__back" data-act="back" aria-label="返回">${BACK_ICON}</button><div class="navbar__title ellipsis">${esc(title)}</div></div>`;
  const lxOf = v => Store.LX_MAP[v] || { label: v || '其他', tone: 'green' };
  const LX_ICON = { daily: 'lx-icon-tab-daily.svg', feedback: 'lx-icon-suggest-tab', praise: 'lx-icon-praise-tab', secondhand: 'lx-icon-secondhand-tab' };
  function lxIcon(v, active) {
    const n = LX_ICON[v];
    if (!n) return 'assets/pc/tab-all.svg';
    return A + (n.endsWith('.svg') ? n : n + (active ? '-active' : '') + '.svg');
  }
  function replyFlag(p) {
    const done = p.hfzt === 'replied';
    return `<span class="reply-flag reply-flag--${done ? 'done' : 'pending'} post-card__flag"><img src="${A}icon-reply-${done ? 'done' : 'pending'}.svg" alt="">${done ? '已回复' : '未回复'}</span>`;
  }
  function postCard(p, { ops = false, unread = 0 } = {}) {
    const lx = lxOf(p.lx);
    const imgs = (p.tps || []).slice(0, 3);
    return `<div class="card-wrap">${unread ? `<span class="red-dot">${unread}</span>` : ''}
      <div class="post-card" data-act="post" data-id="${p.id}">
        <div class="post-card__head">
          <span data-act="pm" data-uid="${p.fbrid}">${avatar(p)}</span>
          <div class="post-card__who"><div class="post-card__nc ellipsis">${esc(p.fbrnc)}</div><div class="post-card__time">${Store.relTime(p.fbsj)}</div></div>
          <div class="post-card__tags">${p.ztbq === 'topped' ? '<span class="top-pill">置顶</span>' : ''}<span class="lx-pill lx-pill--${lx.tone}">${esc(lx.label)}</span></div>
        </div>
        <div class="post-card__bt">${esc(p.bt)}</div>
        <div class="post-card__nr clamp2">${esc(p.nr)}</div>
        ${p.voteInfo ? `<div class="post-card__vote">${VoteUI.badge(p)}<span class="ellipsis">${esc(p.voteInfo.title)}</span></div>` : ''}
        ${imgs.length ? `<div class="post-card__imgs">${imgs.map(t => `<img src="${esc(imgSrc(t))}" alt="">`).join('')}</div>` : ''}
        <div class="post-card__foot">${p.lx === 'feedback' ? replyFlag(p) : ''}
          <span><img src="${A}icon-eye.svg" alt="">${fmtNum(p.llcs)}</span>
          <span data-act="likePost" data-id="${p.id}"><img src="${A}icon-like${p.sfdz ? '-active' : ''}.svg" alt="">${fmtNum(p.dzs)}</span>
          <span><img src="${A}icon-comment.svg" alt="">${fmtNum(p.pls)}</span>
        </div>
        ${ops ? `<div class="post-card__ops"><button data-act="editPost" data-id="${p.id}">编辑</button><button class="danger" data-act="delPost" data-id="${p.id}">删除</button></div>` : ''}
      </div></div>`;
  }

  /* 交互前置校验：封禁 / 首次使用未完善资料 */
  function can() {
    if (Store.isBanned()) { toast('账号已被封禁，暂时无法进行该操作'); return false; }
    if (Store.me().sfwczl !== '1') { openPrompt(); return false; }
    return true;
  }
  H5.can = can;

  function openPrompt() {
    if (UI.layers.some(l => l.el.classList.contains('prompt-dlg'))) return;
    UI.open({
      kind: 'dialog', cls: 'prompt-dlg', head: false, closeOnMask: false,
      render: () => `<img class="prompt-dlg__mascot" src="${A}profile-prompt-mascot.png" alt="">
        <div class="prompt-dlg__title">使用提示</div>
        <div class="prompt-dlg__txt">为保障论坛交流规范，首次使用请先修改昵称、上传头像，完成资料更新后解锁<b>【中南点点】</b>全部互动功能！</div>
        <button class="btn-primary" data-ok>立即修改</button>
        <button class="prompt-dlg__close" data-close aria-label="关闭">×</button>`,
      on: { 'click [data-ok]': (e, el, l) => { l.close(); openEditSheet(); } }
    });
  }

  function openEditSheet() {
    const u = Store.me();
    UI.open({
      kind: 'sheet', cls: 'ep-layer', title: '编辑资料', state: { nc: u.nc, tx: u.tx },
      render: l => {
        const s = l.state, me = Store.me();
        return `<div class="ep-sheet">
          <div class="ep-sheet__ava" data-pick>${avatar({ nc: s.nc, tx: s.tx }, 'xl')}<span>点击更换头像</span></div>
          <div class="ep-label">昵称</div>
          <div class="ep-field"><input data-keep="nc" maxlength="12" placeholder="2–12 字" value="${esc(s.nc)}"><button class="ep-field__swap" data-swap>换</button></div>
          <div class="ep-hint">每30天可修改昵称和头像共3次（从第一次修改起算）（剩余 ${me.ncChangeRemain} 次）</div>
          <button class="btn-primary" data-save>保存</button></div>`;
      },
      on: {
        'click [data-pick]': async (e, el, l) => {
          const [img] = await UI.pickImages({ max: 1, maxMB: 2, accept: 'image/jpeg,image/png' });
          if (img) { l.state.nc = l.body.querySelector('[data-keep="nc"]').value; l.state.tx = img; l.refresh(); }
        },
        'click [data-swap]': (e, el, l) => { const i = l.body.querySelector('[data-keep="nc"]'); i.value = Store.randomNick().slice(0, 12); },
        'click [data-save]': (e, el, l) => {
          const nc = l.body.querySelector('[data-keep="nc"]').value.trim();
          if (!nc) return toast('请输入昵称');
          try { Store.updateProfile({ nc, tx: l.state.tx }); } catch (err) { return toast(err.message || '保存失败'); }
          toast('已保存');
          l.close();
        }
      }
    });
  }
  H5.openEditSheet = openEditSheet;

  function openLxSheet() {
    UI.open({
      kind: 'sheet', title: '选择类型',
      render: () => `<div class="lx-sheet">${Store.LX.map(x => `<button class="lx-sheet__item" style="background:${x.bg}" data-lx="${x.value}">
        <img src="${lxIcon(x.value, true)}" alt=""><span><b>${esc(x.label)}</b><small>${esc(x.desc)}</small></span></button>`).join('')}</div>`,
      on: { 'click [data-lx]': (e, el, l) => { l.close(); H5.go(B + '/post/publish', { from: HOME, lx: el.dataset.lx }); } }
    });
  }

  /* 滚轮选择器（Cancel / Done） */
  function openPicker({ options, value, onDone }) {
    UI.open({
      kind: 'sheet', cls: 'picker', head: false, state: { v: value || (options[0] || {}).value },
      render: l => `<div class="picker__bar"><button class="cancel" data-close>Cancel</button><button class="done" data-done>Done</button></div>
        <div class="picker__opts">${options.map(o => `<button class="picker__opt ${o.value === l.state.v ? 'is-cur' : ''}" data-v="${esc(o.value)}">${o.icon ? `<img src="${o.icon}" alt="">` : ''}${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}</div>`,
      on: {
        'click [data-v]': (e, el, l) => { l.state.v = el.dataset.v; l.refresh(); },
        'click [data-done]': (e, el, l) => { l.close(); onDone(l.state.v); }
      }
    });
  }

  function openDrafts() {
    UI.open({
      kind: 'popup', title: '草稿箱列表',
      render: () => {
        const list = Store.drafts();
        if (!list.length) return '<div class="empty-tip">暂无草稿</div>';
        return list.map(d => `<div class="draft-card">
          <div><b>类型：</b>${esc(d.lx ? lxOf(d.lx).label : '—')}</div>
          <div class="ellipsis"><b>标题：</b>${esc(d.bt || '（无标题）')}</div>
          <div class="clamp2"><b>内容：</b>${esc(d.nr || '（暂无内容）')}</div>
          <div><b>最后编辑时间：</b>${Store.fmtDate(d.gxsj, true)}</div>
          <div class="draft-card__ops"><button class="danger" data-del="${d.id}">删除</button><button data-edit="${d.id}">编辑</button></div></div>`).join('');
      },
      on: {
        'click [data-del]': async (e, el) => {
          if (await UI.confirm('确定删除该草稿？删除后不可恢复。', { title: '删除草稿', danger: true, ok: '删除' })) { Store.deleteDraft(el.dataset.del); toast('已删除'); }
        },
        'click [data-edit]': (e, el, l) => {
          l.close();
          if (H5.path === B + '/post/publish') H5.replace(B + '/post/publish', { draft: el.dataset.edit });
          else H5.go(B + '/post/publish', { draft: el.dataset.edit });
        }
      }
    });
  }

  function openShare(p) {
    UI.open({
      kind: 'sheet', head: false,
      render: () => `<div class="action-list"><button data-copy>复制分享链接</button><button class="is-cancel" data-close>取消</button></div>`,
      on: {
        'click [data-copy]': async (e, el, l) => {
          await UI.copy(location.href.split('#')[0] + '#' + B + '/post/detail?id=' + p.id);
          l.close(); toast('已复制');
        }
      }
    });
  }

  function openReport(p) {
    UI.open({
      kind: 'sheet', title: '举报问题', state: { t: '' },
      render: l => `<div class="rp-sheet"><div class="rp-sheet__label"> 请选择举报类型 </div>
        <div class="rp-types">${Store.REPORT_TYPES.map(t => `<button class="rp-type ${l.state.t === t ? 'is-cur' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
        <textarea data-keep="jbsm" maxlength="800" placeholder="请输入详细举报内容"></textarea>
        <button class="btn-primary" data-submit>提交</button></div>`,
      on: {
        'click [data-t]': (e, el, l) => { l.state.t = el.dataset.t; l.refresh(); },
        'click [data-submit]': (e, el, l) => {
          if (!l.state.t) return toast('请选择举报类型');
          try { Store.report(p.id, l.state.t, l.body.querySelector('textarea').value); } catch (err) { return toast(err.message || '提交失败'); }
          l.close(); toast('举报已提交');
        }
      }
    });
  }

  /* ---------- 首页 ---------- */
  const CATS = [{ value: '', label: '全部' }].concat(Store.LX);
  let searchTimer = null;
  function hotPool() {
    const since = Date.now() - 7 * Store.DAY;
    return Store.listPosts({ sort: 'hot', start: since })
      .map(p => Object.assign(p, { rds: p.rds - (p.ztbq === 'topped' ? 100 : 0) }))
      .sort((a, b) => b.rds - a.rds).slice(0, 15);
  }
  H5.pages[HOME] = {
    tab: 'home', title: '中南点点',
    init(q) { const pool = hotPool(); return { lx: '', sort: 'latest', kw: '', limit: 10, hot: pool.slice(0, 5).map(p => p.id), spin: false, onlyVote: q.vote === '1' }; },
    render(st) {
      const list = Store.listPosts({ lx: st.lx, sort: st.sort, kw: st.kw, hasVote: st.onlyVote });
      const shown = list.slice(0, st.limit);
      const hot = st.hot.map(id => Store.getPost(id)).filter(p => p && p.ztbq !== 'deleted');
      const score = p => Math.max(0, Math.round(p.rds - (p.ztbq === 'topped' ? 100 : 0)));
      const no = i => String(i + 1).padStart(2, '0');
      const hotItem = (p, i) => `<button class="top5__item top5__item--${i + 1}" data-act="post" data-id="${p.id}">
          <span class="top5__no">${no(i)}</span>
          ${i === 0 ? `<span style="min-width:0;flex:1"><div class="top5__bt ellipsis">${esc(p.bt)}</div><div class="top5__hot">热搜指数：${score(p)}</div></span><span class="top5__arrow">›</span>`
          : `<span class="top5__bt ${i < 3 ? 'clamp2' : 'ellipsis'}" style="min-width:0">${esc(p.bt)}</span>`}</button>`;
      return `<div class="pg pg--tab">
        <div class="home-hero"></div>
        <div class="home-search-card" style="margin-top:-150px">
          <img class="home-search-card__logo" src="${A}hero-logo.svg" alt="发声，让校园更美好">
          <label class="home-search"><img src="${A}icon-search.svg" alt=""><input data-keep="kw" data-in="kw" placeholder="搜索昵称、标题或内容" value="${esc(st.kw)}">${st.kw ? '<button class="home-search__clear" data-act="clearKw">×</button>' : ''}</label>
        </div>
        <div class="cat-chips">${CATS.map(c => `<button class="cat-chip ${st.lx === c.value ? 'is-active' : ''}" data-act="lx" data-v="${c.value}"><img src="${lxIcon(c.value, st.lx === c.value)}" alt="">${esc(c.label)}</button>`).join('')}</div>
        <div class="sort-row">
          <button class="sort-pill ${st.sort === 'latest' ? 'is-active' : ''}" data-act="sort" data-v="latest">最新发布</button>
          <button class="sort-pill ${st.sort === 'hot' ? 'is-active' : ''}" data-act="sort" data-v="hot">热度最高</button>
          <button class="sort-pill sort-pill--vote ${st.onlyVote ? 'is-active' : ''}" data-act="onlyVote" title="只看投票帖"><i class="vt-ico"></i>投票</button>
          <button class="sort-row__swap" data-act="swap"><svg class="${st.spin ? 'is-spin' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>换一换</button>
        </div>
        ${hot.length ? `<div class="top5"><div class="top5__title"><svg width="26" height="26" viewBox="0 0 26 26"><rect x="3" y="3" width="20" height="21" rx="3" fill="#c8a37a"/><rect x="6" y="6" width="14" height="16" rx="1.5" fill="#fff"/><rect x="9" y="1.5" width="8" height="4" rx="1.5" fill="#8d6b49"/><path d="M8.5 11h9M8.5 14.5h9M8.5 18h6" stroke="#c9d3dc" stroke-width="1.6"/></svg>本周热议排行榜 TOP5</div>
          <div class="top5__box">${hot.map(hotItem).join('')}</div></div>` : ''}
        <div class="post-list">${shown.length ? shown.map(p => postCard(p)).join('') : `<div class="empty-tip">${st.onlyVote ? '暂无投票帖' : '暂无帖子'}</div>`}</div>
        ${shown.length ? `<div class="more-tip">${shown.length < list.length ? '加载中…' : '没有更多了'}</div>` : ''}
        <button class="fab" data-act="fab">发布心声</button>
      </div>`;
    },
    mounted(root, st, isRefresh) {
      if (!isRefresh && Store.me().sfwczl !== '1' && !sessionStorage.getItem('zndd_h5_prompted')) {
        sessionStorage.setItem('zndd_h5_prompted', '1');
        setTimeout(openPrompt, 300);
      }
    },
    onScroll(v, st) {
      if (v.scrollTop + v.clientHeight < v.scrollHeight - 120) return;
      const total = Store.listPosts({ lx: st.lx, sort: st.sort, kw: st.kw, hasVote: st.onlyVote }).length;
      if (st.limit < total) { st.limit += 10; H5.refresh(); }
    },
    inputs: {
      kw(el, st) {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { st.kw = el.value; st.limit = 10; H5.refresh(); }, 300);
      }
    },
    acts: {
      clearKw(el, st) { const i = view.querySelector('[data-keep="kw"]'); if (i) i.value = ''; st.kw = ''; st.limit = 10; H5.refresh(); },
      lx(el, st) { st.lx = el.dataset.v; st.limit = 10; H5.refresh(); },
      sort(el, st) { st.sort = el.dataset.v; st.limit = 10; H5.refresh(); },
      onlyVote(el, st) { st.onlyVote = !st.onlyVote; st.limit = 10; H5.refresh(); },
      swap(el, st) {
        if (st.spin) return;
        const pool = hotPool();
        st.hot = pool.slice().sort(() => Math.random() - 0.5).slice(0, 5).map(p => p.id);
        st.spin = true; st.limit = 10; H5.refresh();
        setTimeout(() => { st.spin = false; }, 600);
      },
      fab() { openLxSheet(); }
    }
  };

  /* ---------- 帖子详情 ---------- */
  H5.pages[B + '/post/detail'] = {
    title: '中南心声',
    init(q) { const p = Store.viewPost(q.id); return { id: q.id, ok: !!(p && p.ztbq !== 'deleted'), open: {}, replyTo: null, tps: [], voteSel: [] }; },
    render(st) {
      const p = Store.getPost(st.id);
      if (!st.ok || !p || p.ztbq === 'deleted') return `<div class="pg">${navbar('中南心声')}<div class="empty-tip">帖子不存在或已删除</div></div>`;
      const lx = lxOf(p.lx);
      const tree = Store.commentsTree(p.id);
      const total = tree.reduce((n, t) => n + 1 + t.children.length, 0);
      const imgs = p.tps || [];
      const one = (c, child) => `<div class="cmt">
          <span data-act="pm" data-uid="${c.fbrid}">${avatar(c, child ? 'xs' : 'sm')}</span>
          <div class="cmt__main">
            <div class="cmt__nc">${esc(c.fbrnc)}${c.isAuthor ? '<span class="cmt__tag">作者</span>' : ''}${c.sfgfhf === '1' ? `<span class="cmt__tag cmt__tag--official">${c.rzbmmc ? '官方回复·' + esc(c.rzbmmc) : '官方回复'}</span>` : ''}</div>
            <div class="cmt__txt">${child && c.hfdxid && c.hfdxid !== c.fjlpid ? `回复 <em>@${esc(c.hfdxnc)}</em>：` : ''}${esc(c.plnr)}</div>
            ${(c.tps || []).length ? `<div class="cmt__imgs">${c.tps.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : ''}
            <div class="cmt__bar"><span>${Store.fmtDate(c.cjsj)}</span><button data-act="reply" data-id="${c.id}" data-nc="${esc(c.fbrnc)}">回复</button>
              ${c.isMine ? `<button class="cmt__del" data-act="delCmt" data-id="${c.id}">删除</button>` : ''}
              <button class="cmt__like ${c.sfdz ? 'is-liked' : ''}" data-act="likeCmt" data-id="${c.id}"><img src="${A}icon-like${c.sfdz ? '-active' : ''}.svg" alt="">${c.dzs}</button></div>
            ${child ? '' : childBlock(c)}
          </div></div>`;
      const childBlock = c => {
        const t = tree.find(x => x.pl.id === c.id);
        if (!t || !t.children.length) return '';
        if (!st.open[c.id]) return `<button class="cmt__more" data-act="expand" data-id="${c.id}">展开 ${t.children.length} 条回复</button>`;
        return `<div class="cmt__children">${t.children.map(x => one(x, true)).join('')}</div><button class="cmt__more" data-act="expand" data-id="${c.id}">收起</button>`;
      };
      return `<div class="pg">${navbar('中南心声', 'navbar--white')}
        <div class="pd">
          <div class="pd__head"><span data-act="pm" data-uid="${p.fbrid}">${avatar(p, 'lg')}</span>
            <div class="pd__who"><div class="pd__nc ellipsis">${esc(p.fbrnc)}</div><div class="pd__time">${Store.relTime(p.fbsj)}</div></div>
            ${p.ztbq === 'topped' ? '<span class="top-pill">置顶</span>' : ''}<span class="lx-pill lx-pill--${lx.tone}">${esc(lx.label)}</span></div>
          <div class="pd__bt">${esc(p.bt)}</div>
          <div class="pd__nr">${esc(p.nr)}</div>
          ${imgs.length ? `<div class="pd__imgs ${imgs.length === 1 ? 'pd__imgs--1' : ''}">${imgs.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : ''}
          ${VoteUI.card(p, st.voteSel)}
          <div class="pd__meta">
            <span><img src="${A}icon-eye.svg" alt="">${fmtNum(p.llcs)}</span>
            <button class="${p.sfdz ? 'is-liked' : ''}" data-act="likePost" data-id="${p.id}"><img src="${A}icon-like${p.sfdz ? '-active' : ''}.svg" alt="">${p.dzs}</button>
            <span><img src="${A}icon-comment.svg" alt="">${p.pls}</span>
            <div class="pd__acts">${p.isMine ? '<button data-act="edit">编辑</button>' : ''}<button data-act="share">分享</button><button data-act="report">举报</button></div>
          </div>
          <div class="pd__total">共 ${total} 条评论</div>
          ${tree.length ? tree.map(t => one(t.pl, false)).join('') : '<div class="empty-tip" style="font-size:14px">暂无评论，来说两句吧</div>'}
          <div class="more-tip">暂无更多评论～</div>
        </div>
        <div class="composer">
          ${st.replyTo ? `<div class="composer__reply"><span>回复 @${esc(st.replyTo.nc)}</span><button data-act="cancelReply">取消</button></div>` : ''}
          ${st.tps.length ? `<div class="composer__thumbs">${st.tps.map((t, i) => `<div class="composer__thumb"><img src="${esc(t)}" alt=""><button data-act="rmImg" data-i="${i}">×</button></div>`).join('')}</div>` : ''}
          <div class="composer__row"><button class="composer__img" data-act="pickImg">图</button>
            <input class="composer__input" data-keep="cmt" data-enter="send" maxlength="800" placeholder="${st.replyTo ? '回复 @' + esc(st.replyTo.nc) : '写评论…'}">
            <button class="composer__send" data-act="send">发送</button></div>
        </div></div>`;
    },
    acts: {
      share(el, st) { openShare(Store.getPost(st.id)); },
      report(el, st) { if (Store.isBanned()) return toast('账号已被封禁，暂时无法进行该操作'); openReport(Store.getPost(st.id)); },
      edit(el, st) { H5.go(B + '/post/edit', { id: st.id }); },
      expand(el, st) { st.open[el.dataset.id] = !st.open[el.dataset.id]; H5.refresh(); },
      reply(el, st) {
        if (!can()) return;
        st.replyTo = { id: el.dataset.id, nc: el.dataset.nc }; H5.refresh();
        const i = view.querySelector('[data-keep="cmt"]'); if (i) i.focus();
      },
      cancelReply(el, st) { st.replyTo = null; H5.refresh(); },
      async delCmt(el) {
        if (await UI.confirm('确定删除这条评论吗？', { title: '删除评论', ok: '删除', danger: true })) { Store.deleteComment(el.dataset.id); toast('已删除'); }
      },
      likeCmt(el) { if (!can()) return; Store.toggleCommentLike(el.dataset.id); },
      async pickImg(el, st) {
        if (!can()) return;
        if (st.tps.length >= 9) return toast('最多上传 9 张图片');
        const imgs = await UI.pickImages({ max: 9, existing: st.tps.length });
        st.tps = st.tps.concat(imgs); H5.refresh();
      },
      rmImg(el, st) { st.tps.splice(+el.dataset.i, 1); H5.refresh(); },
      send(el, st) {
        if (!can()) return;
        const input = view.querySelector('[data-keep="cmt"]');
        const plnr = input.value;
        if (!plnr.trim() && !st.tps.length) return toast('请输入评论或添加图片');
        const tps = st.tps, replyTo = st.replyTo;
        input.value = ''; st.tps = []; st.replyTo = null;
        if (replyTo) { const c = Store.db.comments.find(x => x.id === replyTo.id); if (c) st.open[c.fjlpid || c.id] = true; }
        try { Store.addComment({ tzid: st.id, plnr, tps, replyTo: replyTo && replyTo.id }); }
        catch (err) { input.value = plnr; st.tps = tps; st.replyTo = replyTo; H5.refresh(); throw err; }
        toast('已发送');
      }
    }
  };

  /* ---------- 发布 / 编辑 ---------- */
  function postForm(st, mode) {
    const topics = st.lx === 'feedback' ? Store.activeTopics() : [];
    const topic = topics.find(t => t.htbh === st.ht);
    const imgs = st.tps.map(imgSrc);
    return `${st.warn ? `<div class="warn-bar"><span class="warn-bar__ico">!</span><span> 温馨提示：请勿发布不正当言论，不造谣不传谣，严重者将被封禁账号，甚至被追究法律责任！ </span><button class="warn-bar__x" data-act="hideWarn">×</button></div>` : ''}
      <div class="pub__card">
        <div class="pub__label"><i>*</i>选择类型</div>
        <button class="pub__field" data-act="pickLx">${st.lx ? esc(lxOf(st.lx).label) : '<span class="ph">请选择</span>'}<span class="arrow">›</span></button>
        ${st.lx === 'feedback' ? `<div class="pub__label">话题分类</div>
          <button class="pub__field" data-act="pickHt">${topic ? esc(topic.htmc) + `<small style="color:#9aa4ad;margin-left:6px">${esc(topic.bmmc)}</small>` : '<span class="ph">请选择（选填，用于转交对应部门）</span>'}<span class="arrow">›</span></button>` : ''}
        <div class="pub__label"><i>*</i>标题</div>
        <label class="pub__field"><input data-keep="bt" data-in="bt" maxlength="50" placeholder="请输入" value="${esc(st.bt)}"></label>
        <div class="pub__label"><i>*</i>内容</div>
        <label class="pub__field pub__field--area"><textarea data-keep="nr" data-in="nr" maxlength="800" placeholder="请输入">${esc(st.nr)}</textarea><div class="pub__count">${st.nr.length}/800</div></label>
        <div class="pub__label">图片</div>
        <div class="pub__hint">只能上传jpg/png/gif文件，且不超过10MB</div>
        <div class="pub__imgs">${imgs.map((s, i) => `<div class="pub__thumb"><img src="${esc(s)}" data-act="preview" alt=""><button data-act="rmImg" data-i="${i}">×</button></div>`).join('')}
          ${st.tps.length < 9 ? `<button class="pub__upload" data-act="upload"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V5M6 11l6-6 6 6"/></svg>点击上传</button>` : ''}</div>
      </div>
      ${st.vote ? `<div class="pub__card pub__vote">${VoteUI.editor(st.vote)}</div>`
        : '<button class="pub__vote-add" data-act="addVote"><i class="vt-ico"></i><span><b>添加投票</b><small>征集意见、评选活动，让大家直接投票</small></span><span class="arrow">›</span></button>'}
      <div class="pub__foot">${mode === 'edit'
        ? `<button class="btn-ghost" data-act="back">取消</button><button class="btn-primary" data-act="save" ${st.busy ? 'disabled' : ''}>${st.busy ? '保存中…' : '发布内容'}</button>`
        : `<button class="btn-ghost" data-act="saveDraft">${st.busy === 'draft' ? '保存中…' : '暂存草稿'}</button><button class="btn-ghost" data-act="back">返回</button><button class="btn-primary pub__submit" data-act="publish" style="${valid(st) ? '' : 'opacity:.55'}">${st.busy === 'pub' ? '发布中…' : '发布内容'}</button>`}</div>`;
  }
  const valid = st => !!(st.lx && st.bt.trim() && st.nr.trim());
  const formInputs = {
    bt(el, st) { st.bt = el.value; syncSubmit(st); },
    nr(el, st) { st.nr = el.value; const c = view.querySelector('.pub__count'); if (c) c.textContent = st.nr.length + '/800'; syncSubmit(st); }
  };
  function syncSubmit(st) { const b = view.querySelector('.pub__submit'); if (b) b.style.opacity = valid(st) ? '' : '.55'; }
  const formActs = {
    hideWarn(el, st) { st.warn = false; H5.refresh(); },
    addVote(el, st) { st.vote = VoteUI.edNew(); H5.refresh(); },
    pickLx(el, st) {
      openPicker({
        options: Store.LX.map(x => ({ value: x.value, label: x.label, icon: lxIcon(x.value, true) })), value: st.lx,
        onDone: v => { st.lx = v; if (v !== 'feedback') st.ht = ''; H5.refresh(); syncSubmit(st); }
      });
    },
    pickHt(el, st) {
      const opts = [{ value: '', label: '不选择' }].concat(Store.activeTopics().map(t => ({ value: t.htbh, label: t.htmc, sub: ' · ' + t.bmmc })));
      openPicker({ options: opts, value: st.ht, onDone: v => { st.ht = v; H5.refresh(); } });
    },
    async upload(el, st) {
      const imgs = await UI.pickImages({ max: 9, existing: st.tps.length });
      st.tps = st.tps.concat(imgs); H5.refresh();
    },
    rmImg(el, st) { st.tps.splice(+el.dataset.i, 1); H5.refresh(); }
  };

  H5.pages[B + '/post/publish'] = {
    title: '发布新帖',
    init(q) {
      const d = q.draft && Store.getDraft(q.draft);
      if (q.draft && !d) setTimeout(() => toast('草稿不存在'), 0);
      return d ? { draftId: d.id, lx: d.lx, ht: d.ht || '', bt: d.bt, nr: d.nr, tps: (d.tps || []).slice(), vote: VoteUI.edFrom(d.vote), warn: true }
        : { draftId: '', lx: q.lx || '', ht: '', bt: '', nr: '', tps: [], vote: null, warn: true };
    },
    voteEditor: true,
    render(st) {
      return `<div class="pg pub">
        <div class="pub__head"><div class="pub__title">发布新帖<img src="${A}publish-title-underline.svg" alt=""></div>
          <button class="pub__drafts" data-act="drafts"><img src="${A}icon-folder-draft.svg" alt="">草稿箱(${Store.drafts().length})</button></div>
        ${postForm(st, 'publish')}</div>`;
    },
    mounted(root, st, isRefresh) { if (!isRefresh && Store.me().sfwczl !== '1') setTimeout(openPrompt, 200); },
    inputs: formInputs,
    acts: Object.assign({}, formActs, {
      drafts() { openDrafts(); },
      saveDraft(el, st) {
        const d = Store.saveDraft({ id: st.draftId, lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: VoteUI.toDraft(st.vote) });
        st.draftId = d.id;
        toast('草稿已保存');
      },
      publish(el, st) {
        if (!valid(st)) return toast('请完善必填项');
        if (!can()) return;
        Store.createPost({ lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: VoteUI.toConfig(st.vote) });
        if (st.draftId) Store.deleteDraft(st.draftId);
        toast('发布成功');
        H5.replace(HOME);
      }
    })
  };

  H5.pages[B + '/post/edit'] = {
    title: '编辑',
    init(q) {
      const p = Store.getPost(q.id);
      if (!p || p.ztbq === 'deleted') return { missing: true };
      return { id: p.id, lx: p.lx, ht: p.ht === 'other' ? '' : p.ht, bt: p.bt, nr: p.nr, tps: (p.tps || []).slice(), vote: p.vote ? VoteUI.edFrom(p.vote, p.vote.ballots.length) : null, hadVote: !!p.vote, warn: true };
    },
    voteEditor: true,
    render(st) {
      if (st.missing) return `<div class="pg">${navbar('编辑')}<div class="empty-tip">帖子不存在</div></div>`;
      return `<div class="pg pub">${navbar('编辑')}${postForm(st, 'edit')}</div>`;
    },
    inputs: formInputs,
    acts: Object.assign({}, formActs, {
      save(el, st) {
        if (!valid(st)) return toast('请完善必填项');
        const vote = VoteUI.toConfig(st.vote);
        Store.updatePost(st.id, { lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: vote || (st.hadVote ? null : undefined) });
        toast('保存成功');
        H5.back();
      }
    })
  };

  /* ---------- 消息 ---------- */
  const MSG_TABS = [{ key: 'reply', label: '回帖' }, { key: 'mention', label: '@我' }, { key: 'like', label: '点赞' }, { key: 'system', label: '系统' }];
  let readTimer = null;
  H5.pages[B + '/message/index'] = {
    tab: 'message', title: '消息',
    init(q) { return { t: q.t || 'reply' }; },
    render(st) {
      const list = Store.notices(st.t);
      const ico = n => n.type === 'system' ? `<span class="msg-item__ico"><img src="${A}message-system.svg" alt=""></span>`
        : n.from ? avatar(n.from) : `<span class="msg-item__ico"><img src="${A}message-notification.svg" alt=""></span>`;
      return `<div class="pg pg--tab">
        <div class="msg-tabs">${MSG_TABS.map(t => { const n = Store.unreadNotices(t.key); return `<button class="msg-tab ${st.t === t.key ? 'is-active' : ''}" data-act="tab" data-v="${t.key}">${t.label}${n ? `<span class="red-dot">${n}</span>` : ''}</button>`; }).join('')}</div>
        <div class="msg-list">${list.length ? list.map(n => `<button class="msg-item" data-act="open" data-id="${n.tzid || ''}">
            ${n.read ? '' : '<span class="red-dot red-dot--sm"></span>'}${ico(n)}
            <div class="msg-item__main"><div class="msg-item__t"><span class="ellipsis">${esc(n.type === 'system' ? '系统通知' : n.text)}</span><time>${Store.relTime(n.cjsj)}</time></div>
              <div class="msg-item__d">${esc(n.type === 'system' ? n.text : (n.from ? n.from.nc : '同学'))}</div>
              ${n.post ? `<div class="msg-item__p ellipsis">${esc(n.post.bt)}</div>` : ''}</div></button>`).join('')
          : '<div class="empty-tip" style="padding-top:80px">暂无消息</div>'}</div></div>`;
    },
    mounted(root, st) {
      clearTimeout(readTimer);
      if (Store.unreadNotices(st.t)) { const t = st.t; readTimer = setTimeout(() => { if (H5.state === st && st.t === t) Store.markNoticesRead(t); }, 1200); }
    },
    acts: {
      tab(el, st) { st.t = el.dataset.v; history.replaceState(null, '', '#' + B + '/message/index?t=' + st.t); H5.refresh(); },
      open(el) {
        const p = el.dataset.id && Store.getPost(el.dataset.id);
        if (!p || p.ztbq === 'deleted') return toast('该贴已删除。');
        H5.go(B + '/post/detail', { id: p.id });
      }
    }
  };

  /* ---------- 我的 ---------- */
  H5.pages[B + '/profile/index'] = {
    tab: 'profile', title: '我的',
    render() {
      const u = Store.me();
      const s = Store.myStats();
      const unreadReply = Store.myCommentedPosts().reduce((n, p) => n + p.unreadCount, 0);
      const grid = [
        { act: 'go', path: B + '/profile/posts', icon: 'profile-icon-posts-new.svg', label: '我的发帖' },
        { act: 'go', path: B + '/profile/comments', icon: 'profile-icon-comments-new.svg', label: '评论及回复', dot: unreadReply },
        { act: 'go', path: B + '/profile/sx/index', icon: 'profile-icon-message-new.svg', label: '我的私信', dot: s.unreadMsg },
        { act: 'drafts', icon: 'profile-icon-drafts.svg', label: '草稿箱' }
      ];
      const list = [
        { path: B + '/profile/votes', vt: true, label: '我的投票', dot: Store.unseenVotes() },
        { path: B + '/profile/reports', icon: 'profile-icon-security.svg', label: '我的举报' },
        { path: B + '/rules/policy', icon: 'profile-icon-course.svg', label: '中南点点管理规范' },
        { path: B + '/rules/council', icon: 'profile-icon-file.svg', label: '自治管理会介绍' },
        { path: B + '/rules/report', icon: 'profile-icon-security.svg', label: '举报流程说明' }
      ];
      return `<div class="pg pg--tab">
        <div class="me-hero"></div>
        <div class="me-card"><div class="me-card__ava">${avatar(u, 'xl')}</div>
          <div class="me-card__nc">${esc(u.nc)}</div>
          <button class="me-card__edit" data-act="editMe"><img src="${A}profile-icon-edit-new.svg" alt="">编辑资料</button>
          <div class="me-grid">${grid.map(g => `<button class="me-grid__item" data-act="${g.act}" ${g.path ? `data-path="${g.path}"` : ''}><img src="${A}${g.icon}" alt="">${g.label}${g.dot ? `<span class="red-dot">${g.dot}</span>` : ''}</button>`).join('')}</div>
        </div>
        <div class="me-list">${list.map(i => `<button class="me-list__item" data-act="go" data-path="${i.path}">${i.vt ? '<span class="me-list__vt"><i class="vt-ico"></i></span>' : `<img src="${A}${i.icon}" alt="">`}${i.label}${i.dot ? `<span class="me-list__new">${i.dot > 99 ? '99+' : i.dot} 条新投票</span>` : ''}<img class="chev" src="${A}profile-icon-chevron-right.svg" alt=""></button>`).join('')}</div>
      </div>`;
    },
    acts: {
      editMe() { if (Store.isBanned()) return toast('账号已被封禁，暂时无法进行该操作'); openEditSheet(); },
      drafts() { openDrafts(); }
    }
  };

  H5.pages[B + '/profile/posts'] = {
    title: '我的发帖',
    render() {
      const list = Store.myPosts();
      return `<div class="pg">${navbar('我的发帖')}<div class="post-list">${list.length ? list.map(p => postCard(p, { ops: true })).join('') : '<div class="empty-tip">暂无发帖</div>'}</div>
        ${list.length ? '<div class="more-tip">暂无更多发帖～</div>' : ''}</div>`;
    },
    acts: {
      editPost(el) { H5.go(B + '/post/edit', { id: el.dataset.id }); },
      async delPost(el) {
        if (await UI.confirm('确定删除该帖子吗？删除后不可恢复。', { title: '提示', ok: '删除', danger: true })) { Store.deletePost(el.dataset.id); toast('已删除'); }
      }
    }
  };

  H5.pages[B + '/profile/comments'] = {
    title: '评论及回复',
    render() {
      const list = Store.myCommentedPosts();
      return `<div class="pg">${navbar('评论及回复')}<div class="tip-bar">红色角标表示该帖有未读回复</div>
        <div class="post-list">${list.length ? list.map(p => postCard(p, { unread: p.unreadCount })).join('') : '<div class="empty-tip">暂无评论及回复</div>'}</div>
        ${list.length ? '<div class="more-tip">暂无更多回复～</div>' : ''}</div>`;
    }
  };

  /* 我的投票：发起人在这里看统计（普通用户没有管理端） */
  H5.pages[B + '/profile/votes'] = {
    title: '我的投票',
    init(q) { return { t: q.t === 'joined' ? 'joined' : 'created' }; },
    render(st) {
      const list = Store.myVotes(st.t);
      const n = { created: Store.myVotes('created').length, joined: Store.myVotes('joined').length };
      return `<div class="pg">${navbar('我的投票')}
        <div class="rp-tabs">${[['created', '我发起的'], ['joined', '我参与的']].map(([k, t]) => `<button class="rp-tab ${st.t === k ? 'is-active' : ''}" data-act="tab" data-v="${k}">${t} ${n[k]}</button>`).join('')}</div>
        <div class="tip-bar vt-tip">${st.t === 'created' ? '点击查看票数、参与趋势和参与明细，也可提前结束或导出' : '点击回到原帖查看投票结果'}</div>
        <div class="vt-mine-list">${list.length ? list.map(p => VoteUI.mineItem(p, st.t)).join('') : `<div class="empty-tip">${st.t === 'created' ? '暂无投票，发帖时可以添加投票' : '暂无投票'}</div>`}</div></div>`;
    },
    acts: {
      tab(el, st) { st.t = el.dataset.v; history.replaceState(null, '', '#' + B + '/profile/votes?t=' + st.t); H5.refresh(); }
    }
  };
  H5.pages[B + '/profile/voteDetail'] = {
    title: '投票统计',
    init(q) { return { id: q.id }; },
    render(st) {
      let body;
      try { body = VoteUI.stats(Store.voteDetail(st.id)); } catch (err) { body = `<div class="empty-tip">${esc(err.message)}</div>`; }
      return `<div class="pg">${navbar('投票统计', 'navbar--white')}<div class="vt-page">${body}</div></div>`;
    },
    mounted(root, st, isRefresh) { if (!isRefresh) setTimeout(() => { if (H5.state === st) Store.markVoteSeen(st.id); }, 0); }
  };

  H5.pages[B + '/profile/drafts'] = {
    title: '草稿箱',
    render() {
      const list = Store.drafts();
      return `<div class="pg">${navbar('草稿箱列表')}<div style="padding:12px 20px">${list.length ? list.map(d => `<div class="draft-card">
          <div><b>类型：</b>${esc(d.lx ? lxOf(d.lx).label : '—')}</div><div class="ellipsis"><b>标题：</b>${esc(d.bt || '（无标题）')}</div>
          <div class="clamp2"><b>内容：</b>${esc(d.nr || '（暂无内容）')}</div><div><b>最后编辑时间：</b>${Store.fmtDate(d.gxsj, true)}</div>
          <div class="draft-card__ops"><button class="danger" data-act="del" data-id="${d.id}">删除</button><button data-act="go" data-path="${B}/post/publish" data-q="draft=${d.id}">编辑</button></div></div>`).join('')
        : '<div class="empty-tip">暂无草稿</div>'}</div></div>`;
    },
    acts: {
      async del(el) { if (await UI.confirm('确定删除该草稿？删除后不可恢复。', { title: '删除草稿', ok: '删除', danger: true })) { Store.deleteDraft(el.dataset.id); toast('已删除'); } }
    }
  };

  H5.pages[B + '/profile/editProfile'] = {
    title: '编辑资料',
    init() { const u = Store.me(); return { tx: u.tx }; },
    render(st) {
      const u = Store.me();
      return `<div class="pg">${navbar('编辑资料', 'navbar--white')}<div class="ep-page">
        <div class="ep-label">昵称</div>
        <div class="ep-field"><input data-keep="nc" maxlength="12" placeholder="2–12 字" value="${esc(u.nc)}"></div>
        <div class="ep-hint">每30天可修改昵称和头像共3次（从第一次修改起算）（剩余 ${u.ncChangeRemain} 次）</div>
        <div class="ep-label">头像 URL</div>
        <div class="ep-page__ava">${avatar({ nc: u.nc, tx: st.tx }, 'lg')}<button data-act="local">本地上传</button></div>
        <div class="ep-field" style="margin-bottom:18px"><input data-keep="tx" placeholder="图片地址" value="${esc((st.tx || '').startsWith('data:') ? '（本地上传图片）' : st.tx || '')}"></div>
        <button class="btn-primary" data-act="save">保存</button></div></div>`;
    },
    acts: {
      async local(el, st) { const [img] = await UI.pickImages({ max: 1, maxMB: 2, accept: 'image/jpeg,image/png' }); if (img) { st.tx = img; const i = view.querySelector('[data-keep="tx"]'); if (i) i.value = '（本地上传图片）'; H5.refresh(); } },
      save(el, st) {
        const nc = view.querySelector('[data-keep="nc"]').value.trim();
        let tx = view.querySelector('[data-keep="tx"]').value.trim();
        if (!nc) return toast('请输入昵称');
        if (tx === '（本地上传图片）') tx = st.tx;
        if (!tx) return toast('请填写头像地址');
        try { Store.updateProfile({ nc, tx }); } catch (err) { return toast(err.message || '保存失败'); }
        toast('已保存');
      }
    }
  };

  /* 我的举报 */
  const RP_TABS = [{ key: '', label: '全部' }, { key: 'pending', label: '审核中' }, { key: 'done', label: '已处理' }];
  const reportResult = r => r.zt === 'pending' ? '管理员正在核实，请耐心等待' : r.result === 'violation' ? '违规成立 · 帖子已删除' : '经核实未违规，予以保留';
  H5.pages[B + '/profile/reports'] = {
    title: '我的举报',
    init() { return { t: '' }; },
    render(st) {
      const list = Store.myReports(st.t);
      return `<div class="pg">${navbar('我的举报')}
        <div class="rp-tabs">${RP_TABS.map(t => `<button class="rp-tab ${st.t === t.key ? 'is-active' : ''}" data-act="tab" data-v="${t.key}">${t.label}</button>`).join('')}</div>
        <div class="rp-list">${list.length ? list.map(r => {
          const p = r.post;
          const gone = !p || p.ztbq === 'deleted';
          return `<button class="rp-card" data-act="go" data-path="${B}/profile/reportDetail" data-q="id=${r.id}">
            <img class="rp-card__stamp" src="${A}reports-stamp-${r.zt === 'pending' ? 'pending' : 'passed'}.svg" alt="">
            <div class="rp-card__bt ellipsis">${gone ? '（该帖子已被删除）' : esc(p.bt)}</div>
            <div class="rp-card__row"><b>${esc(p ? lxOf(p.lx).label : '—')}</b> · ${esc(p ? p.fbrnc : '匿名用户')}</div>
            <div class="rp-card__row">举报类型：<b>${esc(r.jblx || '其他违规')}</b></div>
            <div class="rp-card__row">举报时间：${Store.fmtDate(r.cjsj, true)}</div>
            <div class="rp-card__res ${r.zt === 'pending' ? 'rp-card__res--pending' : r.result === 'violation' ? 'rp-card__res--violation' : ''}">${reportResult(r)}</div></button>`;
        }).join('') : '<div class="empty-tip" style="padding-top:20px">暂无举报记录</div>'}</div>
        ${list.length ? '<div class="more-tip">没有更多了～</div>' : ''}</div>`;
    },
    acts: { tab(el, st) { st.t = el.dataset.v; H5.refresh(); } }
  };

  H5.pages[B + '/profile/reportDetail'] = {
    title: '举报详情',
    init(q) { return { id: q.id }; },
    render(st) {
      const r = Store.myReports().find(x => x.id === st.id);
      if (!r) return `<div class="pg">${navbar('举报详情')}<div class="empty-tip">举报记录不存在</div></div>`;
      const p = r.post, gone = !p || p.ztbq === 'deleted';
      const pending = r.zt === 'pending';
      const tone = pending ? '' : r.result === 'violation' ? 'rd__banner--violation' : 'rd__banner--done';
      return `<div class="pg">${navbar('举报详情')}<div class="rd">
        <div class="rd__banner ${tone}"><h4>${pending ? '审核中' : '已处理'}</h4><p>${reportResult(r)}</p></div>
        <div class="rd__sec"><h5>被举报内容</h5>
          <div class="rd__post" ${gone ? '' : `data-act="post" data-id="${p.id}"`}>${gone ? '<div class="rd__post-bt">（该帖子已被删除）</div>'
            : `<div class="rd__post-bt">${esc(p.bt)}</div><div class="rd__post-nr clamp2">${esc(p.nr)}</div><div class="rd__post-nr">${esc(p.fbrnc || '匿名用户')} · ${esc(lxOf(p.lx).label)} · 浏览 ${fmtNum(p.llcs)}</div>`}</div></div>
        <div class="rd__sec"><h5>我的举报信息</h5>
          <div class="rd__kv"><b>举报类型：</b><span>${esc(r.jblx || '其他违规')}</span></div>
          <div class="rd__kv"><b>举报说明：</b><span>${esc(r.jbsm || '—')}</span></div>
          <div class="rd__kv"><b>举报时间：</b><span>${Store.fmtDateTime(r.cjsj)}</span></div>
          <div class="rd__kv"><b>举报编号：</b><span>${esc(r.jbbh)}</span></div></div>
        <div class="rd__sec"><h5>处理进度</h5><div class="rd__steps">
          <div class="rd__step is-done"><b>举报已提交</b><span>已提交</span><p>${Store.fmtDate(r.cjsj, true)}</p></div>
          <div class="rd__step ${pending ? 'is-cur' : 'is-done'}"><b>管理员审核中</b><span>审核中</span><p>预计 1-3 个工作日内完成</p></div>
          <div class="rd__step ${pending ? '' : 'is-done'}"><b>处理完成并反馈</b>${pending ? '' : `<span>已处理</span><p>${Store.fmtDate(r.clsj, true)}</p>`}</div></div></div>
        ${pending ? '' : `<div class="rd__sec"><h5>处理结果与反馈</h5>
          <div class="rd__kv"><b>处理结果：</b><span>${r.result === 'violation' ? '违规成立 · 帖子已删除' : '未违规 · 内容予以保留'}</span></div>
          <div class="rd__kv"><b>处理说明：</b><span>${esc(r.clsm || '暂无处理说明')}</span></div>
          <div class="rd__kv"><b>处理人：</b><span>${esc(r.clr || '社区管理员')}</span></div></div>`}
        <div class="rd__tip">对处理结果有疑问？可在「意见反馈」中联系社区管理员</div></div></div>`;
    }
  };

  /* 私信 */
  H5.pages[B + '/profile/sx/index'] = {
    title: '私信',
    render() {
      const list = Store.sessions();
      return `<div class="pg">${navbar('私信')}<div class="sx-list">${list.length ? list.map(s => `<button class="sx-item" data-act="go" data-path="${B}/profile/sx/chat" data-q="peer=${s.peerUserId}">
          ${avatar(s, 'lg')}${s.unreadCount ? `<span class="red-dot">${s.unreadCount}</span>` : ''}
          <div class="sx-item__main"><div class="sx-item__t"><span class="ellipsis">${esc(s.peerNc)}</span><time>${Store.fmtDate(s.cjsj, true)}</time></div>
          <div class="sx-item__d ellipsis">${esc(s.nr)}</div></div></button>`).join('') + '<div class="more-tip"> 暂无更多私信～ </div>'
        : '<div class="empty-tip">暂无私信会话</div>'}</div></div>`;
    }
  };

  H5.pages[B + '/profile/sx/chat'] = {
    title: '私信',
    init(q) { return { peer: q.peer, n: -1 }; },
    render(st) {
      const peer = Store.user(st.peer);
      if (!peer) return `<div class="pg">${navbar('私信')}<div class="empty-tip">用户不存在</div></div>`;
      const me = Store.me();
      const list = Store.chat(st.peer);
      return `<div class="pg">${navbar(peer.nc, 'navbar--white')}
        <div class="chat">${list.map(m => `<div class="chat__msg ${m.mine ? 'is-mine' : ''}">${avatar(m.mine ? me : peer, 'sm')}
          <div class="chat__body"><span class="chat__time">${Store.fmtDate(m.cjsj, true)}</span><div class="chat__bubble">${esc(m.nr)}</div></div></div>`).join('')}</div>
        <div class="chat-bar"><button class="chat-bar__emoji" data-act="emoji"><img src="${A}icon-sx-emoji.svg" alt=""></button>
          <input data-keep="sx" data-in="sx" data-enter="send" maxlength="500" placeholder="请输入消息">
          <button class="chat-bar__send" data-act="send" disabled>发送</button></div></div>`;
    },
    mounted(root, st) {
      const n = Store.chat(st.peer).length;
      if (n !== st.n) { st.n = n; view.scrollTop = view.scrollHeight; }
      const i = root.querySelector('[data-keep="sx"]'), b = root.querySelector('.chat-bar__send');
      if (i && b) b.disabled = !i.value.trim();
    },
    inputs: { sx(el) { const b = view.querySelector('.chat-bar__send'); if (b) b.disabled = !el.value.trim(); } },
    acts: {
      emoji() { toast('表情功能开发中'); },
      send(el, st) {
        const i = view.querySelector('[data-keep="sx"]');
        const nr = i.value;
        if (!nr.trim()) return;
        if (Store.isBanned()) return toast('账号已被封禁，暂时无法进行该操作');
        i.value = '';
        try { Store.sendMessage(st.peer, nr); } catch (err) { i.value = nr; toast(err.message || '发送失败'); }
      }
    }
  };

  /* 规则 */
  ['policy', 'council', 'report'].forEach(key => {
    H5.pages[B + '/rules/' + key] = {
      get title() { return RULES[key].title; },
      render() {
        const r = RULES[key];
        return `<div class="pg">${navbar(r.title)}<div class="rule-page"><div class="rule-card">
          <div class="rule-card__title">${esc(r.title)}</div><div class="rule-card__views">${esc(r.views || '')}</div>
          ${renderRuleArticle(key)}</div></div></div>`;
      }
    };
  });

  /* 学工首页壳：模拟从智慧学工 H5 点悬浮球进入中南点点 */
  H5.pages['/pages/home'] = {
    title: '智慧学工',
    render() {
      const apps = ['请假销假', '奖助学金', '宿舍管理', '心理健康', '日常事务', '迎新服务', '第二课堂', '更多'];
      const colors = ['#5b8cff', '#ffb648', '#3cc29a', '#ff7a8a', '#8a7bff', '#36b6e8', '#f08c2a', '#9aa4ad'];
      return `<div class="pg xg-home"><div class="xg-home__title">中南大学智慧学工</div>
        <div class="xg-home__card"><h4>服务大厅</h4><div class="xg-home__grid">${apps.map((a, i) => `<span class="xg-home__app"><i style="background:${colors[i]}"></i>${a}</span>`).join('')}</div></div>
        <div class="xg-home__card"><h4>日程表</h4><div class="empty-tip" style="padding:16px 0">暂无日程</div></div>
        <button class="tucao-float" data-act="go" data-path="${HOME}"><img src="${A}tucao-wall.png" alt="中南点点"></button></div>`;
    }
  };

  /* ---------- 原型控制面板 ---------- */
  function renderPanel() {
    const me = Store.me();
    panel.innerHTML = `<h3>中南点点 · 移动端原型</h3>
      <p>数据保存在本地浏览器，PC 端与管理端共用同一份数据，可在另一个标签页同步查看。</p>
      <div class="pp-label">演示身份</div>
      ${Store.DEMO_USERS.map(u => `<button class="pp-user ${u.id === me.id ? 'is-cur' : ''}" data-switch="${u.id}">${esc(u.label)}${u.id === me.id ? '<span>✓</span>' : ''}</button>`).join('')}
      <div class="pp-label">快捷入口</div>
      <div class="pp-links">
        <a href="#/pages/home">智慧学工首页（悬浮球入口）</a>
        <a href="pc.html#/bbs/home/index" target="_blank">打开 PC 端</a>
        <a href="pc.html#/bbs/admin/dashboard/index" target="_blank">打开管理端</a>
        <a href="index.html">返回原型入口</a>
        <button class="danger" data-reset>重置演示数据</button>
      </div>`;
  }
  panel.addEventListener('click', async e => {
    const s = e.target.closest('[data-switch]');
    if (s) { Store.setCurrentUser(s.dataset.switch); sessionStorage.removeItem('zndd_h5_prompted'); toast('已切换身份'); route(); return; }
    if (e.target.closest('[data-reset]') && await UI.confirm('将清空所有本地修改并恢复初始演示数据，是否继续？', { title: '重置演示数据', danger: true })) {
      Store.reset(); toast('已重置演示数据'); H5.replace(HOME);
    }
  });

  renderPanel();
  route();
})();
