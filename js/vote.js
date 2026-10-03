/* 中南点点原型 · 帖子投票（PC / 管理端 / H5 共用结构，样式由各端 css 的 .vt-* 决定） */
(function () {
  const { esc, toast, avatar } = UI;
  const S = Store;
  const rid = () => 'op_' + Math.random().toString(36).slice(2, 9);
  const pad = n => String(n).padStart(2, '0');
  const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const DAYS = [1, 3, 7];

  /* ---------- 编辑器状态 ---------- */
  // 新建 / 从帖子或草稿恢复；locked = 已有人参与，题目与选项只读
  function edNew() {
    return { title: '', options: [{ id: rid(), text: '' }, { id: rid(), text: '' }], multi: false, maxSelect: 2, days: 3, deadline: 0, showBeforeVote: false, locked: 0 };
  }
  function edFrom(v, lockedCount = 0) {
    if (!v) return null;
    const opts = v.options && v.options.length ? v.options : [{}, {}];
    return {
      title: v.title || '', options: opts.map(o => ({ id: o.id || rid(), text: o.text || '' })), multi: !!v.multi, maxSelect: v.maxSelect > 1 ? v.maxSelect : 2,
      days: v.days || (v.deadline ? 'custom' : 3), deadline: v.deadline || 0, showBeforeVote: !!v.showBeforeVote, locked: lockedCount
    };
  }
  function deadlineOf(ed) { return ed.days === 'custom' ? ed.deadline : Date.now() + ed.days * S.DAY; }
  function toConfig(ed) {
    if (!ed) return null;
    return { title: ed.title, options: ed.options.map(o => ({ id: o.id, text: o.text })), multi: ed.multi, maxSelect: ed.multi ? ed.maxSelect : 1, deadline: deadlineOf(ed), showBeforeVote: ed.showBeforeVote };
  }
  function toDraft(ed) { return ed ? Object.assign(toConfig(ed), { days: ed.days, deadline: ed.days === 'custom' ? ed.deadline : 0 }) : null; }

  function editor(ed) {
    const L = ed.locked > 0;
    const seg = (key, items, cur) => `<div class="vt-seg">${items.map(([v, label]) => `<button type="button" class="vt-seg__item ${String(cur) === String(v) ? 'is-on' : ''}" data-vote-ed="${key}" data-v="${v}" ${L && (key === 'multi') ? 'disabled' : ''}>${label}</button>`).join('')}</div>`;
    const end = deadlineOf(ed);
    return `<div class="vt-ed">
      <div class="vt-ed__head"><span class="vt-ed__title"><i class="vt-ico"></i>投票</span>
        ${L ? `<span class="vt-ed__lock">已有 ${ed.locked} 人参与，选项不可修改，只能延长截止时间</span>` : '<span class="vt-ed__tip">适合征集意见、评选活动，发布后其他同学可直接投票</span>'}
        ${L ? '' : '<button type="button" class="vt-ed__remove" data-vote-ed="remove">移除投票</button>'}</div>
      <div class="vt-ed__row"><span class="vt-ed__label"><em>*</em>投票主题</span>
        <input class="vt-input" data-keep="vt-title" data-vote-in="title" maxlength="50" placeholder="例如：食堂新窗口你最想要哪种？" value="${esc(ed.title)}" ${L ? 'disabled' : ''}></div>
      <div class="vt-ed__row"><span class="vt-ed__label"><em>*</em>投票选项</span><div class="vt-ed__opts">
        ${ed.options.map((o, i) => `<div class="vt-ed__opt"><span class="vt-ed__no">${i + 1}</span>
          <input class="vt-input" data-keep="vt-opt-${o.id}" data-vote-in="opt" data-i="${i}" maxlength="30" placeholder="选项 ${i + 1}" value="${esc(o.text)}" ${L ? 'disabled' : ''}>
          ${L ? '' : `<button type="button" class="vt-ed__rm" data-vote-ed="rm" data-i="${i}" ${ed.options.length <= 2 ? 'disabled' : ''} title="删除选项">×</button>`}</div>`).join('')}
        ${!L && ed.options.length < 10 ? `<button type="button" class="vt-ed__add" data-vote-ed="add">+ 添加选项（${ed.options.length}/10）</button>` : ''}</div></div>
      <div class="vt-ed__row"><span class="vt-ed__label">投票方式</span><div class="vt-ed__line">${seg('multi', [[0, '单选'], [1, '多选']], ed.multi ? 1 : 0)}
        ${ed.multi ? `<label class="vt-ed__max">最多选 <select class="vt-select" data-vote-in="max" ${L ? 'disabled' : ''}>${ed.options.slice(1).map((o, i) => `<option value="${i + 2}" ${ed.maxSelect === i + 2 ? 'selected' : ''}>${i + 2}</option>`).join('')}</select> 项</label>` : ''}</div></div>
      <div class="vt-ed__row"><span class="vt-ed__label"><em>*</em>截止时间</span><div class="vt-ed__line">
        ${seg('days', DAYS.map(d => [d, d + ' 天']).concat([['custom', '自定义']]), ed.days)}
        ${ed.days === 'custom' ? `<input class="vt-input vt-input--dt" type="datetime-local" data-vote-in="deadline" value="${ed.deadline ? toLocalInput(ed.deadline) : ''}">` : ''}</div>
        <span class="vt-ed__hint">${end ? '将于 ' + S.fmtDate(end, true) + ' 截止' : '请选择截止时间'}</span></div>
      <div class="vt-ed__row"><span class="vt-ed__label">结果可见</span>${seg('vis', [[0, '投票后可见'], [1, '任何人可见']], ed.showBeforeVote ? 1 : 0)}</div>
    </div>`;
  }
  // 返回 'remove' 表示用户移除投票；返回 true 表示已处理
  function onEditor(e, ed, refresh) {
    const t = e.target;
    if (!ed) return false;
    if (e.type === 'input' || e.type === 'change') {
      const k = t.dataset && t.dataset.voteIn;
      if (!k) return false;
      if (k === 'title') ed.title = t.value;
      else if (k === 'opt') ed.options[+t.dataset.i].text = t.value;
      else if (k === 'max' && e.type === 'change') { ed.maxSelect = +t.value; refresh(); }
      else if (k === 'deadline' && e.type === 'change') { ed.deadline = t.value ? new Date(t.value).getTime() : 0; refresh(); }
      return true;
    }
    const b = t.closest && t.closest('[data-vote-ed]');
    if (!b || b.disabled) return false;
    const a = b.dataset.voteEd, v = b.dataset.v;
    if (a === 'remove') return 'remove';
    if (a === 'add' && ed.options.length < 10) ed.options.push({ id: rid(), text: '' });
    else if (a === 'rm' && ed.options.length > 2) ed.options.splice(+b.dataset.i, 1);
    else if (a === 'multi') ed.multi = v === '1';
    else if (a === 'days') { ed.days = v === 'custom' ? 'custom' : +v; if (ed.days === 'custom' && !ed.deadline) ed.deadline = Date.now() + 3 * S.DAY; }
    else if (a === 'vis') ed.showBeforeVote = v === '1';
    ed.maxSelect = Math.min(Math.max(2, ed.maxSelect), Math.max(2, ed.options.length));
    refresh();
    return true;
  }

  /* ---------- 片段 ---------- */
  const ruleText = v => `${v.multi ? `多选 · 最多 ${v.maxSelect} 项` : '单选'} · ${v.total} 人参与 · ${S.voteRemainText(v)}`;
  function badge(p) {
    const v = p.voteInfo;
    if (!v) return '';
    return `<span class="vt-badge ${v.ended ? 'is-off' : ''}"><i class="vt-ico"></i>${v.ended ? '投票已结束' : '投票中'} · ${v.total}人参与</span>`;
  }
  function bars(v, { compact } = {}) {
    return v.options.map(o => `<div class="vt-res ${o.mine ? 'is-mine' : ''} ${o.lead && v.total ? 'is-lead' : ''}">
      <div class="vt-res__bar" style="width:${o.pct}%"></div>
      <span class="vt-res__txt">${esc(o.text)}${o.mine ? '<em class="vt-res__mine">已选</em>' : ''}</span>
      <span class="vt-res__num">${o.count} 票${compact ? '' : ' · ' + o.pct + '%'}</span></div>`).join('');
  }
  // 帖子详情里的投票卡；sel 为当前未提交的选择
  function card(p, sel = []) {
    const v = p && p.voteInfo;
    if (!v) return '';
    const canVote = !v.ended && !v.voted;
    const body = canVote
      ? v.options.map(o => `<button type="button" class="vt-opt ${sel.includes(o.id) ? 'is-sel' : ''} ${v.multi ? 'vt-opt--multi' : ''}" data-vote="opt" data-id="${p.id}" data-opt="${o.id}">
          <i class="vt-opt__mark"></i><span class="vt-opt__txt">${esc(o.text)}</span>${v.canSeeResult ? `<span class="vt-opt__num">${o.count} 票 · ${o.pct}%</span><span class="vt-opt__bar" style="width:${o.pct}%"></span>` : ''}</button>`).join('')
      : bars(v);
    const tip = canVote ? (v.canSeeResult ? '' : ' · 投票后可查看结果') : '';
    return `<div class="vt-card ${v.ended ? 'is-ended' : ''}">
      <div class="vt-card__head"><span class="vt-card__tag"><i class="vt-ico"></i>投票</span><span class="vt-card__title">${esc(v.title)}</span></div>
      <div class="vt-card__rule">${ruleText(v)}${tip}</div>
      <div class="vt-card__body">${body}</div>
      <div class="vt-card__foot">
        ${canVote ? `<span class="vt-card__hint">${v.multi ? `已选 ${sel.length}/${v.maxSelect}` : sel.length ? '已选择 1 项' : '请选择 1 项'}</span><button type="button" class="vt-btn vt-btn--primary" data-vote="submit" data-id="${p.id}" ${sel.length ? '' : 'disabled'}>投票</button>`
          : `<span class="vt-card__hint">${v.voted ? '你已于 ' + S.fmtDate(v.myVoteAt, true) + ' 投票' : ''}${v.ended ? (v.voted ? ' · ' : '') + '投票已结束，共 ' + v.total + ' 人参与' : ''}</span>`}
        ${v.isOwner ? `<button type="button" class="vt-btn" data-vote="stats" data-id="${p.id}">查看统计${v.unseen ? `<em class="vt-new">+${v.unseen}</em>` : ''}</button>` : ''}
        ${v.canManage && !v.ended ? `<button type="button" class="vt-btn vt-btn--danger" data-vote="close" data-id="${p.id}">结束投票</button>` : ''}
      </div></div>`;
  }
  // 发起人 / 管理员看到的完整统计
  function stats(d, { inAdmin = false } = {}) {
    const v = d.info, p = d.post;
    const rate = p.llcs ? Math.min(100, Math.round(v.total / p.llcs * 1000) / 10) : 0;
    const max = Math.max(1, ...d.trend.map(x => x.n));
    return `<div class="vt-stats">
      <div class="vt-stats__head"><div class="vt-stats__title">${esc(v.title)}</div>
        <div class="vt-stats__sub">${ruleText(v)} · 结果${v.showBeforeVote ? '任何人可见' : '投票后可见'}</div>
        <div class="vt-stats__post">来自帖子：${esc(p.bt)}</div></div>
      <div class="vt-kpis">
        <div class="vt-kpi"><b>${v.total}</b><span>参与人数</span></div>
        <div class="vt-kpi"><b>${rate}%</b><span>投票率（参与 / 浏览）</span></div>
        <div class="vt-kpi"><b>${esc(v.leader || '暂无')}</b><span>${v.ended ? '最终领先' : '当前领先'}</span></div>
        <div class="vt-kpi"><b>${S.fmtDate(v.endAt, true)}</b><span>${v.ended ? (v.closedAt ? '提前结束于' : '截止于') : '截止时间'}</span></div>
      </div>
      <h4 class="vt-sec">选项统计${v.multi ? '<small>多选时占比按参与人数计算，合计可超过 100%</small>' : ''}</h4>
      <div class="vt-stats__bars">${bars(v)}</div>
      <h4 class="vt-sec">参与趋势<small>按天统计参与人数</small></h4>
      <div class="vt-trend">${!v.total ? '<span class="vt-trend__empty">暂无人参与</span>' : d.trend.map(x => `<div class="vt-trend__col"><span class="vt-trend__n">${x.n}</span><span class="vt-trend__bar" style="height:${Math.round(x.n / max * 100)}%"></span><span class="vt-trend__d">${S.fmtDate(x.day).slice(5)}</span></div>`).join('')}</div>
      <h4 class="vt-sec">参与明细（${d.ballots.length}）${d.withRealname ? '<small>管理员可见实名信息</small>' : '<small>仅发起人可见，不展示实名信息</small>'}</h4>
      <div class="vt-table-wrap"><table class="vt-table"><thead><tr><th>序号</th><th>昵称</th>${d.withRealname ? '<th>姓名</th><th>学号</th><th>学院</th>' : ''}<th>所选项</th><th>投票时间</th></tr></thead>
        <tbody>${d.ballots.length ? d.ballots.map((b, i) => `<tr><td>${i + 1}</td><td><span class="vt-user">${avatar(b, 'avatar--xs xs')}${d.withRealname && inAdmin ? `<button class="btn-link" data-realname="${b.uid}">${esc(b.nc)}</button>` : esc(b.nc)}</span></td>
          ${d.withRealname ? `<td>${esc(b.xm)}</td><td>${esc(b.xh)}</td><td>${esc(b.bmmc)}</td>` : ''}<td>${b.choice.map(esc).join('、')}</td><td>${S.fmtDate(b.cjsj, true)}</td></tr>`).join('')
          : `<tr><td colspan="${d.withRealname ? 7 : 4}" class="vt-table__empty">暂无人参与</td></tr>`}</tbody></table></div>
      <div class="vt-stats__ops">
        ${inAdmin ? '' : `<button type="button" class="vt-btn" data-vote="post" data-id="${p.id}">查看原帖</button>`}
        <button type="button" class="vt-btn" data-vote="export" data-id="${p.id}">导出投票明细</button>
        ${v.canManage && !v.ended ? `<button type="button" class="vt-btn vt-btn--danger" data-vote="close" data-id="${p.id}">提前结束投票</button>` : ''}
      </div></div>`;
  }
  // 个人中心「我的投票」列表项
  function mineItem(p, type) {
    const v = p.voteInfo;
    const choice = v.options.filter(o => v.myChoice.includes(o.id)).map(o => o.text);
    return `<button type="button" class="vt-mine" data-vote="${type === 'created' ? 'stats' : 'post'}" data-id="${p.id}">
      <div class="vt-mine__top"><span class="vt-status ${v.ended ? 'is-off' : ''}">${v.ended ? '已结束' : '进行中'}</span><span class="vt-mine__title">${esc(v.title)}</span>${v.unseen ? `<em class="vt-new">+${v.unseen}</em>` : ''}</div>
      <div class="vt-mine__post">来自帖子：${esc(p.bt)}</div>
      ${type === 'created'
        ? `<div class="vt-mine__meta"><span>${v.total} 人参与</span><span>${S.voteRemainText(v)}</span><span>${v.ended ? '最终领先' : '当前领先'}：${esc(v.leader || '暂无')}</span></div>${v.total ? `<div class="vt-mine__bars">${bars(v, { compact: true })}</div>` : ''}`
        : `<div class="vt-mine__meta"><span>我选了：<b>${choice.map(esc).join('、')}</b></span><span>${S.fmtDate(v.myVoteAt, true)}</span></div>
           <div class="vt-mine__res">${v.canSeeResult ? `${v.ended ? '最终结果' : '当前领先'}：<b>${esc(v.leader || '暂无')}</b>（共 ${v.total} 人参与）` : '结果将在投票截止后公布'}</div>`}
    </button>`;
  }

  /* ---------- 交互 ---------- */
  function download(tzid) {
    const csv = S.voteCsv(tzid);
    const p = S.getPost(tzid);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `投票明细_${p.voteInfo.title.slice(0, 20)}_${S.fmtDate(Date.now()).replace(/-/g, '')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('已导出投票明细', 'success');
  }
  // ctx: { state（存 voteSel）, refresh, canInteract, openStats, openPost }
  async function onCard(el, ctx) {
    const a = el.dataset.vote, id = el.dataset.id;
    const st = ctx.state;
    if (a === 'opt') {
      const v = S.getPost(id).voteInfo;
      const o = el.dataset.opt;
      let sel = st.voteSel || [];
      if (!v.multi) sel = [o];
      else if (sel.includes(o)) sel = sel.filter(x => x !== o);
      else if (sel.length >= v.maxSelect) { toast(`最多只能选择 ${v.maxSelect} 项`, 'warning'); return; }
      else sel = sel.concat(o);
      st.voteSel = sel; ctx.refresh();
    } else if (a === 'submit') {
      if (!ctx.canInteract()) return;
      S.castVote(id, st.voteSel || []);
      st.voteSel = [];
      toast('投票成功', 'success');
    } else if (a === 'close') {
      if (await UI.confirm('确定提前结束该投票？结束后不能再投票，参与者会收到通知。', { title: '结束投票', ok: '结束投票', danger: true })) {
        S.closeVote(id); toast('投票已结束', 'success');
      }
    } else if (a === 'stats') ctx.openStats(id);
    else if (a === 'export') download(id);
    else if (a === 'post') ctx.openPost(id);
  }

  window.VoteUI = { edNew, edFrom, toConfig, toDraft, editor, onEditor, badge, card, stats, mineItem, onCard, download };
})();
