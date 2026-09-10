const $=id=>document.getElementById(id);const api=window.scriptureAPI;let S=null,versions=[],books=[];
const clean=s=>String(s||'').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim();
const server=async(path,opt={})=>{for(let i=0;i<5;i++){try{const r=await fetch(`http://127.0.0.1:3939${path}`,{cache:'no-store',...opt});const d=await r.json();if(!r.ok)throw Error(d.error||r.status);return d;}catch(e){if(i===4)throw e;await new Promise(r=>setTimeout(r,250));}}};
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

// ---- Tabs (Bible / Songs / Media / Presentations / Themes / Settings) ----
document.querySelectorAll('.tab').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tabbody').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  };
});

// ---- Init ----
async function init(){
  versions=await api.listVersions();
  const v=$('versionSelect');
  v.innerHTML=versions.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('');
  S=await api.getState();
  v.value=S.selectedVersion||versions[0]?.code||'kjv';
  render(S);
  ndiStatus();
  await loadBookList();
  await loadChapter(browse.bookId,browse.chapter);
}

function render(s){
  S=s||S;if(!S)return;
  $('serviceName').value=S.serviceName||'Untitled Service';
  $('statusVersion').textContent=(S.selectedVersion||'').toUpperCase();
  $('transition').value=S.transition||'fade';
  $('stageMode').value=S.stageMode||'follow';
  renderPane('preview',S.preview);
  renderPane('live',S.live,S.output);
  renderSchedule();
  markLiveVerseRows();
}
function renderPane(which,item,output){
  const text=$(which+'Text'),ref=$(which+'Ref'),tag=which==='live'?$('liveTag'):null;
  if(output==='black'){text.textContent='BLACK';ref.textContent='';if(tag)tag.textContent='BLACK';return;}
  if(!item){text.textContent=which==='preview'?'Nothing selected':'';ref.textContent='';if(tag)tag.textContent='LIVE';return;}
  if(tag)tag.textContent=(output||'LIVE').toUpperCase();
  text.textContent=item.text||item.body||item.title||'';
  ref.textContent=`${item.reference||item.title||''}${item.version?' · '+item.version.toUpperCase():''}`;
}

// ---- Service Order (EasyWorship-style schedule list) ----
const TYPE_ICON={scripture:'&#128214;',song:'&#127925;',media:'&#127916;',presentation:'&#128196;'};
function renderSchedule(){
  const el=$('scheduleList');el.innerHTML='';
  if(!S?.schedule?.length){el.innerHTML='<div class="empty">Service order is empty. Add Scriptures, Songs, Media or Slides.</div>';return;}
  S.schedule.forEach((x,i)=>{
    const r=document.createElement('div');
    r.className='schedule-item'+(S.live?.id===x.id?' live':'');
    r.innerHTML=`<span class="num">${i+1}</span><span class="type-icon">${TYPE_ICON[x.type]||'&#128214;'}</span><div class="item-main"><b>${esc(x.title||x.reference||x.type)}</b><small>${esc((x.type||'scripture').toUpperCase())}${x.version?' · '+esc(x.version.toUpperCase()):''}</small></div><div class="item-actions"><button data-a="up" title="Move up">&uarr;</button><button data-a="down" title="Move down">&darr;</button><button data-a="live" title="Go live">&#9654;</button><button data-a="del" title="Remove">&times;</button></div>`;
    r.onclick=e=>{if(e.target.tagName==='BUTTON')return;api.setPreview(x);};
    r.querySelector('[data-a=up]').onclick=()=>api.moveSchedule(x.id,-1);
    r.querySelector('[data-a=down]').onclick=()=>api.moveSchedule(x.id,1);
    r.querySelector('[data-a=del]').onclick=()=>api.removeFromSchedule(x.id);
    r.querySelector('[data-a=live]').onclick=()=>api.goLive(x);
    el.appendChild(r);
  });
}

// ---- Bible browser: persistent Book + Chapter view, Genesis 1 through
// Revelation's last chapter, scrollable -- like EasyWorship's Scripture
// library, rather than only ever showing isolated search hits. ----
const browse={bookId:1,chapter:1,maxChapter:50,highlightStart:null,highlightEnd:null};

async function loadBookList(){
  books=await api.listBookMeta();
  const sel=$('bookSelect');
  sel.innerHTML=books.map(b=>`<option value="${b.bookId}">${esc(b.name)}</option>`).join('');
  sel.value=browse.bookId;
}

function fillChapterSelect(maxChapter,current){
  const sel=$('chapterSelect');
  let html='';
  for(let c=1;c<=maxChapter;c++)html+=`<option value="${c}">${c}</option>`;
  sel.innerHTML=html;
  sel.value=current;
}

// chapter may be a positive chapter number, or 0/'last' to mean "this
// book's final chapter" (resolved by the DB layer, since the caller
// stepping backward into a new book doesn't know its chapter count yet).
async function loadChapter(bookId,chapter,highlight){
  const version=$('versionSelect').value||S?.selectedVersion;
  const data=await api.getChapter(bookId,chapter,version);
  if(data.error){$('results').innerHTML=`<div class="empty">${esc(data.error)}</div>`;return;}
  browse.bookId=bookId;browse.chapter=data.chapter;browse.maxChapter=data.maxChapter;
  browse.highlightStart=highlight?.start??null;browse.highlightEnd=highlight?.end??null;
  $('bookSelect').value=bookId;
  fillChapterSelect(data.maxChapter,data.chapter);
  $('chapterHint').textContent=`${data.bookName} ${data.chapter} of ${data.maxChapter} · ${data.verses.length} verses`;
  $('prevChapter').disabled=(bookId===1&&data.chapter===1);
  $('nextChapter').disabled=(bookId===books.length&&data.chapter===data.maxChapter);
  renderVerseList(data.bookName,data.verses,version);
}

function renderVerseList(bookName,verses,version){
  const el=$('results');
  el.className='results verse-list';
  el.innerHTML='';
  if(!verses.length){el.innerHTML='<div class="empty">No verses found for this chapter.</div>';return;}
  verses.forEach(v=>{
    const inRange=browse.highlightStart!=null&&v.verse>=browse.highlightStart&&v.verse<=(browse.highlightEnd??browse.highlightStart);
    const item={type:'scripture',reference:`${bookName} ${v.chapter}:${v.verse}`,text:clean(v.text),version};
    const row=document.createElement('div');
    row.className='verse-row'+(inRange?' hit':'');
    row.dataset.ref=item.reference;
    row.innerHTML=`<span class="vnum">${v.verse}</span><span class="vtext"></span><div class="vactions"><button data-a="prev">Preview</button><button data-a="add">+ Service</button><button data-a="go" class="go">Go Live</button></div>`;
    row.querySelector('.vtext').textContent=item.text;
    row.querySelector('[data-a=prev]').onclick=()=>api.setPreview(item);
    row.querySelector('[data-a=add]').onclick=()=>api.addToSchedule(item);
    row.querySelector('[data-a=go]').onclick=()=>api.goLive(item);
    el.appendChild(row);
  });
  markLiveVerseRows();
  const firstHit=el.querySelector('.verse-row.hit');
  if(firstHit)firstHit.scrollIntoView({block:'center'});
}

function markLiveVerseRows(){
  document.querySelectorAll('.verse-row.live-verse').forEach(r=>r.classList.remove('live-verse'));
  if(S?.live?.type==='scripture'&&S.live.reference){
    document.querySelectorAll('.verse-row').forEach(r=>{if(r.dataset.ref===S.live.reference)r.classList.add('live-verse');});
  }
}

$('bookSelect').onchange=()=>loadChapter(Number($('bookSelect').value),1);
$('chapterSelect').onchange=()=>loadChapter(browse.bookId,Number($('chapterSelect').value));
$('prevChapter').onclick=()=>{
  if(browse.chapter>1)return loadChapter(browse.bookId,browse.chapter-1);
  if(browse.bookId>1)return loadChapter(browse.bookId-1,0); // 0 = that book's last chapter, resolved server-side
};
$('nextChapter').onclick=()=>{
  if(browse.chapter<browse.maxChapter)return loadChapter(browse.bookId,browse.chapter+1);
  if(browse.bookId<books.length)return loadChapter(browse.bookId+1,1);
};

// ---- Search: a direct reference (e.g. "John 3:16") jumps the persistent
// browser to that whole chapter with the verse highlighted, matching
// EasyWorship -- it does not just show the one isolated verse. A phrase
// search shows scattered hits as cards instead, since those come from
// many different chapters and a single-chapter view wouldn't fit them. ----
async function search(){
  const q=$('searchInput').value.trim();if(!q)return;
  if($('allVersions').checked){
    const p=await api.searchAllVersions(q);
    renderPhraseResults(p,true);
    return;
  }
  const p=await api.search(q,$('versionSelect').value);
  if(p.error){renderPhraseResults(p,false);return;}
  if(p.type==='reference'){
    await loadChapter(p.reference.bookId,p.reference.chapter,{start:p.reference.verseStart,end:p.reference.verseEnd});
    return;
  }
  renderPhraseResults(p,false);
}

function renderPhraseResults(p,allVersions){
  const el=$('results');
  el.className='results';
  el.innerHTML='';
  if(p.error){el.innerHTML=`<div class="empty">${esc(p.error)}</div>`;return;}
  const groups=allVersions?(p.versions||[]).flatMap(g=>g.verses.map(r=>({...r,_v:g.version}))):(p.results||[]).map(r=>({...r,_v:r.version||$('versionSelect').value}));
  if(!groups.length){el.innerHTML='<div class="empty">No results.</div>';return;}
  groups.slice(0,80).forEach(r=>{
    const item={type:'scripture',reference:`${r.book_name} ${r.chapter}:${r.verse}`,text:clean(r.text),version:$('versionSelect').value};
    const d=document.createElement('div');
    d.className='result';
    d.innerHTML=`<b>${esc(item.reference)} <small>${esc(String(r._v||item.version).toUpperCase())}</small></b><p></p><div><button>Preview</button><button>+ Service</button><button class="go">Go Live</button></div>`;
    d.querySelector('p').textContent=item.text;
    d.querySelectorAll('button')[0].onclick=()=>api.setPreview(item);
    d.querySelectorAll('button')[1].onclick=()=>api.addToSchedule(item);
    d.querySelector('.go').onclick=()=>api.goLive(item);
    el.appendChild(d);
  });
}

// ---- Top bar / global controls ----
$('versionSelect').onchange=()=>{api.setVersion($('versionSelect').value);loadChapter(browse.bookId,browse.chapter,{start:browse.highlightStart,end:browse.highlightEnd});};
$('searchInput').onkeydown=e=>{if(e.key==='Enter')search();};
$('searchBtn').onclick=search;
$('allVersions').onchange=search;
$('goLive').onclick=()=>api.goLive();
$('black').onclick=()=>api.blackLive();
$('restore').onclick=()=>api.restoreLive();
$('clear').onclick=()=>api.clearLiveState();
$('openLive').onclick=()=>api.openLiveWindow();
$('stageOpen').onclick=()=>api.openStageWindow();
$('remote').onclick=async()=>{
  $('remotePanel').classList.toggle('open');
  if(!$('remotePanel').classList.contains('open'))return;
  $('remoteInfo').textContent='Checking…';
  const x=await api.getRemoteInfo();
  $('remoteInfo').textContent=x?.url||x?.error||'Remote unavailable — make sure this device is on the same Wi-Fi/LAN.';
  const qr=$('remoteQr');
  if(x?.qrDataUrl){qr.src=x.qrDataUrl;qr.classList.add('show');$('remoteQrHint').classList.remove('hidden');}
  else{qr.classList.remove('show');$('remoteQrHint').classList.add('hidden');}
};
$('serviceName').onchange=()=>api.setServiceName($('serviceName').value);
$('transition').onchange=()=>api.setTransition($('transition').value);
$('stageMode').onchange=()=>api.setStageMode($('stageMode').value);
$('saveService').onclick=async()=>{
  try{await server('/api/services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('serviceName').value})});toast('Service saved');}
  catch(e){toast('Save failed: '+e.message);}
};
$('loadService').onclick=async()=>{
  try{
    const names=await server('/api/services');
    if(!names.length)return toast('No saved services');
    const name=prompt('Service to load:\n'+names.join('\n'),names[0]);
    if(name)render(await server(`/api/services/${encodeURIComponent(name)}/load`,{method:'POST'}));
  }catch(e){toast('Load failed: '+e.message);}
};
$('songAdd').onclick=()=>{const title=prompt('Song title');if(!title)return;const lyrics=prompt('Lyrics / slide text');if(lyrics)api.addToSchedule({type:'song',title,text:lyrics});};
$('slideAdd').onclick=()=>{const title=prompt('Presentation title');if(!title)return;const body=prompt('Slide text');if(body)api.addToSchedule({type:'presentation',title,text:body});};
$('mediaAdd').onclick=async()=>{const m=await api.selectMedia();if(m)api.addToSchedule({type:'media',title:m.title,url:m.url,path:m.path,text:m.title});};
$('themeBlack').onclick=()=>api.setTheme({type:'color',background:'#000000'});
$('themeBlue').onclick=()=>api.setTheme({type:'color',background:'#071326'});
$('themeWarm').onclick=()=>api.setTheme({type:'color',background:'#21170b'});
$('themeImage').onclick=async()=>{const x=await api.selectBackgroundImage();if(x)api.setTheme({type:'image',url:x.url,path:x.path});};
$('ndi').onclick=async()=>{const st=await api.ndiStatus();if(st.running)api.ndiStop();else api.ndiStart();setTimeout(ndiStatus,300);};
async function ndiStatus(){const s=await api.ndiStatus();$('ndi').textContent=s.running?'NDI: ON':'NDI: OFF';$('ndiDot').classList.toggle('on',!!s.running);if(s.error)toast(s.error);}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200);}

api.onStateUpdate(render);
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='F5')api.goLive();
  if(e.key==='F6')api.blackLive();
  if(e.key==='F7')api.clearLiveState();
  if(e.key==='Escape')api.restoreLive();
  if(e.key==='ArrowDown'&&S?.schedule?.length){const i=S.schedule.findIndex(x=>x.id===S.live?.id);const n=S.schedule[Math.min(i+1,S.schedule.length-1)];if(n)api.goLive(n);}
  if(e.key==='ArrowUp'&&S?.schedule?.length){const i=S.schedule.findIndex(x=>x.id===S.live?.id);const n=S.schedule[Math.max(i-1,0)];if(n)api.goLive(n);}
});
init().catch(e=>toast(e.message));
