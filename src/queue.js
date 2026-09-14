import {Queue,QueueEvents} from 'bullmq'; import IORedis from 'ioredis'; import {config} from './config.js';
export const connection=new IORedis(config.REDIS_URL,{maxRetriesPerRequest:null,tls:config.REDIS_URL.startsWith('rediss://')?{}:undefined});
export const videoQueue=new Queue('video-pipeline',{connection,defaultJobOptions:{attempts:4,backoff:{type:'exponential',delay:1000},removeOnComplete:1000,removeOnFail:5000}});
export const videoEvents=new QueueEvents('video-pipeline',{connection});
export const enqueueVideo=(videoId)=>videoQueue.add('pipeline',{videoId},{jobId:`video:${videoId}`});
