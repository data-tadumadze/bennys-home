// Coordinates follow the plan: x across the studio, d from the windows inward.
export const rooms={
  living:{x:3.95,d:5.62,look:[2.8,1.25,2.0]},
  kitchen:{x:4.98,d:2.08,look:[5.95,1.30,3.35]},
  entrance:{x:4.27,d:7.12,look:[4.1,1.55,5.3]}
};
const obstacles=[
  [4.66,4.2,6.29,5.87], // bathroom volume
  [3.35,5.87,3.90,8.63], // entry cabinetry
  [3.90,7.68,4.315,8.53], // entry bench
  [0,1.65,.46,5.48], // TV cabinet
  [2.15,2.28,3.21,5.17], // sofa
  [1.40,4.23,2.30,5.10], // chaise
  [1.03,3.125,1.67,4.275], // coffee table
  [.46,1.58,1.25,2.42], // armchair
  [.40,5.12,.83,5.61], // plant
  [1.97,.795,4.35,1.645], // dining table
  ...[2.36,3.16,3.96].flatMap(x=>[[x-.23,.25,x+.23,.70],[x-.23,1.70,x+.23,2.16]]),
  [5.66,1.10,6.29,4.20], // kitchen run
  [4.65,3.62,6.29,4.21], // return
  [4.34,2.595,4.82,4.045], // breakfast bar
  [3.79,2.74,4.19,3.14],[3.79,3.47,4.19,3.87], // stools
  [3.14,5.25,3.30,5.87] // glass partition
];
export function canStand(x,d,r=.17){
  // Circle must remain in the union of the studio and entrance floor polygons.
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,px=x+Math.cos(a)*r,pd=d+Math.sin(a)*r;
    if(!((px>=0&&px<=6.29&&pd>=0&&pd<=5.87)||(px>=3.35&&px<=4.66&&pd>=5.87&&pd<=8.75)))return false;
  }
  return !obstacles.some(([x0,d0,x1,d1])=>{
    const nx=Math.max(x0,Math.min(x,x1)),nd=Math.max(d0,Math.min(d,d1));
    return (x-nx)**2+(d-nd)**2<r*r;
  });
}
export function moveWithCollision(x,d,dx,dd){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dd)/.06));dx/=steps;dd/=steps;
  for(let i=0;i<steps;i++){if(canStand(x+dx,d))x+=dx;if(canStand(x,d+dd))d+=dd;}
  return {x,d};
}
