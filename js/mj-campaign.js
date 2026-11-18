/* 麻雀ナイン: 貸卓の企画の帯(ヒーロー直下)と、画面下の固定帯(予約ボタン: LINE・電話)
   日付で自動で切り替わる(日本時間)。events.js の詳細画面(window.NineEvents.openDetail)を使う。 */
(function(){
  'use strict';

  var LINE = 'https://lin.ee/VCfARDb';
  var TEL = 'tel:0862896081';

  /* 企画。from〜to(日本時間の日付、両端を含む)の間だけ表示。どれにも当てはまらない日は、予約ボタンだけ出す */
  var CAMPAIGNS = [
    {
      id: 'booking', from: '2000-01-01', to: '2026-11-30',
      label: '年末の貸卓',
      title: '11月中のご予約で、1時間無料券を。',
      sub: '12月分の貸卓が対象です。',
      bar: '先行予約で1時間無料券',
      detail: {
        title: '年末の貸卓、先行予約で1時間無料券。',
        meta: '11/30まで',
        lines: ['11月中に、12月分の貸卓を予約した方に、貸卓1時間無料券を1組1枚プレゼント。', '予約は、公式LINEまたはアプリから。'],
        notes: ['アプリの登録が必要です', '券は、ご利用後にアプリで配布します', '有効期限は、ご来店から60日です', '12/21〜1/3は特別料金の期間のため、券はご利用いただけません', '券は、1回の貸卓につき1枚までご利用いただけます'],
        posters: ['img/events/year-end-booking.jpg']
      }
    },
    {
      id: 'jumbo', from: '2026-12-01', to: '2027-01-03',
      label: 'ナイン年末ジャンボ',
      title: '12月の貸卓で、福引にご参加ください。',
      sub: '2027/1/3に、店内で公開抽選します。',
      bar: '貸卓で年末ジャンボ福引',
      detail: {
        title: 'ナイン年末ジャンボ、開催。',
        meta: '12月の貸卓ご利用の方が対象 / 2027/1/3に店内で公開抽選',
        lines: ['12月に貸卓をご利用の、アプリ登録者の方が対象の福引です。', 'ご利用後に、代表者の方のアカウント名を紙に書いて、店頭の抽選箱へ。', '2027/1/3に店内で公開抽選し、結果は店内に掲示します(匿名希望も可)。'],
        missions: [['1等', '貸卓1時間無料券5枚(1名)'], ['2等', '貸卓1時間無料券3枚(3名)'], ['3等', '貸卓1時間無料券1枚(6名)']],
        notes: ['当選した方は、2/3までにご来店のうえ、スタッフにお声がけください', '券の有効期限は、配布から90日です', '12/21〜1/3は特別料金の期間のため、券はご利用いただけません', '12/29は貸切営業、12/31・1/1はお休みです'],
        posters: ['img/events/year-end-booking.jpg']
      }
    }
  ];

  var COPY = { more: '詳しく見る', btnLine: 'LINEで予約', btnTel: '電話で予約', stripAria: '貸卓の企画', detailAria: '企画の詳細を開く' };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function todayIso(){
    var q = location.search.match(/[?&]mjdate=(\d{4}-\d{2}-\d{2})/);   /* 確認用: ?mjdate=2026-12-01 で、その日の表示を見られる */
    if(q) return q[1];
    var d = new Date(Date.now() + 9 * 3600e3);
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  function current(){
    var t = todayIso(), i;
    for(i = 0; i < CAMPAIGNS.length; i++){ if(CAMPAIGNS[i].from <= t && t <= CAMPAIGNS[i].to) return CAMPAIGNS[i]; }
    return null;
  }
  function open(c){ if(c && window.NineEvents) window.NineEvents.openDetail(c.detail); }

  function start(){
    var c = current();
    var strip = document.getElementById('mj-strip'), bar = document.getElementById('mj-bar');
    if(strip && c){
      strip.className = 'today-strip';
      strip.setAttribute('aria-label', COPY.stripAria);
      strip.innerHTML = '<div class="wrap"><div class="ts-label">' + esc(c.label) + '</div><div class="ts-body"><div class="ts-row"><b>' + esc(c.title) + '</b><span>' + esc(c.sub) + '</span></div></div><button type="button" class="ts-link ts-open">' + esc(COPY.more) + '</button></div>';
      strip.querySelector('.ts-open').addEventListener('click', function(){ open(c); });
      strip.hidden = false;
    }
    if(bar){
      var left = c ? '<button type="button" class="tb-text" aria-label="' + esc(COPY.detailAria) + '"><span class="tb-line">' + esc(c.bar) + '</span><span class="tb-chev" aria-hidden="true">›</span></button>' : '<span class="tb-text"></span>';
      bar.className = 'today-bar';
      bar.innerHTML = left + '<span class="tb-btns"><a class="tb-btn" href="' + LINE + '">' + esc(COPY.btnLine) + '</a><a class="tb-btn tb-btn-sub" href="' + TEL + '">' + esc(COPY.btnTel) + '</a></span>';
      var tb = bar.querySelector('button.tb-text'); if(tb) tb.addEventListener('click', function(){ open(c); });
      bar.hidden = false;
      document.body.classList.add('has-today-bar');
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
