/* 中南点点原型 · PC 外壳：顶部导航、路由、管理端侧栏与标签页 */
(function () {
  const { esc, toast } = UI;
  const PC = window.PC = { pages: {}, page: null, root: null, query: {} };
  const HOME = '/bbs/home/index';
  const NAV = ['首页', '迎新管理', '我的待办', '个人信息', '数据统计', '学生事务管理', '宿舍管理', '学工队伍建设', '心理健康', '武装部工作', '第二课堂', '业务助手', '学风建设', '中南点点', '学工信箱', '驾驶舱', '中南点点管理', '基础信息', '学情库', 'AI'];
  const ADMIN_MENU = [
    { path: '/bbs/admin/dashboard/index', title: '数据概览' },
    { path: '/bbs/admin/posts/index', title: '帖子管理' },
    { path: '/bbs/admin/users/index', title: '用户管理' },
    { path: '/bbs/admin/departments/index', title: '部门管理' },
    { path: '/bbs/admin/topics/index', title: '话题管理' },
    { path: '/bbs/admin/lost/items', title: '失物台账', lost: true, group: '失物招领' },
    { path: '/bbs/admin/lost/register', title: '批量登记', lost: true, group: '失物招领' },
    { path: '/bbs/admin/lost/digest', title: '每日汇总', lost: true, group: '失物招领' },
    { path: '/bbs/admin/lost/points', title: '服务点与成员', lost: true, group: '失物招领' }
  ];
  // 资助团队成员只能进入失物招领相关的管理页
  PC.canAdmin = page => Store.me().role === 'admin' || (!!page && !!page.lost && Store.lfIsTeam());
  const adminMenu = () => ADMIN_MENU.filter(m => PC.canAdmin({ lost: m.lost }));
  const DEMO_USERS = Store.DEMO_USERS;

  PC.go = (path, query) => {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const target = '#' + path + qs;
    if (location.hash === target) route(); else location.hash = target;
  };
  PC.back = () => {
    if (history.length > 1 && PC.visited > 1) history.back();
    else PC.go(HOME);
  };
  PC.visited = 0;
  PC.isAdminRoute = p => p.startsWith('/bbs/admin');

  /* ---------- 顶部 ---------- */
  function renderHeader() {
    const me = Store.me();
    const isAdmin = me.role === 'admin';
    const path = UI.parseHash().path;
    const activeName = PC.isAdminRoute(path) ? '中南点点管理' : '中南点点';
    const items = NAV.filter(n => n !== '中南点点管理' || adminMenu().length);
    const roleName = isAdmin ? '超级管理员' : me.sfgf === '1' ? '部门账号' : Store.lfIsTeam() ? '资助团队' : '学生';
    document.getElementById('header').innerHTML = `
      <div class="header__logo" data-act="logo" title="中南大学智慧学工"></div>
      <div class="header__top">
        <div class="user-chip" id="userChip">
          <span class="user-chip__avatar"><img src="assets/pc/shell-avatar.png" alt=""></span>
          <div>
            <div class="user-chip__name">${esc(me.xm || me.nc)}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></div>
            <div class="user-chip__role">${roleName}</div>
          </div>
          <div class="user-chip__menu">
            <div class="user-chip__menu-tit">切换演示身份（原型）</div>
            ${DEMO_USERS.map(u => `<button data-act="switch" data-id="${u.id}" class="${u.id === me.id ? 'is-cur' : ''}">${esc(u.label)}${u.id === me.id ? '<span>✓</span>' : ''}</button>`).join('')}
            <div class="user-chip__menu-tit" style="border-top:.00521rem solid #eef3f6;margin-top:.02083rem">数据</div>
            <button data-act="reset">重置演示数据</button>
            <button data-act="portal">返回原型入口</button>
          </div>
        </div>
        <button class="manual-entry" data-act="manual"><img src="data:image/svg+xml,%3Csvg width='20' height='22' viewBox='0 0 20 22' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9.75 20.75C5.5 20.75 3.39 20.75 2.07 19.29C.75 17.82.75 15.46.75 10.75C.75 6.04.75 3.68 2.07 2.21C3.39.75 5.5.75 9.75.75C13.99.75 16.11.75 17.43 2.21C18.75 3.68 18.75 6.04 18.75 10.75C18.75 15.46 18.75 17.82 17.43 19.29C16.11 20.75 13.99 20.75 9.75 20.75Z' stroke='%233087CC' stroke-width='1.5'/%3E%3Cpath d='M5.75 1.25V8.58C5.75 9.82 5.75 10.45 6.14 10.67C6.88 11.1 8.29 9.66 8.96 9.23C9.34 8.97 9.53 8.85 9.75 8.85C9.97 8.85 10.16 8.97 10.55 9.23C11.21 9.66 12.62 11.1 13.36 10.67C13.75 10.45 13.75 9.82 13.75 8.58V1.25' stroke='%233087CC' stroke-width='1.5'/%3E%3C/svg%3E" alt="">操作手册<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
      <div class="header__bottom">
        <button class="header__navbtn" data-act="navL"><svg viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="13" fill="#E3F1F9"/><path d="M12.45 13.61L17.06 18.22L18 17.28L14.33 13.61L18 9.94L17.06 9L12.45 13.61ZM6.67 13.61L11.28 18.22L12.22 17.28L8.56 13.61L12.22 9.94L11.28 9L6.67 13.61Z" fill="#3388CD"/></svg></button>
        <div class="header__nav" id="topNav">
          ${items.map(n => `<div class="header__tag ${n === activeName ? 'is-active' : ''}" data-act="nav" data-name="${n}">${n}</div>`).join('')}
        </div>
        <button class="header__navbtn" data-act="navR"><svg viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="13" fill="#E3F1F9"/><path d="M13.55 13.61L8.94 18.22L8 17.28L11.67 13.61L8 9.94L8.94 9L13.55 13.61ZM19.33 13.61L14.72 18.22L13.78 17.28L17.44 13.61L13.78 9.94L14.72 9L19.33 13.61Z" fill="#3388CD"/></svg></button>
      </div>`;
    const nav = document.getElementById('topNav');
    nav.scrollLeft = PC.navScroll || 0;
    syncNavBtns();
    nav.addEventListener('scroll', () => { PC.navScroll = nav.scrollLeft; syncNavBtns(); });
  }
  function syncNavBtns() {
    const nav = document.getElementById('topNav');
    const [l, r] = document.querySelectorAll('.header__navbtn');
    l.style.visibility = nav.scrollLeft > 0 ? 'visible' : 'hidden';
    r.style.visibility = nav.scrollLeft < nav.scrollWidth - nav.clientWidth - 1 ? 'visible' : 'hidden';
  }
  UI.delegate(document.getElementById('header'), 'click', '[data-act]', (e, el) => {
    const a = el.dataset.act;
    if (a === 'nav') {
      const n = el.dataset.name;
      if (n === '中南点点') PC.go(HOME);
      else if (n === '中南点点管理') PC.go(adminMenu()[0].path);
      else toast(`原型未包含「${n}」模块`, 'info');
    } else if (a === 'navL' || a === 'navR') {
      document.getElementById('topNav').scrollBy({ left: a === 'navL' ? -200 : 200, behavior: 'smooth' });
    } else if (a === 'logo') PC.go(HOME);
    else if (a === 'manual') toast('操作手册：原型未包含该模块', 'info');
    else if (a === 'switch') {
      Store.setCurrentUser(el.dataset.id);
      const u = Store.me();
      toast('已切换为：' + (u.xm || u.nc), 'success');
      if (PC.isAdminRoute(UI.parseHash().path) && !PC.canAdmin(PC.page)) PC.go(HOME);
    } else if (a === 'reset') {
      UI.confirm('确定重置所有演示数据？当前浏览器中新增的帖子、评论等将被清除。').then(ok => {
        if (ok) { Store.reset(); toast('已重置演示数据', 'success'); PC.go(HOME); }
      });
    } else if (a === 'portal') location.href = 'index.html';
  });
  document.addEventListener('click', e => {
    const chip = document.getElementById('userChip');
    if (!chip) return;
    if (chip.contains(e.target) && !e.target.closest('.user-chip__menu')) chip.classList.toggle('is-open');
    else if (!chip.contains(e.target) || e.target.closest('button')) chip.classList.remove('is-open');
  });

  /* ---------- 管理端外框 ---------- */
  const TAGS_KEY = 'zndd_pc_admin_tags';
  function adminTags() {
    try { return JSON.parse(sessionStorage.getItem(TAGS_KEY)) || []; } catch (e) { return []; }
  }
  function setAdminTags(t) { sessionStorage.setItem(TAGS_KEY, JSON.stringify(t)); }
  function adminFrame(path, page) {
    let tags = adminTags().filter(t => PC.canAdmin(PC.pages[t.path]));
    if (!tags.some(t => t.path === path)) tags.push({ path, title: page.title });
    setAdminTags(tags);
    const menuActive = page.menu || path;
    let prevGroup = '';
    const menuHtml = adminMenu().map(m => {
      const head = m.group && m.group !== prevGroup ? `<div class="aside-group"><i></i><span>${esc(m.group)}</span></div>` : '';
      prevGroup = m.group || '';
      return `${head}<div class="aside-item${m.group ? ' aside-item--sub' : ''} ${m.path === menuActive ? 'is-active' : ''}" data-admin-go="${m.path}">
            <span class="aside-item__ico"></span><span>${esc(m.title)}</span></div>`;
    }).join('');
    return `<div class="admin-layout">
      <aside class="aside-split">
        <div class="aside-split__title"><i></i>中南点点</div>
        <div class="aside-split__list">
          ${menuHtml}
        </div>
      </aside>
      <section class="admin-content">
        <div class="tag-wrap">
          <button class="tag-wrap__back" data-act="back"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>返回上一步</button>
          <div class="tag-wrap__tabs">
            ${tags.map(t => `<div class="tags-item ${t.path === path ? 'is-active' : ''}" data-admin-go="${t.path}">${esc(t.title)}<button class="tags-item__x" data-tag-close="${t.path}">×</button></div>`).join('')}
          </div>
          <button class="tag-wrap__more" data-act="closeOthers" title="关闭其他"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
        </div>
        <div class="admin-page" id="pageRoot"></div>
      </section>
    </div>`;
  }

  /* ---------- 路由 ---------- */
  function route() {
    const { path, query } = UI.parseHash();
    const page = PC.pages[path];
    if (!page) { location.replace('#' + HOME); return; }
    if (page.admin && !PC.canAdmin(page)) {
      toast('当前身份没有「中南点点管理」权限', 'warning');
      location.replace('#' + HOME);
      return;
    }
    PC.visited++;
    UI.closeAll();
    const view = document.getElementById('view');
    const backbar = document.getElementById('backbar');
    PC.page = page; PC.query = query; PC.path = path;
    page.state = page.init ? page.init(query) : {};
    if (page.admin) {
      backbar.classList.add('hidden');
      view.className = 'view view--admin';
      view.innerHTML = adminFrame(path, page);
      PC.root = document.getElementById('pageRoot');
    } else {
      backbar.classList.remove('hidden');
      view.className = 'view';
      view.innerHTML = '<div id="pageRoot" class="page-root"></div>';
      PC.root = document.getElementById('pageRoot');
    }
    document.title = (page.title || '中南点点') + ' - 中南大学智慧学工';
    renderHeader();
    const root = PC.root;
    root.innerHTML = page.render(page.state);
    if (page.bind) page.bind(root, page.state);
    if (page.mounted) page.mounted(root, page.state);
  }
  PC.refresh = function () {
    if (!PC.page || !PC.root) return;
    UI.patch(PC.root, PC.page.render(PC.page.state));
    if (PC.page.mounted) PC.page.mounted(PC.root, PC.page.state, true);
  };
  UI.delegate(document.getElementById('view'), 'click', '[data-admin-go],[data-tag-close],[data-act="back"],[data-act="closeOthers"]', (e, el) => {
    if (el.dataset.tagClose) {
      e.stopPropagation();
      let tags = adminTags().filter(t => t.path !== el.dataset.tagClose);
      setAdminTags(tags);
      if (el.dataset.tagClose === PC.path) PC.go(tags.length ? tags[tags.length - 1].path : adminMenu()[0].path);
      else el.closest('.tags-item').remove();
      return;
    }
    if (el.dataset.act === 'back') { PC.back(); return; }
    if (el.dataset.act === 'closeOthers') {
      setAdminTags(adminTags().filter(t => t.path === PC.path));
      route();
      return;
    }
    if (el.dataset.adminGo && !e.target.closest('[data-tag-close]')) PC.go(el.dataset.adminGo);
  });
  document.getElementById('backbar').addEventListener('click', e => { if (e.target.closest('button')) PC.back(); });

  window.addEventListener('hashchange', route);
  window.addEventListener('zndd:change', () => {
    if (PC.page && PC.page.admin && !PC.canAdmin(PC.page)) { UI.closeAll(); PC.go(HOME); return; }
    renderHeader(); PC.refresh(); UI.refreshLayers();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('floatDd').addEventListener('click', () => PC.go(HOME));
    document.getElementById('floatAi').addEventListener('click', () => toast('AI 助手：原型未包含该模块', 'info'));
    route();
  });

  /* ---------- PC 公共片段 ---------- */
  PC.lxTag = (lx, cls = 'lx-tag') => {
    const m = Store.LX_MAP[lx] || { label: '其他', tone: 'blue' };
    return `<span class="${cls} lx--${m.tone}"><img src="assets/pc/tab-${lx in Store.LX_MAP ? lx : 'all'}.svg" alt="">${m.label}</span>`;
  };
  PC.empty = (text = '暂无数据') => `<div class="empty"><div class="empty__ico"></div>${esc(text)}</div>`;
  PC.pager = (total, page, size, key = 'page', sizes = [10, 15, 20, 50]) => {
    const pages = Math.max(1, Math.ceil(total / size));
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return `<div class="pager" data-pager="${key}">
      <span>共 ${total} 条</span>
      <button class="pager__btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>
      ${nums.map(n => n === '…' ? '<span>…</span>' : `<button class="pager__btn ${n === page ? 'is-active' : ''}" data-page="${n}">${n}</button>`).join('')}
      <button class="pager__btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>›</button>
      <select class="select pager__size" data-size>${sizes.map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s}条/页</option>`).join('')}</select>
    </div>`;
  };
  PC.bindPager = (root, state, onChange) => {
    UI.delegate(root, 'click', '[data-pager] [data-page]', (e, el) => {
      const key = el.closest('[data-pager]').dataset.pager;
      state[key] = +el.dataset.page; onChange();
    });
    UI.delegate(root, 'change', '[data-pager] [data-size]', (e, el) => {
      const key = el.closest('[data-pager]').dataset.pager;
      state[key] = 1; state[key + 'Size'] = +el.value; onChange();
    });
  };
  PC.ADMIN_MENU = ADMIN_MENU;
})();
