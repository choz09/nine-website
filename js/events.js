/* イベント表示(今日の帯・固定帯・初心者おすすめ・固定イベント・今週のリスト・詳細画面)
   データの元: Googleスプレッドシート「NINE イベントシート」の「予定」「固定イベント」タブ(ウェブに公開したCSV)。
   CONFIG.sheetCsv にURLを入れると、そこから読む。空、または読めなかったときは data/*.json(控え)を使う。 */
(function(){
  'use strict';

  var CONFIG = {
    sheetCsv: {
      schedule: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9JFNQwUKRWS21LipW-sh9YYxvAjSnWXIIK5WaTAh8iLof07dq7K58sQTzyZwLAN68EKFMGRnFcWBV/pub?gid=351920975&single=true&output=csv',
      fixed: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9JFNQwUKRWS21LipW-sh9YYxvAjSnWXIIK5WaTAh8iLof07dq7K58sQTzyZwLAN68EKFMGRnFcWBV/pub?gid=1684706056&single=true&output=csv'
    },
    fallback: { schedule: 'data/schedule.json', fixed: 'data/fixed.json' },
    line: 'https://line.me/R/ti/p/@711rgefx',
    eventsPage: 'poker-events.html#schedule',
    cutoffHour: 6
  };

  /* 画面に出す文言(ここだけ直せば全体に反映される) */
  var COPY = {
    todayLabel: 'TODAY',
    linkMore: '詳しく見る',
    evening: '今夜は、',
    daytime: '本日は、',
    startSuffix: 'スタート。',
    beginnerHint: '初心者の方も、どうぞ。',
    ringTitle: '今日は、リングゲームを開催します。',
    ringSub: 'ふらっと、お越しください。',
    closedTitle: '本日は貸切営業です。',
    closedSub: 'ご来店は、またの機会に。',
    barLabel: '本日:',
    barRing: 'リングゲーム',
    barClosed: '貸切営業',
    barButton: 'LINEで相談',
    more: 'タップして詳細',
    modalHead: 'イベントの詳細',
    close: '閉じる',
    playVideo: '紹介動画を見る',
    weekEmpty: '今週の予定は、まもなく公開します。最新情報はSNSでご案内しています。',
    ringDay: 'リングゲーム',
    ringDaySub: 'ふらっと、お越しください。',
    beginnerBadge: '初心者向け',
    noCash: 'チップの現金化・景品交換は一切ありません。',
    cards: {
      'WEDNESDAY RING GAME': '通常より、気軽に座れる一卓。',
      'THURSDAY TOURNAMENT': '19:50までの着席で、1回目の参加は無料。',
      'NINE PARTY QUEST': 'みんなで協力して、9つのミッションに挑戦。',
      'WEEKLY MISSION': 'ミッションをクリアして、チケットを集めよう。'
    },
    details: {
      'NINE PARTY QUEST': [
        '11/1〜11/30の、リングゲーム月間イベントです。',
        'みんなで協力して、9つのミッションに挑戦。',
        'クリアすると、特別な特典があります。詳細は店内で。'
      ],
      'WEEKLY MISSION': [
        'ミッションをクリアして、チケットを集めよう。',
        'チケット3枚で、店内iPadのカードパックを1回開封できます。',
        '成績は関係ありません。'
      ]
    },
    missions: {
      'WEEKLY MISSION': [
        ['NORMAL', '週2日来店で、チケット1枚'],
        ['HARD', '週2日来店+19:30までの着席で、さらに1枚'],
        ['SPECIAL', '毎週指定のイベントに参加で、1枚'],
        ['SECRET', '店内モニターで確認して、1枚']
      ]
    },
    missionNote: 'リングまたはトーナメントに着席した日を、1日と数えます。'
  };

  /* 画像・動画(ポスター)。シートの「ポスター画像」が空のときにこちらを使う */
  var MEDIA = {
    'WEEKLY MISSION': {
      display: 'WEEKLY:MISSION',
      posters: ['img/events/weekly-mission.jpg'],
      video: { src: 'img/events/weekly-mission.mp4', poster: 'img/events/weekly-mission-poster.jpg' }
    },
    'NINE PARTY QUEST': {
      display: 'Nine PARTY QUEST',
      posters: ['img/events/party-quest-1.jpg', 'img/events/party-quest-2.jpg']
    }
  };

  var WEEK = '日月火水木金土';
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function key(t){ return String(t || '').toUpperCase().replace(/[:：]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function media(t){ return MEDIA[key(t)] || null; }
  function shown(t){ var m = media(t); return m && m.display ? m.display : t; }
  function pad(n){ return n < 10 ? '0' + n : '' + n; }

  /* 営業日(日本時間、cutoffHour時までは前日扱い) */
  function businessDate(){
    var d = new Date(Date.now() + 9 * 3600e3 - CONFIG.cutoffHour * 3600e3);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: d.getUTCDay() };
  }
  function iso(y, m, d){ return y + '-' + pad(m) + '-' + pad(d); }
  function isoOf(dt){ return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); }

  /* ---------- データ読み込み ---------- */
  function parseCsv(text){
    var rows = [], row = [], cur = '', q = false, i, c;
    for(i = 0; i < text.length; i++){
      c = text[i];
      if(q){
        if(c === '"'){ if(text[i + 1] === '"'){ cur += '"'; i++; } else { q = false; } } else { cur += c; }
      } else if(c === '"'){ q = true; }
      else if(c === ','){ row.push(cur); cur = ''; }
      else if(c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
      else if(c !== '\r'){ cur += c; }
    }
    if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
    return rows;
  }
  function normDate(s){
    var m = String(s || '').match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    return m ? iso(+m[1], +m[2], +m[3]) : '';
  }
  function truthy(v){ return !/^(false|0|no|いいえ)$/i.test(String(v == null ? 'true' : v).trim()) && String(v).trim() !== ''; }
  function fromScheduleCsv(rows){
    var out = [], i, r;
    for(i = 1; i < rows.length; i++){
      r = rows[i];
      if(!normDate(r[0])) continue;
      out.push({ date: normDate(r[0]), title: r[2] || '', category: r[3] || '', start: r[4] || '', late: r[5] || '', d1: r[6] || '', d2: r[7] || '', desc: r[8] || '', poster: r[9] || '', show: truthy(r[10]) });
    }
    return out;
  }
  function fromFixedCsv(rows){
    var out = [], i, r;
    for(i = 1; i < rows.length; i++){
      r = rows[i];
      if(!r[1]) continue;
      out.push({ order: +r[0] || i, title: r[1], kind: r[2] || '', day: r[3] || '', time: r[4] || '', price: r[5] || '', desc: r[6] || '', beginner: /^(true|1|はい)$/i.test(String(r[7]).trim()), poster: r[8] || '', show: truthy(r[9]) });
    }
    out.sort(function(a, b){ return a.order - b.order; });
    return out;
  }
  function getJson(url){ return fetch(url, { cache: 'no-cache' }).then(function(r){ if(!r.ok) throw new Error(url); return r.json(); }); }
  function getCsv(url){ return fetch(url, { cache: 'no-cache' }).then(function(r){ if(!r.ok) throw new Error(url); return r.text(); }).then(parseCsv); }
  function load(kind, conv){
    var url = CONFIG.sheetCsv[kind];
    var fb = function(){ return getJson(CONFIG.fallback[kind]).catch(function(){ return []; }); };
    if(!url) return fb();
    return getCsv(url).then(conv).then(function(d){ return d.length ? d : fb(); }).catch(fb);
  }

  /* ---------- 日ごとの判定 ---------- */
  function eventsOn(schedule, dateIso){
    return schedule.filter(function(e){ return e.date === dateIso && e.show !== false; });
  }
  function isClosed(e){ return e.category === '貸卓のみの営業' || /貸切/.test(e.title); }
  function isRing(e){ return e.category === 'リングゲーム'; }
  function dayState(list){
    if(list.some(isClosed)) return { type: 'closed' };
    var real = list.filter(function(e){ return !isRing(e); });
    if(real.length) return { type: 'event', events: real };
    return { type: 'ring' };
  }
  function startText(e){ return e.start ? e.start + (e.late ? '' : '〜') : ''; }
  function isEvening(e){ var m = String(e.start || '').match(/^(\d{1,2}):/); return !m || +m[1] >= 17; }
  function isBeginner(e){ return e.category === '初心者向け'; }

  /* ---------- 今日の帯・固定帯 ---------- */
  function renderToday(schedule){
    var strip = $('today-strip'), bar = $('today-bar');
    var b = businessDate(), id = iso(b.y, b.m, b.d), st = dayState(eventsOn(schedule, id));
    var label = COPY.todayLabel + ' ' + b.m + '/' + b.d + '(' + WEEK.charAt(b.w) + ')';
    var html = '', barText = '', barOpen = null;
    var todayMeta = b.m + '/' + b.d + '(' + WEEK.charAt(b.w) + ')';
    if(st.type === 'closed'){
      html = '<div class="ts-row"><b>' + esc(COPY.closedTitle) + '</b><span>' + esc(COPY.closedSub) + '</span></div>';
      barText = COPY.barClosed;
      barOpen = function(){ openDetail({ title: COPY.barClosed, meta: todayMeta, lines: [COPY.closedTitle, COPY.closedSub] }); };
    } else if(st.type === 'ring'){
      html = '<div class="ts-row"><b>' + esc(COPY.ringTitle) + '</b><span>' + esc(COPY.ringSub) + '</span></div>';
      barText = COPY.barRing;
      barOpen = function(){ openDetail({ title: COPY.ringDay, meta: todayMeta, lines: [COPY.ringTitle, COPY.ringSub] }); };
    } else {
      st.events.forEach(function(e){
        var sub = e.start ? e.start + COPY.startSuffix : (e.desc || '');
        if(isBeginner(e)) sub += (sub ? '' : '') + COPY.beginnerHint;
        html += '<div class="ts-row"><b>' + esc((isEvening(e) ? COPY.evening : COPY.daytime) + shown(e.title) + '。') + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>';
      });
      barText = shown(st.events[0].title) + (startText(st.events[0]) ? ' ' + startText(st.events[0]) : '');
      barOpen = function(){ openDetail(detailForEvent(st.events[0])); };
    }
    if(strip){
      strip.innerHTML = '<div class="wrap"><div class="ts-label">' + esc(label) + '</div><div class="ts-body">' + html + '</div><a class="ts-link" href="' + CONFIG.eventsPage + '">' + esc(COPY.linkMore) + '</a></div>';
      strip.hidden = false;
    }
    if(bar){
      bar.innerHTML = '<button type="button" class="tb-text" aria-label="今日のイベントの詳細を開く"><span class="tb-line"><b>' + esc(COPY.barLabel) + '</b>' + esc(barText) + '</span><span class="tb-chev" aria-hidden="true">›</span></button><a class="tb-btn" href="' + CONFIG.line + '">' + esc(COPY.barButton) + '</a>';
      var tb = bar.querySelector('.tb-text'); if(tb && barOpen) tb.addEventListener('click', barOpen);
      bar.hidden = false;
      document.body.classList.add('has-today-bar');
    }
  }

  /* ---------- 詳細画面 ---------- */
  var dlg = null, lastFocus = null;
  function ensureDialog(){
    if(dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'ev-modal';
    dlg.setAttribute('aria-labelledby', 'ev-modal-title');
    dlg.addEventListener('click', function(e){ if(e.target === dlg) closeDialog(); });
    dlg.addEventListener('close', function(){
      document.body.classList.remove('ev-lock');
      var v = dlg.querySelector('video'); if(v) v.pause();
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    });
    document.body.appendChild(dlg);
    return dlg;
  }
  function closeDialog(){ if(dlg && dlg.open) dlg.close(); }
  function openDetail(d){
    var el = ensureDialog(), h = '';
    lastFocus = document.activeElement;
    h += '<div class="em-inner"><p class="em-head">' + esc(COPY.modalHead) + '</p><h3 id="ev-modal-title">' + esc(d.title) + '</h3>';
    if(d.meta) h += '<p class="em-meta">' + esc(d.meta) + '</p>';
    (d.lines || []).forEach(function(t){ if(t) h += '<p class="em-desc">' + esc(t) + '</p>'; });
    if(d.missions){
      h += '<ul class="em-list">' + d.missions.map(function(m){ return '<li><b>' + esc(m[0]) + '</b>' + esc(m[1]) + '</li>'; }).join('') + '</ul>';
      if(COPY.missionNote) h += '<p class="em-note">' + esc(COPY.missionNote) + '</p>';
    }
    if(d.video) h += '<div class="em-video"><button type="button" class="em-play" data-src="' + esc(d.video.src) + '" data-poster="' + esc(d.video.poster) + '">' + esc(COPY.playVideo) + '</button></div>';
    if(d.posters && d.posters.length) h += '<div class="em-posters">' + d.posters.map(function(p){ return '<img src="' + esc(p) + '" alt="' + esc(d.title) + 'の告知画像" loading="lazy">'; }).join('') + '</div>';
    if(d.noCash) h += '<p class="em-note">' + esc(COPY.noCash) + '</p>';
    h += '<button type="button" class="em-close">' + esc(COPY.close) + '</button></div>';
    el.innerHTML = h;
    el.querySelector('.em-close').addEventListener('click', closeDialog);
    var play = el.querySelector('.em-play');
    if(play) play.addEventListener('click', function(){
      var wrap = play.parentNode, v = document.createElement('video');
      v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('playsinline', '');
      v.poster = play.getAttribute('data-poster'); v.src = play.getAttribute('data-src');
      wrap.innerHTML = ''; wrap.appendChild(v);
      var p = v.play(); if(p && p.catch) p.catch(function(){});
    });
    if(el.showModal) el.showModal(); else el.setAttribute('open', '');
    document.body.classList.add('ev-lock');
  }
  function detailForFixed(f){
    var m = media(f.title), lines = COPY.details[key(f.title)] || [f.desc];
    var meta = fixedMeta(f);
    var posters = f.poster ? f.poster.split(/[,、]\s*/).map(function(p){ return 'img/events/' + p; }) : (m && m.posters) || [];
    return { title: shown(f.title), meta: meta, lines: lines, missions: COPY.missions[key(f.title)], video: m && m.video, posters: posters, noCash: key(f.title) === 'WEEKLY MISSION' };
  }
  function detailForEvent(e){
    var m = media(e.title);
    var dp = e.date.split('-'), dt = new Date(Date.UTC(+dp[0], +dp[1] - 1, +dp[2]));
    var time = e.start ? (e.late ? e.start + ' スタート / ' + e.late + ' レジクロ' : e.start + '〜') : '';
    var meta = (+dp[1]) + '/' + (+dp[2]) + '(' + WEEK.charAt(dt.getUTCDay()) + ')' + (time ? ' ' + time : '');
    var posters = e.poster ? e.poster.split(/[,、]\s*/).map(function(p){ return 'img/events/' + p; }) : (m && m.posters) || [];
    return { title: shown(e.title), meta: meta, lines: [e.d1, e.d2, e.desc], posters: posters, video: m && m.video };
  }

  /* ---------- カード(初心者おすすめ・リングゲームのお楽しみ) ---------- */
  function fixedMeta(f){
    var a = [], t = String(f.time || '');
    if(t.indexOf('/') > -1) t = t.split('/')[0] + 'スタート';
    var freq = /隔週/.test(f.kind) ? '隔週' : '毎週';
    if(f.day && f.day !== '毎日') a.push(freq + f.day + '曜 ' + t);
    if(f.price) a.push(f.price.replace(/^Buy-in：/, '参加費 '));
    return a.join(' / ');
  }
  function cardHtml(f, i){
    return '<button type="button" class="ev-card" data-i="' + i + '"><span class="tag">' + esc(f.kind || '') + '</span><h3>' + esc(shown(f.title)) + '</h3>' +
      (fixedMeta(f) ? '<p class="meta">' + esc(fixedMeta(f)) + '</p>' : '') +
      '<p class="line">' + esc(COPY.cards[key(f.title)] || f.desc) + '</p><span class="more">' + esc(COPY.more) + ' →</span></button>';
  }
  function renderCards(host, list){
    if(!host) return;
    host.innerHTML = list.map(cardHtml).join('');
    Array.prototype.forEach.call(host.querySelectorAll('.ev-card'), function(btn){
      btn.addEventListener('click', function(){ openDetail(detailForFixed(list[+btn.getAttribute('data-i')])); });
    });
  }

  /* ---------- 今週のリスト ---------- */
  function renderWeek(schedule){
    var host = $('week-list'); if(!host) return;
    var b = businessDate(), mon = new Date(Date.UTC(b.y, b.m - 1, b.d - ((b.w + 6) % 7))), days = [], i, dt, id, list, st;
    var any = false, todayIso = iso(b.y, b.m, b.d);
    for(i = 0; i < 7; i++){
      dt = new Date(mon.getTime() + i * 86400e3); id = isoOf(dt); list = eventsOn(schedule, id);
      if(list.length) any = true;
      days.push({ dt: dt, id: id, list: list });
    }
    var range = $('week-range');
    if(range){
      var last = days[6].dt;
      range.textContent = (mon.getUTCMonth() + 1) + '/' + mon.getUTCDate() + '(月) 〜 ' + (last.getUTCMonth() + 1) + '/' + last.getUTCDate() + '(日)';
    }
    if(!any){ host.innerHTML = '<p class="em-note" style="color:var(--ink-soft);text-align:center">' + esc(COPY.weekEmpty) + '</p>'; return; }
    host.innerHTML = '';
    days.forEach(function(d){
      st = dayState(d.list);
      var items = st.type === 'event' ? st.events : (st.type === 'closed' ? d.list.filter(isClosed) : (d.list.filter(isRing)[0] ? d.list.filter(isRing) : [null]));
      items.forEach(function(e){
        var btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'week-day' + (d.id === todayIso ? ' today' : '');
        var title, sub = '', badge = '';
        if(e){ title = shown(e.title); sub = [startText(e) ? startText(e) : '', e.late ? '(レジクロ ' + e.late + ')' : ''].filter(Boolean).join(' '); if(isBeginner(e)) badge = COPY.beginnerBadge; }
        else { title = COPY.ringDay; sub = COPY.ringDaySub; }
        if(e && !sub && e.d1) sub = e.d1;
        btn.innerHTML = '<span class="wd-date"><b>' + d.dt.getUTCDate() + '</b><span>' + 'SUN MON TUE WED THU FRI SAT'.split(' ')[d.dt.getUTCDay()] + '</span></span>' +
          '<span class="wd-body"><span class="wd-title">' + esc(title) + '</span>' + (sub ? '<span class="wd-sub">' + esc(sub) + '</span>' : '') + '</span>' +
          (badge ? '<span class="wd-badge">' + esc(badge) + '</span>' : '');
        btn.addEventListener('click', function(){
          if(e) openDetail(detailForEvent(e));
          else openDetail({ title: COPY.ringDay, meta: d.dt.getUTCMonth() + 1 + '/' + d.dt.getUTCDate() + '(' + WEEK.charAt(d.dt.getUTCDay()) + ')', lines: [COPY.ringDaySub] });
        });
        host.appendChild(btn);
      });
    });
  }

  /* ---------- 起動 ---------- */
  function start(){
    Promise.all([load('schedule', fromScheduleCsv), load('fixed', fromFixedCsv)]).then(function(r){
      var schedule = r[0], fixed = r[1].filter(function(f){ return f.show !== false; });
      renderToday(schedule);
      renderWeek(schedule);
      renderCards($('beginner-cards'), fixed.filter(function(f){ return f.beginner; }));
      renderCards($('fixed-cards'), fixed.filter(function(f){ return !f.beginner; }));
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
