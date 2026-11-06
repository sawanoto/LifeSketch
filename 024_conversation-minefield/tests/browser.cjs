'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for(const mobile of [false,true]) {
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.goto('http://127.0.0.1:8000/');
   await page.getByRole('link').filter({hasText:'会話の地雷原'}).click();
   await page.waitForFunction(()=>typeof marpan!=='undefined' && marpan);
   await page.waitForTimeout(800);
   assert.equal(await page.evaluate(()=>bursts.length),0);
   const fixed=await page.evaluate(()=>JSON.stringify(marpan));
   await page.screenshot({path:`/tmp/minefield-${mobile?'mobile':'desktop'}-quiet.png`});
   for(let i=0;i<5;i++) {
    await page.evaluate(()=>{noLoop();bursts=[];});
    const button=page.locator(`[data-vowel="${i}"]`);
    if(mobile) await button.tap(); else await button.click();
    const state=await page.evaluate(()=>({count:bursts.length,types:[...new Set(bursts.map(b=>b.vowel))],air:bursts.filter(b=>b.air).length,hidden:bombs.filter(b=>millis()-b.last<RESTORE_MS).length}));
    assert.deepEqual(state,{count:4,types:[i],air:2,hidden:4});
    await page.waitForTimeout(260);
    assert.equal(await page.evaluate(()=>bombs.filter(b=>millis()-b.last<RESTORE_MS).length),0);
   }
   await page.waitForFunction(()=>audio.context?.state==='running');
   assert.equal(await page.evaluate(()=>audio.vowels.length),5);
   // Distinct non-silent vowel buffers with conservative peak amplitude.
   assert.equal(await page.evaluate(()=>audio.vowels.every(b=>{const d=b.getChannelData(0);let peak=0;for(const x of d)peak=Math.max(peak,Math.abs(x));return peak>.4&&peak<.5;})),true);
   await page.evaluate(()=>{bursts=[];});
   for(let i=0;i<20;i++) await page.keyboard.press('a');
   await page.keyboard.press('I');await page.keyboard.press('u');await page.keyboard.press('e');await page.keyboard.press('o');
   assert.equal(await page.evaluate(()=>bursts.length),96);
   assert.equal(await page.evaluate(()=>JSON.stringify(marpan)),fixed);
   await page.evaluate(()=>{draw();});
   await page.screenshot({path:`/tmp/minefield-${mobile?'mobile':'desktop'}-burst.png`});
   await page.evaluate(()=>{loop();});await page.waitForTimeout(850);
   assert.equal(await page.evaluate(()=>bursts.length),0);
   assert.equal(await page.evaluate(()=>JSON.stringify(marpan)),fixed);
   await page.getByRole('button',{name:'音あり',exact:true}).click();
   await page.locator('[data-vowel="0"]').click();
   assert.equal(await page.evaluate(()=>audio.enabled),false);
   for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1920,height:1080}]) {
    await page.setViewportSize(viewport);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[data-vowel]')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44 && r.height>=44 && r.bottom<=innerHeight;})),true);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS desktop + touch: gallery, idle silence, all vowels, exact bomb matching, ground/air, 230ms respawn, 20 rapid repeats, overlapping inputs, immutable Marpan, audio startup, mute, responsive keys, no HTTP/JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
