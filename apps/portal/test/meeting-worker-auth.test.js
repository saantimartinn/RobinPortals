const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranscriptHandlers } = require('../../../packages/meeting-history/handlers.cjs');
const http = require('../lib/http');
test('el worker rechaza peticiones sin secreto antes de tocar la base de datos', async () => {
  const previous=process.env.MEET_WEBHOOK_SECRET;
  process.env.MEET_WEBHOOK_SECRET='expected-test-secret';
  try {
    const worker=createTranscriptHandlers({appId:'portal',getSupabase:()=>{throw new Error('database must not be touched');},google:{},chatCompletion:async()=>{},advisors:[],http}).worker;
    assert.equal((await worker({httpMethod:'POST',headers:{}})).statusCode,401);
    assert.equal((await worker({httpMethod:'POST',headers:{'x-meet-worker-secret':'wrong'}})).statusCode,401);
    assert.equal((await worker({httpMethod:'GET',headers:{'x-meet-worker-secret':'expected-test-secret'}})).statusCode,405);
  } finally { if(previous===undefined)delete process.env.MEET_WEBHOOK_SECRET;else process.env.MEET_WEBHOOK_SECRET=previous; }
});
