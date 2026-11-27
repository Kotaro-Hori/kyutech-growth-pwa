/* KYUTECH GROWTH v1.8: IndexedDB table projections (prototype, not SQL/permissions).
 * Existing v1.7 screen logic retains a compatibility snapshot in `app/state`.
 * On each save, 22 structured stores are rebuilt in the SAME transaction.
 * This is intentionally simple, not an efficient production database engine.
 */
(function(global){
'use strict';
const SCHEMA_VERSION=2;
const TABLES=['teams','accounts','players','team_memberships','player_team_memberships','guardian_players','measurement_items','measurement_sessions','measurement_values','measurement_targets','short_term_goals','long_term_goals','training_logs','training_log_tags','training_exercises','training_assignments','training_assignment_players','coaching_advice','report_cards','report_items','report_scores','attachments'];
const IB=[['height','身長','cm'],['weight','体重','kg'],['muscle','骨格筋量','kg'],['fatMass','体脂肪量','kg'],['fatRate','体脂肪率','%'],['lean','除脂肪量','kg'],['water','体水分量','L'],['leftArm','左腕筋肉量','kg'],['rightArm','右腕筋肉量','kg'],['trunk','体幹筋肉量','kg'],['rightLeg','右脚筋肉量','kg'],['leftLeg','左脚筋肉量','kg']];
function upgrade(db){if(!db.objectStoreNames.contains('app'))db.createObjectStore('app');for(const t of TABLES)if(!db.objectStoreNames.contains(t))db.createObjectStore(t,{keyPath:'id'});}
function projection(s){
 const data=Object.fromEntries(TABLES.map(t=>[t,[]]));const push=(t,x)=>data[t].push(x);
 const team=s.workspace?.teamId||'kyutech-kagoshima-demo';const players=Array.isArray(s.players)?s.players:[];
 push('teams',{id:team,team_name:s.workspace?.teamName||'Kyutech鹿児島（試作）'});
 const users=Array.isArray(s.demoUsers)?s.demoUsers:[];
 for(const u of users){push('accounts',{id:u.id,display_name:u.name,role_hint:u.role,player_id:u.playerId||null});push('team_memberships',{id:team+'|'+u.id,team_id:team,account_id:u.id,role:u.role});if(u.role==='parent'&&u.playerId)push('guardian_players',{id:u.id+'|'+u.playerId,guardian_account_id:u.id,player_id:u.playerId,active:true});}
 for(const p of players){const account=users.find(u=>u.role==='player'&&u.playerId===p.id);push('players',{id:p.id,account_id:account?.id||null,player_name:p.name,grade:p.grade||'',parent_name:p.parentName||''});push('player_team_memberships',{id:team+'|'+p.id,team_id:team,player_id:p.id,join_year:p.joinYear||null});}
 const metrics=Array.isArray(s.metrics)?s.metrics:[];
 for(const m of metrics)push('measurement_items',{id:'p:'+m.id,category:'performance',item_name:m.name,unit:m.unit||'',better:m.better||null});
 for(const [k,name,unit] of IB)push('measurement_items',{id:'i:'+k,category:'inbody',item_name:name,unit,better:null});
 const records=Array.isArray(s.records)?s.records:[];
 for(const r of records){
  if(r.kind==='ability'||r.kind==='inbody'){
   const category=r.kind==='ability'?'performance':'inbody';push('measurement_sessions',{id:r.id,player_id:r.playerId,category,measured_on:r.date,created_at:r.createdAt||null,recorded_by:r.recordedBy||null});
   for(const [k,v] of Object.entries(r.values||{}))if(v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))){const item=(category==='performance'?'p:':'i:')+k;if(data.measurement_items.some(x=>x.id===item))push('measurement_values',{id:r.id+'|'+item,session_id:r.id,item_id:item,value:Number(v)});}
   if(r.photoData)push('attachments',{id:'ib:'+r.id,session_id:r.id,exercise_id:null,report_id:null,file_name:'InBody原本.jpg',content_type:'image/jpeg',data_url:r.photoData});
  }
  if(r.kind==='training'){
   const goal=s.shortGoals?.[r.playerId];push('training_logs',{id:r.id,player_id:r.playerId,short_goal_id:goal?'short:'+r.playerId:null,practiced_on:r.date,training_name:r.activityName||'',repetitions:r.values?.reps??null,load_value:r.values?.weight??null,sets:r.values?.sets??null,focus_text:r.goalReflection||r.comment||'',success_text:r.gain||'',failure_text:r.failure||'',next_action_text:r.nextAction||r.improvement||'',created_at:r.createdAt||null,activity_type:(r.tags||[]).includes('試合')?'game':'practice'});
   for(const tag of (r.tags||[]))if(['守備','バッティング','ピッチング'].includes(tag))push('training_log_tags',{id:r.id+'|'+tag,log_id:r.id,tag});
  }
 }
 for(const [pid,items] of Object.entries(s.goalTargets||{}))for(const [k,v] of Object.entries(items||{})){
  if(v===''||v===null||v===undefined||!Number.isFinite(Number(v)))continue;
  const ix=k.indexOf('|'),kind=k.slice(0,ix),key=k.slice(ix+1);const item=kind==='ability'?'p:'+key:kind==='inbody'?'i:'+key:null;
  if(item&&data.measurement_items.some(x=>x.id===item))push('measurement_targets',{id:pid+'|'+item,player_id:pid,item_id:item,target_value:Number(v),valid_from:null,valid_to:null});
 }
 for(const [pid,g] of Object.entries(s.shortGoals||{}))if(g&&g.text)push('short_term_goals',{id:'short:'+pid,player_id:pid,target_month:(g.targetMonth||g.updatedAt||'').slice(0,7)||null,goal_text:g.text,updated_at:g.updatedAt||null});
 for(const [pid,g] of Object.entries(s.longGoals||{}))if(g&&g.text)push('long_term_goals',{id:'long:'+pid,player_id:pid,set_by:'director01',goal_text:g.text,created_at:g.updatedAt||null});
 for(const t of s.trainingTypes||[]){push('training_exercises',{id:t.id,exercise_name:t.name,fields:t.fields||[],instructions:t.instructions||'',youtube_url:t.youtubeUrl||null});if(t.attachmentData)push('attachments',{id:'ex:'+t.id,session_id:null,exercise_id:t.id,report_id:null,file_name:t.attachmentName||'資料',content_type:t.attachmentType||null,data_url:t.attachmentData});}
 for(const a of s.trainingAssignments||[]){push('training_assignments',{id:a.id,team_id:team,exercise_id:a.activityId,assigned_by:a.coachId,description:a.description||'',target_type:a.playerId==='all'?'all':'individual',created_at:a.assignedAt||null});if(a.playerId!=='all')push('training_assignment_players',{id:a.id+'|'+a.playerId,assignment_id:a.id,player_id:a.playerId});}
 for(const a of s.coachFeedback||[])push('coaching_advice',{id:a.id,player_id:a.playerId,coach_account_id:a.actor||'スタッフ',short_goal_id:s.shortGoals?.[a.playerId]?'short:'+a.playerId:null,advice_text:a.body||'',created_at:a.at||null});
 for(const r of s.reportCards||[]){push('report_cards',{id:r.id,player_id:r.playerId,team_id:team,created_by:'director01',report_period:r.date,status:'published',overall_comment:r.comment||''});for(const [key,item] of [['baseball','report:baseball'],['body','report:body']]){const n=Number(r[key]);if(Number.isInteger(n)&&n>=1&&n<=5)push('report_scores',{id:r.id+'|'+item,report_id:r.id,report_item_id:item,score:n});}}
 push('report_items',{id:'report:baseball',category:'野球',item_name:'総合評価',active:true});push('report_items',{id:'report:body',category:'体づくり',item_name:'総合評価',active:true});
 return data;
}
async function write(db,s){const projections=projection(s);const tx=db.transaction(['app',...TABLES],'readwrite');tx.objectStore('app').put(s,'state');for(const table of TABLES){const store=tx.objectStore(table);store.clear();for(const row of projections[table])store.put(row);}return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('DB保存失敗'));tx.onabort=()=>reject(tx.error||new Error('DB保存中止'));});}
async function counts(db){const tx=db.transaction(TABLES,'readonly');const results=await Promise.all(TABLES.map(t=>new Promise((resolve,reject)=>{const r=tx.objectStore(t).count();r.onsuccess=()=>resolve([t,r.result]);r.onerror=()=>reject(r.error)})));return results;}
async function rows(db,table,limit=20){if(!TABLES.includes(table))throw Error('不明なテーブルです');const tx=db.transaction(table,'readonly');return new Promise((resolve,reject)=>{const all=[];const r=tx.objectStore(table).openCursor();r.onsuccess=()=>{const c=r.result;if(c&&all.length<limit){const v={...c.value};if(v.data_url)v.data_url='（ファイルデータは省略）';all.push(v);c.continue();}else resolve(all);};r.onerror=()=>reject(r.error);});}
global.KG_LOCAL_DB={TABLES,SCHEMA_VERSION,upgrade,write,counts,rows};
})(window);
