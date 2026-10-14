import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { rooms, moveWithCollision } from './navigation.js';
import { createTouchControls } from './touch-controls.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#scene'),scene=new THREE.Scene();scene.background=new THREE.Color('#c3d0cf');
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.045,100);
camera.rotation.order='YXZ';let renderer,ready=false,walking=false,drag=null,eyeHeight=1.65,pace=1.25;
const keys=new Set(),mats=new Map();
const touchLayout=matchMedia('(max-width: 800px), (pointer: coarse), (max-width: 1000px) and (max-height: 600px)');
let lookSensitivity=.40;
function fail(error){$('#loader').hidden=true;$('#error').hidden=false;$('#error-message').textContent='The 3D view needs a browser with WebGL support. '+(error?.message||'Please reload and try again.');console.error(error);}
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
}catch(e){fail(e);throw e;}
const controls=new PointerLockControls(camera,canvas);controls.pointerSpeed=.7;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI-.22;
scene.add(new THREE.HemisphereLight(0xf5f1dc,0x7d8472,1.65));
const sun=new THREE.DirectionalLight(0xffdfad,3.0);sun.position.set(-3,5,6);sun.target.position.set(3,0,-3);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:9,bottom:-6,near:.5,far:30});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
scene.add(sun,sun.target);
const fill=new THREE.PointLight(0xffe4bf,14,13,2);fill.position.set(3.3,2.4,-3);scene.add(fill);
const entryLight=new THREE.PointLight(0xffd19b,6,6,2);entryLight.position.set(4.15,2.35,-7.3);scene.add(entryLight);
const kitchenLight=new THREE.PointLight(0xffdb99,3,3,2);kitchenLight.position.set(5.65,1.65,-3.2);scene.add(kitchenLight);

// Distant sky and gentle silhouettes provide depth beyond the balcony.
const landscape=new THREE.Group();scene.add(landscape);
for(let i=0;i<17;i++){
  const h=1.2+Math.sin(i*2.7)*.5;
  const b=new THREE.Mesh(new THREE.BoxGeometry(.9,h,.8),new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(.14,.08,.43+(i%4)*.045)}));
  b.position.set(-8+i*1.3,-.25-h/2,9+(i%3));landscape.add(b);
}

let randomSeed=41;function rand(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  if(kind==='wood'){
    ctx.fillStyle='#b08a5e';ctx.fillRect(0,0,512,512);
    const unit=32,length=128;
    for(let row=-8;row<20;row++)for(let col=-8;col<20;col++){
      let x=(col*5+row)*unit,y=(row*5-col)*unit;
      for(let axis=0;axis<2;axis++){
        const bx=x+(axis?length:0),by=y,ww=axis?unit:length,hh=axis?length:unit;
        const light=48+rand()*13;ctx.fillStyle=`hsl(33 30% ${light}%)`;ctx.fillRect(bx,by,ww-1,hh-1);
        for(let j=0;j<9;j++){ctx.strokeStyle=`rgba(70,44,20,${.035+rand()*.05})`;ctx.beginPath();const q=rand();ctx.moveTo(bx+(axis?q*ww:2),by+(axis?2:q*hh));ctx.lineTo(bx+(axis?q*ww:ww-2),by+(axis?hh-2:q*hh));ctx.stroke();}
      }
    }
  }else if(kind==='tile'){
    ctx.fillStyle='#aaa18b';ctx.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=256)for(let x=0;x<512;x+=256){ctx.fillStyle=`hsl(40 13% ${65+rand()*5}%)`;ctx.fillRect(x+1,y+1,254,254);}
    for(let i=0;i<12000;i++){ctx.fillStyle=rand()>.5?'#ffffff08':'#33221108';ctx.fillRect(rand()*512,rand()*512,1,1);}
  }else if(kind==='grain'){
    ctx.fillStyle='#d7bd96';ctx.fillRect(0,0,512,512);
    for(let i=0;i<500;i++){const x=rand()*512;ctx.strokeStyle=`rgba(79,48,16,${rand()*.09})`;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+10,180,x-12,320,x,512);ctx.stroke();}
  }else{
    ctx.fillStyle='#b8b4a4';ctx.fillRect(0,0,512,512);for(let i=0;i<512;i+=4){ctx.fillStyle=i%8?'#77756444':'#ffffff55';ctx.fillRect(i,0,1,512);ctx.fillRect(0,i,512,1);}
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const wood=texture('wood'),tile=texture('tile'),grain=texture('grain'),rug=texture('rug');
const loader=new GLTFLoader();
loader.load('./assets/home.glb',gltf=>{
  const home=gltf.scene;
  home.traverse(o=>{
    if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
    const m=o.material;mats.set(m.name,m);
    // Projection in world metres keeps the small shared textures consistent after batching.
    if(['Floor_Wood','Oak','OakLight','Walnut','Rug'].includes(m.name)){
      o.updateWorldMatrix(true,false);const pos=o.geometry.attributes.position,uv=new Float32Array(pos.count*2),p=new THREE.Vector3();
      const floor=m.name==='Floor_Wood'||m.name==='Rug';
      for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);uv[i*2]=(floor?p.x:p.x+p.z)*.65;uv[i*2+1]=(floor?p.z:p.y)*.65;}
      o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      if(m.name==='Floor_Wood'){m.map=wood;m.color.set('#dfc7a7');}
      else if(m.name==='Rug'){m.map=rug;m.color.set('#cfcbc1');}
      else {m.map=grain;m.color.multiplyScalar(1.2);}
    }
    if(m.name==='Mirror'){m.metalness=.45;m.roughness=.25;}
    if(m.name==='Ceiling'){o.castShadow=false;}
    m.needsUpdate=true;
  });
  scene.add(home);ready=true;$('#loader').hidden=true;$('#touch-start').disabled=false;teleport('living',false);updateMap();
},e=>{$('#load-progress').textContent=e.total?`Loading the space · ${Math.round(e.loaded/e.total*100)}%`:'Loading the space…';},fail);

function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3200);}
function begin(){if(!ready)return;walking=true;document.body.classList.add('walking');$('#resume').hidden=controls.isLocked||touchLayout.matches;}
async function lock(){if(!ready)return;begin();if(touchLayout.matches)return;try{await canvas.requestPointerLock();}catch(e){toast('Drag the view to look around. The movement buttons and WASD still work.');}}
$('#start').onclick=lock;$('#resume').onclick=lock;
$('#touch-start').onclick=()=>{begin();canvas.focus({preventScroll:true});};
controls.addEventListener('lock',()=>{begin();$('#crosshair').hidden=false;$('#status').textContent='Mouse to look · Esc to pause';$('#resume').hidden=true;$('#settings').hidden=true;$('#settings-toggle').setAttribute('aria-expanded','false');});
controls.addEventListener('unlock',()=>{$('#crosshair').hidden=true;syncControlHints();resetInput();});
document.addEventListener('pointerlockerror',()=>toast('Mouse capture is unavailable here. Drag to look around.'));
function teleport(room,announce=true){
  const p=rooms[room];resetInput();camera.position.set(p.x,eyeHeight,-p.d);camera.lookAt(p.look[0],p.look[1],-p.look[2]);
  $$('.rooms button').forEach(b=>b.classList.toggle('active',b.dataset.room===room));
  if(announce){begin();toast(`Moved to ${room==='living'?'the living room':`the ${room}`}`);}updateMap();
}
$$('[data-room]').forEach(b=>b.onclick=()=>teleport(b.dataset.room));
$('#reset').onclick=()=>{teleport('living');$('#settings').hidden=true;$('#settings-toggle').setAttribute('aria-expanded','false');};
const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
function codeFor(e){return e.code||({w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD'}[e.key?.toLowerCase()]||e.key);}
function step(forward,right,distance){const yaw=camera.rotation.y,p=moveWithCollision(camera.position.x,-camera.position.z,(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*distance,(Math.cos(yaw)*forward+Math.sin(yaw)*right)*distance);camera.position.x=p.x;camera.position.z=-p.d;}
const directions={KeyW:[1,0],ArrowUp:[1,0],KeyS:[-1,0],ArrowDown:[-1,0],KeyA:[0,-1],ArrowLeft:[0,-1],KeyD:[0,1],ArrowRight:[0,1],forward:[1,0],back:[-1,0],left:[0,-1],right:[0,1]};
document.addEventListener('keydown',e=>{if(!ready||!$('#settings').hidden||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const code=codeFor(e);if(movementKeys.includes(code)){e.preventDefault();begin();if(!keys.has(code))step(...directions[code],.06);keys.add(code);}});
document.addEventListener('keyup',e=>keys.delete(codeFor(e)));
const touchControls=createTouchControls({
  buttons:$$('[data-move]'),pad:$('#look-pad'),thumb:$('#look-thumb'),
  enabled:()=>ready&&$('#settings').hidden,onStart:begin,
  onStep:(direction,distance)=>step(...directions[direction],distance),
  onLookStep:(x,y)=>turn(x*.12*lookSensitivity,y*.12*lookSensitivity)
});
const buttonKeys=touchControls.directions;
function resetInput(){
  keys.clear();touchControls.reset();
  const id=drag?.id;drag=null;
  if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
}
window.addEventListener('blur',resetInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
function turn(yaw,pitch){camera.rotation.y-=yaw;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-pitch,-1.35,1.35);}
function syncControlHints(){
  document.body.classList.toggle('touch-mode',touchLayout.matches);
  if(touchLayout.matches){$('#minimap').hidden=false;$('#map-toggle').textContent='−';$('#map-toggle').setAttribute('aria-expanded','true');}
  $('#status').textContent=touchLayout.matches?'':'Drag to look around';
  $('#resume').hidden=touchLayout.matches||!walking||controls.isLocked;
}
syncControlHints();touchLayout.addEventListener('change',()=>{resetInput();if(controls.isLocked&&touchLayout.matches)controls.unlock();syncControlHints();});
canvas.addEventListener('pointerdown',e=>{if(!ready||controls.isLocked||drag||!$('#settings').hidden||(e.pointerType==='mouse'&&e.button!==0))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||controls.isLocked)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  const sensitivity=(e.pointerType==='touch'||touchLayout.matches)? .003*lookSensitivity : .003;
  turn(dx*sensitivity,dy*sensitivity);drag={id:e.pointerId,x:e.clientX,y:e.clientY};
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
function setSettings(open){resetInput();if(controls.isLocked)controls.unlock();$('#settings').hidden=!open;$('#settings-toggle').setAttribute('aria-expanded',String(open));}
$('#settings-toggle').onclick=()=>setSettings($('#settings').hidden);$('#settings-close').onclick=()=>setSettings(false);
$('#height').oninput=e=>{eyeHeight=Number(e.target.value);camera.position.y=eyeHeight;$('#height-value').value=`${eyeHeight.toFixed(2)} m`;};
$('#speed').onchange=e=>pace=Number(e.target.value);
$('#look-sensitivity').oninput=e=>{lookSensitivity=Number(e.target.value)/100;$('#sensitivity-value').value=`${e.target.value}%${lookSensitivity<=.4?' · Low':''}`;};
$$('[data-floor]').forEach(b=>b.onclick=()=>{
  const m=mats.get('Floor_Wood');if(!m)return;const isWood=b.dataset.floor==='wood';m.map=isWood?wood:tile;m.color.set(isWood?'#dfc7a7':'#eee9dc');m.roughness=isWood?.68:.75;m.needsUpdate=true;
  $$('[data-floor]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
});
$('#map-toggle').onclick=()=>{const hidden=!$('#minimap').hidden;$('#minimap').hidden=hidden;$('#map-toggle').textContent=hidden?'+':'−';$('#map-toggle').setAttribute('aria-expanded',String(!hidden));};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#home').requestFullscreen();}catch(e){toast('Fullscreen is unavailable in this browser.');}};
function updateMap(){
  const x=camera.position.x,d=-camera.position.z;$('#map-position').setAttribute('transform',`translate(${x} ${d}) rotate(${THREE.MathUtils.radToDeg(camera.rotation.y)})`);
  const room=d>5.87?'Entrance':x>4.3&&d>2?'Kitchen':'Living & dining';$('#room-label').textContent=room;
  if(walking)$$('.rooms button').forEach(b=>b.classList.toggle('active',b.dataset.room===(room==='Entrance'?'entrance':room==='Kitchen'?'kitchen':'living')));
}
let last=performance.now();
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(ready&&!document.hidden){
    const look=touchControls.look();if(look.x||look.y)turn(look.x*lookSensitivity*1.8*dt,look.y*lookSensitivity*1.4*dt);
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')||buttonKeys.has('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||buttonKeys.has('back')?1:0);
    let right=(keys.has('KeyD')||keys.has('ArrowRight')||buttonKeys.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||buttonKeys.has('left')?1:0);
    if(forward||right){const length=Math.hypot(forward,right);forward/=length;right/=length;const yaw=camera.rotation.y;
      const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*pace*dt,dd=(Math.cos(yaw)*forward+Math.sin(yaw)*right)*pace*dt;
      const p=moveWithCollision(camera.position.x,-camera.position.z,dx,dd);camera.position.x=p.x;camera.position.z=-p.d;
    }updateMap();renderer.render(scene,camera);
  }
}
renderer.setAnimationLoop(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('The graphics view paused. Reload the page to restart it.');});
