import assert from 'node:assert/strict';
import {createTouchControls,stickVector} from '../dist/touch-controls.js';

// DOM stand-ins let us exercise simultaneous independent pointers and cancellation.
class Control extends EventTarget {
  constructor(move){
    super();this.dataset={move};this.style={};this.captures=new Set();this.classes=new Set();
    this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c),add:c=>this.classes.add(c),remove:c=>this.classes.delete(c)};
  }
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);this.emit('lostpointercapture',{pointerId:id});}
  emit(type,props={}){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerType:'touch',button:0,...props});this.dispatchEvent(event);}
}
const buttons=['forward','back','left','right'].map(d=>new Control(d));
const [forward,,left]=buttons,pad=new Control(),thumb=new Control();
let enabled=true,starts=0,steps=0;
const controls=createTouchControls({buttons,pad,thumb,enabled:()=>enabled,onStart:()=>starts++,onStep:()=>steps++,onLookStep:()=>{}});

forward.emit('pointerdown',{pointerId:1});
pad.emit('pointerdown',{pointerId:2,clientX:82,clientY:50});
assert(controls.directions.has('forward'));
assert.equal(controls.look().x,1,'second thumb turns while movement remains held');
pad.emit('pointermove',{pointerId:1,clientX:18,clientY:50});
pad.emit('pointerup',{pointerId:1});
assert.equal(controls.look().x,1,'unrelated pointer cannot move or release the stick');
pad.emit('pointerup',{pointerId:2});
assert.deepEqual(controls.look(),{x:0,y:0});
assert(controls.directions.has('forward'),'releasing look must not stop movement');

forward.emit('pointerdown',{pointerId:3});
forward.emit('pointerup',{pointerId:1});
assert(controls.directions.has('forward'),'second contact keeps a movement button held');
forward.emit('pointercancel',{pointerId:3});
assert.equal(controls.directions.size,0,'cancelled movement cannot get stuck');

left.emit('pointerdown',{pointerId:4});
pad.emit('pointerdown',{pointerId:5,clientX:50,clientY:18});
controls.reset();
assert.equal(controls.directions.size,0);
assert.deepEqual(controls.look(),{x:0,y:0});
assert(!left.hasPointerCapture(4)&&!pad.hasPointerCapture(5));
assert.equal(thumb.style.transform,'translate(0px, 0px)');

const oldStarts=starts,oldSteps=steps;enabled=false;
forward.emit('pointerdown',{pointerId:6});
pad.emit('pointerdown',{pointerId:7,clientX:82,clientY:50});
assert.equal(starts,oldStarts);assert.equal(steps,oldSteps);
assert.equal(controls.directions.size,0);assert.deepEqual(controls.look(),{x:0,y:0});
assert.deepEqual(stickVector(2,2,32),{x:0,y:0,thumbX:2,thumbY:2});
const diagonal=stickVector(100,100,32);
assert(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-10,'diagonals stay bounded');
assert(Math.abs(Math.hypot(diagonal.thumbX,diagonal.thumbY)-32)<1e-10);
console.log('Touch controls: simultaneous pointers, release, cancellation, reset, dead zone and bounds passed.');
