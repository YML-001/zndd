/* 中南点点原型 · 管理端 */
(function () {
  const { esc, toast, imgSrc, avatar } = UI;
  const S = Store;
  const LXOPT = [['', '全部']].concat(S.LX.map(x => [x.value, x.label]));
  const ZT_CLS = { normal: 'normal', topped: 'topped', reported: 'reported', deleted: 'deleted' };
  const IC = {
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15l3-3 3 2 4-5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>',
    ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M8 8l8 8M16 8l-8 8"/></svg>',
    info: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#9096a2"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.5" stroke="#fff" stroke-width="2"/></svg>',
    search: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
  };
  const opts = (list, v) => list.map(([k, t]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${t}</option>`).join('');
  const fItem = (label, ctrl, cls = '') => `<label class="filter__item ${cls}"><span class="filter__label">${label}</span>${ctrl}</label>`;
  const page = (list, st, key = 'page') => list.slice((st[key] - 1) * st[key + 'Size'], st[key] * st[key + 'Size']);
  const statusTag = p => `<span class="status-tag status-tag--${ZT_CLS[p.ztbq]}">${S.ZTBQ[p.ztbq]}</span>`;
  function readFilter(root) {
    const f = {};
    root.querySelectorAll('[data-f]').forEach(i => { f[i.dataset.f] = i.value; });
    return f;
  }
  function download(name, rows) {
    const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- 数据概览 ---------- */
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  PC.pages['/bbs/admin/dashboard/index'] = {
    admin: true, title: '数据概览',
    init: () => ({ days: 7 }),
    render(st) {
      const d = S.dashboard(st.days);
      const m = d.metrics;
      const kpi = (tone, icon, title, val, go, sub = '') => `<div class="kpi-card kpi-card--${tone} kpi-card--click" data-go="${go}"><span class="kpi-card__blob"></span><span class="kpi-card__icon">${icon}</span>
        <div class="kpi-card__title">${title}${sub ? `<span class="kpi-card__sub">${sub}</span>` : ''}</div><div class="kpi-card__value">${val}</div></div>`;
      return `<div class="bbs-dash">
        <div class="kpi-panel"><div class="kpi-row">
          ${kpi('blue', IC.doc, '今日发帖数', d.todayPost, 'posts')}
          ${kpi('cyan', IC.trend, '风险帖子', d.riskPost, 'risk')}
          ${kpi('orange', IC.chat, '待部门回复', d.pendingReply, 'pending', '本周')}
          ${kpi('red', IC.ban, '封禁账号', d.bannedUser, 'banned')}
        </div></div>
        <div class="dash-body"><div class="dash-row">
          <div class="dash-chart">
            <div class="risk-card">
              <div class="risk-head">
                <div><h2 class="risk-head__title">风险帖分析</h2>
                  <div class="risk-legend"><span><i style="background:#3087cc"></i>三级风险(关注)</span><span><i style="background:#ff9800"></i>二级风险(预警)</span><span><i style="background:#f43f51"></i>一级风险(紧急)</span></div></div>
                <div class="risk-head__right"><select class="select" data-days>${opts([[7, '最近7天'], [30, '最近30天']], st.days)}</select><span class="risk-hint">${IC.info}数据每小时更新一次</span></div>
              </div>
              <div class="risk-chart" id="riskChart"></div>
              <div class="metric-strip">
                <div class="metric-card"><div><span class="metric-card__num">${m.maxDay}</span><span class="metric-card__unit">帖</span></div><div class="metric-card__sub">${m.maxDayDate}</div><span class="metric-card__tag metric-card__tag--blue">最高单日发帖</span></div>
                <div class="metric-card"><div><span class="metric-card__num">${m.interaction.toFixed(1)}</span><span class="metric-card__unit">次/帖</span></div><div class="metric-card__sub">近 7 日平均</div><span class="metric-card__tag metric-card__tag--orange">平均互动率</span></div>
                <div class="metric-card"><div><span class="metric-card__num">${m.riskHandle.toFixed(1)}</span><span class="metric-card__unit">%</span></div><div class="metric-card__sub">有风险帖已干预占比</div><span class="metric-card__tag metric-card__tag--red">风险处理率</span></div>
                <div class="metric-card"><div><span class="metric-card__num">${m.health.toFixed(1)}</span><span class="metric-card__unit">%</span></div><div class="metric-card__sub">${m.healthLabel}</div><span class="metric-card__tag metric-card__tag--green">内容健康度</span></div>
              </div>
            </div>
          </div>
          <div class="dash-side"><div class="side-card">
            <h3 class="side-card__head">热门板块TOP5</h3>
            <table class="hot-table"><thead><tr><th>排名</th><th>板块</th><th>数量</th></tr></thead><tbody>
              ${d.hotPlateTop5.length ? d.hotPlateTop5.map(x => `<tr><td><span class="rank-badge rank-badge--${x.rank}">${x.rank}</span></td><td>${x.plateName}</td><td>${x.count}帖</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center">暂无数据</td></tr>'}
            </tbody></table>
            <div class="dept-eff"><div class="dept-eff__title"><i></i>部门回复效率</div>
              ${d.deptEfficiency.length ? d.deptEfficiency.map(x => `<div class="dept-item"><span class="dept-item__name">${esc(x.bmmc)}</span><span class="dept-item__track"><span class="dept-item__fill" style="display:block;width:${x.pct}%"></span></span><span class="dept-item__avg">待回复 ${x.pending} 件</span></div>`).join('') : '<div class="dept-item" style="display:block;text-align:center;color:#9096a2">暂无待回复部门数据</div>'}
            </div>
          </div></div>
        </div></div>
      </div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'change', '[data-days]', (e, el) => { st.days = +el.value; PC.refresh(); });
      UI.delegate(root, 'click', '[data-go]', (e, el) => {
        const g = el.dataset.go;
        if (g === 'posts') PC.go('/bbs/admin/posts/index', { today: 1 });
        else if (g === 'risk') PC.go('/bbs/admin/risk-posts/index', { range: 'all' });
        else if (g === 'pending') PC.go('/bbs/admin/posts/index', { hfzt: 'pending' });
        else PC.go('/bbs/admin/users/index', { zt: 'banned' });
      });
    },
    mounted(root, st) {
      const el = root.querySelector('#riskChart');
      if (!el || !window.echarts) { if (el) el.innerHTML = '<div class="empty">图表组件加载失败（需联网加载 ECharts）</div>'; return; }
      const d = S.dashboard(st.days);
      const old = echarts.getInstanceByDom(el); if (old) old.dispose();
      const chart = echarts.init(el);
      const labels = d.labels.map(t => st.days === 7 ? '周' + WEEK[new Date(t).getDay()] : S.fmtDate(t).slice(5));
      const line = (name, data, color) => ({ name, type: 'line', data, smooth: true, symbol: 'emptyCircle', symbolSize: 7, itemStyle: { color }, lineStyle: { color, width: 2 } });
      chart.setOption({
        grid: { left: 40, right: 20, top: 24, bottom: 28 },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#c8cad1' } }, axisLabel: { color: '#627079' }, axisTick: { show: false } },
        yAxis: { type: 'value', minInterval: 1, max: v => Math.max(10, v.max), splitLine: { lineStyle: { color: '#eef1f4' } }, axisLabel: { color: '#627079' } },
        series: [line('三级风险(关注)', d.riskTrend7d.l3, '#3087cc'), line('二级风险(预警)', d.riskTrend7d.l2, '#ff9800'), line('一级风险(紧急)', d.riskTrend7d.l1, '#f43f51')]
      });
      if (!PC._resizeBound) { PC._resizeBound = true; window.addEventListener('resize', () => document.querySelectorAll('#riskChart').forEach(x => { const c = echarts.getInstanceByDom(x); if (c) c.resize(); })); }
    }
  };

  /* ---------- 帖子管理 ---------- */
  function openRealname(uid) {
    const u = S.user(uid) || {};
    UI.open({
      kind: 'dialog', title: '发帖人实名信息', width: '2.6rem',
      render: () => `<div class="info-grid">
        <div class="info-grid__cell"><b>真实姓名：</b>${esc(u.xm || '—')}</div><div class="info-grid__cell"><b>学号：</b>${esc(u.xh || '—')}</div>
        <div class="info-grid__cell"><b>学院：</b>${esc(u.bmmc || '—')}</div><div class="info-grid__cell"><b>年级：</b>${esc(u.nj || '—')}</div>
        <div class="info-grid__cell"><b>注册BBS时间：</b>${u.cjsj ? S.fmtDateTime(u.cjsj) : '—'}</div><div class="info-grid__cell"><b>联系电话：</b>${esc(u.sjhm || '—')}</div></div>
        <div class="dlg-foot"><button class="btn btn--primary" data-close>确定</button></div>`
    });
  }
  PC.openRealname = openRealname;
  function openReportHandle(tzid, result) {
    UI.open({
      kind: 'dialog', title: result === 'pass' ? '不违规' : '删除', width: '2.6rem',
      render: () => `<div class="form"><div class="form-item" style="flex-direction:column;gap:.03125rem"><span class="form-item__label" style="text-align:left;width:auto">回复举报人</span>
        <textarea class="textarea" rows="4" data-keep="clsm" placeholder="${result === 'pass' ? '经核实未违规，予以保留' : '违规成立 · 帖子已删除'}"></textarea></div></div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn ${result === 'pass' ? 'btn--primary' : 'btn--danger'}" data-ok>${result === 'pass' ? '确认回复并修改帖子为正常' : '立即删除'}</button></div>`,
      on: { 'click [data-ok]': (e, el, l) => { S.handleReports(tzid, result, l.body.querySelector('textarea').value.trim()); toast('已处理', 'success'); l.close(); } }
    });
  }
  function openEditPost(id) {
    const p = S.getPost(id);
    UI.open({
      kind: 'dialog', title: '编辑帖子', width: '3.2rem', state: { tps: p.tps.slice() },
      render: l => `<div class="form">
        <div class="form-item"><label class="form-item__label req">标题</label><div class="form-item__ctrl"><input class="input" data-keep="bt" maxlength="100" value="${esc(p.bt)}"></div></div>
        <div class="form-item"><label class="form-item__label req">内容</label><div class="form-item__ctrl"><textarea class="textarea" rows="6" data-keep="nr" maxlength="800">${esc(p.nr)}</textarea></div></div>
        <div class="form-item"><label class="form-item__label">图片</label><div class="form-item__ctrl">
          <div class="thumbs">${l.state.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" alt=""><button class="thumb__del" data-del="${i}" title="删除">×</button></div>`).join('')}</div>
          <button class="btn mt8" data-up ${l.state.tps.length >= 9 ? 'disabled' : ''}>上传图片（最多 9 张，单张不超过 10MB）</button></div></div></div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>保存</button></div>`,
      on: {
        'click [data-del]': (e, el, l) => { l.state.tps.splice(+el.dataset.del, 1); l.refresh(); },
        'click [data-up]': async (e, el, l) => { l.state.tps.push(...await UI.pickImages({ max: 9, existing: l.state.tps.length })); l.refresh(); },
        'click [data-ok]': (e, el, l) => {
          const bt = l.body.querySelector('[data-keep="bt"]').value, nr = l.body.querySelector('[data-keep="nr"]').value;
          if (!bt.trim() || !nr.trim()) { toast('请填写标题和内容', 'warning'); return; }
          S.updatePost(id, { bt, nr, tps: l.state.tps }); toast('已保存', 'success'); l.close();
        }
      }
    });
  }
  function openAdminPost(id) {
    UI.open({
      kind: 'dialog', cls: 'pd-dlg', head: false, state: { imgs: [] },
      render: l => {
        const p = S.getPost(id);
        if (!p) return '<div class="empty">帖子不存在或无法访问</div>';
        const reps = S.postReports(id);
        const pending = reps.filter(r => r.zt === 'pending');
        const tree = S.commentsTree(id);
        const st = { normal: ['#1ec997', '#1ec9971f'], topped: ['#ec9a35', '#fff2e5'], reported: ['#f43f51', '#fff0f2'], deleted: ['#9096a2', '#f4f4f5'] }[p.ztbq];
        const del = p.ztbq === 'deleted';
        return `<div class="pd"><div class="pd__scroll" data-keep-scroll="pd">
          <div class="pd__top"><img class="pd__illust" src="assets/pc/hero-illust.webp" alt=""><button class="pd__close" data-close>×</button>
            <div class="pd__hero"><div class="f-c" style="gap:.04167rem;flex-wrap:wrap"><h3 class="pd__hero-title">${esc(p.bt)}</h3>${p.ztbq === 'topped' ? '<span class="top-tag">置顶</span>' : ''}</div>
              <div class="pd__hero-user">${avatar(p, 'avatar--xs')}<span>${esc(p.fbrnc)}</span>${PC.lxTag(p.lx)}<span class="c-light">${p.tzbh}</span>${p.zdbmid ? `<span class="tag tag--blue">${esc(p.zdbmmc)} · ${p.hfzt === 'replied' ? '已回复' : '待回复'}</span>` : ''}</div></div>
            <div class="pd__panel"><div class="pd__body">${esc(p.nr)}</div>
              ${p.tps.length ? `<div class="pd__tps">${p.tps.map(t => `<img src="${esc(imgSrc(t))}" data-preview alt="">`).join('')}</div>` : ''}
              <div class="pd__meta"><span class="pd__status" style="--st:${st[0]};--st-bg:${st[1]}"><i></i>${S.ZTBQ[p.ztbq]}</span>
                <div class="pd__meta-right"><span title="浏览"><img src="assets/h5/icon-eye.svg" alt="">${p.llcs}</span><span title="点赞"><img src="assets/h5/icon-like.svg" alt="">${p.dzs}</span><span title="评论"><img src="assets/h5/icon-comment.svg" alt="">${p.pls}</span><span class="c-muted" style="font-weight:400">${S.fmtDateTime(p.fbsj)}</span></div></div></div>
          </div>
          ${p.voteInfo ? `<div class="pd__sec"><div class="pd__sec-head">投票信息<span class="underline-deco"></span></div>${(() => { try { return VoteUI.stats(S.voteDetail(id), { inAdmin: true }); } catch (err) { return `<p class="c-muted">${esc(err.message)}</p>`; } })()}</div>` : ''}
          ${reps.length ? `<div class="pd__sec"><div class="pd__sec-head">举报信息<span class="underline-deco"></span></div>
            ${reps.map(r => `<div class="pd__report-row">
              <div class="pd__report-cell"><span class="pd__report-label">举报人昵称</span><span class="pd__report-val">${esc((r.jbr || {}).nc || '匿名用户')}</span></div>
              <div class="pd__report-cell"><span class="pd__report-label">头像</span><span class="pd__report-val">${avatar(r.jbr, 'avatar--sm')}</span></div>
              <div class="pd__report-cell"><span class="pd__report-label">举报类型</span><span class="pd__report-val"><span class="pd__chip">${esc(r.jblx)}</span></span></div>
              <div class="pd__report-cell"><span class="pd__report-label">举报时间</span><span class="pd__report-val">${S.fmtDateTime(r.cjsj)}</span></div>
              <div class="pd__report-cell" style="flex-grow:1.6"><span class="pd__report-label">举报说明 / 处理</span><span class="pd__report-val">${esc(r.jbsm || '—')}${r.zt === 'done' ? `<span class="tag ${r.result === 'pass' ? 'tag--green' : 'tag--red'}" style="margin-left:.04167rem">${r.result === 'pass' ? '不违规' : '已删除'}</span>` : ''}</span></div>
            </div>`).join('')}</div>` : ''}
          <div class="pd__content">
            <div class="pdd__divider" style="margin-top:0"><i></i><span>${tree.reduce((n, x) => n + 1 + x.children.length, 0)}条评论</span><i></i></div>
            <div class="pdd__comments" style="padding:.04167rem 0">${tree.map(n => `<div class="cmt"><div class="cmt__author">${avatar(n.pl)}<div class="cmt__meta"><div class="cmt__top"><span class="cmt__name">${esc(n.pl.fbrnc)}</span>${n.pl.sfgfhf === '1' ? '<span class="cmt__tag cmt__tag--official">官方回复</span>' : n.pl.isAuthor ? '<span class="cmt__tag">作者</span>' : ''}</div><span class="cmt__sub">${S.relTime(n.pl.cjsj)}</span></div>
              <button class="btn-link btn-link--danger" style="margin-left:auto;font-size:.0625rem" data-del-cmt="${n.pl.id}">删除</button></div>
              <div class="cmt__content"><p class="cmt__text">${esc(n.pl.plnr)}</p>${n.pl.tps.length ? `<div class="cmt__imgs">${n.pl.tps.map(t => `<img src="${esc(imgSrc(t))}" data-preview alt="">`).join('')}</div>` : ''}</div>
              ${n.children.length ? `<div class="cmt__children"><div class="cmt__replies">${n.children.map(r => `<div class="cmt__reply"><span class="cmt__rname">${esc(r.fbrnc)}</span><span class="cmt__rword">回复</span><span class="cmt__rname">${esc(r.hfdxnc)}</span>：${esc(r.plnr)}<span class="cmt__rtime">${S.relTime(r.cjsj)}</span><button class="cmt__rlink c-danger" data-del-cmt="${r.id}">删除</button></div>`).join('')}</div></div>` : ''}
            </div>`).join('')}</div>
            <p class="pd__no-more">没有更多评论</p>
            ${del ? '' : `<div class="pdd__composer-box mt12"><textarea class="pdd__composer-input" rows="2" data-keep="admcmt" placeholder="写下你的评论…"></textarea>
              ${l.state.imgs.length ? `<div class="thumbs">${l.state.imgs.map((t, i) => `<div class="thumb"><img src="${esc(t)}" alt=""><button class="thumb__del" data-del-img="${i}">×</button></div>`).join('')}</div>` : ''}
              <div class="pdd__composer-foot"><button class="img-btn" data-add-img>图片</button><button class="send-btn" data-send>发布评论</button></div></div>`}
          </div></div>
          <div class="pd__footer">
            ${pending.length && !del ? '<button class="pd__btn pd__btn--pass" data-pass>不违规</button>' : ''}
            ${del ? '<span class="c-light" style="margin-right:auto;font-size:.07292rem">该贴已删除。</span>' : `<button class="pd__btn pd__btn--top" data-top>${p.ztbq === 'topped' ? '撤销置顶' : '置顶'}</button>
              <button class="pd__btn pd__btn--edit" data-edit>编辑</button><button class="pd__btn pd__btn--del" data-del>删除</button>`}
          </div></div>`;
      },
      on: {
        'click [data-preview]': (e, el) => UI.preview(el.src),
        'click [data-vote]': (e, el, l) => VoteUI.onCard(el, { state: l.state, refresh: () => l.refresh(), canInteract: () => true, openStats: () => {}, openPost: () => {} }),
        'click [data-realname]': (e, el) => openRealname(el.dataset.realname),
        'click [data-top]': () => { S.toggleTop(id); toast('已更新置顶状态', 'success'); },
        'click [data-edit]': () => openEditPost(id),
        'click [data-pass]': () => openReportHandle(id, 'pass'),
        'click [data-del]': () => {
          if (S.postReports(id).some(r => r.zt === 'pending')) openReportHandle(id, 'violation');
          else UI.confirm('确认删除该帖？', { ok: '确定', danger: true }).then(ok => { if (ok) { S.deletePost(id); toast('已删除', 'success'); } });
        },
        'click [data-del-cmt]': (e, el) => UI.confirm('确认删除该评论？').then(ok => { if (ok) { S.deleteComment(el.dataset.delCmt); toast('已删除', 'success'); } }),
        'click [data-add-img]': async (e, el, l) => { l.state.imgs.push(...await UI.pickImages({ max: 9, existing: l.state.imgs.length })); l.refresh(); },
        'click [data-del-img]': (e, el, l) => { l.state.imgs.splice(+el.dataset.delImg, 1); l.refresh(); },
        'click [data-send]': (e, el, l) => {
          const ta = l.body.querySelector('[data-keep="admcmt"]');
          const v = ta.value;
          if (!v.trim() && !l.state.imgs.length) { toast('请输入评论或添加图片', 'warning'); return; }
          ta.value = '';
          const imgs = l.state.imgs; l.state.imgs = [];
          try { S.addComment({ tzid: id, plnr: v, tps: imgs }); toast('已发布', 'success'); } catch (err) { ta.value = v; l.state.imgs = imgs; throw err; }
        }
      }
    });
  }
  PC.openAdminPost = openAdminPost;
  PC.pages['/bbs/admin/posts/index'] = {
    admin: true, title: '帖子管理',
    init: q => {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      return { f: { lx: '', ztbq: q.ztbq || '', hfzt: q.hfzt || '', vote: q.vote || '', bt: '', start: q.today ? S.fmtDate(t) : '', end: '' }, expand: !!q.today, page: 1, pageSize: 15 };
    },
    query(st) {
      const f = st.f;
      return S.adminPosts({ lx: f.lx, ztbq: f.ztbq, hfzt: f.hfzt, vote: f.vote, bt: f.bt, start: f.start ? new Date(f.start + 'T00:00:00').getTime() : 0, end: f.end ? new Date(f.end + 'T23:59:59').getTime() : 0 });
    },
    render(st) {
      const all = this.query(st), list = page(all, st), f = st.f;
      return `<div class="panel"><div class="filter">
          ${fItem('所属板块', `<select class="select" data-f="lx">${opts(LXOPT, f.lx)}</select>`)}
          ${fItem('当前状态', `<select class="select" data-f="ztbq">${opts([['', '全部'], ['normal', '正常'], ['topped', '已置顶'], ['reported', '被举报'], ['deleted', '已删除']], f.ztbq)}</select>`)}
          ${fItem('回复状态', `<select class="select" data-f="hfzt">${opts([['', '全部'], ['pending', '待回复'], ['replied', '已回复']], f.hfzt)}</select>`)}
          ${fItem('是否含投票', `<select class="select" data-f="vote">${opts([['', '全部'], ['yes', '含投票'], ['active', '投票进行中'], ['no', '不含投票']], f.vote)}</select>`)}
          ${st.expand ? fItem('帖子标题', `<input class="input" data-f="bt" placeholder="请输入" value="${esc(f.bt)}">`) + fItem('创建时间', `<input class="input" type="date" data-f="start" value="${f.start}"><span class="filter__sep">-</span><input class="input" type="date" data-f="end" value="${f.end}">`, 'filter__item--wide') : ''}
          <div class="filter__ops"><button class="filter__toggle" data-act="expand">${st.expand ? '收起' : '展开'}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${st.expand ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}"/></svg></button>
            <button class="btn btn--primary" data-act="query">${IC.search}立即查询</button><button class="btn btn--plain" data-act="reset">重置</button></div>
        </div></div>
        <div class="panel panel--grow"><div class="table-wrap"><table class="table table--admin">
          <thead><tr><th>序号</th><th>帖子Id</th><th>帖子标题</th><th>发帖人</th><th>实名信息</th><th>所属板块</th><th>所属部门</th><th>官方回复</th><th>状态</th><th>投票</th><th>数据</th><th>创建时间</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>${list.length ? list.map((p, i) => `<tr>
            <td>${(st.page - 1) * st.pageSize + i + 1}</td><td>${p.tzbh}</td><td><div class="ellipsis" style="max-width:1.25rem" title="${esc(p.bt)}">${esc(p.bt)}</div></td>
            <td><div class="ellipsis" style="max-width:.6rem">${esc(p.fbrnc)}</div></td><td><button class="btn-link" data-real="${p.fbrid}">查看</button></td>
            <td><span class="status-tag status-tag--gray">${p.lxLabel}</span></td><td>${p.zdbmid ? esc(p.zdbmmc) : '—'}</td>
            <td><span class="status-tag ${p.sfgfhf === '1' ? 'status-tag--normal' : 'status-tag--gray'}">${p.sfgfhf === '1' ? '是' : '否'}</span></td>
            <td>${statusTag(p)}</td>
            <td style="white-space:nowrap">${p.voteInfo ? `<button class="btn-link" data-detail="${p.id}" title="${esc(p.voteInfo.title)}">${p.voteInfo.total} 人参与</button> <span class="status-tag ${p.voteInfo.ended ? 'status-tag--gray' : 'status-tag--normal'}">${p.voteInfo.ended ? '已结束' : '进行中'}</span>` : '—'}</td>
            <td style="white-space:nowrap">浏览：${p.llcs}｜回复：${p.pls}</td><td style="white-space:nowrap">${S.fmtDateTime(p.fbsj)}</td>
            <td class="col-fixed"><div class="ops"><button class="btn-link" data-detail="${p.id}">详情</button>${p.ztbq !== 'deleted' ? `<button class="btn-link btn-link--danger" data-del="${p.id}">删除</button>` : ''}</div></td>
          </tr>`).join('') : '<tr class="table__empty"><td colspan="13">暂无数据</td></tr>'}</tbody></table></div>
          ${PC.pager(all.length, st.page, st.pageSize, 'page', [10, 15, 20, 50])}</div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'expand') { st.f = Object.assign(st.f, readFilter(root)); st.expand = !st.expand; PC.refresh(); }
        else if (a === 'query') { st.f = Object.assign(st.f, readFilter(root)); st.page = 1; PC.refresh(); }
        else if (a === 'reset') { st.f = { lx: '', ztbq: '', hfzt: '', vote: '', bt: '', start: '', end: '' }; st.page = 1; PC.refresh(); }
      });
      UI.delegate(root, 'click', '[data-real]', (e, el) => openRealname(el.dataset.real));
      UI.delegate(root, 'click', '[data-detail]', (e, el) => openAdminPost(el.dataset.detail));
      UI.delegate(root, 'click', '[data-del]', (e, el) => UI.confirm('确认删除该帖？', { danger: true }).then(ok => { if (ok) { S.deletePost(el.dataset.del); toast('已删除', 'success'); } }));
      PC.bindPager(root, st, PC.refresh);
    }
  };

  /* ---------- 用户管理 ---------- */
  function openBan(uid) {
    const u = S.user(uid);
    UI.open({
      kind: 'dialog', title: '封禁用户', width: '2.8rem', state: { reason: '', days: '' },
      render: l => `<div class="info-grid" style="margin-bottom:.08333rem"><div class="info-grid__cell"><b>昵称：</b>${esc(u.nc)}</div><div class="info-grid__cell"><b>学号/工号：</b>${esc(u.xh)}</div><div class="info-grid__cell info-grid__cell--full"><b>部门/年级：</b>${esc(u.bmmc)} ${esc(u.nj || '')}</div></div>
        <div class="form">
          <div class="form-item"><label class="form-item__label req">封禁原因</label><div class="form-item__ctrl radio-group">${S.BAN_REASONS.map(r => `<label class="radio"><input type="radio" name="ban-r" value="${r}" ${l.state.reason === r ? 'checked' : ''}>${r}</label>`).join('')}</div></div>
          <div class="form-item"><label class="form-item__label req">封禁时长</label><div class="form-item__ctrl radio-group">${S.BAN_DURATIONS.map(r => `<label class="radio"><input type="radio" name="ban-d" value="${r.value}" ${String(l.state.days) === String(r.value) ? 'checked' : ''}>${r.label}</label>`).join('')}</div></div>
          <div class="form-item"><label class="form-item__label">备注说明</label><div class="form-item__ctrl"><textarea class="textarea" rows="3" data-keep="note" placeholder="请输入"></textarea></div></div>
          <div class="form-item"><span class="form-item__label"></span><label class="check"><input type="checkbox" data-keep="purge-chk">同时删除该用户发布的所有帖子及评论</label></div>
        </div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--danger" data-ok>确定</button></div>`,
      on: {
        'change input[name="ban-r"]': (e, el, l) => { l.state.reason = el.value; },
        'change input[name="ban-d"]': (e, el, l) => { l.state.days = +el.value; },
        'click [data-ok]': (e, el, l) => {
          if (!l.state.reason) { toast('请选择封禁原因', 'warning'); return; }
          if (!l.state.days) { toast('请选择封禁时长', 'warning'); return; }
          S.banUser(uid, { reason: l.state.reason, days: l.state.days, note: l.body.querySelector('textarea').value, purge: l.body.querySelector('[type=checkbox]').checked });
          toast('已封禁', 'success'); l.close();
        }
      }
    });
  }
  function openCertify(uid) {
    const u = S.user(uid);
    UI.open({
      kind: 'dialog', title: '认证', width: '2.6rem',
      render: () => `<div class="form"><div class="form-item"><label class="form-item__label">认证部门</label><div class="form-item__ctrl">
        <select class="select" data-dept><option value="">请选择：选「无」或清空则取消认证</option>${S.db.depts.filter(d => d.zt === '1').sort((a, b) => a.px - b.px).map(d => `<option value="${d.bmmc === '无' ? '' : d.id}" ${u.rzbmid === d.id ? 'selected' : ''}>${esc(d.bmmc)}</option>`).join('')}</select>
        <div class="form-item__hint">提示：认证部门选择「无」或清空，则取消官方认证标识</div></div></div></div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`,
      on: { 'click [data-ok]': (e, el, l) => { const v = l.body.querySelector('[data-dept]').value; S.certifyUser(uid, v); toast(v ? '已更新认证' : '已设为未认证', 'success'); l.close(); } }
    });
  }
  PC.pages['/bbs/admin/users/index'] = {
    admin: true, title: '用户管理',
    init: q => ({ f: { nc: '', xm: '', xh: '', bm: '', zt: q.zt || '', sfgf: '' }, page: 1, pageSize: 15 }),
    render(st) {
      const f = st.f, all = S.adminUsers(f), list = page(all, st);
      return `<div class="panel"><div class="filter">
          ${fItem('用户昵称', `<input class="input" data-f="nc" placeholder="请输入" value="${esc(f.nc)}">`)}
          ${fItem('真实姓名', `<input class="input" data-f="xm" placeholder="请输入" value="${esc(f.xm)}">`)}
          ${fItem('学工/工号', `<input class="input" data-f="xh" placeholder="请输入" value="${esc(f.xh)}">`)}
          ${fItem('所在年级/部门', `<input class="input" data-f="bm" placeholder="请输入" value="${esc(f.bm)}">`)}
          ${fItem('当前状态', `<select class="select" data-f="zt">${opts([['', '请选择'], ['normal', '正常'], ['banned', '封禁']], f.zt)}</select>`)}
          ${fItem('官方认证', `<select class="select" data-f="sfgf">${opts([['', '请选择'], ['1', '已认证'], ['0', '未认证']], f.sfgf)}</select>`)}
          <div class="filter__ops"><button class="btn btn--primary" data-act="query">立即查询</button><button class="btn btn--plain" data-act="reset">重置</button></div>
        </div></div>
        <div class="panel panel--grow"><div class="table-wrap"><table class="table table--admin">
          <thead><tr><th>序号</th><th>用户昵称</th><th>真实姓名</th><th>真实学号/工号</th><th>所在部门/年级</th><th>状态</th><th>官方认证</th><th>数据</th><th>注册时间</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>${list.length ? list.map((u, i) => `<tr>
            <td>${(st.page - 1) * st.pageSize + i + 1}</td><td>${esc(u.nc)}</td><td>${esc(u.xm)}</td><td>${esc(u.xh)}</td><td>${esc(u.bmmc)}${u.nj ? ' / ' + esc(u.nj) : ''}</td>
            <td>${u.banned ? `<span class="status-tag status-tag--reported" title="${esc(u.fjyy || '')}">封禁中</span>` : '<span class="status-tag status-tag--normal">正常</span>'}</td>
            <td>${u.sfgf === '1' ? `<span class="status-tag status-tag--blue">${esc(u.rzbmmc)}</span>` : '<span class="status-tag status-tag--gray">未认证</span>'}</td>
            <td style="white-space:nowrap">发帖：${u.ftzsl}｜回复：${u.hfsl}</td><td style="white-space:nowrap">${S.fmtDateTime(u.cjsj)}</td>
            <td class="col-fixed"><div class="ops">${u.banned ? `<button class="btn-link btn-link--success" data-unban="${u.id}">解封</button>` : `<button class="btn-link btn-link--danger" data-ban="${u.id}" ${u.id === S.me().id ? 'disabled title="不能封禁当前登录账号"' : ''}>封禁</button>`}<button class="btn-link" data-cert="${u.id}">认证</button></div></td>
          </tr>`).join('') : '<tr class="table__empty"><td colspan="10">暂无数据</td></tr>'}</tbody></table></div>
          ${PC.pager(all.length, st.page, st.pageSize)}</div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        if (el.dataset.act === 'query') st.f = readFilter(root);
        else st.f = { nc: '', xm: '', xh: '', bm: '', zt: '', sfgf: '' };
        st.page = 1; PC.refresh();
      });
      UI.delegate(root, 'click', '[data-ban]', (e, el) => openBan(el.dataset.ban));
      UI.delegate(root, 'click', '[data-unban]', (e, el) => UI.confirm('确认解除该用户的封禁？').then(ok => { if (ok) { S.unbanUser(el.dataset.unban); toast('已解封', 'success'); } }));
      UI.delegate(root, 'click', '[data-cert]', (e, el) => openCertify(el.dataset.cert));
      PC.bindPager(root, st, PC.refresh);
    }
  };

  /* ---------- 部门管理 ---------- */
  function openDept(id) {
    const d = id ? S.dept(id) : { bmmc: '', fzrgh: '', bmlxr: '', hflsxs: 48, px: 0, zt: '1' };
    UI.open({
      kind: 'dialog', title: id ? '编辑部门' : '新增部门', width: '2.8rem', state: { zt: d.zt },
      render: l => `<div class="form">
        <div class="form-item"><label class="form-item__label req">部门名称</label><div class="form-item__ctrl"><input class="input" data-k="bmmc" data-keep="bmmc" maxlength="30" placeholder="请输入部门名称" value="${esc(d.bmmc)}"></div></div>
        <div class="form-item"><label class="form-item__label">负责人工号</label><div class="form-item__ctrl"><input class="input" data-k="fzrgh" data-keep="fzrgh" placeholder="用于话题管理数据范围" value="${esc(d.fzrgh)}"></div></div>
        <div class="form-item"><label class="form-item__label">联系人/电话</label><div class="form-item__ctrl"><input class="input" data-k="bmlxr" data-keep="bmlxr" placeholder="选填" value="${esc(d.bmlxr)}"></div></div>
        <div class="form-item"><label class="form-item__label req">回复时限</label><div class="form-item__ctrl f-c" style="gap:.04167rem"><input class="input" type="number" min="1" data-k="hflsxs" data-keep="hflsxs" placeholder="请输入回复时限" value="${d.hflsxs}" style="width:1rem">小时</div></div>
        <div class="form-item"><label class="form-item__label">排序号</label><div class="form-item__ctrl f-c" style="gap:.04167rem"><input class="input" type="number" data-k="px" data-keep="px" value="${d.px}" style="width:1rem"><span class="c-light">越小越靠前</span></div></div>
        <div class="form-item"><label class="form-item__label">状态</label><div class="form-item__ctrl radio-group" style="height:.16667rem;align-items:center">${[['1', '有效'], ['0', '无效']].map(([v, t]) => `<label class="radio"><input type="radio" name="dzt" value="${v}" ${l.state.zt === v ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
      </div><div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`,
      on: {
        'change [name="dzt"]': (e, el, l) => { l.state.zt = el.value; },
        'click [data-ok]': (e, el, l) => {
          const v = { id }; l.body.querySelectorAll('[data-k]').forEach(i => { v[i.dataset.k] = i.value; });
          v.zt = l.state.zt;
          if (!v.bmmc.trim()) { toast('请输入部门名称', 'warning'); return; }
          if (!v.hflsxs) { toast('请输入回复时限', 'warning'); return; }
          if (!id) delete v.id;
          S.saveDept(v); toast(id ? '保存成功' : '新增成功', 'success'); l.close();
        }
      }
    });
  }
  PC.pages['/bbs/admin/departments/index'] = {
    admin: true, title: '部门管理',
    init: () => ({ f: { bmmc: '', zt: '' }, page: 1, pageSize: 15 }),
    render(st) {
      const f = st.f;
      const all = S.db.depts.filter(d => (!f.bmmc || d.bmmc.includes(f.bmmc.trim())) && (!f.zt || d.zt === f.zt)).sort((a, b) => a.px - b.px);
      const list = page(all, st);
      return `<div class="panel"><div class="filter">
          ${fItem('部门名称', `<input class="input" data-f="bmmc" placeholder="请输入" value="${esc(f.bmmc)}">`)}
          ${fItem('状态', `<select class="select" data-f="zt">${opts([['', '全部'], ['1', '有效'], ['0', '无效']], f.zt)}</select>`)}
          <div class="filter__ops"><button class="btn btn--primary" data-act="query">立即查询</button><button class="btn btn--plain" data-act="reset">重置</button><button class="btn btn--primary" data-act="add">新增部门</button></div>
        </div></div>
        <div class="panel panel--grow"><div class="table-wrap"><table class="table table--admin">
          <thead><tr><th>序号</th><th>部门名称</th><th>负责人工号</th><th>联系人/电话</th><th>回复时限(小时)</th><th>排序</th><th>状态</th><th>创建时间</th><th>更新时间</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>${list.length ? list.map((d, i) => `<tr><td>${(st.page - 1) * st.pageSize + i + 1}</td><td>${esc(d.bmmc)}</td><td>${esc(d.fzrgh || '—')}</td><td>${esc(d.bmlxr || '—')}</td><td>${d.hflsxs}</td><td>${d.px}</td>
            <td><span class="status-tag ${d.zt === '1' ? 'status-tag--normal' : 'status-tag--gray'}">${d.zt === '1' ? '有效' : '无效'}</span></td><td>${S.fmtDateTime(d.cjsj)}</td><td>${S.fmtDateTime(d.gxsj)}</td>
            <td class="col-fixed"><div class="ops"><button class="btn-link" data-edit="${d.id}">编辑</button><button class="btn-link btn-link--danger" data-del="${d.id}">删除</button></div></td></tr>`).join('') : '<tr class="table__empty"><td colspan="10">暂无数据</td></tr>'}</tbody></table></div>
          ${PC.pager(all.length, st.page, st.pageSize)}</div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'add') { openDept(); return; }
        st.f = a === 'query' ? readFilter(root) : { bmmc: '', zt: '' }; st.page = 1; PC.refresh();
      });
      UI.delegate(root, 'click', '[data-edit]', (e, el) => openDept(el.dataset.edit));
      UI.delegate(root, 'click', '[data-del]', (e, el) => {
        const d = S.dept(el.dataset.del);
        UI.confirm(`确认删除部门「${d.bmmc}」？删除后前台将不再展示该部门。`, { danger: true }).then(ok => { if (ok) { S.deleteDept(d.id); toast('已删除', 'success'); } });
      });
      PC.bindPager(root, st, PC.refresh);
    }
  };

  /* ---------- 话题管理 ---------- */
  function openTopic(id) {
    const managed = S.managedDepts();
    if (!managed.length) { toast('当前账号未配置为任何部门的负责人，无法管理话题', 'warning'); return; }
    const t = id ? S.db.topics.find(x => x.id === id) : { htmc: '', htbh: '', zdbmid: '', px: 0, zt: '1' };
    UI.open({
      kind: 'dialog', title: id ? '编辑话题' : '新增话题', width: '2.8rem', state: { zt: t.zt },
      render: l => `<div class="form">
        <div class="form-item"><label class="form-item__label req">话题名称</label><div class="form-item__ctrl"><input class="input" data-k="htmc" data-keep="htmc" placeholder="如：食堂" value="${esc(t.htmc)}"></div></div>
        <div class="form-item"><label class="form-item__label req">话题编码</label><div class="form-item__ctrl"><input class="input" data-k="htbh" data-keep="htbh" placeholder="英文编码，写入帖子 ht 字段" value="${esc(t.htbh)}"></div></div>
        <div class="form-item"><label class="form-item__label req">所属部门</label><div class="form-item__ctrl"><select class="select" data-k="zdbmid"><option value="">请选择部门</option>${managed.map(d => `<option value="${d.id}" ${t.zdbmid === d.id ? 'selected' : ''}>${esc(d.bmmc)}</option>`).join('')}</select></div></div>
        <div class="form-item"><label class="form-item__label">排序号</label><div class="form-item__ctrl"><input class="input" type="number" data-k="px" data-keep="px" value="${t.px}" style="width:1rem"></div></div>
        <div class="form-item"><label class="form-item__label">状态</label><div class="form-item__ctrl radio-group" style="height:.16667rem;align-items:center">${[['1', '有效'], ['0', '无效']].map(([v, x]) => `<label class="radio"><input type="radio" name="tzt" value="${v}" ${l.state.zt === v ? 'checked' : ''}>${x}</label>`).join('')}</div></div>
      </div><div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`,
      on: {
        'change [name="tzt"]': (e, el, l) => { l.state.zt = el.value; },
        'click [data-ok]': (e, el, l) => {
          const v = {}; l.body.querySelectorAll('[data-k]').forEach(i => { v[i.dataset.k] = i.value.trim(); });
          if (!v.htmc) { toast('请输入话题名称', 'warning'); return; }
          if (!v.htbh) { toast('请输入话题编码', 'warning'); return; }
          if (!v.zdbmid) { toast('请选择所属部门', 'warning'); return; }
          v.zt = l.state.zt; if (id) v.id = id;
          S.saveTopic(v); toast(id ? '保存成功' : '新增成功', 'success'); l.close();
        }
      }
    });
  }
  PC.pages['/bbs/admin/topics/index'] = {
    admin: true, title: '话题管理',
    init: () => ({ f: { kw: '', zdbmid: '', zt: '' }, page: 1, pageSize: 15 }),
    render(st) {
      const managed = S.managedDepts();
      const all = S.adminTopics(st.f), list = page(all, st), f = st.f;
      return `${managed.length ? '' : '<div class="warn-bar">⚠ 当前登录账号未匹配任何部门的负责人工号，列表为空。请先在「部门管理」中配置负责人工号。</div>'}
        <div class="panel"><div class="filter">
          ${fItem('话题名称', `<input class="input" data-f="kw" placeholder="名称或编码" value="${esc(f.kw)}">`)}
          ${fItem('所属部门', `<select class="select" data-f="zdbmid">${opts([['', '全部']].concat(managed.map(d => [d.id, esc(d.bmmc)])), f.zdbmid)}</select>`)}
          ${fItem('状态', `<select class="select" data-f="zt">${opts([['', '全部'], ['1', '有效'], ['0', '无效']], f.zt)}</select>`)}
          <div class="filter__ops"><button class="btn btn--primary" data-act="query">立即查询</button><button class="btn btn--plain" data-act="reset">重置</button><button class="btn btn--primary" data-act="add">新增话题</button></div>
        </div></div>
        <div class="panel panel--grow"><div class="table-wrap"><table class="table table--admin">
          <thead><tr><th>序号</th><th>话题名称</th><th>话题编码</th><th>所属部门</th><th>排序</th><th>状态</th><th>创建时间</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>${list.length ? list.map((t, i) => `<tr><td>${(st.page - 1) * st.pageSize + i + 1}</td><td>${esc(t.htmc)}</td><td>${esc(t.htbh)}</td><td>${esc(t.bmmc || '—')}</td><td>${t.px}</td>
            <td><span class="status-tag ${t.zt === '1' ? 'status-tag--normal' : 'status-tag--gray'}">${t.zt === '1' ? '有效' : '无效'}</span></td><td>${S.fmtDateTime(t.cjsj)}</td>
            <td class="col-fixed"><div class="ops"><button class="btn-link" data-edit="${t.id}">编辑</button><button class="btn-link btn-link--danger" data-del="${t.id}">删除</button></div></td></tr>`).join('') : '<tr class="table__empty"><td colspan="8">暂无数据</td></tr>'}</tbody></table></div>
          ${PC.pager(all.length, st.page, st.pageSize)}</div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'add') { openTopic(); return; }
        st.f = a === 'query' ? readFilter(root) : { kw: '', zdbmid: '', zt: '' }; st.page = 1; PC.refresh();
      });
      UI.delegate(root, 'click', '[data-edit]', (e, el) => openTopic(el.dataset.edit));
      UI.delegate(root, 'click', '[data-del]', (e, el) => {
        const t = S.db.topics.find(x => x.id === el.dataset.del);
        UI.confirm(`确认删除话题「${t.htmc}」？`, { danger: true }).then(ok => { if (ok) { S.deleteTopic(t.id); toast('已删除', 'success'); } });
      });
      PC.bindPager(root, st, PC.refresh);
    }
  };

  /* ---------- 高风险帖子 ---------- */
  const RISK_SHORT = { 1: '一级', 2: '二级', 3: '三级' };
  function highlight(text, kws) {
    let s = esc(text);
    (kws || '').split(',').filter(Boolean).forEach(k => { s = s.split(esc(k)).join(`<span class="kw-hl">${esc(k)}</span>`); });
    return s;
  }
  function openRiskDetail(id) {
    UI.open({
      kind: 'dialog', cls: 'risk-dlg', title: '帖子详情',
      render: () => {
        const p = S.riskPosts('all').find(x => x.id === id) || S.getPost(id);
        const u = S.user(p.fbrid) || {};
        return `<div class="info-grid">
          <div class="info-grid__cell"><b>帖子ID</b>${p.tzbh}</div><div class="info-grid__cell"><b>发布模块</b>${p.lxLabel}</div>
          <div class="info-grid__cell"><b>风险等级</b><span class="risk-tag risk-tag--${p.fxdj}">${S.RISK_LEVELS[p.fxdj] || '—'}</span></div><div class="info-grid__cell"><b>核心关键词</b><span class="c-danger">${esc(p.fxgjcs || '—')}</span></div>
          <div class="info-grid__cell info-grid__cell--full"><b>发布时间</b>${S.fmtDateTime(p.fbsj)}</div></div>
          <div class="sec-title">帖子内容</div><div class="risk-content"><b>${highlight(p.bt, p.fxgjcs)}</b>\n${highlight(p.nr, p.fxgjcs)}</div>
          <div class="sec-title">实名信息</div><div class="info-grid">
            <div class="info-grid__cell"><b>真实姓名：</b>${esc(u.xm)}</div><div class="info-grid__cell"><b>学号：</b>${esc(u.xh)}</div>
            <div class="info-grid__cell"><b>学院：</b>${esc(u.bmmc)}</div><div class="info-grid__cell"><b>联系方式：</b>${esc(u.sjhm)}</div>
            <div class="info-grid__cell"><b>辅导员：</b>${esc(u.fdy || '—')}</div><div class="info-grid__cell"><b>辅导员电话：</b>${esc(u.fdydh || '—')}</div>
            <div class="info-grid__cell"><b>班导师：</b>${esc(u.bds || '—')}</div><div class="info-grid__cell"><b>班导师电话：</b>${esc(u.bdsdh || '—')}</div></div>
          <div class="dlg-foot"><button class="btn" data-close>关闭</button><button class="btn btn--primary" data-iv>记录干预过程</button></div>`;
      },
      on: { 'click [data-iv]': (e, el, l) => { l.close(); openIntervention(id); } }
    });
  }
  function openIvForm(tzid, rec) {
    UI.open({
      kind: 'dialog', title: rec ? '编辑干预记录' : '新增干预记录', width: '2.6rem', state: { lxry: rec ? rec.lxry.slice() : [] },
      render: l => `<div class="form">
        <div class="form-item"><label class="form-item__label req">联系人员</label><div class="form-item__ctrl check-group" style="height:.16667rem;align-items:center">${['辅导员', '班导师'].map(x => `<label class="check"><input type="checkbox" value="${x}" ${l.state.lxry.includes(x) ? 'checked' : ''}>${x}</label>`).join('')}<span class="c-light" style="font-size:.0625rem">请选择（可多选）</span></div></div>
        <div class="form-item"><label class="form-item__label req">处理结果</label><div class="form-item__ctrl"><textarea class="textarea" rows="4" data-keep="cljg" placeholder="请填写处理结果">${rec ? esc(rec.cljg) : ''}</textarea></div></div>
      </div><div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`,
      on: {
        'change [type=checkbox]': (e, el, l) => { l.state.lxry = [...l.body.querySelectorAll('[type=checkbox]:checked')].map(i => i.value); },
        'click [data-ok]': (e, el, l) => {
          const cljg = l.body.querySelector('textarea').value;
          if (!l.state.lxry.length) { toast('请选择联系人员', 'warning'); return; }
          if (!cljg.trim()) { toast('请填写处理结果', 'warning'); return; }
          S.saveIntervention(Object.assign({ tzid, lxry: l.state.lxry, cljg: cljg.trim() }, rec ? { id: rec.id } : {}));
          toast(rec ? '已更新' : '已保存', 'success'); l.close();
        }
      }
    });
  }
  function openIntervention(tzid) {
    const p = S.getPost(tzid);
    UI.open({
      kind: 'dialog', cls: 'iv-dlg', title: '记录干预过程',
      render: () => {
        const list = S.interventions(tzid);
        return `<div class="toolbar" style="margin-bottom:.0625rem"><span class="c-muted">帖子ID：${p.tzbh} · ${esc(p.bt)}</span>
          <div class="toolbar__ops"><button class="btn btn--primary" data-add>新增干预记录</button><button class="btn btn--plain" data-msg title="向发帖人发送站内私信">发送消息提醒</button></div></div>
          <div class="table-wrap"><table class="table table--admin"><thead><tr><th>序号</th><th>记录ID</th><th>帖子ID</th><th>干预时间</th><th>干预人</th><th>部门/岗位</th><th>联系人员</th><th>处理结果</th><th>操作</th></tr></thead>
          <tbody>${list.length ? list.map((x, i) => `<tr><td>${i + 1}</td><td>${x.id.slice(3, 11).toUpperCase()}</td><td>${p.tzbh}</td><td>${S.fmtDateTime(x.gysj)}</td><td>${esc(x.gyr)}</td><td>${esc(x.bmgw)}</td><td>${x.lxry.join('、')}</td><td><div class="ellipsis" style="max-width:1rem" title="${esc(x.cljg)}">${esc(x.cljg)}</div></td>
            <td><div class="ops"><button class="btn-link" data-edit="${x.id}">编辑</button><button class="btn-link btn-link--danger" data-del="${x.id}">删除</button></div></td></tr>`).join('') : '<tr class="table__empty"><td colspan="9">暂无数据</td></tr>'}</tbody></table></div>`;
      },
      on: {
        'click [data-add]': () => openIvForm(tzid),
        'click [data-edit]': (e, el) => openIvForm(tzid, S.interventions(tzid).find(x => x.id === el.dataset.edit)),
        'click [data-del]': (e, el) => UI.confirm('确定删除该条干预记录？', { title: '提示', ok: '删除', danger: true }).then(ok => { if (ok) { S.deleteIntervention(el.dataset.del); toast('已删除', 'success'); } }),
        'click [data-msg]': () => {
          if (!p.fbrid) { toast('该帖缺少发帖人信息，无法发送私信', 'error'); return; }
          UI.open({
            kind: 'dialog', title: '发送消息提醒', width: '2.6rem',
            render: () => `<p class="c-muted" style="margin:0 0 .05208rem">将向发帖人发送一条站内私信（BBS 私信）。</p><textarea class="textarea" rows="4" data-keep="tx" placeholder="请输入提醒内容"></textarea>
              <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-send>发送</button></div>`,
            on: { 'click [data-send]': (e, el, l) => { const v = l.body.querySelector('textarea').value; if (!v.trim()) { toast('请输入提醒内容', 'warning'); return; } S.sendMessage(p.fbrid, v); toast('消息已发送', 'success'); l.close(); } }
          });
        }
      }
    });
  }
  function aiAnswer(q, checked) {
    const all = S.riskPosts('7d');
    if (q.includes('一级')) {
      const l1 = all.filter(p => p.fxdj === 1);
      return l1.length ? `近 7 天共有 ${l1.length} 条一级风险帖子。建议：\n1. 30 分钟内联系发帖人所在学院辅导员，当面了解情况；\n2. 同步心理健康教育中心，评估是否需要危机干预；\n3. 在「记录干预过程」中留痕，持续跟踪 72 小时。` : '近 7 天暂无一级风险帖子。建议保持日常巡查，关注二级预警帖子的情绪变化。';
    }
    if (q.includes('辅导') || q.includes('选中')) {
      if (!checked) return '请先在上方表格中勾选一条风险帖子，再提问。';
      const u = S.user(checked.fbrid) || {};
      return `所选帖子「${checked.bt}」命中关键词：${checked.fxgjcs}（${S.RISK_LEVELS[checked.fxdj]}）。\n问题分析：发帖人情绪表达集中在${checked.fxdj <= 2 ? '个人压力与心理状态' : '公共服务诉求'}方面。\n辅导建议：由辅导员${u.fdy || ''}以关心为主进行沟通，避免直接引用帖子原文；${checked.fxdj <= 2 ? '必要时转介心理中心。' : '协调相关职能部门尽快回应诉求。'}`;
    }
    const by = { 1: 0, 2: 0, 3: 0 };
    all.forEach(p => { by[p.fxdj]++; });
    const words = {};
    all.forEach(p => p.fxgjcs.split(',').forEach(w => { if (w) words[w] = (words[w] || 0) + 1; }));
    const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join('、') || '暂无';
    return `近一周共识别风险帖子 ${all.length} 条：一级 ${by[1]} 条、二级 ${by[2]} 条、三级 ${by[3]} 条。\n高频关键词：${top}。\n主要问题集中在学业压力、生活服务诉求两类，建议优先处理一级、二级帖子，三级帖子转相关部门回复。`;
  }
  PC.pages['/bbs/admin/risk-posts/index'] = {
    admin: true, title: '高风险帖子', menu: '/bbs/admin/dashboard/index',
    init: q => ({ range: q.range || '24h', checked: [], page: 1, pageSize: 15, msgs: [{ bot: true, intro: true }], typing: false }),
    render(st) {
      const all = S.riskPosts(st.range), list = page(all, st);
      return `<div class="panel"><div class="toolbar">
          ${fItem('时间范围', `<select class="select" data-range style="width:1rem">${opts([['24h', '24小时'], ['7d', '近7天'], ['all', '全部']], st.range)}</select>`)}
          <div class="toolbar__ops"><button class="btn btn--plain" data-act="ext">站外舆情</button><button class="btn btn--plain" data-act="refresh">刷新</button><button class="btn btn--plain" data-act="iv">干预记录</button><button class="btn btn--plain" data-act="dl">下载</button></div>
        </div></div>
        <div class="panel panel--grow" style="min-height:2.2rem"><div class="table-wrap"><table class="table table--admin">
          <thead><tr><th class="col-chk"><input type="checkbox" data-chk-all ${list.length && list.every(p => st.checked.includes(p.id)) ? 'checked' : ''}></th><th>序号</th><th>帖子Id</th><th>发布模块</th><th>风险等级</th><th>核心关键词</th><th>发布时间</th><th>干预</th><th class="col-fixed">操作</th></tr></thead>
          <tbody>${list.length ? list.map((p, i) => `<tr><td class="col-chk"><input type="checkbox" data-chk="${p.id}" ${st.checked.includes(p.id) ? 'checked' : ''}></td>
            <td>${(st.page - 1) * st.pageSize + i + 1}</td><td>${p.tzbh}</td><td>${p.lxLabel}</td><td><span class="risk-tag risk-tag--${p.fxdj}">${RISK_SHORT[p.fxdj]}</span></td>
            <td class="c-danger">${esc(p.fxgjcs)}</td><td>${S.fmtDateTime(p.fbsj)}</td><td>${p.interventions ? `<span class="status-tag status-tag--normal">已干预 ${p.interventions}</span>` : '<span class="status-tag status-tag--gray">未干预</span>'}</td>
            <td class="col-fixed"><button class="btn-link" data-detail="${p.id}">详情</button></td></tr>`).join('') : '<tr class="table__empty"><td colspan="9">暂无数据</td></tr>'}</tbody></table></div>
          ${PC.pager(all.length, st.page, st.pageSize)}</div>
        <div class="ai-panel"><div class="ai-panel__title">AI助理·多轮对话</div><div class="ai-panel__sub">基于当前风险帖子内容的智能问答</div>
          <div class="ai-panel__msgs" data-keep-scroll="ai">${st.msgs.map(m => m.intro ? `<div class="ai-msg ai-msg--bot">您好!我是舆情分析AI助手，您可以针对BBS内容提出任何问题，比如:
<span class="ai-msg__q" data-q="分析近一周高风险帖子的主要问题">1、分析近一周高风险帖子的主要问题</span><span class="ai-msg__q" data-q="给出一级风险帖子的干预建议">2、给出一级风险帖子的干预建议</span><span class="ai-msg__q" data-q="请根据所选中的风险帖子，分析问题并给出辅导建议">3、请根据所选中的风险帖子，分析问题并给出辅导建议(先勾选上面的帖子)</span></div>` : `<div class="ai-msg ${m.bot ? 'ai-msg--bot' : 'ai-msg--me'}">${esc(m.text)}</div>`).join('')}${st.typing ? '<div class="ai-msg ai-msg--bot">正在分析…</div>' : ''}</div>
          <div class="ai-panel__foot"><input class="input" data-keep="aiq" placeholder="请输入您的问题..."><button class="btn btn--primary" data-act="ask">发布</button></div></div>`;
    },
    bind(root, st) {
      const one = () => {
        if (!st.checked.length) { toast('请先勾选一条风险帖子', 'warning'); return null; }
        if (st.checked.length > 1) { toast('请仅勾选一条风险帖子', 'warning'); return null; }
        return st.checked[0];
      };
      const ask = q => {
        if (!q.trim()) { toast('请输入您的问题', 'warning'); return; }
        st.msgs.push({ text: q }); st.typing = true; PC.refresh();
        const checked = st.checked.length === 1 ? S.getPost(st.checked[0]) : null;
        const ans = aiAnswer(q, checked);
        const m = { bot: true, text: '' }; let i = 0;
        setTimeout(function tick() {
          if (i === 0) { st.typing = false; st.msgs.push(m); }
          m.text = ans.slice(0, i += 6);
          if (PC.page === PC.pages['/bbs/admin/risk-posts/index']) { PC.refresh(); const box = root.querySelector('.ai-panel__msgs'); if (box) box.scrollTop = box.scrollHeight; }
          if (i < ans.length) setTimeout(tick, 30);
        }, 500);
      };
      UI.delegate(root, 'change', '[data-range]', (e, el) => { st.range = el.value; st.page = 1; st.checked = []; PC.refresh(); });
      UI.delegate(root, 'change', '[data-chk]', (e, el) => { const id = el.dataset.chk; st.checked = el.checked ? st.checked.concat(id) : st.checked.filter(x => x !== id); PC.refresh(); });
      UI.delegate(root, 'change', '[data-chk-all]', (e, el) => { const ids = page(S.riskPosts(st.range), st).map(p => p.id); st.checked = el.checked ? [...new Set(st.checked.concat(ids))] : st.checked.filter(x => !ids.includes(x)); PC.refresh(); });
      UI.delegate(root, 'click', '[data-detail]', (e, el) => openRiskDetail(el.dataset.detail));
      UI.delegate(root, 'click', '[data-q]', (e, el) => ask(el.dataset.q));
      UI.delegate(root, 'keydown', '[data-keep="aiq"]', (e, el) => { if (e.key === 'Enter') { const v = el.value; el.value = ''; ask(v); } });
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'ext') PC.go('/bbs/admin/sentiment/external');
        else if (a === 'refresh') { PC.refresh(); toast('已刷新', 'success'); }
        else if (a === 'iv') { const id = one(); if (id) openIntervention(id); }
        else if (a === 'dl') {
          const rows = S.riskPosts(st.range).filter(p => !st.checked.length || st.checked.includes(p.id));
          download(`高风险帖子_${S.fmtDate(Date.now())}.csv`, [['序号', '帖子Id', '标题', '发布模块', '风险等级', '核心关键词', '发布时间', '干预次数']].concat(rows.map((p, i) => [i + 1, p.tzbh, p.bt, p.lxLabel, S.RISK_LEVELS[p.fxdj], p.fxgjcs, S.fmtDateTime(p.fbsj), p.interventions])));
          toast(`已导出 ${rows.length} 条`, 'success');
        } else if (a === 'ask') { const i = root.querySelector('[data-keep="aiq"]'); const v = i.value; i.value = ''; ask(v); }
      });
      PC.bindPager(root, st, PC.refresh);
    }
  };

  /* ---------- 站外舆情 ---------- */
  PC.pages['/bbs/admin/sentiment/external'] = {
    admin: true, title: '站外舆情', menu: '/bbs/admin/dashboard/index',
    init: () => ({ kw: '', sort: 'desc', page: 1, pageSize: 10, cost: '0.11' }),
    render(st) {
      const all = S.externalSentiment(st.kw, st.sort), list = page(all, st);
      return `<div class="sent"><div class="sent__tabs"><span class="sent__tab">舆情分析</span></div>
        <div class="sent__search"><div class="f1">${fItem('关键词搜索', `<input class="input" data-keep="kw" placeholder="请输入" value="${esc(st.kw)}">`)}
          <div class="sent__hot">高频内容：${['学校食堂不好吃', '进出困难', '张三老师', '章云'].map((k, i) => `${i ? ' | ' : ''}<button data-hot="${k}">${k}</button>`).join('')}</div></div>
          <button class="btn btn--primary" data-act="query">${IC.search}立即查询</button><button class="btn btn--plain" data-act="reset">重 置</button></div>
        <div class="sent__bar"><span>找到约 ${all.length} 条结果（用时 ${st.cost} 秒）</span>${fItem('时间排序', `<select class="select" data-sort>${opts([['desc', '时间降序'], ['asc', '时间升序']], st.sort)}</select>`)}</div>
        ${list.length ? `<div class="sent__grid">${list.map(e => `<div class="sent-card"><div class="sent-card__cover"><span class="sent-card__src">${e.source}</span></div>
          <div class="sent-card__title ellipsis">${esc(e.title)}</div><div class="sent-card__sum ellipsis">${esc(e.summary)}</div>
          <div class="sent-card__meta"><span>👁 ${UI.fmtNum(e.views)} | 💬 ${UI.fmtNum(e.comments)} | ↗ ${UI.fmtNum(e.shares)}</span><span>${S.fmtDate(e.time, true)}</span></div>
          <button class="sent-card__btn" data-view="${e.id}">查看详情</button></div>`).join('')}</div>` : PC.empty('暂无舆情结果')}
        ${PC.pager(all.length, st.page, st.pageSize, 'page', [10, 20])}</div>`;
    },
    bind(root, st) {
      const run = () => { st.page = 1; st.cost = (0.05 + Math.random() * 0.2).toFixed(2); PC.refresh(); };
      UI.delegate(root, 'click', '[data-hot]', (e, el) => { st.kw = el.dataset.hot; root.querySelector('[data-keep="kw"]').value = st.kw; run(); });
      UI.delegate(root, 'change', '[data-sort]', (e, el) => { st.sort = el.value; PC.refresh(); });
      UI.delegate(root, 'keydown', '[data-keep="kw"]', (e, el) => { if (e.key === 'Enter') { st.kw = el.value; run(); } });
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        if (el.dataset.act === 'query') st.kw = root.querySelector('[data-keep="kw"]').value;
        else { st.kw = ''; st.sort = 'desc'; root.querySelector('[data-keep="kw"]').value = ''; }
        run();
      });
      UI.delegate(root, 'click', '[data-view]', (e, el) => {
        const it = S.externalSentiment('', 'desc').find(x => x.id === el.dataset.view);
        UI.open({
          kind: 'dialog', title: '舆情详情', width: '3rem',
          render: () => `<div class="info-grid"><div class="info-grid__cell"><b>来源</b>${it.source}</div><div class="info-grid__cell"><b>发布时间</b>${S.fmtDateTime(it.time)}</div>
            <div class="info-grid__cell info-grid__cell--full"><b>标题</b>${esc(it.title)}</div></div>
            <div class="sec-title">内容摘要</div><div class="risk-content">${esc(it.summary)}</div>
            <div class="sec-title">传播数据</div><p class="c-muted" style="margin:0">浏览 ${UI.fmtNum(it.views)} · 评论 ${UI.fmtNum(it.comments)} · 转发 ${UI.fmtNum(it.shares)}</p>
            <div class="dlg-foot"><button class="btn btn--primary" data-close>关闭</button></div>`
        });
      });
      PC.bindPager(root, st, PC.refresh);
    }
  };
})();
