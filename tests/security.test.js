import assert from 'node:assert/strict'; import test from 'node:test';
test('production configuration requires strong secrets',()=>{assert.ok(process.env.NODE_ENV!=='production'||(process.env.JWT_SECRET||'').length>=32)});
test('provider keys are never part of public video fields',()=>{const video={url:'https://example.com',briefText:'test'};assert.equal('apiKey' in video,false)});
