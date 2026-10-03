/* 中南点点原型 · PC 前台 */
(function () {
  const { esc, toast, imgSrc, avatar } = UI;
  const S = Store;
  const WARN = '温馨提示：请勿发布不正当言论，不造谣不传谣，严重者将被封禁账号，甚至被追究法律责任！';
  const ICON = {
    eye: 'assets/h5/icon-eye.svg', like: 'assets/h5/icon-like.svg', likeOn: 'assets/h5/icon-like-active.svg', cmt: 'assets/h5/icon-comment.svg',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    down: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>'
  };
  const BADGE = { policy: 'blue', council: 'green', report: 'red' };

  /* ---------- 权限守卫 ---------- */
  PC.canInteract = function () {
    if (S.isBanned()) { toast('账号已被封禁，暂时无法进行该操作', 'error'); return false; }
    if (S.me().sfwczl !== '1') { openProfilePrompt(); return false; }
    return true;
  };

  /* ---------- 片段 ---------- */
  function officialBadge(p) {
    if (!p.zdbmid) return '';
    return p.hfzt === 'replied'
      ? `<span class="official-badge official-badge--done"><img src="assets/h5/icon-reply-done.svg" alt="">官方回复·${esc(p.zdbmmc)}</span>`
      : `<span class="official-badge official-badge--pending"><img src="assets/h5/icon-reply-pending.svg" alt="">待${esc(p.zdbmmc)}回复</span>`;
  }
  function postImgs(tps, max = 3) {
    if (!tps || !tps.length) return '';
    const list = tps.slice(0, max);
    const cols = list.length === 1 ? 1 : list.length === 2 ? 2 : 3;
    return `<div class="post-card__imgs ${cols === 1 ? 'post-card__imgs--single' : ''}" style="grid-template-columns:repeat(${cols},1fr)">
      ${list.map(t => `<img class="post-card__img" src="${esc(imgSrc(t))}" alt="" loading="lazy">`).join('')}</div>`;
  }
  PC.postCard = function (p, { actions = false, badge = 0 } = {}) {
    return `<article class="post-card" data-post="${p.id}">
      ${badge ? `<span class="post-card__badge">${badge > 99 ? '99+' : badge}</span>` : ''}
      <div class="post-card__user">
        <span data-pm="${p.fbrid}" title="发私信">${avatar(p)}</span>
        <div>
          <div class="post-card__nick">${esc(p.fbrnc)}</div>
          <div class="post-card__sub">${S.relTime(p.fbsj)}${p.ztbq === 'topped' ? '<span class="top-tag">置顶</span>' : ''}</div>
        </div>
      </div>
      <div class="post-card__body">
        <div class="post-card__panel">
          <div>
            <div class="post-card__title-row">${PC.lxTag(p.lx)}<h3 class="post-card__title">${esc(p.bt)}</h3>${officialBadge(p)}${VoteUI.badge(p)}</div>
            <p class="post-card__preview clamp2">${esc(p.nr)}</p>
          </div>
          ${postImgs(p.tps)}
        </div>
        <div class="post-card__stats ${actions ? 'post-card__stats--actions' : ''}">
          ${actions ? `<div class="post-card__actions"><button class="post-card__action post-card__action--delete" data-del-post="${p.id}">删除</button><button class="post-card__action post-card__action--edit" data-edit-post="${p.id}">编辑</button></div>` : ''}
          <div class="f-c" style="gap:.09375rem">
            <span class="post-card__stat"><img src="${ICON.eye}" alt="">${p.llcs}</span>
            <span class="post-card__stat post-card__stat--like ${p.sfdz ? 'is-on' : ''}" data-like-post="${p.id}"><img class="like" src="${p.sfdz ? ICON.likeOn : ICON.like}" alt="">${p.dzs}</span>
            <span class="post-card__stat"><img src="${ICON.cmt}" alt="">${p.pls}</span>
          </div>
        </div>
      </div>
    </article>`;
  };
  // 帖子卡片公共交互（首页列表、个人抽屉共用）
  PC.bindPostCards = function (root) {
    UI.delegate(root, 'click', '[data-post]', UI.guard((e, el) => {
      if (e.target.closest('[data-like-post]')) {
        e.stopPropagation();
        if (!PC.canInteract()) return;
        S.togglePostLike(e.target.closest('[data-like-post]').dataset.likePost);
        return;
      }
      if (e.target.closest('[data-pm]')) { e.stopPropagation(); openSendPm(e.target.closest('[data-pm]').dataset.pm); return; }
      if (e.target.closest('[data-del-post]')) {
        e.stopPropagation();
        UI.confirm('确认删除该帖？删除后不可恢复。', { ok: '删除', danger: true }).then(ok => { if (ok) { S.deletePost(el.dataset.post); toast('已删除', 'success'); } });
        return;
      }
      if (e.target.closest('[data-edit-post]')) { e.stopPropagation(); UI.closeAll(); PC.go('/bbs/post/publish', { id: el.dataset.post }); return; }
      PC.openPost(el.dataset.post);
    }));
  };

  /* ---------- 帖子详情抽屉（回复列表） ---------- */
  function cmtNode(node, st) {
    const c = node.pl;
    const tag = c.sfgfhf === '1' ? `<span class="cmt__tag cmt__tag--official">官方回复${c.rzbmmc ? '·' + esc(c.rzbmmc) : ''}</span>` : c.isAuthor ? '<span class="cmt__tag">作者</span>' : '';
    const kids = node.children;
    const open = st.expanded[c.id];
    const shown = open ? kids : kids.slice(0, 2);
    return `<div class="cmt">
      <div class="cmt__author">${avatar(c)}<div class="cmt__meta"><div class="cmt__top"><span class="cmt__name">${esc(c.fbrnc)}</span>${tag}</div><span class="cmt__sub">${S.relTime(c.cjsj)}</span></div></div>
      <div class="cmt__content">
        ${c.plnr ? `<p class="cmt__text">${esc(c.plnr)}</p>` : ''}
        ${c.tps.length ? `<div class="cmt__imgs">${c.tps.map(t => `<img src="${esc(imgSrc(t))}" data-preview alt="">`).join('')}</div>` : ''}
        <button class="cmt__reply-btn" data-reply="${c.id}">回复</button>
        ${c.isMine ? `<button class="cmt__del" data-del-cmt="${c.id}" title="删除">${ICON.del.replace('<svg', '<svg width="12" height="12"')}</button>` : ''}
        <button class="cmt__like ${c.sfdz ? 'is-on' : ''}" data-like-cmt="${c.id}"><img src="${c.sfdz ? ICON.likeOn : ICON.like}" alt="">${c.dzs}</button>
      </div>
      ${st.replyTo === c.id ? inlineComposer(c, st, true) : ''}
      ${kids.length ? `<div class="cmt__children"><div class="cmt__replies">
        ${shown.map(r => `<div class="cmt__reply">
          <span class="cmt__ruser">${avatar(r, 'avatar--xs')}<span class="cmt__rname">${esc(r.fbrnc)}</span></span>${r.sfgfhf === '1' ? ' <span class="cmt__tag cmt__tag--official">官方回复</span>' : r.isAuthor ? ' <span class="cmt__tag">作者</span>' : ''}
          <span class="cmt__rword">回复</span><span class="cmt__rname">${esc(r.hfdxnc)}</span>：<span>${esc(r.plnr)}</span>
          ${r.tps.length ? `<div class="cmt__rimgs">${r.tps.map(t => `<img src="${esc(imgSrc(t))}" data-preview alt="">`).join('')}</div>` : ''}
          <span class="cmt__rtime">${S.relTime(r.cjsj)}</span>
          <button class="cmt__rlink" data-reply="${r.id}">回复</button>
          ${r.isMine ? `<button class="cmt__rlink c-danger" data-del-cmt="${r.id}">删除</button>` : ''}
          <button class="cmt__rlike ${r.sfdz ? 'is-on' : ''}" data-like-cmt="${r.id}"><img src="${r.sfdz ? ICON.likeOn : ICON.like}" alt="">${r.dzs}</button>
          ${st.replyTo === r.id ? inlineComposer(r, st) : ''}
        </div>`).join('')}
        ${kids.length > 2 ? `<button class="cmt__expand" data-expand="${c.id}">${open ? '收起' + ICON.up : `展开全部 ${kids.length} 条回复` + ICON.down}</button>` : ''}
      </div></div>` : ''}
    </div>`;
  }
  function inlineComposer(target, st, root) {
    return `<div class="reply-inline ${root ? 'reply-inline--root' : ''}">
      <textarea class="textarea" rows="2" maxlength="800" data-keep="reply" placeholder="回复 ${esc(target.fbrnc)}"></textarea>
      ${st.replyImgs.length ? `<div class="thumbs mt8">${st.replyImgs.map((t, i) => `<div class="thumb" style="width:.29167rem;height:.29167rem"><img src="${esc(t)}" alt=""><button class="thumb__del" data-del-rimg="${i}">×</button></div>`).join('')}</div>` : ''}
      <div class="reply-inline__actions">
        <button class="btn-link" data-add-rimg ${st.replyImgs.length >= 9 ? 'disabled' : ''}>图片</button>
        <button class="btn-link" style="color:#9096a2" data-cancel-reply>取消</button>
        <button class="btn btn--primary btn--sm" data-send-reply>发布</button>
      </div>
    </div>`;
  }
  PC.openPost = function (id, opts = {}) {
    const first = S.viewPost(id);
    if (!first) { toast('帖子不存在或无法访问', 'error'); return; }
    S.commit();
    return UI.open({
      kind: 'drawer', cls: 'pdd-layer', title: '回复列表',
      state: { id, imgs: [], replyTo: null, replyImgs: [], expanded: {}, voteSel: [] },
      render(l) {
        const st = l.state;
        const p = S.getPost(st.id);
        if (!p || p.ztbq === 'deleted') return `<div class="pdd"><p class="pdd__no-cmt">该贴已删除。</p></div>`;
        const tree = S.commentsTree(p.id);
        const me = S.me();
        return `<div class="pdd">
          <div class="pdd__scroll" data-keep-scroll="pdd">
            <div class="pdd__post">
              <div class="f-c" style="gap:.04167rem">${PC.lxTag(p.lx)}${p.ztbq === 'topped' ? '<span class="top-tag">置顶</span>' : ''}${officialBadge(p)}</div>
              <div class="pdd__bubble">
                <div class="pdd__author">${avatar(p, 'avatar--sm')}<span class="c-muted">${esc(p.fbrnc)}</span><span class="c-light">· ${S.fmtDate(p.fbsj, true)}</span></div>
                <h3 class="pdd__title">${esc(p.bt)}</h3>
                <p class="pdd__text">${esc(p.nr)}</p>
                ${p.tps.length ? `<div class="pdd__imgs">${p.tps.map(t => `<img src="${esc(imgSrc(t))}" data-preview alt="">`).join('')}</div>` : ''}
              </div>
              ${VoteUI.card(p, st.voteSel)}
              <div class="pdd__actions">
                <span class="pdd__action"><img src="${ICON.eye}" alt="">${p.llcs}</span>
                <button class="pdd__action ${p.sfdz ? 'is-on' : ''}" data-act="like"><img class="like" src="${p.sfdz ? ICON.likeOn : ICON.like}" alt="">${p.dzs}</button>
                <button class="pdd__action pdd__action--warn" data-act="report">${ICON.warn}举报</button>
                <button class="pdd__action" data-act="share">${ICON.share}分享</button>
              </div>
            </div>
            <div class="pdd__divider"><i></i><span>${tree.reduce((n, x) => n + 1 + x.children.length, 0)}条评论</span><i></i></div>
            ${tree.length ? `<div class="pdd__comments">${tree.map(n => cmtNode(n, st)).join('')}</div>` : '<p class="pdd__no-cmt">暂无评论，快来抢沙发吧</p>'}
          </div>
          <div class="pdd__composer">
            <div class="pdd__composer-box">
              <div class="pdd__composer-field">${avatar(me)}
                <div class="f1"><textarea class="pdd__composer-input" rows="3" maxlength="800" data-keep="cmt" placeholder="请输入你的评论"></textarea>
                ${st.imgs.length ? `<div class="thumbs mt8">${st.imgs.map((t, i) => `<div class="thumb"><img src="${esc(t)}" alt=""><button class="thumb__del" data-del-img="${i}" title="删除图片">×</button></div>`).join('')}</div>` : ''}</div>
              </div>
              <p class="pdd__composer-tip">${WARN}</p>
            </div>
            <div class="pdd__composer-foot">
              <button class="img-btn" data-act="addImg" ${st.imgs.length >= 9 ? 'disabled' : ''}>${ICON.img}图片</button>
              <button class="send-btn" data-act="send">发布评论</button>
            </div>
          </div>
        </div>`;
      },
      on: {
        'click [data-act="like"]': (e, el, l) => { if (PC.canInteract()) S.togglePostLike(l.state.id); },
        'click [data-act="report"]': (e, el, l) => { if (PC.canInteract()) openReport(l.state.id); },
        'click [data-act="share"]': (e, el, l) => { UI.copy(location.href.split('#')[0] + '#/bbs/home/index?post=' + l.state.id).then(() => toast('链接已复制', 'success')); },
        'click [data-act="addImg"]': async (e, el, l) => { const a = await UI.pickImages({ max: 9, existing: l.state.imgs.length }); l.state.imgs.push(...a); l.refresh(); },
        'click [data-del-img]': (e, el, l) => { l.state.imgs.splice(+el.dataset.delImg, 1); l.refresh(); },
        'click [data-act="send"]': (e, el, l) => {
          if (!PC.canInteract()) return;
          const ta = l.body.querySelector('[data-keep="cmt"]');
          const v = ta.value;
          if (!v.trim() && !l.state.imgs.length) { toast('请输入评论或添加图片', 'warning'); return; }
          ta.value = '';
          const imgs = l.state.imgs; l.state.imgs = [];
          try { S.addComment({ tzid: l.state.id, plnr: v, tps: imgs }); toast('已发布', 'success'); }
          catch (err) { ta.value = v; l.state.imgs = imgs; l.refresh(); throw err; }
        },
        'click [data-reply]': (e, el, l) => { if (!PC.canInteract()) return; l.state.replyTo = el.dataset.reply; l.state.replyImgs = []; l.refresh(); const t = l.body.querySelector('[data-keep="reply"]'); if (t) { t.value = ''; t.focus(); } },
        'click [data-cancel-reply]': (e, el, l) => { l.state.replyTo = null; l.refresh(); },
        'click [data-add-rimg]': async (e, el, l) => { const a = await UI.pickImages({ max: 9, existing: l.state.replyImgs.length }); l.state.replyImgs.push(...a); l.refresh(); },
        'click [data-del-rimg]': (e, el, l) => { l.state.replyImgs.splice(+el.dataset.delRimg, 1); l.refresh(); },
        'click [data-send-reply]': (e, el, l) => {
          const ta = l.body.querySelector('[data-keep="reply"]');
          const v = ta.value;
          if (!v.trim() && !l.state.replyImgs.length) { toast('请输入评论或添加图片', 'warning'); return; }
          ta.value = '';
          const to = l.state.replyTo, imgs = l.state.replyImgs;
          l.state.replyTo = null; l.state.replyImgs = [];
          try { S.addComment({ tzid: l.state.id, plnr: v, tps: imgs, replyTo: to }); toast('已发布', 'success'); }
          catch (err) { l.state.replyTo = to; l.state.replyImgs = imgs; l.refresh(); l.body.querySelector('[data-keep="reply"]').value = v; throw err; }
        },
        'click [data-like-cmt]': (e, el) => { if (PC.canInteract()) S.toggleCommentLike(el.dataset.likeCmt); },
        'click [data-del-cmt]': (e, el) => { UI.confirm('确认删除该评论？').then(ok => { if (ok) { S.deleteComment(el.dataset.delCmt); toast('已删除', 'success'); } }); },
        'click [data-expand]': (e, el, l) => { const k = el.dataset.expand; l.state.expanded[k] = !l.state.expanded[k]; l.refresh(); },
        'click [data-preview]': (e, el) => UI.preview(el.src),
        'click [data-vote]': (e, el, l) => VoteUI.onCard(el, { state: l.state, refresh: () => l.refresh(), canInteract: PC.canInteract, openStats: openVoteStats, openPost: () => {} })
      },
      onClose: opts.onClose
    });
  };

  /* ---------- 投票统计（发起人在个人中心查看） ---------- */
  function openVoteStats(id) {
    S.markVoteSeen(id);
    UI.open({
      kind: 'dialog', cls: 'vt-dlg', title: '投票统计', width: '4.4rem',
      render: () => { try { return VoteUI.stats(S.voteDetail(id)); } catch (err) { return PC.empty(err.message); } },
      on: {
        'click [data-vote]': (e, el, l) => VoteUI.onCard(el, {
          state: l.state, refresh: () => l.refresh(), canInteract: PC.canInteract, openStats: () => {},
          openPost: pid => { l.close(); PC.openPost(pid); }
        })
      }
    });
  }
  PC.openVoteStats = openVoteStats;
  function openMyVotes() {
    const l = UI.open({
      kind: 'drawer', title: '我的投票', state: { tab: 'created' },
      render: l => {
        const list = S.myVotes(l.state.tab);
        const n = { created: S.myVotes('created').length, joined: S.myVotes('joined').length };
        return `<div class="my-drawer"><div class="vt-tabs">${[['created', '我发起的'], ['joined', '我参与的']].map(([k, t]) => `<button class="vt-tabs__item ${l.state.tab === k ? 'is-on' : ''}" data-tab="${k}">${t}<span>${n[k]}</span></button>`).join('')}</div>
          <p class="my-drawer__tip">${l.state.tab === 'created' ? '点击投票可查看票数、参与趋势和参与明细，也可提前结束或导出' : '点击可回到原帖查看投票结果'}</p>
          <div class="my-drawer__list vt-mine-list" data-keep-scroll="mv">${list.length ? list.map(p => VoteUI.mineItem(p, l.state.tab)).join('') : PC.empty(l.state.tab === 'created' ? '暂无投票，发帖时可以添加投票' : '暂无投票')}</div></div>`;
      },
      on: {
        'click [data-tab]': (e, el, l) => { l.state.tab = el.dataset.tab; l.refresh(); },
        'click [data-vote]': (e, el, l) => VoteUI.onCard(el, { state: l.state, refresh: () => l.refresh(), canInteract: PC.canInteract, openStats: openVoteStats, openPost: pid => PC.openPost(pid) })
      }
    });
    return l;
  }
  PC.openMyVotes = openMyVotes;

  /* ---------- 举报 ---------- */
  function openReport(tzid) {
    UI.open({
      kind: 'dialog', cls: 'rpd', title: '举报问题', width: '560px', state: { type: '' },
      render: l => `<div class="rpd__label">请选择举报类型</div>
        <div class="rpd__grid">${S.REPORT_TYPES.map(t => `<button class="rpd__type ${l.state.type === t ? 'is-active' : ''}" data-type="${t}">${t}</button>`).join('')}</div>
        <div class="field-count"><textarea class="textarea" rows="4" maxlength="800" data-keep="jbsm" placeholder="请输入详细举报内容" style="min-height:.41667rem"></textarea><span class="field-count__n" data-count>0/800</span></div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-submit>提交</button></div>`,
      onMount: l => { const t = l.body.querySelector('textarea'); l.body.querySelector('[data-count]').textContent = t.value.length + '/800'; },
      on: {
        'click [data-type]': (e, el, l) => { l.state.type = el.dataset.type; l.refresh(); },
        'input textarea': (e, el, l) => { l.body.querySelector('[data-count]').textContent = el.value.length + '/800'; },
        'click [data-submit]': (e, el, l) => {
          if (!l.state.type) { toast('请选择举报类型', 'warning'); return; }
          S.report(tzid, l.state.type, l.body.querySelector('textarea').value);
          toast('举报已提交', 'success'); l.close();
        }
      }
    });
  }
  PC.openReport = openReport;

  /* ---------- 私信 ---------- */
  function openSendPm(peerId) {
    const peer = S.user(peerId);
    if (!peer) { toast('无法获取用户信息', 'error'); return; }
    if (peerId === S.me().id) { toast('不能给自己发私信', 'warning'); return; }
    if (!PC.canInteract()) return;
    UI.open({
      kind: 'dialog', title: '发送私信', width: '2.08333rem',
      render: () => `<div class="f-c" style="gap:.04167rem;margin-bottom:.0625rem">${avatar(peer, 'avatar--md')}<b>${esc(peer.nc)}</b></div>
        <textarea class="textarea" rows="5" maxlength="500" data-keep="pm" placeholder="请输入私信内容"></textarea>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-send>立即发送</button></div>`,
      on: {
        'click [data-send]': (e, el, l) => {
          const v = l.body.querySelector('textarea').value;
          if (!v.trim()) { toast('请输入你的内容', 'warning'); return; }
          S.sendMessage(peerId, v); toast('私信已发送', 'success'); l.close();
        }
      }
    });
  }
  PC.openSendPm = openSendPm;
  function openChat(peerId) {
    const peer = S.user(peerId) || { nc: '用户' };
    UI.open({
      kind: 'dialog', cls: 'chat-dlg', title: '具体私信 · ' + esc(peer.nc),
      render: () => {
        const list = S.chat(peerId);
        let last = 0;
        return `<div class="chat">
          <div class="chat__list" data-chat-list>
            ${list.length ? list.map(m => {
              const t = m.cjsj - last > 10 * 60000 ? `<div class="chat__time">${S.fmtDate(m.cjsj, true)}</div>` : '';
              last = m.cjsj;
              return `${t}<div class="chat__row ${m.mine ? 'is-me' : ''}">${avatar(m.mine ? S.me() : peer, 'avatar--sm')}<div class="chat__bubble">${esc(m.nr)}</div></div>`;
            }).join('') : '<div class="empty">暂无私信记录</div>'}
          </div>
          <div class="chat__foot"><textarea class="textarea" data-keep="chat" maxlength="500" placeholder="请输入你的内容"></textarea>
            <div class="flex" style="flex-direction:column;gap:.04167rem"><button class="btn btn--primary" data-send>发布回复</button><button class="btn" data-close>取消</button></div></div>
        </div>`;
      },
      onMount: l => { const c = l.body.querySelector('[data-chat-list]'); c.scrollTop = c.scrollHeight; },
      on: {
        'click [data-send]': (e, el, l) => {
          const ta = l.body.querySelector('textarea');
          const v = ta.value;
          if (!v.trim()) { toast('请输入回复内容', 'warning'); return; }
          if (!PC.canInteract()) return;
          ta.value = '';
          try { S.sendMessage(peerId, v); } catch (err) { ta.value = v; throw err; }
        },
        'keydown textarea': (e, el, l) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) l.body.querySelector('[data-send]').click(); }
      }
    });
  }
  PC.openChat = openChat;

  /* ---------- 个人抽屉 ---------- */
  function openMyPosts() {
    const l = UI.open({
      kind: 'drawer', title: '发帖记录',
      render: () => {
        const list = S.myPosts();
        return `<div class="my-drawer"><div class="my-drawer__list" data-keep-scroll="mp">
          ${list.length ? list.map(p => PC.postCard(p, { actions: true })).join('') + '<p class="bbs-home__tip">暂无更多发帖</p>' : PC.empty('暂无发帖')}
        </div></div>`;
      }
    });
    PC.bindPostCards(l.body);
  }
  function openMyComments() {
    const l = UI.open({
      kind: 'drawer', title: '回复列表',
      render: () => {
        const list = S.myCommentedPosts();
        return `<div class="my-drawer"><p class="my-drawer__tip">红色角标表示该帖有未读回复</p><div class="my-drawer__list" data-keep-scroll="mc">
          ${list.length ? list.map(p => PC.postCard(p, { badge: p.unreadCount })).join('') + '<p class="bbs-home__tip">暂无更多回复</p>' : PC.empty('暂无评论及回复')}
        </div></div>`;
      }
    });
    PC.bindPostCards(l.body);
  }
  function openMyMessages() {
    UI.open({
      kind: 'drawer', title: '私信列表',
      render: () => {
        const list = S.sessions();
        return `<div class="my-drawer"><div class="my-drawer__list">
          ${list.length ? list.map(s => `<div class="msg-item" data-chat="${s.peerUserId}">${avatar(s, 'avatar--md')}
            <div class="msg-item__main"><div class="msg-item__name">${esc(s.peerNc)}</div><div class="msg-item__last">${s.fsrid === S.me().id ? '我：' : ''}${esc(s.nr)}</div></div>
            <div class="msg-item__side"><span>${S.relTime(s.cjsj)}</span>${s.unreadCount ? `<span class="msg-item__badge">${s.unreadCount}</span>` : ''}<button class="btn btn--sm btn--plain btn--round">回复</button></div>
          </div>`).join('') + '<p class="bbs-home__tip">暂无更多私信</p>' : PC.empty('暂无私信')}
        </div></div>`;
      },
      on: { 'click [data-chat]': (e, el) => openChat(el.dataset.chat) }
    });
  }
  function openDrafts(onPick) {
    UI.open({
      kind: 'dialog', cls: 'drafts-dlg', title: '草稿箱列表',
      render: () => {
        const list = S.drafts();
        return `<div class="table-wrap" style="max-height:2.6rem"><table class="table">
          <thead><tr><th>标题</th><th>类型</th><th>话题分类</th><th>最后编辑时间</th><th>操作</th></tr></thead>
          <tbody>${list.length ? list.map(d => {
            const t = d.ht ? S.topicByCode(d.ht) : null;
            return `<tr><td class="ellipsis" style="max-width:1.2rem">${esc(d.bt || '未命名草稿')}</td><td>${d.lx ? S.LX_MAP[d.lx].label : '—'}</td><td>${t ? esc(t.htmc) : '其他'}</td><td>${S.fmtDateTime(d.gxsj)}</td>
              <td><div class="ops"><button class="btn-link" data-edit="${d.id}">编辑</button><button class="btn-link btn-link--danger" data-del="${d.id}">删除</button></div></td></tr>`;
          }).join('') : `<tr class="table__empty"><td colspan="5">暂无草稿</td></tr>`}</tbody></table></div>
          <div class="dlg-foot"><button class="btn" data-close>关闭</button><button class="btn btn--primary" data-close>确定</button></div>`;
      },
      on: {
        'click [data-edit]': (e, el, l) => { l.close(); UI.closeAll(); if (onPick) onPick(el.dataset.edit); else PC.go('/bbs/post/publish', { draft: el.dataset.edit }); },
        'click [data-del]': (e, el) => UI.confirm('确定删除该草稿？删除后不可恢复。', { title: '删除草稿', ok: '删除', danger: true }).then(ok => { if (ok) { S.deleteDraft(el.dataset.del); toast('已删除', 'success'); } })
      }
    });
  }
  PC.openDrafts = openDrafts;
  function openAccountEdit() {
    const me = S.me();
    UI.open({
      kind: 'dialog', cls: 'aed', title: '编辑个人信息', state: { tx: me.tx },
      render: l => {
        const u = S.me();
        return `<div class="form">
          <div class="form-item"><label class="form-item__label req">我的昵称</label><div class="form-item__ctrl">
            <div class="f-c" style="gap:.04167rem"><input class="input" maxlength="20" data-keep="nc" value="${esc(u.nc)}" placeholder="请输入"><button class="btn" data-rand>随机昵称</button></div>
            <div class="form-item__hint">每30天可修改昵称和头像共3次（从第一次修改起算）（剩余 ${u.ncChangeRemain} 次）</div></div></div>
          <div class="form-item"><label class="form-item__label">我的头像</label><div class="form-item__ctrl">
            <div class="aed__avatar-row">${avatar({ tx: l.state.tx, nc: u.nc }, 'avatar--xl')}<button class="btn btn--plain" data-upload>本地上传</button></div>
            <div class="form-item__hint">仅支持 JPG、PNG 格式，大小不超过 2MB</div></div></div>
        </div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`;
      },
      on: {
        'click [data-rand]': (e, el, l) => { l.body.querySelector('[data-keep="nc"]').value = S.randomNick(); },
        'click [data-upload]': async (e, el, l) => {
          const [img] = await UI.pickImages({ max: 1, maxMB: 2, accept: 'image/jpeg,image/png' });
          if (img) { l.state.tx = img; l.refresh(); toast('上传成功', 'success'); }
        },
        'click [data-ok]': (e, el, l) => {
          const nc = l.body.querySelector('[data-keep="nc"]').value.trim();
          if (!nc) { toast('请输入昵称', 'warning'); return; }
          if (nc.length < 2 || nc.length > 20) { toast('昵称长度为 2-20 字', 'warning'); return; }
          S.updateProfile({ nc, tx: l.state.tx }); toast('已保存', 'success'); l.close();
        }
      }
    });
  }
  PC.openAccountEdit = openAccountEdit;
  function openProfilePrompt() {
    if (UI.layers.some(l => l.el.classList.contains('ppd'))) return;
    UI.open({
      kind: 'dialog', cls: 'ppd', title: '使用提示',
      render: () => `<div class="ppd__body"><img class="ppd__mascot" src="assets/h5/profile-prompt-mascot.png" alt="">
        <div class="ppd__text">为保障论坛交流规范，首次使用请先修改昵称、上传头像，完成资料更新后解锁<b class="c-primary">【中南点点】</b>全部互动功能！</div>
        <button class="btn btn--primary btn--round btn--lg" data-go>立即修改</button></div>`,
      on: { 'click [data-go]': (e, el, l) => { l.close(); openAccountEdit(); } }
    });
  }
  PC.openProfilePrompt = openProfilePrompt;
  function openRule(key) {
    const r = RULES[key];
    UI.open({
      kind: 'dialog', cls: 'rule-dlg', title: esc(r.title),
      render: () => `<div class="rule-article">
        <div class="rule-article__head"><img src="assets/pc/rules-badge-${BADGE[key]}-full.svg" alt=""><div><div class="rule-article__title">${esc(r.title)}</div><div class="rule-article__meta">${r.views} · ${esc(r.sub)}</div></div></div>
        ${renderRuleArticle(key)}</div>
        <div class="dlg-foot"><button class="btn btn--primary" data-close>关闭</button></div>`
    });
  }
  function openLxDialog() {
    if (!PC.canInteract()) return;
    UI.open({
      kind: 'dialog', cls: 'lxd', title: '选择类型<span class="underline-deco"></span>',
      render: () => `<div class="lxd__grid">${S.LX.map(x => `<div class="lxd__card" style="background:${x.bg}" data-lx="${x.value}">
        <div class="lxd__icon"><img src="assets/pc/tab-${x.value}.svg" alt=""></div>
        <div class="lxd__name lx--${x.tone}" style="background:none">${x.label}<i></i></div><div class="lxd__desc">${x.desc}</div></div>`).join('')}</div>`,
      on: { 'click [data-lx]': (e, el, l) => { l.close(); PC.go('/bbs/post/publish', { lx: el.dataset.lx }); } }
    });
  }

  /* ---------- 首页 ---------- */
  const BANNERS = ['assets/pc/banner-central-south.webp', 'assets/pc/banner-campus.webp', 'assets/pc/banner-knowledge-action.webp'];
  const CATS = [{ v: '', label: '全部', icon: 'tab-all' }].concat(S.LX.map(x => ({ v: x.value, label: x.label, icon: 'tab-' + x.value })));
  let bannerTimer = null, lottieAnim = null;
  PC.pages['/bbs/home/index'] = {
    title: '中南点点',
    init: q => ({ lx: '', sort: 'latest', kw: '', limit: 10, banner: 0, openPost: q.post, onlyVote: q.vote === '1' }),
    render(st) {
      const all = S.listPosts({ lx: st.lx, sort: st.sort, kw: st.kw, hasVote: st.onlyVote });
      const list = all.slice(0, st.limit);
      const me = S.me(), stats = S.myStats();
      const hot = S.hotTop5(), rank = S.weekDeptRank();
      return `<div class="bbs-home" data-keep-scroll="home">
        <div class="bbs-home__background"><img src="assets/pc/page-cloud-bg.webp" alt=""><img class="r" src="assets/pc/page-cloud-bg.webp" alt=""></div>
        <div class="bbs-home__layout">
          <div class="bbs-home__main">
            <div class="home-banner">
              <div class="home-banner__track" style="transform:translateX(-${st.banner * 100}%)">${BANNERS.map((b, i) => `<img src="${b}" alt="${['中南点点，学校新鲜事', '中南大学', '知行合一，经世致用'][i]}">`).join('')}</div>
              <div class="home-banner__dots">${BANNERS.map((b, i) => `<button class="home-banner__dot ${i === st.banner ? 'is-active' : ''}" data-banner="${i}" aria-label="切换到第 ${i + 1} 张"></button>`).join('')}</div>
            </div>
            <div class="cat-bar">
              <div class="cat-bar__tabs">${CATS.map(c => `<button class="cat-bar__item ${st.lx === c.v ? 'is-active' : ''}" data-cat="${c.v}"><img src="assets/pc/${c.icon}.svg" alt="">${c.label}</button>`).join('')}</div>
              <button class="publish-btn" data-act="publish" title="发布心声"><div class="publish-btn__anim" id="publishAnim"></div>${window.lottie ? '' : '<span class="publish-btn__fallback">✈ 发布心声</span>'}</button>
            </div>
            <div class="bbs-home__toolbar">
              <div class="sort-bar">
                <button class="sort-bar__item ${st.sort === 'hot' ? 'is-active' : ''}" data-sort="hot">热度最高<span class="underline-deco"></span></button>
                <span class="sort-bar__sep"></span>
                <button class="sort-bar__item ${st.sort === 'latest' ? 'is-active' : ''}" data-sort="latest">最新发布<span class="underline-deco"></span></button>
                <span class="sort-bar__sep"></span>
                <button class="sort-bar__vote ${st.onlyVote ? 'is-on' : ''}" data-only-vote title="只显示带投票的帖子"><i class="vt-ico"></i>只看投票</button>
              </div>
              <label class="bbs-home__search"><img src="assets/h5/icon-search.svg" alt=""><input data-keep="kw" placeholder="搜索昵称、标题或内容" value="${esc(st.kw)}">${st.kw ? '<button class="bbs-home__search-clear" data-act="clearKw" title="清空搜索">✕</button>' : ''}</label>
            </div>
            <div class="bbs-home__list">
              ${list.length ? list.map(p => PC.postCard(p)).join('') : `<div class="bbs-home__empty">${st.onlyVote ? '暂无投票帖' : '暂无帖子'}</div>`}
            </div>
            ${list.length ? `<p class="bbs-home__tip">${all.length > list.length ? '加载中…' : '暂无更多帖子'}</p>` : ''}
          </div>
          <aside class="bbs-home__side">
            <section class="profile-card">
              <div class="f-sb" style="align-items:flex-start"><div class="side-head"><h3 class="side-head__title">账号与权限</h3><span class="underline-deco"></span></div>
                <div class="f-c" style="gap:.0625rem">
                  <button class="profile-card__reports profile-card__votes" data-act="myVotes"><i class="vt-ico"></i>我的投票${S.unseenVotes() ? '<i class="profile-card__dot"></i>' : ''}</button>
                  <button class="profile-card__reports" data-act="reports"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/></svg>我的举报</button></div></div>
              <div class="profile-card__body">
                <div class="f-sb"><div class="f-c" style="gap:.04167rem;min-width:0">${avatar(me, 'avatar--md')}<div style="min-width:0"><div class="profile-card__nick ellipsis">${esc(me.nc)}</div><div class="profile-card__motto ellipsis">守护校园言论，安心管理～</div></div></div>
                  <button class="profile-card__edit" data-act="editProfile">${ICON.edit}编辑</button></div>
                <div class="profile-card__divider"></div>
                <div class="profile-card__stats">
                  <button class="profile-card__stat" data-act="myPosts"><span class="profile-card__num profile-card__num--orange">${stats.posts}</span><span class="profile-card__label">我的发帖</span></button>
                  <button class="profile-card__stat" data-act="myComments"><span class="profile-card__num profile-card__num--blue">${stats.comments}${Object.keys(S.db.replyBadge[me.id] || {}).length ? '<i class="profile-card__dot"></i>' : ''}</span><span class="profile-card__label">评论及回复</span></button>
                  <button class="profile-card__stat" data-act="myMessages"><span class="profile-card__num profile-card__num--red">${stats.messages}${stats.unreadMsg ? '<i class="profile-card__dot"></i>' : ''}</span><span class="profile-card__label">我的私信</span></button>
                  <button class="profile-card__stat" data-act="myDrafts"><span class="profile-card__num profile-card__num--green">${stats.drafts}</span><span class="profile-card__label">草稿箱</span></button>
                </div>
              </div>
            </section>
            <section class="hot-card">
              <img class="hot-card__bg" src="assets/pc/hot-card-bg.png" alt=""><img class="hot-card__mascot" src="assets/pc/hot-mascot.webp" alt="">
              <div class="hot-card__head"><img class="hot-card__title-img" src="assets/pc/hot-title.svg" alt="热议话题榜"><p class="hot-card__sub">本周热议排行榜TOP5</p></div>
              <div class="hot-card__list">${hot.length ? hot.map((p, i) => `${i ? '<div class="hot-card__divider"></div>' : ''}<button class="hot-card__row" data-open="${p.id}"><span class="hot-card__rank"><img src="assets/pc/i-HotTop5Card-0.svg" alt=""><span>${i + 1}</span></span><span class="hot-card__hash">#</span><span class="hot-card__txt">${esc(p.bt)}</span></button>`).join('') : '<p class="hot-card__empty">暂无热议</p>'}</div>
            </section>
            <section class="dept-rank">
              <img class="dept-rank__deco" src="assets/pc/dept-rank-deco.webp" alt="">
              <div class="side-head"><h3 class="side-head__title">本周反馈排行榜</h3><span class="underline-deco"></span></div>
              <div class="dept-rank__table">
                <div class="dept-rank__thead"><span style="text-align:center">排名</span><span>地点</span><span>数量(件)</span></div>
                ${rank.length ? rank.map((r, i) => `<div class="dept-rank__tr ${i < 3 ? 'dept-rank__tr--top' : 'dept-rank__tr--plain'}"><span class="dept-rank__rank">${i < 3 ? `<img src="assets/pc/top-badge-${i + 1}.svg" alt="">` : i + 1}</span><span class="dept-rank__name">${esc(r.bmmc)}</span><span class="dept-rank__count">${r.count}</span></div>`).join('') : '<p class="dept-rank__empty">暂无数据</p>'}
              </div>
            </section>
            <section class="rules-card">
              <div class="side-head"><h3 class="side-head__title">规范制度与介绍说明</h3><span class="underline-deco"></span></div>
              <div class="rules-card__list">${['policy', 'council', 'report'].map(k => `<button class="rules-card__item" data-rule="${k}"><span class="f-c" style="gap:.04167rem"><img class="rules-card__badge" src="assets/pc/rules-badge-${BADGE[k]}-full.svg" alt=""><span><div class="rules-card__name">${RULES[k].title}</div><div class="rules-card__desc">${RULES[k].sub}</div></span></span><span class="rules-card__arrow"><img src="assets/pc/i-RulesLinksCard-0.svg" alt=""></span></button>`).join('')}</div>
            </section>
          </aside>
        </div>
      </div>`;
    },
    bind(root, st) {
      const rerender = () => PC.refresh();
      PC.bindPostCards(root);
      UI.delegate(root, 'click', '[data-cat]', (e, el) => { st.lx = el.dataset.cat; st.limit = 10; rerender(); });
      UI.delegate(root, 'click', '[data-sort]', (e, el) => { st.sort = el.dataset.sort; st.limit = 10; rerender(); });
      UI.delegate(root, 'click', '[data-only-vote]', () => { st.onlyVote = !st.onlyVote; st.limit = 10; rerender(); });
      UI.delegate(root, 'click', '[data-banner]', (e, el) => { st.banner = +el.dataset.banner; rerender(); });
      UI.delegate(root, 'click', '[data-open]', (e, el) => PC.openPost(el.dataset.open));
      UI.delegate(root, 'click', '[data-rule]', (e, el) => openRule(el.dataset.rule));
      let kwTimer;
      UI.delegate(root, 'input', '[data-keep="kw"]', (e, el) => { clearTimeout(kwTimer); kwTimer = setTimeout(() => { st.kw = el.value; st.limit = 10; rerender(); }, 250); });
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'publish') openLxDialog();
        else if (a === 'clearKw') { e.preventDefault(); st.kw = ''; root.querySelector('[data-keep="kw"]').value = ''; rerender(); }
        else if (a === 'reports') PC.go('/bbs/profile/reports');
        else if (a === 'editProfile') openAccountEdit();
        else if (a === 'myPosts') openMyPosts();
        else if (a === 'myComments') openMyComments();
        else if (a === 'myMessages') openMyMessages();
        else if (a === 'myDrafts') openDrafts();
        else if (a === 'myVotes') openMyVotes();
      });
      root.addEventListener('scroll', e => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('bbs-home')) return;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 120) {
          const total = S.listPosts({ lx: st.lx, sort: st.sort, kw: st.kw, hasVote: st.onlyVote }).length;
          if (st.limit < total) { st.limit += 10; rerender(); }
        }
      }, true);
      clearInterval(bannerTimer);
      bannerTimer = setInterval(() => {
        if (PC.page !== PC.pages['/bbs/home/index'] || !document.querySelector('.home-banner__track')) return;
        st.banner = (st.banner + 1) % BANNERS.length;
        document.querySelector('.home-banner__track').style.transform = `translateX(-${st.banner * 100}%)`;
        document.querySelectorAll('.home-banner__dot').forEach((d, i) => d.classList.toggle('is-active', i === st.banner));
      }, 5000);
    },
    mounted(root, st, isRefresh) {
      const box = root.querySelector('#publishAnim');
      if (window.lottie && box) {
        if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
        lottieAnim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: true, path: 'assets/pc/jimeng.json' });
      }
      if (!isRefresh) {
        if (st.openPost) { const id = st.openPost; st.openPost = null; setTimeout(() => PC.openPost(id), 50); }
        else if (S.me().sfwczl !== '1' && !sessionStorage.getItem('zndd_prompted_' + S.me().id)) {
          sessionStorage.setItem('zndd_prompted_' + S.me().id, '1');
          setTimeout(openProfilePrompt, 200);
        }
      }
    }
  };

  /* ---------- 发布 / 编辑 ---------- */
  PC.pages['/bbs/post/publish'] = {
    title: '发布心声',
    init(q) {
      const st = { mode: 'new', id: q.id || '', draftId: q.draft || '', lx: q.lx || '', ht: '', bt: '', nr: '', tps: [], vote: null, hadVote: false, loaded: false };
      if (q.id) {
        const p = S.getPost(q.id);
        if (!p || p.ztbq === 'deleted') { setTimeout(() => { toast('帖子不存在或已删除', 'error'); PC.go('/bbs/home/index'); }); return st; }
        Object.assign(st, { mode: 'edit', lx: p.lx, ht: p.ht === 'other' ? '' : p.ht, bt: p.bt, nr: p.nr, tps: p.tps.slice(), vote: p.vote ? VoteUI.edFrom(p.vote, p.vote.ballots.length) : null, hadVote: !!p.vote });
      } else if (q.draft) {
        const d = S.getDraft(q.draft);
        if (!d) { setTimeout(() => toast('草稿不存在或已删除', 'error')); st.draftId = ''; }
        else Object.assign(st, { mode: 'draft', lx: d.lx, ht: d.ht, bt: d.bt, nr: d.nr, tps: d.tps.slice(), vote: VoteUI.edFrom(d.vote) });
      }
      return st;
    },
    render(st) {
      const title = st.mode === 'edit' ? '编辑帖子' : st.mode === 'draft' ? '编辑草稿' : '发布新帖';
      const lx = S.LX_MAP[st.lx];
      const topics = S.activeTopics();
      const valid = st.lx && st.bt.trim() && st.nr.trim();
      return `<div class="bbs-publish">
        <div class="bbs-publish__bg"><img src="assets/pc/publish-page-bg.webp" alt=""></div>
        <div class="bbs-publish__shell"><div class="publish-card">
          <div class="publish-tab"><button class="publish-tab__nav" data-act="back" title="返回">←</button><span class="publish-tab__label">发布心声<button data-act="back" title="关闭">×</button></span><button class="publish-tab__nav" style="margin-left:auto" disabled title="前进">→</button></div>
          <div class="publish-panel">
            <div class="publish-panel__head"><div class="side-head"><h3 class="side-head__title">${title}</h3><span class="underline-deco"></span></div>
              ${st.mode === 'edit' ? '' : `<button class="publish-panel__drafts" data-act="drafts"><img src="assets/h5/icon-folder-draft.svg" alt="">草稿箱(${S.drafts().length})</button>`}</div>
            <div class="publish-selects">
              <label class="publish-select"><span class="publish-select__label"><em>*</em> 选择类型：</span>
                <span class="publish-select__val ${lx ? '' : 'is-ph'}">${lx ? `<img src="assets/pc/tab-${st.lx}.svg" alt="">${lx.label}` : '请选择'}</span>
                <svg class="publish-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                <select data-field="lx"><option value="">请选择</option>${S.LX.map(x => `<option value="${x.value}" ${x.value === st.lx ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
              ${st.lx === 'feedback' ? `<label class="publish-select"><span class="publish-select__label">话题分类：</span>
                <span class="publish-select__val ${st.ht ? '' : 'is-ph'}">${st.ht ? esc((S.topicByCode(st.ht) || {}).htmc || '其他') + ' <span class="c-light" style="font-weight:400">· ' + esc((topics.find(t => t.htbh === st.ht) || {}).bmmc || '') + '</span>' : '其他（不指定部门）'}</span>
                <svg class="publish-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                <select data-field="ht"><option value="">其他（不指定部门）</option>${topics.map(t => `<option value="${t.htbh}" ${t.htbh === st.ht ? 'selected' : ''}>${esc(t.htmc)} · ${esc(t.bmmc)}</option>`).join('')}</select></label>` : ''}
            </div>
            <div class="publish-field"><span class="publish-field__label"><em>*</em>标题：</span><input class="input" maxlength="100" data-field="bt" data-keep="bt" placeholder="请输入你的内容标题" value="${esc(st.bt)}"></div>
            <div class="publish-field"><span class="publish-field__label"><em>*</em>内容：</span><textarea class="textarea" maxlength="800" data-field="nr" data-keep="nr" placeholder="请输入你的内容">${esc(st.nr)}</textarea></div>
            <div class="publish-upload" data-act="upload"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42'%3E%3Cpath d='M4 10a4 4 0 014-4h9l4 4h13a4 4 0 014 4v18a4 4 0 01-4 4H8a4 4 0 01-4-4z' fill='%233087CC'/%3E%3Ccircle cx='21' cy='22' r='7' fill='%23fff'/%3E%3Cpath d='M21 26v-7M18 21.5l3-3 3 3' stroke='%233087CC' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" alt="">
              <p class="publish-upload__title">点击或拖拽上传图片（最多12张）</p><p class="publish-upload__hint">支持 jpg、png、gif，小于 10MB</p></div>
            ${st.tps.length ? `<div class="thumbs">${st.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" alt=""><button class="thumb__del" data-del-img="${i}">×</button></div>`).join('')}</div>` : ''}
            ${st.vote ? VoteUI.editor(st.vote) : '<button class="publish-vote-add" data-act="addVote"><i class="vt-ico"></i>添加投票<span>征集意见、评选活动，让大家直接投票</span></button>'}
            <div class="publish-footer">
              ${st.mode === 'edit' ? '' : '<button class="publish-footer__draft" data-act="saveDraft">保存草稿</button>'}
              <button class="publish-footer__submit ${valid ? 'is-active' : ''}" data-act="submit">${st.mode === 'edit' ? '保存修改' : '发布内容'}</button>
            </div>
            <p class="publish-tip">${WARN}</p>
          </div>
        </div></div>
      </div>`;
    },
    bind(root, st) {
      const syncBtn = () => {
        const b = root.querySelector('.publish-footer__submit');
        if (b) b.classList.toggle('is-active', !!(st.lx && st.bt.trim() && st.nr.trim()));
      };
      UI.delegate(root, 'input', '[data-field="bt"],[data-field="nr"]', (e, el) => { st[el.dataset.field] = el.value; syncBtn(); });
      UI.delegate(root, 'change', 'select[data-field]', (e, el) => { st[el.dataset.field] = el.value; if (el.dataset.field === 'lx' && el.value !== 'feedback') st.ht = ''; PC.refresh(); });
      const addFiles = async files => {
        if (st.tps.length >= 12) { toast('最多上传 12 张图', 'warning'); return; }
        st.tps.push(...files.slice(0, 12 - st.tps.length)); toast('上传成功', 'success'); PC.refresh();
      };
      root.addEventListener('dragover', e => { const z = e.target.closest('.publish-upload'); if (z) { e.preventDefault(); z.classList.add('is-drag'); } });
      root.addEventListener('dragleave', e => { const z = e.target.closest('.publish-upload'); if (z) z.classList.remove('is-drag'); });
      root.addEventListener('drop', async e => {
        const z = e.target.closest('.publish-upload');
        if (!z) return;
        e.preventDefault();
        const imgs = [];
        for (const f of [...e.dataTransfer.files].filter(f => /image\/(jpeg|png|gif)/.test(f.type))) {
          if (f.size > 10 * 1024 * 1024) { toast('单张图片不能超过 10MB', 'warning'); continue; }
          imgs.push(await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }));
        }
        addFiles(imgs);
      });
      UI.delegate(root, 'click', '[data-del-img]', (e, el) => { st.tps.splice(+el.dataset.delImg, 1); PC.refresh(); });
      const onVoteEd = e => { if (VoteUI.onEditor(e, st.vote, PC.refresh) === 'remove') { st.vote = null; PC.refresh(); } };
      ['input', 'change', 'click'].forEach(t => root.addEventListener(t, onVoteEd));
      UI.delegate(root, 'click', '[data-act]', UI.guard(async (e, el) => {
        const a = el.dataset.act;
        if (a === 'addVote') { st.vote = VoteUI.edNew(); PC.refresh(); }
        else if (a === 'back') PC.back();
        else if (a === 'drafts') openDrafts(id => PC.go('/bbs/post/publish', { draft: id }));
        else if (a === 'upload') { const imgs = await UI.pickImages({ max: 12, existing: st.tps.length }); if (imgs.length) addFiles(imgs); }
        else if (a === 'saveDraft') {
          if (!PC.canInteract()) return;
          const d = S.saveDraft({ id: st.draftId, lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: VoteUI.toDraft(st.vote) });
          st.draftId = d.id; st.mode = 'draft'; toast('草稿已保存', 'success'); PC.refresh();
        } else if (a === 'submit') {
          if (!(st.lx && st.bt.trim() && st.nr.trim())) { toast('请完善必填项', 'warning'); return; }
          if (!PC.canInteract()) return;
          const vote = VoteUI.toConfig(st.vote);
          if (st.mode === 'edit') { S.updatePost(st.id, { lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote: vote || (st.hadVote ? null : undefined) }); toast('保存成功', 'success'); }
          else {
            S.createPost({ lx: st.lx, ht: st.ht, bt: st.bt, nr: st.nr, tps: st.tps, vote });
            if (st.draftId) S.deleteDraft(st.draftId);
            toast('发布成功', 'success');
          }
          PC.go('/bbs/home/index');
        }
      }));
    }
  };

  /* ---------- 我的举报 ---------- */
  const RP_STATUS = r => r.zt === 'pending' ? { cls: '', txt: '审核中', sub: '管理员正在核实，请耐心等待' }
    : r.result === 'violation' ? { cls: 'violated', txt: '已处理', sub: '违规成立 · 帖子已删除' } : { cls: 'passed', txt: '已处理', sub: '经核实未违规，予以保留' };
  function openReportDetail(id) {
    const r = S.myReports().find(x => x.id === id);
    if (!r) return;
    const s = RP_STATUS(r);
    const p = r.post;
    const done = r.zt === 'done';
    UI.open({
      kind: 'dialog', cls: 'rdd', title: '详情<span class="underline-deco"></span>',
      render: () => `<div class="rdd__body">
        <div class="rdd__banner ${done ? '' : 'rdd__banner--pending'}"><div><div class="rdd__banner-title">${s.txt}</div><div class="rdd__banner-sub">${done ? (r.result === 'violation' ? '违规成立 · 帖子已删除' : '未违规 · 内容予以保留') : s.sub}</div></div></div>
        <div><h4 class="rdd__sec-title">被举报内容<span class="underline-deco"></span></h4>
          <div class="rdd__post">${p ? `<div class="f-c" style="gap:.04167rem">${avatar(p)}<b style="font-size:.07292rem">${esc(p.fbrnc)}</b></div>
            <div class="f-c" style="gap:.05208rem;min-width:0"><span class="rp-item__title">${esc(p.bt)}</span><span class="board-chip">${esc(p.lxLabel)}</span></div>
            <div class="f-sb" style="align-items:flex-end;gap:.08333rem"><p class="rp-item__content clamp2" style="flex:1">${p.ztbq === 'deleted' ? '（该帖子已被删除）' : esc(p.nr)}</p>
            <span class="f-c c-muted" style="gap:.10417rem;font-size:.07292rem"><span class="f-c" style="gap:.02604rem"><img src="${ICON.eye}" width="14" alt="">${p.llcs}</span><span class="f-c" style="gap:.02604rem"><img src="${ICON.like}" width="12" alt="">${p.dzs}</span><span class="f-c" style="gap:.02604rem"><img src="${ICON.cmt}" width="14" alt="">${p.pls}</span></span></div>` : '<p class="rp-item__content">（该帖子已被删除）</p>'}</div></div>
        <div><h4 class="rdd__sec-title">我的举报信息<span class="underline-deco"></span></h4>
          <div class="rdd__table"><div class="rdd__row"><div class="rdd__cell"><span class="rdd__cell-label">举报类型</span><span class="rdd__chip">${esc(r.jblx || '其他违规')}</span></div><div class="rdd__cell"><span class="rdd__cell-label">举报时间</span><span class="rdd__cell-val">${S.fmtDateTime(r.cjsj)}</span></div><div class="rdd__cell"><span class="rdd__cell-label">举报编号</span><span class="rdd__cell-val">${r.jbbh}</span></div></div>
          <div class="rdd__row rdd__row--full"><div class="rdd__cell"><span class="rdd__cell-label">举报说明</span><span class="rdd__cell-val">${esc(r.jbsm || '—')}</span></div></div></div></div>
        <div><h4 class="rdd__sec-title">处理进度<span class="underline-deco"></span></h4>
          <div class="rdd__step rdd__step--done"><span class="rdd__dot">✓</span><div><div class="rdd__step-title">举报已提交<span class="rdd__step-tag">已提交</span></div><div class="rdd__step-sub">${S.fmtDateTime(r.cjsj)}</div></div></div>
          <div class="rdd__step ${done ? 'rdd__step--done' : 'rdd__step--current'}"><span class="rdd__dot">${done ? '✓' : '2'}</span><div><div class="rdd__step-title">管理员审核中${done ? '<span class="rdd__step-tag">已完成</span>' : '<span class="rdd__step-tag rdd__step-tag--doing">进行中</span>'}</div><div class="rdd__step-sub">预计 1-3 个工作日内完成</div></div></div>
          <div class="rdd__step ${done ? 'rdd__step--done' : 'rdd__step--todo'}"><span class="rdd__dot">${done ? '✓' : '3'}</span><div><div class="rdd__step-title">处理完成并反馈</div>${done ? `<div class="rdd__step-sub">${S.fmtDateTime(r.clsj)}</div>` : ''}</div></div></div>
        ${done ? `<div><h4 class="rdd__sec-title">处理结果与反馈<span class="underline-deco"></span></h4>
          <div class="rdd__table"><div class="rdd__row"><div class="rdd__cell"><span class="rdd__cell-label">处理结论</span><span class="rdd__cell-val ${r.result === 'violation' ? 'c-danger' : 'c-success'}" style="font-weight:600">${r.result === 'violation' ? '违规成立' : '未违规'}</span></div><div class="rdd__cell"><span class="rdd__cell-label">处理时间</span><span class="rdd__cell-val">${S.fmtDateTime(r.clsj)}</span></div><div class="rdd__cell"><span class="rdd__cell-label">处理人</span><span class="rdd__cell-val">${esc(r.clr || '社区管理员')}</span></div></div>
          <div class="rdd__row rdd__row--full"><div class="rdd__cell"><span class="rdd__cell-label">详情</span><span class="rdd__cell-val">${esc(r.clsm || '暂无处理说明')}</span></div></div></div></div>` : ''}
        <p class="rdd__tip">对处理结果有疑问？可在「意见反馈」中联系社区管理员</p>
      </div>`
    });
  }
  PC.pages['/bbs/profile/reports'] = {
    title: '我的举报',
    init: () => ({ tab: '', page: 1, pageSize: 10 }),
    render(st) {
      const all = S.myReports(st.tab);
      const list = all.slice((st.page - 1) * st.pageSize, st.page * st.pageSize);
      const TABS = [['', '全部'], ['pending', '审核中'], ['done', '已处理']];
      return `<div class="rp-page">
        <div class="rp-bg"><img src="assets/pc/reports-page-bg.webp" alt=""></div>
        <div class="rp-shell"><div class="rp-card">
          <div class="rp-tab"><button class="btn-link" data-act="back" title="返回" style="color:#3087cc">←</button><span class="rp-tab__chip">我的举报<button data-act="back" title="关闭">×</button></span></div>
          <div class="rp-panel">
            <div class="rp-tabs">${TABS.map(([v, t], i) => `${i ? '<span class="rp-tabs__divider"></span>' : ''}<button class="rp-tabs__tab ${st.tab === v ? 'is-active' : ''}" data-tab="${v}">${t}<span class="underline-deco"></span></button>`).join('')}</div>
            ${list.length ? `<div class="rp-grid">${list.map(r => {
              const s = RP_STATUS(r), p = r.post;
              return `<div class="rp-item" data-rp="${r.id}">
                <div class="f-sb"><span class="rp-item__type">${esc(r.jblx || '其他违规')}</span><span class="rp-item__status ${s.cls ? 'rp-item__status--' + s.cls : ''}">${s.txt} ›</span></div>
                <div class="rp-item__post">
                  <div class="f-c" style="gap:.04167rem">${p ? avatar(p) : avatar({ nc: '匿' })}<span class="rp-item__nick">${p ? esc(p.fbrnc) : '匿名用户'}</span></div>
                  <div class="rp-item__title-row"><span class="rp-item__title">${p ? esc(p.bt) : '（该帖子已被删除）'}</span>${p ? `<span class="board-chip">${esc(p.lxLabel)}</span>` : ''}</div>
                  <p class="rp-item__content clamp2">${p && p.ztbq !== 'deleted' ? esc(p.nr) : '（该帖子已被删除）'}</p>
                  <img class="rp-item__stamp" src="assets/pc/stamp-${r.zt === 'pending' ? 'pending' : 'passed'}.svg" alt="">
                </div>
                <span class="rp-item__time">${S.fmtDateTime(r.cjsj)} · ${s.sub}</span>
              </div>`;
            }).join('')}</div>${PC.pager(all.length, st.page, st.pageSize, 'page', [10, 20])}` : PC.empty('暂无举报记录')}
          </div>
        </div></div>
      </div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-tab]', (e, el) => { st.tab = el.dataset.tab; st.page = 1; PC.refresh(); });
      UI.delegate(root, 'click', '[data-rp]', (e, el) => openReportDetail(el.dataset.rp));
      UI.delegate(root, 'click', '[data-act="back"]', () => PC.back());
      PC.bindPager(root, st, PC.refresh);
    }
  };
})();
