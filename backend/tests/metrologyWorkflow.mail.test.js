import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {sendEmail} from '../libs/mailer.js';
test('request email contains message and PDF attachment using a local SMTP sink only',async()=>{
 const saved=Object.fromEntries(['SMTP_HOST','SMTP_PORT','SMTP_FROM','SMTP_USER','SMTP_PASS','SMTP_SECURE'].map(key=>[key,process.env[key]]));
 let message='';
 const server=net.createServer(socket=>{
  let buffer='';let data=false;
  socket.write('220 localhost QA SMTP\r\n');
  socket.on('data',chunk=>{
   buffer+=chunk.toString();
   while(true){
    if(data){const end=buffer.indexOf('\r\n.\r\n');if(end<0)return;message=buffer.slice(0,end);buffer=buffer.slice(end+5);data=false;socket.write('250 OK queued QA\r\n');continue;}
    const end=buffer.indexOf('\r\n');if(end<0)return;const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
    if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 SIZE 1000000\r\n');
    else if(/^DATA/.test(line)){data=true;socket.write('354 End with dot\r\n');}
    else if(/^QUIT/.test(line)){socket.end('221 Bye\r\n');return;}
    else socket.write('250 OK\r\n');
   }
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:String(server.address().port),SMTP_FROM:'qa@example.test',SMTP_SECURE:'false'});delete process.env.SMTP_USER;delete process.env.SMTP_PASS;
  const info=await sendEmail({recipient_email:'client@example.test',subject:'QA request',text_body:'Please return the signed request.',attachments:[{filename:'request.pdf',content:Buffer.from('%PDF-QA'),contentType:'application/pdf'}]});
  assert.ok(info.messageId);assert.match(message,/application\/pdf/);assert.match(message,/request.pdf/);assert.match(message,/Please return the signed request/);
 }finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;await new Promise(resolve=>server.close(resolve));}
});
