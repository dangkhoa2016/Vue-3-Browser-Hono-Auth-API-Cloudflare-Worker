// The expiry marker distinguishes the supervisor deadline from a producer's own exit 124.
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const [seconds,marker,command,...args]=process.argv.slice(2);
const milliseconds=Number(seconds)*1000;
if(!/^\d+$/.test(seconds)||!Number.isSafeInteger(milliseconds)||milliseconds<=0||milliseconds>2147483647||!marker||!command) process.exit(2);
let expired=false, cancelled=null, killer;
const child=spawn(command,args,{stdio:'inherit',detached:true});
const signalGroup=signal=>{try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
const terminate=signal=>{
  signalGroup(signal);
  if(!killer) killer=setTimeout(()=>signalGroup('SIGKILL'),1000);
};
const timer=setTimeout(()=>{
  expired=true;writeFileSync(marker,'deadline expired\n',{flag:'wx'});
  terminate('SIGTERM');
},milliseconds);
for(const signal of ['SIGTERM','SIGINT','SIGHUP']) process.on(signal,()=>{
  cancelled ??= signal;
  clearTimeout(timer);terminate(signal);
});
child.on('error',error=>{clearTimeout(timer);clearTimeout(killer);console.error(error.message);process.exitCode=127;});
child.on('close',(code,signal)=>{
  clearTimeout(timer);clearTimeout(killer);
  if(expired||cancelled) signalGroup('SIGKILL');
  const codes={SIGTERM:143,SIGINT:130,SIGHUP:129,SIGKILL:137};
  process.exitCode=expired?124:cancelled?codes[cancelled]:(code??codes[signal]??1);
});
