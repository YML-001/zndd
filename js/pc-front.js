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
        <div class="lxd__name lx--${x.tone}" style="background:none">${x.label}<i></i></div><div class="lxd__desc">${x.desc}</div></div>`).join('')}
        <div class="lxd__card" style="background:#E8F5FF" data-lx="lost"><div class="lxd__icon"><img src="assets/pc/tab-lost.svg" alt=""></div>
        <div class="lxd__name lx--blue" style="background:none">失物招领<i></i></div><div class="lxd__desc">捡到物品或寻物求助</div></div></div>`,
      on: { 'click [data-lx]': (e, el, l) => { l.close(); PC.go('/bbs/post/publish', { lx: el.dataset.lx }); } }
    });
  }

  /* ---------- 首页 ---------- */
  const BANNERS = ['assets/pc/banner-central-south.webp', 'assets/pc/banner-campus.webp', 'assets/pc/banner-knowledge-action.webp'];
  const CATS = [{ v: '', label: '全部', icon: 'tab-all' }].concat(S.LX.map(x => ({ v: x.value, label: x.label, icon: 'tab-' + x.value })));
  const lostEntry = active => {
    const sta = S.lfStation();
    return `<button class="lost-entry ${active ? 'is-active' : ''}" data-act="lostEntry"><img src="assets/pc/tab-lost.svg" alt="" ${active ? 'style="--fill-0:#fff;--stroke-0:#fff"' : ''}><span class="lost-entry__name">失物招领</span><span class="lost-entry__sub">待认领 ${sta.pending} · 寻找中 ${sta.seeking}</span>${active ? '' : '<span class="lost-entry__go">进入</span>'}</button>`;
  };
  let bannerTimer = null, lottieAnim = null;
  PC.pages['/bbs/home/index'] = {
    title: '中南点点',
    init: q => ({ lx: q.lx in S.LX_MAP ? q.lx : '', sort: 'latest', kw: '', limit: 10, banner: 0, openPost: q.post, onlyVote: q.vote === '1' }),
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
            ${lostEntry(false)}
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
        if (a === 'lostEntry') PC.go('/bbs/lost/index');
        else if (a === 'publish') openLxDialog();
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
      const st = { mode: 'new', id: q.id || '', draftId: q.draft || '', lx: q.lx || '', ht: '', bt: '', nr: '', tps: [], vote: null, hadVote: false, loaded: false, lf: null };
      if (q.id) {
        const p = S.getPost(q.id);
        if (!p || p.ztbq === 'deleted') { setTimeout(() => { toast('帖子不存在或已删除', 'error'); PC.go('/bbs/home/index'); }); return st; }
        Object.assign(st, { mode: 'edit', lx: p.lx, ht: p.ht === 'other' ? '' : p.ht, bt: p.bt, nr: p.nr, tps: p.tps.slice(), vote: p.vote ? VoteUI.edFrom(p.vote, p.vote.ballots.length) : null, hadVote: !!p.vote });
      } else if (q.draft) {
        const d = S.getDraft(q.draft);
        if (!d) { setTimeout(() => toast('草稿不存在或已删除', 'error')); st.draftId = ''; }
        else Object.assign(st, { mode: 'draft', lx: d.lx, ht: d.ht, bt: d.bt, nr: d.nr, tps: d.tps.slice(), vote: VoteUI.edFrom(d.vote) });
      }
      if (st.mode !== 'edit' && st.lx === 'lost') st.lf = LF.newForm('found');
      return st;
    },
    render(st) {
      const title = st.mode === 'edit' ? '编辑帖子' : st.mode === 'draft' ? '编辑草稿' : '发布新帖';
      const isLost = st.mode !== 'edit' && st.lx === 'lost';
      if (isLost && !st.lf) st.lf = LF.newForm('found');
      const lx = isLost ? { label: '失物招领' } : S.LX_MAP[st.lx];
      const topics = S.activeTopics();
      const valid = isLost ? !LF.formMissing(st.lf) : !!(st.lx && st.bt.trim() && st.nr.trim());
      return `<div class="bbs-publish">
        <div class="bbs-publish__bg"><img src="assets/pc/publish-page-bg.webp" alt=""></div>
        <div class="bbs-publish__shell"><div class="publish-card">
          <div class="publish-tab"><button class="publish-tab__nav" data-act="back" title="返回">←</button><span class="publish-tab__label">发布心声<button data-act="back" title="关闭">×</button></span><button class="publish-tab__nav" style="margin-left:auto" disabled title="前进">→</button></div>
          <div class="publish-panel">
            <div class="publish-panel__head"><div class="side-head"><h3 class="side-head__title">${title}</h3><span class="underline-deco"></span></div>
              ${st.mode === 'edit' ? '' : `<button class="publish-panel__drafts" data-act="drafts"><img src="assets/h5/icon-folder-draft.svg" alt="">草稿箱(${S.drafts().length})</button>`}</div>
            <div class="publish-selects">
              <label class="publish-select"><span class="publish-select__label"><em>*</em> 选择类型：</span>
                <span class="publish-select__val ${lx ? '' : 'is-ph'}">${lx ? `<img src="assets/pc/tab-${isLost ? 'lost' : st.lx}.svg" alt="">${lx.label}` : '请选择'}</span>
                <svg class="publish-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                <select data-field="lx"><option value="">请选择</option>${S.LX.map(x => `<option value="${x.value}" ${x.value === st.lx ? 'selected' : ''}>${x.label}</option>`).join('')}${st.mode === 'edit' ? '' : `<option value="lost" ${st.lx === 'lost' ? 'selected' : ''}>失物招领</option>`}</select></label>
              ${st.lx === 'feedback' ? `<label class="publish-select"><span class="publish-select__label">话题分类：</span>
                <span class="publish-select__val ${st.ht ? '' : 'is-ph'}">${st.ht ? esc((S.topicByCode(st.ht) || {}).htmc || '其他') + ' <span class="c-light" style="font-weight:400">· ' + esc((topics.find(t => t.htbh === st.ht) || {}).bmmc || '') + '</span>' : '其他（不指定部门）'}</span>
                <svg class="publish-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                <select data-field="ht"><option value="">其他（不指定部门）</option>${topics.map(t => `<option value="${t.htbh}" ${t.htbh === st.ht ? 'selected' : ''}>${esc(t.htmc)} · ${esc(t.bmmc)}</option>`).join('')}</select></label>` : ''}
            </div>
            ${isLost ? `${lfPublishBody(st.lf, { keep: 'lf' })}
            <div class="publish-footer">
              <button class="publish-footer__draft" data-act="preview">预览</button>
              <button class="publish-footer__submit ${valid ? 'is-active' : ''}" data-act="submit">发布</button>
            </div>
            <p class="publish-tip">请勿公开完整学号、身份证号等信息；认领时由核对人对照特征核验</p>` : `<div class="publish-field"><span class="publish-field__label"><em>*</em>标题：</span><input class="input" maxlength="100" data-field="bt" data-keep="bt" placeholder="请输入你的内容标题" value="${esc(st.bt)}"></div>
            <div class="publish-field"><span class="publish-field__label"><em>*</em>内容：</span><textarea class="textarea" maxlength="800" data-field="nr" data-keep="nr" placeholder="请输入你的内容">${esc(st.nr)}</textarea></div>
            <div class="publish-upload" data-act="upload"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42'%3E%3Cpath d='M4 10a4 4 0 014-4h9l4 4h13a4 4 0 014 4v18a4 4 0 01-4 4H8a4 4 0 01-4-4z' fill='%233087CC'/%3E%3Ccircle cx='21' cy='22' r='7' fill='%23fff'/%3E%3Cpath d='M21 26v-7M18 21.5l3-3 3 3' stroke='%233087CC' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" alt="">
              <p class="publish-upload__title">点击或拖拽上传图片（最多12张）</p><p class="publish-upload__hint">支持 jpg、png、gif，小于 10MB</p></div>
            ${st.tps.length ? `<div class="thumbs">${st.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" alt=""><button class="thumb__del" data-del-img="${i}">×</button></div>`).join('')}</div>` : ''}
            ${st.vote ? VoteUI.editor(st.vote) : '<button class="publish-vote-add" data-act="addVote"><i class="vt-ico"></i>添加投票<span>征集意见、评选活动，让大家直接投票</span></button>'}
            <div class="publish-footer">
              ${st.mode === 'edit' ? '' : '<button class="publish-footer__draft" data-act="saveDraft">保存草稿</button>'}
              <button class="publish-footer__submit ${valid ? 'is-active' : ''}" data-act="submit">${st.mode === 'edit' ? '保存修改' : '发布内容'}</button>
            </div>
            <p class="publish-tip">${WARN}</p>`}
          </div>
        </div></div>
      </div>`;
    },
    bind(root, st) {
      const syncBtn = () => {
        const b = root.querySelector('.publish-footer__submit');
        if (!b) return;
        b.classList.toggle('is-active', st.lx === 'lost' && st.lf ? !LF.formMissing(st.lf) : !!(st.lx && st.bt.trim() && st.nr.trim()));
      };
      UI.delegate(root, 'input', '[data-field="bt"],[data-field="nr"]', (e, el) => { st[el.dataset.field] = el.value; syncBtn(); });
      UI.delegate(root, 'input', 'input[data-f],textarea[data-f]', (e, el) => { if (!st.lf) return; st.lf[el.dataset.f] = el.value; syncBtn(); });
      UI.delegate(root, 'change', 'select[data-field]', (e, el) => {
        st[el.dataset.field] = el.value;
        if (el.dataset.field === 'lx' && el.value !== 'feedback') st.ht = '';
        if (el.dataset.field === 'lx' && el.value === 'lost' && !st.lf) st.lf = LF.newForm('found');
        PC.refresh();
      });
      UI.delegate(root, 'change', 'select[data-f]', (e, el) => {
        if (!st.lf) return;
        const k = el.dataset.f;
        st.lf[k] = el.value;
        if (k === 'lx' && el.value !== 'found') st.lf.bgfs = 'self';
        if (k === 'bgfs' && el.value !== 'point') st.lf.bgdid = '';
        PC.refresh();
      });
      const addFiles = async files => {
        if (st.lx === 'lost' && st.lf) {
          if (st.lf.tps.length >= 6) { toast('最多上传 6 张图', 'warning'); return; }
          st.lf.tps.push(...files.slice(0, 6 - st.lf.tps.length)); toast('上传成功', 'success'); PC.refresh();
          return;
        }
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
      UI.delegate(root, 'click', '[data-del-img]', (e, el) => { const bag = st.lx === 'lost' && st.lf ? st.lf.tps : st.tps; bag.splice(+el.dataset.delImg, 1); PC.refresh(); });
      const onVoteEd = e => { if (VoteUI.onEditor(e, st.vote, PC.refresh) === 'remove') { st.vote = null; PC.refresh(); } };
      ['input', 'change', 'click'].forEach(t => root.addEventListener(t, onVoteEd));
      UI.delegate(root, 'click', '[data-act]', UI.guard(async (e, el) => {
        const a = el.dataset.act;
        if (st.lx === 'lost' && st.lf && a !== 'back' && a !== 'drafts') {
          if (a === 'upload') {
            if (st.lf.tps.length >= 6) { toast('最多上传 6 张图', 'warning'); return; }
            const imgs = await UI.pickImages({ max: 6, existing: st.lf.tps.length });
            if (imgs.length) { st.lf.tps.push(...imgs); PC.refresh(); }
          } else if (a === 'preview' || a === 'submit') {
            const miss = LF.formMissing(st.lf);
            if (miss) { toast(miss, 'warning'); return; }
            if (!PC.canInteract()) return;
            const pack = { f: st.lf, team: false, id: '' };
            if (a === 'preview') openLfPreview(pack); else submitLf(pack);
          }
          return;
        }
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

  /* ---------- 失物招领 ---------- */
  const LOST = '/bbs/lost';
  const lfImgs = tps => (tps || []).length ? `<div class="thumbs">${tps.map(t => `<div class="thumb"><img src="${esc(imgSrc(t))}" data-preview alt=""></div>`).join('')}</div>` : '';
  const cell = (label, val) => `<div class="rdd__cell"><span class="rdd__cell-label">${label}</span><span class="rdd__cell-val">${val}</span></div>`;
  const row = (...cells) => `<div class="rdd__row">${cells.join('')}</div>`;
  const fullRow = (label, val) => `<div class="rdd__row rdd__row--full">${cell(label, val)}</div>`;
  const secTitle = t => `<h4 class="rdd__sec-title">${t}<span class="underline-deco"></span></h4>`;
  const STEP_TAG = { done: '<span class="rdd__step-tag">已完成</span>', cur: '<span class="rdd__step-tag rdd__step-tag--doing">进行中</span>', todo: '' };
  const lfSteps = steps => steps.map((s, i) => `<div class="rdd__step rdd__step--${s.state === 'cur' ? 'current' : s.state}"><span class="rdd__dot">${s.state === 'done' ? '✓' : i + 1}</span>
    <div><div class="rdd__step-title">${esc(s.title)}${STEP_TAG[s.state]}</div>${s.time || s.desc ? `<div class="rdd__step-sub">${[s.time, s.desc].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</div></div>`).join('');
  PC.lfLogSteps = it => it.logs.slice().reverse().map(l => `<div class="rdd__step rdd__step--done"><span class="rdd__dot">✓</span>
    <div><div class="rdd__step-title">${esc(l.act)}</div><div class="rdd__step-sub">${[S.fmtDate(l.t, true), l.note, (S.user(l.uid) || {}).nc].filter(Boolean).map(esc).join(' · ')}</div></div></div>`).join('');

  PC.lfCard = function (it) {
    const found = it.lx === 'found';
    return `<article class="post-card" data-lf="${it.id}">
      <div class="post-card__user">${avatar(it)}<div><div class="post-card__nick">${esc(it.fbrnc)} ${LF.sourceMark(it)} ${LF.teamBadge(it)}</div><div class="post-card__sub">${S.relTime(it.fbsj)} · ${it.lyLabel}</div></div></div>
      <div class="post-card__body">
        <div class="post-card__panel"><div>
          <div class="post-card__title-row"><span class="lx-tag lx--blue"><img src="assets/pc/tab-lost.svg" alt="">${esc(it.flLabel)}</span><h3 class="post-card__title">${esc(it.mc)}</h3><span class="tag tag--${LF.pcTag(it.tone)}">${esc(it.ztLabel)}</span></div>
          <p class="post-card__preview clamp2">${found ? '捡到于' : '可能丢失于'} ${esc(it.xq)} · ${esc(it.dd)} · ${esc(it.sjText)}${it.nr ? '　' + esc(it.nr) : ''}</p>
        </div>${postImgs(it.tps)}</div>
        <div class="post-card__stats"><div class="f-c" style="gap:.09375rem">
          ${found ? `<span class="post-card__stat">${esc(it.bgText)}</span>` : ''}
          <span class="post-card__stat">编号 ${esc(it.bh)}</span>
          ${it.canReview && it.claimN ? `<span class="post-card__stat c-warn">${it.claimN} 条认领待处理</span>` : ''}
          ${!found && it.isMine && it.clueN ? `<span class="post-card__stat c-warn">${it.clueN} 条线索</span>` : ''}
          ${it.myClaim ? '<span class="post-card__stat c-primary">已申请认领</span>' : ''}
        </div></div>
      </div>
    </article>`;
  };

  /* 弹窗：文字原因（要求补充 / 未通过 / 撤回 / 线索） */
  function openTextDialog({ title, label, quick = [], placeholder = '请输入', ok = '确定', onOk }) {
    UI.open({
      kind: 'dialog', cls: 'rpd', title, width: '4.2rem',
      render: () => `<div class="rpd__label">${esc(label)}</div>
        ${quick.length ? `<div class="rpd__grid">${quick.map(q => `<button class="rpd__type" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
        <textarea class="textarea" rows="4" maxlength="300" data-keep="lfText" placeholder="${esc(placeholder)}" style="min-height:.41667rem"></textarea>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>${ok}</button></div>`,
      on: {
        'click [data-quick]': (e, el, l) => {
          l.body.querySelectorAll('[data-quick]').forEach(b => b.classList.toggle('is-active', b === el));
          l.body.querySelector('textarea').value = el.dataset.quick;
        },
        'click [data-ok]': (e, el, l) => {
          const v = l.body.querySelector('textarea').value.trim();
          if (!v) { toast('请填写内容', 'warning'); return; }
          onOk(v); l.close();
        }
      }
    });
  }
  PC.openTextDialog = openTextDialog;

  function openClueDialog(itemId) {
    UI.open({
      kind: 'dialog', title: '提供线索', width: '4.8rem', state: { tps: [] },
      render: l => `<div class="form">
          <div class="form-item"><label class="form-item__label">看到的地点</label><div class="form-item__ctrl"><input class="input" maxlength="40" data-keep="dd" placeholder="如：图书馆三楼靠窗"></div></div>
          <div class="form-item"><label class="form-item__label">看到的时间</label><div class="form-item__ctrl"><input class="input" maxlength="40" data-keep="sj" placeholder="如：今天中午"></div></div>
          <div class="form-item"><label class="form-item__label">补充说明</label><div class="form-item__ctrl"><textarea class="textarea" rows="3" maxlength="300" data-keep="nr" placeholder="如：看到有人把耳机盒交给了值班同学"></textarea><div class="form-item__hint">地点、时间和说明至少填一项。线索会通过站内私信发给失主。</div></div></div>
          <div class="form-item"><label class="form-item__label">图片</label><div class="form-item__ctrl">
            <div class="thumbs">${l.state.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" data-preview alt=""><button class="thumb__del" data-del="${i}">×</button></div>`).join('')}<button class="btn btn--plain" data-upload>上传图片</button></div>
            <div class="form-item__hint">选填，最多 3 张</div></div></div>
        </div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>发送线索</button></div>`,
      on: {
        'click [data-preview]': (e, el) => UI.preview(el.src),
        'click [data-upload]': async (e, el, l) => {
          const imgs = await UI.pickImages({ max: 3, existing: l.state.tps.length });
          if (imgs.length) { l.state.tps.push(...imgs); l.refresh(); }
        },
        'click [data-del]': (e, el, l) => { l.state.tps.splice(+el.dataset.del, 1); l.refresh(); },
        'click [data-ok]': (e, el, l) => {
          const v = k => l.body.querySelector(`[data-keep="${k}"]`).value;
          try { S.lfAddClue(itemId, { dd: v('dd'), sj: v('sj'), nr: v('nr'), tps: l.state.tps.slice() }); }
          catch (err) { toast(err.message || '发送失败', 'error'); return; }
          toast('线索已发送给失主', 'success');
          l.close();
        }
      }
    });
  }
  function cluePost(c, mine) {
    const pm = mine && c.uid !== S.me().id;
    return `<div class="rdd__post">
      <div class="f-sb"><div class="f-c" style="gap:.04167rem">${avatar(c.u, 'avatar--sm')}<b style="font-size:.07292rem">${esc((c.u || {}).nc || '同学')}</b><span class="c-light" style="font-size:.0625rem">${S.relTime(c.cjsj)}</span></div>${pm ? `<button class="btn btn--sm btn--plain btn--round" data-pm="${c.uid}">私信</button>` : ''}</div>
      ${c.dd ? `<div class="rdd__cell-val"><span class="c-muted">看到的地点：</span>${esc(c.dd)}</div>` : ''}
      ${c.sj ? `<div class="rdd__cell-val"><span class="c-muted">看到的时间：</span>${esc(c.sj)}</div>` : ''}
      ${c.nr ? `<div class="rdd__cell-val">${esc(c.nr)}</div>` : ''}
      ${lfImgs(c.tps)}
    </div>`;
  }

  function openHandover(c) {
    const d = c.jj || LF.handoverDefault(c.item);
    UI.open({
      kind: 'dialog', title: '安排交接', width: '4.8rem',
      render: () => `<div class="form">
          <div class="form-item"><label class="form-item__label req">交接地点</label><div class="form-item__ctrl"><input class="input" data-k="dd" value="${esc(d.dd)}" placeholder="如：校本部学生事务大厅"></div></div>
          <div class="form-item"><label class="form-item__label req">交接时间</label><div class="form-item__ctrl"><input class="input" data-k="sj" value="${esc(d.sj)}" placeholder="如：周三 14:00-16:00"></div></div>
          <div class="form-item"><label class="form-item__label">联系方式</label><div class="form-item__ctrl"><input class="input" data-k="lxfs" value="${esc(d.lxfs)}" placeholder="选填"><div class="form-item__hint">确认后会以私信发送给认领人 ${esc(c.sqr.nc)}</div></div></div>
        </div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>发送安排</button></div>`,
      on: {
        'click [data-ok]': (e, el, l) => {
          const v = k => l.body.querySelector(`[data-k="${k}"]`).value;
          const peer = S.lfHandover(c.id, { dd: v('dd'), sj: v('sj'), lxfs: v('lxfs') });
          toast('交接安排已私信发送', 'success'); l.close(); openChat(peer);
        }
      }
    });
  }

  /* 认领申请的处理按钮（前台详情、管理端台账共用） */
  PC.lfClaimOps = c => {
    const b = (act, label, cls = '') => `<button class="btn btn--sm ${cls}" data-lfc="${act}" data-cid="${c.id}">${label}</button>`;
    const pm = b('pm', '私信');
    if (c.zt === 'pending') return pm + b('more', '要求补充') + b('reject', '不通过', 'btn--plain-danger') + b('pass', '通过', 'btn--primary');
    if (c.zt === 'more') return pm + b('reject', '不通过', 'btn--plain-danger');
    if (c.zt === 'pass') return pm + b('hand', c.jj ? '重新安排' : '安排交接', 'btn--plain') + b('done', '确认归还', 'btn--primary');
    return '';
  };
  PC.lfClaimAct = UI.guard(async (act, cid) => {
    const c = S.lfClaimGet(cid);
    if (!c) return;
    if (act === 'pm') openSendPm(c.sqrid);
    else if (act === 'pass') {
      if (await UI.confirm('确认认领人描述的特征与物品一致？通过后物品进入「核对中」，再安排交接。', { title: '核对通过', ok: '通过' })) { S.lfReview(cid, 'pass', ''); toast('已通过', 'success'); }
    } else if (act === 'more') openTextDialog({ title: '要求补充材料', label: '告诉认领人还需要补充什么', quick: LF.QUICK.more, ok: '发送', onOk: v => { S.lfReview(cid, 'more', v); toast('已通知认领人补充', 'success'); } });
    else if (act === 'reject') openTextDialog({ title: '核对未通过', label: '请选择或填写原因，会通知认领人', quick: LF.QUICK.reject, onOk: v => { S.lfReview(cid, 'reject', v); toast('已标记未通过', 'success'); } });
    else if (act === 'hand') openHandover(c);
    else if (act === 'done') {
      if (await UI.confirm('确认物品已当面交给认领人？确认后状态变为「已归还」，其他申请自动关闭。', { title: '确认归还', ok: '确认归还' })) { S.lfFinish(cid); toast('已完成归还', 'success'); }
    }
  });
  PC.lfClaimBox = c => `<div class="rdd__post">
      <div class="f-sb"><div class="f-c" style="gap:.04167rem">${avatar(c.sqr, 'avatar--sm')}<b style="font-size:.07292rem">${esc(c.sqr.nc)}</b><span class="c-light" style="font-size:.0625rem">${S.fmtDateTime(c.cjsj)}</span></div><span class="tag tag--${LF.pcTag(c.tone)}">${esc(c.ztLabel)}</span></div>
      <div class="rdd__cell-val"><span class="c-muted">归属特征：</span>${esc(c.tz)}</div>
      <div class="rdd__cell-val"><span class="c-muted">丢失时间地点：</span>${esc(c.sjdd)}</div>
      ${lfImgs(c.tps)}
      ${c.zt === 'more' ? `<div class="rdd__cell-val c-warn">已要求补充：${esc(c.bcyq)}</div>` : ''}
      ${c.jj ? `<div class="rdd__cell-val"><span class="c-muted">交接安排：</span>${esc(c.jj.dd)} · ${esc(c.jj.sj)}</div>` : ''}
      ${c.jl && c.zt !== 'pending' ? `<div class="rdd__cell-val"><span class="c-muted">核对结论：</span>${esc(c.jl)}</div>` : ''}
      ${PC.lfClaimOps(c) ? `<div class="f-c" style="gap:.04167rem;justify-content:flex-end">${PC.lfClaimOps(c)}</div>` : ''}
    </div>`;

  /* 认领申请 / 补充材料 */
  function openLfClaim(itemId, claimId) {
    if (!PC.canInteract()) return;
    const it = S.lfGet(itemId);
    const old = claimId ? S.lfClaimGet(claimId) : null;
    UI.open({
      kind: 'dialog', title: old && ['pending', 'more'].includes(old.zt) ? '修改认领申请' : old ? '认领申请' : '申请认领', width: '6.4rem', state: { tps: old ? old.tps.slice() : [] },
      render: l => `<div class="rdd__body">
        <div class="rdd__post"><div class="f-c" style="gap:.05208rem;min-width:0"><span class="lx-tag lx--blue"><img src="assets/pc/tab-lost.svg" alt="">${esc(it.flLabel)}</span><b class="ellipsis">${esc(it.mc)}</b><span class="c-light" style="font-size:.0625rem">${esc(it.xq)} · ${esc(it.dd)} · ${esc(it.sjText)}</span></div></div>
        ${old ? `<div class="rdd__banner rdd__banner--pending"><div><div class="rdd__banner-title">需要补充材料</div><div class="rdd__banner-sub">${esc(old.bcyq)}</div></div></div>` : ''}
        <div class="form">
          <div class="form-item"><label class="form-item__label req">归属特征</label><div class="form-item__ctrl"><textarea class="textarea" rows="3" maxlength="300" data-keep="tz" placeholder="描述只有失主知道的特征，如贴纸、划痕、内含物品">${old ? esc(old.tz) : ''}</textarea></div></div>
          <div class="form-item"><label class="form-item__label req">丢失时间地点</label><div class="form-item__ctrl"><input class="input" maxlength="60" data-keep="sjdd" value="${old ? esc(old.sjdd) : ''}" placeholder="如：10月20日下午，图书馆三楼"></div></div>
          <div class="form-item"><label class="form-item__label">证明材料</label><div class="form-item__ctrl">
            <div class="thumbs">${l.state.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" alt=""><button class="thumb__del" data-del="${i}">×</button></div>`).join('')}<button class="btn btn--plain" data-upload>上传图片</button></div>
            <div class="form-item__hint">可上传购买记录、物品照片等，最多 3 张；材料仅核对人可见</div></div></div>
        </div></div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>${old && ['pending', 'more'].includes(old.zt) ? '保存修改' : '提交申请'}</button></div>`,
      on: {
        'click [data-upload]': async (e, el, l) => { const imgs = await UI.pickImages({ max: 3, existing: l.state.tps.length }); if (imgs.length) { l.state.tps.push(...imgs); l.refresh(); } },
        'click [data-del]': (e, el, l) => { l.state.tps.splice(+el.dataset.del, 1); l.refresh(); },
        'click [data-ok]': (e, el, l) => {
          const data = { tz: l.body.querySelector('[data-keep="tz"]').value, sjdd: l.body.querySelector('[data-keep="sjdd"]').value, tps: l.state.tps };
          if (old && ['pending', 'more'].includes(old.zt)) { S.lfUpdateClaim(old.id, data); toast('已修改认领申请', 'success'); }
          else if (old) { S.lfSupplement(old.id, data); toast('已提交补充材料', 'success'); }
          else { S.lfClaim(itemId, data); toast('认领申请已提交，核对结果会通过消息通知你', 'success'); }
          l.close();
        }
      }
    });
  }

  /* 详情 */
  PC.openLost = function (id) {
    UI.open({
      kind: 'dialog', cls: 'rdd rdd--lost', title: '招领详情<span class="underline-deco"></span>',
      render: () => {
        const it = S.lfGet(id);
        if (!it) return PC.empty('物品信息不存在');
        const found = it.lx === 'found';
        const p = it.point;
        const my = it.myClaim ? S.lfClaimGet(it.myClaim.id) : null;
        const claims = it.canReview ? S.lfClaimsOf(it.id) : [];
        const clues = !found && it.isMine ? S.lfClues(it.id) : [];
        const team = !it.isMine && (it.canEdit || it.canReturn);
        const btns = LF.detailActions(it, my);
        const done = ['returned', 'found'].includes(it.ztKey);
        return `<div class="rdd__body">
          <div class="rdd__banner ${done ? '' : 'rdd__banner--pending'}" ${it.closed && !done ? 'style="background:#f4f4f5"' : ''}><div><div class="rdd__banner-title" ${it.closed && !done ? 'style="color:#909399"' : ''}>${esc(it.ztLabel)}</div><div class="rdd__banner-sub" ${it.closed && !done ? 'style="color:#909399"' : ''}>${esc(LF.bannerText(it))}</div></div></div>
          <div>${secTitle(found ? '物品信息' : '寻物信息')}
            <div class="rdd__post">
              <div class="f-sb"><div class="f-c" style="gap:.04167rem">${avatar(it)}<b style="font-size:.07292rem;white-space:nowrap">${esc(it.fbrnc)}</b>${LF.teamBadge(it)}<span class="c-light" style="font-size:.0625rem;white-space:nowrap">${it.lyLabel} · ${S.fmtDateTime(it.fbsj)}</span></div>
                ${!it.isTeam && !it.isMine ? `<button class="btn btn--sm btn--plain btn--round" data-pm="${it.fbrid}">私信</button>` : ''}</div>
              <div class="f-c" style="gap:.05208rem;min-width:0"><span class="lx-tag lx--blue"><img src="assets/pc/tab-lost.svg" alt="">${esc(it.flLabel)}</span><span class="rp-item__title">${esc(it.mc)}</span></div>
              ${it.nr ? `<p class="rp-item__content" style="margin:0">${esc(it.nr)}</p>` : ''}
              ${lfImgs(it.tps)}
            </div></div>
          <div class="rdd__table">
            ${row(cell('校区', esc(it.xq)), cell(found ? '捡到地点' : '丢失地点', esc(it.dd)), cell(found ? '捡到时间' : '丢失时间', esc(it.sjText)))}
            ${fullRow('信息编号', esc(it.bh))}
            ${it.card ? fullRow('持卡人', `${esc(it.card.xm)}${it.card.xh ? ' · ' + esc(it.card.xh) : ''}${it.card.xy ? ' · ' + esc(it.card.xy) : ''}<span class="c-light">（仅保管人与团队可见）</span>`) : ''}
          </div>
          ${found ? `<div>${secTitle('保管与领取')}<div class="rdd__table">
            ${it.bgfs === 'point' && p ? row(cell('保管方式', esc(it.bgText)), cell('值班安排', esc(p.zbap)), cell('联系方式', esc(p.lxfs))) + fullRow('地址', esc(p.dz || '由团队确认并维护')) + (p.lstz ? fullRow('临时调整', `<span class="c-warn">${esc(p.lstz)}</span>`) : '')
              : row(cell('保管方式', esc(it.bgText)), cell('联系方式', '站内私信发布同学'), cell('核对人', '发布同学'))}
            ${fullRow('领取须知', '核对通过后按约定时间领取，请携带校园卡或有效证件')}</div></div>` : ''}
          ${my && ['pending', 'more'].includes(my.zt) ? `<div>${secTitle('我的认领进度')}${lfSteps(LF.claimSteps(my))}
            <div class="f-c" style="justify-content:flex-end;gap:.04167rem;margin-top:.0625rem"><button class="btn btn--sm" data-act="editClaim" data-cid="${my.id}">修改</button><button class="btn btn--sm btn--plain-danger" data-act="cancelClaim" data-cid="${my.id}">撤回</button></div></div>`
            : my ? `<div>${secTitle('我的认领进度')}${lfSteps(LF.claimSteps(my))}</div>` : ''}
          ${claims.length ? `<div>${secTitle(`认领申请（${claims.length}）`)}<div class="flex" style="flex-direction:column;gap:.0625rem">${claims.map(PC.lfClaimBox).join('')}</div></div>` : ''}
          ${found ? '' : it.isMine
            ? `<div>${secTitle(`收到的线索（${clues.length}）`)}${clues.length ? `<div class="flex" style="flex-direction:column;gap:.0625rem">${clues.map(c => cluePost(c, true)).join('')}</div>` : '<p class="rdd__tip" style="margin:0">暂无线索，有同学提供时会通过私信通知你</p>'}</div>`
            : `<div>${secTitle('同学提供的线索')}<p class="rdd__tip" style="margin:0">线索内容仅寻物发布者可见。见过这件物品，可以在下方提供线索。</p></div>`}
          ${it.isMine || team ? `<div>${secTitle('处理记录')}${PC.lfLogSteps(it)}</div>` : ''}
          <p class="rdd__tip">请勿公开完整学号、身份证号等信息；虚假认领将按社区规范处理</p>
        </div>
        ${btns.length ? `<div class="dlg-foot">${btns.map(([act, label], i) => `<button class="btn ${i === btns.length - 1 ? 'btn--primary' : act === 'withdraw' ? 'btn--plain-danger' : ''}" data-act="${act}">${label}</button>`).join('')}</div>` : ''}`;
      },
      on: {
        'click [data-preview]': (e, el) => UI.preview(el.src),
        'click [data-pm]': (e, el) => openSendPm(el.dataset.pm),
        'click [data-lfc]': (e, el) => PC.lfClaimAct(el.dataset.lfc, el.dataset.cid),
        'click [data-act]': async (e, el, l) => {
          const a = el.dataset.act, it = S.lfGet(id);
          if (a === 'supplement' || a === 'editClaim') openLfClaim(id, el.dataset.cid);
          else if (a === 'cancelClaim') {
            if (await UI.confirm('撤回后可以修改内容再重新提交。', { title: '撤回认领申请', ok: '确认撤回', danger: true })) { S.lfCancelClaim(el.dataset.cid); toast('已撤回', 'success'); }
          }
          else if (a === 'claim') openLfClaim(id);
          else if (a === 'myClaim') l.body.querySelector('.rdd__step') && l.body.querySelector('.rdd__step').scrollIntoView({ behavior: 'smooth', block: 'center' });
          else if (a === 'contact') {
            const to = LF.contactUid(it);
            if (to === S.me().id) { toast('不能给本人发私信', 'warning'); return; }
            openSendPm(to);
          } else if (a === 'clue') {
            if (!PC.canInteract()) return;
            openClueDialog(id);
          } else if (a === 'edit') { UI.closeAll(); PC.go(LOST + '/publish', { id }); }
          else if (a === 'withdraw') openTextDialog({ title: '撤回信息', label: '撤回后其他同学将看不到这条信息', quick: LF.QUICK.withdraw, ok: '确认撤回', onOk: v => { S.lfWithdraw(id, v); toast('已撤回', 'success'); } });
          else if (a === 'markFound') { if (await UI.confirm('确认已经找回物品？标记后寻物信息将结束展示。', { title: '标记已找回' })) { S.lfMarkFound(id); toast('已标记找回', 'success'); } }
          else if (a === 'returnSelf') { if (await UI.confirm('确认物品已线下归还失主？确认后状态变为「已归还」，未处理的认领申请会自动关闭。', { title: '确认归还' })) { S.lfReturn([id], { note: '线下归还' }); toast('已标记归还', 'success'); } }
          else if (a === 'transfer') openPickPoint(pid => { S.lfTransfer(id, pid); toast('已转交，后续由资助团队核对', 'success'); });
        }
      }
    });
  };
  function openPickPoint(onPick, title = '转交到服务点') {
    UI.open({
      kind: 'dialog', cls: 'rpd', title, width: '4.2rem', state: { v: '' },
      render: l => `<div class="rpd__label">请选择服务点</div>
        <div class="rpd__grid">${S.lfPoints().map(p => `<button class="rpd__type ${l.state.v === p.id ? 'is-active' : ''}" data-v="${p.id}">${esc(p.mc)}</button>`).join('')}</div>
        <div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>确定</button></div>`,
      on: {
        'click [data-v]': (e, el, l) => { l.state.v = el.dataset.v; l.refresh(); },
        'click [data-ok]': (e, el, l) => { if (!l.state.v) { toast('请选择服务点', 'warning'); return; } onPick(l.state.v); l.close(); }
      }
    });
  }

  /* 我的失物招领 / 我的认领 */
  function openMyLost(tab = 'found') {
    UI.open({
      kind: 'drawer', title: '我的失物招领', state: { tab },
      render: l => {
        const t = l.state.tab;
        const TABS = [['found', '我捡到的'], ['lost', '我丢失的'], ['claims', '我的认领']];
        const items = t === 'claims' ? [] : S.lfMyItems(t);
        const claims = t === 'claims' ? S.lfMyClaims('ongoing').concat(S.lfMyClaims('ended')) : [];
        return `<div class="my-drawer">
          <div class="rp-tabs" style="margin-top:.0625rem">${TABS.map(([v, n], i) => `${i ? '<span class="rp-tabs__divider"></span>' : ''}<button class="rp-tabs__tab ${t === v ? 'is-active' : ''}" data-tab="${v}">${n}<span class="underline-deco"></span></button>`).join('')}</div>
          <div class="my-drawer__list" data-keep-scroll="ml">
          ${t === 'claims'
            ? (claims.length ? claims.map(c => `<div class="msg-item" data-open-lf="${c.itemId}">
                <span class="avatar avatar--md avatar--txt" style="background:#3087CC">${esc((c.item ? c.item.flLabel : '物').slice(0, 1))}</span>
                <div class="msg-item__main"><div class="msg-item__name">${esc(c.item ? c.item.mc : '物品已删除')}</div><div class="msg-item__last">${esc(LF.claimHint(c))}</div></div>
                <div class="msg-item__side"><span>${S.relTime(c.gxsj)}</span><span class="tag tag--${LF.pcTag(c.tone)}">${esc(c.ztLabel)}</span>
                  ${['pending', 'more'].includes(c.zt) ? `<span class="f-c" style="gap:.03125rem"><button type="button" class="btn btn--sm" data-edit-claim="${c.id}">修改</button><button type="button" class="btn btn--sm btn--plain-danger" data-cancel-claim="${c.id}">撤回</button></span>` : ''}</div></div>`).join('') + '<p class="bbs-home__tip">暂无更多认领</p>' : PC.empty('还没有认领记录'))
            : (items.length ? items.map(PC.lfCard).join('') + '<p class="bbs-home__tip">暂无更多</p>' : PC.empty(t === 'found' ? '还没有发布捡到的物品' : '还没有发布寻物信息'))}
          </div></div>`;
      },
      on: {
        'click [data-tab]': (e, el, l) => { l.state.tab = el.dataset.tab; l.refresh(); },
        'click [data-edit-claim]': (e, el) => { e.stopPropagation(); const c = S.lfClaimGet(el.dataset.editClaim); if (c) openLfClaim(c.itemId, c.id); },
        'click [data-cancel-claim]': async (e, el) => {
          e.stopPropagation();
          if (await UI.confirm('撤回后可以修改内容再重新提交。', { title: '撤回认领申请', ok: '确认撤回', danger: true })) { S.lfCancelClaim(el.dataset.cancelClaim); toast('已撤回', 'success'); }
        },
        'click [data-lf]': (e, el) => PC.openLost(el.dataset.lf),
        'click [data-open-lf]': (e, el) => { if (e.target.closest('[data-edit-claim],[data-cancel-claim]')) return; PC.openLost(el.dataset.openLf); }
      }
    });
  }

  /* 招领站：每日汇总 */
  function openDigests() {
    UI.open({
      kind: 'dialog', cls: 'rdd', title: '资助团队招领站<span class="underline-deco"></span>', width: '6.4rem', state: { id: '' },
      render: l => {
        const list = S.lfDigests();
        const d = list.find(x => x.id === l.state.id) || list[0];
        return `<div class="rdd__body">
          ${list.length ? `<div class="rpd__grid" style="grid-template-columns:repeat(4,1fr);margin:0">${list.slice(0, 8).map(x => `<button class="rpd__type ${x.id === d.id ? 'is-active' : ''}" data-d="${x.id}">${S.fmtDate(x.rq).slice(5)}${x.isToday ? ' 今日' : ''}</button>`).join('')}</div>` : ''}
          ${d ? `<div class="rdd__banner"><div><div class="rdd__banner-title">${esc(LF.digestTitle(d))} · 共 ${d.total} 件</div><div class="rdd__banner-sub">${esc(LF.digestLine(d))} · ${d.qrrUser ? esc(d.qrrUser.nc) + ' 确认发布' : ''}</div></div></div>
            <div class="rdd__table">${row(...(d.fls.length ? d.fls : [{ label: '—', n: 0 }]).slice(0, 3).map(f => cell(esc(f.label), f.n + ' 件')))}</div>
            <div class="table-wrap"><table class="table"><thead><tr><th>信息编号</th><th>物品</th><th>发布端</th><th>校区</th><th>保管</th><th>状态</th></tr></thead>
              <tbody>${d.items.map(it => `<tr data-lf="${it.id}" style="cursor:pointer"><td>${esc(it.bh)}</td><td>${esc(it.mc)}</td><td>${LF.sourceMark(it)}</td><td>${esc(it.xq)}</td><td>${esc(it.bgText)}</td><td><span class="tag tag--${LF.pcTag(it.tone)}">${esc(it.ztLabel)}</span></td></tr>`).join('')}</tbody></table></div>` : PC.empty('暂无已发布的汇总')}
          <p class="rdd__tip">汇总包含当日团队登记和学生自主登记的物品，每条标明发布端；领取方式见各物品详情</p>
        </div>`;
      },
      on: {
        'click [data-d]': (e, el, l) => { l.state.id = el.dataset.d; l.refresh(); },
        'click [data-lf]': (e, el) => PC.openLost(el.dataset.lf),
        'click [data-preview]': (e, el) => { e.stopPropagation(); UI.preview(el.src); }
      }
    });
  }

  function openPointSchedule(id) {
    const p = S.lfPoint(id);
    if (!p) return;
    UI.open({
      kind: 'dialog', title: '修正时间地点', width: '4.8rem',
      render: () => `<div class="form">
        <div class="form-item"><label class="form-item__label">服务点</label><div class="form-item__ctrl" style="line-height:.16667rem">${esc(p.mc)}</div></div>
        <div class="form-item"><label class="form-item__label">地址</label><div class="form-item__ctrl"><input class="input" data-k="dz" data-keep="dz" maxlength="40" value="${esc(p.dz)}" placeholder="如：校本部学生活动中心一楼"></div></div>
        <div class="form-item"><label class="form-item__label req">值班安排</label><div class="form-item__ctrl"><input class="input" data-k="zbap" data-keep="zbap" maxlength="40" value="${esc(p.zbap)}" placeholder="如：周一至周五 12:00-14:00、17:30-19:30"></div></div>
        <div class="form-item"><label class="form-item__label">联系方式</label><div class="form-item__ctrl"><input class="input" data-k="lxfs" data-keep="lxfs" maxlength="40" value="${esc(p.lxfs)}"></div></div>
        <div class="form-item"><label class="form-item__label">临时调整</label><div class="form-item__ctrl"><input class="input" data-k="lstz" data-keep="lstz" maxlength="40" value="${esc(p.lstz)}" placeholder="留空则不展示"><div class="form-item__hint">按实际值班时间修正，前台服务点信息会同步更新</div></div></div>
      </div><div class="dlg-foot"><button class="btn" data-close>取消</button><button class="btn btn--primary" data-ok>保存</button></div>`,
      on: {
        'click [data-ok]': (e, el, l) => {
          const v = {}; l.body.querySelectorAll('[data-k]').forEach(i => { v[i.dataset.k] = i.value.trim(); });
          S.lfUpdatePointSchedule(id, v); toast('已按实际安排更新', 'success'); l.close();
        }
      }
    });
  }

  PC.pages[LOST + '/index'] = {
    title: '失物招领',
    init: q => ({ lx: q.lx === 'lost' ? 'lost' : 'found', kw: '', xq: '', fl: '', days: 0, ly: '', closed: false, limit: 10, openId: q.id }),
    render(st) {
      const f = { lx: st.lx, kw: st.kw, xq: st.xq, fl: st.fl, days: st.days, ly: st.ly, closed: st.closed };
      const all = S.lfList(f), list = all.slice(0, st.limit);
      const n = lx => S.lfList({ lx }).length;
      const sta = S.lfStation(), dg = S.lfTodayDigest(), last = S.lfDigests()[0];
      const filtered = st.kw || st.xq || st.fl || +st.days || st.ly;
      const team = S.lfIsTeam(), tstats = team ? S.lfStats() : null;
      const sel = (k, opts) => `<select class="select" data-f="${k}" style="width:.83333rem">${opts.map(o => `<option value="${o.value}" ${String(st[k]) === String(o.value) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
      const sideItem = (act, name, desc, badge, active) => `<button type="button" class="rules-card__item${active ? ' is-active' : ''}" data-act="${act}"><span><div class="rules-card__name">${name}${badge ? ` <span class="tag tag--orange">${badge}</span>` : ''}</div><div class="rules-card__desc">${desc}</div></span><span class="rules-card__arrow"><img src="assets/pc/i-RulesLinksCard-0.svg" alt=""></span></button>`;
      return `<div class="rp-page" data-keep-scroll="lost">
        <div class="bbs-home__layout" style="padding:.08333rem .10417rem .10417rem">
          <div class="bbs-home__main">
            <div class="rp-card">
              <div class="rp-tab"><button class="btn-link" data-act="back" title="返回首页" style="color:#3087cc">←</button><span class="rp-tab__chip">失物招领<button data-act="back" title="关闭">×</button></span>${S.lfCan('register') ? '<button class="btn btn--primary" data-act="pubTeam" style="margin-left:auto">发布招领</button>' : '<button class="btn btn--primary" data-act="pub" style="margin-left:auto">发布招领</button>'}</div>
              <div class="rp-panel">
            <div class="bbs-home__toolbar">
              <div class="sort-bar">
                ${LF.LX_TABS.map((t, i) => `${i ? '<span class="sort-bar__sep"></span>' : ''}<button class="sort-bar__item ${st.lx === t.value ? 'is-active' : ''}" data-lx="${t.value}">${t.label} ${n(t.value)}<span class="underline-deco"></span></button>`).join('')}
              </div>
              <label class="bbs-home__search"><img src="assets/h5/icon-search.svg" alt=""><input data-keep="lfkw" placeholder="搜索物品名称、地点或编号" value="${esc(st.kw)}">${st.kw ? '<button class="bbs-home__search-clear" data-act="clearKw" title="清空搜索">✕</button>' : ''}</label>
            </div>
            <div class="f-c" style="gap:.0625rem;margin-bottom:.0625rem;flex-wrap:wrap">
              ${sel('xq', [{ value: '', label: '全部校区' }].concat(S.LF_XQ.map(x => ({ value: x, label: x }))))}
              ${sel('fl', [{ value: '', label: '全部种类' }].concat(S.LF_FL))}
              ${sel('days', S.LF_DAYS.map(d => ({ value: d.value, label: d.value ? d.label : '全部时间' })))}
              ${sel('ly', LF.LY)}
              <label class="check"><input type="checkbox" data-closed ${st.closed ? 'checked' : ''}>${st.lx === 'found' ? '含已归还' : '含已找回'}</label>
              ${filtered ? '<button class="btn-link" data-act="clearFilter">清除筛选</button>' : ''}
            </div>
            <div class="bbs-home__list">
              ${list.length ? list.map(PC.lfCard).join('') : `<div class="bbs-home__empty">${filtered ? '没有符合条件的物品，换个条件试试' : st.lx === 'found' ? '暂无捡到的物品' : '暂无寻物信息'}<div style="margin-top:.0625rem"><button class="btn btn--plain btn--round" data-act="${st.lx === 'found' ? 'pubLost' : 'pubFound'}">${st.lx === 'found' ? '没找到？发布寻物' : '捡到东西？发布招领'}</button></div></div>`}
            </div>
            ${list.length ? `<p class="bbs-home__tip">${all.length > list.length ? '加载中…' : st.lx === 'found' ? '超过两年未认领的物品会因时间久远已处理，不再展示' : '暂无更多'}</p>` : ''}
              </div></div>
          </div>
          <aside class="bbs-home__side" style="margin-top:0">
            <section class="rules-card">
              <div class="side-head"><h3 class="side-head__title">资助团队招领站</h3><span class="underline-deco"></span></div>
              <div class="profile-card__stats" style="background:#fff;border-radius:.04167rem;padding:.0625rem 0">
                <div class="profile-card__stat"><span class="profile-card__num profile-card__num--blue">${sta.todayNew}</span><span class="profile-card__label">今日登记</span></div>
                <div class="profile-card__stat"><span class="profile-card__num profile-card__num--orange">${sta.pending}</span><span class="profile-card__label">待认领</span></div>
                <div class="profile-card__stat"><span class="profile-card__num profile-card__num--green">${sta.seeking}</span><span class="profile-card__label">寻找中</span></div>
              </div>
              <div class="rules-card__list">
                ${sideItem('digest', dg ? esc(LF.digestTitle(dg)) : '今日汇总', dg ? `共 ${dg.total} 件 · 含团队与学生 · ${esc(LF.digestLine(dg))}` : last ? `今日汇总未发布 · 最近 ${S.fmtDate(last.rq).slice(5)}` : '暂无汇总')}
                ${sideItem('teamOnly', '只看团队登记', st.ly === 'team' ? '当前列表只显示团队登记，再点一次恢复全部' : '资助团队登记、在服务点保管的物品', st.ly === 'team' ? '筛选中' : '', st.ly === 'team')}
              </div>
            </section>
            <section class="rules-card">
              <div class="side-head"><h3 class="side-head__title">服务点与值班</h3><span class="underline-deco"></span></div>
              <div class="rules-card__list">${S.lfPoints().slice(0, 5).map(p => `<div class="rules-card__item" style="cursor:default"><span style="min-width:0"><div class="rules-card__name">${esc(p.mc)}</div><div class="rules-card__desc">${esc(p.dz || '由团队确认地址')} · ${esc(p.zbap)}</div>${p.lstz ? `<div class="rules-card__desc c-warn">${esc(p.lstz)}</div>` : ''}</span>${S.lfCanEditPoint(p.id) ? `<button type="button" class="btn-link" data-act="fixPoint" data-id="${p.id}">修正</button>` : ''}</div>`).join('')}</div>
            </section>
            <section class="rules-card">
              <div class="side-head"><h3 class="side-head__title">我的失物招领</h3><span class="underline-deco"></span></div>
              <div class="rules-card__list">
                ${sideItem('myFound', '我的发布', `捡到 ${S.lfMyItems('found').length} 件 · 寻物 ${S.lfMyItems('lost').length} 条`)}
                ${sideItem('myClaims', '我的认领', '查看认领申请的核对进度', S.lfMyClaims('ongoing').filter(c => c.zt === 'more').length ? '待补充' : '')}
                ${team ? sideItem('work', '招领工作台', `待认领 ${tstats.pending} · 待核对 ${tstats.claims} · 今日归还 ${tstats.todayReturned}`) : ''}
              </div>
            </section>
          </aside>
        </div>
      </div>`;
    },
    bind(root, st) {
      UI.delegate(root, 'click', '[data-lx]', (e, el) => { st.lx = el.dataset.lx; st.limit = 10; PC.refresh(); });
      UI.delegate(root, 'click', '[data-lf]', (e, el) => { if (e.target.closest('.post-card__img')) UI.preview(e.target.src); else PC.openLost(el.dataset.lf); });
      UI.delegate(root, 'change', '[data-f]', (e, el) => { st[el.dataset.f] = el.value; st.limit = 10; PC.refresh(); });
      UI.delegate(root, 'change', '[data-closed]', (e, el) => { st.closed = el.checked; PC.refresh(); });
      let kwTimer;
      UI.delegate(root, 'input', '[data-keep="lfkw"]', (e, el) => { clearTimeout(kwTimer); kwTimer = setTimeout(() => { st.kw = el.value; st.limit = 10; PC.refresh(); }, 250); });
      UI.delegate(root, 'click', '[data-act]', (e, el) => {
        const a = el.dataset.act;
        if (a === 'pub') { if (PC.canInteract()) PC.go(LOST + '/publish'); }
        else if (a === 'pubTeam') { if (PC.canInteract()) PC.go(LOST + '/publish', { team: 1 }); }
        else if (a === 'clearKw') { e.preventDefault(); st.kw = ''; root.querySelector('[data-keep="lfkw"]').value = ''; PC.refresh(); }
        else if (a === 'clearFilter') { Object.assign(st, { kw: '', xq: '', fl: '', days: 0, ly: '' }); root.querySelector('[data-keep="lfkw"]').value = ''; PC.refresh(); }
        else if (a === 'pubLost' || a === 'pubFound') { if (PC.canInteract()) PC.go(LOST + '/publish', { lx: a === 'pubLost' ? 'lost' : 'found' }); }
        else if (a === 'digest') openDigests();
        else if (a === 'teamOnly') { st.lx = 'found'; st.ly = st.ly === 'team' ? '' : 'team'; st.limit = 10; toast(st.ly === 'team' ? '已只看团队登记' : '已显示全部来源', 'success'); PC.refresh(); }
        else if (a === 'fixPoint') openPointSchedule(el.dataset.id);
        else if (a === 'myFound') openMyLost('found');
        else if (a === 'myClaims') openMyLost('claims');
        else if (a === 'work') PC.go('/bbs/admin/lost/items');
      });
      root.addEventListener('scroll', e => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('rp-page')) return;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 120) {
          const total = S.lfList({ lx: st.lx, kw: st.kw, xq: st.xq, fl: st.fl, days: st.days, ly: st.ly, closed: st.closed }).length;
          if (st.limit < total) { st.limit += 10; PC.refresh(); }
        }
      }, true);
    },
    mounted(root, st, isRefresh) {
      if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
      if (!isRefresh && st.openId) { const id = st.openId; st.openId = null; setTimeout(() => PC.openLost(id), 50); }
    }
  };

  /* 失物表单（独立发布页、以及普通发布页选中「失物招领」时共用） */
  function lfPublishBody(f, { id = '', team = false, keep = '' } = {}) {
    const found = f.lx === 'found';
    const pts = team ? S.lfMyPoints() : S.lfPoints();
    const chev = '<svg class="publish-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    const ka = name => `data-keep="${keep}${name}"`;
    const pick = (k, label, opts, req = true, ph = '请选择') => {
      const cur = opts.find(o => o.value === f[k]);
      return `<label class="publish-select"><span class="publish-select__label">${req ? '<em>*</em> ' : ''}${label}：</span>
        <span class="publish-select__val ${cur ? '' : 'is-ph'}">${cur ? esc(cur.label) : ph}</span>${chev}
        <select data-f="${k}" ${id && k === 'lx' ? 'disabled' : ''}><option value="">${ph}</option>${opts.map(o => `<option value="${o.value}" ${o.value === f[k] ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    };
    const lxOpts = team ? [LF.LX_TABS[0]] : LF.LX_TABS;
    const bgOpts = [{ value: 'self', label: '我自己保管' }, { value: 'point', label: '交到服务点' }];
    return `<div class="publish-selects">
      ${pick('lx', '发布类型', lxOpts)}
      ${pick('fl', '物品种类', S.LF_FL)}
      ${pick('xq', '校区', S.LF_XQ.map(x => ({ value: x, label: x })))}
    </div>
    <div class="publish-selects">
      ${pick('sjsm', found ? '捡到时段' : '丢失时段', LF.SJSM.map(x => ({ value: x, label: x })), false, '不确定')}
      ${found && !team ? pick('bgfs', '保管方式', bgOpts) : ''}
      ${found && f.bgfs === 'point' ? pick('bgdid', '服务点', pts.map(p => ({ value: p.id, label: p.mc }))) : ''}
    </div>
    <div class="publish-field"><span class="publish-field__label"><em>*</em>物品名称：</span><input class="input" maxlength="30" data-f="mc" ${ka('mc')} placeholder="如：白色蓝牙耳机盒、校园卡" value="${esc(f.mc)}"></div>
    <div class="publish-selects" style="grid-template-columns:2fr 1fr">
      <div class="publish-field"><span class="publish-field__label"><em>*</em>${found ? '捡到地点' : '可能丢失的地点'}：</span><input class="input" maxlength="40" data-f="dd" ${ka('dd')} placeholder="如：图书馆三楼自习区" value="${esc(f.dd)}"></div>
      <div class="publish-field"><span class="publish-field__label">${found ? '捡到日期' : '丢失日期'}：</span><input class="input" type="date" data-f="rq" ${ka('rq')} max="${S.fmtDate(Date.now())}" value="${esc(f.rq)}"></div>
    </div>
    <div class="publish-field"><span class="publish-field__label">补充说明：</span><textarea class="textarea" maxlength="300" data-f="nr" ${ka('nr')} placeholder="${found ? '描述外观即可，关键特征（如贴纸、内含物品）请留给认领人核对' : '描述物品特征、可能遗落的时间段，方便同学提供线索'}" style="min-height:.52083rem">${esc(f.nr)}</textarea></div>
    <div class="publish-upload" data-act="upload"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42'%3E%3Cpath d='M4 10a4 4 0 014-4h9l4 4h13a4 4 0 014 4v18a4 4 0 01-4 4H8a4 4 0 01-4-4z' fill='%233087CC'/%3E%3Ccircle cx='21' cy='22' r='7' fill='%23fff'/%3E%3Cpath d='M21 26v-7M18 21.5l3-3 3 3' stroke='%233087CC' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" alt="">
      <p class="publish-upload__title">点击上传物品照片（最多 6 张）</p><p class="publish-upload__hint">${found ? '证件类请遮挡姓名、学号等信息' : '可上传物品的旧照片，方便辨认'}</p></div>
    ${f.tps.length ? `<div class="thumbs">${f.tps.map((t, i) => `<div class="thumb"><img src="${esc(imgSrc(t))}" alt=""><button class="thumb__del" data-del-img="${i}">×</button></div>`).join('')}</div>` : ''}
    ${found && f.bgfs === 'point' ? (() => { const p = S.lfPoint(f.bgdid); return p ? `<p class="publish-tip" style="text-align:left">交到 ${esc(LF.pointText(p))}，值班：${esc(p.zbap)}${p.lstz ? `　<span class="c-warn">${esc(p.lstz)}</span>` : ''}</p>` : ''; })() : ''}`;
  }

  /* 发布 / 编辑（团队登记与编辑仍走此页） */
  PC.pages[LOST + '/publish'] = {
    title: '发布失物招领',
    init(q) {
      if (q.id) {
        const it = S.lfGet(q.id);
        if (!it || !it.canEdit) { setTimeout(() => { toast('信息不存在或无权编辑', 'error'); PC.go(LOST + '/index'); }); return { missing: true }; }
        return { id: it.id, team: it.isTeam, f: LF.formFrom(it) };
      }
      if (q.team === '1' && !S.lfCan('register')) {
        setTimeout(() => toast('当前账号没有资助团队登记权限，不能以团队身份发布', 'warning'), 30);
        return { denied: true };
      }
      const team = q.team === '1';
      const f = LF.newForm(q.lx === 'lost' ? 'lost' : 'found');
      if (team) { const p = S.lfMyPoints()[0]; Object.assign(f, { bgfs: 'point', bgdid: p ? p.id : '', xq: p && p.xq ? p.xq : '' }); }
      return { id: '', team, f };
    },
    render(st) {
      if (st.denied) return `<div class="rp-page"><div class="bbs-home__empty" style="padding:1rem">当前账号没有资助团队登记权限，不能以团队身份发布。<div style="margin-top:.08333rem"><button class="btn btn--primary" data-act="back">返回</button></div></div></div>`;
      if (st.missing) return '';
      const f = st.f, found = f.lx === 'found';
      const title = st.id ? '编辑失物招领' : st.team ? '团队登记物品' : found ? '发布捡到的物品' : '发布寻物求助';
      return `<div class="bbs-publish">
        <div class="bbs-publish__bg"><img src="assets/pc/publish-page-bg.webp" alt=""></div>
        <div class="bbs-publish__shell"><div class="publish-card">
          <div class="publish-tab"><button class="publish-tab__nav" data-act="back" title="返回">←</button><span class="publish-tab__label">失物招领<button data-act="back" title="关闭">×</button></span><button class="publish-tab__nav" style="margin-left:auto" disabled title="前进">→</button></div>
          <div class="publish-panel">
            <div class="publish-panel__head"><div class="side-head"><h3 class="side-head__title">${title}</h3><span class="underline-deco"></span></div></div>
            ${lfPublishBody(f, { id: st.id, team: st.team })}
            <div class="publish-footer">
              <button class="publish-footer__draft" data-act="preview">预览</button>
              <button class="publish-footer__submit ${LF.formMissing(f) ? '' : 'is-active'}" data-act="submit">${st.id ? '保存修改' : st.team ? '登记' : '发布'}</button>
            </div>
            <p class="publish-tip">请勿公开完整学号、身份证号等信息；认领时由核对人对照特征核验</p>
          </div>
        </div></div>
      </div>`;
    },
    bind(root, st) {
      const syncBtn = () => { const b = root.querySelector('.publish-footer__submit'); if (b) b.classList.toggle('is-active', !LF.formMissing(st.f)); };
      UI.delegate(root, 'input', 'input[data-f],textarea[data-f]', (e, el) => { st.f[el.dataset.f] = el.value; syncBtn(); });
      UI.delegate(root, 'change', 'select[data-f]', (e, el) => {
        const k = el.dataset.f;
        st.f[k] = el.value;
        if (k === 'lx' && el.value !== 'found') st.f.bgfs = 'self';
        if (k === 'bgfs' && el.value !== 'point') st.f.bgdid = '';
        PC.refresh();
      });
      UI.delegate(root, 'click', '[data-del-img]', (e, el) => { st.f.tps.splice(+el.dataset.delImg, 1); PC.refresh(); });
      UI.delegate(root, 'click', '[data-act]', UI.guard(async (e, el) => {
        const a = el.dataset.act;
        if (a === 'back') PC.back();
        else if (a === 'upload') {
          if (st.f.tps.length >= 6) { toast('最多上传 6 张图', 'warning'); return; }
          const imgs = await UI.pickImages({ max: 6, existing: st.f.tps.length });
          if (imgs.length) { st.f.tps.push(...imgs); PC.refresh(); }
        } else if (a === 'preview' || a === 'submit') {
          if (!st.f.lx) { toast('请选择发布类型', 'warning'); return; }
          const miss = LF.formMissing(st.f);
          if (miss) { toast(miss, 'warning'); return; }
          if (!PC.canInteract()) return;
          if (a === 'preview') openLfPreview(st);
          else submitLf(st);
        }
      }));
    }
  };
  function lfDraftView(st) {
    const f = st.f, me = S.me(), p = S.lfPoint(f.bgdid);
    return Object.assign({ id: '', bh: '发布后生成', fbsj: Date.now(), tone: 'blue', claimN: 0, clueN: 0 }, f, {
      flLabel: (S.LF_FL.find(x => x.value === f.fl) || {}).label, ztLabel: f.lx === 'lost' ? '寻找中' : '待认领', tone: f.lx === 'lost' ? 'orange' : 'blue',
      fbrnc: me.nc, fbrtx: me.tx, isTeam: !!st.team, lyLabel: st.team ? '团队发布' : '同学发布',
      sjText: f.rq + (f.sjsm ? ' ' + f.sjsm : ''), bgText: f.lx === 'lost' ? '' : f.bgfs === 'self' ? '发布同学保管' : (p ? p.mc : '服务点')
    });
  }
  function openLfPreview(st) {
    UI.open({
      kind: 'dialog', title: '发布预览', width: '4.8rem',
      render: () => `<p class="rdd__tip" style="margin:0 0 .0625rem">同学们在列表中看到的效果如下</p>${PC.lfCard(lfDraftView(st))}
        <div class="dlg-foot"><button class="btn" data-close>返回修改</button><button class="btn btn--primary" data-ok>${st.id ? '保存修改' : '确认发布'}</button></div>`,
      on: { 'click [data-ok]': (e, el, l) => { submitLf(st); l.close(); } }
    });
  }
  function submitLf(st) {
    const data = LF.toPayload(st.f);
    if (st.team) Object.assign(data, { ly: 'team', bgfs: 'point' });
    let it;
    try {
      if (st.id) { S.lfUpdate(st.id, data); toast('已保存', 'success'); PC.go(LOST + '/index', { id: st.id }); return; }
      it = S.lfCreate(data);
    } catch (err) { toast(err.message || '发布失败', 'error'); return; }
    if (st.team) { toast('已登记 ' + it.bh, 'success'); PC.go('/bbs/admin/lost/items'); return; }
    UI.open({
      kind: 'dialog', cls: 'rdd', title: '发布成功<span class="underline-deco"></span>', width: '4.2rem', closeOnMask: false,
      render: () => `<div class="rdd__body"><div class="rdd__banner"><div><div class="rdd__banner-title">${it.lx === 'found' ? '招领信息已发布' : '寻物信息已发布'}</div>
        <div class="rdd__banner-sub">${it.lx === 'found' ? '失主提交认领申请后，会通过消息通知你核对。' : '有同学提供线索时，会通过消息和私信通知你。'}信息编号：${esc(it.bh)}</div></div></div></div>
        <div class="dlg-foot"><button class="btn" data-mine>我的失物招领</button><button class="btn btn--primary" data-view>查看详情</button></div>`,
      on: {
        'click [data-mine]': (e, el, l) => { l.close(); PC.go(LOST + '/index', { lx: it.lx }); setTimeout(() => openMyLost(it.lx), 80); },
        'click [data-view]': (e, el, l) => { l.close(); PC.go(LOST + '/index', { lx: it.lx, id: it.id }); }
      }
    });
  }
  PC.openMyLost = openMyLost;
})();
