/* Jomon Room. All movable objects share one disappearance rule. */
const W=1000,H=750,FADE=500;
let objects=[],eyes,ended=false,muted=true,audio=null,canvas;
// The order also defines the four reproducible book compositions.
const layout=[
 ['rug',390,548,330,145,'cloth','カーペット'],
 ['curtain',157,152,69,205,'cloth','カーテン'],
 ['ac',688,94,178,46,'electronic','エアコン'],
 ['art',433,125,108,94,'clear','絵画'],
 ['clock',598,142,47,47,'metal','時計'],
 ['shelf',732,283,135,194,'wood','収納棚'],
 ['fridge',828,382,97,178,'electronic','冷蔵庫'],
 ['sofa',224,438,230,131,'wood','ソファ'],
 ['cushion',250,415,58,47,'cloth','クッション'],
 ['tv',390,302,165,101,'electronic','テレビ'],
 ['console',405,370,65,24,'electronic','ゲーム機'],
 ['table',659,486,157,65,'wood','テーブル'],
 ['laptop',671,450,75,60,'electronic','パソコン'],
 ['phone',621,482,25,38,'electronic','スマートフォン'],
 ['chair',747,545,68,100,'wood','椅子'],
 ['lamp',123,380,70,177,'metal','照明'],
 ['plant',900,551,83,141,'clear','観葉植物'],
 ['robot',293,614,76,41,'electronic','ロボット掃除機'],
 ['microwave',720,270,87,48,'electronic','電子レンジ'],
 ['coffee',789,310,43,61,'electronic','コーヒーメーカー'],
 ['bedding',794,648,174,70,'cloth','寝具'],
 ['clothes',154,608,87,73,'cloth','衣服'],
 ['water',395,662,41,66,'clear','水を入れた容器'],
 ['pot',587,656,69,47,'metal','鍋'],
 ['dishes',665,685,67,28,'clear','食器'],
 ['book',728,201,51,43,'cloth','本'],
 ['vase',786,196,29,42,'clear','花瓶'],
 ['basket',897,670,56,48,'wood','かご']
];
function setup(){
 pixelDensity(Math.min(devicePixelRatio||1,2));canvas=createCanvas(W,H);canvas.parent('room');
 eyes=new Marpan25D({id:'jomon-room',autoBlink:false});resetRoom();
 canvas.elt.addEventListener('pointerdown',e=>{e.preventDefault();const b=canvas.elt.getBoundingClientRect();interact((e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height,b.width/W)});
 document.querySelector('#reset').onclick=resetRoom;
 document.querySelector('#sound').onclick=()=>setSound(muted);
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>exportStage(Number(b.dataset.stage)));
 document.addEventListener('visibilitychange',()=>{if(audio){audio.hum.amp(0,.1);audio.wind.amp(0,.1)}});
}
function resetRoom(){objects=layout.map((o,i)=>({kind:o[0],x:o[1],y:o[2],w:o[3],h:o[4],material:o[5],name:o[6],id:i,at:null}));ended=false;eyes.openEyes();const list=document.querySelector('#accessible');list.replaceChildren();objects.forEach(o=>{let b=document.createElement('button');b.textContent=o.name;b.onclick=()=>removeObject(o);o.button=b;list.append(b)});let b=document.createElement('button');b.textContent='土偶';b.onclick=tapDogu;list.append(b);}
function opacity(o,now=millis()){return o.at===null?1:constrain(1-(now-o.at)/FADE,0,1)}
function removeObject(o){if(o.at!==null)return;o.at=millis();o.button.disabled=true;sound(o.material);}
function tapDogu(){if(millis()-eyes.blinkStartedAt<1100)return;eyes.blink([0,1,2],1100);sound('earth')}
function interact(x,y,s){
 if(dist(x,y,510,536)<64){tapDogu();return}
 const visible=objects.filter(o=>o.at===null).reverse();
 let hit=visible.find(o=>abs(x-o.x)<o.w/2&&abs(y-o.y)<o.h/2);
 if(!hit){const pad=22/s;hit=visible.filter(o=>abs(x-o.x)<Math.max(o.w/2,pad)&&abs(y-o.y)<Math.max(o.h/2,pad)).sort((a,b)=>dist(x,y,a.x,a.y)-dist(x,y,b.x,b.y))[0]}
 if(hit)removeObject(hit);
}
function draw(){
 renderRoom();
 const remaining=objects.reduce((n,o)=>n+opacity(o),0)/objects.length;
 if(!ended&&remaining===0){ended=true;eyes.blink([0,1,2],1300)}
 updateAudio(remaining);
}
function renderRoom(stage=null){
 background('#f6f3ec');strokeJoin(ROUND);strokeCap(ROUND);
 // Architecture remains after every object and its shadow has gone.
 noStroke();fill('#e7dfd1');quad(65,72,935,72,935,548,65,548);
 fill('#f1ebe0');quad(65,72,755,72,755,414,65,548);
 fill('#e5ddcf');quad(755,72,935,72,935,548,755,414);
 fill('#eee6d8');quad(65,548,755,414,935,548,935,719,65,719);
 stroke('#d7cdbd');strokeWeight(1);line(65,548,755,414);line(755,414,935,548);line(755,72,755,414);
 for(let y=548;y<720;y+=42)line(66,y,934,y);
 // Window is an architectural opening, not furniture.
 fill('#c9d7d0');stroke('#fffaf0');strokeWeight(9);rect(112,110,137,183,2);strokeWeight(4);line(181,110,181,293);line(112,200,249,200);
 noStroke();fill(255,248,219,32);quad(119,296,246,296,595,630,303,684);
 const counts=[objects.length,19,8,0];
 objects.forEach((o,i)=>{const a=stage===null?opacity(o):(i<counts[stage]?1:0);if(a<=0)return;push();drawingContext.globalAlpha=a;translate(o.x,o.y);drawObject(o);pop()});
 dogu(stage!==null);
}
function roomBox(x,y,w,h,c,r=5){fill(c);stroke('#807666');strokeWeight(1.3);rect(x,y,w,h,r)}
function ln(x,y,a,b){stroke('#807666');strokeWeight(1.5);line(x,y,a,b)}
function drawObject(o){
 let w=o.w,h=o.h;noStroke();fill(92,71,45,15);ellipse(4,h*.48,w*.95,12);
 switch(o.kind){
 case 'rug':noStroke();fill('#b4b3a0');ellipse(0,0,w,h);noFill();stroke('#d9d6c0');ellipse(0,0,w-20,h-17);break;
 case 'curtain':roomBox(-w/2,-h/2,w,h,'#c2b29a');for(let x=-w/2+10;x<w/2;x+=14)ln(x,-h/2,x,h/2);break;
 case 'ac':roomBox(-w/2,-h/2,w,h,'#faf8f1');ln(-w/2+9,9,w/2-9,9);break;
 case 'art':roomBox(-w/2,-h/2,w,h,'#aa8668',0);roomBox(-w/2+7,-h/2+7,w-14,h-14,'#eee4cf',0);noStroke();fill('#c8a17d');circle(10,-13,31);fill('#9baca0');triangle(-43,34,-11,-13,41,34);break;
 case 'clock':fill('#faf6e9');stroke('#9a8a72');ellipse(0,0,w,h);ln(0,0,-9,-11);ln(0,0,13,-3);break;
 case 'shelf':roomBox(-w/2,-h/2,w,h,'#b5a18a');for(let y=-h/2+11;y<h/2;y+=58)roomBox(-w/2+8,y,w-16,46,'#d5c7b4',0);break;
 case 'fridge':roomBox(-w/2,-h/2,w,h,'#e1e1d7');ln(-w/2,-20,w/2,-20);ln(-w/2+12,-12,-w/2+12,18);ln(-w/2+12,-61,-w/2+12,-38);break;
 case 'sofa':roomBox(-w/2+8,-h/2,w-16,h-20,'#a3aba0',20);roomBox(-w/2,-5,w,55,'#b6bcb0',14);roomBox(-w/2-4,-29,27,88,'#9da69a',12);roomBox(w/2-23,-29,27,88,'#9da69a',12);ln(0,-2,0,44);break;
 case 'cushion':push();rotate(-.15);roomBox(-w/2,-h/2,w,h,'#d3b384',10);pop();break;
 case 'tv':roomBox(-w/2,-h/2,w,h,'#4f5854');roomBox(-w/2+6,-h/2+6,w-12,h-14,'#778b89',1);ln(-28,h/2, -37,h/2+13);ln(28,h/2,37,h/2+13);break;
 case 'console':roomBox(-w/2,-h/2,w,h,'#d4d5ce');ln(-20,-3,17,-3);break;
 case 'table':ln(-w/2+14,10,-w/2+14,77);ln(w/2-14,10,w/2-14,77);roomBox(-w/2,-h/2,w,h,'#c8ae8c',15);break;
 case 'laptop':roomBox(-w/2,-h/2,w,h*.7,'#777f7a');roomBox(-w/2+4,-h/2+4,w-8,h*.7-8,'#b8c7be');roomBox(-w/2-4,13,w+8,15,'#a8ada4');break;
 case 'phone':roomBox(-w/2,-h/2,w,h,'#626e66');roomBox(-w/2+3,-h/2+4,w-6,h-9,'#b6c6b9',2);break;
 case 'chair':ln(-24,8,-26,50);ln(24,8,26,50);roomBox(-w/2,-h/2,w,h*.55,'#ac9271',9);roomBox(-w/2,-2,w,27,'#c4ab86',8);break;
 case 'lamp':ln(0,-60,0,80);fill('#aaa08c');ellipse(0,80,54,13);fill('#e2d4b5');stroke('#9b8a6c');quad(-22,-88,22,-88,35,-39,-35,-39);break;
 case 'plant':stroke('#6f8872');strokeWeight(3);line(0,46,0,-52);for(let i=0;i<5;i++){fill(i%2?'#8d9b7d':'#778e78');noStroke();ellipse((i%2?1:-1)*19,-45+i*18,43,20)}roomBox(-23,37,46,33,'#bd9b7d',4);break;
 case 'robot':fill('#d2d1c7');stroke('#959b91');ellipse(0,0,w,h);fill('#a6b4a7');ellipse(0,-4,24,13);break;
 case 'microwave':roomBox(-w/2,-h/2,w,h,'#e6e1d5');roomBox(-w/2+6,-h/2+6,w-26,h-12,'#758079');fill('#8f998c');circle(w/2-10,-4,5);break;
 case 'coffee':roomBox(-21,-30,40,57,'#6b766c');roomBox(-12,-15,24,23,'#c6c3af');roomBox(-13,10,26,13,'#d9d7c9');break;
 case 'bedding':roomBox(-w/2,-h/2,w,h,'#d7d1bb',16);roomBox(-w/2+6,-h/2+6,40,h-12,'#eee9da',10);ln(-w/2+56,-h/2+4,-w/2+56,h/2-4);break;
 case 'clothes':fill('#a8b5b3');stroke('#7d8d88');beginShape();[[-20,-36],[-43,-17],[-29,0],[-20,-8],[-22,35],[22,35],[20,-8],[29,0],[43,-17],[20,-36],[9,-29],[-9,-29]].forEach(p=>vertex(...p));endShape(CLOSE);break;
 case 'water':roomBox(-w/2,-h/2,w,h,'#c5d5cb',7);fill('#9cbfbd');noStroke();rect(-w/2+4,-3,w-8,h/2-5,3);fill('#ddd5c0');ellipse(0,-h/2,w,10);break;
 case 'pot':roomBox(-w/2,-h/2+8,w,h-8,'#8c9e97',12);ln(-w/2-10,-5,-w/2,-5);ln(w/2,-5,w/2+10,-5);fill('#b4c0b5');ellipse(0,-h/2+8,w,17);ln(-8,-h/2,8,-h/2);break;
 case 'dishes':fill('#ede9d9');stroke('#a7aa99');for(let y=8;y>=-4;y-=5)ellipse(0,y,w,h*.65);ellipse(0,-4,w*.7,h*.4);break;
 case 'book':for(let i=0;i<4;i++)roomBox(-w/2+i*12,-h/2,10,h,['#a2ae9a','#bba68c','#d3c49e','#a8b8b5'][i],1);break;
 case 'vase':fill('#c0b49d');stroke('#8e8574');ellipse(0,4,w,30);roomBox(-6,-21,12,15,'#c0b49d',2);break;
 case 'basket':roomBox(-w/2,-h/2,w,h,'#c6ad83',9);for(let x=-20;x<27;x+=9)ln(x,-20,x,20);for(let y=-15;y<24;y+=9)ln(-24,y,24,y);break;
 }
}
function dogu(still=false){
 push();translate(510,540);noStroke();fill(90,64,42,24);ellipse(0,64,113,20);
 stroke('#795c48');strokeWeight(2);fill('#b68a68');
 // Broad shoulders, thick legs and goggle-like head recall a shakoki dogu.
 rect(-38,12,30,52,13);rect(8,12,30,52,13);ellipse(-43,-12,39,53);ellipse(43,-12,39,53);ellipse(0,-3,73,81);ellipse(0,-49,108,66);rect(-16,-88,32,16,5);
 noFill();stroke('#8b674e');strokeWeight(2);
 for(let y=-12;y<29;y+=10){arc(0,y,52,22,0,PI);line(-48,y-6,-38,y);line(38,y,48,y-6)}
 ellipse(0,1,17,24);line(-26,41,-26,56);line(26,41,26,56);arc(0,-68,76,18,PI,TWO_PI);
 const blink=eyes.blinkStartedAt;if(still)eyes.openEyes();eyes.drawEyes(0,-50,156,72,0,0,0,{eyeScale:1.04});eyes.blinkStartedAt=blink;
 stroke('#795c48');line(-5,-23,5,-23);pop();
}
async function setSound(on){
 if(on){await userStartAudio();if(!audio)audio=createRoomAudio()}
 muted=!on;const b=document.querySelector('#sound');b.textContent=on?'音 オン':'音 オフ';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'音をオフにする':'音をオンにする');
}
function createRoomAudio(){const hum=new p5.Oscillator('sine');hum.freq(120);hum.amp(0);hum.start();const wind=new p5.Noise('pink');const filter=new p5.LowPass();wind.disconnect();wind.connect(filter);filter.freq(650);wind.amp(0);wind.start();return{hum,wind,filter,nextBird:millis()+5000}}
function updateAudio(remaining){if(!audio)return;const active=!muted&&!document.hidden;audio.hum.amp(active?.018*remaining:0,.2);audio.wind.amp(active?.028*(1-remaining):0,.4);if(active&&remaining<.8&&millis()>audio.nextBird){tone(1600+random(700),.045*(1-remaining),.2,'sine',2600);audio.nextBird=millis()+random(4000,9500)}}
function tone(freq,amp,duration,type='sine',end=freq*.6){if(muted||!audio)return;const osc=new p5.Oscillator(type);osc.freq(freq);osc.amp(0);osc.start();osc.amp(amp,.008);osc.freq(end,duration*.8);osc.amp(0,duration,.02);setTimeout(()=>{osc.stop();osc.dispose()},(duration+.15)*1000)}
function sound(material){if(muted||!audio)return;switch(material){case 'electronic':tone(720,.07,.16,'triangle',390);break;case 'wood':tone(230,.13,.16,'triangle',110);break;case 'metal':tone(950,.06,.4);tone(1463,.025,.3);break;case 'cloth':{let n=new p5.Noise('pink');n.amp(0);n.start();n.amp(.05,.02);n.amp(0,.22,.03);setTimeout(()=>{n.stop();n.dispose()},400);break}case 'earth':tone(125,.15,.65,'sine',65);tone(193,.045,.3);break;default:tone(1350,.065,.4,'sine',1280)}}
function exportStage(stage){
 // Synchronous rendering leaves interaction, audio and fade timestamps intact.
 const density=pixelDensity();pixelDensity(1);resizeCanvas(3200,2400,true);push();scale(3.2);renderRoom(stage);pop();saveCanvas(canvas,`jomon-room-${stage+1}`,'png');resizeCanvas(W,H,true);pixelDensity(density);renderRoom();document.querySelector('#status').textContent=`${stage+1}ページ目のPNGを書き出しました`;
}
