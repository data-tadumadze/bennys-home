import assert from 'node:assert/strict';
import {canStand,moveWithCollision,rooms} from '../dist/navigation.js';
for(const [name,p] of Object.entries(rooms))assert(canStand(p.x,p.d),`${name} spawn is obstructed`);
assert(!canStand(-.2,3),'outside west wall');assert(!canStand(6.4,3),'outside east wall');assert(!canStand(4.1,9),'outside entrance');
assert(!canStand(5.2,5),'bathroom is closed');assert(!canStand(2.7,3.5),'sofa collision');assert(!canStand(3,1.2),'dining table collision');
const stopped=moveWithCollision(3.95,5.62,-4,0);assert(stopped.x>3.4,'long step must not tunnel through partition');
const wall=moveWithCollision(4.27,7.12,3,0);assert(wall.x<4.51,'east wall collision');
const passage=moveWithCollision(4.27,7.12,0,-1.6);assert(Math.abs(passage.d-5.52)<.01,'entrance must connect to studio');
console.log('Navigation checks passed: safe spawns, walls, furniture, large-step collision, entrance connection.');
