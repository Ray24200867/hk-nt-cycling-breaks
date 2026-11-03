/* 家寶集 · cycling story — map, estate lookup and table */
(function () {
  'use strict';

  var data = window.MAP_DATA;
  if (!data) return;

  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('map');
  var wrap = document.getElementById('map-wrap');
  var viewport = document.getElementById('map-viewport');
  var tooltip = document.getElementById('map-tooltip');
  var detail = document.getElementById('map-detail');
  var W = data.width;
  var H = data.height;
  var fmt = new Intl.NumberFormat('en-HK');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  var districtGroup = document.getElementById('layer-districts');
  data.districts.forEach(function (d) {
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d.d);
    path.setAttribute('class', 'map-district' + (d.r === 'New Territories' ? '' : ' map-district--other'));
    path.setAttribute('fill-rule', 'evenodd');
    districtGroup.appendChild(path);
  });

  document.getElementById('layer-tracks').setAttribute('d', data.tracks);
  document.getElementById('layer-connections').setAttribute('d', data.connections);

  /* ---------------------------------------------------------- markers */

  var parkingGroup = document.getElementById('layer-parking');
  var estateGroup = document.getElementById('layer-estates');
  var railGroup = document.getElementById('layer-rail');
  var labelGroup = document.getElementById('layer-labels');
  var circlesByName = new Map();

  var parkingEls = [];
  var parkingFrag = document.createDocumentFragment();
  data.parking.forEach(function (p) {
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', 2.2);
    c.setAttribute('class', 'map-parking');
    c.dataset.kind = 'parking';
    c.dataset.s = p.s;
    parkingFrag.appendChild(c);
    parkingEls.push(c);
  });
  parkingGroup.appendChild(parkingFrag);

  var estateEls = [];
  var estateFrag = document.createDocumentFragment();
  data.estates.forEach(function (e, i) {
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', e.x);
    c.setAttribute('cy', e.y);
    c.setAttribute('r', e.m <= 500 ? 5.1 : 5.7);
    c.setAttribute('class', 'map-estate' + (e.m <= 500 ? '' : ' map-estate--none'));
    c.dataset.kind = 'estate';
    c.dataset.i = i;
    c.dataset.name = e.n;
    c.dataset.r = e.m <= 500 ? 5.1 : 5.7;
    estateFrag.appendChild(c);
    estateEls.push(c);
    circlesByName.set(e.n, c);
  });
  estateGroup.appendChild(estateFrag);

  var railEls = [];
  var railFrag = document.createDocumentFragment();
  data.rail.forEach(function (r, i) {
    var s = document.createElementNS(NS, 'rect');
    s.setAttribute('x', r.x - 3.2);
    s.setAttribute('y', r.y - 3.2);
    s.setAttribute('width', 6.4);
    s.setAttribute('height', 6.4);
    s.setAttribute('class', 'map-rail');
    s.dataset.kind = 'rail';
    s.dataset.i = i;
    s.dataset.x = r.x;
    s.dataset.y = r.y;
    railFrag.appendChild(s);
    railEls.push(s);
  });
  railGroup.appendChild(railFrag);

  var labelEls = [];
  var labelFrag = document.createDocumentFragment();
  data.labels.forEach(function (l) {
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', l.x);
    t.setAttribute('y', l.y);
    t.setAttribute('class', 'map-label');
    t.textContent = l.n;
    labelFrag.appendChild(t);
    labelEls.push(t);
  });
  data.contextLabels.forEach(function (l) {
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', l.x);
    t.setAttribute('y', l.y);
    t.setAttribute('class', 'map-label map-label--context');
    t.textContent = l.n;
    labelFrag.appendChild(t);
    labelEls.push(t);
  });
  labelGroup.appendChild(labelFrag);

  /* ---------------------------------------------------------- tooltip */

  function tipHtml(el) {
    if (el.dataset.kind === 'parking') {
      return '此處泊位 <strong>' + fmt.format(+el.dataset.s) + '</strong> 個';
    }
    if (el.dataset.kind === 'estate') {
      var e = data.estates[+el.dataset.i];
      var line = e.m <= 500
        ? '最近泊位 ' + fmt.format(e.m) + ' 米'
        : '<strong>500米內無泊位</strong>，最近 ' + fmt.format(e.m) + ' 米';
      return e.n + '（' + e.d + '）<br>' + line;
    }
    if (el.dataset.kind === 'rail') {
      var r = data.rail[+el.dataset.i];
      return (r.k === 'MTR' ? '港鐵' : '輕鐵') + r.n + '<br>' + r.e + ' 個出口';
    }
    return '';
  }

  function placeTooltip(ev) {
    var box = wrap.getBoundingClientRect();
    var x = ev.clientX - box.left;
    var y = ev.clientY - box.top;
    x = Math.max(110, Math.min(box.width - 110, x));
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  svg.addEventListener('pointerover', function (ev) {
    if (ev.pointerType !== 'mouse') return;
    var t = ev.target;
    if (!t.dataset || !t.dataset.kind) return;
    tooltip.innerHTML = tipHtml(t);
    tooltip.hidden = false;
    placeTooltip(ev);
  });

  svg.addEventListener('pointermove', function (ev) {
    if (tooltip.hidden) return;
    placeTooltip(ev);
  });

  svg.addEventListener('pointerout', function (ev) {
    if (!ev.target.dataset || !ev.target.dataset.kind) return;
    tooltip.hidden = true;
  });

  /* ---------------------------------------------------------- zoom / pan */

  var k = 1;
  var tx = 0;
  var ty = 0;
  var justDragged = false;
  var pxToUnit = 1;
  var lastK = null;

  function measureMap() {
    var rect = svg.getBoundingClientRect();
    pxToUnit = rect.width ? W / rect.width : 1;
    lastK = null;
  }

  function sizeMarkers() {
    var inv = pxToUnit / k;
    parkingEls.forEach(function (c) {
      c.setAttribute('r', (2.2 * inv).toFixed(2));
    });
    estateEls.forEach(function (c) {
      c.setAttribute('r', (+c.dataset.r * inv).toFixed(2));
    });
    railEls.forEach(function (r) {
      var half = 3.2 * inv;
      r.setAttribute('x', (+r.dataset.x - half).toFixed(2));
      r.setAttribute('y', (+r.dataset.y - half).toFixed(2));
      r.setAttribute('width', (half * 2).toFixed(2));
      r.setAttribute('height', (half * 2).toFixed(2));
    });
    labelEls.forEach(function (t) {
      t.style.fontSize = (12.5 * inv).toFixed(2) + 'px';
    });
  }

  function clampView() {
    var minX = W * 0.12 - W * k;
    var maxX = W * 0.88;
    var minY = H * 0.12 - H * k;
    var maxY = H * 0.88;
    tx = Math.max(minX, Math.min(maxX, tx));
    ty = Math.max(minY, Math.min(maxY, ty));
  }

  function updateScale() {
    var kmPerPx = data.kmPerPx / k;
    var nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    var best = nice[0];
    var bestDiff = Infinity;
    nice.forEach(function (km) {
      var len = km / kmPerPx;
      if (len >= 55 && len <= 190) {
        var diff = Math.abs(len - 110);
        if (diff < bestDiff) { best = km; bestDiff = diff; }
      }
    });
    var len = best / kmPerPx;
    var x = 18;
    var y = H - 14;
    document.getElementById('scale-line').setAttribute('x1', x);
    document.getElementById('scale-line').setAttribute('x2', x + len);
    document.getElementById('scale-line').setAttribute('y1', y);
    document.getElementById('scale-line').setAttribute('y2', y);
    document.getElementById('scale-tick1').setAttribute('x1', x);
    document.getElementById('scale-tick1').setAttribute('x2', x);
    document.getElementById('scale-tick1').setAttribute('y1', y);
    document.getElementById('scale-tick1').setAttribute('y2', y - 7);
    document.getElementById('scale-tick2').setAttribute('x1', x + len);
    document.getElementById('scale-tick2').setAttribute('x2', x + len);
    document.getElementById('scale-tick2').setAttribute('y1', y);
    document.getElementById('scale-tick2').setAttribute('y2', y - 7);
    var text = document.getElementById('scale-text');
    text.setAttribute('x', x + 6);
    text.setAttribute('y', y - 9);
    text.textContent = best < 1 ? Math.round(best * 1000) + '米' : best + '公里';
  }

  function apply() {
    clampView();
    viewport.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + k + ')');
    svg.classList.toggle('is-zoomed', k > 2.5);
    if (k !== lastK) {
      sizeMarkers();
      lastK = k;
    }
    updateScale();
  }

  function setView(nk, ntx, nty) {
    k = Math.max(1, Math.min(14, nk));
    tx = ntx;
    ty = nty;
    apply();
  }

  function svgPoint(ev) {
    var pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function zoomAt(px, py, factor) {
    var nk = Math.max(1, Math.min(14, k * factor));
    var ratio = nk / k;
    setView(nk, px - (px - tx) * ratio, py - (py - ty) * ratio);
  }

  var drag = null;

  svg.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    var p = svgPoint(ev);
    drag = { sx: p.x, sy: p.y, tx: tx, ty: ty, moved: false, id: ev.pointerId };
  });

  window.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var p = svgPoint(ev);
    var dx = p.x - drag.sx;
    var dy = p.y - drag.sy;
    if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 3) {
      drag.moved = true;
      svg.classList.add('is-dragging');
    }
    if (drag.moved) {
      setView(k, drag.tx + dx, drag.ty + dy);
      ev.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('pointerup', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var moved = drag.moved;
    drag = null;
    svg.classList.remove('is-dragging');
    if (moved) {
      justDragged = true;
      window.setTimeout(function () { justDragged = false; }, 0);
    }
  });

  window.addEventListener('pointercancel', function () {
    drag = null;
    svg.classList.remove('is-dragging');
  });

  svg.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var p = svgPoint(ev);
    zoomAt(p.x, p.y, ev.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener('dblclick', function (ev) {
    var p = svgPoint(ev);
    zoomAt(p.x, p.y, 1.6);
  });

  document.getElementById('zoom-in').addEventListener('click', function () {
    zoomAt(W / 2, H / 2, 1.35);
  });

  document.getElementById('zoom-out').addEventListener('click', function () {
    zoomAt(W / 2, H / 2, 0.74);
  });

  document.getElementById('zoom-reset').addEventListener('click', function () {
    setView(1, 0, 0);
    document.getElementById('district-select').value = 'all';
  });

  /* ---------------------------------------------------------- district focus */

  function focusDistrict(name) {
    if (name === 'all') {
      setView(1, 0, 0);
      return;
    }
    var pts = data.estates.filter(function (e) { return e.d === name; });
    if (!pts.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function (e) {
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x);
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
    });
    data.labels.forEach(function (l) {
      if (l.n === name) {
        minX = Math.min(minX, l.x);
        maxX = Math.max(maxX, l.x);
        minY = Math.min(minY, l.y);
        maxY = Math.max(maxY, l.y);
      }
    });
    var bw = Math.max(40, maxX - minX);
    var bh = Math.max(40, maxY - minY);
    var pad = 70;
    var nk = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
    nk = Math.max(1, Math.min(5, nk));
    setView(nk, W / 2 - ((minX + maxX) / 2) * nk, H / 2 - ((minY + maxY) / 2) * nk);
  }

  document.getElementById('district-select').addEventListener('change', function (ev) {
    focusDistrict(ev.target.value);
  });

  /* ---------------------------------------------------------- detail panel */

  function statusText(e) {
    var covered = e.m <= 500;
    var track = e.t <= 500;
    if (covered && track) return '500米內有公共泊位，也有單車徑。';
    if (covered && !track) return '500米內有泊位，但最近的單車徑在' + fmt.format(e.t) + '米外。';
    if (!covered && track) return '500米內有單車徑，但沒有公共泊位；最近泊位在<strong>' + fmt.format(e.m) + '米</strong>外。';
    return '500米內既沒有公共泊位，也沒有單車徑。';
  }

  function renderDetail(e) {
    detail.innerHTML =
      '<div class="map-detail__head"><h3>' + e.n + '</h3><p>' + e.d + '</p></div>' +
      '<dl>' +
        '<div><dt>最近公共泊位</dt><dd>' + fmt.format(e.m) + '米</dd></div>' +
        '<div><dt>500米內泊位地點</dt><dd>' + e.s + '個</dd></div>' +
        '<div><dt>500米內泊位數目</dt><dd>' + fmt.format(e.c) + '個</dd></div>' +
        '<div><dt>最近單車徑</dt><dd>' + fmt.format(e.t) + '米</dd></div>' +
      '</dl>' +
      '<p class="map-detail__status">' + statusText(e) + '</p>';
  }

  function highlight(name) {
    circlesByName.forEach(function (c) { c.classList.remove('is-selected'); });
    var c = circlesByName.get(name);
    if (c) c.classList.add('is-selected');
  }

  function focusEstate(name) {
    var e = data.estates.find(function (x) { return x.n === name; });
    if (!e) return;
    var nk = 6;
    setView(nk, W / 2 - e.x * nk, H / 2 - e.y * nk);
    renderDetail(e);
    highlight(e.n);
    var fig = document.getElementById('map-figure');
    fig.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  estateGroup.addEventListener('click', function (ev) {
    if (justDragged) return;
    var c = ev.target.closest ? ev.target.closest('.map-estate') : null;
    if (!c) return;
    var e = data.estates[+c.dataset.i];
    renderDetail(e);
    highlight(e.n);
    if (window.innerWidth < 760) {
      detail.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  });

  /* ---------------------------------------------------------- layers */

  document.querySelectorAll('[data-layer]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var el = document.getElementById('layer-' + cb.dataset.layer);
      if (!el) return;
      el.style.display = cb.checked ? '' : 'none';
    });
  });
  document.getElementById('layer-connections').style.display = 'none';

  /* ---------------------------------------------------------- table */

  var tbody = document.getElementById('table-body');
  var countEl = document.getElementById('table-count');
  var districtSel = document.getElementById('table-district');
  var statusSel = document.getElementById('table-status');
  var sortSel = document.getElementById('table-sort');
  var searchEl = document.getElementById('table-search');

  var districts = [];
  data.estates.forEach(function (e) {
    if (districts.indexOf(e.d) === -1) districts.push(e.d);
  });
  districts.forEach(function (d) {
    var o = document.createElement('option');
    o.value = d;
    o.textContent = d;
    districtSel.appendChild(o);
  });

  function currentRows() {
    var rows = data.estates.slice();
    if (districtSel.value !== 'all') {
      rows = rows.filter(function (e) { return e.d === districtSel.value; });
    }
    if (statusSel.value === 'ok') {
      rows = rows.filter(function (e) { return e.m <= 500; });
    } else if (statusSel.value === 'none') {
      rows = rows.filter(function (e) { return e.m > 500; });
    }
    var q = searchEl.value.trim();
    if (q) {
      rows = rows.filter(function (e) { return e.n.indexOf(q) !== -1; });
    }
    if (sortSel.value === 'name') {
      rows.sort(function (a, b) { return a.n.localeCompare(b.n, 'zh-Hant'); });
    } else {
      rows.sort(function (a, b) { return b.m - a.m; });
    }
    return rows;
  }

  function renderTable() {
    var rows = currentRows();
    tbody.innerHTML = rows.map(function (e) {
      var dot = '<span class="status-dot status-dot--' + (e.m <= 500 ? 'ok' : 'none') + '"></span>';
      return '<tr data-name="' + e.n + '" tabindex="0">' +
        '<td>' + dot + e.n + '</td>' +
        '<td>' + e.d + '</td>' +
        '<td class="num">' + fmt.format(e.m) + '</td>' +
        '<td class="num">' + e.s + '</td>' +
        '<td class="num">' + fmt.format(e.c) + '</td>' +
        '<td class="num">' + fmt.format(e.t) + '</td>' +
        '</tr>';
    }).join('');
    countEl.textContent = '顯示 ' + rows.length + ' / ' + data.estates.length + ' 個屋邨。距離為直線距離。';
  }

  districtSel.addEventListener('change', renderTable);
  statusSel.addEventListener('change', renderTable);
  sortSel.addEventListener('change', renderTable);
  searchEl.addEventListener('input', renderTable);

  function rowName(ev) {
    var tr = ev.target.closest ? ev.target.closest('tr[data-name]') : null;
    return tr ? tr.dataset.name : null;
  }

  tbody.addEventListener('click', function (ev) {
    var name = rowName(ev);
    if (name) focusEstate(name);
  });

  tbody.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var name = rowName(ev);
    if (name) {
      ev.preventDefault();
      focusEstate(name);
    }
  });

  renderTable();

  window.addEventListener('resize', function () {
    measureMap();
    apply();
  });

  /* initial scale bar */
  measureMap();
  setView(1, 0, 0);
})();
