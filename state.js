// Shared presentation state used by the desktop controller and mobile Remote.
const { EventEmitter } = require('events');
class AppState extends EventEmitter {
  constructor(){super();this.schedule=[];this.preview=null;this.live=null;this.output='live';this.selectedVersion='kjv';this._nextId=1;}
  addToSchedule(item){if(!item||!item.reference||!item.text)return null;const entry={id:this._nextId++,...item,version:this.selectedVersion};this.schedule.push(entry);this._emitChange();return entry;}
  removeFromSchedule(id){this.schedule=this.schedule.filter(i=>i.id!==Number(id));this._emitChange();}
  moveInSchedule(id,direction){const i=this.schedule.findIndex(x=>x.id===Number(id));if(i<0)return;const n=i+Number(direction);if(n<0||n>=this.schedule.length)return;[this.schedule[i],this.schedule[n]]=[this.schedule[n],this.schedule[i]];this._emitChange();}
  setPreview(item){this.preview=item?{...item,version:this.selectedVersion}:null;this._emitChange();}
  goLive(item){const next=item||this.preview;if(!next)return;this.live={...next,version:this.selectedVersion};this.preview={...this.live};this.output='live';this._emitChange();this.emit('display',this.snapshot());}
  setVersion(version,resolveReference){if(!version)return;this.selectedVersion=String(version);const resolve=typeof resolveReference==='function'?resolveReference:null;const resolveItem=item=>{if(!item)return item;if(!resolve)return {...item,version:this.selectedVersion};const rows=resolve(item.reference,this.selectedVersion);if(!rows||!rows.length)return {...item,version:this.selectedVersion};return {...item,version:this.selectedVersion,text:rows.map(r=>r.text).join(' ')};};this.schedule=this.schedule.map(resolveItem);this.preview=resolveItem(this.preview);this.live=resolveItem(this.live);this._emitChange();if(this.live)this.emit('display',this.snapshot());}
  blackout(){this.output='black';this._emitChange();this.emit('display',this.snapshot());}
  clearLive(){this.live=null;this.output='clear';this._emitChange();this.emit('display',this.snapshot());}
  restoreLive(){if(!this.live)return;this.output='live';this._emitChange();this.emit('display',this.snapshot());}
  snapshot(){return{schedule:this.schedule,preview:this.preview,live:this.live,output:this.output,selectedVersion:this.selectedVersion};}
  _emitChange(){this.emit('change',this.snapshot());}
}
module.exports=new AppState();
