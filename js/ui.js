/* 中南点点原型 · 公共 UI 工具（PC / H5 共用，样式由各端 css 决定） */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const PH_COLORS = [['#cfe6f5', '#8cc4ea'], ['#e5fcf5', '#7fd8b8'], ['#fff2e5', '#f5c27e'], ['#fff0f5', '#f3a5b6'], ['#ede8ff', '#b7a6f5'], ['#e3f1f9', '#6aa9d6'], ['#f6fcff', '#9ccbe8'], ['#fdf1e1', '#e9b06b'], ['#eaf3ff', '#7aa7ef']];
  function placeholder(seed, label) {
    const [a, b] = PH_COLORS[seed % PH_COLORS.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round" opacity=".85"><rect x="150" y="100" width="100" height="80" rx="10"/><path d="M150 165l28-26 22 20 16-14 34 30"/></g><circle cx="225" cy="122" r="9" fill="#fff" opacity=".85"/><text x="200" y="230" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="26" fill="#fff" text-anchor="middle">${esc(label || '示例图片')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function imgSrc(t) {
    if (!t) return '';
    if (t.startsWith('ph:')) { const [, n, label] = t.split(':'); return placeholder(+n, label); }
    return t;
  }
  function avatar(u, cls = '') {
    u = u || {};
    const tx = u.tx || u.fbrtx || u.peerTx || '';
    const name = u.nc || u.fbrnc || u.peerNc || '用';
    if (tx.startsWith('color:')) {
      return `<span class="avatar avatar--txt ${cls}" style="background:${tx.slice(6)}">${esc(name.slice(0, 1))}</span>`;
    }
    return `<span class="avatar ${cls}"><img src="${esc(tx || 'assets/h5/default-avatar.png')}" alt=""></span>`;
  }

  /* toast */
  let toastBox;
  function toast(msg, type = 'info', ms = 2200) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'ui-toast-box'; document.body.appendChild(toastBox); }
    const el = document.createElement('div');
    el.className = `ui-toast ui-toast--${type}`;
    el.innerHTML = `<i class="ui-toast__ico"></i><span>${esc(msg)}</span>`;
    toastBox.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, ms);
  }
  window.addEventListener('zndd:error', e => toast(e.detail, 'error'));

  /* 重新渲染容器，保留 data-keep 输入值、data-keep-scroll 滚动位置与焦点 */
  function patch(el, html) {
    const keep = {}, scroll = {};
    $$('[data-keep]', el).forEach(i => { keep[i.dataset.keep] = i.value; });
    $$('[data-keep-scroll]', el).forEach(i => { scroll[i.dataset.keepScroll] = i.scrollTop; });
    const a = document.activeElement;
    const focusKey = a && el.contains(a) && a.dataset ? a.dataset.keep : null;
    const sel = focusKey && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
    const rootScroll = el.scrollTop;
    el.innerHTML = html;
    $$('[data-keep]', el).forEach(i => { if (keep[i.dataset.keep] != null && i.type !== 'file') i.value = keep[i.dataset.keep]; });
    $$('[data-keep-scroll]', el).forEach(i => { if (scroll[i.dataset.keepScroll] != null) i.scrollTop = scroll[i.dataset.keepScroll]; });
    el.scrollTop = rootScroll;
    if (focusKey) {
      const f = el.querySelector(`[data-keep="${focusKey}"]`);
      if (f) { f.focus(); if (sel) try { f.setSelectionRange(sel[0], sel[1]); } catch (e) { } }
    }
  }

  /* 浮层：dialog / drawer / sheet；render() 可重复调用以刷新内容 */
  const layers = [];
  function open({ kind = 'dialog', cls = '', width, title = '', render, onMount, onClose, on, state, closeOnMask = true, head = true }) {
    const wrap = document.createElement('div');
    wrap.className = `ui-layer ui-layer--${kind} ${cls}`;
    wrap.innerHTML = `<div class="ui-mask"></div><div class="ui-panel ui-${kind}" ${width ? `style="width:${width}"` : ''}>
      ${head ? `<div class="ui-${kind}__head"><div class="ui-${kind}__title">${title}</div><button class="ui-${kind}__close" data-close aria-label="关闭">${kind === 'drawer' ? '关闭' : '×'}</button></div>` : ''}
      <div class="ui-${kind}__body"></div></div>`;
    document.body.appendChild(wrap);
    const layer = {
      el: wrap, body: wrap.querySelector(`.ui-${kind}__body`), state: state || {},
      setTitle(t) { const h = wrap.querySelector(`.ui-${kind}__title`); if (h) h.innerHTML = t; },
      refresh() {
        if (layer.closed) return;
        patch(layer.body, render(layer));
        onMount && onMount(layer);
      },
      close() {
        if (layer.closed) return;
        layer.closed = true;
        const i = layers.indexOf(layer);
        if (i >= 0) layers.splice(i, 1);
        wrap.classList.remove('is-open');
        setTimeout(() => wrap.remove(), 250);
        onClose && onClose(layer);
      }
    };
    wrap.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || (closeOnMask && e.target.classList.contains('ui-mask'))) layer.close();
    });
    // on: { 'click [data-act]': (e, el, layer) => {} }，委托绑定一次，刷新后仍有效
    Object.entries(on || {}).forEach(([k, fn]) => {
      const i = k.indexOf(' ');
      const type = k.slice(0, i), sel = k.slice(i + 1);
      wrap.addEventListener(type, e => {
        const t = e.target.closest(sel);
        if (t && wrap.contains(t)) guard(fn)(e, t, layer);
      });
    });
    layers.push(layer);
    layer.refresh();
    requestAnimationFrame(() => wrap.classList.add('is-open'));
    return layer;
  }
  function refreshLayers() { layers.slice().forEach(l => l.refresh()); }
  function closeAll() { layers.slice().forEach(l => l.close()); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) layers[layers.length - 1].close(); });

  function confirm(msg, { title = '温馨提示', ok = '确定', cancel = '取消', danger = false } = {}) {
    return new Promise(resolve => {
      let done = false;
      const l = open({
        kind: 'dialog', cls: 'ui-confirm', title, width: '',
        render: () => `<div class="ui-confirm__msg"><i class="ui-confirm__ico"></i>${esc(msg)}</div>
          <div class="ui-confirm__foot"><button class="btn" data-close>${cancel}</button><button class="btn btn--primary ${danger ? 'btn--danger' : ''}" data-ok>${ok}</button></div>`,
        onMount: layer => { layer.body.querySelector('[data-ok]').onclick = () => { done = true; resolve(true); layer.close(); }; },
        onClose: () => { if (!done) resolve(false); }
      });
      return l;
    });
  }

  /* 图片选择 + 压缩（存 localStorage，控制体积） */
  function pickImages({ max = 9, existing = 0, maxMB = 10, accept = 'image/jpeg,image/png,image/gif' } = {}) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = accept; input.multiple = max - existing > 1;
      input.onchange = async () => {
        const files = [...input.files];
        if (files.length + existing > max) toast(`最多上传 ${max} 张图`, 'warning');
        const out = [];
        for (const f of files.slice(0, Math.max(0, max - existing))) {
          if (f.size > maxMB * 1024 * 1024) { toast(`单张图片不能超过 ${maxMB}MB`, 'warning'); continue; }
          out.push(await compress(f));
        }
        resolve(out);
      };
      input.click();
    });
  }
  function compress(file, maxSide = 960, q = 0.72) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', q));
        };
        img.onerror = () => resolve(r.result);
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function preview(src) {
    open({ kind: 'dialog', cls: 'ui-preview', head: false, render: () => `<img src="${esc(src)}" alt="" data-close>` });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
  }
  function fmtNum(n) { return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n); }
  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '';
    const [path, qs] = raw.split('?');
    return { path: path || '', query: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  function delegate(root, type, sel, fn) {
    root.addEventListener(type, e => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }
  function guard(fn) {
    return (...a) => { try { const r = fn(...a); if (r && r.catch) r.catch(err => toast(err.message, 'error')); return r; } catch (err) { toast(err.message, 'error'); } };
  }

  window.UI = { esc, $, $$, patch, placeholder, imgSrc, avatar, toast, open, refreshLayers, closeAll, confirm, pickImages, preview, copy, fmtNum, parseHash, delegate, guard, get layers() { return layers; } };
})();
