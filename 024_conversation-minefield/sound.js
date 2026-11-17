/* Original, offline formant synthesis: no recordings, speech API, or licenses.
   One voice and one comic pop per gesture, independent of the bomb count. */
class MinefieldSound {
  constructor() { this.enabled = true; this.voices = []; }
  init() {
    if (this.context) return;
    const ctx = this.context = getAudioContext();
    this.master = ctx.createGain(); this.master.gain.value = .55;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16; limiter.knee.value = 12;
    limiter.ratio.value = 12; limiter.attack.value = .002; limiter.release.value = .1;
    this.master.connect(limiter); limiter.connect(ctx.destination);
    // Japanese vowel formants, voiced at 155 Hz; slightly rounded /u/.
    const formants = [[800,1200,2600],[300,2300,3000],[350,1300,2500],[500,1900,2700],[500,850,2500]];
    this.vowels = formants.map(fs => {
      const b = ctx.createBuffer(1,Math.floor(ctx.sampleRate*.28),ctx.sampleRate), data=b.getChannelData(0);
      let peak=0;
      for(let n=0;n<data.length;n++) {
        const t=n/ctx.sampleRate;
        let v=0;
        for(let h=1;h<=24;h++) {
          const f=h*155;
          const weight=fs.reduce((s,formant,i)=>s+Math.exp(-.5*((f-formant)/(i===0?100:150))**2)/(1+i*.5),0);
          v+=Math.sin(2*Math.PI*f*t)*weight;
        }
        data[n]=v*Math.min(1,t/.018)*Math.min(1,(.28-t)/.055); peak=Math.max(peak,Math.abs(data[n]));
      }
      for(let n=0;n<data.length;n++) data[n]=data[n]/peak*.48;
      return b;
    });
    this.pop=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.24),ctx.sampleRate);
    const data=this.pop.getChannelData(0);
    let seed=12345;
    for(let n=0;n<data.length;n++) {
      const t=n/ctx.sampleRate; seed=(Math.imul(seed,1664525)+1013904223)|0;
      data[n]=((seed/2147483648)*.1+Math.sin(2*Math.PI*(160*t-190*t*t))*.23)*Math.exp(-t*22)*Math.min(1,t/.004);
    }
  }
  play(index) {
    if(!this.enabled) return;
    try {
      this.init();
      // Both resumes are invoked during the originating user gesture.
      userStartAudio().catch(()=>this.failed());
      this.context.resume().then(()=>{
        if(!this.enabled) return;
        const now=this.context.currentTime;
        for(const [buffer,delay] of [[this.vowels[index],0],[this.pop,.045]]) {
          const source=this.context.createBufferSource(); source.buffer=buffer;
          source.connect(this.master); source.start(now+delay); this.voices.push(source);
          source.onended=()=>{source.disconnect();this.voices=this.voices.filter(s=>s!==source);};
        }
        // Bound even pathological keyboard repeat while keeping the newest input.
        while(this.voices.length>32) this.voices.shift().stop();
      }).catch(()=>this.failed());
    } catch { this.failed(); }
  }
  failed() { document.getElementById('hint').textContent='音声を開始できませんでした。もう一度鍵盤をタップ'; }
  toggle() {
    this.enabled=!this.enabled;
    if(!this.enabled) for(const s of this.voices) { try{s.stop();}catch{} }
    return this.enabled;
  }
}
