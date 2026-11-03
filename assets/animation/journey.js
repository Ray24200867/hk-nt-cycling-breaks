/* Scroll controls the camera; elapsed time controls pedals and wheels. No dependencies. */
(() => {
  const root = document.querySelector('#cycling-journey');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = root.querySelector('.journey-stage');
  const track = root.querySelector('.journey-scroll-track');
  const hk = root.querySelector('.journey-map--hk');
  const side = root.querySelector('.journey-side');
  const rear = root.querySelector('.journey-rear');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const bar = root.querySelector('.journey-progress i');
  const pause = root.querySelector('.journey-pause');
  const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
  const range = (p,a,b) => clamp((p-a)/(b-a));
  const smooth = t => t*t*(3-2*t);
  const mix = (a,b,t) => a+(b-a)*t;
  const svgNS = 'http://www.w3.org/2000/svg';
  const make = (tag,attrs,parent) => {const e=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;};
  const wheels = [];
  const wheelParent = root.querySelector('.cycle-wheels');
  for (const x of [270,1030]) {
    make('circle',{cx:x,cy:960,r:218,fill:'none',stroke:'#7f291d','stroke-width':18},wheelParent);
    make('circle',{cx:x,cy:960,r:204,fill:'none',stroke:'#f88b72','stroke-width':10},wheelParent);
    const spokes = make('g',{},wheelParent);
    for(let i=0;i<10;i++){let a=i*Math.PI/5;make('line',{x1:x,y1:960,x2:x+200*Math.cos(a),y2:960+200*Math.sin(a),stroke:'#b56c4d','stroke-width':2,opacity:.6},spokes);}
    make('circle',{cx:x,cy:960,r:13,fill:'#f47b63'},wheelParent);
    wheels.push({x,spokes});
  }
  const legs = [...root.querySelectorAll('.rider-leg')].map((group,i) => ({
    thigh:make('path',{fill:'none',stroke:i?'#a93f30':'#813025','stroke-width':100,'stroke-linecap':'round'},group),
    shin:make('path',{fill:'none',stroke:i?'#ffa88b':'#ee9376','stroke-width':61,'stroke-linecap':'round'},group),
    sock:make('path',{fill:'none',stroke:'#f7efdf','stroke-width':65,'stroke-linecap':'butt'},group),
    shoe:make('path',{fill:'none',stroke:'#f7795f','stroke-width':43,'stroke-linecap':'round'},group)
  }));
  function pedal(phase){
    wheels.forEach(({x,spokes})=>spokes.setAttribute('transform',`rotate(${phase*180/Math.PI} ${x} 960)`));
    legs.forEach((leg,i)=>{
      const a=phase+i*Math.PI;
      const hip={x:805+(i?9:-9),y:510};
      const foot={x:710+95*Math.cos(a),y:987+95*Math.sin(a)};
      const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy);
      const along=d/2,perp=Math.sqrt(Math.max(0,310*310-along*along));
      const knee={x:hip.x+dx*.5-dy/d*perp,y:hip.y+dy*.5+dx/d*perp};
      const short={x:mix(hip.x,knee.x,.5),y:mix(hip.y,knee.y,.5)};
      const ankle={x:mix(knee.x,foot.x,.84),y:mix(knee.y,foot.y,.84)};
      leg.thigh.setAttribute('d',`M${hip.x} ${hip.y}L${short.x} ${short.y}`);
      leg.shin.setAttribute('d',`M${short.x} ${short.y}L${knee.x} ${knee.y}L${foot.x} ${foot.y}`);
      leg.sock.setAttribute('d',`M${ankle.x} ${ankle.y}L${foot.x} ${foot.y}`);
      leg.shoe.setAttribute('d',`M${foot.x-45} ${foot.y+15}L${foot.x+26} ${foot.y-3}`);
    });
  }
  let w=0,h=0,dpr=1;
  function resize(){w=stage.clientWidth;h=stage.clientHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  new ResizeObserver(resize).observe(stage);resize();
  let paused=false,visible=false,raf=0,last=0,time=0,progress=0;
  root.querySelector('.journey-controls a').addEventListener('click',()=>{progress=1;});
  pause.addEventListener('click',()=>{paused=!paused;root.classList.toggle('is-paused',paused);pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'繼續騎行動畫':'暫停騎行動畫';});
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function road(p,t){
    ctx.clearRect(0,0,w,h);
    const emerge=smooth(range(p,.32,.37));
    const turn=smooth(range(p,.61,.72));
    if(!emerge)return;
    ctx.globalAlpha=emerge;
    const mapAway=smooth(range(p,.32,.38));
    ctx.fillStyle=`rgba(245,237,221,${mapAway})`;ctx.fillRect(0,0,w,h);
    if(turn<1){
      ctx.globalAlpha=emerge*(1-turn);
      const y=h*.70;ctx.fillStyle='#ef775c';ctx.fillRect(0,y,w,h*.14);
      ctx.fillStyle='#fff3df';for(let i=-1;i<9;i++)ctx.fillRect(((i*180-t*90)%(w+180)+(w+180))%(w+180)-180,y+h*.07,85,3);
    }
    ctx.globalAlpha=turn;
    const grow=smooth(range(p,.70,.81));
    const horizon=mix(h*.43,h*.28,grow),half=mix(w*.15,w*.79,grow),tip=9;
    const depth=z=>({y:horizon+(h-horizon)*z*z,half:tip+(half-tip)*z*z});
    const quad=(a,b,c)=>{let u=depth(a),v=depth(b);polygon([[w/2-u.half,u.y],[w/2+u.half,u.y],[w/2+v.half,v.y],[w/2-v.half,v.y]],c);};
    quad(0,1,'#ef755a');
    const broken=smooth(range(p,.76,.87));
    // One shared world coordinate: gaps and lane markings move at identical speed.
    const travel=t*.16, period=.95, whiteLength=.32;
    const isWhite=z=>broken>.02 && ((z+travel)%period+period)%period<whiteLength;
    const whites=[];
    if(broken>0){
      ctx.globalAlpha=turn*broken;
      const start=Math.floor(travel/period)-1;
      for(let k=start;k<start+4;k++){
        const a=k*period-travel,b=a+whiteLength;
        if(b>0&&a<1){whites.push([a,b]);quad(Math.max(0,a),Math.min(1,b),'#fff8ec');}
      }
    }
    ctx.globalAlpha=turn;
    // Equal lengths and gaps in road space, projected as polygons, not screen rectangles.
    const spacing=.21,dashLength=.105,first=Math.floor(travel/spacing)-1;
    for(let k=first;k<first+10;k++){
      let a=k*spacing-travel,b=a+dashLength;
      if(b<=0||a>=1)continue;
      let pieces=[[Math.max(.015,a),Math.min(1,b)]];
      for(const [u,v] of whites)pieces=pieces.flatMap(([x,y])=>y<=u||x>=v?[[x,y]]:[[x,Math.min(y,u)],[Math.max(x,v),y]].filter(([l,r])=>r>l));
      for(const [x,y] of pieces){const u=depth(x),v=depth(y),wa=Math.max(1.5,u.half*.045),wb=Math.max(1.5,v.half*.045);polygon([[w/2-wa,u.y],[w/2+wa,u.y],[w/2+wb,v.y],[w/2-wb,v.y]],'#fff9ee');}
    }
    // Flat-topped cylindrical bollards stand at the entrance of each pedestrian section.
    for(const [a,b] of whites){const z=b;if(z>.03&&z<1){const q=depth(z);for(const f of [-.72,.72]){const x=w/2+q.half*f,r=Math.max(4,22*z),bh=Math.max(12,125*z);ctx.fillStyle='#8f9290';ctx.fillRect(x-r,q.y-bh,r*2,bh);ctx.fillStyle='#a9ada8';ctx.beginPath();ctx.ellipse(x,q.y-bh,r,r*.32,0,0,Math.PI*2);ctx.fill();}}}
    root.dataset.walking=(broken>.8&&isWhite(.408))?'true':'false';
    ctx.globalAlpha=1;
  }
  function render(now){
    raf=0;if(!visible||reduced.matches){last=0;return;}
    const delta=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused)time+=delta;
    const rect=root.getBoundingClientRect();
    const target=clamp(-rect.top/Math.max(1,track.offsetHeight-h));
    progress+= (target-progress)*.16;if(Math.abs(target-progress)<.00005)progress=target;
    const p=progress;
    // Before the stage pins, the map resolves gently out of the article's white paper.
    const entrance=smooth(clamp(1-rect.top/Math.max(1,h*.85)));
    hk.firstElementChild.style.filter=`blur(${((1-entrance)*5).toFixed(2)}px)`;
    root.dataset.progress=p.toFixed(3);
    const zoom=smooth(range(p,0,.26));
    hk.style.opacity=1-smooth(range(p,.26,.38));
    hk.firstElementChild.style.transform=`scale(${mix(1,1.35,zoom)})`;
    for(const [selector,alpha] of [
      ['.journey-copy--map',smooth(range(p,.025,.075))*(1-smooth(range(p,.26,.32)))],
      ['.journey-copy--side',smooth(range(p,.39,.43))*(1-smooth(range(p,.60,.65)))],
      ['.journey-copy--front',smooth(range(p,.84,.90))]
    ]){const el=root.querySelector(selector);el.style.opacity=alpha;el.style.visibility=alpha>.005?'visible':'hidden';el.style.pointerEvents=alpha>.8?'auto':'none';}
    const sideIn=smooth(range(p,.32,.38)),sideOut=1-smooth(range(p,.61,.66));
    side.style.opacity=sideIn*sideOut;
    side.style.left=`${mix(-20,w<700?70:79,smooth(range(p,.33,.41)))}%`;
    side.style.top=`${mix(67,70,smooth(range(p,.36,.5)))}%`;
    const scale=mix(.48,1.12,smooth(range(p,.33,.48)));
    side.style.transform=`translate(-50%,-100%) scale(${-scale},${scale}) translateY(${Math.sin(time*9)*1.5}px)`;
    pedal(-time*5.3);
    const forward=smooth(range(p,.70,.81));
    rear.style.opacity=smooth(range(p,.64,.70));
    rear.style.top=`${mix(64,40,forward)}%`;
    rear.style.transform=`translate(-50%,-100%) scale(${mix(.93,.29,forward)})`;
    road(p,time);
    const walking=root.dataset.walking==='true';root.querySelector('.journey-walker').style.opacity=walking?'1':'0';
    if(walking)rear.style.opacity='0';
    const walker=root.querySelector('.journey-walker');
    walker.style.top=rear.style.top;
    walker.style.transform=`translate(-50%,-100%) scale(${mix(.93,.29,forward)})`;
    const phase=time*5;
    for(const [i,id] of ['a','b'].entries()){
      const wave=Math.sin(phase+i*Math.PI),lift=Math.max(0,Math.cos(phase+i*Math.PI));
      const x= i?195:159,y=698+wave*13-lift*20,kneeY=535+wave*18;
      root.querySelector('#walk-leg-'+id).setAttribute('d',`M${x} 396 Q${x+wave*12} ${kneeY} ${x+wave*10} ${y}`);
      root.querySelector('#walk-shoe-'+id).setAttribute('d',`M${x+wave*10-4} ${y}l16 3`);
    }
    root.querySelector('#walk-body').setAttribute('transform',`translate(0 ${Math.cos(phase*2)*2})`);


    root.querySelector('.journey-scroll-cue').style.opacity=1-range(p,.03,.12);
    bar.style.transform=`scaleX(${p})`;
    raf=requestAnimationFrame(render);
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!raf)raf=requestAnimationFrame(render);else if(!visible){cancelAnimationFrame(raf);raf=0;last=0;}},{rootMargin:'100px'});observer.observe(root);
  reduced.addEventListener('change',()=>{if(!reduced.matches&&!raf)raf=requestAnimationFrame(render);});
})();
