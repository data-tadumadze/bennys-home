// Independent pointer ownership lets the two thumbs move and look together.
export function stickVector(dx,dy,radius){
  const distance=Math.hypot(dx,dy),limit=Math.max(1,radius),deadzone=.12;
  if(distance<=limit*deadzone)return {x:0,y:0,thumbX:dx,thumbY:dy};
  const amount=(Math.min(distance/limit,1)-deadzone)/(1-deadzone);
  return {x:dx/distance*amount,y:dy/distance*amount,thumbX:dx/distance*Math.min(distance,limit),thumbY:dy/distance*Math.min(distance,limit)};
}

export function createTouchControls({buttons,pad,thumb,enabled,onStart,onStep,onLookStep}){
  const held=new Map(),keyboard=new Set(),directions=new Set();
  let lookPointer=null,look={x:0,y:0};
  function sync(){
    directions.clear();
    for(const {button} of held.values())directions.add(button.dataset.move);
    for(const button of keyboard)directions.add(button.dataset.move);
    for(const b of buttons)b.classList.toggle('down',directions.has(b.dataset.move));
  }
  for(const button of buttons){
    button.addEventListener('pointerdown',e=>{
      if(!enabled()||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();onStart();held.set(e.pointerId,{button});sync();
      onStep(button.dataset.move,.10);button.setPointerCapture(e.pointerId);
    });
    const release=e=>{if(held.get(e.pointerId)?.button===button){held.delete(e.pointerId);sync();}};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
    button.addEventListener('keydown',e=>{
      if(!enabled()||![' ','Enter'].includes(e.key))return;e.preventDefault();onStart();
      if(!keyboard.has(button))onStep(button.dataset.move,.10);keyboard.add(button);sync();
    });
    button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){keyboard.delete(button);sync();}});
    button.addEventListener('blur',()=>{keyboard.delete(button);sync();});
    button.addEventListener('contextmenu',e=>e.preventDefault());
  }
  function updateLook(e){
    const rect=pad.getBoundingClientRect(),radius=Math.min(rect.width,rect.height)*.32;
    const v=stickVector(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,radius);
    look={x:v.x,y:v.y};thumb.style.transform=`translate(${v.thumbX}px, ${v.thumbY}px)`;
  }
  function releaseLook(){lookPointer=null;look={x:0,y:0};thumb.style.transform='translate(0px, 0px)';pad.classList.remove('active');}
  pad.addEventListener('pointerdown',e=>{
    if(!enabled()||lookPointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();onStart();lookPointer=e.pointerId;pad.setPointerCapture(e.pointerId);pad.classList.add('active');updateLook(e);
  });
  pad.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer){e.preventDefault();updateLook(e);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,e=>{if(e.pointerId===lookPointer)releaseLook();});
  pad.addEventListener('contextmenu',e=>e.preventDefault());
  pad.addEventListener('keydown',e=>{
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!delta||!enabled())return;e.preventDefault();e.stopPropagation();onStart();onLookStep(...delta);
  });
  function reset(){
    const captures=[...held].map(([id,{button}])=>[button,id]);if(lookPointer!==null)captures.push([pad,lookPointer]);
    held.clear();keyboard.clear();sync();releaseLook();
    for(const [element,id] of captures)if(element.hasPointerCapture(id))element.releasePointerCapture(id);
  }
  return {directions,look:()=>look,reset};
}
