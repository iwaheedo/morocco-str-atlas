// Morocco STR Atlas: all behaviour for index.html. Kept in its own file so the page's
// Content-Security-Policy can forbid inline scripts.
(function(){
"use strict";
const D = window.STR_DATA, M = D.morocco;
// Market data per city, all in the same shape. Rabat's was transcribed by hand; the others are generated (tools/build_cities.py).
const MK = Object.create(null); MK['Rabat'] = D.rabat;
if (D.cities && typeof D.cities === 'object') Object.keys(D.cities).forEach(c => { MK[c] = D.cities[c]; });
const MCITIES = Object.keys(MK);
let R = D.rabat, K = R.kpi; // the city the analytics sections are showing
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const state = {
  cur: 'GBP', rates: Object.assign({}, D.meta.fallbackRates), ratesDate: D.meta.fallbackRatesDate,
  metric: 'revenue', sort: { key: 'rank', dir: 1 }, filter: 'all',
  calc: { priceMAD: null, customMAD: null },
  live: false, // true once a live exchange rate has been accepted
  mcity: 'Rabat' // the city the market analytics are showing
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
  $('#mast-dek').innerHTML = `${LS && MULTI ? CITIES.slice(0, -1).join(', ') + ' and ' + CITIES[CITIES.length - 1] + ' on the map, with market analytics for each further down. ' : nf0.format(K.listings) + ' active listings, 12 months to October 2026. '}Market estimates from <a href="${D.meta.links.airroiMorocco}" target="_blank" rel="noopener">AirROI</a>, snapshot taken ${D.meta.snapshot}. ${fxNote}`;
  $('#cur').innerHTML = Object.keys(SYM).map(c => `<button type="button" data-c="${c}" aria-pressed="${c === state.cur}">${c}</button>`).join('');
  document.querySelectorAll('.cur-code').forEach(e => e.textContent = state.cur);
}

function renderOverview(){
  $('#ov-h').textContent = `${state.mcity} market in numbers`;
  $('#ov-dek').textContent = `Measured by AirROI across every active ${state.mcity} listing, 12 months to October 2026.`;
  $('#mk-bar').hidden = MCITIES.length < 2;
  $('#mk-city').innerHTML = MCITIES.map(c => `<button type="button" data-mc="${esc(c)}" aria-pressed="${c === state.mcity}">${esc(c)}</button>`).join('');
  const tiles = [
    { label: 'Annual revenue per listing', value: money(K.revenue), foot: `${K.revenueYoY != null ? deltaHtml(K.revenueYoY) + ' on the year before · ' : ''}Morocco ${money(K.moroccoRevenue, true)}` },
    { label: 'Occupancy', value: pct(K.occupancy, 1), foot: `of open nights booked · Morocco ${K.moroccoOccupancy}%` },
    { label: 'Average nightly rate', value: money(K.adr), foot: `per booked night · Morocco ${money(K.moroccoAdr)}` },
    { label: 'RevPAR', value: money(K.revpar), foot: 'revenue per open night, booked or not' }
  ];
  $('#kpis').innerHTML = tiles.map(t => `<div class="card tile"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="foot">${t.foot}</div></div>`).join('');
  const facts = [
    ['Active listings', nf0.format(K.listings), K.listingsYoY != null ? `${signed(K.listingsYoY)} on the year before` : 'in the 12 months'],
    ['Median listing', money(K.medianMonthly), 'per month'],
    ['Average stay', K.stay + ' nights', `about ${K.bookingsPerListing} bookings a year`],
    ['Booked ahead', K.leadTime + ' days', 'on average'],
    ['Guest rating', K.rating.toFixed(2) + ' / 5', `${K.guestFavorite}% are Guest Favorites`],
    ['Superhosts', K.superhosts + '%', 'of listings']
  ];
  $('#facts').innerHTML = facts.map(f => `<div><dt>${f[0]}</dt><dd>${f[1]}<small>${f[2]}</small></dd></div>`).join('');
  const L = D.meta.links;
  $('#xcheck-card').hidden = !R.crossCheck; // the second source was only read for Rabat
  if (R.crossCheck) $('#xcheck').innerHTML = `<thead><tr><th></th><th class="num"><a href="${L.airroiRabat}" target="_blank" rel="noopener">AirROI</a></th><th class="num"><a href="${L.airbticsRabat}" target="_blank" rel="noopener">Airbtics</a></th><th>How they differ</th></tr></thead><tbody>` +
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
  const sv = R.seasonality.map(r => r.revenue), swing = Math.max.apply(null, sv) / Math.min.apply(null, sv);
  $('#trends-dek').textContent = `In ${state.mcity}, ${K.peakMonth} is usually the best month and ${K.lowMonth} the slowest: a typical ${K.peakMonth} brings in about ${swing.toFixed(1)} times what a typical ${K.lowMonth} does.`;
  $('#metric').innerHTML = Object.keys(METRICS).map(k => `<button type="button" data-m="${k}" aria-pressed="${k === state.metric}">${METRICS[k].label}</button>`).join('');
  $('#metric-sub').textContent = m.sub + ', October 2025 to September 2026';
  const vals = mo.map(r => m.type === 'money' ? toCur(r[state.metric]) : r[state.metric]);
  lineChart($('#chart-monthly'), {
    values: vals, type: m.type, fmt: m.fmt, aria: m.sub + ' by month',
    labels: mo.map((r, i) => { const p = r.m.split(' '); return (i === 0 || p[0] === 'Jan') ? p[0] + ' ' + p[1].slice(2) : p[0]; }),
    full: mo.map(r => r.m)
  });
  $('#tbl-monthly').innerHTML = '<thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Occupancy</th><th class="num">Nightly rate</th><th class="num">RevPAR</th><th class="num">Lead time</th><th class="num">Stay</th></tr></thead><tbody>' +
    mo.map(r => `<tr><td>${esc(r.m)}</td><td class="num">${money(r.revenue)}</td><td class="num">${r.occ.toFixed(1)}%</td><td class="num">${money(r.adr)}</td><td class="num">${money(r.revpar)}</td><td class="num">${r.lead} days</td><td class="num">${r.los} nights</td></tr>`).join('') + '</tbody>';
  const se = R.seasonality, seVals = se.map(r => toCur(r.revenue)), seBig = Math.max.apply(null, seVals) >= 10000;
  columnChart($('#chart-season'), {
    values: seVals, labels: se.map(r => r.m), type: 'money', fmt: v => seBig ? trim(v / 1000, 1) + 'k' : nf0.format(Math.round(v)),
    aria: 'Average revenue per listing by calendar month',
    tip: i => `<b>${esc(se[i].m)}</b> · ${esc(se[i].season)} season<br>${money(se[i].revenue)} per listing`
  });
  $('#tbl-seasons').innerHTML = '<thead><tr><th>Season</th><th class="num">Revenue / month</th><th class="num">Occupancy</th><th class="num">Nightly rate</th></tr></thead><tbody>' +
    R.seasons.map(s => `<tr><td>${esc(s.name)}<span class="minor">${esc(s.months)}</span></td><td class="num">${money(s.revenue)}</td><td class="num">${s.occ}%</td><td class="num">${money(s.adr)}</td></tr>`).join('') + '</tbody>';
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
    R.spread.map(r => `<tr><td>${esc(r.metric)}</td><td class="num">${f(r, r.p25)} or less</td><td class="num"><b>${f(r, r.p50)}</b></td><td class="num">${f(r, r.p75, '+')}</td><td class="num">${f(r, r.p90, '+')}</td><td>${spreadSvg(r)}</td></tr>`).join('') + '</tbody>';
}

function renderSize(){
  const b = R.bedrooms, known = b.filter(r => r.median != null), max = Math.max.apply(null, known.map(r => r.median)), top = b.slice().sort((a, c) => c.listings - a.listings)[0];
  const groupName = { 'Studio': 'Studios', '1 bedroom': 'One-bedroom homes', '2 bedrooms': 'Two-bedroom homes', '3 bedrooms': 'Three-bedroom homes' }[top.size] || top.size;
  $('#size-dek').textContent = `${groupName} are the largest group in ${state.mcity} at ${Math.round(top.share)}% of entire homes. Bigger homes charge more a night.` + (known.length < b.length ? ' AirROI gives earnings only for the sizes with enough listings to measure.' : '');
  $('#tbl-beds').innerHTML = '<thead><tr><th>Home size</th><th class="num">Listings</th><th>Median annual revenue</th><th class="num">Average annual revenue</th><th class="num">Nightly rate</th><th class="num">Occupancy</th></tr></thead><tbody>' +
    b.map(r => `<tr><td>${esc(r.size)}</td><td class="num">${nf0.format(r.listings)}<span class="minor">${r.share}%</span></td>` + (r.median != null
      ? `<td><div class="inbar" title="${esc(r.size)}: median ${esc(money(r.median))} a year"><div class="fill" style="flex:0 0 ${(r.median / max * 62).toFixed(1)}%"></div><span class="v">${money(r.median)}</span></div></td><td class="num">${money(r.avg)}</td><td class="num">${money(r.adr)}</td><td class="num">${r.occ}%</td>`
      : '<td style="color:var(--ink2)">Too few listings to measure</td><td class="num">–</td><td class="num">–</td><td class="num">–</td>') + '</tr>').join('') + '</tbody>';
}

function renderCalc(init){
  const size = $('#c-size'), basis = $('#c-basis'), mgmt = $('#c-mgmt'), price = $('#c-price'), custom = $('#c-custom');
  if (renderCalc.city !== state.mcity) { // sizes on offer are the ones this city has earnings for
    const opts = R.bedrooms.map((r, i) => [r, i]).filter(o => o[0].median != null), two = opts.filter(o => o[0].size === '2 bedrooms')[0] || opts[0];
    size.innerHTML = opts.map(o => `<option value="${o[1]}">${esc(o[0].size)}</option>`).join(''); size.value = String(two[1]);
    renderCalc.city = state.mcity;
  }
  if (init) {
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
    ["Airbnb's fee", (c.airbnbFee * 100).toFixed(1) + '%', G * c.airbnbFee],
    ['Cleaning and laundry', (c.cleaning * 100).toFixed(1) + "%, covered by guests' cleaning fees", G * c.cleaning],
    ['Utilities and internet', '5%', G * c.utilities],
    ['Guest supplies', '2%', G * c.supplies],
    ['Repairs and upkeep', '3%', G * c.upkeep],
    ['Insurance and permit', 'fixed', G > 0 ? c.fixed : 0]
  ];
  if (mg) lines.push(['Management', Math.round(mg * 100) + '% of nightly bookings', G * (1 - c.cleaning) * mg]);
  const costs = lines.reduce((a, l) => a + l[2], 0), net = G - costs;
  $('#c-ledger').innerHTML = `<tbody><tr><td>Gross bookings per year<span class="minor">${basis.value === 'custom' ? 'your estimate' : (basis.value === 'median' ? 'median ' : 'average ') + esc(b.size.toLowerCase()) + ' in ' + esc(state.mcity)}</span></td><td class="num"><b>${money(G)}</b></td></tr>` +
    lines.map(l => `<tr><td>${l[0]}<span class="minor">${l[1]}</span></td><td class="num">−${money(l[2])}</td></tr>`).join('') +
    `<tr class="total"><td>Left before housing costs<span class="minor" style="font-weight:400">about ${money(net / 12)} a month</span></td><td class="num">${money(net)}</td></tr></tbody>`;
  const p = state.calc.priceMAD;
  $('#c-yields').innerHTML = p > 0
    ? `<div class="y"><div class="label">Gross yield</div><div class="value">${(G / p * 100).toFixed(1)}%</div></div><div class="y"><div class="label">Yield after running costs</div><div class="value">${(net / p * 100).toFixed(1)}%</div></div>`
    : '';
}

// Bars are drawn against a fixed top value so cities compare; it grows if a city's biggest share would not fit.
const scaleTop = (rows, floor) => Math.max(floor, Math.ceil(Math.max.apply(null, rows.map(r => r.share)) / 5) * 5);
function renderSupply(){
  const apt = R.propertyTypes.filter(r => /Apartment/.test(r.label))[0] || R.propertyTypes[0], whole = R.roomTypes.filter(r => /Entire/.test(r.label))[0] || R.roomTypes[0];
  $('#supply-dek').textContent = `${state.mcity} is an apartment market: ${Math.round(apt.share)}% of listings are apartments or condos and ${Math.round(whole.share)}% are entire homes. Most listings are open most of the year, but few are booked for more than half of it.`;
  barList('#bl-prop', R.propertyTypes, 100, shareFmt, nTitle);
  barList('#bl-cap', R.capacity, scaleTop(R.capacity, 30), shareFmt, nTitle);
  barList('#bl-min', R.minStay, scaleTop(R.minStay, 55), shareFmt, nTitle);
  barList('#bl-booked', R.bookedDays, scaleTop(R.bookedDays, 30), shareFmt, nTitle);
  barList('#bl-cancel', R.cancellation, scaleTop(R.cancellation, 45), shareFmt, nTitle);
  barList('#bl-amen', R.amenities, 100, shareFmt, nTitle);
  $('#tbl-amen').innerHTML = '<thead><tr><th>Amenity</th><th class="num">Listings with it</th><th class="num">Avg. revenue with</th><th class="num">Avg. revenue without</th><th class="num">Gap</th></tr></thead><tbody>' +
    R.amenityGap.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${r.have}%</td><td class="num">${money(r.withRev)}</td><td class="num">${money(r.withoutRev)}</td><td class="num">+${r.gap}%</td></tr>`).join('') + '</tbody>';
}

function renderGuests(){
  const g = R.guestCountries;
  $('#guests-dek').textContent = `${state.mcity} runs on foreign visitors: ${K.international}% of guests who left reviews live outside Morocco, and ${g[0].label} alone accounts for ${Math.round(g[0].share)}%.`;
  barList('#bl-country', g, scaleTop(g, 40), r => r.share + '%', nTitle);
  barList('#bl-lang', R.guestLanguages, scaleTop(R.guestLanguages, 40), r => r.share + '%', nTitle);
  barList('#bl-rate', R.ratings.map(r => ({ label: r.label, score: r.score, _v: r.score - 4 })), 1, r => r.score.toFixed(2), r => `${r.label}: ${r.score.toFixed(2)} out of 5`);
}

function renderTop(){
  const t = R.topListings[0], big = R.topListings.filter(r => r.beds >= 4).length;
  $('#top-dek').textContent = `The best listing in ${state.mcity} grossed ${money(t.revenue, true)}, about ${Math.round(t.revenue / K.revenue)} times the city average. ${big ? `${big} of the ${R.topListings.length} top earners ${big === 1 ? 'has' : 'have'} four or more bedrooms.` : ''}`;
  $('#tbl-listings').innerHTML = '<thead><tr><th>Listing</th><th class="num">Revenue</th><th class="num">Occupancy</th><th class="num">Nightly rate</th></tr></thead><tbody>' +
    R.topListings.map(r => `<tr><td>${esc(r.name)}<span class="minor">${esc(r.kind || 'Entire home')}${r.beds ? ' · ' + r.beds + ' bedroom' + (r.beds === 1 ? '' : 's') : ''}${r.rating ? ' · rated ' + r.rating.toFixed(2) : ''}</span></td><td class="num">${money(r.revenue, true)}</td><td class="num">${r.occ.toFixed(1)}%</td><td class="num">${money(r.adr)}</td></tr>`).join('') + '</tbody>';
  $('#tbl-hosts').innerHTML = '<thead><tr><th>Host</th><th class="num">Listings</th><th class="num">Gross revenue</th><th class="num">Per listing</th><th class="num">Rating</th></tr></thead><tbody>' +
    R.topHosts.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.listings}</td><td class="num">${money(r.revenue, true)}</td><td class="num">${money(r.per, true)}</td><td class="num">${r.rating.toFixed(2)}</td></tr>`).join('') + '</tbody>';
  $('#atlas-note').textContent = `These are the top earners as measured by AirROI. The map at the top of the page has ${LS ? nf0.format(LS.items.filter(l => l.city === state.mcity).length) : 'the'} ${state.mcity} listings, each with its own estimated revenue and occupancy.`;
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
// The chosen city's row in the Morocco table, and how far other markets are from it. For Rabat the distances
// are AirROI's own; for the other cities they are straight lines between the approximate town centres.
const homeMarket = () => M.markets.filter(m => m.name === state.mcity)[0] || M.markets.filter(m => m.name === 'Rabat')[0];
function kmFrom(m){
  const h = homeMarket(); if (m === h) return 0;
  if (h.name === 'Rabat') return m.km != null ? m.km : null;
  const r = Math.PI / 180, a = Math.pow(Math.sin((m.lat - h.lat) * r / 2), 2) + Math.cos(m.lat * r) * Math.cos(h.lat * r) * Math.pow(Math.sin((m.lng - h.lng) * r / 2), 2);
  const km = Math.round(12742 * Math.asin(Math.sqrt(a)));
  return km <= 45 ? km : null;
}
const kmNote = m => { const k = kmFrom(m); return k ? ` · ${homeMarket().name === 'Rabat' ? '' : 'about '}${k} km from ${homeMarket().name}` : ''; };
function popupHtml(m){
  return `<b>${esc(m.name)}</b><div class="r">${esc(m.region)}${esc(kmNote(m))}${m.rank ? ' · ranked ' + m.rank + ' of ' + M.totals.ranked : ''}</div><table>` +
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
    const mk = L.circleMarker([m.lat, m.lng], { radius: 4 + Math.sqrt(m.listings) / 4.2, fillColor: BINCOL[binOf(m.revenue)], fillOpacity: .88, color: '#fff', weight: 2 }).addTo(map);
    mk.bindPopup(() => popupHtml(m), popW);
    mk.on('popupopen', () => mk.closeTooltip());
    markers[m.name] = mk;
  });
  setView('rabat');
  markCity();
  // Once the reader pans, zooms or jumps to a market, neither preset view is current.
  map.on('dragstart zoomstart', () => { if (state.view && !state.moving) setView(null); });
}
// Ring and label the chosen city's marker; every other marker shows its name on hover.
function markCity(){
  if (!map || !map._loaded) return; // markers can only be restyled once the map has a view
  M.markets.forEach(m => {
    const mk = markers[m.name]; if (!mk) return;
    const on = m.name === homeMarket().name;
    mk.setStyle({ color: on ? '#0b0b0b' : '#fff', weight: on ? 3 : 2 });
    mk.unbindTooltip();
    if (on) { mk.bindTooltip(esc(m.name), { permanent: true, direction: 'top', offset: [0, -12], className: 'mk-label' }); mk.bringToFront(); }
    else mk.bindTooltip(() => `${esc(m.name)} · ${money(m.revenue, true)}`, { direction: 'top' });
  });
}
function setView(v){
  state.view = v;
  $('#map-view').innerHTML = [['rabat', esc(state.mcity) + ' area'], ['all', 'All Morocco']].map(o => `<button type="button" data-v="${o[0]}" aria-pressed="${o[0] === v}">${o[1]}</button>`).join('');
  if (!map || !v) return;
  state.moving = true;
  if (v === 'rabat') { const h = homeMarket(); map.setView(h.name === 'Rabat' ? [34.03, -6.88] : [h.lat, h.lng], 10, { animate: false }); }
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
  const T = M.totals, home = homeMarket(), diff = Math.round((K.revenue / T.revenue - 1) * 100);
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][n % 10]);
  const bySize = M.markets.filter(m => m.rank).sort((a, b) => b.listings - a.listings).indexOf(home) + 1;
  $('#morocco-h').textContent = `${state.mcity} against the rest of Morocco`;
  $('#morocco-dek').textContent = `AirROI ranks ${home.name} ${ord(home.rank)} of ${T.ranked} Moroccan markets with 100 or more listings. Its listings earn about ${Math.abs(diff)}% ${diff < 0 ? 'less' : 'more'} than the national average of ${money(T.revenue, true)}, and it is the ${bySize === 1 ? '' : ord(bySize) + ' '}largest of those markets by number of listings.`;
  $('#mk-filter').innerHTML = [['all', 'All markets'], ['near', 'Near ' + esc(state.mcity)]].map(o => `<button type="button" data-f="${o[0]}" aria-pressed="${o[0] === state.filter}">${o[1]}</button>`).join('');
  const { key, dir } = state.sort;
  const rows = M.markets.filter(m => state.filter === 'all' || kmFrom(m) != null).sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir;
  });
  $('#tbl-markets').innerHTML = '<thead><tr>' + COLS.map(c => `<th class="${c[2] ? 'num' : ''}" aria-sort="${key === c[0] ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-btn" data-k="${c[0]}">${c[1]}<span class="arrow">${key === c[0] ? (dir > 0 ? '▲' : '▼') : ''}</span></button></th>`).join('') + '</tr></thead><tbody>' +
    rows.map(m => `<tr class="clickable${m.name === home.name ? ' is-rabat' : ''}" data-n="${esc(m.name)}" tabindex="0"><td class="num">${m.rank || '–'}</td><td>${esc(m.name)}<span class="minor">${esc(m.region)}${esc(kmNote(m))}</span></td><td class="num">${money(m.revenue)}</td><td class="num">${m.occ}%</td><td class="num">${money(m.adr)}</td><td class="num">${m.slow != null ? m.slow + '%' : '–'}</td><td class="num">${deltaHtml(m.yoy)}</td><td class="num">${nf0.format(m.listings)}</td></tr>`).join('') + '</tbody>';
}
function focusMarket(name){
  const mk = markers[name]; if (!mk || !map) return;
  setView(null);
  $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  // The bundled basemap is only sharp at this zoom around Rabat; elsewhere stay one step out.
  const mkt = M.markets.find(x => x.name === name);
  showMarker(map, mk, BUNDLED && (!mkt || mkt.km == null) ? 8 : 10);
}

/* ---------- Explorer: Rabat listings on the map (optional: listings.js) ---------- */
// listings.js carries text written by strangers (anyone can name a listing anything), so none of it is
// trusted: every field is forced to its expected type here, and strings are escaped again where shown.
// The cities on the map: where to centre each one, and its name in the market table further down.
const CITY_VIEW = { 'Rabat': [34.0, -6.85, 13], 'Salé': [34.045, -6.765, 13], 'Kenitra': [34.262, -6.585, 13], 'Tangier': [35.768, -5.825, 13] };
const isCity = c => typeof c === 'string' && Object.prototype.hasOwnProperty.call(CITY_VIEW, c);
function cleanListings(raw){
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const num = v => typeof v === 'number' && isFinite(v) ? v : null;
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : null;
  const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  const NUMS = ['lat', 'lng', 'bedrooms', 'beds', 'baths', 'guests', 'rating', 'reviews', 'adr', 'rev', 'potMonth', 'occ', 'since', 'availDays', 'bookedDays', 'calNights', 'calTaken', 'calOcc'];
  const seen = Object.create(null), items = [];
  raw.items.forEach(l => {
    if (!l || typeof l !== 'object') return;
    const id = typeof l.id === 'string' || typeof l.id === 'number' ? String(l.id).slice(0, 40) : '';
    if (!id || seen[id]) return;
    seen[id] = 1;
    const o = { id: id, name: str(l.name, 200), type: str(l.type, 60), room: str(l.room, 30), city: isCity(l.city) ? l.city : 'Rabat', priceDate: day(l.priceDate),
      cal: typeof l.cal === 'string' && /^[acx]{1,400}$/.test(l.cal) ? l.cal : null,
      isNew: l.isNew === true, fav: l.fav === true, superhost: l.superhost === true, priceOdd: l.priceOdd === true, exact: l.exact === false ? false : undefined };
    NUMS.forEach(k => { o[k] = num(l[k]); });
    items.push(o);
  });
  if (!items.length) return null;
  const m = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  return { items: items, meta: { source: m.source === 'airbnb' ? 'airbnb' : 'airroi', pulledAt: day(m.pulledAt),
    currency: ['GBP', 'MAD', 'EUR', 'USD'].indexOf(m.currency) >= 0 ? m.currency : 'MAD',
    totalInMarket: num(m.totalInMarket), sort: str(m.sort, 40), calFrom: day(m.calFrom), calTo: day(m.calTo), calCount: num(m.calCount),
    cities: Object.keys(CITY_VIEW).reduce((acc, c) => { const v = m.cities && typeof m.cities === 'object' && m.cities[c] && typeof m.cities[c] === 'object' ? m.cities[c] : {};
      acc[c] = { openNights: num(v.openNights), topQuarterOcc: num(v.topQuarterOcc) }; return acc; }, {}) } };
}
const LS = cleanListings(window.STR_LISTINGS);
// Two possible sources. 'airbnb': read from Airbnb's public map search; price, rating and reviews are as
// shown there, and occupancy and revenue are estimates. Otherwise AirROI's API, with its own measured figures.
const AB = !!LS && LS.meta.source === 'airbnb';
const CITIES = LS ? Object.keys(CITY_VIEW).filter(c => LS.items.some(l => l.city === c)) : [];
const MULTI = CITIES.length > 1;
const GREY = '#c3c2b7';
const lstate = { beds: 'any', show: 'all', sort: 'rev', page: 0, per: 12, hold: false, city: 'Rabat', only: null };
let lmap = null, dotLayer = null, pinLayer = null, pins = Object.create(null);
const lmarkers = Object.create(null), byId = Object.create(null), saved = Object.create(null);
try { (JSON.parse(localStorage.getItem('str-saved') || '[]') || []).forEach(id => { if (typeof id === 'string') saved[id] = 1; }); } catch (e) {}
// Dates in the file are plain calendar days; read them as local midnight so they do not shift by time zone.
const lDay = d => d ? new Date(d + 'T00:00:00') : new Date(NaN);
const lAge = () => Math.floor((Date.now() - lDay(LS.meta.pulledAt).getTime()) / 864e5);
const lFresh = () => !!LS && (AB || lAge() <= 30); // AirROI's API terms cap storage at 30 days
const lWhen = () => LS.meta.pulledAt ? lDay(LS.meta.pulledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date';
// Listing money arrives in the currency named in the file (pounds from Airbnb, dirhams from AirROI).
const lMAD = v => { if (v == null) return null; const c = LS.meta.currency; return c && c !== 'MAD' && state.rates[c] ? v / state.rates[c] : v; };
const lMoney = (v, c) => v == null ? '–' : money(lMAD(v), c);
const median = a => { const s = a.filter(v => v != null).sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const shortDate = d => d ? lDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const isRoom = l => l.room === 'private_room' || l.room === 'shared_room';
const bedMatch = l => lstate.beds === 'any' || (lstate.beds === 'room' ? isRoom(l) : !isRoom(l) && (lstate.beds === 'unknown' ? l.bedrooms == null : lstate.beds === '5' ? l.bedrooms >= 5 : l.bedrooms === +lstate.beds));
const showMatch = l => lstate.show === 'all' || (lstate.show === 'est' ? l.occ != null : lstate.show === 'r10' ? (l.reviews || 0) >= 10 : !!saved[l.id]);
function bedChips(){
  const has = f => LS.items.some(f), chips = [['any', 'Any']];
  [[0, 'Studio'], [1, '1'], [2, '2'], [3, '3'], [4, '4']].forEach(c => { if (has(l => !isRoom(l) && l.bedrooms === c[0])) chips.push([String(c[0]), c[1]]); });
  if (has(l => !isRoom(l) && l.bedrooms >= 5)) chips.push(['5', '5+']);
  if (has(isRoom)) chips.push(['room', 'Rooms']);
  if (has(l => !isRoom(l) && l.bedrooms == null)) chips.push(['unknown', 'Not stated']);
  return chips;
}
const occColor = l => l.occ == null ? GREY : BINCOL[l.occ < 25 ? 0 : l.occ < 50 ? 1 : l.occ < 75 ? 2 : 3];
const kind = l => (isRoom(l) ? 'Private room' : 'Entire ' + (l.type ? l.type.toLowerCase() : 'home')) + (isRoom(l) || l.bedrooms == null ? '' : l.bedrooms === 0 ? ' · studio' : ' · ' + l.bedrooms + ' bed');
const stars = l => l.rating ? '★ ' + (+l.rating).toFixed(2) + ' (' + nf0.format(l.reviews || 0) + ')' : l.isNew ? 'New' : 'No rating yet';
const EST = AB ? ' <abbr title="An estimate, not a measurement. See the note under the list.">est.</abbr>' : '';
// The five figures a card and a popup show, already formatted.
function figures(l){
  return {
    pot: l.potMonth != null ? lMoney(l.potMonth) : '–',
    open: AB ? (l.calNights != null && l.calTaken != null ? (l.calNights - l.calTaken) + ' of ' + l.calNights : '–') : (l.availDays != null ? nf0.format(l.availDays) : '–'),
    rev: l.rev != null ? lMoney(l.rev) : '–',
    occ: l.occ != null ? Math.round(l.occ) + '%' : '–',
    adr: lMoney(l.adr)
  };
}
const OPEN_LABEL = AB ? 'Nights open, next 6 weeks' : 'Days available';
const airbnbLink = (l, cls) => /^\d+$/.test(l.id) ? `<a${cls ? ' class="' + cls + '"' : ''} href="https://www.airbnb.co.uk/rooms/${l.id}" target="_blank" rel="noopener">View on Airbnb</a>` : '';
function cardHtml(l){
  const f = figures(l);
  return `<article class="lcard" data-card="${esc(l.id)}" tabindex="0">` +
    `<header><span class="lc-kind">${esc(kind(l))}</span><span class="lc-stars">${esc(stars(l))}</span></header>` +
    `<p class="lc-name">${MULTI ? esc(l.city) + ' · ' : ''}${esc(l.name || 'Listing')}</p>` +
    `<div class="lc-row two"><div class="m"><b>${f.pot}</b><span>Revenue potential, a month</span></div><div class="m"><b>${f.open}</b><span>${OPEN_LABEL}</span></div></div>` +
    `<div class="lc-row three"><div class="m key"><b>${f.rev}</b><span>Revenue, a year${EST}</span></div><div class="m key"><b>${f.occ}</b><span>Occupancy rate${EST}</span></div><div class="m key"><b>${f.adr}</b><span>Daily rate</span></div></div>` +
    (l.priceOdd ? '<p class="lc-why">The rate is far above others of its size in this city, so no revenue is worked out from it.</p>' : AB && l.occ == null ? '<p class="lc-why">Too few reviews to estimate revenue or occupancy.</p>' : '') +
    `<div class="lc-actions">${airbnbLink(l, 'btn')}<button type="button" class="btn ghost" data-save="${esc(l.id)}" aria-pressed="${!!saved[l.id]}">${saved[l.id] ? '♥ Saved' : '♡ Save'}</button></div></article>`;
}
function lPopup(l){
  const f = figures(l), since = l.since ? ' · listed ' + Math.floor(l.since) : '';
  const rows = [['Revenue, a year' + (AB ? ' (est.)' : ''), f.rev], ['Occupancy rate' + (AB ? ' (est.)' : ''), f.occ],
    ['Daily rate', f.adr + (l.priceDate ? ' <span style="color:#52514e">on ' + shortDate(l.priceDate) + '</span>' : '')], ['Revenue potential, a month', f.pot], [OPEN_LABEL, f.open]];
  const tags = [l.fav ? 'Guest favourite' : null, l.superhost ? 'Superhost' : null, l.exact === false ? 'approximate location' : null].filter(Boolean).join(' · ');
  return `<b>${esc(l.name || 'Listing')}</b><div class="r">${MULTI ? esc(l.city) + ' · ' : ''}${esc(kind(l))} · ${esc(stars(l))}${since}${tags ? ' · ' + tags : ''}</div><table>` +
    rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>' +
    (l.cal && LS.meta.calFrom && LS.meta.calTo ? `<div class="calstrip" role="img" aria-label="Nights taken and free, ${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)}">${l.cal.split('').map(ch => `<i class="${ch === 'a' ? '' : 't'}"></i>`).join('')}</div><div class="r" style="margin:3px 0 0">${shortDate(LS.meta.calFrom)} to ${shortDate(LS.meta.calTo)} · dark = taken</div>` : '') +
    airbnbLink(l, '');
}
// Listings that pass the filters and sit inside the map view, best first.
const cityMatch = l => !lstate.only || l.city === lstate.only;
// The box that holds the middle 94% of a city's listings: where the map goes when that city is picked.
function cityBox(c){
  const pts = LS.items.filter(l => l.city === c && typeof l.lat === 'number' && typeof l.lng === 'number');
  if (!pts.length) return null;
  const at = (k, q) => { const a = pts.map(l => l[k]).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
  return [[at('lat', 0.03), at('lng', 0.03)], [at('lat', 0.97), at('lng', 0.97)]];
}
function listNow(){
  const b = lmap ? lmap.getBounds() : null, k = lstate.sort;
  const rows = LS.items.filter(l => cityMatch(l) && bedMatch(l) && showMatch(l) && (!b || (typeof l.lat === 'number' && typeof l.lng === 'number' && b.contains([l.lat, l.lng]))));
  rows.sort((x, y) => { const a = x[k], c = y[k]; if (a == null && c == null) return (y.reviews || 0) - (x.reviews || 0); if (a == null) return 1; if (c == null) return -1; return c - a; });
  return rows;
}
function highlight(id, on){
  const p = pins[id] && pins[id].getElement(); if (p && p.firstChild) p.firstChild.classList.toggle('on', on);
  document.querySelectorAll('.lcard').forEach(c => { if (c.dataset.card === id) c.classList.toggle('on', on); });
}
function openListing(id){
  const mk = lmarkers[id]; if (!mk || !lmap) return;
  lstate.hold = true; // keep the list as it is while the map nudges itself to fit the popup
  if (!dotLayer.hasLayer(mk)) dotLayer.addLayer(mk);
  mk.openPopup();
}
function syncDots(){
  if (!dotLayer) return;
  dotLayer.clearLayers();
  LS.items.filter(l => cityMatch(l) && bedMatch(l) && showMatch(l)).sort((a, b) => (a.occ == null ? -1 : a.occ) - (b.occ == null ? -1 : b.occ)).forEach(l => {
    const mk = lmarkers[l.id]; if (mk) { mk.setStyle({ fillColor: occColor(l) }); dotLayer.addLayer(mk); }
  });
}
function syncList(){
  if (!lFresh()) return;
  const rows = listNow(), pages = Math.max(1, Math.ceil(rows.length / lstate.per));
  lstate.page = Math.max(0, Math.min(lstate.page, pages - 1));
  const page = rows.slice(lstate.page * lstate.per, (lstate.page + 1) * lstate.per);
  $('#ex-badge').innerHTML = `<b>${nf0.format(rows.length)} listing${rows.length === 1 ? '' : 's'} in this area</b><span>${rows.length > page.length ? 'Price pins mark the ' + page.length + ' listed on this page' : 'Zoom or drag the map to change the list'}</span>`;
  $('#cards').innerHTML = page.length ? page.map(cardHtml).join('') : '<p class="note">No listings match in this part of the map. Zoom out, or change the filters.</p>';
  $('#pager').innerHTML = pages > 1 ? `<button type="button" class="more-btn" data-pg="-1"${lstate.page === 0 ? ' disabled' : ''}>Previous</button><span>Page ${lstate.page + 1} of ${nf0.format(pages)}</span><button type="button" class="more-btn" data-pg="1"${lstate.page >= pages - 1 ? ' disabled' : ''}>Next</button>` : '';
  if (pinLayer) {
    pinLayer.clearLayers(); pins = Object.create(null);
    page.forEach(l => {
      if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return;
      const mk = L.marker([l.lat, l.lng], { icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pin">${esc(lMoney(l.adr))}</span>`, iconSize: null }), zIndexOffset: 500, keyboard: false });
      mk.on('click', () => openListing(l.id)).on('mouseover', () => highlight(l.id, true)).on('mouseout', () => highlight(l.id, false));
      pinLayer.addLayer(mk); pins[l.id] = mk;
    });
  }
  const est = rows.filter(l => l.occ != null), mo = median(est.map(l => l.occ));
  // Which city is the map on? The one most of the listings in view belong to.
  const tally = Object.create(null); rows.forEach(l => { tally[l.city] = (tally[l.city] || 0) + 1; });
  // Which city is this about? The one picked with the buttons, or else the one most listings in view belong to.
  const here = lstate.only || Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || lstate.city || 'Rabat';
  lstate.city = here;
  $('#city-go').hidden = !MULTI;
  $('#city-go').innerHTML = `<button type="button" data-city="all" aria-pressed="${!lstate.only}">All</button>` + CITIES.map(c => `<button type="button" data-city="${esc(c)}" aria-pressed="${c === lstate.only}">${esc(c)}</button>`).join('');
  const mkt = M.markets.find(x => x.name === lstate.city);
  $('#area').innerHTML = `<h3>Map area overview${MULTI ? ': ' + esc(lstate.city) : ''}</h3><p class="sub">The ${nf0.format(rows.length)} ${lstate.only ? esc(lstate.only) + ' ' : ''}listing${rows.length === 1 ? '' : 's'} in view${AB ? '; revenue and occupancy from the ' + nf0.format(est.length) + ' with three or more reviews' : ''}.</p>` +
    `<div class="ov"><div><span>Occupancy rate</span><b>${mo != null ? Math.round(mo) + '%' : '–'}</b><small>median${AB ? ', estimated' : ''}</small></div>` +
    `<div><span>Revenue</span><b>${lMoney(median(est.map(l => l.rev)))}</b><small>median a year${AB ? ', estimated' : ''}</small></div>` +
    `<div><span>Nightly rate</span><b>${lMoney(median(rows.map(l => l.adr)))}</b><small>median</small></div>` +
    `<div><span>Active listings</span><b>${nf0.format(rows.length)}</b><small>in view</small></div></div>` +
    (mkt ? `<p class="note">Whole ${esc(mkt.name)} market, measured by AirROI: ${MK[mkt.name] ? MK[mkt.name].kpi.occupancy : mkt.occ}% occupancy, ${money(mkt.revenue)} average revenue a year, ${money(mkt.adr)} a night, ${nf0.format(mkt.listings)} listings.</p>` : '');
}
function renderExplorer(){
  if (!lFresh()) return;
  const all = LS.items, nEst = all.filter(l => l.occ != null).length;
  const counts = CITIES.map(c => `${nf0.format(all.filter(l => l.city === c).length)} in ${c}`);
  $('#listings-dek').textContent = AB
    ? `${nf0.format(all.length)} listings read from Airbnb's public map search in November 2026: ${counts.length > 1 ? counts.slice(0, -1).join(', ') + ' and ' + counts[counts.length - 1] : counts[0]}. ${nf0.format(nEst)} have enough reviews for a revenue and occupancy estimate.`
    : `${nf0.format(all.length)} listings pulled from AirROI's API on ${lWhen()}.`;
  $('#bed-filter').innerHTML = bedChips().map(b => `<button type="button" data-b="${b[0]}" aria-pressed="${b[0] === lstate.beds}">${b[1]}</button>`).join('');
  $('#llegend').innerHTML = $('#llegend-m').innerHTML = `<span class="box-label">Occupancy rate${AB ? ', estimated' : ''}</span>` + ['Under 25%', '25 to 50%', '50 to 75%', '75% and over'].map((t, i) => `<span><span class="sw" style="background:${BINCOL[i]}"></span>${t}</span>`).join('') + `<span><span class="sw" style="background:${GREY}"></span>No estimate</span>`;
  $('#listings-note').textContent = AB
    ? `Revenue and occupancy are estimates, not measurements. Each listing is ranked within its city by how often it is reviewed for its age (the age comes from its Airbnb ID), then given the occupancy that AirROI's data for that city shows at that rank. Revenue, a year, is the daily rate × that occupancy × the nights a listing in that city is open on average (${CITIES.map(c => (LS.meta.cities[c].openNights || 243) + ' in ' + c).join(', ')}). Revenue potential, a month, is the daily rate × a month of nights at the occupancy the top quarter of that city's listings reach (${CITIES.map(c => (LS.meta.cities[c].topQuarterOcc || 62) + '% in ' + c).join(', ')}). The daily rate is the one-night price Airbnb showed in late November for the first night the listing had free, so it is a spot price; a rate more than four times the norm for its size and city (eight times, for a listing with ten or more reviews) is treated as a placeholder and no revenue is worked out from it. Listings with fewer than three reviews get no revenue or occupancy estimate.`
    : 'Revenue, occupancy and rate cover the trailing twelve months, as measured by AirROI.';
  syncDots(); syncList();
}
function initListings(){
  const setup = $('#listings-setup'), ex = $('#ex');
  if (!lFresh()) {
    ex.hidden = true; setup.hidden = false;
    setup.innerHTML = LS
      ? `<h3>This pull is ${isNaN(lAge()) ? 'undated' : lAge() + ' days old'}</h3><p class="sub">AirROI's API terms limit how long pulled data may be kept to 30 days, so the listings are hidden until it is refreshed.</p>` +
        `<p>Run <code>python3 fetch_listings.py --restart</code> in the <code>morocco-str</code> folder, then reload this page.</p>`
      : '<h3>No listings loaded</h3><p class="sub">The file <code>listings.js</code> is empty, so there is nothing to put on the map. The market figures below are unaffected.</p>';
    return;
  }
  setup.hidden = true; ex.hidden = false;
  LS.items.forEach(l => { byId[l.id] = l; });
  $('#f-show').addEventListener('change', e => { lstate.show = e.target.value; lstate.page = 0; renderExplorer(); });
  $('#f-sort').addEventListener('change', e => { lstate.sort = e.target.value; lstate.page = 0; syncList(); });
  if (!window.L) { $('#lmap').innerHTML = '<p style="padding:20px;color:#52514e">The map needs an internet connection to load. The list still works.</p>'; return; }
  lmap = L.map('lmap', { scrollWheelZoom: true, preferCanvas: true, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(lmap);
  const popW = popupWidth('#lmap');
  baseLayer(18).addTo(lmap);
  if (BUNDLED) { lmap.setMinZoom(12); lmap.setMaxZoom(16); }
  dotLayer = L.layerGroup().addTo(lmap); pinLayer = L.layerGroup().addTo(lmap);
  const pts = [];
  LS.items.forEach(l => {
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return;
    pts.push([l.lat, l.lng]);
    const mk = L.circleMarker([l.lat, l.lng], { radius: 5, fillColor: occColor(l), fillOpacity: .92, color: '#fff', weight: 1.2 });
    mk.bindPopup(() => lPopup(l), popW);
    mk.on('popupopen', () => mk.closeTooltip());
    mk.bindTooltip(() => `${esc(l.name || 'Listing')} · ${lMoney(l.adr)} a night`, { direction: 'top' });
    lmarkers[l.id] = mk;
  });
  // Open on the middle of the listings rather than their outer edge, so the dense centre is readable.
  if (pts.length > 200) { const v = CITY_VIEW[CITIES.indexOf('Rabat') >= 0 ? 'Rabat' : CITIES[0]]; lmap.setView([v[0], v[1]], v[2]); }
  else if (pts.length) lmap.fitBounds(pts, { padding: [24, 24], maxZoom: 14 });
  else lmap.setView([34.013, -6.84], 12);
  // The list follows the map. A popup nudging the map into place does not count as the reader moving it.
  lmap.on('popupopen', () => { lstate.hold = true; });
  lmap.on('popupclose', () => { lstate.hold = false; });
  lmap.on('dragstart zoomstart', () => { lstate.hold = false; });
  lmap.on('moveend', () => { if (!lstate.hold) { lstate.page = 0; syncList(); } });
}
function toggleSave(id){
  if (saved[id]) delete saved[id]; else saved[id] = 1;
  try { localStorage.setItem('str-saved', JSON.stringify(Object.keys(saved))); } catch (e) {}
  syncList(); if (lstate.show === 'saved') syncDots();
}

function renderAbout(){
  const L = D.meta.links, r = state.rates;
  const rate = state.cur === 'MAD' ? `1 GBP = ${(1 / r.GBP).toFixed(2)} MAD` : `1 ${state.cur} = ${(1 / r[state.cur]).toFixed(2)} MAD`;
  $('#about').innerHTML = [
    `Market figures: AirROI. (2026). Airbnb market data for ${MCITIES.map(c => `<a href="${esc(MK[c].link || L.airroiRabat)}" target="_blank" rel="noopener">${esc(c)}</a>`).join(', ')}, ${D.meta.period}, and its <a href="${L.airroiMorocco}" target="_blank" rel="noopener">Morocco market ranking</a>, both updated ${D.meta.sourceUpdated}. Read from the free public pages on ${D.meta.snapshot}${D.meta.citiesRead ? ' (' + MCITIES.filter(c => c !== 'Rabat').join(', ') + ' on ' + D.meta.citiesRead + ')' : ''}; AirROI refreshes them monthly.`,
    `Second opinion: <a href="${L.airbticsRabat}" target="_blank" rel="noopener">Airbtics' free Rabat summary</a>. Nothing here comes from Airbtics' paid dashboard.`,
    AB
      ? `Listings on the map: read from Airbnb's public map search for ${CITIES.join(', ')}, starting ${lWhen()}. Daily rate, rating and review count are as Airbnb showed them. Revenue and occupancy per listing are estimates from review pace, calibrated to AirROI's market figures; the note under the list explains how.`
      : `Listings on the map, when loaded, come from <a href="${L.airroiApi}" target="_blank" rel="noopener">AirROI's API</a> under your own key, and are kept for at most 30 days as its terms require.`,
    `All figures are estimates modelled from public Airbnb listings and calendars. They are gross bookings before costs and tax, and cover Airbnb only. For personal research; check anything that matters against the source.`,
    `Source figures are in Moroccan dirhams. Other currencies are converted at ${state.live ? 'the current rate' : 'a saved rate'} (${rate}, ${state.ratesDate}). <a href="${L.fx}" target="_blank" rel="noopener">Rates by Exchange Rate API</a>.`
  ].map(t => `<li>${t}</li>`).join('');
}

// Point the analytics sections at another city. The map's own city buttons call this too.
function setMarket(c){
  if (!MK[c] || c === state.mcity) return;
  state.mcity = c; R = MK[c]; K = R.kpi;
  renderOverview(); renderTrends(); renderSpread(); renderSize(); renderCalc(); renderSupply(); renderGuests(); renderTop();
  markCity(); if (state.view === 'rabat') setView('rabat'); else setView(state.view);
  renderMarkets(); renderAbout();
}
function renderAll(init){
  renderHeader(); renderOverview(); renderTrends(); renderSpread(); renderSize(); renderCalc(init);
  renderSupply(); renderGuests(); renderTop(); renderExplorer(); renderLegend(); renderMarkets(); renderAbout();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  if (e.target.closest('a')) return; // links do their own thing
  const b = e.target.closest('button, tr.clickable, .lcard'); if (!b) return;
  // Re-rendering replaces the button that was pressed, so note which one it was and hand focus back to it.
  const dk = b.tagName === 'BUTTON' ? Object.keys(b.dataset)[0] : null;
  const again = dk && window.CSS && CSS.escape ? `button[data-${dk.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(b.dataset[dk])}"]` : null;
  if (b.dataset.c) { state.cur = b.dataset.c; try { localStorage.setItem('str-cur', state.cur); } catch (err) {} renderAll(); }
  else if (b.dataset.m) { state.metric = b.dataset.m; renderTrends(); }
  else if (b.dataset.mc) setMarket(b.dataset.mc);
  else if (b.dataset.v) setView(b.dataset.v);
  else if (b.dataset.f) { state.filter = b.dataset.f; renderMarkets(); }
  else if (b.dataset.k) { const k = b.dataset.k; state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'rank' || k === 'name' ? 1 : -1) }; renderMarkets(); }
  else if (b.dataset.n) focusMarket(b.dataset.n);
  else if (b.dataset.b) { lstate.beds = b.dataset.b; lstate.page = 0; renderExplorer(); }
  else if (b.dataset.pg) { lstate.page += +b.dataset.pg; syncList(); }
  else if ((b.dataset.city === 'all' || isCity(b.dataset.city)) && lmap) {
    lstate.only = b.dataset.city === 'all' ? null : b.dataset.city; lstate.page = 0; lstate.hold = false; lmap.closePopup(); syncDots();
    const box = lstate.only && cityBox(lstate.only);
    if (box) lmap.fitBounds(box, { animate: false, maxZoom: 14 });
    syncList();
    if (lstate.only) setMarket(lstate.only); // the analytics further down follow the city picked on the map
    const again = document.querySelector('#city-go [aria-pressed="true"]'); if (again) again.focus();
  }
  else if (b.dataset.save) toggleSave(b.dataset.save);
  else if (b.dataset.card) openListing(b.dataset.card);
  if (again) { let nb = null; try { nb = document.querySelector(again); } catch (err) {} if (nb && !nb.disabled && nb !== document.activeElement) nb.focus({ preventScroll: true }); }
});
document.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('.lcard'); if (c && !c.contains(e.relatedTarget)) highlight(c.dataset.card, true); });
document.addEventListener('mouseout', e => { const c = e.target.closest && e.target.closest('.lcard'); if (c && !c.contains(e.relatedTarget)) highlight(c.dataset.card, false); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.matches('.lcard')) openListing(e.target.dataset.card);
  else if (e.target.matches('tr.clickable')) focusMarket(e.target.dataset.n);
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
