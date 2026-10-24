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
  const LX_ICON = { daily: 'lx-icon-tab-daily.svg', feedback: 'lx-icon-suggest-tab', praise: 'lx-icon-praise-tab', secondhand: 'lx-icon-secondhand-tab', lost: 'lx-icon-lost-tab' };
  const LOST = B + '/lost';
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
      render: () => `<div class="lx-sheet">${Store.LX.concat([{ value: 'lost', label: '失物招领', desc: '捡到物品或寻物求助', bg: '#E8F2FF' }]).map(x => `<button class="lx-sheet__item" style="background:${x.bg}" data-lx="${x.value}">
        <img src="${lxIcon(x.value, true)}" alt=""><span><b>${esc(x.label)}</b><small>${esc(x.desc)}</small></span></button>`).join('')}</div>`,
      on: {
        'click [data-lx]': (e, el, l) => {
          l.close();
          H5.go(B + '/post/publish', { from: HOME, lx: el.dataset.lx });
        }
      }
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
      const hotItem = (p, i) => {
        const cat = (Store.LX_MAP[p.lx] || {}).label || '话题';
        return `<button class="top5__item top5__item--${i + 1}" data-act="post" data-id="${p.id}">
          <span class="top5__no">${no(i)}</span>
          <span class="top5__main"><div class="top5__bt">${esc(p.bt)}</div><div class="top5__hot">${esc(cat)} · 热搜指数 ${score(p)}</div></span></button>`;
      };
      return `<div class="pg pg--tab">
        <div class="home-search-card" style="margin-top:16px">
          <img class="home-search-card__logo" src="${A}hero-logo.svg" alt="发声，让校园更美好">
          <label class="home-search"><img src="${A}icon-search.svg" alt=""><input data-keep="kw" data-in="kw" placeholder="搜索昵称、标题或内容" value="${esc(st.kw)}">${st.kw ? '<button class="home-search__clear" data-act="clearKw">×</button>' : ''}</label>
          <button class="home-lost" data-act="lost"><img src="${A}lx-icon-lost-tab.svg" alt=""><span class="home-lost__name">失物招领</span><span class="home-lost__sub">捡到物品 · 寻物求助</span><span class="home-lost__go">进入</span></button>
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
      lost() { H5.go(LOST + '/index'); },
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
    const lost = mode !== 'edit' && st.lx === 'lost';
    if (lost && !st.lf) st.lf = LF.newForm('found');
    const topics = st.lx === 'feedback' ? Store.activeTopics() : [];
    const topic = topics.find(t => t.htbh === st.ht);
    const imgs = st.tps.map(imgSrc);
    const types = `${Store.LX.map(x => `<button class="rp-type ${st.lx === x.value ? 'is-cur' : ''}" data-act="pickLx" data-v="${x.value}">${esc(x.label)}</button>`).join('')}
          ${mode === 'edit' ? '' : `<button class="rp-type ${st.lx === 'lost' ? 'is-cur' : ''}" data-act="pickLx" data-v="lost">失物招领</button>`}`;
    return `${st.warn ? `<div class="warn-bar"><span class="warn-bar__ico">!</span><span> 温馨提示：请勿发布不正当言论，不造谣不传谣，严重者将被封禁账号，甚至被追究法律责任！ </span><button class="warn-bar__x" data-act="hideWarn">×</button></div>` : ''}
      <div class="pub__card">
        <div class="pub__label"><i>*</i>选择类型</div>
        <div class="rp-types" style="margin-bottom:18px">${types}</div>
        ${lost ? lfPubFields(st.lf, { keep: 'lf' }) : `${st.lx === 'feedback' ? `<div class="pub__label">话题分类</div>
          <button class="pub__field" data-act="pickHt">${topic ? esc(topic.htmc) + `<small style="color:#9aa4ad;margin-left:6px">${esc(topic.bmmc)}</small>` : '<span class="ph">请选择（选填，用于转交对应部门）</span>'}<span class="arrow">›</span></button>` : ''}
        <div class="pub__label"><i>*</i>标题</div>
        <label class="pub__field"><input data-keep="bt" data-in="bt" maxlength="50" placeholder="请输入" value="${esc(st.bt)}"></label>
        <div class="pub__label"><i>*</i>内容</div>
        <label class="pub__field pub__field--area"><textarea data-keep="nr" data-in="nr" maxlength="800" placeholder="请输入">${esc(st.nr)}</textarea><div class="pub__count">${st.nr.length}/800</div></label>
        <div class="pub__label">图片</div>
        <div class="pub__hint">只能上传jpg/png/gif文件，且不超过10MB</div>
        <div class="pub__imgs">${imgs.map((s, i) => `<div class="pub__thumb"><img src="${esc(s)}" data-act="preview" alt=""><button data-act="rmImg" data-i="${i}">×</button></div>`).join('')}
          ${st.tps.length < 9 ? `<button class="pub__upload" data-act="upload"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V5M6 11l6-6 6 6"/></svg>点击上传</button>` : ''}</div>`}
      </div>
      ${lost ? '' : st.vote ? `<div class="pub__card pub__vote">${VoteUI.editor(st.vote)}</div>`
        : '<button class="pub__vote-add" data-act="addVote"><i class="vt-ico"></i><span><b>添加投票</b><small>征集意见、评选活动，让大家直接投票</small></span><span class="arrow">›</span></button>'}
      <div class="pub__foot">${mode === 'edit'
        ? `<button class="btn-ghost" data-act="back">取消</button><button class="btn-primary" data-act="save" ${st.busy ? 'disabled' : ''}>${st.busy ? '保存中…' : '发布内容'}</button>`
        : lost
          ? `<button class="btn-ghost" data-act="back">返回</button><button class="btn-ghost" data-act="showPreview">预览</button><button class="btn-primary" data-act="publish">发布</button>`
          : `<button class="btn-ghost" data-act="saveDraft">${st.busy === 'draft' ? '保存中…' : '暂存草稿'}</button><button class="btn-ghost" data-act="back">返回</button><button class="btn-primary pub__submit" data-act="publish" style="${valid(st) ? '' : 'opacity:.55'}">${st.busy === 'pub' ? '发布中…' : '发布内容'}</button>`}</div>`;
  }
  const valid = st => !!(st.lx && st.bt.trim() && st.nr.trim());
  const formInputs = {
    bt(el, st) { st.bt = el.value; syncSubmit(st); },
    nr(el, st) { st.nr = el.value; const c = view.querySelector('.pub__count'); if (c) c.textContent = st.nr.length + '/800'; syncSubmit(st); },
    f(el, st) {
      if (!st.lf || st.lx !== 'lost') return;
      st.lf[el.dataset.k] = el.value;
      if (el.dataset.k === 'nr') { const c = view.querySelector('.pub__count'); if (c) c.textContent = el.value.length + '/300'; }
    }
  };
  function syncSubmit(st) { const b = view.querySelector('.pub__submit'); if (b) b.style.opacity = valid(st) ? '' : '.55'; }
  const formActs = {
    hideWarn(el, st) { st.warn = false; H5.refresh(); },
    addVote(el, st) { st.vote = VoteUI.edNew(); H5.refresh(); },
    pickLx(el, st) {
      st.lx = el.dataset.v;
      if (st.lx !== 'feedback') st.ht = '';
      if (st.lx === 'lost' && !st.lf) st.lf = LF.newForm('found');
      H5.refresh();
      if (st.lx !== 'lost') syncSubmit(st);
    },
    pick(el, st) {
      if (st.lx !== 'lost' || !st.lf) return;
      applyLfPick(st.lf, el.dataset.k, el.dataset.v, false);
      H5.refresh();
    },
    pickHt(el, st) {
      const opts = [{ value: '', label: '不选择' }].concat(Store.activeTopics().map(t => ({ value: t.htbh, label: t.htmc, sub: ' · ' + t.bmmc })));
      openPicker({ options: opts, value: st.ht, onDone: v => { st.ht = v; H5.refresh(); } });
    },
    async upload(el, st) {
      if (st.lx === 'lost' && st.lf) {
        const imgs = await UI.pickImages({ max: 3, existing: st.lf.tps.length });
        st.lf.tps = st.lf.tps.concat(imgs); H5.refresh();
        return;
      }
      const imgs = await UI.pickImages({ max: 9, existing: st.tps.length });
      st.tps = st.tps.concat(imgs); H5.refresh();
    },
    rmImg(el, st) {
      if (st.lx === 'lost' && st.lf) { st.lf.tps.splice(+el.dataset.i, 1); H5.refresh(); return; }
      st.tps.splice(+el.dataset.i, 1); H5.refresh();
    }
  };

  H5.pages[B + '/post/publish'] = {
    title: '发布新帖',
    init(q) {
      const d = q.draft && Store.getDraft(q.draft);
      if (q.draft && !d) setTimeout(() => toast('草稿不存在'), 0);
      const st = d ? { draftId: d.id, lx: d.lx, ht: d.ht || '', bt: d.bt, nr: d.nr, tps: (d.tps || []).slice(), vote: VoteUI.edFrom(d.vote), warn: true, lf: null }
        : { draftId: '', lx: q.lx || '', ht: '', bt: '', nr: '', tps: [], vote: null, warn: true, lf: null };
      if (st.lx === 'lost') st.lf = LF.newForm('found');
      return st;
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
        if (st.lx === 'lost') return;
        const d = Store.saveDraft({ id: st.draftId, lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: VoteUI.toDraft(st.vote) });
        st.draftId = d.id;
        toast('草稿已保存');
      },
      showPreview(el, st) {
        if (st.lx !== 'lost' || !st.lf) return;
        H5.pages[LOST + '/publish'].acts.showPreview(el, { f: st.lf, id: '', team: false });
      },
      publish(el, st) {
        if (st.lx === 'lost') {
          if (!st.lf) st.lf = LF.newForm('found');
          return H5.pages[LOST + '/publish'].acts.submit(el, { f: st.lf, id: '', team: false });
        }
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
  const MSG_TABS = [{ key: 'reply', label: '回帖' }, { key: 'mention', label: '@我' }, { key: 'like', label: '点赞' }, { key: 'lost', label: '失物' }, { key: 'system', label: '系统' }];
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
        <div class="msg-list">${list.length ? list.map(n => `<button class="msg-item" data-act="open" data-id="${n.tzid || ''}" data-lf="${n.lfid || ''}">
            ${n.read ? '' : '<span class="red-dot red-dot--sm"></span>'}${ico(n)}
            <div class="msg-item__main"><div class="msg-item__t"><span class="ellipsis">${esc(n.type === 'system' ? '系统通知' : n.type === 'lost' ? '失物招领' : n.text)}</span><time>${Store.relTime(n.cjsj)}</time></div>
              <div class="msg-item__d">${esc(n.type === 'system' || n.type === 'lost' ? n.text : (n.from ? n.from.nc : '同学'))}</div>
              ${n.post ? `<div class="msg-item__p ellipsis">${esc(n.post.bt)}</div>` : n.lf ? `<div class="msg-item__p ellipsis">${esc(n.lf.mc)} · ${esc(n.lf.ztLabel)}</div>` : ''}</div></button>`).join('')
          : '<div class="empty-tip" style="padding-top:80px">暂无消息</div>'}</div></div>`;
    },
    mounted(root, st) {
      clearTimeout(readTimer);
      if (Store.unreadNotices(st.t)) { const t = st.t; readTimer = setTimeout(() => { if (H5.state === st && st.t === t) Store.markNoticesRead(t); }, 1200); }
    },
    acts: {
      tab(el, st) { st.t = el.dataset.v; history.replaceState(null, '', '#' + B + '/message/index?t=' + st.t); H5.refresh(); },
      open(el) {
        if (el.dataset.lf) {
          const it = Store.lfGet(el.dataset.lf);
          if (!it) return toast('该信息已删除。');
          const c = it.myClaim;
          return c ? H5.go(LOST + '/claimDetail', { id: c.id }) : H5.go(LOST + '/detail', { id: it.id });
        }
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
        { path: LOST + '/mine', icon: 'lx-icon-lost-tab.svg', label: '我的失物招领' },
        { path: LOST + '/myclaims', icon: 'profile-icon-posts-new.svg', label: '我的认领', badge: Store.lfMyClaims().filter(c => c.zt === 'more').length, badgeText: '条待补充' },
        ...(Store.lfIsTeam() ? [{ path: LOST + '/work', icon: 'profile-icon-file.svg', label: '招领工作台', badge: Store.lfStats().claims, badgeText: '条待核对' }] : []),
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
        <div class="me-list">${list.map(i => `<button class="me-list__item" data-act="go" data-path="${i.path}">${i.vt ? '<span class="me-list__vt"><i class="vt-ico"></i></span>' : `<img src="${A}${i.icon}" alt="">`}${i.label}${i.dot ? `<span class="me-list__new">${i.dot > 99 ? '99+' : i.dot} 条新投票</span>` : ''}${i.badge ? `<span class="me-list__new">${i.badge} ${i.badgeText}</span>` : ''}<img class="chev" src="${A}profile-icon-chevron-right.svg" alt=""></button>`).join('')}</div>
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
          <div class="sx-item__main"><div class="sx-item__t"><span class="ellipsis">${esc(s.peerNc)}</span><time>${Store.pmListTime(s.cjsj)}</time></div>
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

  /* ---------- 失物招领 ---------- */
  const lfFlag = (x, extra = '') => `<span class="reply-flag reply-flag--${LF.h5Flag(x)} ${extra}">${esc(x.ztLabel)}</span>`;
  const twoLine = (t, sub) => `<span style="flex:1;min-width:0"><span class="ellipsis" style="display:block">${t}</span><small class="ellipsis" style="display:block;font-size:13px;color:#627079;margin-top:2px">${sub}</small></span>`;
  const chev = `<img class="chev" src="${A}profile-icon-chevron-right.svg" alt="">`;
  const lfImgs = tps => (tps || []).length ? `<div class="pd__imgs ${tps.length === 1 ? 'pd__imgs--1' : ''}">${tps.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : '';
  const kv = (k, v) => `<div class="rd__kv"><b>${k}：</b><span>${v}</span></div>`;
  function lfCard(it, { ops = '' } = {}) {
    const imgs = (it.tps || []).slice(0, 3);
    return `<div class="post-card" data-act="lfItem" data-id="${it.id}">
      <div class="post-card__head">${avatar(it)}
        <div class="post-card__who"><div class="post-card__nc ellipsis">${esc(it.fbrnc)} ${LF.sourceMark(it, 'h5')}</div><div class="post-card__time">${Store.relTime(it.fbsj)} · ${it.lyLabel}</div>${it.isTeam ? `<div style="margin-top:4px">${LF.teamBadge(it, 'h5')}</div>` : ''}</div>
        <div class="post-card__tags"><span class="lx-pill lx-pill--${LF.h5FlTone(it.fl)}">${esc(it.flLabel)}</span></div></div>
      <div class="post-card__bt">${esc(it.mc)}</div>
      <div class="post-card__nr">${it.lx === 'lost' ? '可能丢失于' : '捡到于'} ${esc(it.xq)} · ${esc(it.dd)}<br>${esc(it.sjText)}</div>
      ${imgs.length ? `<div class="post-card__imgs">${imgs.map(t => `<img src="${esc(imgSrc(t))}" alt="">`).join('')}</div>` : ''}
      <div class="post-card__foot">${lfFlag(it, 'post-card__flag')}${it.lx === 'found' ? `<span>${esc(it.bgText)}</span>` : ''}${it.claimN && it.canReview ? `<span>${it.claimN} 条申请</span>` : ''}${it.lx === 'lost' && it.isMine && it.clueN ? `<span>${it.clueN} 条线索</span>` : ''}</div>
      ${ops ? `<div class="post-card__ops">${ops}</div>` : ''}</div>`;
  }
  function openOptSheet({ title, options, value, onPick }) {
    UI.open({
      kind: 'sheet', title,
      render: () => `<div class="rp-sheet"><div class="rp-types">${options.map(o => `<button class="rp-type ${String(o.value) === String(value) ? 'is-cur' : ''}" data-v="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div></div>`,
      on: { 'click [data-v]': (e, el, l) => { l.close(); onPick(el.dataset.v); } }
    });
  }
  function openTextSheet({ title, label, quick = [], placeholder = '请输入', ok = '提交', onOk }) {
    UI.open({
      kind: 'sheet', title, state: { q: '' },
      render: l => `<div class="rp-sheet">${label ? `<div class="rp-sheet__label">${esc(label)}</div>` : ''}
        ${quick.length ? `<div class="rp-types">${quick.map(q => `<button class="rp-type ${l.state.q === q ? 'is-cur' : ''}" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
        <textarea data-keep="txt" maxlength="300" placeholder="${esc(placeholder)}"></textarea>
        <button class="btn-primary" data-ok>${esc(ok)}</button></div>`,
      on: {
        'click [data-q]': (e, el, l) => { l.state.q = el.dataset.q; l.body.querySelector('textarea').value = el.dataset.q; l.refresh(); },
        'click [data-ok]': (e, el, l) => { try { onOk(l.body.querySelector('textarea').value); } catch (err) { return toast(err.message || '操作失败'); } l.close(); }
      }
    });
  }
  function openClueSheet(itemId) {
    UI.open({
      kind: 'sheet', title: '提供线索', state: { tps: [] },
      render: l => `<div class="rp-sheet">
        <div class="rp-sheet__label">在哪里、什么时候见过？线索会通过消息和私信发给失主</div>
        <div class="ep-label">看到的地点</div>
        <div class="ep-field"><input data-keep="dd" maxlength="40" placeholder="如：图书馆三楼靠窗"></div>
        <div class="ep-label">看到的时间</div>
        <div class="ep-field"><input data-keep="sj" maxlength="40" placeholder="如：今天中午"></div>
        <div class="ep-label">补充说明</div>
        <textarea data-keep="nr" maxlength="300" placeholder="如：看到有人把耳机盒交给了值班同学"></textarea>
        <div class="ep-label">图片（选填，最多 3 张）</div>
        <div class="pub__imgs">${l.state.tps.map((t, i) => `<div class="pub__thumb"><img src="${esc(imgSrc(t))}" alt=""><button data-del="${i}">×</button></div>`).join('')}${l.state.tps.length < 3 ? '<button class="pub__upload" data-upload>点击上传</button>' : ''}</div>
        <button class="btn-primary" data-ok>发送线索</button></div>`,
      on: {
        'click [data-upload]': async (e, el, l) => {
          const imgs = await UI.pickImages({ max: 3, existing: l.state.tps.length });
          if (imgs.length) { l.state.tps.push(...imgs); l.refresh(); }
        },
        'click [data-del]': (e, el, l) => { l.state.tps.splice(+el.dataset.del, 1); l.refresh(); },
        'click [data-ok]': (e, el, l) => {
          const v = k => l.body.querySelector(`[data-keep="${k}"]`).value;
          try { Store.lfAddClue(itemId, { dd: v('dd'), sj: v('sj'), nr: v('nr'), tps: l.state.tps.slice() }); }
          catch (err) { return toast(err.message || '发送失败'); }
          l.close();
          toast('线索已发送给失主');
        }
      }
    });
  }
  function clueBox(c, mine) {
    const pm = mine && c.uid !== Store.me().id;
    return `<div class="rd__post" style="margin-top:10px" ${pm ? `data-act="pm" data-uid="${c.uid}"` : ''}>
      <div class="rd__post-bt">${esc((c.u || {}).nc || '同学')}</div>
      ${c.dd ? `<div class="rd__post-nr">看到的地点：${esc(c.dd)}</div>` : ''}
      ${c.sj ? `<div class="rd__post-nr">看到的时间：${esc(c.sj)}</div>` : ''}
      ${c.nr ? `<div class="rd__post-nr">${esc(c.nr)}</div>` : ''}
      ${(c.tps || []).length ? `<div class="cmt__imgs">${c.tps.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : ''}
      <div class="rd__post-nr">${Store.relTime(c.cjsj)}${pm ? ' · 点击私信' : ''}</div></div>`;
  }
  function openHandover(c) {
    const d = LF.handoverDefault(c.item);
    UI.open({
      kind: 'sheet', title: '安排交接',
      render: () => `<div class="ep-sheet">
        <div class="rd__post rd__post-nr">确认后会通过私信把地点、时间和联系方式发给认领人「${esc(c.sqr.nc)}」，并跳转到会话。</div>
        <div class="ep-label">交接地点</div><div class="ep-field"><input data-keep="dd" maxlength="60" value="${esc(d.dd)}" placeholder="如：校本部服务点"></div>
        <div class="ep-label">交接时间</div><div class="ep-field"><input data-keep="sj" maxlength="40" value="${esc(d.sj)}" placeholder="如：明天 12:00-14:00"></div>
        <div class="ep-label">联系方式</div><div class="ep-field"><input data-keep="lxfs" maxlength="40" value="${esc(d.lxfs)}" placeholder="选填"></div>
        <button class="btn-primary" data-ok>发送私信并进入会话</button></div>`,
      on: {
        'click [data-ok]': (e, el, l) => {
          const v = k => l.body.querySelector(`[data-keep="${k}"]`).value;
          let peer;
          try { peer = Store.lfHandover(c.id, { dd: v('dd'), sj: v('sj'), lxfs: v('lxfs') }); } catch (err) { return toast(err.message); }
          l.close(); toast('交接安排已发送');
          H5.go(B + '/profile/sx/chat', { peer });
        }
      }
    });
  }
  function claimOps(c) {
    const b = (act, label, danger) => `<button class="${danger ? 'danger' : ''}" data-act="${act}" data-cid="${c.id}">${label}</button>`;
    const pm = `<button data-act="pm" data-uid="${c.sqrid}">私信</button>`;
    if (c.zt === 'pending') return pm + b('cMore', '要求补充') + b('cReject', '不通过', true) + b('cPass', '通过');
    if (c.zt === 'more') return pm + b('cReject', '不通过', true);
    if (c.zt === 'pass') return pm + b('cHand', c.jj ? '重新安排' : '安排交接') + b('cDone', '确认归还');
    return '';
  }
  const claimActs = {
    async cPass(el) {
      if (await UI.confirm('确认认领人描述的特征与物品一致？通过后物品进入「核对中」，再安排交接。', { title: '核对通过', ok: '通过' })) { Store.lfReview(el.dataset.cid, 'pass', ''); toast('已通过'); }
    },
    cMore(el) {
      openTextSheet({ title: '要求补充材料', label: '告诉认领人还需要补充什么', quick: ['请补充物品上的特殊标记', '请提供购买记录或照片', '请描述物品内的其他物品'], ok: '发送', onOk: v => { Store.lfReview(el.dataset.cid, 'more', v); toast('已通知认领人补充'); } });
    },
    cReject(el) {
      openTextSheet({ title: '核对未通过', label: '请选择或填写原因，会通知认领人', quick: ['特征与登记信息不符', '无法提供有效证明', '物品已归还给其他认领人'], ok: '确认', onOk: v => { Store.lfReview(el.dataset.cid, 'reject', v); toast('已标记未通过'); } });
    },
    cHand(el) { openHandover(Store.lfClaimGet(el.dataset.cid)); },
    async cDone(el) {
      if (await UI.confirm('确认物品已当面交给认领人？确认后状态变为「已归还」，其他申请自动关闭。', { title: '确认归还', ok: '确认归还' })) { Store.lfFinish(el.dataset.cid); toast('已完成归还'); }
    }
  };
  const claimBox = c => `<div class="rd__post" style="margin-top:10px">
      <div class="msg-item__t"><span class="ellipsis">${esc(c.sqr.nc)}</span>${lfFlag(c)}</div>
      <div class="rd__post-nr">归属特征：${esc(c.tz)}</div>
      <div class="rd__post-nr">丢失时间地点：${esc(c.sjdd)}</div>
      ${(c.tps || []).length ? `<div class="cmt__imgs">${c.tps.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : ''}
      ${c.zt === 'more' ? `<div class="rd__post-nr">已要求补充：${esc(c.bcyq)}</div>` : ''}
      ${c.jj ? `<div class="rd__post-nr">交接安排：${esc(c.jj.dd)} · ${esc(c.jj.sj)}</div>` : ''}
      ${c.jl && c.zt !== 'pending' ? `<div class="rd__post-nr">核对结论：${esc(c.jl)}</div>` : ''}
      <div class="rd__post-nr">${Store.fmtDate(c.cjsj, true)} 提交</div>
      ${claimOps(c) ? `<div class="post-card__ops">${claimOps(c)}</div>` : ''}</div>`;
  const stepsHtml = steps => `<div class="rd__steps">${steps.map(s => `<div class="rd__step ${s.state === 'done' ? 'is-done' : s.state === 'cur' ? 'is-cur' : ''}"><b>${esc(s.title)}</b>${s.time ? `<span>${esc(s.time)}</span>` : ''}${s.desc ? `<p>${esc(s.desc)}</p>` : ''}</div>`).join('')}</div>`;

  /* 招领列表 */
  const LF_FILTERS = {
    xq: { label: '校区', options: () => [{ value: '', label: '全部校区' }].concat(Store.LF_XQ.map(x => ({ value: x, label: x }))) },
    fl: { label: '分类', options: () => [{ value: '', label: '全部分类' }].concat(Store.LF_FL) },
    days: { label: '时间', options: () => Store.LF_DAYS },
    ly: { label: '来源', options: () => LF.LY }
  };
  let lfTimer = null;
  H5.pages[LOST + '/index'] = {
    title: '失物招领',
    init(q) { return { lx: q.lx === 'lost' ? 'lost' : 'found', kw: '', xq: '', fl: '', days: 0, ly: q.ly || '', closed: false, limit: 10 }; },
    render(st) {
      const f = { lx: st.lx, kw: st.kw, xq: st.xq, fl: st.fl, days: st.days, ly: st.lx === 'found' ? st.ly : '', closed: st.closed };
      const list = Store.lfList(f);
      const shown = list.slice(0, st.limit);
      const sta = Store.lfStation();
      const dg = Store.lfTodayDigest();
      const filtered = st.kw || st.xq || st.fl || +st.days || (st.lx === 'found' && st.ly);
      const keys = st.lx === 'found' ? ['xq', 'fl', 'days', 'ly'] : ['xq', 'fl', 'days'];
      const pill = k => {
        const o = LF_FILTERS[k].options().find(x => String(x.value) === String(st[k]));
        const on = !!(+st[k] || (st[k] && k !== 'days'));
        return `<button class="sort-pill ${on ? 'is-active' : ''}" data-act="filter" data-k="${k}">${esc(on ? o.label : LF_FILTERS[k].label)} ▾</button>`;
      };
      const n = { found: Store.lfList({ lx: 'found' }).length, lost: Store.lfList({ lx: 'lost' }).length };
      return `<div class="pg">${navbar('失物招领')}
        <div style="padding:4px 20px 0"><label class="home-search" style="background:#fff"><img src="${A}icon-search.svg" alt=""><input data-keep="kw" data-in="kw" placeholder="搜索物品名称、地点或编号" value="${esc(st.kw)}">${st.kw ? '<button class="home-search__clear" data-act="clearKw">×</button>' : ''}</label></div>
        <div class="me-list">
          ${dg ? `<button class="me-list__item" data-act="go" data-path="${LOST}/digest" data-q="id=${dg.id}"><img src="${A}profile-icon-file.svg" alt="">${twoLine('今日招领汇总 · ' + dg.total + ' 件', esc(LF.digestLine(dg)) + ' · 团队已核对确认')}${chev}</button>` : ''}
          <button class="me-list__item" data-act="go" data-path="${LOST}/station"><img src="${A}lx-icon-lost-tab.svg" alt="">${twoLine('资助团队招领站', `今日新增 ${sta.todayNew} 件 · 待认领 ${sta.pending} 件 · 服务点与值班`)}${chev}</button>
        </div>
        <div class="rp-tabs">${LF.LX_TABS.map(t => `<button class="rp-tab ${st.lx === t.value ? 'is-active' : ''}" data-act="lx" data-v="${t.value}">${t.label} ${n[t.value]}</button>`).join('')}</div>
        <div class="sort-row" style="padding-top:6px">${keys.map(pill).join('')}</div>
        <div class="post-list">${shown.length ? shown.map(it => lfCard(it)).join('') : `<div class="empty-tip">${filtered ? '没有找到符合条件的物品' : st.lx === 'found' ? '暂无待认领物品' : '暂无寻物信息'}</div>
          <div style="display:flex;gap:12px;padding:0 30px">${filtered ? '<button class="btn-ghost" style="flex:1" data-act="clearAll">清除筛选</button>' : ''}<button class="btn-primary" style="flex:1" data-act="go" data-path="${LOST}/publish" data-q="lx=lost">发布寻物</button></div>`}</div>
        ${shown.length < list.length ? '<div class="more-tip">加载中…</div>' : `<div class="more-tip"><button data-act="closed" style="color:#3087cc">${st.closed ? '只看进行中' : st.lx === 'found' ? '查看已归还的物品' : '查看已找回的物品'}</button></div>`}
        ${st.lx === 'found' && !st.closed ? '<div class="more-tip" style="padding-top:0;font-weight:500">超过两年无人认领的物品已按规定处理，不再展示</div>' : ''}
        <button class="fab" data-act="publish">发布招领</button>
      </div>`;
    },
    onScroll(v, st) {
      if (v.scrollTop + v.clientHeight < v.scrollHeight - 120) return;
      st.limit += 10; H5.refresh();
    },
    inputs: { kw(el, st) { clearTimeout(lfTimer); lfTimer = setTimeout(() => { st.kw = el.value; st.limit = 10; H5.refresh(); }, 300); } },
    acts: {
      lfItem(el) { H5.go(LOST + '/detail', { id: el.dataset.id }); },
      lx(el, st) { st.lx = el.dataset.v; st.limit = 10; st.closed = false; H5.refresh(); },
      clearKw(el, st) { const i = view.querySelector('[data-keep="kw"]'); if (i) i.value = ''; st.kw = ''; H5.refresh(); },
      clearAll(el, st) { const i = view.querySelector('[data-keep="kw"]'); if (i) i.value = ''; Object.assign(st, { kw: '', xq: '', fl: '', days: 0, ly: '' }); H5.refresh(); },
      closed(el, st) { st.closed = !st.closed; H5.refresh(); },
      filter(el, st) {
        const k = el.dataset.k, F = LF_FILTERS[k];
        openOptSheet({ title: '选择' + F.label, options: F.options(), value: st[k], onPick: v => { st[k] = k === 'days' ? +v : v; st.limit = 10; H5.refresh(); } });
      },
      publish() { H5.go(LOST + '/publish'); }
    }
  };

  /* 物品详情 */
  const bannerText = LF.bannerText;
  H5.pages[LOST + '/detail'] = {
    title: '招领详情',
    init(q) { return { id: q.id }; },
    render(st) {
      const it = Store.lfGet(st.id);
      if (!it) return `<div class="pg">${navbar('招领详情')}<div class="empty-tip">物品信息不存在</div></div>`;
      const found = it.lx === 'found';
      const p = it.point;
      const claims = it.canReview ? Store.lfClaimsOf(it.id) : [];
      const clues = !found && it.isMine ? Store.lfClues(it.id) : [];
      const my = it.myClaim ? Store.lfClaimGet(it.myClaim.id) : null;
      const banner = ['returned', 'found'].includes(it.ztKey) ? 'rd__banner--done' : '';
      const team = !it.isMine && (it.canEdit || it.canReturn);
      const btns = LF.detailActions(it, my);
      return `<div class="pg">${navbar(found ? '招领详情' : '寻物详情')}<div class="rd" style="padding-bottom:${btns.length ? 110 : 30}px">
        <div class="rd__banner ${banner}"><h4>${esc(it.ztLabel)}</h4><p>${esc(bannerText(it))}</p></div>
        <div class="rd__sec"><h5>${esc(it.mc)}</h5>
          ${kv('物品种类', esc(it.flLabel))}
          ${kv('校区', esc(it.xq))}
          ${kv(found ? '捡到地点' : '丢失地点', esc(it.dd))}
          ${kv(found ? '捡到时间' : '丢失时间', esc(it.sjText))}
          ${it.nr ? kv('补充说明', esc(it.nr)) : ''}
          ${kv('信息编号', esc(it.bh))}
          ${it.card ? kv('持卡人', esc(it.card.xm) + (it.card.xh ? ' · ' + esc(it.card.xh) : '') + '<small style="color:#9aa4ad"> （仅保管人与团队可见）</small>') : ''}
          ${lfImgs(it.tps)}</div>
        ${found ? `<div class="rd__sec"><h5>保管与领取</h5>
          ${kv('保管方式', esc(it.bgText))}
          ${it.bgfs === 'point' && p ? kv('地址', esc(p.dz || '由团队确认并维护')) + kv('值班安排', esc(p.zbap)) + kv('联系方式', esc(p.lxfs)) + (p.lstz ? kv('临时调整', `<span style="color:#f08c2a">${esc(p.lstz)}</span>`) : '') : kv('联系方式', '站内私信发布同学')}
          ${kv('领取须知', '核对通过后按约定时间领取，请携带校园卡或有效证件')}</div>` : ''}
        <div class="rd__sec"><h5>发布信息</h5>
          <div class="pd__head" ${it.isTeam ? '' : `data-act="pm" data-uid="${it.fbrid}"`}>${avatar(it, 'sm')}<div class="pd__who"><div style="font-weight:700">${esc(it.fbrnc)} ${LF.teamBadge(it, 'h5')}</div><div class="pd__time">${it.lyLabel} · ${Store.fmtDate(it.fbsj, true)}</div></div></div></div>
        ${my && ['pending', 'more'].includes(my.zt) ? `<div class="rd__sec"><h5>我的认领进度 ${lfFlag(my)}</h5>${stepsHtml(LF.claimSteps(my))}
          <div class="post-card__ops"><button data-act="editClaim">修改</button><button class="danger" data-act="cancelClaim">撤回</button></div></div>` : my ? `<div class="rd__sec"><h5>我的认领进度 ${lfFlag(my)}</h5>${stepsHtml(LF.claimSteps(my))}</div>` : ''}
        ${it.canReview && claims.length ? `<div class="rd__sec"><h5>认领申请（${claims.length}）</h5>${claims.map(claimBox).join('')}</div>` : ''}
        ${found ? '' : it.isMine
          ? `<div class="rd__sec"><h5>收到的线索（${clues.length}）</h5>${clues.length ? clues.map(c => clueBox(c, true)).join('') : '<div class="rd__post-nr">暂无线索，有同学提供时会通过消息通知你</div>'}</div>`
          : `<div class="rd__sec"><h5>同学提供的线索</h5><div class="rd__post-nr">线索内容仅寻物发布者可见。见过这件物品，可以在页面底部提供线索。</div></div>`}
        ${it.isMine || team ? `<div class="rd__sec"><h5>处理记录</h5>${stepsHtml(it.logs.slice().reverse().map(l => ({ title: l.act, state: 'done', time: Store.fmtDate(l.t, true), desc: [l.note, (Store.user(l.uid) || {}).nc].filter(Boolean).join(' · ') })))}</div>` : ''}
        <div class="rd__tip">请勿公开完整学号、身份证号等信息；虚假认领将按社区规范处理</div></div>
        ${btns.length ? `<div class="pub__foot">${btns.map(([act, label], i) => `<button class="${i === btns.length - 1 ? 'btn-primary' : 'btn-ghost'}" data-act="${act}">${label}</button>`).join('')}</div>` : ''}</div>`;
    },
    acts: Object.assign({}, claimActs, {
      contact(el, st) {
        const it = Store.lfGet(st.id);
        const to = LF.contactUid(it);
        if (to === Store.me().id) return toast('不能给本人发私信');
        H5.go(B + '/profile/sx/chat', { peer: to });
      },
      claim(el, st) { if (!can()) return; H5.go(LOST + '/claim', { id: st.id }); },
      myClaim(el, st) { H5.go(LOST + '/claimDetail', { id: Store.lfGet(st.id).myClaim.id }); },
      editClaim(el, st) { const my = Store.lfGet(st.id).myClaim; if (my) H5.go(LOST + '/claim', { claim: my.id }); },
      async cancelClaim(el, st) {
        const my = Store.lfGet(st.id).myClaim;
        if (!my) return;
        if (await UI.confirm('撤回后可以修改内容再重新提交。', { title: '撤回认领申请', ok: '确认撤回' })) { Store.lfCancelClaim(my.id); toast('已撤回'); }
      },
      clue(el, st) { if (!can()) return; openClueSheet(st.id); },
      edit(el, st) { H5.go(LOST + '/publish', { id: st.id }); },
      withdraw(el, st) {
        openTextSheet({ title: '撤回信息', label: '撤回后其他同学将看不到这条信息', quick: ['已经找到了', '信息填写有误', '物品已交给失主'], ok: '确认撤回', onOk: v => { Store.lfWithdraw(st.id, v); toast('已撤回'); } });
      },
      async markFound(el, st) { if (await UI.confirm('确认已经找回物品？标记后寻物信息将结束展示。', { title: '标记已找回' })) { Store.lfMarkFound(st.id); toast('已标记找回'); } },
      async returnSelf(el, st) { if (await UI.confirm('确认物品已线下归还失主？确认后状态变为「已归还」，未处理的认领申请会自动关闭。', { title: '确认归还' })) { Store.lfReturn([st.id], { note: '线下归还' }); toast('已标记归还'); } },
      transfer(el, st) {
        openOptSheet({ title: '转交到服务点', options: Store.lfPoints().map(p => ({ value: p.id, label: p.mc })), value: '', onPick: v => { Store.lfTransfer(st.id, v); toast('已转交，后续由资助团队核对'); } });
      }
    })
  };

  function applyLfPick(f, k, v, team) {
    f[k] = k === 'sjsm' && f.sjsm === v ? '' : v;
    if (k === 'bgfs' && v === 'self') f.bgdid = '';
    if (k === 'bgdid' && team) { const p = Store.lfPoint(v); if (p && p.xq && !f.xq) f.xq = p.xq; }
  }
  function lfPubFields(f, { team = false, editing = false, keep = '' } = {}) {
    const found = f.lx === 'found';
    const grid = (k, opts, cur) => `<div class="rp-types" style="margin-bottom:18px">${opts.map(o => `<button class="rp-type ${String(cur) === String(o.value) ? 'is-cur' : ''}" data-act="pick" data-k="${k}" data-v="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`;
    const points = (team ? Store.lfMyPoints() : Store.lfPoints()).map(p => ({ value: p.id, label: p.mc }));
    const ka = n => `data-keep="${keep}${n}"`;
    return `${!editing && !team ? `<div class="pub__label"><i>*</i>发布类型</div>${grid('lx', [{ value: 'found', label: '我捡到东西' }, { value: 'lost', label: '我丢了东西' }], f.lx)}` : ''}
      <div class="pub__label"><i>*</i>物品种类</div>${grid('fl', Store.LF_FL, f.fl)}
      <div class="pub__label"><i>*</i>物品名称</div>
      <label class="pub__field"><input ${ka('mc')} data-in="f" data-k="mc" maxlength="30" placeholder="${f.fl === 'campuscard' ? '如：校园卡 · 王*（只写姓氏）' : '如：白色蓝牙耳机盒'}" value="${esc(f.mc)}"></label>
      <div class="pub__label"><i>*</i>校区</div>${grid('xq', Store.LF_XQ.map(x => ({ value: x, label: x })), f.xq)}
      <div class="pub__label"><i>*</i>${found ? '捡到地点' : '可能丢失的地点'}</div>
      <label class="pub__field"><input ${ka('dd')} data-in="f" data-k="dd" maxlength="40" placeholder="${found ? '如：图书馆三楼自习区' : '如：图书馆到食堂之间'}" value="${esc(f.dd)}"></label>
      <div class="pub__label">${found ? '捡到时间' : '丢失时间'}</div>
      <label class="pub__field" style="margin-bottom:10px"><input type="date" ${ka('rq')} data-in="f" data-k="rq" max="${Store.fmtDate(Date.now())}" value="${esc(f.rq)}"></label>
      ${grid('sjsm', LF.SJSM.map(x => ({ value: x, label: x })), f.sjsm)}
      ${found ? (team ? `<div class="pub__label"><i>*</i>保管服务点</div>${grid('bgdid', points, f.bgdid)}`
        : `<div class="pub__label"><i>*</i>保管方式</div>${grid('bgfs', [{ value: 'self', label: '我先保管' }, { value: 'point', label: '已交到服务点' }], f.bgfs)}${f.bgfs === 'point' ? grid('bgdid', points, f.bgdid) : ''}`) : ''}
      <div class="pub__label">补充说明</div>
      <div class="pub__hint">${found ? '只写可公开的外观特征，建议保留一个关键特征用于核对失主' : '可写丢失经过和可能的路线'}</div>
      <label class="pub__field pub__field--area"><textarea ${ka('nr')} data-in="f" data-k="nr" maxlength="300" placeholder="请输入">${esc(f.nr)}</textarea><div class="pub__count">${f.nr.length}/300</div></label>
      <div class="pub__label">图片</div>
      <div class="pub__hint">最多 3 张，证件类请遮挡号码</div>
      <div class="pub__imgs">${(f.tps || []).map((t, i) => `<div class="pub__thumb"><img src="${esc(imgSrc(t))}" data-act="preview" alt=""><button data-act="rmImg" data-i="${i}">×</button></div>`).join('')}
        ${f.tps.length < 3 ? `<button class="pub__upload" data-act="upload"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V5M6 11l6-6 6 6"/></svg>点击上传</button>` : ''}</div>`;
  }

  /* 发布 / 编辑（宫格选择；团队登记和编辑仍走此页） */
  H5.pages[LOST + '/publish'] = {
    title: '发布失物招领',
    init(q) {
      if (q.id) {
        const it = Store.lfGet(q.id);
        if (!it || !it.canEdit) return { missing: true };
        return { id: it.id, team: it.isTeam, f: LF.formFrom(it), warn: true };
      }
      if (q.team === '1' && !Store.lfCan('register')) {
        setTimeout(() => toast('当前账号没有资助团队登记权限，不能以团队身份发布'), 30);
        return { denied: true };
      }
      const team = q.team === '1';
      const f = LF.newForm(q.lx === 'lost' ? 'lost' : 'found');
      if (team) { const p = Store.lfMyPoints()[0]; Object.assign(f, { bgfs: 'point', bgdid: p ? p.id : '', xq: p && p.xq ? p.xq : '' }); }
      return { id: '', team, f, warn: true };
    },
    render(st) {
      if (st.denied) return `<div class="pg">${navbar('团队登记')}<div class="empty-tip">当前账号没有资助团队登记权限，不能以团队身份发布。</div></div>`;
      if (st.missing) return `<div class="pg">${navbar('编辑')}<div class="empty-tip">信息不存在或无权编辑</div></div>`;
      const f = st.f;
      const title = st.id ? '编辑失物信息' : st.team ? '团队登记物品' : '发布失物招领';
      return `<div class="pg pub">
        ${st.id ? navbar(title) : `<div class="pub__head"><div class="pub__title">${title}<img src="${A}publish-title-underline.svg" alt=""></div></div>`}
        ${st.warn ? `<div class="warn-bar"><span class="warn-bar__ico">!</span><span> 请勿公开完整学号、身份证号、手机号；证件类只写姓氏和学院，其余信息留给核对使用。 </span><button class="warn-bar__x" data-act="hideWarn">×</button></div>` : ''}
        <div class="pub__card">
          ${lfPubFields(f, { team: st.team, editing: !!st.id })}
        </div>
        <div class="pub__foot"><button class="btn-ghost" data-act="back">返回</button><button class="btn-ghost" data-act="showPreview">预览</button><button class="btn-primary" data-act="submit">${st.id ? '保存' : '发布'}</button></div></div>`;
    },
    mounted(root, st, isRefresh) { if (!isRefresh && !st.missing && !st.denied && Store.me().sfwczl !== '1') setTimeout(openPrompt, 200); },
    inputs: {
      f(el, st) {
        st.f[el.dataset.k] = el.value;
        if (el.dataset.k === 'nr') { const c = view.querySelector('.pub__count'); if (c) c.textContent = el.value.length + '/300'; }
      }
    },
    acts: {
      hideWarn(el, st) { st.warn = false; H5.refresh(); },
      pick(el, st) {
        applyLfPick(st.f, el.dataset.k, el.dataset.v, st.team);
        H5.refresh();
      },
      async upload(el, st) { const imgs = await UI.pickImages({ max: 3, existing: st.f.tps.length }); st.f.tps = st.f.tps.concat(imgs); H5.refresh(); },
      rmImg(el, st) { st.f.tps.splice(+el.dataset.i, 1); H5.refresh(); },
      showPreview(el, st) {
        const f = st.f, me = Store.me(), p = Store.lfPoint(f.bgdid);
        const fl = Store.LF_FL_MAP[f.fl] || { label: '未选择种类' };
        const it = {
          id: '', lx: f.lx, fl: f.fl, flLabel: fl.label, mc: f.mc || '（未填写物品名称）', xq: f.xq || '未选校区', dd: f.dd || '未填地点', tps: f.tps,
          sjText: (f.rq || '') + (f.sjsm ? ' ' + f.sjsm : ''), fbrnc: me.nc, fbrtx: me.tx, isTeam: !!st.team, fbsj: Date.now(),
          lyLabel: st.team ? '团队发布' : '同学发布', ztLabel: f.lx === 'lost' ? '寻找中' : '待认领', tone: f.lx === 'lost' ? 'orange' : 'blue',
          bgText: f.bgfs === 'point' ? (p ? p.mc : '服务点') : '发布同学保管'
        };
        UI.open({
          kind: 'sheet', title: '发布预览',
          render: () => `<div class="rp-sheet" style="background:#eaf3ff;padding-top:12px">${lfCard(it)}<button class="btn-primary" data-ok>确认${st.id ? '保存' : '发布'}</button></div>`,
          on: { 'click [data-ok]': (e, b, l) => { l.close(); UI.guard(H5.page.acts.submit)(null, st); } }
        });
      },
      submit(el, st) {
        const miss = LF.formMissing(st.f);
        if (miss) return toast(miss);
        if (!can()) return;
        const data = LF.toPayload(st.f);
        if (st.team) Object.assign(data, { ly: 'team', bgfs: 'point' });
        let it;
        try {
          if (st.id) { Store.lfUpdate(st.id, data); toast('已保存'); return H5.back(); }
          it = Store.lfCreate(data);
        } catch (err) { return toast(err.message || '发布失败'); }
        if (st.team) { toast('已登记 ' + it.bh); return H5.replace(LOST + '/work'); }
        UI.open({
          kind: 'dialog', cls: 'ui-confirm', title: '发布成功', closeOnMask: false,
          render: () => `<div class="ui-confirm__msg">${it.lx === 'found' ? '失主提交认领申请后，会通过消息通知你核对。' : '有同学提供线索时，会通过消息和私信通知你。'}<br>信息编号：${esc(it.bh)}</div>
            <div class="ui-confirm__foot"><button class="btn" data-mine>我的失物招领</button><button class="btn btn--primary" data-view>查看详情</button></div>`,
          on: {
            'click [data-mine]': (e, b, l) => { l.close(); H5.replace(LOST + '/mine', { t: it.lx }); },
            'click [data-view]': (e, b, l) => { l.close(); H5.replace(LOST + '/detail', { id: it.id }); }
          }
        });
      }
    }
  };

  /* 申请认领 / 补充材料 */
  H5.pages[LOST + '/claim'] = {
    title: '申请认领',
    init(q) {
      const c = q.claim && Store.lfClaimGet(q.claim);
      return c ? { cid: c.id, id: c.itemId, tz: c.tz, sjdd: c.sjdd, tps: (c.tps || []).slice() } : { cid: '', id: q.id, tz: '', sjdd: '', tps: [] };
    },
    render(st) {
      const it = Store.lfGet(st.id);
      const c = st.cid && Store.lfClaimGet(st.cid);
      const editing = c && ['pending', 'more'].includes(c.zt);
      const title = editing ? '修改认领申请' : c ? '认领申请' : '申请认领';
      if (!it) return `<div class="pg">${navbar(title)}<div class="empty-tip">物品信息不存在</div></div>`;
      return `<div class="pg pub">${navbar(title)}
        <div class="warn-bar"><span class="warn-bar__ico">!</span><span> 请描述未公开的特征（如贴纸、刻字、划痕、内含物品），核对人会据此判断归属；虚假认领将按社区规范处理。 </span></div>
        <div class="pub__card">
          <div class="rd__post" style="margin-bottom:18px" data-act="go" data-path="${LOST}/detail" data-q="id=${it.id}"><div class="rd__post-bt">${esc(it.mc)}</div><div class="rd__post-nr">${esc(it.xq)} · ${esc(it.dd)} · ${esc(it.sjText)}</div><div class="rd__post-nr">${esc(it.bgText)} · ${esc(it.bh)}</div></div>
          ${c && c.zt === 'more' ? `<div class="tip-bar" style="margin:0 0 14px">需要补充：${esc(c.bcyq)}</div>` : ''}
          <div class="pub__label"><i>*</i>可证明归属的特征</div>
          <label class="pub__field pub__field--area"><textarea data-keep="tz" data-in="v" data-k="tz" maxlength="300" placeholder="如：耳机盒背面贴了一张小猫贴纸">${esc(st.tz)}</textarea></label>
          <div class="pub__label"><i>*</i>丢失时间和地点</div>
          <label class="pub__field"><input data-keep="sjdd" data-in="v" data-k="sjdd" maxlength="60" placeholder="如：今天中午 12 点左右在图书馆三楼" value="${esc(st.sjdd)}"></label>
          <div class="pub__label">证明材料</div>
          <div class="pub__hint">选填，如购买记录、物品照片、设备连接截图</div>
          <div class="pub__imgs">${st.tps.map((t, i) => `<div class="pub__thumb"><img src="${esc(imgSrc(t))}" data-act="preview" alt=""><button data-act="rmImg" data-i="${i}">×</button></div>`).join('')}
            ${st.tps.length < 3 ? `<button class="pub__upload" data-act="upload"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V5M6 11l6-6 6 6"/></svg>点击上传</button>` : ''}</div>
        </div>
        <div class="pub__foot"><button class="btn-ghost" data-act="back">返回</button><button class="btn-primary" data-act="submit">${editing ? '保存修改' : '提交申请'}</button></div></div>`;
    },
    inputs: { v(el, st) { st[el.dataset.k] = el.value; } },
    acts: {
      async upload(el, st) { const imgs = await UI.pickImages({ max: 3, existing: st.tps.length }); st.tps = st.tps.concat(imgs); H5.refresh(); },
      rmImg(el, st) { st.tps.splice(+el.dataset.i, 1); H5.refresh(); },
      submit(el, st) {
        if (!can()) return;
        const data = { tz: st.tz, sjdd: st.sjdd, tps: st.tps };
        if (st.cid) { Store.lfUpdateClaim(st.cid, data); toast('已修改认领申请'); return H5.replace(LOST + '/claimDetail', { id: st.cid }); }
        const c = Store.lfClaim(st.id, data);
        toast('申请已提交');
        H5.replace(LOST + '/claimDetail', { id: c.id });
      }
    }
  };

  /* 我的认领 */
  H5.pages[LOST + '/myclaims'] = {
    title: '我的认领',
    init(q) { return { t: q.t === 'ended' ? 'ended' : 'ongoing' }; },
    render(st) {
      const list = Store.lfMyClaims(st.t);
      const res = c => c.zt === 'reject' ? 'rp-card__res--violation' : ['pending', 'more'].includes(c.zt) ? 'rp-card__res--pending' : '';
      return `<div class="pg">${navbar('我的认领')}
        <div class="rp-tabs">${[['ongoing', '进行中'], ['ended', '已结束']].map(([k, t]) => `<button class="rp-tab ${st.t === k ? 'is-active' : ''}" data-act="tab" data-v="${k}">${t} ${Store.lfMyClaims(k).length}</button>`).join('')}</div>
        <div class="rp-list">${list.length ? list.map(c => `<div class="rp-card">
            <div data-act="go" data-path="${LOST}/claimDetail" data-q="id=${c.id}">
            <div class="rp-card__bt ellipsis" style="padding-right:0">${esc(c.item.mc)}</div>
            <div class="rp-card__row"><b>${esc(c.item.flLabel)}</b> · ${esc(c.item.xq)} · ${esc(c.item.bgText)}</div>
            <div class="rp-card__row">申请时间：${Store.fmtDate(c.cjsj, true)}　状态：<b>${esc(c.ztLabel)}</b></div>
            <div class="rp-card__res ${res(c)}">${esc(LF.claimHint(c))}</div></div>
            ${['pending', 'more'].includes(c.zt) ? `<div class="post-card__ops"><button data-act="editClaim" data-id="${c.id}">修改</button><button class="danger" data-act="cancelClaim" data-id="${c.id}">撤回</button></div>` : ''}</div>`).join('') : `<div class="empty-tip" style="padding-top:20px">${st.t === 'ongoing' ? '暂无进行中的认领' : '暂无已结束的认领'}</div>`}</div></div>`;
    },
    acts: {
      tab(el, st) { st.t = el.dataset.v; H5.refresh(); },
      editClaim(el) { H5.go(LOST + '/claim', { claim: el.dataset.id }); },
      async cancelClaim(el) {
        if (await UI.confirm('撤回后可以修改内容再重新提交。', { title: '撤回认领申请', ok: '确认撤回' })) { Store.lfCancelClaim(el.dataset.id); toast('已撤回'); }
      }
    }
  };

  H5.pages[LOST + '/claimDetail'] = {
    title: '认领详情',
    init(q) { return { id: q.id }; },
    render(st) {
      const c = Store.lfClaimGet(st.id);
      if (!c || c.sqrid !== Store.me().id) return `<div class="pg">${navbar('认领详情')}<div class="empty-tip">申请记录不存在</div></div>`;
      const it = c.item;
      const tone = c.zt === 'reject' ? 'rd__banner--violation' : ['pass', 'done'].includes(c.zt) ? 'rd__banner--done' : '';
      const editable = ['pending', 'more'].includes(c.zt);
      const foot = editable ? `<button class="btn-ghost" data-act="cancel">撤回</button><button class="btn-primary" data-act="edit">修改</button>`
        : c.zt === 'pass' && c.clr ? `<button class="btn-primary" data-act="pm" data-uid="${c.clr}">联系核对人</button>` : '';
      return `<div class="pg">${navbar('认领详情')}<div class="rd" style="padding-bottom:${foot ? 110 : 30}px">
        <div class="rd__banner ${tone}"><h4>${esc(c.ztLabel)}</h4><p>${esc(LF.claimHint(c))}</p></div>
        <div class="rd__sec"><h5>认领物品</h5><div class="rd__post" data-act="go" data-path="${LOST}/detail" data-q="id=${it.id}"><div class="rd__post-bt">${esc(it.mc)}</div><div class="rd__post-nr">${esc(it.xq)} · ${esc(it.dd)} · ${esc(it.bgText)}</div><div class="rd__post-nr">${esc(it.bh)} · ${esc(it.ztLabel)}</div></div></div>
        ${c.jj ? `<div class="rd__sec"><h5>交接安排</h5>${kv('领取地点', esc(c.jj.dd))}${kv('领取时间', esc(c.jj.sj))}${c.jj.lxfs ? kv('联系方式', esc(c.jj.lxfs)) : ''}${kv('领取须知', '请携带校园卡或有效证件')}</div>` : ''}
        <div class="rd__sec"><h5>我的申请</h5>${kv('归属特征', esc(c.tz))}${kv('时间地点', esc(c.sjdd))}${kv('申请时间', Store.fmtDateTime(c.cjsj))}${lfImgs(c.tps)}</div>
        <div class="rd__sec"><h5>处理进度</h5>${stepsHtml(LF.claimSteps(c))}</div>
        <div class="rd__tip">核对结果和交接安排会通过「消息 · 失物」和私信通知你</div></div>
        ${foot ? `<div class="pub__foot">${foot}</div>` : ''}</div>`;
    },
    acts: {
      edit(el, st) { H5.go(LOST + '/claim', { claim: st.id }); },
      async cancel(el, st) {
        if (await UI.confirm('撤回后可以修改内容再重新提交。', { title: '撤回认领申请', ok: '确认撤回' })) { Store.lfCancelClaim(st.id); toast('已撤回'); }
      }
    }
  };

  /* 资助团队招领站 / 每日汇总 */
  H5.pages[LOST + '/station'] = {
    title: '资助团队招领站',
    render() {
      const sta = Store.lfStation();
      const dg = Store.lfTodayDigest();
      return `<div class="pg">${navbar('资助团队招领站')}<div class="rd">
        <div class="rd__banner"><h4>资助团队招领站</h4><p>今日新增 ${sta.todayNew} 件 · 待认领 ${sta.pending} 件 · 寻物中 ${sta.seeking} 条</p></div>
        <div class="rd__sec"><h5>今日招领汇总</h5>${dg ? `${kv('汇总日期', Store.fmtDate(dg.rq))}${kv('新增物品', dg.total + ' 件')}${kv('校区分布', esc(LF.digestLine(dg)))}
            <div class="post-card__ops"><button data-act="go" data-path="${LOST}/history">历史汇总</button><button data-act="go" data-path="${LOST}/digest" data-q="id=${dg.id}">查看汇总</button></div>`
          : `<div class="rd__post-nr">今日汇总暂未发布，可先查看全部待认领物品</div><div class="post-card__ops"><button data-act="go" data-path="${LOST}/history">历史汇总</button><button data-act="go" data-path="${LOST}/index" data-q="ly=team">全部待认领</button></div>`}</div>
        <div class="rd__sec"><h5>服务点与值班</h5>${Store.lfPoints().map(p => `<div class="rd__post" style="margin-top:10px"><div class="rd__post-bt">${esc(p.mc)}<small style="color:#9aa4ad;font-weight:500"> · 在保管 ${p.items} 件</small></div>
            <div class="rd__post-nr">地址：${esc(p.dz || '由团队确认并维护')}</div><div class="rd__post-nr">值班：${esc(p.zbap)}</div><div class="rd__post-nr">联系：${esc(p.lxfs)}</div>
            ${p.lstz ? `<div class="rd__post-nr" style="color:#f08c2a">临时调整：${esc(p.lstz)}</div>` : ''}</div>`).join('')}</div>
        <div class="rd__tip">物品交到服务点后，由资助团队统一登记、核对与归还</div></div></div>`;
    }
  };
  H5.pages[LOST + '/digest'] = {
    title: '招领汇总',
    init(q) { return { id: q.id }; },
    render(st) {
      const d = Store.lfDigestGet(st.id);
      if (!d || d.zt !== 'published') return `<div class="pg">${navbar('招领汇总')}<div class="empty-tip">汇总不存在或尚未发布</div></div>`;
      return `<div class="pg">${navbar('招领汇总')}<div class="rd" style="padding-bottom:0">
        <div class="rd__banner"><h4>${esc(LF.digestTitle(d))}</h4><p>共 ${d.total} 件 · 含团队登记与学生自主登记 · ${esc(LF.digestLine(d))}</p></div>
        <div class="rd__sec"><h5>汇总说明</h5>${kv('分类', d.fls.map(x => esc(x.label) + ' ' + x.n + ' 件').join('、') || '—')}${kv('确认人', esc((d.qrrUser || {}).nc || '资助团队'))}${kv('发布时间', Store.fmtDate(d.qrsj, true))}</div></div>
        <div class="post-list" style="padding-top:0">${d.items.map(it => lfCard(it)).join('')}</div>
        <div class="more-tip"><button data-act="go" data-path="${LOST}/history" style="color:#3087cc">查看历史汇总</button></div></div>`;
    },
    acts: { lfItem(el) { H5.go(LOST + '/detail', { id: el.dataset.id }); } }
  };
  H5.pages[LOST + '/history'] = {
    title: '历史汇总',
    render() {
      const list = Store.lfDigests();
      return `<div class="pg">${navbar('历史汇总')}<div class="rp-list">${list.length ? list.map(d => `<button class="rp-card" data-act="go" data-path="${LOST}/digest" data-q="id=${d.id}">
          <div class="rp-card__bt">${esc(LF.digestTitle(d))}</div>
          <div class="rp-card__row">共 <b>${d.total}</b> 件 · ${esc(LF.digestLine(d))}</div>
          <div class="rp-card__row">确认人：${esc((d.qrrUser || {}).nc || '资助团队')} · ${Store.fmtDate(d.qrsj, true)}</div></button>`).join('') : '<div class="empty-tip">暂无汇总</div>'}</div></div>`;
    }
  };

  /* 我的失物招领 */
  H5.pages[LOST + '/mine'] = {
    title: '我的失物招领',
    init(q) { return { t: q.t === 'lost' ? 'lost' : 'found' }; },
    render(st) {
      const list = Store.lfMyItems(st.t);
      const ops = it => {
        if (it.closed) return '';
        const a = [`<button data-act="edit" data-id="${it.id}">编辑</button>`, `<button class="danger" data-act="withdraw" data-id="${it.id}">撤回</button>`];
        if (it.lx === 'lost') a.push(`<button data-act="markFound" data-id="${it.id}">已找回</button>`);
        else if (it.claimN) a.push(`<button data-act="lfItem" data-id="${it.id}">处理申请 ${it.claimN}</button>`);
        return a.join('');
      };
      return `<div class="pg">${navbar('我的失物招领')}
        <div class="rp-tabs">${[['found', '我捡到的'], ['lost', '我丢失的']].map(([k, t]) => `<button class="rp-tab ${st.t === k ? 'is-active' : ''}" data-act="tab" data-v="${k}">${t} ${Store.lfMyItems(k).length}</button>`).join('')}</div>
        <div class="post-list">${list.length ? list.map(it => lfCard(it, { ops: ops(it) })).join('') : `<div class="empty-tip">暂无发布</div><div style="padding:0 60px"><button class="btn-primary" style="width:100%" data-act="go" data-path="${LOST}/publish" data-q="lx=${st.t}">${st.t === 'found' ? '发布捡到的物品' : '发布寻物求助'}</button></div>`}</div>
        ${list.length ? '<div class="more-tip">没有更多了～</div>' : ''}</div>`;
    },
    acts: {
      tab(el, st) { st.t = el.dataset.v; H5.refresh(); },
      lfItem(el) { H5.go(LOST + '/detail', { id: el.dataset.id }); },
      edit(el) { H5.go(LOST + '/publish', { id: el.dataset.id }); },
      withdraw(el) {
        openTextSheet({ title: '撤回信息', label: '撤回后其他同学将看不到这条信息', quick: ['已经找到了', '信息填写有误', '物品已交给失主'], ok: '确认撤回', onOk: v => { Store.lfWithdraw(el.dataset.id, v); toast('已撤回'); } });
      },
      async markFound(el) { if (await UI.confirm('确认已经找回物品？', { title: '标记已找回' })) { Store.lfMarkFound(el.dataset.id); toast('已标记找回'); } }
    }
  };

  /* 资助团队工作台 */
  const teamOnly = title => `<div class="pg">${navbar(title)}<div class="empty-tip">当前账号没有资助团队登记权限</div></div>`;
  H5.pages[LOST + '/work'] = {
    title: '招领工作台',
    render() {
      if (!Store.lfIsTeam()) return teamOnly('招领工作台');
      const s = Store.lfStats();
      const roles = Store.lfRoles().map(r => Store.LF_ROLES[r].label).join('、');
      const pts = Store.lfMyPoints().map(p => p.mc).join('、') || '—';
      const dg = Store.lfDigests({ published: false }).find(d => d.isToday && d.zt === 'draft');
      const pass = Store.lfReviewQueue({ team: true, zt: 'pass' }).length;
      const can = k => Store.lfCan(k);
      const row = (path, q, icon, t, sub, n) => `<button class="me-list__item" data-act="go" data-path="${path}" ${q ? `data-q="${q}"` : ''}><img src="${A}${icon}" alt="">${twoLine(t, sub)}${n ? `<span class="me-list__new">${n}</span>` : ''}${chev}</button>`;
      return `<div class="pg">${navbar('招领工作台')}
        <div class="rd" style="padding-bottom:0"><div class="rd__banner"><h4>${esc(Store.me().nc)}</h4><p>角色：${esc(roles)}<br>负责：${esc(pts)}</p></div></div>
        <div class="me-list" style="margin-top:0">
          ${can('check') ? row(LOST + '/review', 't=pending', 'profile-icon-security.svg', '待核对申请', '对照特征核验认领人', s.claims) : ''}
          ${can('check') ? row(LOST + '/review', 't=pass', 'profile-icon-message-new.svg', '待交接', '发送交接安排并确认归还', pass) : ''}
          ${can('register') ? row(LOST + '/publish', 'team=1', 'profile-icon-posts-new.svg', '登记物品', '登记交到服务点的物品', 0) : ''}
          ${can('register') ? row(LOST + '/batch', '', 'profile-icon-file.svg', '批量登记校园卡', '一次登记多张，顺序为学院、学号、姓名', 0) : ''}
          ${can('check') ? row(LOST + '/return', '', 'profile-icon-drafts.svg', '批量归还', '线下领取后批量标记归还', 0) : ''}
        </div>
        <div class="me-list">
          ${can('register') ? `<button class="me-list__item" data-act="digest"><img src="${A}profile-icon-file.svg" alt="">${twoLine('今日招领汇总', dg ? `待确认 · ${dg.total} 件，确认后发布` : Store.lfTodayDigest() ? '已发布，有新增登记时可重新生成' : '生成今天的招领汇总，含团队和学生登记')}${dg ? '<span class="me-list__new">待确认</span>' : ''}${chev}</button>` : ''}
          ${row(LOST + '/station', '', 'lx-icon-lost-tab.svg', '服务点与值班', '查看各服务点保管情况', 0)}
        </div>
        <div class="more-tip" style="font-weight:500">今日新增 ${s.todayNew} 件 · 待认领 ${s.pending} 件 · 今日归还 ${s.todayReturned} 件${s.idle ? ` · ${s.idle} 件超过 30 天未更新，请到 PC 管理端确认` : ''}</div></div>`;
    },
    acts: {
      async digest() {
        const today = Store.startOfDay(Date.now());
        let d = Store.lfDigests({ published: false }).find(x => x.isToday && x.zt === 'draft');
        if (!d) {
          if (!(await UI.confirm(`将汇总今天登记的 ${Store.lfDayItems(today).length} 件物品（含团队和学生），生成后需确认才会发布。`, { title: '生成今日汇总', ok: '生成' }))) return;
          d = Store.lfDigestGet(Store.lfDigestGenerate(today).id);
        }
        if (!d.total) return toast('今天还没有登记的物品');
        if (await UI.confirm(`${LF.digestTitle(d)}：共 ${d.total} 件（${LF.digestLine(d)}）。确认信息无误并发布到招领页？`, { title: '确认发布', ok: '确认发布' })) { Store.lfDigestPublish(d.id); toast('汇总已发布'); }
      }
    }
  };

  /* 批量登记校园卡，字段顺序与网页端一致：学院、学号、姓名、校区 */
  const CARD_SAMPLE = '冶金与环境学院 8225130218 王一鸣 本部\n商学院 8209220311 陈思远 新校\n湘雅医学院 8301210127 刘可欣 湘雅\n交通运输工程学院 8226010203';
  H5.pages[LOST + '/batch'] = {
    title: '批量登记校园卡',
    init() {
      if (!Store.lfCan('register')) return { denied: true };
      const p = Store.lfMyPoints()[0];
      return { bgdid: p ? p.id : '', xq: p && p.xq ? p.xq : '', dd: '', rq: Store.fmtDate(Date.now()), text: '', parsed: null };
    },
    render(st) {
      if (st.denied || !Store.lfCan('register')) return teamOnly('批量登记校园卡');
      const points = Store.lfMyPoints().map(p => ({ value: p.id, label: p.mc }));
      const grid = (k, opts, cur) => `<div class="rp-types" style="margin-bottom:18px">${opts.map(o => `<button class="rp-type ${String(cur) === String(o.value) ? 'is-cur' : ''}" data-act="pick" data-k="${k}" data-v="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`;
      const okN = st.parsed ? st.parsed.filter(r => r.ok).length : 0;
      return `<div class="pg pub">${navbar('批量登记校园卡')}
        <div class="pub__card">
          <div class="pub__label"><i>*</i>保管服务点</div>${grid('bgdid', points, st.bgdid)}
          <div class="pub__label">默认校区</div>${grid('xq', Store.LF_XQ.map(x => ({ value: x, label: x })), st.xq)}
          <div class="pub__label">捡到日期</div>
          <label class="pub__field"><input type="date" data-keep="rq" data-in="meta" data-k="rq" max="${Store.fmtDate(Date.now())}" value="${esc(st.rq)}"></label>
          <div class="pub__label">默认地点</div>
          <label class="pub__field"><input data-keep="dd" data-in="meta" data-k="dd" maxlength="40" placeholder="如：图书馆值班台（选填）" value="${esc(st.dd)}"></label>
          <div class="pub__label"><i>*</i>粘贴校园卡信息</div>
          <div class="pub__hint">每行一张卡，按学院、学号、姓名、校区用空格隔开。未写校区时使用默认校区。</div>
          <label class="pub__field pub__field--area"><textarea data-keep="cards" data-in="cards" maxlength="2000" placeholder="冶金与环境学院 8225130218 王一鸣 本部">${esc(st.text)}</textarea></label>
          <div class="post-card__ops"><button data-act="sample">填入示例</button><button data-act="parse">识别</button></div>
          ${st.parsed ? `<div class="pub__hint" style="margin-top:14px">共 ${st.parsed.length} 行，可登记 ${okN} 张${st.parsed.length - okN ? `，${st.parsed.length - okN} 行需修改` : ''}</div>
            ${st.parsed.map((r, i) => `<div class="rd__post" style="margin-top:10px"><div class="rd__post-bt">${i + 1}. ${r.ok ? '可登记' : esc(r.err)}</div>
              <div class="rd__post-nr">学院：${esc(r.xy || '—')} · 学号：${esc(r.xh || '—')} · 姓名：${esc(r.xm || '—')}</div>
              <div class="rd__post-nr">校区：${esc(r.xq || '—')}${r.xm ? ' · 前台显示：校园卡 · ' + esc(Store.maskName(r.xm)) : ''}</div>
              <div class="rd__post-nr">${esc(r.line)}</div></div>`).join('')}` : ''}
        </div>
        <div class="pub__foot"><button class="btn-ghost" data-act="back">返回</button><button class="btn-primary" data-act="submit" ${okN ? '' : 'disabled'}>确认登记${okN ? ' ' + okN + ' 张' : ''}</button></div></div>`;
    },
    inputs: {
      cards(el, st) { st.text = el.value; },
      meta(el, st) { st[el.dataset.k] = el.value; }
    },
    acts: {
      pick(el, st) {
        st[el.dataset.k] = el.dataset.v;
        if (el.dataset.k === 'bgdid') { const p = Store.lfPoint(el.dataset.v); if (p && p.xq) st.xq = p.xq; }
        H5.refresh();
      },
      sample(el, st) {
        st.text = CARD_SAMPLE; st.parsed = null;
        const ta = view.querySelector('[data-keep="cards"]');
        if (ta) ta.value = CARD_SAMPLE;
        H5.refresh();
      },
      parse(el, st) {
        if (!st.text.trim()) return toast('请先粘贴校园卡信息');
        st.parsed = Store.lfParseCards(st.text, { xq: st.xq });
        H5.refresh();
      },
      submit(el, st) {
        const rows = (st.parsed || []).filter(r => r.ok);
        if (!st.bgdid) return toast('请选择保管服务点');
        if (!rows.length) return toast('请先识别出可登记的校园卡');
        const n = Store.lfBatchCreate(rows, { bgdid: st.bgdid, xq: st.xq, dd: st.dd || '服务点登记', sj: st.rq ? new Date(st.rq + 'T12:00').getTime() : undefined });
        toast('已登记 ' + n + ' 张校园卡');
        H5.back();
      }
    }
  };

  H5.pages[LOST + '/review'] = {
    title: '认领核对',
    init(q) { return { t: ['pending', 'more', 'pass'].includes(q.t) ? q.t : 'pending' }; },
    render(st) {
      if (!Store.lfCan('check')) return teamOnly('认领核对');
      const tabs = [['pending', '待核对'], ['more', '待补充'], ['pass', '待交接']];
      const list = Store.lfReviewQueue({ team: true, zt: st.t });
      return `<div class="pg">${navbar('认领核对')}
        <div class="rp-tabs">${tabs.map(([k, t]) => `<button class="rp-tab ${st.t === k ? 'is-active' : ''}" data-act="tab" data-v="${k}">${t} ${Store.lfReviewQueue({ team: true, zt: k }).length}</button>`).join('')}</div>
        <div class="rp-list">${list.length ? list.map(c => `<div class="rp-card">
            <div class="rp-card__bt ellipsis" style="padding-right:0" data-act="go" data-path="${LOST}/detail" data-q="id=${c.item.id}">${esc(c.item.mc)} ›</div>
            <div class="rp-card__row">${esc(c.item.bh)} · ${esc(c.item.bgText)}${c.item.card ? ' · 持卡人 ' + esc(c.item.card.xm) : ''}</div>
            <div class="rp-card__row">认领人：<b>${esc(c.sqr.nc)}</b>（${esc(c.sqr.xm)} · ${esc(c.sqr.xh)}）</div>
            <div class="rp-card__row">归属特征：<b>${esc(c.tz)}</b></div>
            <div class="rp-card__row">时间地点：${esc(c.sjdd)}</div>
            ${(c.tps || []).length ? `<div class="cmt__imgs">${c.tps.map(t => `<img src="${esc(imgSrc(t))}" data-act="preview" alt="">`).join('')}</div>` : ''}
            ${c.zt === 'more' ? `<div class="rp-card__res rp-card__res--pending">已要求补充：${esc(c.bcyq)}</div>` : ''}
            ${c.jj ? `<div class="rp-card__res">已安排：${esc(c.jj.dd)} · ${esc(c.jj.sj)}</div>` : ''}
            <div class="post-card__ops">${claimOps(c)}</div></div>`).join('') : '<div class="empty-tip" style="padding-top:20px">暂无需要处理的申请</div>'}</div></div>`;
    },
    acts: Object.assign({}, claimActs, { tab(el, st) { st.t = el.dataset.v; H5.refresh(); } })
  };
  H5.pages[LOST + '/return'] = {
    title: '批量归还',
    init() { return { sel: {} }; },
    render(st) {
      if (!Store.lfCan('check')) return teamOnly('批量归还');
      const list = Store.lfAdminItems({}).filter(it => ['pending', 'checking'].includes(it.ztKey) && it.canReturn);
      const n = Object.keys(st.sel).filter(k => st.sel[k]).length;
      return `<div class="pg">${navbar('批量归还')}<div class="tip-bar" style="background:#f4f8fd;color:#3087cc">适用于失主已到服务点线下领取的物品，勾选后统一标记为已归还</div>
        <div class="rp-list" style="padding-bottom:110px">${list.length ? list.map(it => `<button class="rp-card" data-act="sel" data-id="${it.id}">
            <span class="rp-type ${st.sel[it.id] ? 'is-cur' : ''}" style="position:absolute;right:12px;top:12px">${st.sel[it.id] ? '已选' : '选择'}</span>
            <div class="rp-card__bt ellipsis">${esc(it.mc)}</div>
            <div class="rp-card__row"><b>${esc(it.bh)}</b> · ${esc(it.bgText)}</div>
            <div class="rp-card__row">${esc(it.xq)} · ${esc(it.dd)} · ${Store.fmtDate(it.fbsj)}　${esc(it.ztLabel)}</div></button>`).join('') : '<div class="empty-tip">暂无待归还物品</div>'}</div>
        <div class="pub__foot"><button class="btn-ghost" data-act="all">${list.length && n === list.length ? '取消全选' : '全选'}</button><button class="btn-primary" data-act="done">确认归还${n ? '（' + n + '）' : ''}</button></div></div>`;
    },
    acts: {
      sel(el, st) { st.sel[el.dataset.id] = !st.sel[el.dataset.id]; H5.refresh(); },
      all(el, st) {
        const list = Store.lfAdminItems({}).filter(it => ['pending', 'checking'].includes(it.ztKey) && it.canReturn);
        const on = list.some(it => !st.sel[it.id]);
        st.sel = {}; if (on) list.forEach(it => { st.sel[it.id] = true; });
        H5.refresh();
      },
      done(el, st) {
        const ids = Object.keys(st.sel).filter(k => st.sel[k]);
        if (!ids.length) return toast('请先选择物品');
        openTextSheet({ title: `归还 ${ids.length} 件物品`, label: '归还说明会记录到处理记录中', quick: ['失主到服务点线下领取', '已核对证件后归还'], ok: '确认归还', onOk: v => { Store.lfReturn(ids, { note: v.trim() || '线下领取' }); st.sel = {}; toast('已标记归还'); } });
      }
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
        <a href="#${LOST}/index">失物招领</a>
        ${Store.lfIsTeam() ? `<a href="#${LOST}/work">招领工作台（资助团队）</a>` : ''}
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
