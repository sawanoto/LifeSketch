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
 await page.locator('#file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('開けません'));
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow');

 if(errors.length)throw Error(errors.join('\n'));
 console.log(mobile?'Mobile touch: PASS':'Desktop mouse: PASS','JPEG/PNG/WebP, portrait/landscape, drag, sliders, original-resolution export, download, reset, invalid file, no page errors');await page.close();
 }
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
