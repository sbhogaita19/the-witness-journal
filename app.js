const STORE='witnessJournal.v1';
const TAGS=[
 {id:'recognition',name:'Who recognises awareness?',desc:'Look at the knowing itself without quickly making a knower.'},
 {id:'direct',name:'Direct knowing',desc:'Distinguish immediate seeing, feeling and hearing from ideas about experience.'},
 {id:'witness',name:'Seer and ego',desc:'Notice the witness or seer language, and what the “I” and “me” try to own.'},
 {id:'shiva-shakti',name:'Shiva and Shakti',desc:'Explore awareness and its power in Kashmir Shaivism as a living question.'},
 {id:'nobody',name:'Nobody · nothing · wanting nothing',desc:'Hold the phrase lightly and test it in ordinary experience.'},
 {id:'gauri-shankar',name:'Gauri Shankar',desc:'Notice breath, body, energy, resistance and the after-effect without forcing meaning.'},
 {id:'om',name:'Om',desc:'Attend to sound, vibration, silence and the return of thought.'},
 {id:'gratitude',name:'Gratitude',desc:'Receive this day, food and relationship without making gratitude a duty.'}
];
let state={entries:[]},selectedTags=new Set(),deferredPrompt;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function load(){try{const x=JSON.parse(localStorage.getItem(STORE));if(x&&Array.isArray(x.entries))state=x}catch(e){console.warn(e)}}
function persist(){localStorage.setItem(STORE,JSON.stringify(state))}
function show(view){$$('.view').forEach(x=>x.classList.toggle('active',x.id===view));$$('.tabs button').forEach(x=>x.classList.toggle('active',x.dataset.view===view));scrollTo({top:0,behavior:'smooth'});if(view==='review')renderEntries()}
function renderTags(){const host=$('#tagChoices');host.innerHTML='';TAGS.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='chip'+(selectedTags.has(t.id)?' selected':'');b.textContent=t.name;b.onclick=()=>{selectedTags.has(t.id)?selectedTags.delete(t.id):selectedTags.add(t.id);renderTags()};host.append(b)})}
function start(kind='free',practice='',period=''){resetForm();$('#kind').value=kind;$('#practice').value=practice||period;const map={before:['Before practice','What is present before beginning?','Notice intention, expectation, body and the one who wants an outcome.'],after:['After practice','What was directly known?','Describe sensations, feelings, thoughts and silence before interpreting them.'],gratitude:[period+' gratitude','What is being received now?','Name what is given: life, food, people, earth, effort. Let gratitude be felt rather than performed.'],free:['Free writing','What is true in experience now?','Write what was actually seen, felt or heard. Leave conclusions aside for a moment.']};const a=map[kind]||map.free;$('#formKicker').textContent=a[0];$('#formTitle').textContent=a[1];$('#guidedPrompt').textContent=a[2];if(practice==='Gauri Shankar')selectedTags.add('gauri-shankar');if(practice==='Om')selectedTags.add('om');if(kind==='gratitude')selectedTags.add('gratitude');renderTags();show('write')}
function resetForm(){stopRecordingSilently();$('#entryForm').reset();$('#entryId').value='';selectedTags.clear();renderTags();$('#saveStatus').textContent='';$('#formKicker').textContent='Free writing';$('#formTitle').textContent='What is true in experience now?';$('#guidedPrompt').textContent='Write what was actually seen, felt or heard. Leave conclusions aside for a moment.';formAudio=null;formAudioDeleted=false;renderVoicePreview();setVoiceStatus('')}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function saveEntry(e){e.preventDefault();if(mediaRecorder&&mediaRecorder.state==='recording'){await stopRecording()}
 const id=$('#entryId').value||crypto.randomUUID();const old=state.entries.find(x=>x.id===id);
 const entry={id,created:old?.created||new Date().toISOString(),updated:new Date().toISOString(),kind:$('#kind').value,practice:$('#practice').value.trim(),direct:$('#direct').value.trim(),story:$('#story').value.trim(),beforeStory:$('#beforeStory').value.trim(),nextStep:$('#nextStep').value.trim(),tags:[...selectedTags]};
 state.entries=state.entries.filter(x=>x.id!==id);state.entries.unshift(entry);persist();
 let voiceNote='';
 try{await idbDel(id);if(formAudio){await idbPut(id,{blob:formAudio.blob,seconds:formAudio.seconds,mime:formAudio.blob.type||'audio/webm'});voiceNote=' Voice note saved with it.'}}catch(err){voiceNote=' The voice note could not be saved in this browser, but the written entry is safe.';console.warn(err)}
 formAudio=null;formAudioDeleted=false;renderVoicePreview();setVoiceStatus('');
 $('#saveStatus').textContent='Saved on this device.'+voiceNote;setTimeout(()=>show('review'),700)}
async function edit(id){const x=state.entries.find(e=>e.id===id);if(!x)return;resetForm();$('#entryId').value=x.id;$('#kind').value=x.kind;$('#practice').value=x.practice;$('#direct').value=x.direct;$('#story').value=x.story;$('#beforeStory').value=x.beforeStory;$('#nextStep').value=x.nextStep;selectedTags=new Set(x.tags);renderTags();$('#formKicker').textContent='Edit entry';$('#formTitle').textContent='Return to your own words';
 try{const rec=await idbGet(id);if(rec){formAudio={blob:rec.blob,seconds:rec.seconds,saved:true};renderVoicePreview()}}catch(e){console.warn(e)}
 show('write')}
function removeOne(id){if(confirm('Delete this entry and its voice note? This cannot be undone.')){state.entries=state.entries.filter(e=>e.id!==id);persist();idbDel(id).catch(()=>{});renderEntries()}}
function audioExt(mime=''){if(mime.includes('mp4'))return'.m4a';if(mime.includes('ogg'))return'.ogg';if(mime.includes('mpeg'))return'.mp3';return'.webm'}
function fmtSecs(s){s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function fmtBytes(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function attachEntryAudio(entry,el){idbGet(entry.id).then(rec=>{if(!rec||!rec.blob)return;const url=URL.createObjectURL(rec.blob);const box=document.createElement('div');box.className='voice-entry';
 const head=document.createElement('p');head.className='voice-line';head.textContent='Voice note · '+fmtSecs(rec.seconds)+' · '+fmtBytes(rec.blob.size);
 const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=url;
 const dl=document.createElement('a');dl.className='voice-dl';dl.href=url;dl.download='voice-note-'+entry.created.slice(0,10)+audioExt(rec.blob.type);dl.textContent='Download voice note';
 box.append(head,audio,dl);const actions=el.querySelector('.entry-actions');el.insertBefore(box,actions)}).catch(()=>{})}
function renderEntries(filter='all'){const list=$('#entries');const rows=filter==='all'?state.entries:state.entries.filter(e=>e.tags.includes(filter));list.innerHTML='';rows.forEach(x=>{const t=x.tags.map(id=>TAGS.find(t=>t.id===id)?.name).filter(Boolean);const el=document.createElement('article');el.className='entry';el.innerHTML=`<div class="entry-head"><h3>${esc(x.practice||({'before':'Before practice','after':'After practice','gratitude':'Gratitude','free':'Free writing'}[x.kind]))}</h3><time>${new Date(x.created).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</time></div><div class="tagline">${t.map(esc).join(' · ')}</div><p class="body">${esc(x.direct)}</p>${x.story||x.beforeStory||x.nextStep?`<details><summary>See the whole entry</summary>${x.story?`<p><b>The “I” story</b><br>${esc(x.story)}</p>`:''}${x.beforeStory?`<p><b>Before the story</b><br>${esc(x.beforeStory)}</p>`:''}${x.nextStep?`<p><b>Gentle next step</b><br>${esc(x.nextStep)}</p>`:''}</details>`:''}<div class="entry-actions"><button data-edit="${x.id}">Edit</button><button data-remove="${x.id}">Delete</button></div>`;list.append(el);attachEntryAudio(x,el)});$('#empty').classList.toggle('hidden',rows.length>0);const counts=state.entries.reduce((a,e)=>{e.tags.forEach(t=>a[t]=(a[t]||0)+1);return a},{});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];$('#summary').innerHTML=`<div class="stat"><b>${state.entries.length}</b><span>entries</span></div><div class="stat"><b>${state.entries.filter(e=>Date.now()-new Date(e.created)<7*864e5).length}</b><span>last 7 days</span></div><div class="stat"><b>${top?top[1]:0}</b><span>${top?esc(TAGS.find(t=>t.id===top[0])?.name||'thread'):'threads revisited'}</span></div>`}
function renderFilters(){const h=$('#filters');h.innerHTML='';[['all','All'],...TAGS.map(t=>[t.id,t.name])].forEach(([id,name],i)=>{const b=document.createElement('button');b.className='chip'+(i===0?' selected':'');b.textContent=name;b.onclick=()=>{$$('#filters .chip').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderEntries(id)};h.append(b)})}
function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function blobToB64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function b64ToBlob(b64,mime){const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type:mime||'audio/webm'})}
async function exportJson(){const entries=JSON.parse(JSON.stringify(state.entries));let audioCount=0;
 for(const e of entries){try{const rec=await idbGet(e.id);if(rec&&rec.blob){e.audio={mimeType:rec.blob.type||'audio/webm',seconds:rec.seconds||null,base64:await blobToB64(rec.blob)};audioCount++}}catch(err){console.warn(err)}}
 download(`witness-journal-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json',JSON.stringify({format:'witness-journal',version:2,exported:new Date().toISOString(),includesAudio:true,entries},null,2));
 $('#backupNote').textContent=audioCount?`Backup downloaded with ${audioCount} voice note${audioCount>1?'s':''} included.`:'Backup downloaded.'}
async function exportText(){const parts=[];for(const e of state.entries){let voice='no';try{if(await idbGet(e.id))voice='yes (saved in the JSON backup)'}catch(err){}
 parts.push(`${new Date(e.created).toLocaleString()}\n${e.practice||e.kind}\nThreads: ${e.tags.map(id=>TAGS.find(t=>t.id===id)?.name).join(', ')}\nVoice note: ${voice}\n\nDirect experience\n${e.direct}\n\nWhat “I” claimed\n${e.story}\n\nBefore the story\n${e.beforeStory}\n\nNext step\n${e.nextStep}\n\n---`)}
 download(`witness-journal-${new Date().toISOString().slice(0,10)}.txt`,'text/plain',parts.join('\n\n'))}
function importFile(file){const r=new FileReader();r.onload=async()=>{try{const x=JSON.parse(r.result);if(!x||!Array.isArray(x.entries))throw Error();const valid=x.entries.every(e=>e.id&&e.created&&typeof e.direct==='string'&&Array.isArray(e.tags));if(!valid)throw Error();
 let audioCount=0;
 for(const e of x.entries){if(e.audio&&typeof e.audio.base64==='string'&&e.audio.base64.length){try{await idbPut(e.id,{blob:b64ToBlob(e.audio.base64,e.audio.mimeType),seconds:e.audio.seconds||null,mime:e.audio.mimeType||'audio/webm'});audioCount++}catch(err){console.warn(err)}}delete e.audio}
 const map=new Map(state.entries.map(e=>[e.id,e]));x.entries.forEach(e=>map.set(e.id,e));state.entries=[...map.values()].sort((a,b)=>new Date(b.created)-new Date(a.created));persist();renderEntries();
 alert(`Imported ${x.entries.length} entries${audioCount?` and ${audioCount} voice note${audioCount>1?'s':''}`:''}. Existing entries were kept.`);show('review')}catch(e){alert('That file is not a valid Witness Journal backup.')}};r.readAsText(file)}

/* ---------- voice notes: private on-device recording (IndexedDB) ---------- */
const ADB='witnessJournalAudio',ASTORE='notes',MAX_REC_MS=10*60*1000;
let mediaRecorder=null,recChunks=[],recStream=null,recTick=null,recStartedAt=0,recStopResolve=null;
let formAudio=null,formAudioDeleted=false,voicePreviewUrl=null;
function idbOpen(){return new Promise((res,rej)=>{if(!('indexedDB'in window))return rej(new Error('IndexedDB unavailable'));const r=indexedDB.open(ADB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ASTORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function idbPut(id,rec){return idbOpen().then(db=>new Promise((res,rej)=>{const tx=db.transaction(ASTORE,'readwrite');tx.objectStore(ASTORE).put(rec,id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}))}
function idbGet(id){return idbOpen().then(db=>new Promise((res,rej)=>{const rq=db.transaction(ASTORE).objectStore(ASTORE).get(id);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error)}))}
function idbDel(id){return idbOpen().then(db=>new Promise((res,rej)=>{const tx=db.transaction(ASTORE,'readwrite');tx.objectStore(ASTORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}))}
function idbClear(){return idbOpen().then(db=>new Promise((res,rej)=>{const tx=db.transaction(ASTORE,'readwrite');tx.objectStore(ASTORE).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}))}
function voiceSupported(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder&&window.indexedDB)}
function setVoiceStatus(msg,recording){const el=$('#voiceStatus');el.textContent=msg;el.classList.toggle('recording',!!recording)}
function renderVoicePreview(){const box=$('#voicePreview');box.innerHTML='';if(voicePreviewUrl){URL.revokeObjectURL(voicePreviewUrl);voicePreviewUrl=null}
 if(!formAudio){box.classList.add('hidden');return}
 voicePreviewUrl=URL.createObjectURL(formAudio.blob);
 const line=document.createElement('p');line.className='voice-line';line.textContent='Voice note · '+fmtSecs(formAudio.seconds)+' · '+fmtBytes(formAudio.blob.size);
 const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=voicePreviewUrl;
 const hint=document.createElement('p');hint.className='muted small';hint.textContent=formAudio.saved?'This saved voice note stays with the entry. Remove it to record a new one.':'Not saved yet - it stores privately with the entry when you tap Save below.';
 const rm=document.createElement('button');rm.type='button';rm.className='ghost';rm.textContent='Remove voice note';rm.onclick=()=>{formAudio=null;formAudioDeleted=true;renderVoicePreview();setVoiceStatus('Voice note removed. Save the entry to make it final.')};
 box.append(line,audio,hint,rm);box.classList.remove('hidden')}
async function startRecording(){if(!voiceSupported()){setVoiceStatus('Voice recording is not available in this browser. The written entry still works.');return}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(err){setVoiceStatus(err&&err.name==='NotAllowedError'?'Microphone access is off, so nothing was recorded. Allow it from the browser address bar, then try again.':'The microphone could not be started'+(err&&err.message?': '+err.message:'.'));return}
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}})||'';
 recStream=stream;recChunks=[];recStartedAt=Date.now();
 try{mediaRecorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}catch(err){stream.getTracks().forEach(t=>t.stop());setVoiceStatus('Recording could not start in this browser.');return}
 mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)recChunks.push(e.data)};
 mediaRecorder.onstop=()=>{$('#recStart').classList.remove('hidden');$('#recStop').classList.add('hidden');const seconds=(Date.now()-recStartedAt)/1000;const blob=new Blob(recChunks,{type:mediaRecorder.mimeType||mime||'audio/webm'});recStream&&recStream.getTracks().forEach(t=>t.stop());recStream=null;mediaRecorder=null;clearInterval(recTick);
  if(blob.size&&seconds>=1){formAudio={blob,seconds,saved:false};formAudioDeleted=false;renderVoicePreview();setVoiceStatus('Recording ready. Listen, then save the entry to keep it.')}
  else setVoiceStatus('That recording was too short to keep. Try again.');
  if(recStopResolve){recStopResolve();recStopResolve=null}};
 mediaRecorder.start(1000);
 $('#recStart').classList.add('hidden');$('#recStop').classList.remove('hidden');
 setVoiceStatus('● Recording '+fmtSecs(0)+' - tap Stop when finished (up to 10 minutes).',true);
 recTick=setInterval(()=>{const el=(Date.now()-recStartedAt)/1000;if(el*1000>=MAX_REC_MS){stopRecording();return}setVoiceStatus('● Recording '+fmtSecs(el)+' - tap Stop when finished (up to 10 minutes).',true)},1000);
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}}
function stopRecording(){return new Promise(res=>{if(mediaRecorder&&mediaRecorder.state!=='inactive'){recStopResolve=res;try{mediaRecorder.stop()}catch(e){res()}}else res()})}
function stopRecordingSilently(){if(mediaRecorder&&mediaRecorder.state!=='inactive'){recStopResolve=null;try{mediaRecorder.stop()}catch(e){}}clearInterval(recTick);$('#recStart')&&$('#recStart').classList.remove('hidden');$('#recStop')&&$('#recStop').classList.add('hidden')}

/* ---------- wiring ---------- */
$$('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.view));$$('[data-start]').forEach(b=>b.onclick=()=>start(b.dataset.start,b.dataset.practice||'',b.dataset.period||''));$('#entryForm').onsubmit=saveEntry;$('#clearForm').onclick=resetForm;$('#newEntry').onclick=()=>start();$('#entries').onclick=e=>{if(e.target.dataset.edit)edit(e.target.dataset.edit);if(e.target.dataset.remove)removeOne(e.target.dataset.remove)};
$('#recStart').onclick=startRecording;$('#recStop').onclick=()=>stopRecording();
$('#exportJson').onclick=()=>exportJson();$('#exportText').onclick=exportText;$('#importJson').onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value=''};$('#deleteAll').onclick=()=>{$('#confirm').classList.remove('hidden');$('#confirmText').value='';$('#confirmDelete').disabled=true};$('#cancelDelete').onclick=()=>$('#confirm').classList.add('hidden');$('#confirmText').oninput=e=>$('#confirmDelete').disabled=e.target.value!=='DELETE';$('#confirmDelete').onclick=()=>{state={entries:[]};persist();idbClear().catch(()=>{});$('#confirm').classList.add('hidden');renderEntries();show('review')};
TAGS.forEach(t=>{const el=document.createElement('article');el.className='thread';el.innerHTML=`<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>`;el.onclick=()=>{start();selectedTags.add(t.id);renderTags()};$('#threadList').append(el)});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#install').classList.remove('hidden')});$('#install').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#install').classList.add('hidden')}};
if('serviceWorker'in navigator){const hadController=!!navigator.serviceWorker.controller;window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{reg.update();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update()})}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController)location.reload()})})}
load();renderTags();renderFilters();renderEntries();
