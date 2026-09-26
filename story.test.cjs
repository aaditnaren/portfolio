const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'story.js'),'utf8');
function harness(width,height){
  let arcs=0;
  const ctx={clearRect(){},fillRect(){},beginPath(){},fill(){},arc(x,y,r){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(r)&&r>=0);arcs++}};
  const contact={classList:{toggle(){}}};
  const box={innerWidth:width,innerHeight:height,scrollY:0,matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener(){},document:{hidden:false,querySelector:s=>s==='#story'?{getContext:()=>ctx}:contact,querySelectorAll:()=>[],addEventListener(){}}};
  const instrumented=source.replace(/build\(\);Promise\.all\([^\n]+/,`w=innerWidth;h=innerHeight;mobile=w<700;total=120;textCount=40;graphicCount=80;stops=Array.from({length:8},(_,i)=>i*h*1.6);scenes=stops.map(()=>Array.from({length:textCount},()=>point(w/2,h/2)));particles=Array.from({length:total},()=>({x:w/2,y:h/2,vx:0,vy:0}));globalThis.api={shape,selection,draw,sampleText,chapter};`);
  vm.runInNewContext(instrumented,box);return {box,api:box.api,arcs:()=>arcs};
}
test('every procedural formation remains finite across mobile, desktop, and animation phases',()=>{
  for(const [w,h] of [[320,568],[390,844],[1440,900],[1920,1080]]){
    const {api}=harness(w,h);
    for(let scene=0;scene<8;scene++)for(let i=0;i<80;i++)for(const time of [0,1,10,100]){
      const p=api.shape(scene,i,time);
      assert.ok([p.x,p.y,p.r,p.a].every(Number.isFinite),`scene ${scene}`);
      assert.ok(p.r>0&&p.a>=0&&p.a<=1);
    }
  }
});
test('text sampling preserves every stroke pixel even beyond the particle budget',()=>{
  const {box,api}=harness(100,100),data=new Uint8ClampedArray(100*100*4);
  for(let i=0;i<200;i++)data[i*4+3]=i%2?128:255;
  box.document.createElement=()=>({getContext:()=>({getImageData:()=>({data}),measureText:()=>({width:40}),fillText(){}})});
  const points=api.sampleText([{text:'intention',size:20,italic:true,family:'Georgia'}]);
  assert.equal(points.length,200);
  assert.equal(new Set(points.map(p=>`${p.x},${p.y}`)).size,200);
  assert.ok(points.every(p=>p.active===1));
  assert.ok(points.some(p=>p.a===128/255));
});
test('scroll holds are spatial, reversible, and end on the invitation',()=>{
  const {api}=harness(1440,900),interval=1440;
  assert.equal(api.selection(interval*.47).p,0);
  assert.ok(api.selection(interval*.75).p>0);
  const before=JSON.stringify(api.selection(interval*2.8));
  api.selection(interval*6.2);
  assert.equal(JSON.stringify(api.selection(interval*2.8)),before);
  assert.equal(api.selection(interval*7).from,7);
  assert.equal(api.selection(interval*7).to,7);
});
test('all scene handoffs render valid canvas operations without a browser',()=>{
  const {box,api,arcs}=harness(390,844);
  for(let i=0;i<=70;i++){box.scrollY=i/10*844*1.6;api.draw(i*16+1);}
  assert.ok(arcs()>1000);
});

test('catalog, architecture, and bridge resolve through reversible assembly stages',()=>{
  const {api}=harness(1440,900);
  for(const scene of [3,5,6]){
    api.chapter[scene]=0;const start=api.shape(scene,43,0);
    api.chapter[scene]=1;const finish=api.shape(scene,43,0);
    assert.ok(Math.hypot(start.x-finish.x,start.y-finish.y)>1);
    api.chapter[scene]=0;const back=api.shape(scene,43,0);
    assert.equal(back.x,start.x);assert.equal(back.y,start.y);
  }
});
