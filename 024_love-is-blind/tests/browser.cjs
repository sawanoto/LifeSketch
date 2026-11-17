// Serve the repository root on port 8000. Run with node tests/browser.cjs.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for(const mobile of [false,true]) {
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.goto('http://127.0.0.1:8000/');
   await page.getByRole('link').filter({hasText:'恋は盲目'}).click();
   await page.waitForFunction(()=>typeof traveler!=='undefined'&&traveler);
   await page.evaluate(()=>{noLoop();resetWorld();draw();});
   await page.screenshot({path:`/tmp/love-${mobile?'mobile':'desktop'}-wide.png`});
   const box=await page.locator('#stage canvas').boundingBox();
   const point={x:box.x+box.width*.64,y:box.y+box.height*.46};
   if(mobile)await page.touchscreen.tap(point.x,point.y);
   else {await page.mouse.move(box.x+box.width*.22,box.y+box.height*.62);await page.mouse.down();await page.mouse.move(point.x,point.y);await page.mouse.up();}
   await page.evaluate(()=>{for(let i=0;i<160;i++)advanceWorld(1/60);draw();});
   assert.ok(await page.evaluate(()=>focus>.99));
   const before=await page.evaluate(()=>worldTime);
   await page.evaluate(()=>{for(let i=0;i<600;i++)advanceWorld(1/60);draw();});
   assert.ok(await page.evaluate(()=>worldTime)>before+9.9);
   await page.screenshot({path:`/tmp/love-${mobile?'mobile':'desktop'}-near.png`});
   const away={x:box.x+box.width*.1,y:box.y+box.height*.8};
   if(mobile)await page.touchscreen.tap(away.x,away.y);else await page.mouse.click(away.x,away.y);
   await page.evaluate(()=>{for(let i=0;i<180;i++)advanceWorld(1/60);draw();});
   assert.ok(await page.evaluate(()=>focus<.01));
   assert.ok(await page.evaluate(()=>worldTime)>before+12);
   await page.locator('#stage').focus();await page.keyboard.down('ArrowRight');
   const x=await page.evaluate(()=>position.x);
   await page.evaluate(()=>advanceWorld(.1));await page.keyboard.up('ArrowRight');
   assert.ok(await page.evaluate(()=>position.x)>x);
   await page.getByRole('button',{name:'はじめから'}).click();
   assert.deepEqual(await page.evaluate(()=>({time:worldTime,focus,x:position.x})),{time:0,focus:0,x:.22});
   for(const viewport of [{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: desktop drag, mobile tap, proximity, recovery, hidden world time, keyboard, reset, responsive gallery/work, no console or HTTP errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
