// Shared presentation state for Desktop, Live Display, Stage Display and Remote.
const { EventEmitter } = require('events');
class AppState extends EventEmitter {
  constructor(){super();this.schedule=[];this.preview=null;this.live=null;this.output='live';this.selectedVersion='kjv';this.serviceName='Untitled Service';this.theme={type:'color',background:'#000000'};this.transition='fade';this.stageMode='follow';this._nextId=1;}
  addToSchedule(item){if(!item)return null;const type=item.type||'scripture';if(type==='scripture'&&!item.reference)return null;if(type!=='scripture'&&!item.title&&!item.reference)return null;const entry={id:this._nextId++,...item,type,version:type==='scripture'?this.selectedVersion:(item.version||'')};this.schedule.push(entry);this._emitChange();return entry;}
  removeFromSchedule(id){this.schedule=this.schedule.filter(i=>i.id!==Number(id));this._emitChange();}
  moveInSchedule(id,direction){const i=this.schedule.findIndex(x=>x.id===Number(id));if(i<0)return;const n=i+Number(direction);if(n<0||n>=this.schedule.length)return;[this.schedule[i],this.schedule[n]]=[this.schedule[n],this.schedule[i]];this._emitChange();}
  setPreview(item){this.preview=item?{...item,version:item.type==='scripture'?this.selectedVersion:(item.version||'')}:null;this._emitChange();}
  goLive(item){const next=item||this.preview;if(!next)return;this.live={...next,version:next.type==='scripture'?this.selectedVersion:(next.version||'')};this.preview={...this.live};this.output='live';this._emitChange();this.emit('display',this.snapshot());}
  setVersion(version,resolveReference){if(!version)return;this.selectedVersion=String(version);const resolve=typeof resolveReference==='function'?resolveReference:null;const resolveItem=item=>{if(!item||item.type!=='scripture')return item;if(!resolve)return {...item,version:this.selectedVersion};const rows=resolve(item.reference,this.selectedVersion);return rows&&rows.length?{...item,version:this.selectedVersion,text:rows.map(r=>r.text).join(' ')}:{...item,version:this.selectedVersion};};this.schedule=this.schedule.map(resolveItem);this.preview=resolveItem(this.preview);this.live=resolveItem(this.live);this._emitChange();if(this.live)this.emit('display',this.snapshot());}
  setTheme(theme){this.theme=theme||this.theme;this._emitChange();this.emit('theme',this.theme);}
  setTransition(name){this.transition=String(name||'fade');this._emitChange();}
  setStageMode(mode){this.stageMode=String(mode||'follow');this._emitChange();}
  setServiceName(name){this.serviceName=String(name||'Untitled Service');this._emitChange();}
  replaceSchedule(items){this.schedule=Array.isArray(items)?items.map(i=>({...i,id:i.id||this._nextId++})):[];this._nextId=Math.max(this._nextId,...this.schedule.map(i=>Number(i.id)||0))+1;this._emitChange();}
  blackout(){this.output='black';this._emitChange();this.emit('display',this.snapshot());}
  clearLive(){this.live=null;this.output='clear';this._emitChange();this.emit('display',this.snapshot());}
  restoreLive(){if(!this.live)return;this.output='live';this._emitChange();this.emit('display',this.snapshot());}
  snapshot(){return{schedule:this.schedule,preview:this.preview,live:this.live,output:this.output,selectedVersion:this.selectedVersion,serviceName:this.serviceName,theme:this.theme,transition:this.transition,stageMode:this.stageMode};}
  _emitChange(){this.emit('change',this.snapshot());}
}
module.exports=new AppState();
