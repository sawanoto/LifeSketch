'use strict';
const PAPER = '#f7f5ef', RED = '#d52f37';
const COLORS = ['#b93848','#e35b4c','#a9323d','#cf4d69','#c54b31','#df7862','#833a47','#c8758f','#497aab','#d2af43','#6e9960','#84649a','#dd9141','#805941'];
let shops, active = null, marpan, layout, joyAt = -Infinity, soundOn = true, audioReady, voice;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function makeShop(count) {
  const target = Math.floor(Math.random()*count);
  // Every distractor has a distinct colour; none shares the target's exact red.
  const jars = Array.from({length:count},(_,i)=>({correct:i===target,
    color:i===target?RED:count===6?['#497aab','#d2af43','#6e9960','#84649a','#dd9141'][i>target?i-1:i]:COLORS[i%COLORS.length],
    seen:false,at:-Infinity}));
  if(count===100) {
    let n=0;
    jars.forEach(j=>{if(!j.correct){const c=color(COLORS[n%COLORS.length]);
      // Tiny, deterministic variations yield 99 individually coloured products.
      j.color=`rgb(${red(c)+Math.floor(n/14)},${green(c)+Math.floor(n/14)},${blue(c)+Math.floor(n/14)})`;n++;}});
  }
  return {jars,start:null,elapsed:null,misses:0};
}
function setup(){
  const host=document.getElementById('scene');
  const canvas=createCanvas(host.clientWidth,700);canvas.parent(host);
  canvas.elt.setAttribute('aria-hidden','true');pixelDensity(Math.min(devicePixelRatio||1,2));frameRate(30);
  marpan=new Marpan25D({autoBlink:false});
  document.getElementById('reset').onclick=resetGame;
  document.getElementById('export').onclick=exportPNG;
  document.getElementById('sound').onclick=()=>{soundOn=!soundOn;
    const b=document.getElementById('sound');b.textContent=soundOn?'音 オン':'音 オフ';b.setAttribute('aria-pressed',String(soundOn));if(soundOn)startSound();};
  resetGame();new ResizeObserver(resizeScene).observe(host);
}
function resetGame(){shops=[makeShop(100),makeShop(6)];active=null;joyAt=-Infinity;
  document.getElementById('results').hidden=true;
  document.getElementById('status').textContent='最初に触れた売り場で、時間を計ります。';
  resizeScene();
}
function resizeScene(){const w=document.getElementById('scene').clientWidth;
  const columns=w<650?5:10, cellH=w<650?46:52;
  layout={w,h:250+Math.ceil(100/columns)*cellH,columns,cellH,panel:w/2};
  document.getElementById('scene').style.height=`${layout.h}px`;
  resizeCanvas(w,layout.h,true);placeTargets();
}
function jarPosition(side,i){const {panel,columns,cellH}=layout;
  const cols=side===0?columns:2,rows=side===0?Math.ceil(100/cols):3;
  const step=side===0?(panel-14)/cols:Math.min(100,(panel-24)/2);
  const row=Math.floor(i/cols),col=i%cols;
  return {x:side*panel+panel/2+(col-(cols-1)/2)*step,
    y:side===0?224+row*cellH:224+row*Math.min(135,(layout.h-280)/3),
    w:Math.min(32,(panel-14)/columns-5),hitW:step,hitH:cellH,rows};
}
function placeTargets(){const host=document.getElementById('targets');host.replaceChildren();
  shops.forEach((shop,side)=>shop.jars.forEach((j,i)=>{const p=jarPosition(side,i),b=document.createElement('button');
    b.className='jar-target';b.style.cssText=`left:${p.x-p.hitW/2}px;top:${p.y-p.hitH/2}px;width:${p.hitW}px;height:${p.hitH}px`;
    b.setAttribute('aria-label',`${side===0?'100':'6'}種類の売り場、ジャム${i+1}`);
    b.onclick=()=>choose(side,i);b.dataset.side=side;b.dataset.index=i;host.append(b);}));updateTargets();
}
function updateTargets(){document.querySelectorAll('.jar-target').forEach(b=>{
  const side=Number(b.dataset.side),shop=shops[side],j=shop.jars[Number(b.dataset.index)];
  b.disabled=shop.elapsed!==null||(active!==null&&active!==side);
  b.setAttribute('aria-pressed',String(j.seen));});
}
function choose(side,i){const shop=shops[side];if(shop.elapsed!==null||(active!==null&&active!==side))return;
  const now=performance.now();if(active===null){active=side;shop.start=now;}
  const j=shop.jars[i];j.seen=true;j.at=millis();
  if(j.correct){shop.elapsed=now-shop.start;active=null;joyAt=millis();
    document.getElementById('status').textContent=shops.every(s=>s.elapsed!==null)?'ふたつの売り場で、見つかりました。':'見つかった！ もう片方の売り場でも探してみよう。';
    if(shops.every(s=>s.elapsed!==null)){
      shops.forEach((s,k)=>{document.getElementById(`time-${k}`).textContent=`${(s.elapsed/1000).toFixed(2)} 秒`;document.getElementById(`miss-${k}`).textContent=`${s.misses} 回`;});
      document.getElementById('results').hidden=false;
    }
  }else{shop.misses++;document.getElementById('status').textContent='この瓶ではないみたい。赤いジャムを探そう。';}
  updateTargets();startSound().then(()=>playTone(j.correct));
}
async function startSound(){if(!soundOn)return;try{
  if(!audioReady)audioReady=userStartAudio().then(()=>{voice=new p5.PolySynth();});
  await audioReady;
}catch{audioReady=null;document.getElementById('status').textContent='音を始められませんでした。「音 オン」で再度お試しください。';}}
function playTone(correct){if(!soundOn||!voice)return;
  if(correct){voice.play('E5',.13,0,.12);voice.play('A5',.11,.09,.17);}else voice.play('C4',.055,0,.065);
}
function draw(){renderScene(millis());}
function label(str,x,y,size=12,ink='#7d8674'){noStroke();fill(ink);textFont('sans-serif');textSize(size);textAlign(CENTER,CENTER);text(str,x,y);}
function renderScene(t){background(PAPER);const {w,h,panel}=layout,joy=t-joyAt<850;
  const lift=joy&&!reducedMotion?Math.sin((t-joyAt)/850*Math.PI)*8:0;
  marpan.setExpression(joy?'happy':'pupil');marpan.drawAt(w/2,119-lift,{bodyWidth:112,bodyHeight:76,lookX:w/2,lookY:140});
  stroke('#d1d6c6');strokeWeight(1);fill('#fffdf7');rectMode(CENTER);rect(w/2,37,Math.min(230,w-32),45,20);
  noStroke();triangle(w/2-5,59,w/2+7,59,w/2,67);label(joy?'ありがとう！':'赤いジャムがほしい',w/2,37,16,'#505b47');
  stroke('#d8ddcf');line(panel,178,panel,h-15);
  [0,1].forEach(side=>{const x=panel*(side+.5),shop=shops[side];
    label(side===0?'100 種類':'6 種類',x,182,16,'#505b47');
    shop.jars.forEach((j,i)=>{const p=jarPosition(side,i);drawJar(p,j,t);});
    if(shop.elapsed!==null)label('見つかった',x,h-14,11,'#677c58');
    else if(active===side)label('探索中',x,h-14,11,'#677c58');
  });
}
function drawJar(p,j,t){const age=t-j.at,animate=!reducedMotion&&age>=0&&age<380;
  const dx=animate&&!j.correct?Math.sin(age*.055)*(1-age/380)*3:0;
  const dy=animate&&j.correct?-Math.sin(age/380*Math.PI)*11:0;
  push();translate(p.x+dx,p.y+dy);scale(p.w/32);rectMode(CENTER);
  noStroke();fill('#e2e2d5');ellipse(0,19,31,5);
  stroke('#a5ad9b');strokeWeight(.8);fill('#f1f4e6');rect(0,1,29,32,5);
  noStroke();fill(j.color);rect(0,3,25,25,3);
  fill('#fcfbef');rect(0,3,24,11,1);fill('#aaa997');rect(0,2,10,1);rect(0,5,6,1);
  fill(255,130);rect(-9,-2,2,16,1);
  stroke('#868d78');strokeWeight(.8);fill('#c3c9ad');rect(0,-15,31,7,2);
  stroke('#a5ac94');for(let x=-12;x<14;x+=4)line(x,-17,x,-13);
  if(j.seen){noStroke();fill('#6b7760');circle(0,25,3);}
  pop();
}
function exportPNG(){const oldW=width,oldH=height,d=pixelDensity(),t=millis();
  try{const extra=shops.every(s=>s.elapsed!==null)?190:0;
    const scaleFactor=4000/(Math.max(layout.w,layout.h+extra));
    pixelDensity(1);resizeCanvas(Math.round(layout.w*scaleFactor),Math.round((layout.h+extra)*scaleFactor),true);
    push();scale(scaleFactor);renderScene(t);
    if(extra){label('100種類                   6種類',layout.w/2,layout.h+25,15);
      label(shops.map(s=>`${(s.elapsed/1000).toFixed(2)} 秒 / ${s.misses} 回`).join('          '),layout.w/2,layout.h+65,14);
      label('多いほど、選びやすい？',layout.w/2,layout.h+130,21,'#505b47');}
    pop();saveCanvas('lifesketch-008-choice','png');
    document.getElementById('status').textContent='長辺4000pxのPNGを保存しました。';
  }catch{document.getElementById('status').textContent='PNGを保存できませんでした。もう一度お試しください。';}
  finally{pixelDensity(d);resizeCanvas(oldW,oldH,true);renderScene(t);}
}
