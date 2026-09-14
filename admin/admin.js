'use strict';

const OWNER='billcox2020-commits';
const REPO='-vintage-archive';
const BRANCH='main';
const PATHS={personal:'data/personal-posts.json',active:'data/bunjang-active.json',changes:'data/admin-overrides.json'};
const API='https://api.github.com';
const TOKEN_KEY='all-collector-admin-token';
const categoryNames={shoes:'SHOES',outer:'OUTER',top:'TOP',bottom:'BOTTOM',etc:'ETC'};
const statusNames={archive:'ARCHIVE',for_sale:'판매 중',reserved:'예약 중',sold:'SOLD'};

const $=selector=>document.querySelector(selector);
const loginPanel=$('#loginPanel');
const workspace=$('#workspace');
const tokenInput=$('#tokenInput');
const connectButton=$('#connectButton');
const disconnectButton=$('#disconnectButton');
const connectionState=$('#connectionState');
const loginError=$('#loginError');
const recordList=$('#recordList');
const recordCount=$('#recordCount');
const searchInput=$('#searchInput');
const categoryFilter=$('#categoryFilter');
const form=$('#recordForm');
const editorTitle=$('#editorTitle');
const editorMode=$('#editorMode');
const hideButton=$('#hideButton');
const saveButton=$('#saveButton');
const saveMessage=$('#saveMessage');
const photoPreview=$('#photoPreview');
const imageFile=$('#imageFile');
const toast=$('#toast');

let token='';
let username='';
let rawPersonal=[];
let rawActive=[];
let changes={hidden_ids:[],overrides:{}};
let records=[];
let selected=null;
let pendingImage=null;
let busy=false;
let toastTimer=0;

function api(path,options={}){
  return fetch(`${API}${path}`,{
    ...options,
    headers:{
      Accept:'application/vnd.github+json',
      Authorization:`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28',
      ...(options.headers||{})
    }
  }).then(async response=>{
    if(response.ok)return response.status===204?null:response.json();
    let message=`GitHub 요청 실패 (${response.status})`;
    try{const body=await response.json();if(body.message)message=body.message}catch{}
    throw new Error(message);
  });
}

function decodeBase64(value){
  const binary=atob(value.replace(/\n/g,''));
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes){
  let binary='';
  const size=0x8000;
  for(let i=0;i<bytes.length;i+=size)binary+=String.fromCharCode(...bytes.subarray(i,i+size));
  return btoa(binary);
}

async function getJsonFile(path,ref=BRANCH){
  const file=await api(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  return {data:JSON.parse(decodeBase64(file.content)),sha:file.sha};
}

function normalizeChanges(value){
  return {
    hidden_ids:Array.isArray(value?.hidden_ids)?value.hidden_ids:[],
    overrides:value?.overrides&&typeof value.overrides==='object'?value.overrides:{}
  };
}

function rebuildRecords(){
  const hidden=new Set(changes.hidden_ids);
  const active=rawActive.filter(item=>item.status==='for_sale');
  records=[
    ...rawPersonal.map(item=>({...item,_origin:'personal'})),
    ...active.map(item=>({...item,_origin:'active'}))
  ].filter(item=>!hidden.has(item.id)).map(item=>{
    const override=changes.overrides[item.id];
    return override?{...item,...override,id:item.id,source:item.source,_origin:item._origin}:item;
  });
}

function publicImage(value){
  if(!value)return '';
  if(/^https?:\/\//i.test(value))return value;
  return `../${String(value).replace(/^\.\//,'')}`;
}

function clearElement(element){while(element.firstChild)element.firstChild.remove()}

function renderList(){
  const query=searchInput.value.trim().toLowerCase();
  const category=categoryFilter.value;
  const filtered=records.filter(item=>{
    const text=`${item.title||''} ${item.brand||''} ${item.year||''} ${item.size||''}`.toLowerCase();
    return (!query||text.includes(query))&&(category==='all'||item.category===category);
  });
  recordCount.textContent=`${filtered.length} / 전체 ${records.length}개`;
  clearElement(recordList);
  if(!filtered.length){
    const empty=document.createElement('p');empty.className='empty';empty.textContent='조건에 맞는 기록이 없습니다.';recordList.append(empty);return;
  }
  const fragment=document.createDocumentFragment();
  for(const item of filtered){
    const button=document.createElement('button');
    button.type='button';button.className='record';button.dataset.id=item.id;
    button.setAttribute('aria-current',String(selected?.id===item.id));
    const image=publicImage(item.image);
    if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{const no=document.createElement('span');no.className='no-photo';no.textContent='NO PHOTO';img.replaceWith(no)},{once:true});button.append(img)}
    else{const no=document.createElement('span');no.className='no-photo';no.textContent='NO PHOTO';button.append(no)}
    const copy=document.createElement('span');
    const meta=document.createElement('small');meta.textContent=`${categoryNames[item.category]||'ETC'} · ${item._origin==='personal'?'개인 소장':'번개장터'}`;
    const title=document.createElement('strong');title.textContent=item.title||'제목 없음';
    const detail=document.createElement('small');detail.textContent=[item.brand,item.year,item.size].filter(Boolean).join(' · ')||statusNames[item.status]||'';
    copy.append(meta,title,detail);button.append(copy);
    button.addEventListener('click',()=>openEditor(item));fragment.append(button);
  }
  recordList.append(fragment);
}

function setPreview(src){
  clearElement(photoPreview);
  if(!src){const span=document.createElement('span');span.textContent='사진 미리보기';photoPreview.append(span);return}
  const img=document.createElement('img');img.src=src;img.alt='선택한 기록 사진';img.addEventListener('error',()=>setPreview(''),{once:true});photoPreview.append(img);
}

function setValue(selector,value){$(selector).value=value??''}

function openEditor(item=null){
  if(busy)return;
  selected=item?{...item}:null;
  pendingImage=null;imageFile.value='';
  editorMode.textContent=item?(item._origin==='personal'?'PERSONAL RECORD':'MARKET RECORD'):'NEW RECORD';
  editorTitle.textContent=item?'기록 수정':'새 기록';
  hideButton.hidden=!item;
  setValue('#titleInput',item?.title);setValue('#brandInput',item?.brand);setValue('#categoryInput',item?.category||'shoes');
  setValue('#yearInput',item?.year);setValue('#sizeInput',item?.size);setValue('#statusInput',item?.status||'archive');
  setValue('#statusTextInput',item?.status_text);setValue('#priceInput',Number.isFinite(item?.price_krw)?item.price_krw:'');
  setValue('#publishedInput',item?.published_at);setValue('#sourceUrlInput',item?.source_url);setValue('#imageUrlInput',item?.image);
  setValue('#descriptionInput',item?.description);$('#showPriceInput').checked=Boolean(item?.show_price);
  setPreview(publicImage(item?.image));saveMessage.textContent='';workspace.classList.add('editing');
  renderList();
  if(matchMedia('(max-width:860px)').matches)scrollTo({top:0,behavior:'smooth'});
}

function closeEditor(){if(busy)return;workspace.classList.remove('editing');selected=null;renderList()}

function formRecord(){
  const year=$('#yearInput').value.trim();
  const price=$('#priceInput').value.replace(/[^0-9]/g,'');
  const title=$('#titleInput').value.trim();
  if(!title)throw new Error('제목을 입력해 주세요.');
  return {
    id:selected?.id||`ARCHIVE-${Date.now().toString(36).toUpperCase()}`,
    category:$('#categoryInput').value,
    category_locked:true,
    brand:$('#brandInput').value.trim(),
    source:selected?.source||'personal',
    title,
    year:year?Number(year):null,
    size:$('#sizeInput').value.trim(),
    image:$('#imageUrlInput').value.trim(),
    gallery:Array.isArray(selected?.gallery)?selected.gallery:[],
    price_krw:price?Number(price):null,
    show_price:$('#showPriceInput').checked,
    status:$('#statusInput').value,
    status_text:$('#statusTextInput').value.trim(),
    description:$('#descriptionInput').value.trim(),
    published_at:$('#publishedInput').value||null,
    source_url:$('#sourceUrlInput').value.trim()
  };
}

function cleanRecord(record){
  const clean={};
  for(const [key,value] of Object.entries(record)){
    if(key.startsWith('_'))continue;
    if(value===''||value===undefined)continue;
    clean[key]=value;
  }
  return clean;
}

async function imageToJpeg(file){
  if(file.size>35*1024*1024)throw new Error('사진이 너무 큽니다. 35MB 이하 사진을 선택해 주세요.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    image.decoding='async';
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('이 사진 형식을 읽을 수 없습니다.'));image.src=url});
    const max=2400;const scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
    if(!blob)throw new Error('사진 변환에 실패했습니다.');
    return new Uint8Array(await blob.arrayBuffer());
  }finally{URL.revokeObjectURL(url)}
}

async function createBlob(content,encoding='utf-8'){
  const result=await api(`/repos/${OWNER}/${REPO}/git/blobs`,{method:'POST',body:JSON.stringify({content,encoding})});
  return result.sha;
}

async function commitFiles(entries,message,headSha){
  const commit=await api(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const treeEntries=[];
  for(const entry of entries){
    const sha=await createBlob(entry.content,entry.encoding||'utf-8');
    treeEntries.push({path:entry.path,mode:'100644',type:'blob',sha});
  }
  const tree=await api(`/repos/${OWNER}/${REPO}/git/trees`,{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:treeEntries})});
  const next=await api(`/repos/${OWNER}/${REPO}/git/commits`,{method:'POST',body:JSON.stringify({message,tree:tree.sha,parents:[headSha]})});
  await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,{method:'PATCH',body:JSON.stringify({sha:next.sha,force:false})});
  return next.sha;
}

async function latestData(ref){
  const [personalFile,activeFile,changesFile]=await Promise.all([getJsonFile(PATHS.personal,ref),getJsonFile(PATHS.active,ref),getJsonFile(PATHS.changes,ref)]);
  return {personal:Array.isArray(personalFile.data.items)?personalFile.data.items:[],active:Array.isArray(activeFile.data.items)?activeFile.data.items:[],changes:normalizeChanges(changesFile.data)};
}

function jsonEntry(path,value){return {path,content:`${JSON.stringify(value,null,2)}\n`,encoding:'utf-8'}}

async function saveRecord(event){
  event.preventDefault();if(busy)return;
  let next;
  try{next=formRecord()}catch(error){saveMessage.textContent=error.message;return}
  setBusy(true,'저장 중…');
  try{
    const ref=await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const latest=await latestData(ref.object.sha);
    const entries=[];
    let imagePath=next.image;
    if(pendingImage){
      const bytes=await imageToJpeg(pendingImage);
      imagePath=`assets/uploads/${new Date().toISOString().slice(0,10).replaceAll('-','')}-${next.id.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(-36)||Date.now()}.jpg`;
      entries.push({path:imagePath,content:bytesToBase64(bytes),encoding:'base64'});
    }
    next.image=imagePath;
    if(selected?._origin==='active'){
      const original=latest.active.find(item=>item.id===selected.id);
      if(!original)throw new Error('원본 매물을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      const override={...next};
      delete override.id;delete override.source;
      latest.changes.overrides[selected.id]=override;
      latest.changes.hidden_ids=latest.changes.hidden_ids.filter(id=>id!==selected.id);
      entries.push(jsonEntry(PATHS.changes,latest.changes));
    }else{
      const record=cleanRecord({...selected,...next});
      const index=selected?latest.personal.findIndex(item=>item.id===selected.id):-1;
      if(selected&&index<0)throw new Error('원본 기록을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      if(index>=0)latest.personal[index]=record;else latest.personal.unshift(record);
      latest.changes.hidden_ids=latest.changes.hidden_ids.filter(id=>id!==record.id);
      entries.push(jsonEntry(PATHS.personal,{items:latest.personal}));
      if(latest.changes.hidden_ids.length!==changes.hidden_ids.length)entries.push(jsonEntry(PATHS.changes,latest.changes));
    }
    await commitFiles(entries,selected?`Update archive record: ${next.title}`:`Add archive record: ${next.title}`,ref.object.sha);
    showToast('저장 완료. 공개 사이트는 잠시 후 갱신됩니다.');
    await loadRecords();
    const saved=records.find(item=>item.id===next.id);setBusy(false);openEditor(saved||null);
  }catch(error){saveMessage.textContent=humanError(error)}finally{setBusy(false)}
}

async function hideRecord(){
  if(!selected||busy)return;
  if(!confirm(`“${selected.title}” 기록을 사이트에서 삭제할까요?\n나중에 저장소에서 복구할 수 있도록 원본은 보존됩니다.`))return;
  setBusy(true,'삭제 중…');
  try{
    const ref=await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const latest=await latestData(ref.object.sha);
    if(!latest.changes.hidden_ids.includes(selected.id))latest.changes.hidden_ids.push(selected.id);
    delete latest.changes.overrides[selected.id];
    await commitFiles([jsonEntry(PATHS.changes,latest.changes)],`Hide archive record: ${selected.title}`,ref.object.sha);
    showToast('사이트에서 삭제했습니다.');await loadRecords();setBusy(false);closeEditor();
  }catch(error){saveMessage.textContent=humanError(error)}finally{setBusy(false)}
}

function humanError(error){
  const message=String(error?.message||error);
  if(/Bad credentials/i.test(message))return '연결 정보가 만료됐습니다. 다시 연결해 주세요.';
  if(/Resource not accessible|permission/i.test(message))return '이 토큰에 저장소 Contents 쓰기 권한이 없습니다.';
  if(/Update is not a fast forward|Reference update failed|422/.test(message))return '동시에 다른 변경이 있었습니다. 목록을 다시 불러온 뒤 저장해 주세요.';
  return message;
}

function setBusy(value,message=''){
  busy=value;saveButton.disabled=value;hideButton.disabled=value;connectButton.disabled=value;
  if(message)saveMessage.textContent=message;
}

function showToast(message){
  clearTimeout(toastTimer);toast.textContent=message;toast.hidden=false;
  toastTimer=setTimeout(()=>{toast.hidden=true},3600);
}

async function loadRecords(){
  const [personalFile,activeFile,changesFile]=await Promise.all([getJsonFile(PATHS.personal),getJsonFile(PATHS.active),getJsonFile(PATHS.changes)]);
  rawPersonal=Array.isArray(personalFile.data.items)?personalFile.data.items:[];
  rawActive=Array.isArray(activeFile.data.items)?activeFile.data.items:[];
  changes=normalizeChanges(changesFile.data);rebuildRecords();renderList();
}

async function connect(){
  const candidate=tokenInput.value.trim()||sessionStorage.getItem(TOKEN_KEY)||'';
  if(!candidate){loginError.textContent='토큰을 붙여 넣어 주세요.';return}
  token=candidate;connectButton.disabled=true;connectButton.textContent='확인 중…';loginError.textContent='';
  try{
    const [user,repo]=await Promise.all([api('/user'),api(`/repos/${OWNER}/${REPO}`)]);
    if(repo.permissions&&!repo.permissions.push)throw new Error('이 저장소에 쓰기 권한이 없습니다.');
    username=user.login;sessionStorage.setItem(TOKEN_KEY,token);await loadRecords();
    loginPanel.hidden=true;workspace.hidden=false;disconnectButton.hidden=false;
    connectionState.textContent=`${username} 연결됨`;connectionState.classList.add('on');
    if(matchMedia('(max-width:860px)').matches)closeEditor();else openEditor(null);
  }catch(error){token='';sessionStorage.removeItem(TOKEN_KEY);loginError.textContent=humanError(error)}finally{connectButton.disabled=false;connectButton.textContent='관리 화면 연결'}
}

function disconnect(){
  token='';username='';sessionStorage.removeItem(TOKEN_KEY);workspace.hidden=true;loginPanel.hidden=false;disconnectButton.hidden=true;
  connectionState.textContent='연결 안 됨';connectionState.classList.remove('on');tokenInput.value='';loginError.textContent='';
}

connectButton.addEventListener('click',connect);
tokenInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();connect()}});
disconnectButton.addEventListener('click',disconnect);
$('#newButton').addEventListener('click',()=>openEditor(null));
$('#backButton').addEventListener('click',closeEditor);
searchInput.addEventListener('input',renderList);categoryFilter.addEventListener('change',renderList);
form.addEventListener('submit',saveRecord);hideButton.addEventListener('click',hideRecord);
imageFile.addEventListener('change',()=>{
  const [file]=imageFile.files;pendingImage=file||null;
  if(!file){setPreview(publicImage(selected?.image));return}
  const url=URL.createObjectURL(file);setPreview(url);setTimeout(()=>URL.revokeObjectURL(url),30000);
});
$('#imageUrlInput').addEventListener('change',event=>{if(!pendingImage)setPreview(publicImage(event.target.value.trim()))});

if(sessionStorage.getItem(TOKEN_KEY))connect();
