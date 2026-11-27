/* KYUTECH GROWTH v2.4: goal-linked logs and coaching advice. No IndexedDB hydration. */
(()=>{'use strict';
const ROOT=document.getElementById('app');
const CONFIG_KEY='kyutech-cloud-dev-settings-v1';
const AUTH_KEY='kyutech-cloud-readonly-auth';
let client=null,identity=null,model=null,tab='home',selectedPlayer='';
const ROLE_LABEL={director:'監督',staff:'スタッフ',player:'選手',parent:'保護者'};
const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const d=s=>s?String(s).slice(0,10):'—';
const empty='まだ閲覧できるデータがありません。';
const configValid=(url,key)=>{try{const u=new URL(url);return u.protocol==='https:'&&/^[-a-zA-Z0-9]+\.supabase\.co$/.test(u.hostname)&&u.pathname==='/'&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)}catch{return false}};
const safeConfig=()=>{try{const c=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');return c&&configValid(c.url,c.key)?c:null}catch{return null}};
function header(name=''){return `<header class="cloud-header"><div class="cloud-brand"><img src="./apple-touch-icon.png" alt=""><div><strong>KYUTECH GROWTH</strong><small>自分を知る。課題を知る。考える。成長する。</small></div></div><div class="cloud-status">${name?`<span style="font-size:12px">${H(name)}<span class="cloud-tag">${H(ROLE_LABEL[identity?.role]||'')}</span></span>`:''}${identity?'<button class="btn small" id="cloud-logout">ログアウト</button>':''}</div></header>`}
function frame(html,name){ROOT.innerHTML=`<div class="cloud-shell">${header(name)}<main class="cloud-main">${html}<footer class="cloud-footer">Ver.2.4 育成サイクル・監査テスト版。実際の選手・InBody・個人情報は入力しないでください。<br><a href="./demo.html">以前の端末内デモ画面（別ページ）</a> ／ <a href="./cloud-test.html">クラウド接続確認ページ</a></footer></main></div>`; document.getElementById('cloud-logout')?.addEventListener('click',logout)}
function showSetup(message=''){identity=null;model=null;const c=safeConfig();frame(`<section class="card stack cloud-auth"><h2>Supabase接続設定</h2><p class="cloud-note">公開用のProject URLとPublishable keyだけを入力してください。Secret / service_roleは使用禁止です。</p>${message?`<div class="cloud-alert">${H(message)}</div>`:''}<form id="setup-form"><div class="field"><label for="project-url">Project URL</label><input id="project-url" type="url" value="${H(c?.url||'')}" placeholder="https://xxxxx.supabase.co" required></div><div class="field"><label for="publish-key">Publishable key</label><input id="publish-key" value="${H(c?.key||'')}" autocomplete="off" required placeholder="sb_publishable_..."></div><button class="btn primary" type="submit">接続設定を保存</button></form><p class="cloud-muted">Ver.2.0の接続設定が同じブラウザにある場合は自動的に引き継がれます。</p></section>`);document.getElementById('setup-form').addEventListener('submit',e=>{e.preventDefault();const url=document.getElementById('project-url').value.trim().replace(/\/+$/,'')+'/';const key=document.getElementById('publish-key').value.trim();if(!configValid(url,key))return showSetup('Project URLは https://xxxxx.supabase.co の形式で、/rest/v1/を含めないでください。キーはsb_publishable_...です。');localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key}));setupClient(url,key)})}
function setupClient(url,key){try{if(!window.supabase?.createClient)throw Error('Supabaseのライブラリを読み込めません。ネット接続をご確認ください。');client=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:AUTH_KEY}});authenticate()}catch(e){showSetup(e.message)}}
function showLogin(err=''){identity=null;model=null;frame(`<section class="card stack cloud-auth"><h2>ログイン</h2><p class="cloud-note">Supabase Authenticationで登録した4つの架空アカウントを使用します。従来のデモIDではログインできません。</p>${err?`<div class="cloud-alert" role="alert">${H(err)}</div>`:''}<form id="login-form"><div class="field"><label for="email">メールアドレス</label><input type="email" id="email" autocomplete="username" required></div><div class="field"><label for="password">パスワード</label><input type="password" id="password" autocomplete="current-password" required></div><button class="btn primary" id="sign-in" type="submit">ログインする</button></form><button class="btn small" id="change-config" type="button">接続設定を変更する</button></section>`);document.getElementById('change-config').onclick=()=>showSetup();document.getElementById('login-form').onsubmit=async e=>{e.preventDefault();const b=document.getElementById('sign-in');b.disabled=true;try{const {error}=await client.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});document.getElementById('password').value='';if(error)throw error;await load()}catch(err){showLogin('ログインできません：'+err.message)}finally{b.disabled=false}}}
async function authenticate(){const {data,error}=await client.auth.getSession();if(error)return showLogin(error.message);if(data?.session?.user)await load();else showLogin()}
async function logout(){if(!client)return;try{const {error}=await client.auth.signOut();if(error)throw error;identity=null;model=null;showLogin()}catch(e){frame(`<div class="cloud-alert">ログアウトに失敗しました：${H(e.message)}</div><button class="btn" id="retry-logout">再試行する</button>`);document.getElementById('retry-logout').onclick=logout}}
async function get(table,columns){const rows=[];for(let start=0;start<2000;start+=200){const {data,error}=await client.from(table).select(columns).range(start,start+199);if(error)throw Error(`${table}: ${error.message} (${error.code||'unknown'})`);rows.push(...(data||[]));if(!data||data.length<200)break;}return rows}
async function load(){frame('<section class="card"><h2>クラウドデータを読み込んでいます…</h2><p class="cloud-muted">SupabaseのRLSで許可されたデータだけを取得します。</p></section>');try{
const {data:auth,error:authErr}=await client.auth.getUser();if(authErr||!auth?.user)throw Error(authErr?.message||'ログイン情報を確認できません');
const [accts,members,players,sessions,values,items,targets,shortGoals,longGoals,logs,tags,advice,exercises,assignments,assPlayers,cards,scores,reportItems]=await Promise.all([
get('accounts','account_id,display_name,status'),get('team_memberships','account_id,team_id,role,left_at'),get('players','player_id,player_name'),get('measurement_sessions','session_id,player_id,category,measured_on'),get('measurement_values','session_id,item_id,value'),get('measurement_items','item_id,item_name,unit,category'),get('measurement_targets','player_id,item_id,target_value'),get('short_term_goals','short_goal_id,player_id,target_month,goal_text'),get('long_term_goals','player_id,goal_text,valid_from,valid_to'),get('training_logs','log_id,player_id,short_goal_id,practiced_on,training_name,activity_type,focus_text,success_text,failure_text,next_action_text'),get('training_log_tags','log_id,tag'),get('coaching_advice','advice_id,player_id,short_goal_id,coach_account_id,advice_text,created_at'),get('training_exercises','exercise_id,exercise_name,instructions'),get('training_assignments','assignment_id,team_id,exercise_id,target_type,repetitions,sets,frequency_count,frequency_period,start_date,end_date'),get('training_assignment_players','assignment_id,player_id'),get('report_cards','report_id,player_id,period_start,period_end,overall_comment,status'),get('report_scores','report_id,report_item_id,score,comment'),get('report_items','report_item_id,item_name,category')]);
const mine=accts.find(x=>x.account_id===auth.user.id);const role=members.find(x=>x.account_id===auth.user.id&&!x.left_at)?.role;
if(!mine||!ROLE_LABEL[role])throw Error('ログインは成功しましたが、アカウントまたはチーム所属が見つかりません');
identity={id:auth.user.id,name:mine.display_name,role};model={players,sessions,values,items,targets,shortGoals,longGoals,logs,tags,advice,exercises,assignments,assPlayers,cards,scores,reportItems};
if(!players.some(p=>p.player_id===selectedPlayer))selectedPlayer=players[0]?.player_id||'';render();
}catch(e){identity=null;model=null;frame(`<section class="card cloud-auth"><h2>データ読み込みエラー</h2><div class="cloud-alert">${H(e.message)}</div><p class="cloud-muted">前のSQL（RLS・GRANT）と、4アカウントでのcloud-test.htmlの結果を確認してください。</p><button class="btn primary" id="retry">再試行</button><button class="btn" id="change-account">ログアウト</button></section>`);document.getElementById('retry').onclick=load;document.getElementById('change-account').onclick=logout;}}
const arr=(xs,pid)=>xs.filter(x=>x.player_id===pid);
const playerName=pid=>model.players.find(p=>p.player_id===pid)?.player_name||'選手';
const itemName=id=>model.items.find(i=>i.item_id===id)?.item_name||id;
function records(){const sessionMap=new Map(model.sessions.map(s=>[s.session_id,s]));return model.values.map(v=>({ ...v,session:sessionMap.get(v.session_id)})).filter(v=>v.session&&model.players.some(p=>p.player_id===v.session.player_id))}
const panel=(name,contents)=>`<section class="card cloud-panel"><h3>${H(name)}</h3><div class="cloud-list">${contents||`<p class="cloud-muted">${empty}</p>`}</div></section>`;
const entry=(name,body='',extra='')=>`<div class="cloud-item"><strong>${H(name)} ${extra?`<span class="cloud-tag">${H(extra)}</span>`:''}</strong>${body?`<small>${H(body)}</small>`:''}</div>`;
const metrics=pid=>records().filter(x=>x.session.player_id===pid).sort((a,b)=>b.session.measured_on.localeCompare(a.session.measured_on)).map(x=>entry(`${itemName(x.item_id)} ${x.value}${model.items.find(i=>i.item_id===x.item_id)?.unit||''}`,`${d(x.session.measured_on)} / ${x.session.category==='inbody'?'InBody':'パフォーマンス'}`)).join('');
function goalItems(pid){return [...arr(model.shortGoals,pid).map(x=>entry('短期目標',`${d(x.target_month)}：${x.goal_text}`)),...arr(model.longGoals,pid).map(x=>entry('長期目標',`${x.goal_text}（${d(x.valid_from)}〜${d(x.valid_to)}）`)),...arr(model.targets,pid).map(x=>entry(`${itemName(x.item_id)} の測定目標`,`${x.target_value}${model.items.find(i=>i.item_id===x.item_id)?.unit||''}`))].join('')}
function goalLabel(goalId){const g=model.shortGoals.find(g=>g.short_goal_id===goalId);return g?`${d(g.target_month)}：${g.goal_text}`:'（目標の紐づけなし）'}
function practice(pid){return [...arr(model.logs,pid).sort((a,b)=>b.practiced_on.localeCompare(a.practiced_on)).map(x=>entry(`${d(x.practiced_on)}　${x.training_name||'練習'}`,`関連目標：${goalLabel(x.short_goal_id)} / 重点：${x.focus_text||'—'} / 良かった点：${x.success_text||'—'} / 次回：${x.next_action_text||'—'} / タグ：${model.tags.filter(t=>t.log_id===x.log_id).map(t=>t.tag).join('・')||'—'}`)),...arr(model.advice,pid).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(x=>entry('指導者の助言',`${d(x.created_at)}：${x.advice_text} / 関連目標：${goalLabel(x.short_goal_id)}`))].join('')}
function prescriptions(pid){const exmap=new Map(model.exercises.map(x=>[x.exercise_id,x]));return model.assignments.filter(a=>a.target_type==='all'||model.assPlayers.some(x=>x.assignment_id===a.assignment_id&&x.player_id===pid)).map(x=>entry(exmap.get(x.exercise_id)?.exercise_name||'トレーニング',`回数：${x.repetitions??'—'} × ${x.sets??'—'}セット / 頻度：${x.frequency_count??'—'} ${x.frequency_period||''} / ${d(x.start_date)}〜${d(x.end_date)}`)).join('')}
function reports(pid){const imap=new Map(model.reportItems.map(x=>[x.report_item_id,x.item_name]));return arr(model.cards,pid).map(c=>entry(`${d(c.period_start)}〜${d(c.period_end)}`,`${c.overall_comment||'総評なし'} / 評価：${model.scores.filter(s=>s.report_id===c.report_id).map(s=>`${imap.get(s.report_item_id)||'項目'} ${s.score}/5`).join('・')||'未登録'}`,c.status==='published'?'公開済み':'下書き')).join('')}
// v2.2: Browser input is convenience only. All authorization is enforced by DB RLS / RPC.
const todayLocal=()=>{const t=new Date(),x=new Date(t.getTime()-t.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
const monthLocal=()=>todayLocal().slice(0,7);
let writeBusy=false;
function writer(pid){const role=identity?.role;if(!model?.players.some(p=>p.player_id===pid))return '';
  const isPlayer=role==='player';const isCoach=role==='director'||role==='staff';
  const out=[];
  const goalOptions=arr(model.shortGoals,pid).slice().sort((a,b)=>b.target_month.localeCompare(a.target_month)).map(g=>`<option value="${H(g.short_goal_id)}">${H(d(g.target_month)+' / '+g.goal_text.slice(0,60))}</option>`).join('');
  const goalSelect=(id)=>`<label for="${id}">関連づける短期目標</label><select id="${id}"><option value="">紐づけない</option>${goalOptions}</select>`;
  if(isPlayer){
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-goal-input"><h3>今月の短期目標を保存</h3><p class="cloud-muted">あなた自身の短期目標のみ編集できます。保存後、家族と指導者も閲覧できます。</p><form id="short-goal-form" class="cloud-write-form"><label for="goal-month">対象月</label><input id="goal-month" type="month" value="${monthLocal()}" required><label for="goal-text">目標</label><textarea id="goal-text" maxlength="1000" placeholder="例：スタート姿勢を週3回確認する" required></textarea><button class="btn primary" type="submit">短期目標を保存</button></form></section>`);
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-training-input"><h3>今日の練習・振り返りを記録</h3><form id="training-write-form" class="cloud-write-form"><label for="training-date">練習日</label><input type="date" id="training-date" value="${todayLocal()}" required><label for="training-type">活動区分</label><select id="training-type"><option value="practice">練習</option><option value="game">試合</option></select><label for="training-name">練習メニュー</label><input id="training-name" maxlength="120" placeholder="例：ダッシュ、守備練習" required>${goalSelect('training-goal')}<label for="training-focus">意識したこと</label><textarea id="training-focus" maxlength="1500" placeholder="今日の課題"></textarea><label for="training-success">良かったこと</label><textarea id="training-success" maxlength="1500"></textarea><label for="training-failure">改善したいこと</label><textarea id="training-failure" maxlength="1500"></textarea><label for="training-next">次回に向けて</label><textarea id="training-next" maxlength="1500"></textarea><button class="btn primary" type="submit">練習記録を保存</button></form></section>`);
    const logOpts=model.logs.filter(x=>x.player_id===pid)
      .sort((a,b)=>b.practiced_on.localeCompare(a.practiced_on))
      .map(x=>`<option value="${H(x.log_id)}">${H(x.practiced_on)} / ${H(x.training_name||'練習')}</option>`).join('');
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-training-input"><h3>過去の練習記録を編集</h3><p class="cloud-muted">自分の記録だけ編集可能です。削除はできません。</p><form id="training-edit-form" class="cloud-write-form"><label for="edit-log">編集する記録</label><select id="edit-log" required>${logOpts}</select><label for="edit-date">練習日</label><input id="edit-date" type="date" required><label for="edit-type">活動区分</label><select id="edit-type"><option value="practice">練習</option><option value="game">試合</option></select><label for="edit-name">メニュー</label><input id="edit-name" maxlength="120" required>${goalSelect('edit-goal')}<label for="edit-focus">意識したこと</label><textarea id="edit-focus" maxlength="1500"></textarea><label for="edit-success">良かったこと</label><textarea id="edit-success" maxlength="1500"></textarea><label for="edit-failure">改善したいこと</label><textarea id="edit-failure" maxlength="1500"></textarea><label for="edit-next">次回に向けて</label><textarea id="edit-next" maxlength="1500"></textarea><button class="btn primary" type="submit" ${logOpts?'':'disabled'}>練習記録を更新</button></form></section>`);
  }
  if(isCoach){
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-advice-input"><h3>${H(playerName(pid))}への指導コメント</h3><p class="cloud-muted">本人・紐づく保護者と指導者に表示されます。練習目標に紐づけることもできます。</p><form id="coaching-advice-form" class="cloud-write-form">${goalSelect('advice-goal')}<label for="advice-text">指導コメント（5〜1500文字）</label><textarea id="advice-text" minlength="5" maxlength="1500" required placeholder="例：次回は最初の3歩を意識して練習しよう"></textarea><button class="btn primary" type="submit">指導コメントを保存</button></form></section>`);
    const ordered=model.items.filter(x=>x.category==='performance');
    const fields=ordered.map(x=>`<label class="cloud-batch-field"><span>${H(x.item_name)}（${H(x.unit)}）</span><input class="batch-value" type="number" data-item-id="${H(x.item_id)}" step="any" min="0.001" max="100000" placeholder="未測定なら空欄"></label>`).join('');
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-measure-input"><h3>${H(playerName(pid))}のパフォーマンス一括入力</h3><p class="cloud-muted">測定した項目だけ入力してください。複数項目を1つの測定回にまとめ、項目ごとに履歴を記録します。</p><form id="measurement-batch-form" class="cloud-write-form"><label for="measure-date">測定日</label><input type="date" id="measure-date" value="${todayLocal()}" required><div class="cloud-batch-grid">${fields}</div><label for="measure-reason">登録理由・出典（5文字以上）</label><textarea id="measure-reason" minlength="5" maxlength="500" required placeholder="例：架空の一括テスト入力"></textarea><button class="btn primary" type="submit" ${ordered.length?'':'disabled'}>測定項目をまとめて保存</button></form></section>`);
    const existing=records().filter(x=>x.session.player_id===pid).sort((a,b)=>b.session.measured_on.localeCompare(a.session.measured_on));
    const choices=existing.map(x=>`<option value="${H(x.session_id+'|'+x.item_id)}">${H(x.session.measured_on)} / ${H(itemName(x.item_id))} / ${H(x.value)}</option>`).join('');
    out.push(`<section class="card cloud-panel cloud-write-panel cloud-measure-input"><h3>登録済み測定値を訂正</h3><p class="cloud-muted">訂正前後の数値・担当者・理由が監査履歴に残ります。誤入力の場合のみ使用してください。</p><form id="measurement-correct-form" class="cloud-write-form"><label for="correct-target">訂正対象</label><select id="correct-target" required>${choices}</select><label for="correct-value">訂正後の数値</label><input id="correct-value" type="number" step="any" min="0" max="100000" required><label for="correct-reason">訂正理由（5文字以上）</label><textarea id="correct-reason" required minlength="5" maxlength="500" placeholder="例：元の架空記録を確認して訂正"></textarea><button class="btn primary" type="submit" ${choices?'':'disabled'}>理由を記録して訂正</button></form></section>`);
  }
  return out.length?`<div class="cloud-row cloud-write-grid">${out.join('')}</div><p id="cloud-save-status" role="status" aria-live="polite" class="cloud-muted"></p>`:'';
}
function submitStatus(message,isError=false){const x=document.getElementById('cloud-save-status');if(x){x.textContent=message;x.className=isError?'cloud-alert':'cloud-saved';}}
async function saveWrite(job){if(writeBusy)return;writeBusy=true;ROOT.querySelectorAll('.cloud-write-form button[type=submit]').forEach(b=>b.disabled=true);submitStatus('クラウドに保存しています…');try{if(!client||!identity)throw Error('ログインし直してください');const {data:auth,error:authError}=await client.auth.getUser();if(authError||auth?.user?.id!==identity.id)throw Error('ログインが切り替わりました。ログインし直してください');await job();await load();}catch(e){submitStatus('保存できません：'+e.message,true);ROOT.querySelectorAll('.cloud-write-form button[type=submit]').forEach(b=>b.disabled=false);}finally{writeBusy=false;}}
function fillTrainingEdit(){
  const x=document.getElementById('edit-log');if(!x||!model)return;
  const r=model.logs.find(y=>y.log_id===x.value);if(!r)return;
  const val=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};
  val('edit-date',r.practiced_on);val('edit-type',r.activity_type);val('edit-goal',r.short_goal_id||'');
  val('edit-name',r.training_name);val('edit-focus',r.focus_text);
  val('edit-success',r.success_text);val('edit-failure',r.failure_text);
  val('edit-next',r.next_action_text);
}
function attachWriters(pid){
  document.getElementById('short-goal-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    const month=document.getElementById('goal-month').value;const content=document.getElementById('goal-text').value.trim();
    if(!/^\d{4}-\d{2}$/.test(month)||!content)throw Error('対象月と目標を確認してください');
    const first=month+'-01';const existing=model.shortGoals.find(g=>g.player_id===pid&&g.target_month===first);
    if(existing){const {error}=await client.from('short_term_goals').update({goal_text:content}).eq('short_goal_id',existing.short_goal_id).select('short_goal_id').single();if(error)throw error;}
    else{const {error}=await client.from('short_term_goals').insert({player_id:pid,target_month:first,goal_text:content});if(error)throw error;}
  });});
  document.getElementById('training-write-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    const practiced_on=document.getElementById('training-date').value;
    const activity_type=document.getElementById('training-type').value;
    const training_name=document.getElementById('training-name').value.trim();
    if(!practiced_on||!training_name)throw Error('練習日とメニューを入力してください');
    const payload={player_id:pid,short_goal_id:document.getElementById('training-goal').value||null,practiced_on,activity_type,training_name,focus_text:document.getElementById('training-focus').value.trim(),success_text:document.getElementById('training-success').value.trim(),failure_text:document.getElementById('training-failure').value.trim(),next_action_text:document.getElementById('training-next').value.trim()};
    const {error}=await client.from('training_logs').insert(payload);if(error)throw error;
  });});
  document.getElementById('training-edit-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    const log_id=document.getElementById('edit-log').value;
    if(!model.logs.some(x=>x.log_id===log_id&&x.player_id===pid))throw Error('編集対象が見つかりません');
    const payload={short_goal_id:document.getElementById('edit-goal').value||null,practiced_on:document.getElementById('edit-date').value,activity_type:document.getElementById('edit-type').value,training_name:document.getElementById('edit-name').value.trim(),focus_text:document.getElementById('edit-focus').value.trim(),success_text:document.getElementById('edit-success').value.trim(),failure_text:document.getElementById('edit-failure').value.trim(),next_action_text:document.getElementById('edit-next').value.trim()};
    if(!payload.practiced_on||!payload.training_name)throw Error('練習日とメニューを入力してください');
    const {data,error}=await client.from('training_logs').update(payload).eq('log_id',log_id).eq('player_id',pid).select('log_id');
    if(error)throw error;if(!data?.length)throw Error('更新できませんでした。本人権限を確認してください');
  });});
  document.getElementById('edit-log')?.addEventListener('change',fillTrainingEdit);
  fillTrainingEdit();
  document.getElementById('coaching-advice-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    if(!['director','staff'].includes(identity.role))throw Error('指導コメントを登録できる役割ではありません');
    const advice_text=document.getElementById('advice-text').value.trim();
    if(advice_text.length<5||advice_text.length>1500)throw Error('コメントは5〜1500文字で入力してください');
    const short_goal_id=document.getElementById('advice-goal').value||null;
    if(short_goal_id&&!model.shortGoals.some(g=>g.short_goal_id===short_goal_id&&g.player_id===pid))throw Error('関連づける目標が見つかりません');
    const {error}=await client.from('coaching_advice').insert({player_id:pid,short_goal_id,coach_account_id:identity.id,advice_text});
    if(error)throw error;
  });});
  document.getElementById('measurement-batch-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    const inputs=[...document.querySelectorAll('.batch-value')];
    const items=inputs.filter(x=>x.value.trim()!=='').map(x=>({item_id:x.dataset.itemId,value:Number(x.value)}));
    const reason=document.getElementById('measure-reason').value.trim();
    if(!items.length)throw Error('少なくとも1項目入力してください');
    if(items.some(x=>!Number.isFinite(x.value)||x.value<=0||x.value>100000)||reason.length<5)throw Error('測定値と理由を確認してください');
    const {error}=await client.rpc('record_measurement_batch',{p_player_id:pid,p_measured_on:document.getElementById('measure-date').value,p_category:'performance',p_items:items,p_reason:reason});
    if(error)throw error;
  });});
  document.getElementById('measurement-correct-form')?.addEventListener('submit',e=>{e.preventDefault();saveWrite(async()=>{
    const chosen=document.getElementById('correct-target').value;
    const sep=chosen.indexOf('|');if(sep<0)throw Error('訂正対象を選択してください');
    const sessionId=chosen.slice(0,sep), itemId=chosen.slice(sep+1);
    const current=records().find(x=>x.session_id===sessionId&&x.item_id===itemId&&x.session.player_id===pid);
    if(!current)throw Error('訂正対象が見つかりません');
    const newValue=Number(document.getElementById('correct-value').value);
    const reason=document.getElementById('correct-reason').value.trim();
    if(!Number.isFinite(newValue)||newValue<0||reason.length<5)throw Error('訂正後の値と理由を確認してください');
    if(newValue===Number(current.value))throw Error('現在の数値と異なる値を入力してください');
    const {error}=await client.rpc('correct_measurement_value',{p_session_id:sessionId,p_item_id:itemId,p_new_value:newValue,p_reason:reason});
    if(error)throw error;
  });});
}
function render(){if(!identity||!model)return;const staff=['director','staff'].includes(identity.role);const nav=staff?[['home','ホーム'],['players','選手一覧'],['measure','成長・測定'],['goals','目標'],['practice','練習・助言'],['reports','通知表']]:[['home','ホーム'],['measure','成長'],['goals','目標'],['practice','練習'],['reports','通知表']];if(!nav.some(n=>n[0]===tab))tab='home';
const select=staff?`<div class="cloud-filter"><label for="cloud-player">対象選手</label><select id="cloud-player">${model.players.map(p=>`<option value="${H(p.player_id)}" ${p.player_id===selectedPlayer?'selected':''}>${H(p.player_name)}</option>`).join('')}</select></div>`:'';
const pid=selectedPlayer;
let content='';if(tab==='home'){
const rows=records();content=`<h2 class="cloud-title">${H(identity.name)}さんのホーム</h2><p class="cloud-help">ログイン状態・表示範囲はSupabaseで制御されています。ここに表示される内容はクラウドから取得した架空データです。</p><div class="cloud-kpis"><div class="cloud-kpi"><b>${model.players.length}</b><span>閲覧できる選手数</span></div><div class="cloud-kpi"><b>${rows.length}</b><span>測定記録</span></div><div class="cloud-kpi"><b>${model.logs.length}</b><span>練習記録</span></div><div class="cloud-kpi"><b>${model.cards.length}</b><span>通知表</span></div></div><div class="cloud-row">${panel('選手',model.players.map(p=>entry(p.player_name,staff?'チーム内の閲覧可能選手':'本人または紐づく選手')).join(''))}${panel('最近の測定',rows.sort((a,b)=>b.session.measured_on.localeCompare(a.session.measured_on)).slice(0,5).map(v=>entry(`${playerName(v.session.player_id)}：${itemName(v.item_id)} ${v.value}`,d(v.session.measured_on))).join(''))}${panel('最近の目標',model.shortGoals.slice(0,5).map(g=>entry(playerName(g.player_id),g.goal_text)).join(''))}</div>`;
}else if(tab==='players'){content=`<h2 class="cloud-title">選手一覧</h2>${panel('閲覧を許可された選手',model.players.map(p=>entry(p.player_name)).join(''))}`;
}else if(tab==='measure'){content=`<h2 class="cloud-title">成長・測定</h2>${select}${staff?panel(`${playerName(pid)}の測定結果`,metrics(pid)):model.players.map(p=>panel(`${p.player_name}の測定結果`,metrics(p.player_id))).join('<div style="height:14px"></div>')}${staff?writer(pid):''}`;
}else if(tab==='goals'){content=`<h2 class="cloud-title">目標</h2>${select}${staff?panel(playerName(pid),goalItems(pid)):model.players.map(p=>panel(p.player_name,goalItems(p.player_id))).join('<div style="height:14px"></div>')}${identity.role==='player'?writer(model.players[0]?.player_id||''):''}`;
}else if(tab==='practice'){content=`<h2 class="cloud-title">練習記録・助言・トレーニング処方</h2>${select}${staff?`<div class="cloud-row">${panel('練習記録・助言',practice(pid))}${panel('処方されたトレーニング',prescriptions(pid))}</div>`:model.players.map(p=>`<div class="cloud-row">${panel(`${p.player_name}の練習・助言`,practice(p.player_id))}${panel('トレーニング処方',prescriptions(p.player_id))}</div>`).join('<div style="height:14px"></div>')}${identity.role==='player'?writer(model.players[0]?.player_id||''):staff?writer(pid):''}`;
}else if(tab==='reports'){content=`<h2 class="cloud-title">通知表</h2>${select}${staff?panel(`${playerName(pid)}の通知表`,reports(pid)):model.players.map(p=>panel(`${p.player_name}の通知表`,reports(p.player_id))).join('<div style="height:14px"></div>')}`;}
frame(`<div class="cloud-note">Ver.2.4：目標と練習記録の紐づけ、指導コメント入力、練習記録の編集監査を追加。端末内デモデータの同期は対象外です。端末内デモデータとは連動していません。</div><div class="cloud-navbar" role="navigation" aria-label="メインメニュー">${nav.map(([id,label])=>`<button class="cloud-nav-btn ${tab===id?'active':''}" data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</div><div id="cloud-content" data-page="${tab}">${content}</div><p class="cloud-help" style="margin-top:18px"><button class="btn small" id="refresh-cloud">クラウドデータを更新</button>　※ネット接続が必要です。オフラインでは取得できません。</p>`,identity.name);
ROOT.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});document.getElementById('cloud-player')?.addEventListener('change',e=>{selectedPlayer=e.target.value;render()});document.getElementById('refresh-cloud').onclick=load;if(identity.role==='player')attachWriters(model.players[0]?.player_id||'');else if(staff)attachWriters(pid);}
const c=safeConfig();if(c)setupClient(c.url,c.key);else showSetup();
})();