(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const CONFIG_KEY = 'kyutech-cloud-dev-settings-v1';
  let client = null;
  const setStatus = (s, err = false) => { $('status').textContent = s; $('status').className = 'status' + (err ? ' error' : ''); };
  const show = (id, yes) => { $(id).hidden = !yes; };
  const asText = x => x == null ? '' : String(x);
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = asText(text); if (className) n.className = className; return n; };
  const blank = id => { const d = $(id); d.replaceChildren(); return d; };
  const row = (parent, headline, detail, pill) => { const wrap = el('div', undefined, 'result'); const h = el('p', headline); h.style.fontWeight = '700'; wrap.append(h); if (pill) wrap.append(el('span', pill, 'pill')); if (detail) wrap.append(el('p', detail, 'muted')); parent.append(wrap); };
  const empty = (id, txt = '閲覧できるデータはありません。') => blank(id).append(el('p', txt, 'muted'));
  const extract = async (table, columns) => {
    const { data, error } = await client.from(table).select(columns).limit(200);
    if (error) throw new Error(`${table}: ${error.message} (${error.code || 'unknown'})`);
    return data || [];
  };
  const configValid = (url, key) => {
    try { const u = new URL(url); return u.protocol === 'https:' && /^[-a-zA-Z0-9]+\.supabase\.co$/.test(u.hostname) && u.pathname === '/' && /^sb_publishable_/.test(key); }
    catch { return false; }
  };
  function init(url, key) {
    if (!window.supabase?.createClient) throw new Error('Supabase JSの読み込みに失敗しました。インターネット接続を確認してください。');
    client = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kyutech-cloud-readonly-auth' }});
    show('setup', false); show('auth', true);
    client.auth.onAuthStateChange((evt, session) => {
      // Callback does not make Supabase requests; avoid deadlock.
      const logged = !!session?.user;
      $('login-btn').hidden = logged;
      $('logout-btn').hidden = !logged;
      show('data', logged);
      $('identity').textContent = logged ? `ログイン中: ${session.user.email || session.user.id}` : '';
      if (!logged) { for (const id of ['profile', 'players', 'measurements', 'goals', 'reports']) blank(id); }
    });
    client.auth.getSession().then(({data, error}) => {
      if (error) return setStatus(error.message, true);
      if (data?.session) { setStatus('ログイン済み。データを確認します。'); loadAll(); }
      else setStatus('接続設定が保存されました。4つのテストアカウントでログインしてください。');
    }).catch(e => setStatus(e.message, true));
  }
  async function loadAll() {
    if (!client) return;
    $('reload').disabled = true;
    setStatus('ログイン情報とクラウドデータを確認しています…');
    try {
      const {data: userData, error: userError} = await client.auth.getUser();
      if (userError || !userData?.user) throw new Error(userError?.message || 'ログイン情報を取得できません。');
      const uid = userData.user.id;
      const [acct, memberships, players, sessions, values, items, shortGoals, longGoals, targets, cards, scores, reportItems] = await Promise.all([
        extract('accounts', 'account_id,display_name,status'),
        extract('team_memberships','account_id,team_id,role,left_at'),
        extract('players','player_id,player_name'),
        extract('measurement_sessions','session_id,player_id,measured_on'),
        extract('measurement_values','session_id,item_id,value'),
        extract('measurement_items','item_id,item_name,unit'),
        extract('short_term_goals','player_id,target_month,goal_text'),
        extract('long_term_goals','player_id,goal_text,valid_from,valid_to'),
        extract('measurement_targets','player_id,item_id,target_value'),
        extract('report_cards','report_id,player_id,period_start,period_end,status,overall_comment'),
        extract('report_scores','report_id,report_item_id,score,comment'),
        extract('report_items','report_item_id,item_name')
      ]);
      const mine = acct.find(a => a.account_id === uid);
      const roles = memberships.filter(m => m.account_id === uid && !m.left_at).map(m => m.role);
      blank('profile').append(el('p', `表示名: ${mine?.display_name || '（未登録）'} / 役割: ${roles.join('、') || '（未設定）'} / 状態: ${mine?.status || '不明'}`));
      const pmap = new Map(players.map(x => [x.player_id, x.player_name]));
      const imap = new Map(items.map(x => [x.item_id, x]));
      const rmap = new Map(reportItems.map(x => [x.report_item_id, x.item_name]));
      const sessionMap = new Map(sessions.map(x => [x.session_id, x]));
      const pd = blank('players');
      for (const p of players) row(pd, p.player_name, '閲覧を許可された選手');
      if (!players.length) empty('players');
      const md = blank('measurements');
      for (const v of values) {
        const session = sessionMap.get(v.session_id);
        if (!session) continue;
        const item = imap.get(v.item_id);
        row(md, `${pmap.get(session.player_id) || '選手'}：${item?.item_name || v.item_id} ${v.value}${item?.unit || ''}`, `測定日：${session.measured_on}`);
      }
      if (!md.childElementCount) empty('measurements');
      const gd = blank('goals');
      for (const g of shortGoals) row(gd, `${pmap.get(g.player_id) || '選手'}：短期目標`, `${g.target_month} / ${g.goal_text}`);
      for (const g of longGoals) row(gd, `${pmap.get(g.player_id) || '選手'}：長期目標`, g.goal_text);
      for (const g of targets) { const item = imap.get(g.item_id); row(gd, `${pmap.get(g.player_id) || '選手'}：${item?.item_name || g.item_id}目標`, `${g.target_value}${item?.unit || ''}`); }
      if (!gd.childElementCount) empty('goals');
      const rd = blank('reports');
      for (const card of cards) {
        const associated = scores.filter(s => s.report_id === card.report_id).map(s => `${rmap.get(s.report_item_id) || '評価項目'} ${s.score}/5`).join('、');
        row(rd, `${pmap.get(card.player_id) || '選手'}：${card.period_start}〜${card.period_end}`, `${card.overall_comment || '総評なし'}\n${associated}`, card.status === 'published' ? '公開済み' : '下書き');
      }
      if (!rd.childElementCount) empty('reports');
      setStatus(`クラウドから取得しました：選手${players.length}件／測定${md.querySelectorAll('.result').length}件／目標${gd.querySelectorAll('.result').length}件／通知表${cards.length}件。`);
    } catch (e) { setStatus('取得エラー：' + e.message + '\n前段階のSQLがすべて成功しているか、GRANTとRLSポリシーを確認してください。', true); }
    finally { $('reload').disabled = false; }
  }
  $('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const url = $('url').value.trim().replace(/\/+$/, '') + '/'; const key = $('key').value.trim();
    if (!configValid(url,key)) return setStatus('Project URLは https://xxxxx.supabase.co、キーは sb_publishable_... を入力してください。Secret / service_role は使用禁止です。',true);
    try { localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key})); init(url,key); }
    catch(e){ setStatus(e.message,true); }
  });
  $('login-form').addEventListener('submit',async e => {
    e.preventDefault(); if (!client) return;
    const email = $('email').value.trim(); const password = $('password').value;
    $('login-btn').disabled = true;
    try {
      const {error} = await client.auth.signInWithPassword({email,password});
      $('password').value = '';
      if (error) throw error;
      await loadAll();
    } catch(err) { $('password').value = ''; setStatus('ログインエラー：'+err.message,true); }
    finally { $('login-btn').disabled = false; }
  });
  $('logout-btn').addEventListener('click',async () => {
    try { const {error} = await client.auth.signOut(); if (error) throw error; setStatus('ログアウトしました。'); }
    catch(err){setStatus('ログアウトに失敗：'+err.message,true);}
  });
  $('reset-btn').addEventListener('click',async () => {
    if (client) await client.auth.signOut();
    localStorage.removeItem(CONFIG_KEY); client = null;
    show('data',false);show('auth',false);show('setup',true);$('key').value = '';setStatus('接続先を再設定してください。');
  });
  $('reload').addEventListener('click',loadAll);
  try { const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); if (saved && configValid(saved.url,saved.key)) { $('url').value=saved.url;$('key').value=saved.key;init(saved.url,saved.key); } }
  catch (e) {setStatus('接続設定の読み込みに失敗しました。再設定してください。',true);}
})();
