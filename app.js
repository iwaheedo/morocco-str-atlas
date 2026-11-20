// Morocco STR Atlas: all behaviour for index.html. Kept in its own file so the page's
// Content-Security-Policy can forbid inline scripts.
(function(){
"use strict";
const D = window.STR_DATA, R = D.rabat, M = D.morocco, K = R.kpi;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const state = {
  cur: 'GBP', rates: Object.assign({}, D.meta.fallbackRates), ratesDate: D.meta.fallbackRatesDate,
  metric: 'revenue', sort: { key: 'rank', dir: 1 }, filter: 'all',
  calc: { priceMAD: null, customMAD: null },
  live: false // true once a live exchange rate has been accepted
};
try { const c = localStorage.getItem('str-cur'); if (['GBP', 'MAD', 'EUR', 'USD'].indexOf(c) >= 0) state.cur = c; } catch (e) {}

/* ---------- formatting ---------- */
const SYM = { GBP: '£', MAD: 'MAD ', EUR: '€', USD: '$' };
const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const trim = (x, d) => String(+x.toFixed(d));
const toCur = mad => mad * state.rates[state.cur];
function compact(x){
  const a = Math.abs(x);
  if (a >= 999500) return trim(x / 1e6, 2) + 'M';
  if (a >= 99950) return trim(x / 1e3, 0) + 'k';
  if (a >= 1e4) return trim(x / 1e3, 1) + 'k';
  return nf0.format(Math.round(x));
}
const fmtCur = (x, c) => SYM[state.cur] + (c ? compact(x) : nf0.format(Math.round(x)));
const money = (mad, c) => fmtCur(toCur(mad), c);
const pct = (v, d) => (d == null ? v : v.toFixed(d)) + '%';
const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%';
function deltaHtml(v){
  if (v == null) return '<span style="color:var(--muted)">–</span>';
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : '';
  return `<span class="delta ${cls}">${signed(v)}</span>`;
}

/* ---------- chart helpers ---------- */
function niceTicks(min, max, n){
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step, t = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) t.push(+v.toFixed(8));
  return t;
}
function axisFmt(type, ticks){
  const big = Math.max.apply(null, ticks) >= 10000;
  if (type === 'money') return v => SYM[state.cur] + (big ? (v === 0 ? '0' : trim(v / 1000, 1) + 'k') : nf0.format(v));
  if (type === 'pct') return v => v + '%';
  return v => String(v);
}
function tipAt(host, tip, x, y, html){
  tip.innerHTML = html; tip.hidden = false;
  const w = tip.offsetWidth, W = host.clientWidth;
  const left = Math.min(Math.max(x, w / 2 + 2), W - w / 2 - 2);
  tip.style.left = left + 'px'; tip.style.top = (y - 12) + 'px';
}

function lineChart(host, o){
  const W = Math.max(280, host.clientWidth), H = 250, v = o.values, n = v.length;
  const lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
  // Leave room under the lowest point so its label clears the month labels on the axis.
  const ticks = niceTicks(Math.max(lo >= 0 ? 0 : -Infinity, lo - (hi - lo) * 0.14), hi, 4), af = axisFmt(o.type, ticks), tl = ticks.map(af);
  const ml = Math.max.apply(null, tl.map(s => s.length)) * 6.8 + 14, mr = 26, mt = 28, mb = 30;
  const pw = W - ml - mr, ph = H - mt - mb, y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = i => ml + pw * i / (n - 1), Y = val => mt + ph * (1 - (val - y0) / (y1 - y0));
  const every = Math.max(1, Math.ceil(n * 50 / pw));
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  ticks.forEach((t, i) => { s += `<line class="${i === 0 ? 'axis' : 'grid'}" x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="tick" x="${ml - 8}" y="${Y(t) + 4}" text-anchor="end">${tl[i]}</text>`; });
  o.labels.forEach((l, i) => { if (i % every === 0) s += `<text class="tick" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
  s += `<path class="line" d="${v.map((val, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1)).join('')}"/>`;
  const iMax = v.indexOf(Math.max.apply(null, v)), iMin = v.indexOf(Math.min.apply(null, v));
  [[iMax, -11], [iMin, 20]].forEach(([i, dy]) => {
    const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    s += `<circle class="dot" cx="${X(i)}" cy="${Y(v[i])}" r="4.5"/><text class="dlabel" x="${X(i)}" y="${Y(v[i]) + dy}" text-anchor="${anchor}">${esc(o.fmt(v[i]))}</text>`;
  });
  s += `<line class="xhair" y1="${mt}" y2="${H - mb}" visibility="hidden"/><circle class="dot hov" r="5" visibility="hidden"/>`;
  s += `<rect class="hit" x="${ml - 10}" y="${mt - 10}" width="${pw + 20}" height="${ph + 20}"/></svg><div class="tip" hidden></div>`;
  host.innerHTML = s;
  const svg = host.querySelector('svg'), tip = host.querySelector('.tip'), xh = host.querySelector('.xhair'), hd = host.querySelector('.hov');
  const move = e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(n - 1, Math.round((px - ml) / pw * (n - 1))));
    xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.setAttribute('visibility', 'visible');
    hd.setAttribute('cx', X(i)); hd.setAttribute('cy', Y(v[i])); hd.setAttribute('visibility', 'visible');
    tipAt(host, tip, X(i), Y(v[i]), `<b>${esc(o.full[i])}</b><br>${esc(o.fmt(v[i]))}`);
  };
  const leave = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); hd.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', leave);
}

function columnChart(host, o){
  const W = Math.max(280, host.clientWidth), H = 250, v = o.values, n = v.length;
  const ticks = niceTicks(0, Math.max.apply(null, v), 4), af = axisFmt(o.type, ticks), tl = ticks.map(af);
  const ml = Math.max.apply(null, tl.map(s => s.length)) * 6.8 + 14, mr = 8, mt = 28, mb = 30;
  const pw = W - ml - mr, ph = H - mt - mb, y1 = ticks[ticks.length - 1], band = pw / n, bw = Math.min(24, band * 0.62);
  const Y = val => mt + ph * (1 - val / y1), base = mt + ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  ticks.forEach((t, i) => { if (i) s += `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}"/>`; s += `<text class="tick" x="${ml - 8}" y="${Y(t) + 4}" text-anchor="end">${tl[i]}</text>`; });
  const iMax = v.indexOf(Math.max.apply(null, v)), iMin = v.indexOf(Math.min.apply(null, v));
  v.forEach((val, i) => {
    const x = ml + band * i + (band - bw) / 2, y = Y(val), r = Math.min(4, bw / 2, base - y);
    s += `<path class="bar" data-i="${i}" d="M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${base}Z"/>`;
    s += `<text class="tick" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(band < 30 ? o.labels[i][0] : o.labels[i])}</text>`;
    if (i === iMax || i === iMin) s += `<text class="dlabel" x="${x + bw / 2}" y="${y - 7}" text-anchor="middle">${esc(o.fmt(val))}</text>`;
  });
  s += `<line class="axis" x1="${ml}" x2="${W - mr}" y1="${base}" y2="${base}"/>`;
  v.forEach((val, i) => { s += `<rect class="hit" data-i="${i}" x="${ml + band * i}" y="${mt}" width="${band}" height="${ph}"/>`; });
  host.innerHTML = s + '</svg><div class="tip" hidden></div>';
  const tip = host.querySelector('.tip'), bars = host.querySelectorAll('.bar');
  const leave = () => { tip.hidden = true; bars.forEach(b => b.classList.remove('dim')); };
  host.querySelectorAll('.hit').forEach(h => {
    const show = () => { const i = +h.dataset.i; bars.forEach((b, j) => b.classList.toggle('dim', j !== i)); tipAt(host, tip, ml + band * (i + .5), Y(v[i]), o.tip(i)); };
    h.addEventListener('pointerenter', show); h.addEventListener('pointerdown', show); h.addEventListener('pointerleave', leave);
  });
}

function barList(sel, rows, max, fmt, title){
  $(sel).innerHTML = rows.map(r => {
    const w = Math.max(0, (r._v != null ? r._v : r.share) / max * 100);
    return `<div class="bl-row" title="${esc(title ? title(r) : '')}"><div class="bl-label">${esc(r.label)}</div><div><div class="bl-fill" style="width:${w.toFixed(1)}%"></div></div><div class="bl-val">${fmt(r)}</div></div>`;
  }).join('');
}
const shareFmt = r => r.share < 1 ? '<1%' : Math.round(r.share) + '%';
const nTitle = r => r.n != null ? `${r.label}: ${r.share >= 1 ? r.share + '%' : 'under 1%'} · ${nf0.format(r.n)} listing${r.n === 1 ? '' : 's'}` : `${r.label}: ${r.share}%`;

/* ---------- sections ---------- */
function renderHeader(){
  const fxNote = state.cur === 'MAD' ? 'Shown in Moroccan dirhams, as published.' : `Shown in ${state.cur}, converted from dirhams at ${state.live ? "today's rate" : 'the rate saved on ' + state.ratesDate} (${SYM[state.cur]}1 = MAD ${(1 / state.rates[state.cur]).toFixed(2)}).`;
  $('#mast-dek').innerHTML = `${nf0.format(K.listings)} active listings, 12 months to October 2026. Market estimates from <a href="${D.meta.links.airroiRabat}" target="_blank" rel="noopener">AirROI</a>, snapshot taken ${D.meta.snapshot}. ${fxNote}`;
  $('#cur').innerHTML = Object.keys(SYM).map(c => `<button type="button" data-c="${c}" aria-pressed="${c === state.cur}">${c}</button>`).join('');
  document.querySelectorAll('.cur-code').forEach(e => e.textContent = state.cur);
}

function renderOverview(){
  const tiles = [
    { label: 'Annual revenue per listing', value: money(K.revenue), foot: `${deltaHtml(K.revenueYoY)} on the year before · Morocco ${money(K.moroccoRevenue, true)}` },
    { label: 'Occupancy', value: pct(K.occupancy, 1), foot: `of open nights booked · Morocco ${K.moroccoOccupancy}%` },
    { label: 'Average nightly rate', value: money(K.adr), foot: `per booked night · Morocco ${money(K.moroccoAdr)}` },
    { label: 'RevPAR', value: money(K.revpar), foot: 'revenue per open night, booked or not' }
  ];
  $('#kpis').innerHTML = tiles.map(t => `<div class="card tile"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="foot">${t.foot}</div></div>`).join('');
  const facts = [
    ['Active listings', nf0.format(K.listings), `${signed(K.listingsYoY)} on the year before`],
    ['Median listing', money(K.medianMonthly), 'per month'],
    ['Average stay', K.stay + ' nights', `about ${K.bookingsPerListing} bookings a year`],
    ['Booked ahead', K.leadTime + ' days', 'on average'],
    ['Guest rating', K.rating.toFixed(2) + ' / 5', `${K.guestFavorite}% are Guest Favorites`],
    ['Superhosts', K.superhosts + '%', 'of listings']
  ];
  $('#facts').innerHTML = facts.map(f => `<div><dt>${f[0]}</dt><dd>${f[1]}<small>${f[2]}</small></dd></div>`).join('');
  const L = D.meta.links;
  $('#xcheck').innerHTML = `<thead><tr><th></th><th class="num"><a href="${L.airroiRabat}" target="_blank" rel="noopener">AirROI</a></th><th class="num"><a href="${L.airbticsRabat}" target="_blank" rel="noopener">Airbtics</a></th><th>How they differ</th></tr></thead><tbody>` +
    R.crossCheck.map(r => `<tr><td>${r.metric}</td><td class="num">${r.airroiMAD ? money(r.airroiMAD) : r.airroi}</td><td class="num">${r.airbticsMAD ? money(r.airbticsMAD, r.airbticsMAD >= 1e5) : r.airbtics}</td><td style="color:var(--ink2);font-size:13px">${r.note}</td></tr>`).join('') + '</tbody>';
}

const METRICS = {
  revenue: { label: 'Revenue', type: 'money', sub: 'Average revenue per active listing', fmt: v => fmtCur(v) },
  occ:     { label: 'Occupancy', type: 'pct', sub: 'Share of open nights booked', fmt: v => v.toFixed(1) + '%' },
  adr:     { label: 'Nightly rate', type: 'money', sub: 'Average rate per booked night', fmt: v => fmtCur(v) },
  revpar:  { label: 'RevPAR', type: 'money', sub: 'Revenue per open night', fmt: v => fmtCur(v) },
  lead:    { label: 'Lead time', type: 'num', sub: 'Days between booking and check-in', fmt: v => v + ' days' },
  los:     { label: 'Stay length', type: 'num', sub: 'Nights per booking', fmt: v => v + ' nights' }
};
function renderTrends(){
  const mo = R.monthly, m = METRICS[state.metric];
  $('#trends-dek').textContent = `${K.peakMonth} is usually the best month and ${K.lowMonth} the slowest: a typical July brings in about twice what March does, and December runs close to July.`;
  $('#metric').innerHTML = Object.keys(METRICS).map(k => `<button type="button" data-m="${k}" aria-pressed="${k === state.metric}">${METRICS[k].label}</button>`).join('');
  $('#metric-sub').textContent = m.sub + ', October 2025 to September 2026';
  const vals = mo.map(r => m.type === 'money' ? toCur(r[state.metric]) : r[state.metric]);
  lineChart($('#chart-monthly'), {
    values: vals, type: m.type, fmt: m.fmt, aria: m.sub + ' by month',
    labels: mo.map((r, i) => { const p = r.m.split(' '); return (i === 0 || p[0] === 'Jan') ? p[0] + ' ' + p[1].slice(2) : p[0]; }),
    full: mo.map(r => r.m)
  });
  $('#tbl-monthly').innerHTML = '<thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Occupancy</th><th class="num">Nightly rate</th><th class="num">RevPAR</th><th class="num">Lead time</th><th class="num">Stay</th></tr></thead><tbody>' +
    mo.map(r => `<tr><td>${r.m}</td><td class="num">${money(r.revenue)}</td><td class="num">${r.occ.toFixed(1)}%</td><td class="num">${money(r.adr)}</td><td class="num">${money(r.revpar)}</td><td class="num">${r.lead} days</td><td class="num">${r.los} nights</td></tr>`).join('') + '</tbody>';
  const se = R.seasonality, seVals = se.map(r => toCur(r.revenue)), seBig = Math.max.apply(null, seVals) >= 10000;
  columnChart($('#chart-season'), {
    values: seVals, labels: se.map(r => r.m), type: 'money', fmt: v => seBig ? trim(v / 1000, 1) + 'k' : nf0.format(Math.round(v)),
    aria: 'Average revenue per listing by calendar month',
    tip: i => `<b>${se[i].m}</b> · ${se[i].season} season<br>${money(se[i].revenue)} per listing`
  });
  $('#tbl-seasons').innerHTML = '<thead><tr><th>Season</th><th class="num">Revenue / month</th><th class="num">Occupancy</th><th class="num">Nightly rate</th></tr></thead><tbody>' +
    R.seasons.map(s => `<tr><td>${s.name}<span class="minor">${s.months}</span></td><td class="num">${money(s.revenue)}</td><td class="num">${s.occ}%</td><td class="num">${money(s.adr)}</td></tr>`).join('') + '</tbody>';
}

function spreadSvg(r){
  const W = 190, H = 22, max = r.p90 * 1.06, x = v => 7 + (W - 14) * v / max, y = H / 2;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spread from bottom quarter to top tenth">` +
    `<line x1="7" x2="${W - 7}" y1="${y}" y2="${y}" stroke="var(--grid)"/>` +
    `<line x1="${x(r.p25)}" x2="${x(r.p90)}" y1="${y}" y2="${y}" stroke="var(--series-soft)" stroke-width="4" stroke-linecap="round"/>` +
    [r.p25, r.p75, r.p90].map(v => `<circle cx="${x(v)}" cy="${y}" r="4" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/>`).join('') +
    `<circle cx="${x(r.p50)}" cy="${y}" r="6" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/></svg>`;
}
function renderSpread(){
  const s = R.spread[0];
  $('#spread-dek').textContent = `The averages hide a wide range. In a typical month a top-quarter listing takes in at least ${(Math.floor(s.p75 / s.p25 * 10) / 10).toFixed(1)} times what a bottom-quarter one does.`;
  const f = (r, v, suf) => (r.type === 'money' ? money(v) : v + '%') + (suf || '');
  $('#tbl-spread').innerHTML = '<thead><tr><th>Per listing</th><th class="num">Bottom quarter</th><th class="num">Median</th><th class="num">Top quarter</th><th class="num">Top tenth</th><th>Range (large dot = median)</th></tr></thead><tbody>' +
    R.spread.map(r => `<tr><td>${r.metric}</td><td class="num">${f(r, r.p25)} or less</td><td class="num"><b>${f(r, r.p50)}</b></td><td class="num">${f(r, r.p75, '+')}</td><td class="num">${f(r, r.p90, '+')}</td><td>${spreadSvg(r)}</td></tr>`).join('') + '</tbody>';
}

function renderSize(){
  const b = R.bedrooms, max = Math.max.apply(null, b.map(r => r.median)), top = b.slice().sort((a, c) => c.listings - a.listings)[0];
  const groupName = { 'Studio': 'Studios', '1 bedroom': 'One-bedroom homes', '2 bedrooms': 'Two-bedroom homes', '3 bedrooms': 'Three-bedroom homes' }[top.size] || top.size;
  $('#size-dek').textContent = `${groupName} are the largest group at ${Math.round(top.share)}% of entire homes. Bigger homes charge more a night but fill slightly fewer of them.`;
  $('#tbl-beds').innerHTML = '<thead><tr><th>Home size</th><th class="num">Listings</th><th>Median annual revenue</th><th class="num">Average annual revenue</th><th class="num">Nightly rate</th><th class="num">Occupancy</th></tr></thead><tbody>' +
    b.map(r => `<tr><td>${r.size}</td><td class="num">${nf0.format(r.listings)}<span class="minor">${r.share}%</span></td><td><div class="inbar" title="${esc(r.size)}: median ${esc(money(r.median))} a year"><div class="fill" style="flex:0 0 ${(r.median / max * 62).toFixed(1)}%"></div><span class="v">${money(r.median)}</span></div></td><td class="num">${money(r.avg)}</td><td class="num">${money(r.adr)}</td><td class="num">${r.occ}%</td></tr>`).join('') + '</tbody>';
}

function renderCalc(init){
  const size = $('#c-size'), basis = $('#c-basis'), mgmt = $('#c-mgmt'), price = $('#c-price'), custom = $('#c-custom');
  if (init) {
    size.innerHTML = R.bedrooms.map((r, i) => `<option value="${i}">${r.size}</option>`).join(''); size.value = '2';
    [size, basis, mgmt].forEach(e => e.addEventListener('change', () => renderCalc()));
    // Only a positive, finite amount counts; anything else is treated as empty.
    const amount = el => { const n = parseFloat(el.value); return isFinite(n) && n > 0 ? n : null; };
    price.addEventListener('input', () => { const n = amount(price); state.calc.priceMAD = n ? n / state.rates[state.cur] : null; renderCalc(); });
    custom.addEventListener('input', () => { const n = amount(custom); state.calc.customMAD = n ? n / state.rates[state.cur] : null; renderCalc(); });
  }
  if (init || renderCalc.cur !== state.cur) {
    price.value = state.calc.priceMAD ? Math.round(toCur(state.calc.priceMAD)) : '';
    custom.value = state.calc.customMAD ? Math.round(toCur(state.calc.customMAD)) : '';
    renderCalc.cur = state.cur;
  }
  $('#c-custom-wrap').hidden = basis.value !== 'custom';
  const b = R.bedrooms[+size.value], c = R.costs, mg = +mgmt.value;
  const G = basis.value === 'custom' ? (state.calc.customMAD || 0) : b[basis.value];
  const lines = [
    ["Airbnb's fee", '13.7%', G * c.airbnbFee],
    ['Cleaning and laundry', "3.5%, covered by guests' cleaning fees", G * c.cleaning],
    ['Utilities and internet', '5%', G * c.utilities],
    ['Guest supplies', '2%', G * c.supplies],
    ['Repairs and upkeep', '3%', G * c.upkeep],
    ['Insurance and permit', 'fixed', G > 0 ? c.fixed : 0]
  ];
  if (mg) lines.push(['Management', Math.round(mg * 100) + '% of nightly bookings', G * (1 - c.cleaning) * mg]);
  const costs = lines.reduce((a, l) => a + l[2], 0), net = G - costs;
  $('#c-ledger').innerHTML = `<tbody><tr><td>Gross bookings per year<span class="minor">${basis.value === 'custom' ? 'your estimate' : (basis.value === 'median' ? 'median ' : 'average ') + b.size.toLowerCase() + ' in Rabat'}</span></td><td class="num"><b>${money(G)}</b></td></tr>` +
    lines.map(l => `<tr><td>${l[0]}<span class="minor">${l[1]}</span></td><td class="num">−${money(l[2])}</td></tr>`).join('') +
    `<tr class="total"><td>Left before housing costs<span class="minor" style="font-weight:400">about ${money(net / 12)} a month</span></td><td class="num">${money(net)}</td></tr></tbody>`;
  const p = state.calc.priceMAD;
  $('#c-yields').innerHTML = p > 0
    ? `<div class="y"><div class="label">Gross yield</div><div class="value">${(G / p * 100).toFixed(1)}%</div></div><div class="y"><div class="label">Yield after running costs</div><div class="value">${(net / p * 100).toFixed(1)}%</div></div>`
    : '';
}

function renderSupply(){
  $('#supply-dek').textContent = `Rabat is an apartment market: ${Math.round(R.propertyTypes[0].share)}% of listings are apartments or condos and ${Math.round(R.roomTypes[0].share)}% are entire homes. Most listings are open most of the year, but few are booked for more than half of it.`;
  barList('#bl-prop', R.propertyTypes, 100, shareFmt, nTitle);
  barList('#bl-cap', R.capacity, 30, shareFmt, nTitle);
  barList('#bl-min', R.minStay, 55, shareFmt, nTitle);
  barList('#bl-booked', R.bookedDays, 30, shareFmt, nTitle);
  barList('#bl-cancel', R.cancellation, 45, shareFmt, nTitle);
  barList('#bl-amen', R.amenities, 100, shareFmt, nTitle);
  $('#tbl-amen').innerHTML = '<thead><tr><th>Amenity</th><th class="num">Listings with it</th><th class="num">Avg. revenue with</th><th class="num">Avg. revenue without</th><th class="num">Gap</th></tr></thead><tbody>' +
    R.amenityGap.map(r => `<tr><td>${r.label}</td><td class="num">${r.have}%</td><td class="num">${money(r.withRev)}</td><td class="num">${money(r.withoutRev)}</td><td class="num">+${r.gap}%</td></tr>`).join('') + '</tbody>';
}

function renderGuests(){
  const g = R.guestCountries;
  $('#guests-dek').textContent = `Rabat runs on foreign visitors: 88% of guests who left reviews live outside Morocco, and ${g[0].label} alone accounts for ${Math.round(g[0].share)}%.`;
  barList('#bl-country', g, 40, r => r.share + '%', nTitle);
  barList('#bl-lang', R.guestLanguages, 40, r => r.share + '%', nTitle);
  barList('#bl-rate', R.ratings.map(r => ({ label: r.label, score: r.score, _v: r.score - 4 })), 1, r => r.score.toFixed(2), r => `${r.label}: ${r.score.toFixed(2)} out of 5`);
}

function renderTop(){
  const t = R.topListings[0];
  $('#top-dek').textContent = `The best listing in Rabat grossed ${money(t.revenue, true)}, about ${Math.round(t.revenue / K.revenue)} times the city average. Riads and large homes dominate the top of the table.`;
  $('#tbl-listings').innerHTML = '<thead><tr><th>Listing</th><th class="num">Revenue</th><th class="num">Occupancy</th><th class="num">Nightly rate</th></tr></thead><tbody>' +
    R.topListings.map(r => `<tr><td>${esc(r.name)}<span class="minor">Entire home · ${r.beds} bedrooms · rated ${r.rating.toFixed(2)}</span></td><td class="num">${money(r.revenue, true)}</td><td class="num">${r.occ.toFixed(1)}%</td><td class="num">${money(r.adr)}</td></tr>`).join('') + '</tbody>';
  $('#tbl-hosts').innerHTML = '<thead><tr><th>Host</th><th class="num">Listings</th><th class="num">Gross revenue</th><th class="num">Per listing</th><th class="num">Rating</th></tr></thead><tbody>' +
    R.topHosts.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.listings}</td><td class="num">${money(r.revenue, true)}</td><td class="num">${money(r.per, true)}</td><td class="num">${r.rating.toFixed(2)}</td></tr>`).join('') + '</tbody>';
  $('#atlas-note').innerHTML = `This page carries market-level figures and Rabat's six top listings. To browse every listing on a map, open <a href="${D.meta.links.airroiAtlas}" target="_blank" rel="noopener">AirROI's Market Atlas for Rabat</a>; the areas AirROI flags for guest appeal are ${R.areas.slice(0, -1).join(', ')} and ${R.areas[R.areas.length - 1]}.`;
}

/* ---------- Morocco map + table ---------- */
// Revenue bands are set in the display currency so the legend reads in round numbers.
const BINS_BY_CUR = { GBP: [4000, 6000, 8000], MAD: [50000, 75000, 100000], EUR: [4500, 7000, 9000], USD: [5000, 7500, 10000] };
const BINCOL = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];
const binOf = mad => { const v = toCur(mad), b = BINS_BY_CUR[state.cur]; return v < b[0] ? 0 : v < b[1] ? 1 : v < b[2] ? 2 : 3; };
// Basemap. A hosted copy cannot load map tiles from another site, so it carries its own in
// window.STR_TILES; where a tile is missing at the current zoom, the nearest lower-zoom tile is enlarged.
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const BUNDLED = !!(window.STR_TILES && typeof window.STR_TILES === 'object');
function baseLayer(maxZoom){
  if (!BUNDLED) return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: maxZoom, attribution: OSM_CREDIT });
  const T = window.STR_TILES, cache = Object.create(null);
  const has = k => typeof T[k] === 'string' && T[k].indexOf('data:image/') === 0;
  const load = k => cache[k] || (cache[k] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = T[k]; }));
  const Layer = L.GridLayer.extend({
    createTile: function (c, done) {
      const cv = document.createElement('canvas'), sz = this.getTileSize();
      cv.width = sz.x; cv.height = sz.y;
      let z = c.z, x = c.x, y = c.y, up = 0;
      while (up < 6 && !has(z + '_' + x + '_' + y)) { z--; x >>= 1; y >>= 1; up++; }
      const key = z + '_' + x + '_' + y;
      if (!has(key)) { setTimeout(() => done(null, cv), 0); return cv; }
      load(key).then(im => {
        if (im) { const f = Math.pow(2, up), side = 256 / f; cv.getContext('2d').drawImage(im, (c.x - x * f) * side, (c.y - y * f) * side, side, side, 0, 0, sz.x, sz.y); }
        done(null, cv);
      });
      return cv;
    }
  });
  return new Layer({ maxZoom: maxZoom, attribution: OSM_CREDIT });
}
let map = null; const markers = Object.create(null);
// Jump to a marker and open its popup. The marker is placed low in the map so the popup, which opens
// upwards, fits without relying on Leaflet's animated auto-pan (animations do not run in a background tab).
function showMarker(m, mk, zoom){
  const z = Math.max(m.getZoom(), zoom), pt = m.project(mk.getLatLng(), z).subtract([0, m.getSize().y * 0.36]);
  m.setView(m.unproject(pt, z), z, { animate: false });
  mk.openPopup();
}
// Keep popups narrower than the map they open in, so they are never cut off on a phone.
const popupWidth = sel => { const w = Math.max(170, Math.min(300, $(sel).clientWidth - 64)); return { maxWidth: w, minWidth: Math.min(190, w) }; };
function popupHtml(m){
  return `<b>${esc(m.name)}</b><div class="r">${esc(m.region)}${m.km ? ' · ' + m.km + ' km from Rabat' : ''}${m.rank ? ' · ranked ' + m.rank + ' of ' + M.totals.ranked : ''}</div><table>` +
    `<tr><td>Avg. annual revenue</td><td>${money(m.revenue)}</td></tr><tr><td>Occupancy</td><td>${m.occ}%</td></tr><tr><td>Nightly rate</td><td>${money(m.adr)}</td></tr>` +
    `<tr><td>Active listings</td><td>${nf0.format(m.listings)}</td></tr>${m.yoy != null ? `<tr><td>Revenue on the year</td><td>${signed(m.yoy)}</td></tr>` : ''}${m.slow != null ? `<tr><td>Slow month</td><td>${m.slow}% of best</td></tr>` : ''}</table>`;
}
function initMap(){
  if (!window.L) { $('#map').innerHTML = '<p style="padding:20px;color:#52514e">The map needs an internet connection to load. The table below has every market.</p>'; return; }
  map = L.map('map', { scrollWheelZoom: false, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const popW = popupWidth('#map');
  baseLayer(16).addTo(map);
  if (BUNDLED) { map.setMinZoom(5); map.setMaxZoom(10); map.setMaxBounds([[27.2, -13.5], [37.6, 1.2]]); }
  M.markets.slice().sort((a, b) => b.listings - a.listings).forEach(m => {
    const isR = m.name === 'Rabat';
    const mk = L.circleMarker([m.lat, m.lng], { radius: 4 + Math.sqrt(m.listings) / 4.2, fillColor: BINCOL[binOf(m.revenue)], fillOpacity: .88, color: isR ? '#0b0b0b' : '#fff', weight: isR ? 3 : 2 }).addTo(map);
    mk.bindPopup(() => popupHtml(m), popW);
    mk.on('popupopen', () => mk.closeTooltip());
    if (isR) mk.bindTooltip('Rabat', { permanent: true, direction: 'top', offset: [0, -12], className: 'mk-label' });
    else mk.bindTooltip(() => `${m.name} · ${money(m.revenue, true)}`, { direction: 'top' });
    markers[m.name] = mk;
  });
  setView('rabat');
  // Once the reader pans, zooms or jumps to a market, neither preset view is current.
  map.on('dragstart zoomstart', () => { if (state.view && !state.moving) setView(null); });
}
function setView(v){
  state.view = v;
  $('#map-view').innerHTML = [['rabat', 'Rabat area'], ['all', 'All Morocco']].map(o => `<button type="button" data-v="${o[0]}" aria-pressed="${o[0] === v}">${o[1]}</button>`).join('');
  if (!map || !v) return;
  state.moving = true;
  if (v === 'rabat') map.setView([34.03, -6.88], 10, { animate: false });
  else map.fitBounds(M.markets.map(m => [m.lat, m.lng]), { padding: [24, 24], animate: false });
  state.moving = false;
}
function renderLegend(){
  const b = BINS_BY_CUR[state.cur], f = v => fmtCur(v, true);
  const lab = [`Under ${f(b[0])}`, `${f(b[0])} to ${f(b[1])}`, `${f(b[1])} to ${f(b[2])}`, `${f(b[2])} and over`];
  M.markets.forEach(m => { if (markers[m.name]) markers[m.name].setStyle({ fillColor: BINCOL[binOf(m.revenue)] }); });
  $('#legend').innerHTML = '<span>Average annual revenue per listing:</span>' + lab.map((l, i) => `<span><span class="sw" style="background:${BINCOL[i]}"></span>${l}</span>`).join('') + '<span>· Circle size shows the number of active listings</span>';
}
const COLS = [['rank', '#', 1], ['name', 'Market', 0], ['revenue', 'Avg. revenue', 1], ['occ', 'Occupancy', 1], ['adr', 'Nightly rate', 1], ['slow', 'Slow month', 1], ['yoy', 'Revenue on the year', 1], ['listings', 'Listings', 1]];
function renderMarkets(){
  const T = M.totals, rabat = M.markets.find(m => m.name === 'Rabat');
  $('#morocco-dek').textContent = `AirROI ranks Rabat ${rabat.rank}th of ${T.ranked} Moroccan markets with 100 or more listings. Its listings earn about ${Math.round((1 - K.revenue / T.revenue) * 100)}% less than the national average of ${money(T.revenue, true)}, but it is the fifth-largest market and fills more nights than most.`;
  $('#mk-filter').innerHTML = [['all', 'All markets'], ['near', 'Near Rabat']].map(o => `<button type="button" data-f="${o[0]}" aria-pressed="${o[0] === state.filter}">${o[1]}</button>`).join('');
  const { key, dir } = state.sort;
  const rows = M.markets.filter(m => state.filter === 'all' || m.km != null).sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir;
  });
  $('#tbl-markets').innerHTML = '<thead><tr>' + COLS.map(c => `<th class="${c[2] ? 'num' : ''}" aria-sort="${key === c[0] ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-btn" data-k="${c[0]}">${c[1]}<span class="arrow">${key === c[0] ? (dir > 0 ? '▲' : '▼') : ''}</span></button></th>`).join('') + '</tr></thead><tbody>' +
    rows.map(m => `<tr class="clickable${m.name === 'Rabat' ? ' is-rabat' : ''}" data-n="${esc(m.name)}" tabindex="0"><td class="num">${m.rank || '–'}</td><td>${esc(m.name)}<span class="minor">${esc(m.region)}${m.km ? ' · ' + m.km + ' km from Rabat' : ''}</span></td><td class="num">${money(m.revenue)}</td><td class="num">${m.occ}%</td><td class="num">${money(m.adr)}</td><td class="num">${m.slow != null ? m.slow + '%' : '–'}</td><td class="num">${deltaHtml(m.yoy)}</td><td class="num">${nf0.format(m.listings)}</td></tr>`).join('') + '</tbody>';
}
function focusMarket(name){
  const mk = markers[name]; if (!mk || !map) return;
  setView(null);
  $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  // The bundled basemap is only sharp at this zoom around Rabat; elsewhere stay one step out.
  const mkt = M.markets.find(x => x.name === name);
  showMarker(map, mk, BUNDLED && (!mkt || mkt.km == null) ? 8 : 10);
}

/* ---------- Rabat listings (optional: listings.js) ---------- */
// listings.js carries text written by strangers (anyone can name a listing anything), so none of it is
// trusted: every field is forced to its expected type here, and strings are escaped again where shown.
function cleanListings(raw){
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const num = v => typeof v === 'number' && isFinite(v) ? v : null;
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : null;
  const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  const NUMS = ['lat', 'lng', 'bedrooms', 'beds', 'baths', 'guests', 'rating', 'reviews', 'adr', 'rev', 'revpar', 'occ', 'availDays', 'bookedDays', 'calNights', 'calTaken'];
  const seen = Object.create(null), items = [];
  raw.items.forEach(l => {
    if (!l || typeof l !== 'object') return;
    const id = typeof l.id === 'string' || typeof l.id === 'number' ? String(l.id).slice(0, 40) : '';
    if (!id || seen[id]) return;
    seen[id] = 1;
    const o = { id: id, name: str(l.name, 200), type: str(l.type, 60), room: str(l.room, 30), priceDate: day(l.priceDate),
      cal: typeof l.cal === 'string' && /^[acx]{1,400}$/.test(l.cal) ? l.cal : null,
      isNew: l.isNew === true, fav: l.fav === true, superhost: l.superhost === true, exact: l.exact === false ? false : undefined };
    NUMS.forEach(k => { o[k] = num(l[k]); });
    items.push(o);
  });
  if (!items.length) return null;
  const m = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  return { items: items, meta: { source: m.source === 'airbnb' ? 'airbnb' : 'airroi', pulledAt: day(m.pulledAt),
    currency: ['GBP', 'MAD', 'EUR', 'USD'].indexOf(m.currency) >= 0 ? m.currency : 'MAD',
    totalInMarket: num(m.totalInMarket), sort: str(m.sort, 40), calFrom: day(m.calFrom), calTo: day(m.calTo), calCount: num(m.calCount) } };
}
const LS = cleanListings(window.STR_LISTINGS);
// Two possible sources. 'airbnb': read from Airbnb's public map search, so price, rating and reviews
// are observed and revenue is only a rough guide. Otherwise AirROI's API, with measured revenue and occupancy.
const AB = !!LS && LS.meta.source === 'airbnb';
const PK = AB ? 'adr' : 'rev'; // the money figure pins are coloured by
const HAS_CAL = AB && LS.items.some(l => l.occ != null); // calendars read for some listings
const GREY = '#c3c2b7';
const lstate = { beds: 'any', minRev: 0, color: 'price', sort: { key: AB ? 'reviews' : 'rev', dir: -1 }, show: 25 };
let lmap = null, lLayer = null, lq = null; const lmarkers = Object.create(null);
// Dates in the file are plain calendar days; read them as local midnight so they do not shift by time zone.
const lDay = d => d ? new Date(d + 'T00:00:00') : new Date(NaN);
const lAge = () => Math.floor((Date.now() - lDay(LS.meta.pulledAt).getTime()) / 864e5);
const lFresh = () => !!LS && (AB || lAge() <= 30); // AirROI's API terms cap storage at 30 days
const lWhen = () => LS.meta.pulledAt ? lDay(LS.meta.pulledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date';
// Listing money arrives in the currency named in the file (pounds from Airbnb, dirhams from AirROI).
const lMAD = v => { if (v == null) return null; const c = LS.meta.currency; return c && c !== 'MAD' && state.rates[c] ? v / state.rates[c] : v; };
const lMoney = (v, c) => v == null ? '–' : money(lMAD(v), c);
const median = a => { const s = a.filter(v => v != null).sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const isRoom = l => l.room === 'private_room' || l.room === 'shared_room';
const bedMatch = l => lstate.beds === 'any' || (lstate.beds === 'room' ? isRoom(l) : !isRoom(l) && (lstate.beds === 'unknown' ? l.bedrooms == null : lstate.beds === '5' ? l.bedrooms >= 5 : l.bedrooms === +lstate.beds));
function bedChips(){
  const has = f => LS.items.some(f), chips = [['any', 'Any size']];
  [[0, 'Studio'], [1, '1 bed'], [2, '2'], [3, '3'], [4, '4']].forEach(c => { if (has(l => !isRoom(l) && l.bedrooms === c[0])) chips.push([String(c[0]), c[1]]); });
  if (has(l => !isRoom(l) && l.bedrooms >= 5)) chips.push(['5', '5+']);
  if (has(isRoom)) chips.push(['room', 'Rooms']);
  if (has(l => !isRoom(l) && l.bedrooms == null)) chips.push(['unknown', 'Size not stated']);
  return chips;
}
const lBin = l => { const v = l[PK] || 0; return v < lq[0] ? 0 : v < lq[1] ? 1 : v < lq[2] ? 2 : 3; };
const shortDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const lDesc = l => [l.type || l.room, isRoom(l) ? null : l.bedrooms === 0 ? 'studio' : l.bedrooms != null ? l.bedrooms + ' bed' : null, l.guests ? 'sleeps ' + l.guests : null,
  l.rating ? 'rated ' + (+l.rating).toFixed(2) + (l.reviews ? ' (' + nf0.format(l.reviews) + ')' : '') : l.isNew ? 'new' : null].filter(Boolean).join(' · ');
function lPopup(l){
  const rows = AB
    ? [['Nightly price', lMoney(l.adr) + (l.priceDate ? ' <span style="color:#52514e">on ' + shortDate(l.priceDate) + '</span>' : '')],
       ['Guest rating', l.rating ? (+l.rating).toFixed(2) + ' from ' + nf0.format(l.reviews) + ' reviews' : l.isNew ? 'New listing' : 'Not yet rated'],
       ['Beds · baths', [l.beds != null ? l.beds + (l.beds === 1 ? ' bed' : ' beds') : null, l.baths != null ? l.baths + (l.baths === 1 ? ' bath' : ' baths') : null].filter(Boolean).join(' · ') || '–'],
       ['Rough annual revenue', l.rev != null ? 'about ' + lMoney(l.rev, true) : '–']]
      .concat(HAS_CAL ? [['Nights taken', l.occ != null && l.calTaken != null && l.calNights != null ? `${l.calTaken} of ${l.calNights} (${l.occ}%)` : 'calendar not read']] : [])
    : [['Annual revenue', lMoney(l.rev)], ['Occupancy', l.occ != null ? l.occ + '%' : '–'], ['Nightly rate', lMoney(l.adr)], ['RevPAR', lMoney(l.revpar)],
       ['Days available', l.availDays != null ? l.availDays : '–'], ['Days booked', l.bookedDays != null ? l.bookedDays : '–']];
  const tags = [l.fav ? 'Guest favourite' : null, l.superhost ? 'Superhost' : null, l.exact === false ? 'approximate location' : null].filter(Boolean).join(' · ');
  return `<b>${esc(l.name || 'Listing')}</b><div class="r">${esc(lDesc(l))}${tags ? ' · ' + tags : ''}</div><table>` +
    rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>' +
    (l.cal ? `<div class="calstrip" role="img" aria-label="Nights taken and free, ${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)}">${l.cal.split('').map(ch => `<i class="${ch === 'a' ? '' : 't'}"></i>`).join('')}</div><div class="r" style="margin:3px 0 0">${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)} · dark = taken</div>` : '') +
    (/^\d+$/.test(l.id) ? `<a href="https://www.airbnb.co.uk/rooms/${l.id}" target="_blank" rel="noopener">Open on Airbnb</a>` : '');
}
function initListings(){
  const setup = $('#listings-setup'), card = $('#listings-card');
  if (!lFresh()) {
    card.hidden = true; setup.hidden = false;
    $('#listings-dek').textContent = LS ? 'The saved listing pull has expired.' : 'A pin for each Rabat listing, with its own price, rating and reviews.';
    setup.innerHTML = LS
      ? `<h3>This pull is ${isNaN(lAge()) ? 'undated' : lAge() + ' days old'}</h3><p class="sub">AirROI's API terms limit how long pulled data may be kept to 30 days, so the pins are hidden until it is refreshed.</p>` +
        `<p>Run <code>python3 fetch_listings.py --restart</code> in the <code>morocco-str</code> folder, then reload this page. Each page of listings costs $0.50 of AirROI credit, and the script asks before spending anything.</p>`
      : '<h3>No listings loaded</h3><p class="sub">The file <code>listings.js</code> is empty. Ask Claude to collect Rabat listings from Airbnb\'s public map search again, or use <code>fetch_listings.py</code> with an AirROI API key for measured revenue per listing.</p>';
    return;
  }
  setup.hidden = true; card.hidden = false;
  const vals = LS.items.map(l => l[PK] || 0).sort((a, b) => a - b), q = p => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
  lq = [q(.25), q(.5), q(.75)];
  if (!window.L) { $('#lmap').innerHTML = '<p style="padding:20px;color:#52514e">The map needs an internet connection to load. The table below has every listing.</p>'; return; }
  lmap = L.map('lmap', { scrollWheelZoom: false, preferCanvas: true, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(lmap);
  const popW = popupWidth('#lmap');
  baseLayer(18).addTo(lmap);
  if (BUNDLED) { lmap.setMinZoom(12); lmap.setMaxZoom(16); lmap.setMaxBounds([[33.85, -7.05], [34.12, -6.66]]); }
  lLayer = L.layerGroup().addTo(lmap);
  const pts = [];
  LS.items.forEach(l => {
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return;
    pts.push([l.lat, l.lng]);
    const mk = L.circleMarker([l.lat, l.lng], { radius: AB ? 5 : 6, fillColor: BINCOL[lBin(l)], fillOpacity: .92, color: '#fff', weight: 1.2 });
    mk.bindPopup(() => lPopup(l), popW);
    mk.on('popupopen', () => mk.closeTooltip());
    mk.bindTooltip(() => `${esc(l.name || 'Listing')} · ${lMoney(l[PK], !AB)}${AB ? ' a night' : ''}`, { direction: 'top' });
    lmarkers[l.id] = mk;
  });
  // Open on the middle of the listings rather than their outer edge, so the dense centre is readable.
  if (pts.length > 200) lmap.setView([median(pts.map(p => p[0])), median(pts.map(p => p[1]))], 13);
  else if (pts.length) lmap.fitBounds(pts, { padding: [24, 24], maxZoom: 14 });
  else lmap.setView([34.013, -6.84], 12);
}
const LCOLS = AB
  ? [['name', 'Listing', 0], ['adr', 'Nightly price', 1]].concat(HAS_CAL ? [['occ', 'Nights taken', 1]] : [], [['rating', 'Rating', 1], ['reviews', 'Reviews', 1], ['rev', 'Rough annual revenue', 1]])
  : [['name', 'Listing', 0], ['rev', 'Revenue', 1], ['occ', 'Occupancy', 1], ['adr', 'Nightly rate', 1], ['availDays', 'Days available', 1], ['bookedDays', 'Days booked', 1]];
const lCell = (l, k) => k === 'adr' || k === 'rev' ? lMoney(l[k]) : k === 'occ' ? (l.occ != null ? l.occ + '%' : '–')
  : k === 'rating' ? (l.rating ? (+l.rating).toFixed(2) : l.isNew ? 'New' : '–') : k === 'reviews' ? nf0.format(l.reviews || 0) : (l[k] != null ? l[k] : '–');
function renderListings(){
  if (!lFresh()) return;
  const all = LS.items, T = LS.meta.totalInMarket, rows = all.filter(l => bedMatch(l) && (l.reviews || 0) >= lstate.minRev), { key, dir } = lstate.sort;
  const partial = T && all.length < T;
  $('#listings-dek').textContent = AB
    ? `${nf0.format(all.length)} Rabat listings read from Airbnb's public map search on ${lWhen()}, about ${Math.round(all.length / K.listings * 100)}% of the ${nf0.format(K.listings)} that AirROI counts as active.`
    : `${nf0.format(all.length)}${T ? ' of ' + nf0.format(T) : ''} Rabat listings, pulled from AirROI's API on ${lWhen()}.` +
      (partial && LS.meta.sort === 'ttm_revenue' ? ' These are the highest earners, not a random sample, so the medians here run above the market as a whole.' : '');
  $('#bed-filter').innerHTML = bedChips().map(b => `<button type="button" data-b="${b[0]}" aria-pressed="${b[0] === lstate.beds}">${b[1]}</button>`).join('');
  // Half of Rabat's listings have few or no reviews, and that is where placeholder prices sit.
  $('#rev-filter').innerHTML = [[0, 'All listings'], [10, '10+ reviews']].map(o => `<button type="button" data-r="${o[0]}" aria-pressed="${o[0] === lstate.minRev}">${o[1]}</button>`).join('');
  const n = `${nf0.format(rows.length)} listing${rows.length === 1 ? '' : 's'}`, mOcc = median(rows.map(l => l.occ)), mRat = median(rows.map(l => l.rating));
  $('#listings-summary').textContent = !rows.length ? 'No listings match' : AB
    ? `${n} · median nightly price ${lMoney(median(rows.map(l => l.adr)))} · median rating ${mRat != null ? mRat.toFixed(2) : '–'} · median ${nf0.format(Math.round(median(rows.map(l => l.reviews || 0))))} reviews` + (HAS_CAL && mOcc != null ? ` · median ${Math.round(mOcc)}% of nights taken (${nf0.format(rows.filter(l => l.occ != null).length)} calendars read)` : '')
    : `${n} · median revenue ${lMoney(median(rows.map(l => l.rev)))} · occupancy ${mOcc != null ? Math.round(mOcc) + '%' : '–'} · nightly ${lMoney(median(rows.map(l => l.adr)))}`;
  const byOcc = HAS_CAL && lstate.color === 'occ', rank = l => byOcc ? (l.occ == null ? -1 : l.occ) : (l[PK] || 0);
  const colorOf = l => byOcc ? (l.occ == null ? GREY : BINCOL[l.occ < 25 ? 0 : l.occ < 50 ? 1 : l.occ < 75 ? 2 : 3]) : BINCOL[lBin(l)];
  $('#color-by').hidden = !HAS_CAL;
  $('#color-by').innerHTML = HAS_CAL ? [['price', 'Colour by price'], ['occ', 'by nights taken']].map(o => `<button type="button" data-ck="${o[0]}" aria-pressed="${o[0] === lstate.color}">${o[1]}</button>`).join('') : '';
  if (lLayer) { lLayer.clearLayers(); rows.slice().sort((a, b) => rank(a) - rank(b)).forEach(l => { const mk = lmarkers[l.id]; if (mk) { mk.setStyle({ fillColor: colorOf(l) }); lLayer.addLayer(mk); } }); }
  const lab = [`Under ${lMoney(lq[0], !AB)}`, `${lMoney(lq[0], !AB)} to ${lMoney(lq[1], !AB)}`, `${lMoney(lq[1], !AB)} to ${lMoney(lq[2], !AB)}`, `${lMoney(lq[2], !AB)} and over`];
  $('#llegend').innerHTML = byOcc
    ? `<span>Nights already taken, ${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)}:</span>` + ['Under 25%', '25% to 50%', '50% to 75%', '75% and over'].map((t, i) => `<span><span class="sw" style="background:${BINCOL[i]}"></span>${t}</span>`).join('') + `<span><span class="sw" style="background:${GREY}"></span>Calendar not read</span>`
    : `<span>${AB ? 'Nightly price, by quarter of listings:' : 'Annual revenue, by quarter of the pulled listings:'}</span>` + lab.map((t, i) => `<span><span class="sw" style="background:${BINCOL[i]}"></span>${t}</span>`).join('');
  const sorted = rows.slice().sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir;
  });
  $('#tbl-props').innerHTML = '<thead><tr>' + LCOLS.map(c => `<th class="${c[2] ? 'num' : ''}" aria-sort="${key === c[0] ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-btn" data-lk="${c[0]}">${c[1]}<span class="arrow">${key === c[0] ? (dir > 0 ? '▲' : '▼') : ''}</span></button></th>`).join('') + '</tr></thead><tbody>' +
    sorted.slice(0, lstate.show).map(l => `<tr class="clickable" data-lid="${esc(l.id)}" tabindex="0"><td>${esc(l.name || 'Listing')}<span class="minor">${esc(lDesc(l))}</span></td>` + LCOLS.slice(1).map(c => `<td class="num">${lCell(l, c[0])}</td>`).join('') + '</tr>').join('') + '</tbody>';
  $('#props-more').innerHTML = sorted.length > lstate.show ? `<button type="button" class="more-btn" data-more="1">Show 25 more (${nf0.format(sorted.length - lstate.show)} left)</button>` : '';
  $('#listings-note').textContent = AB
    ? "Select a row to find the listing on the map. Nightly price is the one-night price Airbnb showed for each listing's next open date, so it is a late-November spot price, not a yearly average. Rough annual revenue multiplies that price by 365 nights and by the market's average occupancy for a home of that size, so it shows scale and is not a measurement of that listing. Airbnb places many pins approximately." +
      (HAS_CAL ? ` Nights taken is the share of nights from ${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)} that could not be booked when the calendars were read (${nf0.format(LS.meta.calCount)} listings with 10 or more reviews). A guest booking and a night the host has blocked look the same, so it is an upper bound on bookings, and later dates will still fill.` : '')
    : 'Select a row to find the listing on the map. Airbnb hides the exact address of many listings, so some pins are approximate. Revenue, occupancy and rate cover the trailing twelve months.';
}
function focusListing(id){
  const mk = lmarkers[id]; if (!mk || !lmap) return;
  $('#lmap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showMarker(lmap, mk, 15);
}

function renderAbout(){
  const L = D.meta.links, r = state.rates;
  const rate = state.cur === 'MAD' ? `1 GBP = ${(1 / r.GBP).toFixed(2)} MAD` : `1 ${state.cur} = ${(1 / r[state.cur]).toFixed(2)} MAD`;
  $('#about').innerHTML = [
    `Market figures: AirROI. (2026). <a href="${L.airroiRabat}" target="_blank" rel="noopener">Rabat, Morocco Airbnb market data</a>, ${D.meta.period}, and its <a href="${L.airroiMorocco}" target="_blank" rel="noopener">Morocco market ranking</a>, both updated ${D.meta.sourceUpdated}. Read from the free public pages on ${D.meta.snapshot}; AirROI refreshes them monthly.`,
    `Second opinion: <a href="${L.airbticsRabat}" target="_blank" rel="noopener">Airbtics' free Rabat summary</a>. Nothing here comes from Airbtics' paid dashboard.`,
    (typeof AB !== 'undefined' && AB)
      ? `Listing pins: read from Airbnb's public Rabat map search on ${lWhen()}. Price, rating and review count are as Airbnb showed them; revenue per listing is a rough guide, not a measurement.` + (HAS_CAL ? ` Nights taken comes from each listing's public calendar and counts host-blocked nights as well as bookings.` : '')
      : `Listing pins, when set up, come from <a href="${L.airroiApi}" target="_blank" rel="noopener">AirROI's API</a> under your own key, and are kept for at most 30 days as its terms require.`,
    `All figures are estimates modelled from public Airbnb listings and calendars. They are gross bookings before costs and tax, and cover Airbnb only. For personal research; check anything that matters against the source.`,
    `Source figures are in Moroccan dirhams. Other currencies are converted at ${state.live ? 'the current rate' : 'a saved rate'} (${rate}, ${state.ratesDate}). <a href="${L.fx}" target="_blank" rel="noopener">Rates by Exchange Rate API</a>.`
  ].map(t => `<li>${t}</li>`).join('');
}

function renderAll(init){
  renderHeader(); renderOverview(); renderTrends(); renderSpread(); renderSize(); renderCalc(init);
  renderSupply(); renderGuests(); renderTop(); renderListings(); renderLegend(); renderMarkets(); renderAbout();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button, tr.clickable'); if (!b) return;
  // Re-rendering replaces the button that was pressed, so note which one it was and hand focus back to it.
  const dk = b.tagName === 'BUTTON' ? Object.keys(b.dataset)[0] : null;
  const again = dk ? `button[data-${dk.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${b.dataset[dk]}"]` : null;
  if (b.dataset.c) { state.cur = b.dataset.c; try { localStorage.setItem('str-cur', state.cur); } catch (err) {} renderAll(); }
  else if (b.dataset.m) { state.metric = b.dataset.m; renderTrends(); }
  else if (b.dataset.v) setView(b.dataset.v);
  else if (b.dataset.f) { state.filter = b.dataset.f; renderMarkets(); }
  else if (b.dataset.k) { const k = b.dataset.k; state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'rank' || k === 'name' ? 1 : -1) }; renderMarkets(); }
  else if (b.dataset.n) focusMarket(b.dataset.n);
  else if (b.dataset.b) { lstate.beds = b.dataset.b; lstate.show = 25; renderListings(); }
  else if (b.dataset.r) { lstate.minRev = +b.dataset.r; lstate.show = 25; renderListings(); }
  else if (b.dataset.ck) { lstate.color = b.dataset.ck; renderListings(); }
  else if (b.dataset.lk) { const k = b.dataset.lk; lstate.sort = { key: k, dir: lstate.sort.key === k ? -lstate.sort.dir : (k === 'name' ? 1 : -1) }; renderListings(); }
  else if (b.dataset.more) { lstate.show += 25; renderListings(); }
  else if (b.dataset.lid) focusListing(b.dataset.lid);
  if (again) { const nb = document.querySelector(again); if (nb && nb !== document.activeElement) nb.focus({ preventScroll: true }); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.matches('tr.clickable')) return;
  if (e.target.dataset.lid) focusListing(e.target.dataset.lid); else focusMarket(e.target.dataset.n);
});
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderTrends, 120); });

initListings();
renderAll(true);
initMap();

// A hosted copy lists its basemap files here; they load after the page has drawn, then the maps repaint.
(Array.isArray(window.STR_TILE_FILES) ? window.STR_TILE_FILES : []).forEach(src => {
  if (typeof src !== 'string' || !/^[a-z0-9-]+\.js$/.test(src)) return;
  const el = document.createElement('script');
  el.src = src;
  el.onload = () => [map, lmap].forEach(m => { if (m) m.eachLayer(l => { if (l instanceof L.GridLayer) l.redraw(); }); });
  document.head.appendChild(el);
});

fetch('https://open.er-api.com/v6/latest/MAD').then(r => r.json()).then(j => {
  if (!j || j.result !== 'success' || !j.rates) return;
  const fb = D.meta.fallbackRates, typedPrice = state.calc.priceMAD ? toCur(state.calc.priceMAD) : null, typedCustom = state.calc.customMAD ? toCur(state.calc.customMAD) : null;
  // Take a rate only if it is a plain number close to the saved one: a broken or tampered feed must not rescale every figure.
  const fresh = {};
  ['GBP', 'USD', 'EUR'].forEach(c => { const v = j.rates[c]; if (typeof v === 'number' && isFinite(v) && v > fb[c] * 0.75 && v < fb[c] * 1.25) fresh[c] = v; });
  const when = new Date(j.time_last_update_utc);
  if (Object.keys(fresh).length !== 3 || isNaN(when.getTime())) return;
  Object.assign(state.rates, fresh);
  state.live = true;
  state.ratesDate = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  // Amounts already typed into the calculator keep the value the reader typed, now at the live rate.
  if (typedPrice) state.calc.priceMAD = typedPrice / state.rates[state.cur];
  if (typedCustom) state.calc.customMAD = typedCustom / state.rates[state.cur];
  renderAll();
}).catch(() => {});
})();
