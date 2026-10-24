// Serve repository root on port 8000, install Playwright, then run node tests/marpan-photo.cjs.
// Optional: BASE_URL and CHROMIUM_PATH select a server and browser executable.
const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL || 'http://localhost:8000/');
 await page.locator('a[href="./020_marpan-photo/"]').click();
 await page.waitForFunction(()=>typeof marpan!=='undefined' && !!marpan);
 for(const [w,h,type] of [[2400,1600,'image/jpeg'],[900,1600,'image/png'],[1600,900,'image/webp']]){
 const data=await page.evaluate(({w,h,type})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='#72a3b5';ctx.fillRect(0,0,w,h);return c.toDataURL(type).split(',')[1]},{w,h,type});
 await page.locator(type==='image/png'?'#camera':'#file').setInputFiles({name:'photo.'+type.split('/')[1],mimeType:type,buffer:Buffer.from(data,'base64')});
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='');
 const box=await page.locator('#photo').boundingBox();
 // A tap must preserve the initial placement, without NaN coordinates.
 if(mobile) await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 const tapped=await page.evaluate(()=>({...placement}));
 if(tapped.x!==.5 || tapped.y!==.5)throw Error('tap changed placement '+JSON.stringify(tapped));

 if(mobile){const session=await page.context().newCDPSession(page);for(const [type,x,y] of [['touchStart',.5,.5],['touchMove',.65,.6],['touchEnd',.65,.6]])await session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:box.x+box.width*x,y:box.y+box.height*y}]});await session.detach();}else{await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6);await page.mouse.up();}
 const pos=await page.evaluate(()=>({...placement}));if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||Math.abs(pos.x-.65)>.02||Math.abs(pos.y-.6)>.02)throw Error('drag failed '+JSON.stringify(pos));
 await page.locator('#size').fill('160');await page.locator('#angle').fill('35');
 await page.locator('#save').click();await page.locator('#result-image').waitFor({state:'visible'});
 await page.locator('#result-image').evaluate(img=>img.decode());
 const dims=await page.locator('#result-image').evaluate(img=>[img.naturalWidth,img.naturalHeight]);if(dims[0]!==w||dims[1]!==h)throw Error('resolution mismatch '+dims);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);if(download.suggestedFilename()!=='lifesketch-marpan.png')throw Error('download');
 await page.locator('#close-result').click();await page.locator('#reset').click();
 }
 // Drag from empty photo space without snapping the selected sticker to the finger.
 await page.locator('#photo').scrollIntoViewIfNeeded();
 const gestureBox = await page.locator('#photo').boundingBox();
 const at = (x,y) => ({x:gestureBox.x+gestureBox.width*x,y:gestureBox.y+gestureBox.height*y});
 const beforeRemote=await page.evaluate(()=>({...placement}));
 if(mobile) {
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at(.1,.15)]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[at(.2,.25)]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.detach();
 } else {
   await page.mouse.move(at(.1,.15).x,at(.1,.15).y);await page.mouse.down();
   await page.mouse.move(at(.2,.25).x,at(.2,.25).y);await page.mouse.up();
 }
 const afterRemote=await page.evaluate(()=>({...placement}));
 if(Math.abs(afterRemote.x-beforeRemote.x-.1)>.01 || Math.abs(afterRemote.y-beforeRemote.y-.1)>.01)throw Error('remote drag failed');
 await page.locator('#reset').click();
 if(mobile) {
   await page.locator('#photo').scrollIntoViewIfNeeded();
   const box=await page.locator('#photo').boundingBox();
   const center={x:box.x+box.width*.25,y:box.y+box.height*.3};
   const pair=(radius,angle)=>[-1,1].map((sign,index)=>({id:index+1,x:center.x+sign*radius*Math.cos(angle),y:center.y+sign*radius*Math.sin(angle)}));
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pair(20,0)});
   const baseline=await page.evaluate(()=>({...placement}));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pair(30,Math.PI/4)});
   await page.waitForFunction(() => Math.abs(placement.scale-1.5)<.03);
   const enlarged=await page.evaluate(()=>({...placement}));
   if(Math.abs(enlarged.scale-1.5)>.03 || Math.abs(enlarged.angle-45)>1)throw Error('pinch out/rotate failed '+JSON.stringify(enlarged));
   if(Math.abs(enlarged.x-baseline.x)>.01 || Math.abs(enlarged.y-baseline.y)>.01)throw Error('pinch jumps position');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pair(12,-Math.PI/6)});
   await page.waitForFunction(() => Math.abs(placement.scale-.6)<.03);
   const reduced=await page.evaluate(()=>({...placement}));
   if(Math.abs(reduced.scale-.6)>.03 || Math.abs(reduced.angle+30)>1)throw Error('pinch in/reverse rotation failed '+JSON.stringify(reduced));
   const remaining=pair(12,-Math.PI/6)[0];
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[pair(12,-Math.PI/6)[1]]});
   const lifted=await page.evaluate(()=>({...placement}));
   if(Math.abs(lifted.x-reduced.x)>.01 || Math.abs(lifted.y-reduced.y)>.01)throw Error('finger lift jumps position');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:remaining.id,x:remaining.x+10,y:remaining.y+10}]});
   await page.waitForFunction(x => placement.x > x+.01, lifted.x);
   const resumed=await page.evaluate(()=>({...placement}));
   if(Math.abs(resumed.x-lifted.x-10/box.width)>.01 || Math.abs(resumed.y-lifted.y-10/box.height)>.01)throw Error('one-finger continuation jumps');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   if(await page.evaluate(()=>photoPointers.size)!==0)throw Error('cancel left stale pointers');
   await cdp.detach();
   await page.locator('#reset').click();
 }
 // Multiple stickers keep independent transforms and all appear in the export.
 await page.locator('#photo').focus();
 await page.keyboard.press('ArrowLeft');
 const first = await page.evaluate(() => ({...placement}));
 await page.locator('#add').click();
 await page.locator('#size').fill('50');
 await page.locator('#angle').fill('-45');
 const second = await page.evaluate(() => ({...placement}));
 if (await page.evaluate(() => placements.length) !== 2) throw Error('add failed');
 await page.locator('#selected').selectOption(String(first.id));
 if (await page.locator('#size').inputValue() !== '100') throw Error('selection did not sync sliders');
 if (await page.evaluate(() => placements[1].angle) !== -45) throw Error('transforms are not independent');
 // Place the two apart using keyboard input, including mobile keyboard support.
 await page.locator('#photo').focus();
 for (let n=0;n<6;n++) await page.keyboard.press('Shift+ArrowLeft');
 await page.locator('#selected').selectOption(String(second.id));
 await page.locator('#photo').focus();
 for (let n=0;n<4;n++) await page.keyboard.press('Shift+ArrowRight');
 const items = await page.evaluate(() => placements.map(item => ({...item})));
 await page.locator('#photo').scrollIntoViewIfNeeded();
 const selectionBox=await page.locator('#photo').boundingBox();
 const target=items[0];
 if(mobile) await page.touchscreen.tap(selectionBox.x+selectionBox.width*target.x,selectionBox.y+selectionBox.height*target.y);
 else await page.mouse.click(selectionBox.x+selectionBox.width*target.x,selectionBox.y+selectionBox.height*target.y);
 if(await page.evaluate(() => placement.id)!==target.id) throw Error('tap did not select another sticker');
 if(mobile) {
   const cdp=await page.context().newCDPSession(page);
   const touches=items.map((item,index)=>({id:index+1,x:selectionBox.x+selectionBox.width*item.x,y:selectionBox.y+selectionBox.height*item.y}));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
   if(await page.evaluate(()=>placement.id)!==target.id) throw Error('second finger changed selection');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.detach();
 }

 await page.locator('#save').click();
 await page.locator('#result-image').waitFor({state:'visible'});
 await page.locator('#result-image').evaluate(img => img.decode());
 const visible = await page.locator('#result-image').evaluate((img, items) => {
   const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
   const ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
   return items.map(item => {
     const p=ctx.getImageData(Math.round(item.x*c.width),Math.round(item.y*c.height),1,1).data;
     return p[0] < 50 || p[0] > 230; // Black eye or white body, rather than blue photo.
   });
 }, items);
 if (!visible.every(Boolean)) throw Error('export missing a sticker');
 await page.locator('#close-result').click();
 await page.locator('#remove').click();
 if (await page.evaluate(() => placements.length) !== 1) throw Error('remove failed');
 await page.locator('#remove').click();
 if (!await page.locator('#size').isDisabled()) throw Error('empty selection controls enabled');
 await page.locator('#add').click();
 if (await page.evaluate(() => placements.length) !== 1 || await page.locator('#size').isDisabled()) throw Error('cannot add after removing all');
 for(let n=0;n<25;n++) await page.locator('#add').click();
 if(await page.evaluate(() => placements.length)!==26) throw Error('unexpected sticker limit');
 await page.locator('#file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('開けません'));
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow');

 if(errors.length)throw Error(errors.join('\n'));
 console.log(mobile?'Mobile touch: PASS':'Desktop mouse: PASS','JPEG/PNG/WebP, portrait/landscape, drag, sliders, original-resolution export, download, reset, remote drag, pinch scale/rotation/translation, finger transitions, multiple selection, independent transforms, multi-sticker export, remove, 26 stickers, invalid file, no page errors');await page.close();
 }
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
