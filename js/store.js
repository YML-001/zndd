/*
 * 中南点点原型 · 数据层
 * 所有页面（PC 前台 / 管理端 / H5）共用这一份 localStorage 数据。
 * 字段命名沿用线上接口（tz 帖子、pl 评论、bm 部门、ht 话题、jb 举报、sx 私信、xx 消息），
 * 后续接真实后端时可按同名字段替换。
 */
(function () {
  const DB_KEY = 'zndd_proto_db_v1';
  const DAY = 86400000;
  const HOUR = 3600000;

  /* ---------- 字典 ---------- */
  const LX = [
    { value: 'daily', label: '校园日常', tone: 'green', desc: '分享校园点滴', bg: '#E5FCF5', prefix: 'Y' },
    { value: 'feedback', label: '吐槽建议', tone: 'orange', desc: '吐槽与建议反馈', bg: '#FFF2E5', prefix: 'T' },
    { value: 'praise', label: '点赞表扬', tone: 'pink', desc: '记录暖心瞬间', bg: '#FFF0F5', prefix: 'B' },
    { value: 'secondhand', label: '二手闲置', tone: 'purple', desc: '发布转让与求购', bg: '#EDE8FF', prefix: 'S' }
  ];
  const LX_MAP = Object.fromEntries(LX.map(x => [x.value, x]));
  const REPORT_TYPES = ['涉政有害', '不友善', '垃圾广告', '违法违规', '色情低俗', '涉嫌侵权', '网络暴力', '涉未成年', '自杀自残', '扰乱社区秩序', '其他违规内容'];
  const BAN_REASONS = ['发布违规内容', '恶意刷屏', '虚假信息', '人身攻击', '其他'];
  const BAN_DURATIONS = [
    { value: 1, label: '1天' }, { value: 2, label: '2天' }, { value: 7, label: '7天' },
    { value: 30, label: '30天' }, { value: -1, label: '永久（需手动解封）' }
  ];
  const ZTBQ = { normal: '正常', topped: '已置顶', reported: '被举报', deleted: '已删除' };
  const RISK_LEVELS = { 1: '一级风险(紧急)', 2: '二级风险(预警)', 3: '三级风险(关注)' };
  // 风险识别词库：发帖/编辑时自动打标（原型用关键词模拟线上 AI 识别）
  const RISK_WORDS = {
    1: ['自杀', '轻生', '跳楼', '不想活', '割腕', '结束生命'],
    2: ['打架', '威胁', '诈骗', '抑郁', '霸凌', '报复', '偷拍'],
    3: ['投诉', '曝光', '维权', '黑幕', '集体', '退钱']
  };
  /* 失物招领 */
  const LF_XQ = ['岳麓山校区', '潇湘校区', '麓南校区', '天心校区', '开福校区', '杏林校区'];
  const LF_XQ_ALIAS = {
    岳麓山: '岳麓山校区', 本部: '岳麓山校区', 校本部: '岳麓山校区',
    潇湘: '潇湘校区', 新校: '潇湘校区', 新校区: '潇湘校区',
    麓南: '麓南校区', 南校: '麓南校区', 南校区: '麓南校区',
    天心: '天心校区', 铁道: '天心校区', 铁道校区: '天心校区',
    开福: '开福校区', 湘雅: '开福校区', 湘雅校区: '开福校区',
    杏林: '杏林校区', 湘雅新校区: '杏林校区'
  };
  const LF_FL = [
    { value: 'campuscard', label: '校园卡' },
    { value: 'idcard', label: '其他证件卡片' },
    { value: 'digital', label: '数码产品' },
    { value: 'daily', label: '生活用品' },
    { value: 'other', label: '其他' }
  ];
  const LF_FL_MAP = Object.fromEntries(LF_FL.map(x => [x.value, x]));
  const LF_ZT = {
    pending: { label: '待认领', tone: 'blue' }, checking: { label: '核对中', tone: 'orange' }, returned: { label: '已归还', tone: 'green' },
    seeking: { label: '寻找中', tone: 'orange' }, found: { label: '已找回', tone: 'green' }, withdrawn: { label: '已撤回', tone: 'gray' },
    expired: { label: '因时间久远已处理', tone: 'gray' }
  };
  const LF_CLAIM_ZT = {
    pending: { label: '待核对', tone: 'blue' }, more: { label: '待补充', tone: 'orange' }, pass: { label: '通过', tone: 'green' },
    reject: { label: '未通过', tone: 'gray' }, done: { label: '已完成', tone: 'green' }, cancel: { label: '已撤回', tone: 'gray' }
  };
  const LF_ROLES = {
    register: { label: '登记成员', desc: '登记与编辑负责服务点的物品', scope: '负责服务点的物品信息' },
    checker: { label: '核对成员', desc: '处理授权的认领申请与交接归还', scope: '所处理申请的核验材料' },
    admin: { label: '管理员', desc: '配置服务点、成员、异常处理', scope: '按业务职责管理相关记录' }
  };
  const LF_DAYS = [{ value: 0, label: '不限' }, { value: 1, label: '今天' }, { value: 3, label: '近 3 天' }, { value: 7, label: '近 7 天' }, { value: 30, label: '近 30 天' }];
  const LF_EXPIRE = 730 * DAY;
  const NICK_A = ['快乐的', '安静的', '奔跑的', '发光的', '爱吃饭的', '早起的', '迷路的', '认真的', '佛系的', '热心的'];
  const NICK_B = ['小麓', '岳麓山', '湘江风', '樱花', '桂花糕', '橘子洲', '升华楼', '图书馆猫', '北三门', '麓南校区'];

  /* ---------- 工具 ---------- */
  const uid = (p = '') => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const now = () => Date.now();
  const pad = n => String(n).padStart(2, '0');
  function fmtDate(t, withTime) {
    const d = new Date(t);
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
  }
  function fmtDateTime(t) {
    const d = new Date(t);
    return `${fmtDate(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function relTime(t) {
    const diff = now() - t;
    if (diff < 60000) return '刚刚';
    if (diff < HOUR) return Math.floor(diff / 60000) + '分钟前';
    if (diff < DAY) return Math.floor(diff / HOUR) + '小时前';
    if (diff < 7 * DAY) return Math.floor(diff / DAY) + '天前';
    return fmtDate(t);
  }
  // 私信列表：当天 HH:mm，同年 MM-DD，跨年 YYYY-MM-DD
  function pmListTime(t) {
    const d = new Date(t), n = new Date();
    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.getFullYear() === n.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return fmtDate(t);
  }
  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function startOfWeek(t) {
    const d = new Date(startOfDay(t));
    const w = d.getDay() || 7;
    return d.getTime() - (w - 1) * DAY;
  }

  /* ---------- 种子数据（虚构） ---------- */
  function seed() {
    const t0 = now();
    const ago = (d, h = 0, m = 0) => t0 - d * DAY - h * HOUR - m * 60000;

    const depts = [
      { id: 'b000', bmmc: '学工部', fzrgh: '19900001234', bmlxr: '', hflsxs: 48, px: 0, zt: '1', cjsj: ago(88), gxsj: ago(88) },
      { id: 'b001', bmmc: '后勤', fzrgh: '19900001234', bmlxr: '13800000000', hflsxs: 48, px: 1, zt: '1', cjsj: ago(145), gxsj: ago(92) },
      { id: 'b002', bmmc: '食堂', fzrgh: '2202600001', bmlxr: '13800000001', hflsxs: 48, px: 2, zt: '1', cjsj: ago(145), gxsj: ago(92) },
      { id: 'b003', bmmc: '图书馆', fzrgh: '2202600001', bmlxr: '13800000002', hflsxs: 48, px: 3, zt: '1', cjsj: ago(145), gxsj: ago(92) },
      { id: 'b004', bmmc: '保卫处', fzrgh: '2202600001', bmlxr: '13800000003', hflsxs: 48, px: 4, zt: '1', cjsj: ago(103), gxsj: ago(92) },
      { id: 'b005', bmmc: '无', fzrgh: '2202600001', bmlxr: '13800000004', hflsxs: 48, px: 999, zt: '1', cjsj: ago(103), gxsj: ago(92) }
    ];
    const topics = [
      { id: 'ht01', htbh: 'xgxt', htmc: '学工系统', zdbmid: 'b000', px: 0, zt: '1', cjsj: ago(88) },
      { id: 'ht02', htbh: 'jzxj', htmc: '奖助学金', zdbmid: 'b000', px: 1, zt: '1', cjsj: ago(80) },
      { id: 'ht03', htbh: 'sswx', htmc: '宿舍报修', zdbmid: 'b001', px: 0, zt: '1', cjsj: ago(92) },
      { id: 'ht04', htbh: 'hqqt', htmc: '后勤其他', zdbmid: 'b001', px: 1, zt: '1', cjsj: ago(92) },
      { id: 'ht05', htbh: 'cpzl', htmc: '菜品质量', zdbmid: 'b002', px: 0, zt: '1', cjsj: ago(92) },
      { id: 'ht06', htbh: 'zwyy', htmc: '座位预约', zdbmid: 'b003', px: 0, zt: '1', cjsj: ago(92) },
      { id: 'ht07', htbh: 'xyaq', htmc: '校园安全', zdbmid: 'b004', px: 0, zt: '1', cjsj: ago(92) },
      { id: 'ht08', htbh: 'jtcx', htmc: '交通出行', zdbmid: 'b004', px: 1, zt: '0', cjsj: ago(60) }
    ];

    const colleges = ['计算机学院', '自动化学院', '机电工程学院', '冶金与环境学院', '资源加工与生物工程学院', '建筑与艺术学院', '法学院', '湘雅医学院', '商学院', '文学院', '材料科学与工程学院', '能源科学与工程学院', '交通运输工程学院', '外国语学院'];
    const realNames = ['林知夏', '周以安', '陈语桐', '王子墨', '李星河', '赵一鸣', '孙若溪', '吴嘉树', '郑可欣', '冯启航', '何书言', '许乐乐', '沈南乔', '韩予白', '唐小满', '曹景行', '邓思远', '萧清和', '彭雨眠', '罗一帆', '谢晚晴', '高子昂'];
    const nicks = ['橘子洲的风', '岳麓山下', '小麓同学', '奔跑的蜗牛', '图书馆占座王', '早八战士', '麓南校区吃货', '湘江夜跑', '桂花糕', '升华楼的猫', '北三门路人', '樱花雨', '学术小白', '用户3f8a21c0', '用户9b2e7d14', '晚风', '一只柠檬', '熬夜冠军', '数学不挂', '岳麓书院打卡', '用户5c61aa09', '咕咕咕'];
    const avatarColors = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD', '#78D3F8', '#F08BB4', '#9661BC', '#F6903D', '#008685', '#D37099'];

    const users = [{
      id: 'u_admin', nc: '老坛杉菜', tx: 'assets/h5/default-avatar.png', xm: '学工系统管理员', xh: '19900001234', dlzh: '19900001234',
      bmmc: '计算机学院', nj: '', sjhm: '19900001234', jsr: 'teacher', role: 'admin', sfgf: '0', rzbmid: '', fjzt: '0', sfwczl: '1',
      ncChangeRemain: 3, cjsj: ago(23), fdy: '—', fdydh: '—', bds: '—', bdsdh: '—'
    }];
    realNames.forEach((xm, i) => {
      const nj = 2022 + (i % 4);
      users.push({
        id: 'u' + (101 + i), nc: nicks[i], tx: i % 5 === 3 ? 'assets/h5/default-avatar.png' : 'color:' + avatarColors[i % avatarColors.length],
        xm, xh: `82${nj % 100}${pad(i + 10)}0${100 + i}`, dlzh: '', bmmc: colleges[i % colleges.length], nj: nj + '级',
        sjhm: '1' + (3800000000 + i * 7919 + 1234567), jsr: 'student', role: 'student', sfgf: '0', rzbmid: '', fjzt: '0',
        sfwczl: i === 20 ? '0' : '1', ncChangeRemain: 3, cjsj: ago(30 - (i % 25), i), fdy: ['刘老师', '张老师', '欧阳老师'][i % 3],
        fdydh: '1517310' + pad(i) + '88', bds: ['黄老师', '陈老师'][i % 2], bdsdh: '1397312' + pad(i) + '66'
      });
    });
    users.forEach(u => { if (!u.dlzh) u.dlzh = u.xh; });
    users.push({
      id: 'u_hq', nc: '后勤服务中心', tx: 'color:#3087CC', xm: '后勤值班', xh: '2202600001', dlzh: '2202600001', bmmc: '后勤保障部', nj: '',
      sjhm: '13800000000', jsr: 'teacher', role: 'student', sfgf: '1', rzbmid: 'b001', fjzt: '0', sfwczl: '1', ncChangeRemain: 3, cjsj: ago(60),
      fdy: '—', fdydh: '—', bds: '—', bdsdh: '—'
    });
    users.push({
      id: 'u_bw', nc: '保卫处值班室', tx: 'color:#1E323F', xm: '保卫处值班', xh: '2202600002', dlzh: '2202600002', bmmc: '保卫处', nj: '',
      sjhm: '13800000003', jsr: 'teacher', role: 'student', sfgf: '1', rzbmid: 'b004', fjzt: '0', sfwczl: '1', ncChangeRemain: 3, cjsj: ago(60),
      fdy: '—', fdydh: '—', bds: '—', bdsdh: '—'
    });
    // 一个已封禁账号，便于演示
    Object.assign(users.find(u => u.id === 'u113'), { fjzt: '1', fjyy: '恶意刷屏', fjsc: 7, fjjssj: t0 + 5 * DAY });

    const seq = {};
    function tzbh(lx, t) {
      const d = new Date(t);
      const key = LX_MAP[lx].prefix + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
      seq[key] = (seq[key] || 0) + 1;
      return key + String(seq[key]).padStart(6, '0');
    }
    const P = (o) => {
      const p = Object.assign({
        id: uid('tz_'), ht: 'other', zdbmid: '', ztbq: 'normal', hfzt: 'pending', sfgfhf: '0', likedBy: [], llcs: 0, tps: [],
        fxdj: 0, fxgjcs: '', zt: '1'
      }, o);
      p.tzbh = tzbh(p.lx, p.fbsj);
      p.cjsj = p.fbsj; p.gxsj = p.fbsj;
      return p;
    };
    const L = (n) => users.slice(1, 1 + n).map(u => u.id);
    const posts = [
      P({ bt: '【持续更新】大家希望中南点点能增加或者完善什么功能，可以写在评论区。', nr: '大家希望中南点点能增加或者完善什么功能，可以写在评论区，到时候汇总收集起来给中南点点的平台运营，提升大家的使用体验感。', lx: 'daily', fbrid: 'u101', ztbq: 'topped', fbsj: ago(10, 1), llcs: 486, likedBy: L(2) }),
      P({ bt: '国庆出行注意安全，北门附近有人搭讪推销', nr: '今天下午在北门附近又遇到两个人拦路推销，还想看手机，大家假期出门注意保管好财物，遇到情况可以直接联系保卫处。', lx: 'daily', fbrid: 'u102', fbsj: ago(1, 3), llcs: 65, likedBy: L(2), tps: ['ph:0:北门', 'ph:1:路口'], ht: 'xyaq', zdbmid: 'b004', hfzt: 'replied', sfgfhf: '1' }),
      P({ bt: '国庆快乐！', nr: '大家假期愉快呀！', lx: 'daily', fbrid: 'u103', fbsj: ago(2, 2), llcs: 2 }),
      P({ bt: '国庆假期我来了', nr: '上完最后一节课了嘿嘿', lx: 'daily', fbrid: 'u104', fbsj: ago(3, 1), llcs: 19, tps: ['ph:2:教室'] }),
      P({ bt: '招新', nr: '请问能源院还有什么社团在招新吗，想参加一些有实践活动的。', lx: 'feedback', fbrid: 'u105', fbsj: ago(3, 3), llcs: 4 }),
      P({ bt: '找人', nr: '昨天在图书馆三楼捡到一张校园卡，学院是机电，看到请联系我。', lx: 'daily', fbrid: 'u106', fbsj: ago(3, 5), llcs: 72, likedBy: L(1), tps: ['ph:3:校园卡'] }),
      P({ bt: '租借无人机', nr: '国庆出去玩想租一个无人机，友友们带价来。', lx: 'secondhand', fbrid: 'u107', fbsj: ago(3, 6), llcs: 6 }),
      P({ bt: '学校附近有什么好的理发店吗？', nr: '只需要剪头发，不要烫染拉，求推荐！', lx: 'feedback', fbrid: 'u108', fbsj: ago(4, 2), llcs: 31, likedBy: L(1) }),
      P({ bt: '路上的小天使', nr: '今天在升华楼门口遇到一只小猫，帮我指路（不是）', lx: 'praise', fbrid: 'u109', fbsj: ago(5, 1), llcs: 88, likedBy: L(1), tps: ['ph:4:小猫', 'ph:5:升华楼'] }),
      P({ bt: '出九成新蓝牙耳机', nr: '买来用了两次，音质很好，因为换了新的所以出掉，价格私聊。', lx: 'secondhand', fbrid: 'u110', fbsj: ago(5, 4), llcs: 23, tps: ['ph:6:耳机'] }),
      P({ bt: '宿舍楼充电桩坏了好几天了', nr: '12 栋楼下的电动车充电桩坏了快一周了，能不能尽快修一下，每天要推车去别的楼充。', lx: 'feedback', fbrid: 'u111', fbsj: ago(5, 6), llcs: 54, likedBy: L(3), ht: 'sswx', zdbmid: 'b001' }),
      P({ bt: '萌萌光崽', nr: '新生开学季的吉祥物太可爱了吧！', lx: 'daily', fbrid: 'u112', fbsj: ago(5, 8), llcs: 40, likedBy: L(4), tps: ['ph:7:吉祥物'] }),
      P({ bt: '食堂二楼的麻辣烫越来越咸了', nr: '最近两周明显感觉麻辣烫偏咸，希望食堂能注意一下口味。', lx: 'feedback', fbrid: 'u113', fbsj: ago(2, 5), llcs: 37, likedBy: L(2), ht: 'cpzl', zdbmid: 'b002' }),
      P({ bt: '图书馆座位预约系统经常卡', nr: '早上七点抢座的时候系统总是转圈，能不能优化一下。', lx: 'feedback', fbrid: 'u114', fbsj: ago(1, 6), llcs: 28, likedBy: L(1), ht: 'zwyy', zdbmid: 'b003' }),
      P({ bt: '宿舍热水器一直不热', nr: '7 栋 3 楼的热水器从周一开始就不热了，已经报修过一次，还没人来。', lx: 'feedback', fbrid: 'u115', fbsj: ago(0, 20), llcs: 12, ht: 'sswx', zdbmid: 'b001' }),
      P({ bt: '奖学金评定的公示在哪里看', nr: '学院说已经公示了，但是在学工系统里没找到入口。', lx: 'feedback', fbrid: 'u116', fbsj: ago(2, 9), llcs: 45, ht: 'jzxj', zdbmid: 'b000' }),
      P({ bt: '学工系统的图标显示不全', nr: '从日常事务开始所有图标都不显示了，但是还能点进去。', lx: 'feedback', fbrid: 'u117', fbsj: ago(4, 7), llcs: 33, ht: 'xgxt', zdbmid: 'b000', hfzt: 'replied', sfgfhf: '1' }),
      P({ bt: '感谢宿管阿姨', nr: '昨晚发烧，宿管阿姨大半夜帮我叫了校医，真的很感动。', lx: 'praise', fbrid: 'u118', fbsj: ago(6, 2), llcs: 64, likedBy: L(6) }),
      P({ bt: '最近压力好大，感觉有点抑郁', nr: '期中考试一门接一门，晚上总睡不着，感觉有点抑郁，不知道该找谁聊聊。', lx: 'daily', fbrid: 'u119', fbsj: ago(0, 9), llcs: 21, fxdj: 2, fxgjcs: '抑郁' }),
      P({ bt: '外卖架总丢外卖，想集体投诉', nr: '外卖放在架子上十分钟就没了，已经第三次了，想集体投诉一下，希望能加装监控。', lx: 'feedback', fbrid: 'u120', fbsj: ago(0, 5), llcs: 49, likedBy: L(2), fxdj: 3, fxgjcs: '集体,投诉', ht: 'hqqt', zdbmid: 'b001' }),
      P({ bt: '出几本考研数学书', nr: '全新未拆封，适合 27 考研的同学。', lx: 'secondhand', fbrid: 'u121', fbsj: ago(1, 2), llcs: 9, tps: ['ph:8:书籍'] }),
      P({ bt: '加微信领取兼职，日结 300', nr: '加我微信 xxxx，动动手指就能赚钱，名额有限！', lx: 'daily', fbrid: 'u113', fbsj: ago(0, 3), llcs: 15, ztbq: 'reported' }),
      P({ bt: '测试帖子', nr: '这是一条已被删除的帖子。', lx: 'daily', fbrid: 'u103', fbsj: ago(7, 1), llcs: 3, ztbq: 'deleted', zt: '0' }),
      P({ bt: '保卫处的同志辛苦了', nr: '晚上自习回来看到保卫处的老师还在巡逻，点个赞。', lx: 'praise', fbrid: 'u122', fbsj: ago(8, 3), llcs: 30, likedBy: L(3) })
    ];
    // 投票帖追加在末尾，避免影响上面按下标引用的种子数据
    const B = (uid_, optionIds, agoMs) => ({ uid: uid_, optionIds, cjsj: t0 - agoMs });
    const vMenu = [{ id: 'op_a', text: '螺蛳粉' }, { id: 'op_b', text: '铁板炒饭' }, { id: 'op_c', text: '潮汕牛肉粿条' }, { id: 'op_d', text: '轻食沙拉' }];
    const menuPick = ['op_a', 'op_c', 'op_a', 'op_b', 'op_a', 'op_c', 'op_d', 'op_a', 'op_c', 'op_b', 'op_a', 'op_c', 'op_a'];
    posts.push(P({
      bt: '国庆后食堂二楼新开窗口，大家最想吃什么？', nr: '听说食堂二楼要新开一个窗口，来投个票吧，结果我会整理后反馈给饮食中心。', lx: 'daily', fbrid: 'u101',
      fbsj: ago(2, 4), llcs: 132, likedBy: L(5),
      vote: {
        title: '食堂新窗口你最想要哪种？', options: vMenu, multi: false, maxSelect: 1, deadline: t0 + 3 * DAY + 2 * HOUR, showBeforeVote: false, closedAt: 0,
        ballots: menuPick.map((op, i) => B('u' + (102 + i), [op], (46 - i * 3.4) * HOUR)).concat([B('u_admin', ['op_b'], 3 * HOUR)]), seenN: 10
      }
    }));
    const vSinger = [{ id: 'op_1', text: '1 号 · 《晴天》' }, { id: 'op_2', text: '2 号 · 《追光者》' }, { id: 'op_3', text: '3 号 · 《光年之外》' }, { id: 'op_4', text: '4 号 · 《夜空中最亮的星》' }, { id: 'op_5', text: '5 号 · 《后来》' }];
    const singerPick = [['op_2', 'op_4'], ['op_1', 'op_2', 'op_4'], ['op_4'], ['op_2', 'op_3'], ['op_4', 'op_5'], ['op_2', 'op_4', 'op_5'], ['op_1', 'op_4'], ['op_3', 'op_4']];
    posts.push(P({
      bt: '校园十佳歌手人气投票（已截止）', nr: '感谢大家参与本届十佳歌手人气投票，结果已同步给校团委，决赛当晚公布。', lx: 'daily', fbrid: 'u_admin',
      fbsj: ago(9, 2), llcs: 268, likedBy: L(8),
      vote: {
        title: '你最喜欢哪几位选手的演唱？（最多 3 项）', options: vSinger, multi: true, maxSelect: 3, deadline: ago(2, 2), showBeforeVote: true, closedAt: 0,
        ballots: singerPick.map((ops, i) => B(i === 0 ? 'u101' : 'u' + (103 + i), ops, (8.5 - i * 0.7) * DAY)), seenN: 8
      }
    }));

    const C = (tzid, fbrid, plnr, agoMs, extra = {}) => Object.assign({
      id: uid('pl_'), tzid, fjlpid: null, hfdxid: null, fbrid, plnr, tps: [], likedBy: [], sfgfhf: '0', cjsj: t0 - agoMs, zt: '1'
    }, extra);
    const pTop = posts[0], pNorth = posts[1], pApp = posts[16];
    const comments = [];
    const c1 = C(pTop.id, 'u104', '可以像集市那样专门建一个群，每隔一段时间推送帖子标题和链接，感觉更方便。', 9.8 * DAY, { likedBy: L(3) });
    const c2 = C(pTop.id, 'u105', '能否做成小程序形式呢，方便使用些。', 9.7 * DAY, { likedBy: L(3) });
    const c3 = C(pTop.id, 'u106', '做成软件 app', 9.6 * DAY);
    const c4 = C(pTop.id, 'u107', '主页 UI 好奇怪啊，菜单栏能不能不要设计成覆盖的模样。', 9.5 * DAY);
    const c4r = C(pTop.id, 'u101', '可以描述的更详细些嘛', 9.0 * DAY, { fjlpid: c4.id, hfdxid: c4.id });
    const c5 = C(pTop.id, 'u108', '而且一开始给所有人配的用户名和头像都好奇怪。', 9.4 * DAY);
    const c5r = C(pTop.id, 'u109', '同感，第一次进来以为是机器人', 9.3 * DAY, { fjlpid: c5.id, hfdxid: c5.id });
    const c5r2 = C(pTop.id, 'u108', '哈哈哈对', 9.2 * DAY, { fjlpid: c5.id, hfdxid: c5r.id });
    const c6 = C(pTop.id, 'u110', '希望增加按学院筛选的功能。', 8 * DAY);
    const c7 = C(pTop.id, 'u_admin', '收到，大家的建议我们都会整理反馈给平台运营。', 4 * DAY);
    comments.push(c1, c2, c3, c4, c4r, c5, c5r, c5r2, c6, c7);
    comments.push(C(pNorth.id, 'u_bw', '已收到反馈，我们已加强北门周边巡逻，同学们遇到可疑情况请第一时间拨打保卫处电话。', 0.8 * DAY, { sfgfhf: '1' }));
    comments.push(C(pApp.id, 'u_admin', '感谢反馈，图标问题已在最新版本修复，请清理缓存后重试。', 3 * DAY, { sfgfhf: '1' }));
    comments.push(C(posts[8].id, 'u111', '好可爱的小猫！', 4.5 * DAY));
    comments.push(C(posts[8].id, 'u112', '升华楼的猫猫都很亲人', 4.3 * DAY));
    comments.push(C(posts[10].id, 'u_admin', '已转后勤报修，请耐心等待。', 4 * DAY));
    comments.push(C(posts[17].id, 'u_admin', '宿管阿姨太暖了', 5 * DAY));
    comments.push(C(posts[18].id, 'u104', '抱抱你，可以去心理中心预约咨询，老师人很好。', 0.2 * DAY));
    comments.push(C(posts[12].id, 'u_admin', '同感，最近确实咸了', 1.5 * DAY));

    const drafts = [
      { id: uid('cg_'), fbrid: 'u_admin', lx: 'feedback', ht: 'sswx', bt: '宿舍楼道灯不亮', nr: '5 栋 2 楼楼道灯坏了，晚上很黑。', tps: [], gxsj: ago(1, 4) }
    ];
    const messages = [
      { id: uid('sx_'), fsrid: 'u_admin', jsrid: 'u101', nr: '哈喽', cjsj: ago(22, 3, 1), sfyd: '1' },
      { id: uid('sx_'), fsrid: 'u101', jsrid: 'u_admin', nr: '你好呀，有什么事吗？', cjsj: ago(22, 3), sfyd: '1' },
      { id: uid('sx_'), fsrid: 'u_admin', jsrid: 'u101', nr: '置顶帖的评论区建议我们已经收集了，谢谢！', cjsj: ago(22, 2), sfyd: '1' },
      { id: uid('sx_'), fsrid: 'u118', jsrid: 'u_admin', nr: '老师您好，想问下表扬帖能转给宿管阿姨看看吗？', cjsj: ago(0, 6), sfyd: '0' },
      { id: uid('sx_'), fsrid: 'u105', jsrid: 'u_admin', nr: '老师，去年问过的宿舍报修后来已经修好了，谢谢。', cjsj: ago(400, 2), sfyd: '1' }
    ];
    const reports = [
      { id: uid('jb_'), jbbh: 'JB' + fmtDate(ago(0, 2)).replace(/-/g, '') + '0001', tzid: posts[21].id, jbrid: 'u_admin', jblx: '垃圾广告', jbsm: '疑似兼职诈骗引流', cjsj: ago(0, 2), zt: 'pending' },
      { id: uid('jb_'), jbbh: 'JB' + fmtDate(ago(0, 1)).replace(/-/g, '') + '0002', tzid: posts[21].id, jbrid: 'u104', jblx: '违法违规', jbsm: '', cjsj: ago(0, 1), zt: 'pending' },
      { id: uid('jb_'), jbbh: 'JB' + fmtDate(ago(6)).replace(/-/g, '') + '0001', tzid: posts[7].id, jbrid: 'u_admin', jblx: '不友善', jbsm: '评论区有引战言论', cjsj: ago(4), zt: 'done', result: 'pass', clsm: '经核实未违规，予以保留', clsj: ago(3, 20), clr: '社区管理员' }
    ];
    const notices = [
      { id: uid('xx_'), uid: 'u_admin', type: 'reply', text: '有人回复了你的评论', fromId: 'u101', tzid: pTop.id, cjsj: ago(3, 5), read: false },
      { id: uid('xx_'), uid: 'u_admin', type: 'like', text: '有人点赞了你的评论', fromId: 'u105', tzid: pTop.id, cjsj: ago(2, 2), read: false },
      { id: uid('xx_'), uid: 'u_admin', type: 'system', text: '你举报的帖子已处理：经核实未违规，予以保留', tzid: posts[7].id, cjsj: ago(3, 20), read: true }
    ];
    const interventions = [];

    /* 失物招领：资助团队成员、服务点、物品、认领、汇总 */
    [['u_zz1', '资助团队·周同学', '周以宁', '#3087CC'], ['u_zz2', '资助团队·许同学', '许嘉禾', '#469FFF']].forEach(([id, nc, xm, c], i) => {
      users.push({
        id, nc, tx: 'color:' + c, xm, xh: '82241' + pad(60 + i) + '0' + (300 + i), dlzh: '82241' + pad(60 + i) + '0' + (300 + i), bmmc: '学生资助服务中心', nj: '2024级',
        sjhm: '1387310' + pad(60 + i) + '00', jsr: 'student', role: 'student', sfgf: '0', rzbmid: '', fjzt: '0', sfwczl: '1', ncChangeRemain: 3, cjsj: ago(40),
        fdy: '刘老师', fdydh: '15173100088', bds: '—', bdsdh: '—'
      });
    });
    const lfPoints = [
      { id: 'lp1', mc: '岳麓山校区服务点', xq: '岳麓山校区', dz: '岳麓山校区学生活动中心一楼 资助团队值班室', zbap: '周一至周五 12:00-14:00、17:30-19:30', lxfs: '站内私信或值班电话 0731-88830001', lstz: '', fzr: 'u_zz1', px: 1 },
      { id: 'lp2', mc: '潇湘校区服务点', xq: '潇湘校区', dz: '潇湘校区图书馆负一楼 学生服务台', zbap: '周一至周五 12:00-14:00、17:30-19:30', lxfs: '站内私信或值班电话 0731-88830002', lstz: '本周五下午值班暂停，周六 10:00 恢复', fzr: 'u_zz2', px: 2 },
      { id: 'lp3', mc: '天心校区事务服务点', xq: '天心校区', dz: '天心校区学生事务中心 102 室', zbap: '周二、周四 12:00-14:00', lxfs: '站内私信', lstz: '', fzr: 'u_zz1', px: 3 },
      { id: 'lp4', mc: '开福校区服务点', xq: '开福校区', dz: '开福校区学生活动中心一楼', zbap: '周一、周三、周五 12:00-14:00', lxfs: '站内私信', lstz: '', fzr: 'u_zz1', px: 4 },
      { id: 'lp5', mc: '天心校区服务点', xq: '天心校区', dz: '天心校区图书馆一楼服务台', zbap: '周一至周五 17:30-19:30', lxfs: '站内私信', lstz: '', fzr: 'u_zz1', px: 5 },
      { id: 'lp6', mc: '毓秀楼服务点', xq: '', dz: '', zbap: '待团队确认', lxfs: '站内私信', lstz: '', fzr: 'u_zz1', px: 6 },
      { id: 'lp7', mc: '雷锋岗服务点', xq: '', dz: '', zbap: '待团队确认', lxfs: '站内私信', lstz: '', fzr: 'u_zz1', px: 7 }
    ];
    const lfMembers = [
      { uid: 'u_zz1', roles: ['register', 'checker'], points: ['lp1', 'lp3', 'lp4', 'lp5', 'lp6', 'lp7'], cjsj: ago(40) },
      { uid: 'u_zz2', roles: ['register'], points: ['lp2'], cjsj: ago(30) }
    ];
    const today = startOfDay(t0);
    const at = (d, h, m = 0) => Math.min(t0 - 60000 * (h + 1), today - d * DAY + h * HOUR + m * 60000);
    const lfSeq = {};
    const lfItems = [];
    const lfItem = o => {
      const day = fmtDate(o.fbsj).replace(/-/g, '');
      const pre = (o.lx === 'lost' ? 'XW' : 'SW') + day;
      lfSeq[pre] = (lfSeq[pre] || 0) + 1;
      const team = o.ly === 'team';
      const it = Object.assign({
        id: uid('lf_'), bh: pre + String(lfSeq[pre]).padStart(3, '0'), lx: 'found', sjsm: '', nr: '', tps: [], ly: 'student',
        bgfs: o.lx === 'lost' ? '' : team ? 'point' : 'self', bgdid: '', zt: o.lx === 'lost' ? 'seeking' : 'pending', card: null, cxyy: ''
      }, o);
      it.sj = it.sj || it.fbsj;
      it.gxsj = it.gxsj || it.fbsj;
      it.logs = [{ t: it.fbsj, act: '登记', uid: it.fbrid, note: team ? '团队登记' : '同学发布' }].concat(o.logs || []);
      lfItems.push(it);
      return it;
    };
    const f1 = lfItem({ fl: 'digital', mc: '白色蓝牙耳机盒', xq: '潇湘校区', dd: '图书馆三楼自习区', fbsj: at(0, 9, 20), sj: at(0, 8), sjsm: '上午', nr: '带透明保护套，外壳有轻微划痕。', tps: ['ph:6:耳机盒'], ly: 'team', fbrid: 'u_zz2', bgdid: 'lp2' });
    const f2 = lfItem({ fl: 'campuscard', mc: '校园卡 · 王*墨', xq: '岳麓山校区', dd: '升华楼 A 座教室', fbsj: at(0, 9, 40), sjsm: '上午', nr: '冶金与环境学院', tps: ['ph:3:校园卡'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1', card: { xm: '王子墨', xh: '8225130103', xy: '冶金与环境学院' } });
    const f3 = lfItem({ fl: 'daily', mc: '黑色折叠伞', xq: '岳麓山校区', dd: '二食堂门口', fbsj: at(0, 10), sjsm: '中午', nr: '伞柄处挂有一个小熊挂件。', tps: ['ph:5:雨伞'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1' });
    const f4 = lfItem({ fl: 'daily', mc: '蓝色保温杯', xq: '潇湘校区', dd: '体育馆看台', fbsj: at(1, 18), sjsm: '傍晚', nr: '杯身有贴纸。', tps: ['ph:1:保温杯'], ly: 'team', fbrid: 'u_zz2', bgdid: 'lp2' });
    const f5 = lfItem({ fl: 'idcard', mc: '身份证 · 李*河', xq: '天心校区', dd: '教学楼 B 座一楼', fbsj: at(1, 17), nr: '证件号码已遮挡，领取时请携带校园卡核对。', tps: [], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp3', card: { xm: '李星河', xh: '', xy: '' } });
    const f6 = lfItem({ fl: 'digital', mc: 'AirPods 充电盒', xq: '天心校区', dd: '天心校区图书馆二楼', fbsj: at(3, 12), sjsm: '中午', nr: '白色，盒盖内侧有刻字。', tps: ['ph:2:充电盒'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp5', zt: 'checking' });
    const f7 = lfItem({ fl: 'campuscard', mc: '校园卡 · 赵*鸣', xq: '岳麓山校区', dd: '毓秀楼一楼大厅', fbsj: at(5, 11), nr: '建筑与艺术学院', tps: ['ph:3:校园卡'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp6', zt: 'returned', card: { xm: '赵一鸣', xh: '8223150105', xy: '建筑与艺术学院' }, gxsj: at(4, 13), logs: [{ t: at(4, 13), act: '完成归还', uid: 'u_zz1', note: '按认领申请交接完成' }] });
    lfItem({ fl: 'other', mc: '英语四级真题书', xq: '开福校区', dd: '开福校区教学楼 302', fbsj: at(12, 15), nr: '书内写有铅笔批注。', tps: ['ph:7:真题书'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp4' });
    lfItem({ fl: 'daily', mc: '灰色双肩包', xq: '岳麓山校区', dd: '新民路运动场', fbsj: ago(790), nr: '包内有一本笔记本。', tps: ['ph:8:双肩包'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1' });
    const fPhone = lfItem({ fl: 'digital', mc: '粉色手机壳（iPhone）', xq: '麓南校区', dd: '麓南校区食堂二楼', fbsj: at(0, 8, 10), sjsm: '上午', nr: '在靠窗的座位上捡到，我先代为保管，可私信我。', tps: ['ph:4:手机壳'], fbrid: 'u102' });
    lfItem({ fl: 'campuscard', mc: '校园卡 · 冯*航', xq: '岳麓山校区', dd: '图书馆三楼', fbsj: at(3, 16), nr: '文学院', tps: ['ph:3:校园卡'], fbrid: 'u106', bgfs: 'point', bgdid: 'lp1', card: { xm: '冯启航', xh: '8223190109', xy: '文学院' }, logs: [{ t: at(3, 18), act: '转交服务点', uid: 'u106', note: '发布同学保管 → 岳麓山校区服务点' }] });
    const f12 = lfItem({ fl: 'digital', mc: '银色 U 盘 64G', xq: '开福校区', dd: '开福校区教学楼一楼', fbsj: at(2, 10), nr: 'U 盘上挂有红色挂绳。', tps: ['ph:9:U盘'], fbrid: 'u105' });
    const l1 = lfItem({ lx: 'lost', fl: 'digital', mc: '白色耳机盒', xq: '潇湘校区', dd: '图书馆到食堂之间', fbsj: at(0, 13), sj: at(0, 12), sjsm: '12 时至 14 时', nr: '可能在图书馆至食堂的路上遗失，外有透明保护套。', tps: ['ph:6:耳机'], fbrid: 'u101' });
    lfItem({ lx: 'lost', fl: 'daily', mc: '黑色长柄雨伞', xq: '岳麓山校区', dd: '升华楼至二食堂', fbsj: at(1, 19), sjsm: '晚上', nr: '伞面有白色波点。', tps: [], fbrid: 'u108' });
    lfItem({ lx: 'lost', fl: 'idcard', mc: '学生证', xq: '天心校区', dd: '天心校区图书馆', fbsj: at(4, 9), sjsm: '上午', nr: '学生证夹在蓝色卡套里。', tps: [], fbrid: 'u110' });
    lfItem({ lx: 'lost', fl: 'daily', mc: '蓝色水杯', xq: '潇湘校区', dd: '潇湘校区一食堂', fbsj: at(6, 12), nr: '已经找到了，谢谢大家。', tps: ['ph:1:水杯'], fbrid: 'u112', zt: 'found' });
    lfItem({ fl: 'other', mc: '一串宿舍钥匙', xq: '岳麓山校区', dd: '二舍门口台阶', fbsj: at(42, 15), sjsm: '下午', nr: '钥匙扣上挂着一块黄色门禁牌，背面写着「12 栋」。在服务点放了一个多月，还没人来领。', tps: ['ph:10:钥匙'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1' });
    lfItem({ fl: 'daily', mc: '透明近视眼镜盒', xq: '岳麓山校区', dd: '逸夫楼 201 教室', fbsj: at(6, 12), sjsm: '中午', nr: '盒盖内侧贴着一张手写课程表。', tps: ['ph:11:眼镜盒'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1', zt: 'withdrawn', cxyy: '失主当晚到服务点直接取回了，和当场归还的记录重复，先撤回。', gxsj: at(6, 18), logs: [{ t: at(6, 18), act: '撤回', uid: 'u_zz1', note: '失主当晚到服务点直接取回了，和当场归还的记录重复，先撤回。' }] });
    const fKb = lfItem({ fl: 'digital', mc: '银色机械键盘', xq: '天心校区', dd: '学生事务中心门口长椅', fbsj: at(2, 11), sjsm: '上午', nr: '87 键，空格键右侧有一小块掉漆。', tps: ['ph:12:键盘'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp3', zt: 'checking', gxsj: at(1, 16), logs: [{ t: at(1, 16), act: '进入核对', uid: 'u_zz1', note: '认领申请核对通过' }] });
    const fBag = lfItem({ fl: 'daily', mc: '深蓝色双肩包', xq: '开福校区', dd: '开福校区图书馆一楼大厅', fbsj: at(4, 15), sjsm: '下午', nr: '前袋装着一本专业课笔记，封面写了姓名。', tps: ['ph:13:双肩包'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp4', zt: 'checking', gxsj: at(2, 11), logs: [{ t: at(3, 11), act: '进入核对', uid: 'u_zz1', note: '认领申请核对通过' }] });
    const fEar = lfItem({ fl: 'digital', mc: '灰色有线耳机', xq: '岳麓山校区', dd: '中南讲堂后排座位', fbsj: at(9, 18), sjsm: '晚上', nr: '线材是灰色的，线上有一个小麦克风。', tps: ['ph:14:有线耳机'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp1', gxsj: at(8, 10) });
    const fCup = lfItem({ fl: 'daily', mc: '绿色运动水杯', xq: '天心校区', dd: '天心校区操场看台', fbsj: at(11, 10), sjsm: '上午', nr: '杯身是磨砂的，盖子是深绿色。', tps: ['ph:15:水杯'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp5', zt: 'returned', gxsj: at(7, 18), logs: [{ t: at(7, 18), act: '完成归还', uid: 'u_zz1', note: '按认领申请交接完成' }] });
    const uSun = users.find(u => u.id === 'u107');
    const fCard = lfItem({ fl: 'campuscard', mc: '校园卡 · 孙*溪', xq: '潇湘校区', dd: '潇湘校区二食堂靠窗座位', fbsj: at(4, 9), sjsm: '上午', nr: uSun.bmmc, tps: ['ph:3:校园卡'], ly: 'team', fbrid: 'u_zz2', bgdid: 'lp2', card: { xm: uSun.xm, xh: uSun.xh, xy: uSun.bmmc } });
    const uHe = users.find(u => u.id === 'u111');
    const fStu = lfItem({ fl: 'idcard', mc: '学生证 · 何*言', xq: '开福校区', dd: '开福校区学生活动中心值班台', fbsj: at(7, 14), sjsm: '下午', nr: '证件套是深蓝色的，内页有钢印。', tps: ['ph:16:学生证'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp4', card: { xm: uHe.xm, xh: uHe.xh, xy: uHe.bmmc }, gxsj: at(6, 12) });
    const fTote = lfItem({ fl: 'daily', mc: '米色帆布袋', xq: '杏林校区', dd: '杏林校区教学楼走廊座椅', fbsj: at(1, 15), sjsm: '下午', nr: '袋子侧面有一枚橘子洲头的徽章，我先放宿舍保管，对上特征可以来取。', tps: ['ph:17:帆布袋'], fbrid: 'u101' });
    const fGog = lfItem({ fl: 'daily', mc: '白色实验护目镜', xq: '天心校区', dd: '天心校区实验楼一楼大厅', fbsj: at(8, 10), sjsm: '上午', nr: '镜腿上用油性笔写了「材加」。', tps: ['ph:18:护目镜'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp3' });
    const fPow = lfItem({ fl: 'digital', mc: '粉色充电宝', xq: '开福校区', dd: '开福校区教学楼 201', fbsj: at(8, 16), sjsm: '下午', nr: '一万毫安，背面有一道浅划痕。', tps: ['ph:19:充电宝'], ly: 'team', fbrid: 'u_zz1', bgdid: 'lp4' });
    lfItem({ lx: 'lost', fl: 'campuscard', mc: '校园卡', xq: '开福校区', dd: '开福校区门诊到教学楼之间', fbsj: at(2, 8), sjsm: '上午', nr: '透明卡套，里面还夹着一张疫苗接种卡。', tps: ['ph:3:卡套'], fbrid: 'u104' });
    lfItem({ lx: 'lost', fl: 'daily', mc: '黑色拉链钱包', xq: '天心校区', dd: '天心校区食堂到宿舍的路上', fbsj: at(1, 20), sjsm: '晚上', nr: '里面有食堂饭卡和两张照片，拉链头是银色的。', tps: [], fbrid: 'u106' });
    lfItem({ lx: 'lost', fl: 'other', mc: '实验室门禁卡', xq: '麓南校区', dd: '麓南校区实验楼门厅', fbsj: at(3, 9), sjsm: '上午', nr: '白色卡片，左上角贴了一小块蓝色胶带。', tps: ['ph:20:门禁卡'], fbrid: 'u111' });
    lfItem({ lx: 'lost', fl: 'digital', mc: '平板触控笔', xq: '杏林校区', dd: '杏林校区图书馆二楼靠窗', fbsj: at(2, 16), sjsm: '下午', nr: '笔帽上有一圈磨白，可能落在靠窗那排。', tps: [], fbrid: 'u103' });
    lfItem({ lx: 'lost', fl: 'daily', mc: '灰色针织帽', xq: '岳麓山校区', dd: '岳麓山登山道', fbsj: at(10, 9), sjsm: '上午', nr: '已经在一起爬山的同学那里找到了。', tps: ['ph:21:针织帽'], fbrid: 'u101', zt: 'found', gxsj: at(9, 20), logs: [{ t: at(9, 20), act: '标记已找回', uid: 'u101' }] });
    lfItem({ lx: 'lost', fl: 'daily', mc: '条纹围巾', xq: '岳麓山校区', dd: '二食堂门口', fbsj: at(8, 13), nr: '下午去食堂失物处领回来了，谢谢帮我留意的同学。', tps: [], fbrid: 'u109', zt: 'found', gxsj: at(7, 12), logs: [{ t: at(7, 12), act: '标记已找回', uid: 'u109' }] });
    const lfClaims = [
      { id: uid('rl_'), itemId: f1.id, sqrid: 'u101', tz: '耳机盒背面贴了一张小猫贴纸。', sjdd: '今天中午 12 点左右在图书馆三楼自习', tps: [], zt: 'more', bcyq: '请补充保护套上的特殊标记，或提供耳机连接手机的截图。', jl: '', clr: 'u_zz2', jj: null, cjsj: at(0, 13, 30), gxsj: at(0, 14), logs: [{ t: at(0, 13, 30), act: '提交申请', uid: 'u101' }, { t: at(0, 14), act: '要求补充材料', uid: 'u_zz2', note: '请补充保护套上的特殊标记，或提供耳机连接手机的截图。' }] },
      { id: uid('rl_'), itemId: f2.id, sqrid: 'u104', tz: '卡套是蓝色的，卡面左下角有磨损。', sjdd: '今天上午在升华楼 A 座上课', tps: [], zt: 'pending', bcyq: '', jl: '', clr: '', jj: null, cjsj: at(0, 11), gxsj: at(0, 11), logs: [{ t: at(0, 11), act: '提交申请', uid: 'u104' }] },
      { id: uid('rl_'), itemId: f6.id, sqrid: 'u107', tz: '盒盖内侧刻有 “WJS”。', sjdd: '三天前中午在图书馆二楼', tps: ['ph:2:购买记录'], zt: 'pass', bcyq: '', jl: '刻字与登记信息一致', clr: 'u_zz1', jj: { dd: '天心校区服务点（天心校区图书馆一楼服务台）', sj: '明天 17:30-19:30', t: at(2, 10) }, cjsj: at(3, 15), gxsj: at(2, 10), logs: [{ t: at(3, 15), act: '提交申请', uid: 'u107' }, { t: at(2, 9), act: '核对通过', uid: 'u_zz1', note: '刻字与登记信息一致' }, { t: at(2, 10), act: '安排交接', uid: 'u_zz1' }] },
      { id: uid('rl_'), itemId: f7.id, sqrid: 'u106', tz: '本人校园卡', sjdd: '在毓秀楼自习时遗失', tps: [], zt: 'done', bcyq: '', jl: '本人持证领取', clr: 'u_zz1', jj: { dd: '毓秀楼服务点', sj: '当天 12:00-14:00', t: at(4, 12) }, cjsj: at(5, 12), gxsj: at(4, 13), logs: [{ t: at(5, 12), act: '提交申请', uid: 'u106' }, { t: at(4, 12), act: '核对通过', uid: 'u_zz1' }, { t: at(4, 13), act: '完成归还', uid: 'u_zz1' }] },
      { id: uid('rl_'), itemId: f12.id, sqrid: 'u101', tz: 'U 盘里有一个“毕业设计”文件夹，红色挂绳上有一个铃铛。', sjdd: '前天上午在开福校区教学楼', tps: [], zt: 'pending', bcyq: '', jl: '', clr: '', jj: null, cjsj: at(1, 9), gxsj: at(1, 9), logs: [{ t: at(1, 9), act: '提交申请', uid: 'u101' }] },
      { id: uid('rl_'), itemId: fKb.id, sqrid: 'u109', tz: '空格键右边那颗键掉了一小块漆，键盘是银色铝合金的。', sjdd: '前天上午在天心校区学生事务中心等材料', tps: ['ph:12:掉漆'], zt: 'pass', bcyq: '', jl: '掉漆位置和登记时拍的照片对得上', clr: 'u_zz1', jj: null, cjsj: at(2, 14), gxsj: at(1, 16), logs: [{ t: at(2, 14), act: '提交申请', uid: 'u109' }, { t: at(1, 16), act: '核对通过', uid: 'u_zz1', note: '掉漆位置和登记时拍的照片对得上' }] },
      { id: uid('rl_'), itemId: fBag.id, sqrid: 'u101', tz: '前袋笔记封面写着林知夏，内侧有一张升华楼的贴纸。', sjdd: '四天前下午在开福校区图书馆一楼占座', tps: ['ph:13:笔记'], zt: 'pass', bcyq: '', jl: '笔记封面姓名与认领人一致', clr: 'u_zz1', jj: { dd: '开福校区服务点（开福校区学生活动中心一楼）', sj: '本周三 12:00-14:00', lxfs: '站内私信或值班电话 0731-88830001', t: at(2, 11) }, cjsj: at(4, 18), gxsj: at(2, 11), logs: [{ t: at(4, 18), act: '提交申请', uid: 'u101' }, { t: at(3, 11), act: '核对通过', uid: 'u_zz1', note: '笔记封面姓名与认领人一致' }, { t: at(2, 11), act: '安排交接', uid: 'u_zz1', note: '开福校区服务点（开福校区学生活动中心一楼） · 本周三 12:00-14:00' }] },
      { id: uid('rl_'), itemId: fEar.id, sqrid: 'u101', tz: '耳机是白色的，线很短。', sjdd: '上周在中南讲堂上晚课', tps: [], zt: 'reject', bcyq: '', jl: '实物线材是灰色的，和描述的白色线对不上', clr: 'u_zz1', jj: null, cjsj: at(9, 19), gxsj: at(8, 10), logs: [{ t: at(9, 19), act: '提交申请', uid: 'u101' }, { t: at(8, 10), act: '核对未通过', uid: 'u_zz1', note: '实物线材是灰色的，和描述的白色线对不上' }] },
      { id: uid('rl_'), itemId: fCup.id, sqrid: 'u101', tz: '杯盖内侧刻了 LZX，杯身有一道被钥匙划的印。', sjdd: '上上周上午在天心操场跑步', tps: [], zt: 'done', bcyq: '', jl: '刻字和划痕都对得上，本人领取', clr: 'u_zz1', jj: { dd: '天心校区服务点（天心校区图书馆一楼服务台）', sj: '当天 17:30-19:30', t: at(9, 11) }, cjsj: at(11, 12), gxsj: at(7, 18), logs: [{ t: at(11, 12), act: '提交申请', uid: 'u101' }, { t: at(10, 15), act: '核对通过', uid: 'u_zz1', note: '刻字和划痕都对得上' }, { t: at(9, 11), act: '安排交接', uid: 'u_zz1' }, { t: at(7, 18), act: '完成归还', uid: 'u_zz1', note: '按认领申请交接完成' }] },
      { id: uid('rl_'), itemId: fCard.id, sqrid: 'u107', tz: '卡面左上角有一道折痕，卡套里夹着饭卡。', sjdd: '四天前早饭在潇湘校区二食堂', tps: [], zt: 'pending', bcyq: '', jl: '', clr: '', jj: null, cjsj: at(4, 12), gxsj: at(4, 12), logs: [{ t: at(4, 12), act: '提交申请', uid: 'u107' }] },
      { id: uid('rl_'), itemId: fStu.id, sqrid: 'u111', tz: '学生证照片是我，钢印在内页右下角。', sjdd: '上周在开福校区学生活动中心办活动', tps: ['ph:16:证件内页'], zt: 'more', bcyq: '请再补一张学生证封面和钢印的清晰照片，方便和原件对一下。', jl: '', clr: 'u_zz1', jj: null, cjsj: at(7, 17), gxsj: at(6, 12), logs: [{ t: at(7, 17), act: '提交申请', uid: 'u111' }, { t: at(6, 12), act: '要求补充材料', uid: 'u_zz1', note: '请再补一张学生证封面和钢印的清晰照片，方便和原件对一下。' }] },
      { id: uid('rl_'), itemId: fTote.id, sqrid: 'u108', tz: '徽章是橘子洲头的剪影，袋子内袋有一张打印的实验报告。', sjdd: '昨天下午在杏林教学楼等同学', tps: [], zt: 'pending', bcyq: '', jl: '', clr: '', jj: null, cjsj: at(0, 11), gxsj: at(0, 11), logs: [{ t: at(0, 11), act: '提交申请', uid: 'u108' }] }
    ];
    const lfClues = [
      { id: uid('xs_'), itemId: l1.id, uid: 'u109', dd: '潇湘校区图书馆三楼', sj: '今天中午', nr: '看到有人把一个白色耳机盒交给了值班同学，可以去潇湘校区服务点问问。', tps: [], cjsj: at(0, 13, 40) },
      { id: uid('xs_'), itemId: l1.id, uid: 'u102', dd: '潇湘校区食堂门口', sj: '昨天下午', nr: '临时失物架上没看到耳机盒，更像是已经交到图书馆值班台了。', tps: [], cjsj: at(0, 15) },
      { id: uid('xs_'), itemId: l1.id, uid: 'u104', dd: '图书馆三楼靠窗', sj: '今天中午', nr: '有同学问过是不是掉了白色耳机，你可以再去三楼服务台问一句。', tps: ['ph:6:自习区'], cjsj: at(0, 16) }
    ];
    const lfDigests = [
      { id: uid('hz_'), rq: today, itemIds: [f1.id, f2.id, f3.id, fPhone.id], zt: 'published', scr: 'u_zz1', qrr: 'u_zz1', qrsj: at(0, 10, 30), cjsj: at(0, 10, 20) },
      { id: uid('hz_'), rq: today - DAY, itemIds: [f4.id, f5.id], zt: 'published', scr: 'u_zz1', qrr: 'u_zz1', qrsj: today - DAY + 20 * HOUR, cjsj: today - DAY + 20 * HOUR },
      { id: uid('hz_'), rq: today - 3 * DAY, itemIds: [f6.id], zt: 'published', scr: 'u_zz1', qrr: 'u_zz1', qrsj: today - 3 * DAY + 20 * HOUR, cjsj: today - 3 * DAY + 20 * HOUR },
      { id: uid('hz_'), rq: today - 5 * DAY, itemIds: [f7.id], zt: 'published', scr: 'u_zz1', qrr: 'u_zz1', qrsj: today - 5 * DAY + 20 * HOUR, cjsj: today - 5 * DAY + 20 * HOUR },
      { id: uid('hz_'), rq: today - 8 * DAY, itemIds: [fGog.id, fPow.id], zt: 'draft', scr: 'u_zz1', qrr: '', qrsj: 0, cjsj: at(8, 19) }
    ];
    notices.push(
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '你认领的「白色蓝牙耳机盒」需要补充材料：请补充保护套上的特殊标记，或提供耳机连接手机的截图。', fromId: 'u_zz2', lfid: f1.id, cjsj: at(0, 14), read: false },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '有同学为你的寻物「白色耳机盒」提供了线索', fromId: 'u109', lfid: l1.id, cjsj: at(0, 13, 40), read: false },
      { id: uid('xx_'), uid: 'u_zz1', type: 'lost', text: '有新的认领申请待核对：校园卡 · 王*墨', fromId: 'u104', lfid: f2.id, cjsj: at(0, 11), read: false },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '你认领的「深蓝色双肩包」已核对通过，请于本周三 12:00-14:00 到开福校区服务点领取', fromId: 'u_zz1', lfid: fBag.id, cjsj: at(2, 11), read: false },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '你认领的「灰色有线耳机」未通过核对：实物线材是灰色的，和描述的白色线对不上', fromId: 'u_zz1', lfid: fEar.id, cjsj: at(8, 10), read: true },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '你认领的「绿色运动水杯」已完成归还', fromId: 'u_zz1', lfid: fCup.id, cjsj: at(7, 18), read: true },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '有同学为你的寻物「白色耳机盒」提供了线索', fromId: 'u102', lfid: l1.id, cjsj: at(0, 15), read: false },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '有同学为你的寻物「白色耳机盒」提供了线索', fromId: 'u104', lfid: l1.id, cjsj: at(0, 16), read: false },
      { id: uid('xx_'), uid: 'u101', type: 'lost', text: '有新的认领申请待核对：米色帆布袋', fromId: 'u108', lfid: fTote.id, cjsj: at(0, 11), read: false },
      { id: uid('xx_'), uid: 'u111', type: 'lost', text: '你认领的「学生证 · 何*言」需要补充材料：请再补一张学生证封面和钢印的清晰照片，方便和原件对一下。', fromId: 'u_zz1', lfid: fStu.id, cjsj: at(6, 12), read: false },
      { id: uid('xx_'), uid: 'u_zz2', type: 'lost', text: '有新的认领申请待核对：校园卡 · 孙*溪', fromId: 'u107', lfid: fCard.id, cjsj: at(4, 12), read: false }
    );
    messages.push(
      { id: uid('sx_'), fsrid: 'u109', jsrid: 'u101', nr: '【失物线索】关于你的「白色耳机盒」：中午在图书馆三楼看到有人把一个白色耳机盒交给了值班同学，可以去潇湘校区服务点问问。', cjsj: at(0, 13, 40), sfyd: '0' },
      { id: uid('sx_'), fsrid: 'u_zz1', jsrid: 'u107', nr: '【失物招领】你认领的「AirPods 充电盒」已核对通过，请按以下安排领取：\n地点：天心校区服务点（天心校区图书馆一楼服务台）\n时间：明天 17:30-19:30\n领取时请携带校园卡或有效证件。', cjsj: at(2, 10), sfyd: '1' },
      { id: uid('sx_'), fsrid: 'u_zz1', jsrid: 'u101', nr: '【失物招领】你认领的「深蓝色双肩包」已核对通过，请按以下安排领取：\n地点：开福校区服务点（开福校区学生活动中心一楼）\n时间：本周三 12:00-14:00\n联系：站内私信或值班电话 0731-88830001\n领取时请携带校园卡或有效证件。', cjsj: at(2, 11), sfyd: '0' },
      { id: uid('sx_'), fsrid: 'u102', jsrid: 'u101', nr: '【失物线索】关于你的「白色耳机盒」：昨天下午我在潇湘校区食堂门口的临时失物架上没看到耳机盒，更像是已经交到图书馆值班台了。', cjsj: at(0, 15), sfyd: '0' },
      { id: uid('sx_'), fsrid: 'u104', jsrid: 'u101', nr: '【失物线索】关于你的「白色耳机盒」：中午在图书馆三楼靠窗，有同学问过是不是掉了白色耳机，你可以再去三楼服务台问一句。', cjsj: at(0, 16), sfyd: '0' }
    );

    return {
      version: 6, currentUserId: 'u_admin', users, posts, comments, drafts, messages, reports, notices, depts, topics, interventions,
      lfItems, lfClaims, lfClues, lfPoints, lfMembers, lfDigests,
      replyBadge: {} // 我评论过的帖子的未读回复数 {uid: {tzid: n}}
    };
  }

  /* ---------- 持久化 ---------- */
  let db = null;
  function load() {
    try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 6) { db = seed(); persist(); }
    return db;
  }
  function persist() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { console.warn('localStorage 写入失败', e); window.dispatchEvent(new CustomEvent('zndd:error', { detail: '本地存储空间不足，请删除部分图片后重试' })); }
  }
  function commit() { persist(); window.dispatchEvent(new Event('zndd:change')); }
  window.addEventListener('storage', e => { if (e.key === DB_KEY) { load(); window.dispatchEvent(new Event('zndd:change')); } });
  load();

  /* ---------- 读取 ---------- */
  const me = () => user(db.currentUserId) || db.users[0];
  const user = id => db.users.find(u => u.id === id);
  const dept = id => db.depts.find(d => d.id === id);
  const topicByCode = code => db.topics.find(t => t.htbh === code);
  function isBanned(u) {
    u = u || me();
    if (u.fjzt !== '1') return false;
    if (u.fjjssj && u.fjjssj > 0 && u.fjjssj < now()) { u.fjzt = '0'; persist(); return false; }
    return true;
  }
  function assertActive() {
    if (isBanned()) throw new Error('账号已被封禁，暂时无法进行该操作');
  }
  const liveComments = tzid => db.comments.filter(c => c.tzid === tzid && c.zt === '1');
  function postView(p) {
    if (!p) return null;
    const u = user(p.fbrid) || {};
    const pls = liveComments(p.id).length;
    const dzs = p.likedBy.length;
    const hours = Math.max(0, (now() - p.fbsj) / HOUR);
    const votes = p.vote ? p.vote.ballots.length : 0;
    const base = (p.llcs * 0.05 + dzs * 1.2 + pls * 2 + votes + 1) / Math.pow(hours / 24 + 1, 1.15);
    const rds = base + (p.ztbq === 'topped' ? 100 : 0);
    const d = dept(p.zdbmid);
    return Object.assign({}, p, {
      fbrnc: u.nc || '用户', fbrtx: u.tx, pls, dzs, rds, sfdz: p.likedBy.includes(db.currentUserId),
      zdbmmc: d ? d.bmmc : '—', lxLabel: (LX_MAP[p.lx] || {}).label || p.lx, isMine: p.fbrid === db.currentUserId,
      voteInfo: voteView(p)
    });
  }
  function listPosts({ lx = '', sort = 'latest', kw = '', start, end, hasVote = false } = {}) {
    kw = kw.trim().toLowerCase();
    let list = db.posts.filter(p => p.ztbq !== 'deleted');
    if (lx) list = list.filter(p => p.lx === lx);
    if (hasVote) list = list.filter(p => p.vote);
    if (start) list = list.filter(p => p.fbsj >= start);
    if (end) list = list.filter(p => p.fbsj <= end);
    list = list.map(postView);
    if (kw) list = list.filter(p => (p.bt + p.nr + p.fbrnc).toLowerCase().includes(kw));
    list.sort((a, b) => {
      const ta = a.ztbq === 'topped' ? 1 : 0, tb = b.ztbq === 'topped' ? 1 : 0;
      if (ta !== tb) return tb - ta;
      return sort === 'hot' ? b.rds - a.rds : b.fbsj - a.fbsj;
    });
    return list;
  }
  const getPost = id => postView(db.posts.find(p => p.id === id));
  function viewPost(id) {
    const p = db.posts.find(x => x.id === id);
    if (!p) return null;
    p.llcs += 1;
    const badge = (db.replyBadge[db.currentUserId] || {});
    if (badge[id]) delete badge[id];
    persist();
    return postView(p);
  }
  function hotTop5() {
    const since = now() - 7 * DAY;
    return db.posts.filter(p => p.ztbq !== 'deleted' && p.fbsj >= since).map(postView)
      .map(p => Object.assign(p, { rds: p.rds - (p.ztbq === 'topped' ? 100 : 0) }))
      .sort((a, b) => b.rds - a.rds).slice(0, 5);
  }
  function weekDeptRank() {
    const since = startOfWeek(now());
    const map = {};
    db.posts.filter(p => p.ztbq !== 'deleted' && p.lx === 'feedback' && p.zdbmid && p.fbsj >= since).forEach(p => {
      map[p.zdbmid] = (map[p.zdbmid] || 0) + 1;
    });
    return Object.entries(map).map(([id, n]) => ({ zdbmid: id, bmmc: (dept(id) || {}).bmmc || '—', count: n }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }

  /* ---------- 帖子写入 ---------- */
  function detectRisk(text) {
    for (const lv of [1, 2, 3]) {
      const hit = RISK_WORDS[lv].filter(w => text.includes(w));
      if (hit.length) return { fxdj: lv, fxgjcs: hit.join(',') };
    }
    return { fxdj: 0, fxgjcs: '' };
  }
  function nextTzbh(lx) {
    const d = new Date();
    const key = LX_MAP[lx].prefix + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const n = db.posts.filter(p => p.tzbh.startsWith(key)).length + 1;
    return key + String(n).padStart(6, '0');
  }
  const voteText = v => v ? v.title + v.options.map(o => o.text).join('') : '';
  function createPost({ lx, ht = '', bt, nr, tps = [], vote = null }) {
    assertActive();
    if (me().sfwczl !== '1') throw new Error('首次使用请先修改昵称、上传头像');
    if (!lx || !bt.trim() || !nr.trim()) throw new Error('请完善必填项');
    const topic = ht ? topicByCode(ht) : null;
    const t = now();
    const v = normVote(vote, null);
    const p = Object.assign({
      id: uid('tz_'), tzbh: nextTzbh(lx), bt: bt.trim(), nr: nr.trim(), lx, ht: topic ? topic.htbh : 'other', zdbmid: topic ? topic.zdbmid : '',
      fbrid: db.currentUserId, ztbq: 'normal', hfzt: 'pending', sfgfhf: '0', likedBy: [], llcs: 0, tps, fbsj: t, cjsj: t, gxsj: t, zt: '1', vote: v
    }, detectRisk(bt + nr + voteText(v)));
    db.posts.push(p);
    commit();
    return p;
  }
  // vote: undefined 不改动；null 移除；对象 新建或修改
  function updatePost(id, { lx, ht, bt, nr, tps, vote }) {
    const p = db.posts.find(x => x.id === id);
    if (!p) throw new Error('帖子不存在或已删除');
    if (p.fbrid !== db.currentUserId && me().role !== 'admin') throw new Error('无权编辑该帖子');
    if (vote !== undefined) {
      if (!vote && p.vote && p.vote.ballots.length) throw new Error('已有人参与投票，不能移除投票');
      p.vote = vote ? normVote(vote, p.vote) : null;
    }
    if (lx) p.lx = lx;
    if (ht !== undefined) {
      const topic = ht ? topicByCode(ht) : null;
      p.ht = topic ? topic.htbh : 'other'; p.zdbmid = topic ? topic.zdbmid : '';
    }
    if (bt !== undefined) p.bt = bt.trim();
    if (nr !== undefined) p.nr = nr.trim();
    if (tps) p.tps = tps;
    Object.assign(p, detectRisk(p.bt + p.nr + voteText(p.vote)));
    p.gxsj = now();
    commit();
    return p;
  }
  function deletePost(id) {
    const p = db.posts.find(x => x.id === id);
    if (!p) return;
    p.ztbq = 'deleted'; p.zt = '0'; p.gxsj = now();
    commit();
  }
  function toggleTop(id) {
    const p = db.posts.find(x => x.id === id);
    p.ztbq = p.ztbq === 'topped' ? 'normal' : 'topped';
    commit();
    return p.ztbq;
  }
  function togglePostLike(id) {
    assertActive();
    const p = db.posts.find(x => x.id === id);
    const i = p.likedBy.indexOf(db.currentUserId);
    if (i >= 0) p.likedBy.splice(i, 1);
    else {
      p.likedBy.push(db.currentUserId);
      notify(p.fbrid, 'like', '有人点赞了你的帖子', p.id);
    }
    commit();
    return i < 0;
  }

  /* ---------- 评论 ---------- */
  function commentsTree(tzid) {
    const all = liveComments(tzid).map(c => {
      const u = user(c.fbrid) || {};
      const d = c.sfgfhf === '1' ? dept(u.rzbmid) : null;
      return Object.assign({}, c, {
        fbrnc: u.nc || '用户', fbrtx: u.tx, dzs: c.likedBy.length, sfdz: c.likedBy.includes(db.currentUserId), rzbmmc: d ? d.bmmc : (u.sfgf === '1' ? (dept(u.rzbmid) || {}).bmmc : ''),
        isAuthor: (db.posts.find(p => p.id === tzid) || {}).fbrid === c.fbrid, isMine: c.fbrid === db.currentUserId
      });
    });
    const byId = Object.fromEntries(all.map(c => [c.id, c]));
    const roots = all.filter(c => !c.fjlpid).sort((a, b) => a.cjsj - b.cjsj);
    return roots.map(r => ({
      pl: r,
      children: all.filter(c => c.fjlpid === r.id).sort((a, b) => a.cjsj - b.cjsj)
        .map(c => Object.assign(c, { hfdxnc: c.hfdxid && byId[c.hfdxid] ? byId[c.hfdxid].fbrnc : r.fbrnc }))
    }));
  }
  function addComment({ tzid, plnr = '', tps = [], replyTo = null }) {
    assertActive();
    if (me().sfwczl !== '1') throw new Error('首次使用请先修改昵称、上传头像');
    if (!plnr.trim() && !tps.length) throw new Error('请输入评论或添加图片');
    const post = db.posts.find(p => p.id === tzid);
    if (!post || post.ztbq === 'deleted') throw new Error('该贴已删除。');
    const u = me();
    let fjlpid = null, hfdxid = null, target = null;
    if (replyTo) {
      target = db.comments.find(c => c.id === replyTo);
      fjlpid = target.fjlpid || target.id; hfdxid = target.id;
    }
    // 认证部门账号在本部门帖子下回复 = 官方回复
    const official = u.sfgf === '1' && u.rzbmid && (post.zdbmid === u.rzbmid || !post.zdbmid);
    const c = { id: uid('pl_'), tzid, fjlpid, hfdxid, fbrid: u.id, plnr: plnr.trim(), tps, likedBy: [], sfgfhf: official ? '1' : '0', cjsj: now(), zt: '1' };
    db.comments.push(c);
    if (official) { post.sfgfhf = '1'; post.hfzt = 'replied'; }
    notify(post.fbrid, 'reply', '有人回复了你的帖子', tzid);
    if (target) notify(target.fbrid, 'reply', '有人回复了你的评论', tzid);
    (plnr.match(/@([^\s@]+)/g) || []).forEach(m => {
      const t = db.users.find(x => x.nc === m.slice(1));
      if (t) notify(t.id, 'mention', '有人在帖子中提到了你', tzid);
    });
    // 给评论过该帖的其他人记未读回复角标
    new Set(db.comments.filter(x => x.tzid === tzid && x.fbrid !== u.id).map(x => x.fbrid)).forEach(id => {
      db.replyBadge[id] = db.replyBadge[id] || {};
      db.replyBadge[id][tzid] = (db.replyBadge[id][tzid] || 0) + 1;
    });
    commit();
    return c;
  }
  function deleteComment(id) {
    const c = db.comments.find(x => x.id === id);
    if (!c) return;
    c.zt = '0';
    db.comments.filter(x => x.fjlpid === id).forEach(x => { x.zt = '0'; });
    commit();
  }
  function toggleCommentLike(id) {
    assertActive();
    const c = db.comments.find(x => x.id === id);
    const i = c.likedBy.indexOf(db.currentUserId);
    if (i >= 0) c.likedBy.splice(i, 1);
    else { c.likedBy.push(db.currentUserId); notify(c.fbrid, 'like', '有人点赞了你的评论', c.tzid); }
    commit();
  }

  /* ---------- 投票 ---------- */
  const isVoteEnded = v => !!v.closedAt || now() >= v.deadline;
  function normVote(v, old) {
    if (!v) return null;
    const locked = old && old.ballots.length > 0;
    const deadline = +v.deadline || 0;
    if (locked) {
      if (deadline !== old.deadline) {
        if (deadline < old.deadline) throw new Error(`已有 ${old.ballots.length} 人参与，截止时间只能延长`);
        if (deadline <= now()) throw new Error('截止时间需晚于当前时间');
      }
      return Object.assign({}, old, { deadline, showBeforeVote: !!v.showBeforeVote });
    }
    const title = (v.title || '').trim();
    if (!title) throw new Error('请输入投票主题');
    if (title.length > 50) throw new Error('投票主题不超过 50 字');
    const options = (v.options || []).map(o => ({ id: o.id || uid('op_'), text: (o.text || '').trim() }));
    if (options.length < 2) throw new Error('至少需要 2 个投票选项');
    if (options.length > 10) throw new Error('最多 10 个投票选项');
    if (options.some(o => !o.text)) throw new Error('投票选项不能为空');
    if (options.some(o => o.text.length > 30)) throw new Error('每个选项不超过 30 字');
    if (new Set(options.map(o => o.text)).size !== options.length) throw new Error('投票选项不能重复');
    const multi = !!v.multi;
    const maxSelect = multi ? Math.min(Math.max(2, +v.maxSelect || options.length), options.length) : 1;
    if (!deadline || deadline <= now()) throw new Error('截止时间需晚于当前时间');
    return { title, options, multi, maxSelect, deadline, showBeforeVote: !!v.showBeforeVote, ballots: [], closedAt: 0, seenN: 0 };
  }
  function voteView(p) {
    const v = p && p.vote;
    if (!v) return null;
    const uidMe = db.currentUserId;
    const mine = v.ballots.find(b => b.uid === uidMe);
    const counts = Object.fromEntries(v.options.map(o => [o.id, 0]));
    v.ballots.forEach(b => b.optionIds.forEach(id => { if (id in counts) counts[id] += 1; }));
    const total = v.ballots.length;
    const ended = isVoteEnded(v);
    const isOwner = p.fbrid === uidMe;
    const isAdmin = (me() || {}).role === 'admin';
    const max = Math.max(0, ...Object.values(counts));
    const options = v.options.map(o => ({
      id: o.id, text: o.text, count: counts[o.id], pct: total ? Math.round(counts[o.id] / total * 1000) / 10 : 0,
      mine: !!(mine && mine.optionIds.includes(o.id)), lead: max > 0 && counts[o.id] === max
    }));
    const leaders = options.filter(o => o.lead);
    return {
      title: v.title, multi: v.multi, maxSelect: v.maxSelect, deadline: v.deadline, closedAt: v.closedAt, showBeforeVote: v.showBeforeVote,
      total, ended, endAt: v.closedAt || v.deadline, remain: ended ? 0 : v.deadline - now(), voted: !!mine, myChoice: mine ? mine.optionIds : [],
      myVoteAt: mine ? mine.cjsj : 0, canSeeResult: !!mine || ended || v.showBeforeVote || isOwner || isAdmin, isOwner, canManage: isOwner || isAdmin,
      options, leader: leaders.length ? leaders.map(o => o.text).join(' / ') : '', unseen: isOwner && !ended ? Math.max(0, total - (v.seenN || 0)) : 0
    };
  }
  function voteRemainText(info) {
    if (info.ended) return info.closedAt ? '已提前结束' : '已结束';
    const r = info.remain;
    if (r >= DAY) { const h = Math.floor(r % DAY / HOUR); return `剩余 ${Math.floor(r / DAY)} 天${h ? ' ' + h + ' 小时' : ''}`; }
    if (r >= HOUR) return `剩余 ${Math.floor(r / HOUR)} 小时`;
    return `剩余 ${Math.max(1, Math.ceil(r / 60000))} 分钟`;
  }
  function castVote(tzid, optionIds) {
    assertActive();
    if (me().sfwczl !== '1') throw new Error('首次使用请先修改昵称、上传头像');
    const p = db.posts.find(x => x.id === tzid);
    if (!p || p.ztbq === 'deleted') throw new Error('该贴已删除。');
    const v = p.vote;
    if (!v) throw new Error('该帖子没有投票');
    if (isVoteEnded(v)) throw new Error('投票已结束');
    if (v.ballots.some(b => b.uid === db.currentUserId)) throw new Error('你已经投过票了');
    const ids = [...new Set(optionIds || [])].filter(id => v.options.some(o => o.id === id));
    if (!ids.length) throw new Error('请选择投票选项');
    if (!v.multi && ids.length > 1) throw new Error('该投票为单选');
    if (ids.length > v.maxSelect) throw new Error(`最多只能选择 ${v.maxSelect} 项`);
    v.ballots.push({ uid: db.currentUserId, optionIds: ids, cjsj: now() });
    commit();
  }
  function closeVote(tzid) {
    const p = db.posts.find(x => x.id === tzid);
    if (!p || !p.vote) throw new Error('投票不存在');
    if (p.fbrid !== db.currentUserId && me().role !== 'admin') throw new Error('只有发起人可以结束投票');
    if (isVoteEnded(p.vote)) throw new Error('投票已结束');
    p.vote.closedAt = now();
    p.vote.ballots.forEach(b => notify(b.uid, 'system', `你参与的投票「${p.vote.title}」已结束，快去看看结果吧`, p.id));
    if (p.fbrid !== db.currentUserId) notify(p.fbrid, 'system', `你发起的投票「${p.vote.title}」已被管理员提前结束`, p.id);
    commit();
  }
  function myVotes(type = 'created') {
    const id = db.currentUserId;
    const mineBallot = p => p.vote.ballots.find(b => b.uid === id);
    const list = db.posts.filter(p => p.vote && p.ztbq !== 'deleted' && (type === 'created' ? p.fbrid === id : !!mineBallot(p)));
    const key = p => type === 'created' ? p.fbsj : mineBallot(p).cjsj;
    return list.sort((a, b) => key(b) - key(a)).map(postView);
  }
  const unseenVotes = () => myVotes('created').reduce((n, p) => n + p.voteInfo.unseen, 0);
  function voteDetail(tzid) {
    const p = db.posts.find(x => x.id === tzid);
    if (!p || !p.vote) throw new Error('投票不存在');
    const isAdmin = me().role === 'admin';
    if (p.fbrid !== db.currentUserId && !isAdmin) throw new Error('仅发起人可查看投票明细');
    const v = p.vote;
    const optText = Object.fromEntries(v.options.map(o => [o.id, o.text]));
    const ballots = v.ballots.slice().sort((a, b) => b.cjsj - a.cjsj).map(b => {
      const u = user(b.uid) || {};
      const row = { uid: b.uid, nc: u.nc || '用户', tx: u.tx, choice: b.optionIds.map(id => optText[id] || '—'), cjsj: b.cjsj };
      if (isAdmin) Object.assign(row, { xm: u.xm || '—', xh: u.xh || '—', bmmc: u.bmmc || '—' });
      return row;
    });
    const endDay = startOfDay(Math.min(now(), v.closedAt || v.deadline));
    let startDay = startOfDay(p.fbsj);
    if ((endDay - startDay) / DAY > 13) startDay = endDay - 13 * DAY;
    const trend = [];
    for (let d = startDay; d <= endDay; d += DAY) trend.push({ day: d, n: v.ballots.filter(b => b.cjsj >= d && b.cjsj < d + DAY).length });
    return { post: postView(p), info: voteView(p), ballots, trend, withRealname: isAdmin };
  }
  function markVoteSeen(tzid) {
    const p = db.posts.find(x => x.id === tzid);
    if (!p || !p.vote || p.fbrid !== db.currentUserId) return;
    if ((p.vote.seenN || 0) !== p.vote.ballots.length) { p.vote.seenN = p.vote.ballots.length; commit(); }
  }
  function voteCsv(tzid) {
    const d = voteDetail(tzid);
    const q = s => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const head = ['序号', '昵称'].concat(d.withRealname ? ['姓名', '学号', '学院'] : [], ['所选项', '投票时间']);
    const rows = d.ballots.map((b, i) => [i + 1, b.nc].concat(d.withRealname ? [b.xm, b.xh, b.bmmc] : [], [b.choice.join('；'), fmtDateTime(b.cjsj)]));
    const sum = d.info.options.map(o => [o.text, o.count, o.pct + '%']);
    return '\ufeff' + [[q('投票主题'), q(d.info.title)].join(','), [q('参与人数'), d.info.total].join(','), '', ['选项', '票数', '占比'].map(q).join(',')]
      .concat(sum.map(r => r.map(q).join(',')), [''], [head.map(q).join(',')], rows.map(r => r.map(q).join(','))).join('\r\n');
  }

  /* ---------- 个人 ---------- */
  function myStats() {
    const id = db.currentUserId;
    return {
      posts: db.posts.filter(p => p.fbrid === id && p.ztbq !== 'deleted').length,
      comments: db.comments.filter(c => c.fbrid === id && c.zt === '1').length,
      messages: sessions().length,
      drafts: db.drafts.filter(d => d.fbrid === id).length,
      unreadMsg: db.messages.filter(m => m.jsrid === id && m.sfyd === '0').length
    };
  }
  const myPosts = () => db.posts.filter(p => p.fbrid === db.currentUserId && p.ztbq !== 'deleted').map(postView).sort((a, b) => b.fbsj - a.fbsj);
  function myCommentedPosts() {
    const ids = [...new Set(db.comments.filter(c => c.fbrid === db.currentUserId && c.zt === '1').sort((a, b) => b.cjsj - a.cjsj).map(c => c.tzid))];
    const badge = db.replyBadge[db.currentUserId] || {};
    return ids.map(id => db.posts.find(p => p.id === id)).filter(p => p && p.ztbq !== 'deleted').map(p => Object.assign(postView(p), { unreadCount: badge[p.id] || 0 }));
  }
  function updateProfile({ nc, tx }) {
    const u = me();
    const changed = (nc && nc !== u.nc) || (tx && tx !== u.tx);
    if (!changed) { if (u.sfwczl !== '1') { u.sfwczl = '1'; commit(); } return u; }
    if (u.ncChangeRemain <= 0) throw new Error('30 天内修改次数已用完');
    if (nc !== undefined) {
      nc = nc.trim();
      if (nc.length < 2 || nc.length > 20) throw new Error('昵称长度为 2-20 字');
      if (db.users.some(x => x.nc === nc && x.id !== u.id)) throw new Error('该昵称已被使用');
      u.nc = nc;
    }
    if (tx) u.tx = tx;
    u.ncChangeRemain -= 1;
    u.sfwczl = '1';
    commit();
    return u;
  }
  function randomNick() { return NICK_A[Math.floor(Math.random() * NICK_A.length)] + NICK_B[Math.floor(Math.random() * NICK_B.length)] + Math.floor(Math.random() * 90 + 10); }

  /* ---------- 草稿 ---------- */
  const drafts = () => db.drafts.filter(d => d.fbrid === db.currentUserId).sort((a, b) => b.gxsj - a.gxsj);
  const getDraft = id => db.drafts.find(d => d.id === id);
  // 草稿里的投票保存原始填写内容，不做校验，发布时再校验
  function saveDraft({ id, lx = '', ht = '', bt = '', nr = '', tps = [], vote = null }) {
    let d = id && getDraft(id);
    if (!d) { d = { id: uid('cg_'), fbrid: db.currentUserId }; db.drafts.push(d); }
    Object.assign(d, { lx, ht, bt, nr, tps, vote: vote ? JSON.parse(JSON.stringify(vote)) : null, gxsj: now() });
    commit();
    return d;
  }
  function deleteDraft(id) { db.drafts = db.drafts.filter(d => d.id !== id); commit(); }

  /* ---------- 私信 ---------- */
  function sessions() {
    const id = db.currentUserId;
    const map = {};
    db.messages.filter(m => m.fsrid === id || m.jsrid === id).forEach(m => {
      const peer = m.fsrid === id ? m.jsrid : m.fsrid;
      if (!map[peer] || map[peer].cjsj < m.cjsj) map[peer] = m;
    });
    return Object.entries(map).map(([peer, m]) => {
      const u = user(peer) || {};
      return Object.assign({}, m, {
        peerUserId: peer, peerNc: u.nc || '用户', peerTx: u.tx, peerBmmc: u.bmmc || '',
        unreadCount: db.messages.filter(x => x.fsrid === peer && x.jsrid === id && x.sfyd === '0').length
      });
    }).sort((a, b) => b.cjsj - a.cjsj);
  }
  function chat(peerId) {
    const id = db.currentUserId;
    let dirty = false;
    const list = db.messages.filter(m => (m.fsrid === id && m.jsrid === peerId) || (m.fsrid === peerId && m.jsrid === id)).sort((a, b) => a.cjsj - b.cjsj);
    list.forEach(m => { if (m.jsrid === id && m.sfyd === '0') { m.sfyd = '1'; dirty = true; } });
    if (dirty) persist();
    return list.map(m => Object.assign({}, m, { mine: m.fsrid === id }));
  }
  function sendMessage(peerId, nr) {
    if (peerId === db.currentUserId) throw new Error('不能给自己发私信');
    assertActive();
    if (!nr.trim()) throw new Error('请输入你的内容');
    db.messages.push({ id: uid('sx_'), fsrid: db.currentUserId, jsrid: peerId, nr: nr.trim(), cjsj: now(), sfyd: '0' });
    commit();
  }

  /* ---------- 消息通知 ---------- */
  function notify(toUid, type, text, tzid, lfid) {
    if (!toUid || toUid === db.currentUserId) return;
    db.notices.push({ id: uid('xx_'), uid: toUid, type, text, fromId: db.currentUserId, tzid, lfid, cjsj: now(), read: false });
  }
  function notices(type) {
    return db.notices.filter(n => n.uid === db.currentUserId && (!type || n.type === type)).sort((a, b) => b.cjsj - a.cjsj)
      .map(n => Object.assign({}, n, { from: user(n.fromId), post: getPost(n.tzid), lf: n.lfid ? lfGet(n.lfid) : null }));
  }
  function unreadNotices(type) { return db.notices.filter(n => n.uid === db.currentUserId && !n.read && (!type || n.type === type)).length; }
  function markNoticesRead(type) {
    db.notices.forEach(n => { if (n.uid === db.currentUserId && (!type || n.type === type)) n.read = true; });
    commit();
  }

  /* ---------- 举报 ---------- */
  function report(tzid, jblx, jbsm) {
    assertActive();
    if (!jblx) throw new Error('请选择举报类型');
    const p = db.posts.find(x => x.id === tzid);
    if (!p) throw new Error('无法获取帖子信息');
    const d = new Date();
    const prefix = 'JB' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const n = db.reports.filter(r => r.jbbh.startsWith(prefix)).length + 1;
    db.reports.push({ id: uid('jb_'), jbbh: prefix + String(n).padStart(4, '0'), tzid, jbrid: db.currentUserId, jblx, jbsm: (jbsm || '').trim(), cjsj: now(), zt: 'pending' });
    if (p.ztbq === 'normal') p.ztbq = 'reported';
    commit();
  }
  function reportView(r) {
    const p = db.posts.find(x => x.id === r.tzid);
    return Object.assign({}, r, { post: p ? postView(p) : null, jbr: user(r.jbrid) });
  }
  function myReports(status) {
    return db.reports.filter(r => r.jbrid === db.currentUserId && (!status || r.zt === status)).sort((a, b) => b.cjsj - a.cjsj).map(reportView);
  }
  const postReports = tzid => db.reports.filter(r => r.tzid === tzid).sort((a, b) => b.cjsj - a.cjsj).map(reportView);
  // result: 'pass' 不违规 | 'violation' 违规删除
  function handleReports(tzid, result, clsm) {
    const p = db.posts.find(x => x.id === tzid);
    db.reports.filter(r => r.tzid === tzid && r.zt === 'pending').forEach(r => {
      Object.assign(r, { zt: 'done', result, clsm: clsm || (result === 'pass' ? '经核实未违规，予以保留' : '违规成立 · 帖子已删除'), clsj: now(), clr: '社区管理员' });
      notify(r.jbrid, 'system', '你举报的帖子已处理：' + r.clsm, tzid);
    });
    if (result === 'pass') { if (p.ztbq === 'reported') p.ztbq = 'normal'; }
    else { p.ztbq = 'deleted'; p.zt = '0'; notify(p.fbrid, 'system', '你的帖子「' + p.bt + '」因违规已被删除', tzid); }
    commit();
  }

  /* ---------- 管理端 ---------- */
  function dashboard(days = 7) {
    const t = now();
    const today = startOfDay(t);
    const live = db.posts.filter(p => p.ztbq !== 'deleted');
    const dayList = [...Array(days)].map((_, i) => today - (days - 1 - i) * DAY);
    const inDay = (p, d) => p.fbsj >= d && p.fbsj < d + DAY;
    const trend = dayList.map(d => live.filter(p => inDay(p, d)).length);
    const riskTrend = { l1: [], l2: [], l3: [] };
    dayList.forEach(d => {
      [1, 2, 3].forEach(lv => riskTrend['l' + lv].push(live.filter(p => p.fxdj === lv && inDay(p, d)).length));
    });
    const since7 = today - 6 * DAY;
    const recent = live.filter(p => p.fbsj >= since7);
    const riskAll = live.filter(p => p.fxdj > 0);
    const intervened = riskAll.filter(p => db.interventions.some(x => x.tzid === p.id));
    const plates = LX.map(l => ({ lx: l.value, plateName: l.label, count: recent.filter(p => p.lx === l.value).length }))
      .filter(x => x.count > 0).sort((a, b) => b.count - a.count).map((x, i) => Object.assign(x, { rank: i + 1 }));
    const pendingByDept = {};
    live.filter(p => p.zdbmid && p.hfzt === 'pending').forEach(p => { pendingByDept[p.zdbmid] = (pendingByDept[p.zdbmid] || 0) + 1; });
    const maxPending = Math.max(1, ...Object.values(pendingByDept));
    const deptEfficiency = Object.entries(pendingByDept).map(([id, n]) => ({ zdbmid: id, bmmc: (dept(id) || {}).bmmc || '—', pending: n, pct: Math.round(n / maxPending * 100) }))
      .sort((a, b) => b.pending - a.pending);
    const weekStart = startOfWeek(t);
    const maxIdx = trend.indexOf(Math.max(...trend));
    const inter = recent.reduce((s, p) => { const v = postView(p); return s + v.dzs + v.pls; }, 0);
    const health = live.length ? (1 - riskAll.length / live.length) * 100 : 100;
    return {
      todayPost: live.filter(p => p.fbsj >= today).length,
      riskPost: riskAll.length,
      pendingReply: live.filter(p => p.zdbmid && p.hfzt === 'pending' && p.fbsj >= weekStart).length,
      bannedUser: db.users.filter(u => isBanned(u)).length,
      labels: dayList, trend7d: trend, riskTrend7d: riskTrend, hotPlateTop5: plates.slice(0, 5), deptEfficiency,
      metrics: {
        maxDay: trend[maxIdx] || 0, maxDayDate: fmtDate(dayList[maxIdx]),
        interaction: recent.length ? (inter / recent.length) : 0,
        riskHandle: riskAll.length ? intervened.length / riskAll.length * 100 : 100,
        health, healthLabel: health >= 95 ? '优' : health >= 80 ? '良' : '差'
      }
    };
  }
  function adminPosts(f = {}) {
    let list = db.posts.map(postView);
    if (f.lx) list = list.filter(p => p.lx === f.lx);
    if (f.ztbq) list = list.filter(p => p.ztbq === f.ztbq);
    if (f.hfzt) list = list.filter(p => p.zdbmid && p.hfzt === f.hfzt);
    if (f.vote === 'yes') list = list.filter(p => p.vote);
    if (f.vote === 'no') list = list.filter(p => !p.vote);
    if (f.vote === 'active') list = list.filter(p => p.vote && !p.voteInfo.ended);
    if (f.bt) list = list.filter(p => p.bt.includes(f.bt.trim()));
    if (f.start) list = list.filter(p => p.fbsj >= f.start);
    if (f.end) list = list.filter(p => p.fbsj <= f.end);
    return list.sort((a, b) => b.fbsj - a.fbsj);
  }
  function adminUsers(f = {}) {
    let list = db.users.map(u => Object.assign({}, u, {
      banned: isBanned(u), ftzsl: db.posts.filter(p => p.fbrid === u.id && p.ztbq !== 'deleted').length,
      hfsl: db.comments.filter(c => c.fbrid === u.id && c.zt === '1').length, rzbmmc: (dept(u.rzbmid) || {}).bmmc || '—'
    }));
    const has = (v, q) => !q || (v || '').includes(q.trim());
    list = list.filter(u => has(u.nc, f.nc) && has(u.xm, f.xm) && has(u.xh, f.xh) && has(u.bmmc + u.nj, f.bm));
    if (f.zt === 'normal') list = list.filter(u => !u.banned);
    if (f.zt === 'banned') list = list.filter(u => u.banned);
    if (f.sfgf) list = list.filter(u => u.sfgf === f.sfgf);
    return list.sort((a, b) => b.cjsj - a.cjsj);
  }
  function banUser(id, { reason, days, note, purge }) {
    const u = user(id);
    if (!reason) throw new Error('请选择封禁原因');
    if (!days) throw new Error('请选择封禁时长');
    Object.assign(u, { fjzt: '1', fjyy: reason, fjsc: days, fjbz: note || '', fjjssj: days > 0 ? now() + days * DAY : -1 });
    if (purge) {
      db.posts.forEach(p => { if (p.fbrid === id) { p.ztbq = 'deleted'; p.zt = '0'; } });
      db.comments.forEach(c => { if (c.fbrid === id) c.zt = '0'; });
    }
    db.notices.push({ id: uid('xx_'), uid: id, type: 'system', text: `你的账号因「${reason}」被封禁${days > 0 ? days + '天' : '（永久）'}`, cjsj: now(), read: false });
    commit();
  }
  function unbanUser(id) { Object.assign(user(id), { fjzt: '0', fjjssj: 0 }); commit(); }
  function certifyUser(id, deptId) {
    const u = user(id);
    u.sfgf = deptId ? '1' : '0';
    u.rzbmid = deptId || '';
    commit();
  }
  function saveDept(d) {
    if (!d.bmmc || !d.bmmc.trim()) throw new Error('请输入部门名称');
    if (d.hflsxs === '' || d.hflsxs == null || isNaN(+d.hflsxs)) throw new Error('请输入回复时限');
    if (d.id) Object.assign(dept(d.id), d, { hflsxs: +d.hflsxs, px: +d.px || 0, gxsj: now() });
    else db.depts.push(Object.assign({ id: uid('bm_'), cjsj: now(), gxsj: now(), zt: '1' }, d, { hflsxs: +d.hflsxs, px: +d.px || 0 }));
    commit();
  }
  function deleteDept(id) { db.depts = db.depts.filter(d => d.id !== id); commit(); }
  const managedDepts = () => db.depts.filter(d => d.fzrgh && d.fzrgh === me().xh);
  function adminTopics(f = {}) {
    const ids = managedDepts().map(d => d.id);
    let list = db.topics.filter(t => ids.includes(t.zdbmid));
    if (f.kw) list = list.filter(t => (t.htmc + t.htbh).includes(f.kw.trim()));
    if (f.zdbmid) list = list.filter(t => t.zdbmid === f.zdbmid);
    if (f.zt) list = list.filter(t => t.zt === f.zt);
    return list.map(t => Object.assign({}, t, { bmmc: (dept(t.zdbmid) || {}).bmmc })).sort((a, b) => a.zdbmid.localeCompare(b.zdbmid) || a.px - b.px);
  }
  function saveTopic(t) {
    if (!t.htmc || !t.htmc.trim()) throw new Error('请输入话题名称');
    if (!t.htbh || !t.htbh.trim()) throw new Error('请输入话题编码');
    if (!t.zdbmid) throw new Error('请选择所属部门');
    if (db.topics.some(x => x.htbh === t.htbh && x.id !== t.id)) throw new Error('话题编码已存在');
    if (t.id) Object.assign(db.topics.find(x => x.id === t.id), t, { px: +t.px || 0 });
    else db.topics.push(Object.assign({ id: uid('ht_'), cjsj: now(), zt: '1' }, t, { px: +t.px || 0 }));
    commit();
  }
  function deleteTopic(id) { db.topics = db.topics.filter(t => t.id !== id); commit(); }
  const activeTopics = () => db.topics.filter(t => t.zt === '1' && (dept(t.zdbmid) || {}).zt === '1')
    .map(t => Object.assign({}, t, { bmmc: dept(t.zdbmid).bmmc })).sort((a, b) => (dept(a.zdbmid).px - dept(b.zdbmid).px) || a.px - b.px);
  function riskPosts(range = '24h') {
    let list = db.posts.filter(p => p.fxdj > 0 && p.ztbq !== 'deleted');
    if (range === '24h') list = list.filter(p => p.fbsj >= now() - DAY);
    if (range === '7d') list = list.filter(p => p.fbsj >= now() - 7 * DAY);
    return list.map(p => Object.assign(postView(p), { author: user(p.fbrid), interventions: db.interventions.filter(x => x.tzid === p.id).length }))
      .sort((a, b) => a.fxdj - b.fxdj || b.fbsj - a.fbsj);
  }
  const interventions = tzid => db.interventions.filter(x => x.tzid === tzid).sort((a, b) => b.gysj - a.gysj);
  function saveIntervention(x) {
    if (!x.lxry || !x.lxry.length) throw new Error('请选择联系人员');
    if (!x.cljg || !x.cljg.trim()) throw new Error('请填写处理结果');
    if (x.id) Object.assign(db.interventions.find(i => i.id === x.id), x);
    else db.interventions.push(Object.assign({ id: uid('gy_'), gysj: now(), gyr: me().xm, bmgw: '学工部 / 管理员' }, x));
    commit();
  }
  function deleteIntervention(id) { db.interventions = db.interventions.filter(x => x.id !== id); commit(); }

  const EXTERNAL = [
    { id: 'e1', source: '小红书', title: '中南的食堂到底哪个最好吃？新生求推荐', summary: '刚入学一个月，岳麓山校区几个食堂都吃了一遍，整理了一份个人排行……', views: 12800, comments: 213, shares: 54, t: 2 },
    { id: 'e2', source: '知乎', title: '在中南大学读书是一种什么样的体验？', summary: '岳麓山下，湘江之滨，学风扎实，就是校区之间往返有点远……', views: 98000, comments: 1320, shares: 402, t: 5 },
    { id: 'e3', source: '微博', title: '中南大学新生开学典礼现场', summary: '今天的开学典礼，校长寄语新生“知行合一、经世致用”……', views: 45600, comments: 380, shares: 210, t: 12 },
    { id: 'e4', source: '抖音', title: '中南大学校园晚霞延时摄影', summary: '记录升华楼前的一场晚霞，评论区都在问拍摄地点……', views: 230000, comments: 2100, shares: 980, t: 20 },
    { id: 'e5', source: '小红书', title: '学校食堂不好吃怎么办？附近美食地图', summary: '吐槽归吐槽，整理了一份学校周边步行十分钟内的美食清单……', views: 8600, comments: 167, shares: 33, t: 30 },
    { id: 'e6', source: '知乎', title: '中南大学进出校门是否困难？', summary: '目前校外人员需要预约，学生刷卡/刷脸即可，高峰期北门排队较长……', views: 15300, comments: 96, shares: 12, t: 44 },
    { id: 'e7', source: '微博', title: '中南学子在全国大学生竞赛中获佳绩', summary: '我校代表队在本届竞赛中斩获一等奖 3 项……', views: 21000, comments: 88, shares: 67, t: 60 }
  ];
  function externalSentiment(kw = '', sort = 'desc') {
    const k = kw.trim();
    let list = EXTERNAL.map(e => Object.assign({}, e, { time: now() - e.t * HOUR }));
    if (k) list = list.filter(e => (e.title + e.summary).includes(k) || k.split('').some(ch => e.title.includes(ch) && k.length <= 2));
    list.sort((a, b) => sort === 'asc' ? a.time - b.time : b.time - a.time);
    return list;
  }

  /* ---------- 失物招领 ---------- */
  const lfRaw = id => db.lfItems.find(x => x.id === id);
  const lfPoint = id => db.lfPoints.find(p => p.id === id);
  const lfMember = (id = db.currentUserId) => db.lfMembers.find(m => m.uid === id);
  const lfIsSuper = () => me().role === 'admin';
  function lfRoles(id = db.currentUserId) {
    const u = user(id);
    if (u && u.role === 'admin') return ['register', 'checker', 'admin'];
    const m = lfMember(id);
    return m ? m.roles.slice() : [];
  }
  const lfIsTeam = () => lfRoles().length > 0;
  // action: register 登记 | check 核对交接 | admin 配置管理；传入物品时按负责服务点限定范围
  function lfCan(action, it) {
    if (lfIsSuper()) return true;
    const m = lfMember();
    if (!m) return false;
    if (m.roles.includes('admin')) return true;
    if (!m.roles.includes(action === 'check' ? 'checker' : action)) return false;
    if (it && it.bgdid) return m.points.includes(it.bgdid);
    return true;
  }
  const lfMyPoints = () => {
    if (lfIsSuper() || lfRoles().includes('admin')) return db.lfPoints.slice();
    const m = lfMember();
    return m ? db.lfPoints.filter(p => m.points.includes(p.id)) : [];
  };
  // 同学自行保管的物品由发布者核对；交到服务点的由团队核对
  const lfCanReview = it => it.ly === 'student' && it.bgfs === 'self' ? it.fbrid === db.currentUserId : lfCan('check', it);
  const lfExpired = it => it.lx === 'found' && it.zt === 'pending' && now() - it.fbsj > LF_EXPIRE;
  const lfZt = it => lfExpired(it) ? 'expired' : it.zt;
  const lfLongIdle = it => it.lx === 'found' && ['pending', 'checking'].includes(it.zt) && !lfExpired(it) && now() - it.gxsj > 30 * DAY;
  function maskName(s) {
    if (!s) return '';
    return s.length <= 2 ? s[0] + '*' : s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
  }
  const maskNo = s => !s ? '' : s.length <= 6 ? s : s.slice(0, 4) + '****' + s.slice(-2);
  function lfView(it) {
    if (!it) return null;
    const u = user(it.fbrid) || {};
    const p = lfPoint(it.bgdid);
    const zt = lfZt(it);
    const claims = db.lfClaims.filter(c => c.itemId === it.id);
    const mine = it.fbrid === db.currentUserId;
    const priv = mine || lfCan('register', it) || lfCan('check', it);
    const team = it.ly === 'team';
    return Object.assign({}, it, {
      ztKey: zt, ztLabel: LF_ZT[zt].label, tone: LF_ZT[zt].tone, flLabel: (LF_FL_MAP[it.fl] || {}).label || '其他',
      isTeam: team, lyLabel: team ? '团队发布' : '同学发布', fbrnc: u.nc || '同学', fbrtx: u.tx,
      czr: u, point: p || null, card: priv ? it.card : null,
      bgText: it.lx === 'lost' ? '' : it.bgfs === 'self' ? '发布同学保管' : (p ? p.mc : '服务点'),
      isMine: mine, canReview: lfCanReview(it), canEdit: (mine && !team) || lfCan('register', it), canReturn: mine || lfCan('check', it),
      sjText: fmtDate(it.sj) + (it.sjsm ? ' ' + it.sjsm : ''), expired: zt === 'expired', longIdle: lfLongIdle(it),
      claimN: claims.filter(c => ['pending', 'more', 'pass'].includes(c.zt)).length, clueN: db.lfClues.filter(c => c.itemId === it.id).length,
      myClaim: claims.filter(c => c.sqrid === db.currentUserId).sort((a, b) => b.cjsj - a.cjsj)[0] || null,
      closed: ['returned', 'found', 'withdrawn', 'expired'].includes(zt)
    });
  }
  const lfGet = id => lfView(lfRaw(id));
  const LF_ACTIVE = { found: ['pending', 'checking'], lost: ['seeking'] };
  function lfList({ lx = 'found', kw = '', xq = '', fl = '', days = 0, ly = '', zt = '', closed = false } = {}) {
    kw = kw.trim().toLowerCase();
    let list = db.lfItems.filter(it => it.lx === lx);
    if (zt) list = list.filter(it => lfZt(it) === zt);
    else if (!closed) list = list.filter(it => LF_ACTIVE[lx].includes(lfZt(it)));
    else list = list.filter(it => !['withdrawn', 'expired'].includes(lfZt(it)));
    if (xq) list = list.filter(it => it.xq === xq);
    if (fl) list = list.filter(it => it.fl === fl);
    if (ly) list = list.filter(it => it.ly === ly);
    if (+days) list = list.filter(it => it.fbsj >= startOfDay(now()) - (days - 1) * DAY);
    list = list.map(lfView);
    if (kw) list = list.filter(it => [it.bh, it.mc, it.nr, it.dd, it.xq, it.flLabel].join(' ').toLowerCase().includes(kw));
    return list.sort((a, b) => (a.closed - b.closed) || b.fbsj - a.fbsj);
  }
  function lfNextBh(lx) {
    const pre = (lx === 'lost' ? 'XW' : 'SW') + fmtDate(now()).replace(/-/g, '');
    const n = db.lfItems.filter(x => x.bh.startsWith(pre)).length + 1;
    return pre + String(n).padStart(3, '0');
  }
  const lfLog = (it, act, note) => { it.logs.push({ t: now(), act, uid: db.currentUserId, note: note || '' }); it.gxsj = now(); };
  function lfCheckFields(d) {
    if (!d.fl) throw new Error('请选择物品种类');
    if (!(d.mc || '').trim()) throw new Error('请填写物品名称');
    if (!d.xq) throw new Error('请选择校区');
    if (!(d.dd || '').trim()) throw new Error(d.lx === 'lost' ? '请填写可能丢失的地点' : '请填写捡到地点');
    if (d.lx === 'found' && d.bgfs === 'point' && !d.bgdid) throw new Error('请选择交到的服务点');
  }
  function lfCreate(d, { silent } = {}) {
    assertActive();
    const team = d.ly === 'team';
    if (team && !lfCan('register', d.bgdid ? { bgdid: d.bgdid } : null)) {
      throw new Error(lfMember() || lfIsSuper() ? '当前账号没有该服务点的登记权限' : '当前账号没有资助团队标识，不能以团队身份发布');
    }
    const lx = d.lx === 'lost' ? 'lost' : 'found';
    const bgfs = lx === 'lost' ? '' : team ? 'point' : (d.bgfs || 'self');
    const x = Object.assign({}, d, { lx, bgfs });
    lfCheckFields(x);
    const t = now();
    const it = {
      id: uid('lf_'), bh: lfNextBh(lx), lx, fl: d.fl, mc: d.mc.trim(), xq: d.xq, dd: d.dd.trim(), sj: d.sj || t, sjsm: (d.sjsm || '').trim(),
      nr: (d.nr || '').trim(), tps: d.tps || [], ly: team ? 'team' : 'student', fbrid: db.currentUserId, bgfs, bgdid: bgfs === 'point' ? d.bgdid : '',
      zt: lx === 'lost' ? 'seeking' : 'pending', card: d.card || null, cxyy: '', fbsj: t, gxsj: t,
      logs: [{ t, act: '登记', uid: db.currentUserId, note: team ? '团队登记' : '同学发布' }]
    };
    db.lfItems.push(it);
    if (!silent) commit();
    return it;
  }
  function lfUpdate(id, d) {
    const it = lfRaw(id);
    if (!it) throw new Error('物品记录不存在');
    const v = lfView(it);
    if (!v.canEdit) throw new Error('没有编辑该物品的权限');
    const next = Object.assign({}, it, d);
    lfCheckFields(next);
    const from = it.bgdid;
    ['fl', 'mc', 'xq', 'dd', 'sj', 'sjsm', 'nr', 'tps', 'bgfs', 'bgdid', 'card'].forEach(k => { if (d[k] !== undefined) it[k] = typeof d[k] === 'string' ? d[k].trim() : d[k]; });
    if (it.bgfs !== 'point') it.bgdid = '';
    if (from !== it.bgdid) lfLog(it, '变更保管点', `${(lfPoint(from) || {}).mc || '发布同学保管'} → ${(lfPoint(it.bgdid) || {}).mc || '发布同学保管'}`);
    else lfLog(it, '编辑信息');
    commit();
  }
  function lfTransfer(id, pointId) {
    const it = lfRaw(id);
    if (it.fbrid !== db.currentUserId && !lfCan('register')) throw new Error('没有操作权限');
    if (!lfPoint(pointId)) throw new Error('请选择服务点');
    const from = it.bgfs === 'self' ? '发布同学保管' : (lfPoint(it.bgdid) || {}).mc;
    Object.assign(it, { bgfs: 'point', bgdid: pointId });
    lfLog(it, '转交服务点', `${from} → ${lfPoint(pointId).mc}`);
    commit();
  }
  function lfWithdraw(id, reason) {
    const it = lfRaw(id);
    if (!lfView(it).canEdit) throw new Error('没有撤回该信息的权限');
    if (!(reason || '').trim()) throw new Error('请填写撤回原因');
    it.zt = 'withdrawn';
    it.cxyy = reason.trim();
    lfLog(it, '撤回', it.cxyy);
    db.lfClaims.filter(c => c.itemId === id && ['pending', 'more', 'pass'].includes(c.zt)).forEach(c => {
      Object.assign(c, { zt: 'reject', jl: '物品信息已撤回', gxsj: now() });
      notify(c.sqrid, 'lost', `你认领的「${it.mc}」信息已撤回`, undefined, id);
    });
    commit();
  }
  function lfMarkFound(id) {
    const it = lfRaw(id);
    if (it.fbrid !== db.currentUserId) throw new Error('只有发布人可以标记已找回');
    it.zt = 'found';
    lfLog(it, '标记已找回');
    commit();
  }
  function lfCloseClaims(it, keepId) {
    db.lfClaims.filter(c => c.itemId === it.id && c.id !== keepId && ['pending', 'more', 'pass'].includes(c.zt)).forEach(c => {
      Object.assign(c, { zt: 'reject', jl: '物品已归还给其他认领人', gxsj: now() });
      c.logs.push({ t: now(), act: '申请关闭', uid: db.currentUserId, note: '物品已归还给其他认领人' });
      notify(c.sqrid, 'lost', `你认领的「${it.mc}」已归还给其他认领人，申请已关闭`, undefined, it.id);
    });
  }
  // 归还：claimId 为空表示线下直接归还（团队台账可批量）
  function lfReturn(ids, { claimId, note } = {}) {
    ids = [].concat(ids);
    if (!ids.length) throw new Error('请先选择物品');
    ids.forEach(id => {
      const it = lfRaw(id);
      if (!it) return;
      if (!lfView(it).canReturn) throw new Error(`没有归还「${it.mc}」的权限`);
      if (it.lx !== 'found' || !['pending', 'checking'].includes(it.zt)) return;
      it.zt = 'returned';
      lfLog(it, '完成归还', note || (claimId ? '按认领申请交接完成' : '线下领取'));
      if (claimId) {
        const c = db.lfClaims.find(x => x.id === claimId);
        Object.assign(c, { zt: 'done', gxsj: now() });
        c.logs.push({ t: now(), act: '完成归还', uid: db.currentUserId, note: note || '' });
        notify(c.sqrid, 'lost', `你认领的「${it.mc}」已完成归还`, undefined, it.id);
      }
      lfCloseClaims(it, claimId);
    });
    commit();
  }
  function lfClaim(itemId, { tz, sjdd, tps }) {
    assertActive();
    const it = lfRaw(itemId);
    if (!it || it.lx !== 'found') throw new Error('物品记录不存在');
    if (it.fbrid === db.currentUserId) throw new Error('不能认领自己发布的物品');
    if (!['pending', 'checking'].includes(lfZt(it))) throw new Error('该物品当前不可认领');
    if (db.lfClaims.some(c => c.itemId === itemId && c.sqrid === db.currentUserId && ['pending', 'more', 'pass'].includes(c.zt))) throw new Error('你已提交过认领申请，请在「我的认领」查看进度');
    if (!(tz || '').trim()) throw new Error('请填写可证明归属的特征');
    if (!(sjdd || '').trim()) throw new Error('请填写丢失时间和地点');
    const t = now();
    const c = { id: uid('rl_'), itemId, sqrid: db.currentUserId, tz: tz.trim(), sjdd: sjdd.trim(), tps: tps || [], zt: 'pending', bcyq: '', jl: '', clr: '', jj: null, cjsj: t, gxsj: t, logs: [{ t, act: '提交申请', uid: db.currentUserId }] };
    db.lfClaims.push(c);
    lfReviewers(it).forEach(u => notify(u, 'lost', '有新的认领申请待核对：' + it.mc, undefined, itemId));
    commit();
    return c;
  }
  function lfReviewers(it) {
    if (it.ly === 'student' && it.bgfs === 'self') return [it.fbrid];
    const p = lfPoint(it.bgdid);
    const list = db.lfMembers.filter(m => m.roles.includes('admin') || (m.roles.includes('checker') && m.points.includes(it.bgdid))).map(m => m.uid);
    if (p && p.fzr && !list.includes(p.fzr)) list.push(p.fzr);
    return list;
  }
  function lfUpdateClaim(claimId, { tz, sjdd, tps }) {
    const c = db.lfClaims.find(x => x.id === claimId);
    if (!c || c.sqrid !== db.currentUserId) throw new Error('申请不存在');
    if (!['pending', 'more'].includes(c.zt)) throw new Error('当前状态不能修改');
    if (!(tz || '').trim()) throw new Error('请填写可证明归属的特征');
    if (!(sjdd || '').trim()) throw new Error('请填写丢失时间和地点');
    const wasMore = c.zt === 'more';
    Object.assign(c, { tz: tz.trim(), sjdd: sjdd.trim(), tps: tps || [], zt: 'pending', bcyq: '', gxsj: now() });
    c.logs.push({ t: now(), act: wasMore ? '补充材料' : '修改申请', uid: db.currentUserId });
    const it = lfRaw(c.itemId);
    lfReviewers(it).forEach(u => notify(u, 'lost', (wasMore ? '认领人已补充材料：' : '认领人修改了申请：') + it.mc, undefined, it.id));
    commit();
  }
  function lfCancelClaim(claimId) {
    const c = db.lfClaims.find(x => x.id === claimId);
    if (!c || c.sqrid !== db.currentUserId) throw new Error('申请不存在');
    if (!['pending', 'more'].includes(c.zt)) throw new Error('申请已进入核对，不能撤回');
    c.zt = 'cancel';
    c.gxsj = now();
    c.logs.push({ t: now(), act: '撤回申请', uid: db.currentUserId });
    commit();
  }
  function lfSupplement(claimId, { tz, sjdd, tps }) {
    const c = db.lfClaims.find(x => x.id === claimId);
    if (!c || c.sqrid !== db.currentUserId) throw new Error('申请不存在');
    if (c.zt !== 'more') throw new Error('当前申请无需补充材料');
    if (!(tz || '').trim()) throw new Error('请填写补充说明');
    Object.assign(c, { tz: tz.trim(), sjdd: (sjdd || c.sjdd).trim(), tps: tps || c.tps, zt: 'pending', gxsj: now() });
    c.logs.push({ t: now(), act: '补充材料', uid: db.currentUserId });
    const it = lfRaw(c.itemId);
    lfReviewers(it).forEach(u => notify(u, 'lost', '认领人已补充材料：' + it.mc, undefined, it.id));
    commit();
  }
  // result: pass 通过 | reject 未通过 | more 要求补充
  function lfReview(claimId, result, note) {
    const c = db.lfClaims.find(x => x.id === claimId);
    const it = lfRaw(c.itemId);
    if (!lfCanReview(it)) throw new Error('没有核对该申请的权限');
    note = (note || '').trim();
    if (result === 'more' && !note) throw new Error('请填写需要补充的材料');
    if (result === 'reject' && !note) throw new Error('请填写未通过原因');
    c.zt = result;
    c.clr = db.currentUserId;
    c.gxsj = now();
    if (result === 'more') c.bcyq = note;
    else c.jl = note || (result === 'pass' ? '特征与登记信息一致' : '');
    c.logs.push({ t: now(), act: { pass: '核对通过', reject: '核对未通过', more: '要求补充材料' }[result], uid: db.currentUserId, note });
    if (result === 'pass' && it.zt === 'pending') { it.zt = 'checking'; lfLog(it, '进入核对', '认领申请核对通过'); }
    if (result !== 'pass' && it.zt === 'checking' && !db.lfClaims.some(x => x.itemId === it.id && x.zt === 'pass')) { it.zt = 'pending'; lfLog(it, '恢复待认领'); }
    const msg = { pass: `你认领的「${it.mc}」已核对通过，请留意交接安排`, reject: `你认领的「${it.mc}」未通过核对：${note}`, more: `你认领的「${it.mc}」需要补充材料：${note}` }[result];
    notify(c.sqrid, 'lost', msg, undefined, it.id);
    commit();
  }
  // 安排交接：把地点、时间、联系方式通过私信发给认领人，返回认领人 id 便于跳转会话
  function lfHandover(claimId, { dd, sj, lxfs }) {
    const c = db.lfClaims.find(x => x.id === claimId);
    const it = lfRaw(c.itemId);
    if (!lfCanReview(it)) throw new Error('没有安排交接的权限');
    if (c.zt !== 'pass') throw new Error('申请核对通过后才能安排交接');
    if (!(dd || '').trim()) throw new Error('请填写交接地点');
    if (!(sj || '').trim()) throw new Error('请填写交接时间');
    c.jj = { dd: dd.trim(), sj: sj.trim(), lxfs: (lxfs || '').trim(), t: now() };
    c.logs.push({ t: now(), act: '安排交接', uid: db.currentUserId, note: `${c.jj.dd} · ${c.jj.sj}` });
    const nr = `【失物招领】你认领的「${it.mc}」已核对通过，请按以下安排领取：\n地点：${c.jj.dd}\n时间：${c.jj.sj}` + (c.jj.lxfs ? `\n联系：${c.jj.lxfs}` : '') + '\n领取时请携带校园卡或有效证件。';
    db.messages.push({ id: uid('sx_'), fsrid: db.currentUserId, jsrid: c.sqrid, nr, cjsj: now(), sfyd: '0' });
    commit();
    return c.sqrid;
  }
  const lfFinish = (claimId, note) => lfReturn([db.lfClaims.find(x => x.id === claimId).itemId], { claimId, note });
  function lfClaimView(c) {
    return Object.assign({}, c, { item: lfGet(c.itemId), sqr: user(c.sqrid), clrUser: user(c.clr), ztLabel: LF_CLAIM_ZT[c.zt].label, tone: LF_CLAIM_ZT[c.zt].tone });
  }
  const lfClaimGet = id => { const c = db.lfClaims.find(x => x.id === id); return c ? lfClaimView(c) : null; };
  function lfClaimsOf(itemId) {
    const it = lfRaw(itemId);
    if (!it || !lfCanReview(it)) return [];
    return db.lfClaims.filter(c => c.itemId === itemId).sort((a, b) => b.cjsj - a.cjsj).map(lfClaimView);
  }
  function lfMyClaims(tab = 'ongoing') {
    const set = tab === 'ongoing' ? ['pending', 'more', 'pass'] : ['reject', 'done', 'cancel'];
    return db.lfClaims.filter(c => c.sqrid === db.currentUserId && set.includes(c.zt)).sort((a, b) => b.gxsj - a.gxsj).map(lfClaimView);
  }
  // 待处理的认领：team=true 只看团队保管的物品
  function lfReviewQueue({ team = false, zt = '' } = {}) {
    return db.lfClaims.filter(c => {
      const it = lfRaw(c.itemId);
      if (!it || !lfCanReview(it)) return false;
      if (team && it.bgfs !== 'point') return false;
      return zt ? c.zt === zt : ['pending', 'more', 'pass'].includes(c.zt);
    }).sort((a, b) => b.cjsj - a.cjsj).map(lfClaimView);
  }
  const lfMyItems = (lx = '') => db.lfItems.filter(it => it.fbrid === db.currentUserId && it.ly === 'student' && (!lx || it.lx === lx)).sort((a, b) => b.fbsj - a.fbsj).map(lfView);
  function lfAddClue(itemId, data, tps) {
    assertActive();
    const it = lfRaw(itemId);
    if (!it || it.lx !== 'lost') throw new Error('寻物信息不存在');
    if (it.zt !== 'seeking') throw new Error('这条寻物已结束，不能再提供线索');
    if (it.fbrid === db.currentUserId) throw new Error('不能给自己的寻物提供线索');
    const o = data && typeof data === 'object' ? data : { nr: data, tps };
    const dd = (o.dd || '').trim();
    const sj = (o.sj || '').trim();
    const nr = (o.nr || '').trim();
    const imgs = (o.tps || tps || []).slice(0, 3);
    if (!dd && !sj && !nr) throw new Error('请填写线索内容');
    db.lfClues.push({ id: uid('xs_'), itemId, uid: db.currentUserId, dd, sj, nr, tps: imgs, cjsj: now() });
    const bits = [dd && `看到的地点：${dd}`, sj && `看到的时间：${sj}`, nr].filter(Boolean).join('；');
    db.messages.push({ id: uid('sx_'), fsrid: db.currentUserId, jsrid: it.fbrid, nr: `【失物线索】关于你的「${it.mc}」：${bits}`, cjsj: now(), sfyd: '0' });
    notify(it.fbrid, 'lost', `有同学为你的寻物「${it.mc}」提供了线索`, undefined, itemId);
    commit();
  }
  const lfClues = itemId => db.lfClues.filter(c => c.itemId === itemId).sort((a, b) => b.cjsj - a.cjsj).map(c => Object.assign({}, c, { u: user(c.uid) }));
  function lfStation() {
    const today = startOfDay(now());
    return {
      todayNew: db.lfItems.filter(it => it.lx === 'found' && it.zt !== 'withdrawn' && it.fbsj >= today).length,
      pending: db.lfItems.filter(it => it.lx === 'found' && it.zt === 'pending' && !lfExpired(it)).length,
      seeking: db.lfItems.filter(it => it.lx === 'lost' && it.zt === 'seeking').length
    };
  }
  function lfStats() {
    const today = startOfDay(now());
    const scope = db.lfItems.filter(it => it.lx === 'found' && (lfIsSuper() || lfRoles().includes('admin') || (it.bgdid && lfMyPoints().some(p => p.id === it.bgdid))));
    return {
      pending: scope.filter(it => it.zt === 'pending' && !lfExpired(it)).length,
      todayNew: scope.filter(it => it.fbsj >= today).length,
      claims: lfReviewQueue({ team: true, zt: 'pending' }).length,
      todayReturned: scope.filter(it => it.zt === 'returned' && it.gxsj >= today).length,
      idle: scope.filter(lfLongIdle).length
    };
  }
  function lfAdminItems(f = {}) {
    let list = db.lfItems.filter(it => it.lx === 'found' && (lfIsSuper() || lfRoles().includes('admin') || it.ly === 'team' || it.bgfs === 'point'));
    if (!lfIsSuper() && !lfRoles().includes('admin')) { const ids = lfMyPoints().map(p => p.id); list = list.filter(it => ids.includes(it.bgdid)); }
    if (f.kw) list = list.filter(it => (it.bh + it.mc + it.dd + (it.card ? it.card.xm + it.card.xh : '')).includes(f.kw.trim()));
    if (f.xq) list = list.filter(it => it.xq === f.xq);
    if (f.fl) list = list.filter(it => it.fl === f.fl);
    if (f.bgdid) list = list.filter(it => it.bgdid === f.bgdid);
    if (f.zt) list = list.filter(it => f.zt === 'idle' ? lfLongIdle(it) : lfZt(it) === f.zt);
    if (f.start) list = list.filter(it => it.fbsj >= f.start);
    if (f.end) list = list.filter(it => it.fbsj <= f.end);
    return list.map(lfView).sort((a, b) => b.fbsj - a.fbsj);
  }
  /* 每日汇总：当天团队登记和学生自主登记的招领，人工确认后发布 */
  const lfDayItems = day => db.lfItems.filter(it => it.lx === 'found' && it.zt !== 'withdrawn' && it.fbsj >= day && it.fbsj < day + DAY);
  function lfDigestView(d) {
    if (!d) return null;
    const items = d.itemIds.map(lfGet).filter(Boolean);
    const groups = {};
    items.forEach(it => { groups[it.xq] = (groups[it.xq] || 0) + 1; });
    const fls = {};
    items.forEach(it => { fls[it.flLabel] = (fls[it.flLabel] || 0) + 1; });
    return Object.assign({}, d, {
      items, total: items.length, groups: Object.entries(groups).map(([xq, n]) => ({ xq, n })), fls: Object.entries(fls).map(([label, n]) => ({ label, n })),
      qrrUser: user(d.qrr), ztLabel: d.zt === 'published' ? '已发布' : '待确认', isToday: d.rq === startOfDay(now())
    });
  }
  function lfDigestGenerate(day = startOfDay(now()), { silent } = {}) {
    if (!lfCan('register')) throw new Error('没有生成汇总的权限');
    const itemIds = lfDayItems(day).map(it => it.id);
    let d = db.lfDigests.find(x => x.rq === day);
    if (d) Object.assign(d, { itemIds, zt: 'draft', scr: db.currentUserId, cjsj: now() });
    else { d = { id: uid('hz_'), rq: day, itemIds, zt: 'draft', scr: db.currentUserId, qrr: '', qrsj: 0, cjsj: now() }; db.lfDigests.push(d); }
    if (!silent) commit();
    return d;
  }
  function lfDigestPublish(id) {
    if (!lfCan('register')) throw new Error('没有发布汇总的权限');
    const d = db.lfDigests.find(x => x.id === id);
    if (!d.itemIds.length) throw new Error('当天没有登记的物品，无需发布');
    Object.assign(d, { zt: 'published', qrr: db.currentUserId, qrsj: now() });
    commit();
  }
  const lfDigestGet = id => lfDigestView(db.lfDigests.find(x => x.id === id));
  const lfDigests = ({ published = true } = {}) => db.lfDigests.filter(d => !published || d.zt === 'published').sort((a, b) => b.rq - a.rq).map(lfDigestView);
  const lfTodayDigest = () => lfDigestView(db.lfDigests.find(d => d.rq === startOfDay(now()) && d.zt === 'published'));
  /* 批量登记：每行一张校园卡，按学院、学号、姓名、校区识别（也兼容其他顺序） */
  function lfParseCards(text, def = {}) {
    return (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).map(line => {
      const r = { line, xm: '', xh: '', xy: '', xq: def.xq || '', ok: true, err: '' };
      line.split(/[\s,，、;；|\t]+/).filter(Boolean).forEach(p => {
        if (/^\d{6,}$/.test(p)) r.xh = p;
        else if (LF_XQ.includes(p) || LF_XQ_ALIAS[p]) r.xq = LF_XQ.includes(p) ? p : LF_XQ_ALIAS[p];
        else if (/(学院|系|研究院|书院)$/.test(p)) r.xy = p;
        else if (/^[\u4e00-\u9fa5·]{2,5}$/.test(p) && !r.xm) r.xm = p;
      });
      if (!r.xm) { r.ok = false; r.err = '未识别到姓名'; }
      else if (!r.xq) { r.ok = false; r.err = '未识别到校区'; }
      return r;
    });
  }
  // rows: 校园卡 {xm,xh,xy,xq} 或其他物品 {fl,mc,xq,dd,nr,tps}；def: {bgdid, dd, sj}
  function lfBatchCreate(rows, def = {}) {
    if (!lfCan('register', def.bgdid ? { bgdid: def.bgdid } : null)) throw new Error('当前账号没有该服务点的登记权限');
    if (!def.bgdid) throw new Error('请选择保管服务点');
    rows = rows.filter(r => r.ok !== false);
    if (!rows.length) throw new Error('没有可登记的记录');
    rows.forEach((r, i) => {
      if (r.fl && r.fl !== 'campuscard') {
        if (!(r.mc || '').trim()) throw new Error(`第 ${i + 1} 行请填写物品名称`);
        lfCreate({ ly: 'team', lx: 'found', fl: r.fl, mc: r.mc, xq: r.xq || def.xq, dd: r.dd || def.dd, sj: def.sj, nr: r.nr, tps: r.tps || [], bgdid: def.bgdid }, { silent: true });
      } else {
        lfCreate({
          ly: 'team', lx: 'found', fl: 'campuscard', mc: '校园卡 · ' + maskName(r.xm), xq: r.xq || def.xq, dd: r.dd || def.dd, sj: def.sj,
          nr: r.xy || '', tps: [], bgdid: def.bgdid, card: { xm: r.xm, xh: r.xh || '', xy: r.xy || '' }
        }, { silent: true });
      }
    });
    lfDigestGenerate(startOfDay(now()), { silent: true });
    commit();
    return rows.length;
  }
  const lfCanEditPoint = id => lfCan('admin') || lfCan('register', { bgdid: id });
  function lfUpdatePointSchedule(id, { dz, zbap, lxfs, lstz }) {
    const p = lfPoint(id);
    if (!p) throw new Error('服务点不存在');
    if (!lfCanEditPoint(id)) throw new Error('只有负责该服务点的管理人员可以修正时间和地点');
    if (!(zbap || '').trim()) throw new Error('请填写值班安排');
    Object.assign(p, { dz: (dz || '').trim(), zbap: zbap.trim(), lxfs: (lxfs != null ? String(lxfs) : p.lxfs).trim(), lstz: (lstz || '').trim() });
    commit();
  }
  /* 服务点与成员 */
  const lfPoints = () => db.lfPoints.slice().sort((a, b) => a.px - b.px).map(p => Object.assign({}, p, {
    fzrUser: user(p.fzr), items: db.lfItems.filter(it => it.bgdid === p.id && ['pending', 'checking'].includes(lfZt(it))).length
  }));
  function lfSavePoint(p) {
    if (!lfCan('admin')) throw new Error('只有管理员可以配置服务点');
    if (!(p.mc || '').trim()) throw new Error('请填写服务点名称');
    if (!(p.zbap || '').trim()) throw new Error('请填写值班安排');
    if (p.id) Object.assign(lfPoint(p.id), p, { px: +p.px || 0 });
    else db.lfPoints.push(Object.assign({ id: uid('lp_'), dz: '', lxfs: '站内私信', lstz: '', fzr: '' }, p, { px: +p.px || db.lfPoints.length + 1 }));
    commit();
  }
  function lfDeletePoint(id) {
    if (!lfCan('admin')) throw new Error('只有管理员可以配置服务点');
    if (db.lfItems.some(it => it.bgdid === id && ['pending', 'checking'].includes(lfZt(it)))) throw new Error('该服务点仍有待认领物品，请先变更保管点');
    db.lfPoints = db.lfPoints.filter(p => p.id !== id);
    db.lfMembers.forEach(m => { m.points = m.points.filter(x => x !== id); });
    commit();
  }
  const lfMembers = () => db.lfMembers.map(m => Object.assign({}, m, {
    u: user(m.uid), roleLabels: m.roles.map(r => LF_ROLES[r].label), pointNames: m.roles.includes('admin') ? ['全部服务点'] : m.points.map(id => (lfPoint(id) || {}).mc).filter(Boolean)
  })).sort((a, b) => a.cjsj - b.cjsj);
  function lfSaveMember({ uid: id, roles, points }) {
    if (!lfCan('admin')) throw new Error('只有管理员可以管理成员');
    const u = user(id);
    if (!u) throw new Error('未找到该用户，请检查学号');
    if (u.role === 'admin') throw new Error('超级管理员无需添加');
    if (!roles || !roles.length) throw new Error('请至少选择一个角色');
    const old = lfMember(id);
    if (!lfIsSuper() && (roles.includes('admin') || (old && old.roles.includes('admin')))) throw new Error('只有超级管理员可以设置管理员');
    if (!roles.includes('admin') && (!points || !points.length)) throw new Error('请选择负责的服务点');
    if (old) Object.assign(old, { roles, points: points || [] });
    else db.lfMembers.push({ uid: id, roles, points: points || [], cjsj: now() });
    commit();
  }
  function lfRemoveMember(id) {
    if (!lfCan('admin')) throw new Error('只有管理员可以管理成员');
    const m = lfMember(id);
    if (m && m.roles.includes('admin') && !lfIsSuper()) throw new Error('只有超级管理员可以移除管理员');
    db.lfMembers = db.lfMembers.filter(x => x.uid !== id);
    commit();
  }
  const findUser = kw => { kw = (kw || '').trim(); return kw ? db.users.find(u => u.xh === kw || u.xm === kw || u.nc === kw) : null; };

  function setCurrentUser(id) { db.currentUserId = id; commit(); }
  function reset() { db = seed(); commit(); }
  const DEMO_USERS = [
    { id: 'u_admin', label: '学工系统管理员（超级管理员）' },
    { id: 'u_hq', label: '后勤服务中心（部门认证账号）' },
    { id: 'u101', label: '学生 · 橘子洲的风' },
    { id: 'u103', label: '学生 · 陈语桐（小麓同学）' },
    { id: 'u121', label: '学生 · 未完善资料（首次使用）' },
    { id: 'u113', label: '学生 · 已封禁账号' },
    { id: 'u_zz1', label: '资助团队 · 登记 + 核对成员' },
    { id: 'u_zz2', label: '资助团队 · 登记成员（潇湘校区）' }
  ];

  window.Store = {
    LX, LX_MAP, REPORT_TYPES, BAN_REASONS, BAN_DURATIONS, ZTBQ, RISK_LEVELS, RISK_WORDS, DEMO_USERS,
    get db() { return db; }, load, reset, commit, me, user, dept, topicByCode, isBanned, setCurrentUser,
    listPosts, getPost, viewPost, hotTop5, weekDeptRank, createPost, updatePost, deletePost, toggleTop, togglePostLike,
    commentsTree, addComment, deleteComment, toggleCommentLike,
    castVote, closeVote, myVotes, unseenVotes, voteDetail, markVoteSeen, voteCsv, voteRemainText, isVoteEnded,
    myStats, myPosts, myCommentedPosts, updateProfile, randomNick,
    drafts, getDraft, saveDraft, deleteDraft, sessions, chat, sendMessage,
    notices, unreadNotices, markNoticesRead, report, myReports, postReports, handleReports,
    dashboard, adminPosts, adminUsers, banUser, unbanUser, certifyUser, saveDept, deleteDept, managedDepts,
    adminTopics, saveTopic, deleteTopic, activeTopics, riskPosts, interventions, saveIntervention, deleteIntervention, externalSentiment,
    LF_XQ, LF_FL, LF_FL_MAP, LF_ZT, LF_CLAIM_ZT, LF_ROLES, LF_DAYS,
    lfRoles, lfIsTeam, lfIsSuper, lfCan, lfMyPoints, lfMember, lfPoint, lfList, lfGet, lfCreate, lfUpdate, lfTransfer, lfWithdraw, lfMarkFound,
    lfReturn, lfClaim, lfUpdateClaim, lfCancelClaim, lfSupplement, lfReview, lfHandover, lfFinish, lfClaimGet, lfClaimsOf, lfMyClaims, lfReviewQueue, lfMyItems,
    lfAddClue, lfClues, lfStation, lfStats, lfAdminItems, lfDayItems, lfDigestGenerate, lfDigestPublish, lfDigestGet, lfDigests, lfTodayDigest,
    lfParseCards, lfBatchCreate, lfPoints, lfCanEditPoint, lfUpdatePointSchedule, lfSavePoint, lfDeletePoint, lfMembers, lfSaveMember, lfRemoveMember, findUser, maskName, maskNo,
    fmtDate, fmtDateTime, relTime, pmListTime, startOfDay, DAY, HOUR
  };
})();
