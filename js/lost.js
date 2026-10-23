/*
 * 中南点点原型 · 失物招领共用逻辑
 * 移动端、PC 前台、管理端共用：认领进度、交接默认值、汇总文案、状态与样式映射。
 * 样式一律复用各端已有的类名，这里只决定"用哪个已有类"。
 */
(function () {
  const S = Store;
  const LF = window.LF = {};

  LF.SJSM = ['上午', '中午', '下午', '晚上'];
  LF.LY = [{ value: '', label: '全部来源' }, { value: 'team', label: '团队发布' }, { value: 'student', label: '同学发布' }];
  LF.LX_TABS = [{ value: 'found', label: '捡到物品' }, { value: 'lost', label: '寻物求助' }];

  // H5：状态复用 reply-flag，分类复用 lx-pill
  LF.h5Flag = it => ({ blue: 'pending', orange: 'pending', green: 'done', gray: 'off' })[it.tone] || 'pending';
  LF.h5FlTone = fl => ({ campuscard: 'purple', idcard: 'pink', digital: 'green', daily: 'orange', other: 'green' })[fl] || 'green';
  // PC 前台：复用 tag--*；管理端：复用 status-tag--*
  LF.pcTag = tone => ({ blue: 'blue', orange: 'orange', green: 'green', gray: 'gray' })[tone] || 'gray';
  LF.adminTag = tone => ({ blue: 'blue', orange: 'topped', green: 'normal', gray: 'gray' })[tone] || 'gray';
  // 团队登记物品的额外标识。跟物品来源走，不替换发布者昵称。
  LF.teamBadge = (it, where) => {
    if (!it || !it.isTeam) return '';
    if (where === 'h5') return '<span class="cmt__tag">资助团队</span>';
    if (where === 'admin') return '<span class="status-tag status-tag--blue">资助团队</span>';
    return '<span class="tag tag--blue">资助团队</span>';
  };

  LF.pointText = p => !p ? '—' : p.dz ? `${p.mc}（${p.dz}）` : p.mc;
  LF.handoverDefault = it => {
    const p = it.point;
    if (it.bgfs === 'self') return { dd: '', sj: '', lxfs: '站内私信' };
    return { dd: LF.pointText(p), sj: p ? p.zbap : '', lxfs: p ? p.lxfs : '' };
  };

  LF.bannerText = it => ({
    pending: it.bgfs === 'self' ? '物品由发布同学保管，提交认领申请后由发布人核对' : '物品已交到服务点，提交认领申请后由资助团队核对',
    checking: '已有认领申请通过核对，正在安排交接；如果是你的物品，仍可提交申请',
    returned: '物品已归还失主，感谢大家的帮助',
    seeking: '失主正在寻找，如果你见过这件物品，欢迎提供线索',
    found: '失主已找回物品，感谢大家的帮助',
    withdrawn: '发布人已撤回：' + (it.cxyy || '—'),
    expired: '因时间久远已处理，如有疑问请联系资助团队'
  })[it.ztKey];
  // 详情页底部按钮：[动作, 文案]，最后一个为主按钮
  LF.detailActions = (it, my) => {
    if (it.closed) return [];
    const found = it.lx === 'found';
    const team = !it.isMine && (it.canEdit || it.canReturn);
    const btns = [];
    if (it.isMine) {
      btns.push(['withdraw', '撤回']);
      if (found && it.bgfs === 'self') btns.push(['transfer', '转交服务点']); else btns.push(['edit', '编辑']);
      btns.push(found ? ['returnSelf', '确认已归还'] : ['markFound', '标记已找回']);
    } else if (team) {
      if (it.canEdit) btns.push(['edit', '编辑'], ['withdraw', '撤回']);
      if (it.canReturn) btns.push(['returnSelf', '线下归还']);
      if (!found) btns.push(['clue', '提供线索']);
    } else if (found) {
      btns.push(['contact', it.bgfs === 'self' ? '私信保管人' : '联系团队']);
      btns.push(my && ['pending', 'more', 'pass'].includes(my.zt) ? ['myClaim', '查看我的申请'] : ['claim', '申请认领']);
    } else {
      btns.push(['contact', '私信失主'], ['clue', '提供线索']);
    }
    return btns;
  };
  LF.contactUid = it => it.bgfs === 'point' && it.point && it.point.fzr ? it.point.fzr : it.fbrid;
  LF.QUICK = {
    more: ['请补充物品上的特殊标记', '请提供购买记录或照片', '请描述物品内的其他物品'],
    reject: ['特征与登记信息不符', '无法提供有效证明', '物品已归还给其他认领人'],
    withdraw: ['已经找到了', '信息填写有误', '物品已交给失主']
  };

  LF.digestLine = d => d && d.total ? d.groups.map(g => `${g.xq} ${g.n} 件`).join(' · ') : '今日暂无新增';
  LF.digestTitle = d => `${S.fmtDate(d.rq)} 招领汇总`;

  // 认领进度：提交申请 → 核对材料 → 安排交接 → 完成归还
  LF.claimSteps = c => {
    const t = act => { const l = c.logs.slice().reverse().find(x => x.act === act); return l ? S.fmtDate(l.t, true) : ''; };
    const reviewed = ['pass', 'done'].includes(c.zt);
    const steps = [
      { title: '提交申请', state: 'done', time: S.fmtDate(c.cjsj, true), desc: '' },
      { title: '核对材料', state: reviewed ? 'done' : c.zt === 'reject' ? 'done' : 'cur', time: reviewed ? t('核对通过') : c.zt === 'reject' ? t('核对未通过') || S.fmtDate(c.gxsj, true) : '',
        desc: c.zt === 'more' ? '需要补充：' + c.bcyq : c.zt === 'pending' ? '核对人会对照物品特征核验，请留意消息' : c.zt === 'reject' ? '未通过：' + (c.jl || '与登记信息不符') : c.jl },
      { title: '安排交接', state: c.zt === 'done' || (c.zt === 'pass' && c.jj) ? 'done' : c.zt === 'pass' ? 'cur' : 'todo', time: c.jj ? S.fmtDate(c.jj.t, true) : '',
        desc: c.jj ? `${c.jj.dd} · ${c.jj.sj}` : c.zt === 'pass' ? '核对人将通过私信告知领取地点和时间' : '' },
      { title: '完成归还', state: c.zt === 'done' ? 'done' : c.zt === 'pass' && c.jj ? 'cur' : 'todo', time: c.zt === 'done' ? S.fmtDate(c.gxsj, true) : '',
        desc: c.zt === 'pass' && c.jj ? '领取时请携带校园卡或有效证件' : '' }
    ];
    if (c.zt === 'reject') steps.splice(2);
    return steps;
  };
  LF.claimHint = c => ({
    pending: '已提交，等待核对',
    more: '需要补充材料：' + c.bcyq,
    pass: c.jj ? `请于 ${c.jj.sj} 到 ${c.jj.dd} 领取` : '核对通过，等待安排交接',
    reject: '未通过：' + (c.jl || '与登记信息不符'),
    done: '已完成归还'
  })[c.zt];

  LF.logText = l => `${S.fmtDate(l.t, true)} · ${l.act}${l.note ? '：' + l.note : ''} · ${(S.user(l.uid) || {}).nc || '系统'}`;

  // 发布表单的公共校验（前端提示，最终以 Store 为准）
  LF.formMissing = f => {
    if (!f.fl) return '请选择物品种类';
    if (!(f.mc || '').trim()) return '请填写物品名称';
    if (!f.xq) return '请选择校区';
    if (!(f.dd || '').trim()) return f.lx === 'lost' ? '请填写可能丢失的地点' : '请填写捡到地点';
    if (f.lx === 'found' && f.bgfs === 'point' && !f.bgdid) return '请选择交到的服务点';
    return '';
  };
  LF.toPayload = f => ({
    lx: f.lx, fl: f.fl, mc: f.mc, xq: f.xq, dd: f.dd, sjsm: f.sjsm, nr: f.nr, tps: f.tps,
    sj: f.rq ? new Date(f.rq + 'T12:00').getTime() : undefined, bgfs: f.lx === 'found' ? f.bgfs : '', bgdid: f.bgfs === 'point' ? f.bgdid : ''
  });
  LF.newForm = (lx = 'found') => ({ lx, fl: '', mc: '', xq: '', dd: '', rq: S.fmtDate(Date.now()), sjsm: '', nr: '', tps: [], bgfs: 'self', bgdid: '' });
  LF.formFrom = it => ({ lx: it.lx, fl: it.fl, mc: it.mc, xq: it.xq, dd: it.dd, rq: S.fmtDate(it.sj), sjsm: it.sjsm, nr: it.nr, tps: (it.tps || []).slice(), bgfs: it.bgfs || 'self', bgdid: it.bgdid });
})();
