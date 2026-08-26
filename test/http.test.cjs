const test=require('node:test');
const assert=require('node:assert/strict');
const {parseJsonBody,verifyOrigin,json,methodNotAllowed}=require('../backend/lib/http');
test('JSON bodies support plain/base64 and reject malformed input',()=>{
  assert.deepEqual(parseJsonBody({body:'{"ok":true}'}),{ok:true});
  assert.deepEqual(parseJsonBody({body:Buffer.from('{"ok":true}').toString('base64'),isBase64Encoded:true}),{ok:true});
  assert.equal(parseJsonBody({body:'{'}),null);
});
test('foreign browser origins are rejected',()=>{
  assert.equal(verifyOrigin({headers:{host:'robin.example',origin:'https://robin.example'}}),true);
  assert.equal(verifyOrigin({headers:{host:'robin.example',origin:'https://foreign.example'}}),false);
});
test('response helpers preserve status and multiple cookies',()=>{
  const response=json({ok:true},{statusCode:201,cookies:['a=1','b=2']});
  assert.equal(response.statusCode,201);
  assert.equal(response.multiValueHeaders['Set-Cookie'].length,2);
  assert.equal(methodNotAllowed(['POST']).headers.Allow,'POST');
});
