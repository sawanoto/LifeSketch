// Serve the repository root on port 8000 before running.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
  const errors=[];
  try {
    for(const mobile of [false,true]) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:8000/');
      await page.getByRole('link').filter({hasText:'テレビスカッシュ'}).click();
      await page.waitForFunction(()=>typeof scene!=='undefined' && scene);
      await page.evaluate(()=>noLoop());
      for(let i=0;i<10;i++) {
        if(mobile) await page.touchscreen.tap(100+i*2,300);
        else await page.mouse.click(100+i*2,300);
      }
      assert.equal(await page.evaluate(()=>balls.length),10);
      assert.equal(await page.evaluate(()=>throws),10);
      assert.equal(await page.evaluate(()=>balls.filter(b=>b.guaranteed).length),1);
      await page.evaluate(()=>{
        const before=JSON.stringify(rightMarpan);
        const identity=balls[0];
        advanceBall(identity,LEG_SECONDS,()=>1);
        if(balls[0]!==identity || identity.leg!==1) throw Error('reflection identity');
        const b={leg:1,progress:0,guaranteed:false};
        if(advanceBall(b,LEG_SECONDS,()=>1)) throw Error('right loss');
        if(JSON.stringify(rightMarpan)!==before) throw Error('right reacted');
        for(let leg=0;leg<3;leg++) {
          const [a,p]=endpoints(leg), [q,b]=endpoints(leg+1);
          if(p.x!==q.x || p.y!==q.y) throw Error('discontinuous path');
          if(leg!==1 && (Math.abs((p.x-a.x)-(b.x-q.x))>1e-6 || Math.abs((p.y-a.y)+(b.y-q.y))>1e-6)) throw Error('reflection angle');
        }
        draw();
      });
      await page.screenshot({path:`/tmp/tv-squash-${mobile?'mobile':'desktop'}.png`});
      for(const viewport of [{width:320,height:568},{width:844,height:390}]) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.ok(await page.evaluate(()=>scene.left.x-scene.size*.5>0 && scene.right.x+scene.size*.5<width && scene.tv.y-65*scene.unit>40));
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);
    console.log('Desktop/mobile: gallery, 10 clicks/taps, identity, reflection, neutral right, resize and console passed.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
