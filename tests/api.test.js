const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/send');
const originalFetch = global.fetch;
const originalToken = process.env.BOT_TOKEN, originalChat = process.env.CHAT_ID;
after(() => { global.fetch = originalFetch; if (originalToken === undefined) delete process.env.BOT_TOKEN; else process.env.BOT_TOKEN = originalToken; if (originalChat === undefined) delete process.env.CHAT_ID; else process.env.CHAT_ID = originalChat; });
let address = 0, calls = 0;
const valid = () => ({name:'Анна',phone:'+7 (999) 123-45-67',type:'Квартира',website:'',consent:true,startedAt:Date.now()-5000,context:'Обсуждение проекта',area:'100'});
async function request(body = valid(), options = {}) {
  const req = {method:'POST',headers:{'content-type':'application/json',host:'forma.test',origin:'https://forma.test','x-forwarded-for':`test-${++address}`},body,...options};
  const res = {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler(req,res); return res;
}
test('API validates data and confirms success only after delivery', async t => {
  process.env.BOT_TOKEN='test-only'; process.env.CHAT_ID='test-only';
  global.fetch=async (_url,options) => { calls++; const body=JSON.parse(options.body); assert.equal(body.parse_mode,undefined); assert.match(body.text,/Анна/); return {ok:true,json:async()=>({ok:true})}; };
  for (const [label,patch] of [
    ['empty name',{name:''}],['injected name',{name:'<script>'}],['short phone',{phone:'+7999'}],['letters in phone',{phone:'+79991234567abc'}],['unknown type',{type:'other'}],['no consent',{consent:false}],['honeypot',{website:'spam.example'}],['missing honeypot',{website:undefined}],['instant submission',{startedAt:Date.now()}],['expired form',{startedAt:Date.now()-90000000}],['invalid area',{area:999}],['context injection',{context:'line\nline'}]
  ]) await t.test(label,async()=>{const before=calls;const res=await request({...valid(),...patch});assert.equal(res.code,400);assert.equal(calls,before);});
  await t.test('rejects GET',async()=>assert.equal((await request(valid(),{method:'GET'})).code,405));
  await t.test('rejects invalid JSON',async()=>assert.equal((await request('{')).code,400));
  await t.test('rejects oversized body',async()=>assert.equal((await request(' '.repeat(5000))).code,413));
  await t.test('rejects cross-origin browser request',async()=>assert.equal((await request(valid(),{headers:{'content-type':'application/json',host:'forma.test',origin:'https://other.test'}})).code,403));
  await t.test('missing configuration returns 503',async()=>{delete process.env.BOT_TOKEN;assert.equal((await request()).code,503);process.env.BOT_TOKEN='test-only';});
  await t.test('valid request succeeds and repeat is limited',async()=>{const headers={'content-type':'application/json',host:'forma.test','x-forwarded-for':'repeat-test'};const result=await request(valid(),{headers});assert.equal(result.code,200);assert.deepEqual(result.data,{ok:true});assert.equal((await request(valid(),{headers})).code,429);});
  await t.test('upstream failure is not success',async()=>{global.fetch=async()=>({ok:false,json:async()=>({ok:false})});assert.equal((await request()).code,502);});
  await t.test('network failure is not success',async()=>{global.fetch=async()=>{throw new Error('mock network failure');};assert.equal((await request()).code,502);});
});
