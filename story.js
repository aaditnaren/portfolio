(() => {
  'use strict';
  const canvas=document.querySelector('#story'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const TAU=Math.PI*2,sections=[...document.querySelectorAll('main section')];
  const contact=document.querySelector('#contact'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const seed=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
  let w=0,h=0,mobile=false,total=0,textCount=0,graphicCount=0,scenes=[],particles=[],stops=[];
  let time=0,last=0,frame=0,dirty=true,resizeFrame=0;
  let textLayers=[],settledText=-1;
  let overlapLayer,overlapInk,overlapGlow,heroLowerTop=0;
  const pointer={x:-9999,y:-9999};
  const chapter=Array(8).fill(1);
  let aimX=0,aimY=0,proximity=0;
  let activeChapter=-1,chapterStarted=0;
  const titles=[['Intelligence','with intention.'],['First,','understand.'],['Then,','orchestrate.'],['Make complexity','legible.'],['Let knowledge','connect.'],['Imagine.','Then make.'],['Build beyond','yourself.'],['What could','we build?']];
  const copy=[['DATA SCIENTIST · INTELLIGENCE ARCHITECT'],['Turn complex data into understanding.','Medical AI. Conversations. Context.'],['Build agents that understand a request','and carry it through to action.'],['Classify products. Generate descriptions.','Audit data at catalog scale.','125,000 products classified.'],['Connect knowledge across your business.','Build answers grounded in your data.'],['Create product imagery with AI.','Build interactive worlds people can use.'],['Mentor teams. Build shared tools.','Make good engineering a shared practice.'],['Bring a difficult question.','Let’s give it form.']];
  const labels=['','01 / DATA & UNDERSTANDING','02 / AGENTIC AUTOMATION','03 / CATALOG INTELLIGENCE','04 / ENTERPRISE AI','05 / GENERATIVE & SPATIAL AI','06 / ENGINEERING LEADERSHIP','07 / YOUR NEXT QUESTION'];
  function sampleText(lines) {
    const off=document.createElement('canvas');off.width=Math.ceil(w);off.height=Math.ceil(h);
    const c=off.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
    for(const line of lines){
      let size=line.size;c.font=`${line.italic?'italic ':''}${line.weight||500} ${size}px ${line.family||'Manrope, Arial'}`;
      c.letterSpacing=`${size*(line.tracking||0)}px`;
      const max=w*(mobile?.88:.82),measure=c.measureText(line.text).width;
      if(measure>max){size*=max/measure;c.font=`${line.italic?'italic ':''}${line.weight||500} ${size}px ${line.family||'Manrope, Arial'}`;c.letterSpacing=`${size*(line.tracking||0)}px`;}
      c.fillText(line.text,w/2,line.y);
    }
    const data=c.getImageData(0,0,off.width,off.height).data,points=[];
    // Keep every occupied pixel. Capping and randomly thinning the old sample
    // erased strokes, especially in small captions and italic letters.
    const step=1;
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
      const alpha=data[(Math.floor(y)*off.width+Math.floor(x))*4+3];
      if(alpha>12)points.push({x,y,a:alpha/255,r:.55,active:1});
    }
    // Deterministic ordering lets each letter emerge as a cloud, not a scanline.
    points.sort((a,b)=>seed(a.x+a.y*31)-seed(b.x+b.y*31));
    return points;
  }
  function build() {
    w=innerWidth;h=innerHeight;mobile=w<700;graphicCount=mobile?3600:6000;settledText=-1;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    overlapLayer=document.createElement('canvas');overlapLayer.width=Math.ceil(w);overlapLayer.height=Math.ceil(h);
    overlapInk=overlapLayer.getContext('2d');
    overlapGlow=document.createElement('canvas');overlapGlow.width=overlapGlow.height=32;
    const glow=overlapGlow.getContext('2d'),gradient=glow.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'rgba(244,242,235,.22)');gradient.addColorStop(.4,'rgba(244,242,235,.14)');gradient.addColorStop(1,'rgba(244,242,235,0)');
    glow.fillStyle=gradient;glow.fillRect(0,0,32,32);
    stops=sections.map(s=>s.offsetTop);
    scenes=titles.map((title,s)=>{
      const hero=s===0,size=hero?Math.min(w*(mobile?.105:.073),102,h*.12):Math.min(w*(mobile?.097:.058),80,h*.10);
      const firstY=hero?h*.44:h*.23;
      if(hero)heroLowerTop=firstY+size*.58;
      const lines=[{text:title[0],y:firstY,size,weight:500,tracking:-.066},{text:title[1],y:firstY+size*1.12,size,family:'Georgia',weight:400,italic:true,tracking:-.055}];
      if(labels[s])lines.push({text:labels[s],y:h*.17,size:mobile?10:12,weight:600});
      const copyY=hero?h*.76:h*.79,bodySize=mobile?13:16;
      copy[s].forEach((text,i)=>lines.push({text,y:copyY+i*(mobile?22:27),size:hero?(mobile?9:11):bodySize,family:'DM Sans, Arial'}));
      if(hero)lines.push({text:'SCROLL TO GIVE THE STORY FORM',y:h*.91,size:mobile?10:11});
      if(s===1)lines.push({text:'MACHINE LEARNING / MEDICAL IMAGING / NLP',y:h*.88,size:mobile?10:12});
      if(s===2)lines.push({text:'7+ SCENARIOS  ·  30%+ LESS MANUAL TRIAGE',y:h*.88,size:mobile?9:11,weight:600});
      if(s===7){lines.splice(2);lines.push({text:'Bring a difficult question. Let’s give it form.',y:h*.65,size:mobile?12:16,family:'DM Sans, Arial'},{text:'aaditnaren@gmail.com',y:h*.745,size:mobile?19:24,family:'DM Sans, Arial'});}
      return sampleText(lines);
    });
    textCount=Math.max(...scenes.map(points=>points.length));total=textCount+graphicCount;
    textLayers=scenes.map(points=>{
      const layer=document.createElement('canvas');layer.width=Math.ceil(w);layer.height=Math.ceil(h);
      const ink=layer.getContext('2d');ink.fillStyle='#282a29';
      for(const p of points){ink.globalAlpha=p.a;ink.fillRect(p.x,p.y,1,1);}
      // Cache the assembled particles, not a separate text overlay. The same
      // pixel particles separate again when the scroll leaves this formation.
      while(points.length<textCount)points.push({x:w/2,y:h/2,a:0,r:.55,active:0});
      return layer;
    });
    particles=Array.from({length:total},(_,i)=>{
      const p=i<textCount?scenes[0][i]:shape(0,i-textCount,0);
      return {x:p.x,y:p.y,vx:0,vy:0};
    });dirty=true;start();
  }
  function point(x,y,a=.65,r=.9,depth=0){return {x,y,a,r,depth,active:1}}
  function shape(s,i,t) {
    const p=formationShape(s,i,t);
    // Give each sculpture the stage: wide on desktop, contained on phones.
    if(s>0&&s<7){
      p.x=w/2+(p.x-w/2)*(mobile?1:1.55);
      p.y=h*.565+(p.y-h*.565)*1.12;
      p.r*=1.15;
    }
    return p;
  }
  function formationShape(s,i,t) {
    const u=i/graphicCount,phase=seed(i)*TAU,cx=w/2,cy=h*.565;
    const scale=Math.min(w*(mobile?.34:.25),h*.22),small=mobile?.75:1;
    if(s===0){
      const ring=i%2,angle=Math.floor(i/2)/(graphicCount/2)*TAU+t*(ring?-.12:.12),tube=seed(i+89)*TAU;
      const radius=Math.min(w*(mobile?.47:.43),h*.66)*(1+Math.cos(tube)*.045);
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.24+Math.sin(tube)*radius*.045;
      const tilt=(ring?.30:-.30)+Math.sin(t*.13)*.035,depth=Math.sin(angle);
      return point(cx+x*Math.cos(tilt)-y*Math.sin(tilt),h*.49+x*Math.sin(tilt)+y*Math.cos(tilt),.25+(depth+1)*.22,(.6+(depth+1)*.18)*small,depth);
    }
    if(s===1){
      // A double helix feeds a heartbeat: research becoming human context.
      if(u<.64){const q=u/.64,x=(q-.5)*scale*2.6,angle=q*TAU*2+t*.65+(i%2)*Math.PI;const rung=i%5===0;return point(cx+x,cy+Math.sin(angle)*scale*.36*(rung?seed(i+13)*2-1:1),rung?.18:.3+(Math.cos(angle)+1)*.25,.85*small);}
      const q=(u-.64)/.36,x=(q-.5)*scale*2.6,pulse=((q-t*.13)%1+1)%1;
      const y=-Math.exp(-(((pulse-.46)/.018)**2))*scale*.46+Math.exp(-(((pulse-.50)/.025)**2))*scale*.24;
      return point(cx+x,cy+y,.65,small);
    }
    if(s===2){
      // Five streams weave into one precise cable, then fan into sorted lanes.
      const lane=i%5,q=Math.floor(i/5)/Math.ceil(graphicCount/5),flow=(q+t*.065)%1;
      const x=(flow-.5)*scale*2.6,join=Math.sin(flow*Math.PI)**2;
      const angle=flow*TAU*2.5+t*.7+lane*TAU/5;
      const envelope=scale*(.08+join*.35),tube=(seed(i+9)-.5)*scale*.035;
      const y=mix((lane-2)*scale*.16,Math.sin(angle)*envelope,join)+tube;
      const z=Math.cos(angle),light=(z+1)/2;
      return point(cx+x,cy+y,.28+light*.6,small*(.7+light*.7));
    }
    if(s===3){
      const n=17,cell=Math.floor(u*n*n*n),ix=cell%n,iy=Math.floor(cell/n)%n,iz=Math.floor(cell/n/n)%n;
      const x=(ix/(n-1)-.5)*scale*1.35,y=(iy/(n-1)-.5)*scale*.85,z=(iz/(n-1)-.5)*scale;
      const a=t*.12+.5,xr=x*Math.cos(a)+z*Math.sin(a),zr=-x*Math.sin(a)+z*Math.cos(a);
      const sweep=(Math.sin(t*.65)+1)/2,lit=Math.abs(iy/(n-1)-sweep)<.09;
      const order=smooth(chapter[3]*2.5-seed(i)*.35);
      const cloudX=(seed(i+11)-.5)*scale*2.6+Math.sin(t*.3+phase)*scale*.07;
      const cloudY=(seed(i+71)-.5)*scale*1.2+Math.cos(t*.25+phase)*scale*.07;
      // One anomalous record sits outside the grid until the audit resolves it.
      const anomaly=i%97===0,repair=smooth((chapter[3]-.55)/.3);
      const offset=anomaly?(1-repair)*scale*.32:0;
      return point(cx+mix(cloudX,xr+offset,order),cy+mix(cloudY,y+zr*.32,order),anomaly?.85:lit?.9:.25,small*(anomaly?1.35:lit?1.25:.75));
    }
    if(s===4){
      // A densely woven, breathing sphere. A question sends a visible wave
      // across its surface; the near hemisphere has weight and depth.
      const latitude=Math.acos(1-2*(i+.5)/graphicCount),longitude=i*2.399963+t*.16;
      const wave=Math.sin(latitude*9-t*1.4+longitude*.3);
      const radius=scale*(.62+wave*.055);
      const x=Math.sin(latitude)*Math.cos(longitude)*radius;
      const z=Math.sin(latitude)*Math.sin(longitude)*radius;
      const y=Math.cos(latitude)*radius;
      const near=(z/radius+1)/2,perspective=1+z/(scale*3.5);
      const px=cx+x*perspective,py=cy+y*perspective;
      const distance=Math.hypot(px-pointer.x,py-pointer.y);
      const ripple=proximity*Math.sin(distance*.055-t*4)*Math.exp(-distance/(scale*.8))*scale*.045;
      return point(px+(x/radius)*ripple,py+(y/radius)*ripple,.16+near*.69,small*(.55+near*1.05));
    }
    if(s===5){
      // A rotating architectural room: twelve edges, floor grid and a living surface.
      const verts=[[-1,-.55,-.65],[1,-.55,-.65],[1,.55,-.65],[-1,.55,-.65],[-1,-.55,.65],[1,-.55,.65],[1,.55,.65],[-1,.55,.65]];
      const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      let x,y,z;
      if(u<.64){const edge=edges[i%12],q=seed(i+31),a=verts[edge[0]],b=verts[edge[1]];x=mix(a[0],b[0],q);y=mix(a[1],b[1],q);z=mix(a[2],b[2],q);}
      else if(u<.80){const q=seed(i+10),grid=(i%11)/10;x=i%2?(q-.5)*2:(grid-.5)*2;z=i%2?(grid-.5)*1.3:(q-.5)*1.3;y=.55;}
      else{x=(seed(i+10)-.5)*1.6;z=(seed(i+20)-.5);y=.18+Math.sin(x*3+t)*Math.cos(z*4+t*.7)*.16;}
      const a=.55+Math.sin(t*.18)*.15+aimX*.65,xr=x*Math.cos(a)+z*Math.sin(a),zr=-x*Math.sin(a)+z*Math.cos(a);
      const build=smooth(chapter[5]*2.4),assembledY=mix(.55,y,build);
      return point(cx+xr*scale*.85,cy+(assembledY+zr*(.35+aimY*.22))*scale*.85,u<.64?.65:.32,small*.9);
    }
    if(s===6){
      // Individual strands build a shared span: a bridge woven in depth.
      const lane=i%19,q=seed(i+6),x=(q-.5)*scale*2.5;
      const z=(lane/18-.5)*scale*.5;
      const arch=-Math.sin(q*Math.PI)*scale*.72+scale*.35;
      const deck=scale*.28;
      let y;
      if(i%4===0)y=mix(arch,deck,seed(i+17));
      else y=i%4===1?deck:arch;
      const assembled=chapter[6],loose=(seed(i+44)-.5)*scale;
      const lit=((q-t*.15)%1+1)%1<.12;
      return point(cx+x,cy+mix(loose,y+z*.36,assembled),lit?.85:.35,small*(lit?1.25:.85));
    }
    // An inverted Möbius strip: a broad surface with one negative half-twist.
    // Unwrapped travel carries particles through the seam onto the other side.
    const along=u*TAU+t*.10,across=seed(i+18)*2-1;
    const radius=scale*.64,band=across*scale*.27,twist=-along/2;
    const x=(radius+band*Math.cos(twist))*Math.cos(along);
    const y=(radius+band*Math.cos(twist))*Math.sin(along);
    const z=band*Math.sin(twist);
    const yaw=t*.13+aimX*.45,tilt=.65+Math.sin(t*.18)*.18+aimY*.25;
    const xr=x*Math.cos(yaw)+z*Math.sin(yaw),zr=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const yr=y*Math.cos(tilt)-zr*Math.sin(tilt),depth=y*Math.sin(tilt)+zr*Math.cos(tilt);
    const near=clamp((depth/scale+1)/2),perspective=1+depth/(scale*4);
    const glint=Math.max(0,Math.cos(twist-.8))**5;
    const signal=Math.max(0,Math.cos(along-t*.65))**18;
    return point(cx+xr*perspective*(mobile?1.35:1.8),h*.51+yr*perspective*.52,
      clamp(.18+near*.55+glint*.12+signal*.15),small*(.6+near*.8+signal*.35));

  }
  function selection(scroll) {
    let from=0;while(from<stops.length-1&&scroll>=stops[from+1])from++;
    if(from===stops.length-1)return {from,to:from,p:0};
    const raw=(scroll-stops[from])/(stops[from+1]-stops[from]);
    // The formation holds for the first half of its scroll region. No timer.
    const p=smooth((raw-.48)/.48);return {from,to:p===0?from:from+1,p};
  }
  function draw(now) {
    frame=0;const dt=last?Math.min((now-last)/1000,.04):.016;last=now;
    const reduced=motion.matches;if(!reduced)time+=dt;
    const scene=selection(scrollY);if(reduced&&scene.p>0){scene.from=scene.p<.5?scene.from:scene.to;scene.to=scene.from;scene.p=0;}
    const current=scene.p>.6?scene.to:scene.from;
    if(current!==activeChapter){activeChapter=current;chapterStarted=time;}
    const age=Math.max(0,time-chapterStarted);
    for(let s=0;s<8;s++)chapter[s]=reduced?1:s===current?smooth(age/3.5):0;
    // The object acts while the visitor watches; only departure needs scrolling.
    if(!reduced&&current===3){
      const cycle=age%14;
      chapter[3]=cycle<10?smooth(cycle/4):1-smooth((cycle-10)/4);
    }
    const near=pointer.x>=0&&Math.abs(pointer.x-w/2)<w*.42&&Math.abs(pointer.y-h*.565)<h*.25;
    aimX=mix(aimX,!reduced&&near?clamp((pointer.x-w/2)/(w*.4),-1,1):0,.045);
    aimY=mix(aimY,!reduced&&near?clamp((pointer.y-h*.565)/(h*.25),-1,1):0,.045);
    proximity=mix(proximity,!reduced&&near?1:0,.045);
    ctx.clearRect(0,0,w,h);
    const step=clamp(dt*60,.2,2),decay=Math.pow(.84,step),graphicDots=[],textDots=[];
    const settledIndex=scene.p===0?scene.from:scene.p===1?scene.to:-1;
    const cached=settledIndex>=0&&settledText===settledIndex;
    let textError=0;
    for(let i=cached?textCount:0;i<total;i++){
      const isText=i<textCount,j=i-textCount;
      const a=isText?scenes[scene.from][i]:shape(scene.from,j,time),b=scene.to===scene.from?a:isText?scenes[scene.to][i]:shape(scene.to,j,time);
      const p=scene.p===0?0:smooth((scene.p-seed(i)*.22)/.78),flight=Math.sin(p*Math.PI);
      const bend=Math.sin(time*.55+seed(Math.floor(i/37))*TAU),curl=seed(i+3)*TAU;
      let x=mix(a.x,b.x,p)+flight*(bend*w*.13+Math.sin(curl+time*.6)*45);
      let y=mix(a.y,b.y,p)+flight*(Math.cos(curl+time*.5)*h*.12);
      // One expansion at the knowledge → creation handoff, controlled by
      // scrolling in either direction. Text is excluded from the spectacle.
      if(!isText&&scene.from===4&&scene.to===5&&!reduced){
        const expansion=Math.sin(p*Math.PI)**4;
        x+=(x-w/2)*expansion*1.5;y+=(y-h*.565)*expansion*1.5;
      }
      if(!isText&&!reduced){const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);if(d<85&&d>1){const push=(1-d/85)**2*12;x+=dx/d*push;y+=dy/d*push;}}
      const part=particles[i];
      if(reduced){part.x=x;part.y=y;part.vx=part.vy=0;}else{part.vx=(part.vx+(x-part.x)*.028*step)*decay;part.vy=(part.vy+(y-part.y)*.028*step)*decay;part.x+=part.vx*step;part.y+=part.vy*step;}
      if(isText&&(a.active||b.active))textError=Math.max(textError,Math.abs(part.x-x),Math.abs(part.y-y));
      const alpha=mix(a.a*a.active,b.a*b.active,p)*(1-flight*.35),r=mix(a.r,b.r,p);
      if(alpha<.015)continue;
      const dot={x:part.x,y:part.y,r,a:alpha,text:isText,front:!isText&&(scene.from===0||scene.to===0)&&mix(a.depth||0,b.depth||0,p)>0};
      (isText?textDots:graphicDots).push(dot);
    }
    // Back arc → particle typography → near arc. Difference blending makes
    // the near arc readable across graphite lettering without outlines.
    function ink(dots,front=false){for(const d of dots){ctx.globalAlpha=d.a;ctx.fillStyle=front?'#ccc8c2':'#282a29';if(d.text){ctx.fillRect(d.x,d.y,1,1);}else{ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TAU);ctx.fill();}}}
    ink(graphicDots.filter(d=>!d.front));
    if(settledIndex>=0&&(cached||textError<.12)&&textLayers[settledIndex]){
      ctx.globalAlpha=1;ctx.drawImage(textLayers[settledIndex],0,0);settledText=settledIndex;
    }else{ink(textDots);settledText=-1;}
    // Lift only the lower-line glyphs beneath the foreground ring. A soft
    // mask bridges nearby dots without outlining them or fading the full text.
    if(settledText===0&&overlapInk){
      overlapInk.clearRect(0,0,w,h);
      overlapInk.globalCompositeOperation='source-over';
      // Rings alternate particle indices; skipping every other dot excluded
      // the second ring and left its crossings (including the “w”) untreated.
      for(let i=0;i<graphicDots.length;i++){
        const d=graphicDots[i];
        if(d.front&&d.y>heroLowerTop){const radius=mobile?5:7;overlapInk.drawImage(overlapGlow,d.x-radius,d.y-radius,radius*2,radius*2);}
      }
      overlapInk.globalCompositeOperation='destination-in';overlapInk.drawImage(textLayers[0],0,0);
      ctx.globalAlpha=.8;ctx.drawImage(overlapLayer,0,0);ctx.globalAlpha=1;
    }
    // Fill an ivory backdrop beneath the difference pass, using destination-over
    // so inversion samples the actual page color, not transparent canvas pixels.
    ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#f4f2eb';ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='difference';ink(graphicDots.filter(d=>d.front),true);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    // A particle-only progress constellation on the quiet bottom edge.
    for(let s=0;s<scenes.length;s++){ctx.fillStyle=`rgba(40,42,41,${s===scene.from?.7:.15})`;for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(w/2+(s-3.5)*17+(k%3)*2,h-25+Math.floor(k/3)*2,.65,0,TAU);ctx.fill();}}
    const end=scene.from===7||scene.to===7&&scene.p>.98;contact.classList.toggle('active',end);contact.tabIndex=end?0:-1;
    dirty=false;if(!reduced&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  function start(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw)}
  addEventListener('scroll',()=>{dirty=true;start()},{passive:true});
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(build)});
  addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY},{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-9999});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0}else start()});
  motion.addEventListener('change',()=>{dirty=true;start()});
  build();Promise.all([document.fonts.load('500 80px Manrope'),document.fonts.load('600 12px Manrope'),document.fonts.load('500 16px "DM Sans"')]).then(()=>document.fonts.ready).then(build);
})();
