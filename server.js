const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const PORT = process.env.PORT || 4173;
const root = __dirname;
const json = (res, code, data) => { res.writeHead(code, {'content-type':'application/json','access-control-allow-origin':'*'}); res.end(JSON.stringify(data)); };
const body = req => new Promise((resolve,reject)=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{resolve(JSON.parse(d||'{}'))}catch(e){reject(e)}})});
async function providerTest(input){
  const {provider, apiKey, baseUrl, model} = input;
  if(!apiKey) return {ok:false,error:'Enter an API key first.'};
  if(provider==='deepgram'){
    const r=await fetch('https://api.deepgram.com/v1/speak?model='+encodeURIComponent(input.voiceModel||'aura-asteria-en'),{method:'POST',headers:{Authorization:'Token '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({text:'ZoomCue connection test. Your voice is ready to narrate a walkthrough.'})});
    return r.ok?{ok:true,message:'Deepgram Aura responded successfully.'}:{ok:false,error:'Deepgram rejected the key ('+r.status+').'};
  }
  if(provider==='elevenlabs'){
    const r=await fetch('https://api.elevenlabs.io/v1/user',{headers:{'xi-api-key':apiKey}}); return r.ok?{ok:true,message:'ElevenLabs key verified.'}:{ok:false,error:'ElevenLabs rejected the key ('+r.status+').'};
  }
  if(provider==='openai' || provider==='custom'){
    const url=(baseUrl||'https://api.openai.com/v1').replace(/\/$/,'')+'/models'; const r=await fetch(url,{headers:{Authorization:'Bearer '+apiKey}}); return r.ok?{ok:true,message:'OpenAI-compatible endpoint responded.'}:{ok:false,error:'Endpoint rejected the key ('+r.status+').'};
  }
  if(provider==='google'){
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?key='+encodeURIComponent(apiKey)); return r.ok?{ok:true,message:'Google AI Studio key verified.'}:{ok:false,error:'Google rejected the key ('+r.status+').'};
  }
  return {ok:true,message:'Provider settings saved. A live request will verify them when you generate.'};
}
async function tts(input){
  const text=input.text||'This is a ZoomCue voice preview.';
  if(!input.apiKey) return {ok:false,error:'No key supplied. Add a provider key in API keys.'};
  if(input.provider==='deepgram'){
    const r=await fetch('https://api.deepgram.com/v1/speak?model='+encodeURIComponent(input.voiceModel||'aura-asteria-en')+'&encoding=mp3',{method:'POST',headers:{Authorization:'Token '+input.apiKey,'Content-Type':'application/json'},body:JSON.stringify({text})});
    if(!r.ok)return {ok:false,error:'Deepgram TTS failed ('+r.status+').'}; const b=Buffer.from(await r.arrayBuffer()); return {ok:true,audioBase64:b.toString('base64'),mime:'audio/mpeg',words:[]};
  }
  if(input.provider==='elevenlabs'){
    const voice=input.voiceId||'21m00Tcm4TlvDq8ikWAM'; const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+voice,{method:'POST',headers:{'xi-api-key':input.apiKey,'Content-Type':'application/json','accept':'audio/mpeg'},body:JSON.stringify({text,model_id:input.model||'eleven_multilingual_v2',output_format:'mp3_44100_128'})});
    if(!r.ok)return {ok:false,error:'ElevenLabs TTS failed ('+r.status+').'}; const b=Buffer.from(await r.arrayBuffer()); return {ok:true,audioBase64:b.toString('base64'),mime:'audio/mpeg',words:[],note:'Use ElevenLabs alignment endpoint or WhisperX worker for word timings.'};
  }
  return {ok:false,error:'This provider is configured for script generation, not audio. Choose Deepgram Aura or ElevenLabs for Voice.'};
}
const server=http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'content-type'});return res.end()}
  try{if(u.pathname==='/api/providers/test'&&req.method==='POST')return json(res,200,await providerTest(await body(req)));if(u.pathname==='/api/tts/preview'&&req.method==='POST')return json(res,200,await tts(await body(req)));}catch(e){return json(res,500,{ok:false,error:e.message})}
  let file=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,''); let p=path.join(root,file); if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory())return json(res,404,{error:'Not found'}); let ext=path.extname(p); let types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};res.writeHead(200,{'content-type':types[ext]||'application/octet-stream'});fs.createReadStream(p).pipe(res);
});server.listen(PORT,'0.0.0.0',()=>console.log('ZoomCue API + preview listening on '+PORT));
