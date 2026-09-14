import {randomUUID} from 'crypto'; import {logger} from './logger.js';
export const requestContext=(req,res,next)=>{req.id=req.headers['x-request-id']||randomUUID();res.setHeader('x-request-id',req.id);const started=Date.now();res.on('finish',()=>logger.info({request_id:req.id,method:req.method,path:req.path,status:res.statusCode,duration_ms:Date.now()-started},'request'));next()};
export const withTimeout=(ms,fn)=>{const c=new AbortController();const timer=setTimeout(()=>c.abort(),ms);return Promise.resolve().then(()=>fn(c.zoomcue)).finally(()=>clearTimeout(timer))};
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function retry(fn,{attempts=3,baseMs=250,shouldRetry=()=>true}={}){let last;for(let i=0;i<attempts;i++){try{return await fn()}catch(e){last=e;if(i===attempts-1||!shouldRetry(e))throw e;await sleep(baseMs*2**i+Math.random()*100)}}throw last}
