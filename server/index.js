// Local network server for the mobile Remote.
const express=require('express');const cors=require('cors');const http=require('http');const path=require('path');const {WebSocketServer}=require('ws');
function startServer({state,search,port=3939}){
 const app=express();app.disable('x-powered-by');app.use(cors({origin:true}));app.use(express.json({limit:'256kb'}));app.use(express.static(path.join(__dirname,'public'),{etag:false,maxAge:0}));
 app.get('/api/health',(req,res)=>res.json({ok:true,service:'Scripture Remote',output:state.snapshot().output,selectedVersion:state.snapshot().selectedVersion}));
 app.get('/api/state',(req,res)=>res.json(state.snapshot()));
 app.post('/api/version',(req,res)=>{const version=String(req.body?.version||'');if(!version)return res.status(400).json({error:'version is required'});state.setVersion(version,(reference,selected)=>{const ref=search.parseReference(reference);return ref?search.getByReference(ref,selected):[];});return res.json({ok:true,selectedVersion:state.snapshot().selectedVersion});});
 app.get('/api/versions',(req,res)=>res.json(search.listVersions()));
 app.get('/api/search',(req,res)=>{const{q,version}=req.query;if(!q||!version)return res.status(400).json({error:'q and version are required'});try{return res.json(search.search(String(q),String(version)));}catch(e){return res.status(500).json({error:e.message});}});
 app.get('/api/search-all',(req,res)=>{const ref=search.parseReference(String(req.query.q||''));if(!ref)return res.status(400).json({error:'Could not parse a reference from that input.'});return res.json({reference:ref,versions:search.getByReferenceAllVersions(ref)});});
 app.post('/api/schedule',(req,res)=>{const entry=state.addToSchedule(req.body);if(!entry)return res.status(400).json({error:'A schedule item requires reference and text.'});return res.json(entry);});
 app.delete('/api/schedule/:id',(req,res)=>{state.removeFromSchedule(req.params.id);res.json({ok:true});});
 app.post('/api/schedule/:id/move',(req,res)=>{state.moveInSchedule(req.params.id,req.body.direction);res.json({ok:true});});
 app.post('/api/preview',(req,res)=>{state.setPreview(req.body);res.json({ok:true});});app.post('/api/go-live',(req,res)=>{state.goLive(req.body);res.json({ok:true});});
 app.post('/api/black',(req,res)=>{state.blackout();res.json({ok:true,output:'black'});});app.post('/api/restore',(req,res)=>{state.restoreLive();res.json({ok:true,output:state.snapshot().output});});app.post('/api/clear',(req,res)=>{state.clearLive();res.json({ok:true,output:'clear'});});
 const httpServer=http.createServer(app);const wss=new WebSocketServer({server:httpServer,perMessageDeflate:false});
 const broadcastState=()=>{const payload=JSON.stringify({type:'state',data:state.snapshot()});for(const client of wss.clients)if(client.readyState===1)client.send(payload);};state.on('change',broadcastState);
 wss.on('connection',ws=>{ws.send(JSON.stringify({type:'state',data:state.snapshot()}));ws.on('error',()=>{});});
 return new Promise((resolve,reject)=>{httpServer.once('error',reject);httpServer.listen(port,'0.0.0.0',()=>resolve({httpServer,port}));});
}
module.exports={startServer};
