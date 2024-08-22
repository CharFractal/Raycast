const EPS = 1e-6;

const SCREEN_FACTOR = 40
const SCREEN_WIDTH  = 16* SCREEN_FACTOR;
const SCREEN_HEIGHT = 9 * SCREEN_FACTOR;

const NEAR_CLIPPING_PLANE = 0.1;
const FAR_CLIPPING_PLANE = 10.0;
const FOV = Math.PI * 0.5

const PLAYER_STEP_LEN = 0.5;
const PLAYER_SPEED = 2;
const PLAYER_TURNING_SPEED = 0.75
const PLAYER_SIZE = 0.5;

//------------------------------------------------------------TYPES

type Tile = Color | ImageData | HTMLImageElement | null;

//------------------------------------------------------------CLASSES

class Vector2{
  x : number;
  y : number;
  constructor(x : number, y : number){
    this.x = x;
    this.y = y;
  }

  static scalar(value : number): Vector2{
    return new Vector2(value, value);
  }
  static angle(angle : number) : Vector2{
    return new Vector2(Math.cos(angle),Math.sin(angle))
  }
  setScalar(scalar : number): this{
    this.x = scalar;
    this.y = scalar;
    return this;
  }

  clone() : Vector2{
    return new Vector2(this.x, this.y);
  }

  add(that : Vector2):this{
    this.x += that.x;
    this.y += that.y;
    return this;
  }
  sub(that : Vector2):this{
    this.x -= that.x;
    this.y -= that.y;
    return this;
  }
  mul(that : Vector2):this{
    this.x *= that.x;
    this.y *= that.y;
    return this;
  }
  div(that : Vector2):this{
    this.x /= that.x;
    this.y /= that.y;
    return this;
  }
  scale(value : number) : Vector2{
    return new Vector2(this.x * value, this.y * value);
  }
  norm() : Vector2{
    const l = this.length();
    if(l === 0) return new Vector2(0,0);
    return new Vector2(this.x/l,this.y/l);
  }

  sqrDistanceTo(that : Vector2): number{
    const dx = that.x - this.x;
    const dy = that.y - this.y;
    return dx*dx +dy*dy;
  }
  sqrLength() : number{
    return (this.x * this.x) + (this.y * this.y);
  }
  length() : number{
    return Math.sqrt((this.x * this.x) + (this.y * this.y));
  }

  lerp(that : Vector2, t : number) : this{
    this.x += (that.x - this.x)*t;
    this.y += (that.y - this.y)*t;
    return this;
  }

  rot90() : this{
    const oldX = this.x;
    this.x = -this.y;
    this.y = oldX;
    return this;
  }
  dot(that: Vector2): number{
    return this.x * that.x + this.y * that.y;
  }

  map(f : (x : number) => number) : Vector2{
    return new Vector2(f(this.x), f(this.y));
  }
}

class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  brightness(factor : number) : Color{
    return new Color(factor * this.r, factor * this.g, factor * this.b, this.a);
  }
  toString(): string {
    return `rgba(${Math.floor(this.r * 255)}, ${Math.floor(this.g * 255)}, ${Math.floor(this.b * 255)}, ${this.a})`;
  }
  static white() : Color{
    return new Color(1,1,1,1);
  }
  static black() : Color{
    return new Color(0,0,0,1);
  }
  static red(): Color {
    return new Color(1, 0, 0, 1);
  }
  static green(): Color {
    return new Color(0, 1, 0, 1);
  }
  static yellow(): Color {
    return new Color(1, 1, 0, 1);
  }
  static blue(): Color {
    return new Color(0, 0, 1, 1);
  }
  static purple(): Color {
    return new Color(0.5, 0, 0.5, 1);
  }
  static cyan(): Color {
    return new Color(0, 1, 1, 1);
  }
}

class Scene{
  walls : Array<Tile>;
  width : number;
  height: number;
  floor1 : Color;
  floor2 : Color;
  sky1   : Color;
  sky2   : Color;
  constructor(walls : Array<Array<Tile>>){
    this.height = walls.length;
    this.width  = Number.MIN_VALUE;
    this.sky1   = new Color(0.09,0.09,0.09,1);
    this.sky2   = new Color(0.25,0,0,1);
    this.floor1 = new Color(1,1,1,1);
    this.floor2 = new Color(1,0,0,1);
    for(let row of walls){
      this.width = Math.max(this.width, row.length);
    }
    this.walls = [];
    for(let row of walls){
      this.walls = this.walls.concat(row);
      for(let i = 0; i < this.width - row.length; ++i){
        this.walls.push(null);
      }
    }
  }
  size() : Vector2{
    return new Vector2(this.width, this.height);
  }
  contains(p : Vector2) : boolean{
    return 0 <= p.x && p.x < this.width && 0 <= p.y && p.y < this.height;
  }
  isWall(p : Vector2): boolean{
    let c = this.getWall(p);
    return c !== null && c !== undefined;
  }
  getWall(p: Vector2): Tile | undefined{
    if(!this.contains(p)) return undefined
    return this.walls[ (Math.floor(p.y) * this.width) + Math.floor(p.x)];
  }
  getFloor(p : Vector2) : Tile | undefined{
    const c = p.map(Math.floor);
    if((c.x + c.y) % 2 == 0){
      return this.floor1;
    }else{
      return this.floor2;
    }
  }
  getSky(p : Vector2) : Tile | undefined{

    const c = p.map(Math.floor);
    if((c.x + c.y) % 2 == 0){
      return this.sky1;
    }else{
      return this.sky2;
    }
  }
}

class Player{
  position : Vector2;
  velocity : Vector2;
  direction: number;
  constructor(position: Vector2, direction: number){
    this.position = position;
    this.velocity = new Vector2(0,0);
    this.direction= direction;
  }
  fovRange(clippingPlane : number) : [Vector2, Vector2]{
    const l =  Math.tan(FOV * 0.5) * clippingPlane;
    // const p = this.position.clone().clone().add(Vector2.angle(this.direction).clone().scale(clippingPlane));

    const p = this.position.clone().add(Vector2.angle(this.direction).scale(clippingPlane));
    const wing = p.clone().sub(this.position).rot90().norm().scale(l);
    const p1 = p.clone().sub(wing);
    const p2 = p.clone().add(wing);

    return [p1,p2];
  }
}


//------------------------------------------------------------FUNCTIONS

function snap(x : number, dx : number) : number{
  if(dx > 0) return Math.ceil(x + Math.sign(dx)*EPS);
  if(dx < 0) return Math.floor(x+ Math.sign(dx)*EPS);
  return x;
}


function distancePointToLine(p1 : Vector2, p2 : Vector2, p3 : Vector2){
  let dy = p2.y - p1.y;
  let dx = p1.x - p2.x;
  let dm = p2.x * p1.y - p1.x * p2.y;

  return Math.abs( ((dy * p3.x) +(dx * p3.y) + dm) / Math.sqrt(dy ** 2 + dx ** 2));
}

function hittingCell(p1 : Vector2, p2 : Vector2): Vector2{
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return new Vector2(
    Math.floor(p2.x + Math.sign(dx)*EPS),
    Math.floor(p2.y + Math.sign(dy)*EPS)
  );
}

function isValidPlayerPos(scene : Scene, newPosition: Vector2) : boolean{
  const corner      = newPosition.clone().sub(Vector2.scalar(PLAYER_SIZE * 0.5));
  for(let  y = 0 ;y < 2; ++y){
    for( let x = 0; x < 2; ++x){
      if(scene.isWall( corner.clone().add(new Vector2(x,y).scale(PLAYER_SIZE)))){
        return false;
      }
    }
  }
  return true;
}

//------------------------------------------------------------RAYSCAST
function rayStep(p1: Vector2, p2: Vector2) : Vector2{

  let next = p2;
  const dx = p2.x-p1.x;
  const dy = p2.y-p1.y;
  if(dx !== 0){
    const m = dy/dx
    const c = p1.y - (m * p1.x);
  {
      const x3 = snap(p2.x,dx);
      const y3 = x3*m + c;
      next = new Vector2(x3,y3);
    }

    if(m !== 0){
      const y3 = snap(p2.y, dy)
      const x3 = (y3 - c)/m;
      const p3t = new Vector2(x3,y3);
      if(p2.sqrDistanceTo(p3t) < p2.sqrDistanceTo(next)){
        next = p3t;
      }
    }
  }else{
    const y3 = snap(p2.y,dy);
    const x3 = p2.x;
    next = new Vector2(x3,y3);
  }
  return next;
}

function castRay(scene : Scene, p1 : Vector2, p2 : Vector2) : Vector2{

  let start = p1;
  while(start.sqrDistanceTo(p1) < (FAR_CLIPPING_PLANE-1) * (FAR_CLIPPING_PLANE-1)){
    const c = hittingCell( p1, p2);
    if(scene.getWall(c) !== undefined && scene.getWall(c) !== null) break;
    const p3 = rayStep(p1,p2);
    p1 = p2;
    p2 = p3;
  }

  return p2;
}
//------------------------------------------------------------IMAGE DATA

async function loadImage(url : string): Promise<HTMLImageElement>{

  const image = new Image();
  image.src = url;
  return new Promise((resolve,reject) => { 

    image.onload = () => resolve(image);
    image.onerror = reject;
  });
}

async function loadImageData(url : string) : Promise<ImageData>{
  const image = await loadImage(url);
  const canvas= new OffscreenCanvas(image.width, image.height);
  const ctx   = canvas.getContext("2d");
  if(ctx === null) throw new Error ("2D canvas is not supported");
  ctx.drawImage(image, 0,0);

  return ctx.getImageData(0,0,image.width, image.height);
}

//------------------------------------------------------------RENDER FUNCTIONS

function renderMinimap(ctx : CanvasRenderingContext2D, player : Player, position : Vector2, size : Vector2, scene : Scene){
  ctx.save();

  const gridSize  = scene.size();

  ctx.translate(position.x, position.y)
  ctx.scale    (size.x/gridSize.x, size.y/gridSize.y);

  ctx.fillStyle = "#181818";
  ctx.fillRect (0,0,gridSize.x, gridSize.y);
  const lineWidth = 0.1
  ctx.lineWidth = lineWidth;

  for(let y = 0; y < gridSize.y; ++y){
    for(let x = 0; x < gridSize.x; ++x){

      const cell = scene.getWall(new Vector2(x,y));
      if(cell instanceof Color){

        ctx.fillStyle = cell.toString();
        ctx.fillRect(x + lineWidth,y + lineWidth,1 - lineWidth,1 - lineWidth);
      }else if(cell instanceof HTMLImageElement){
        ctx.drawImage(cell,x,y,1,1);

      }
    }
  }

  ctx.strokeStyle = "#363636"

  for(let x = 0; x <= gridSize.x; ++x){
    strokeLine(ctx,new Vector2(x,0), new Vector2(x,gridSize.y));
  }

  for(let y = 0; y <= gridSize.y; ++y){
    strokeLine(ctx,new Vector2(0,y), new Vector2(gridSize.x,y));
  }

  // player
  ctx.strokeStyle="red";
  ctx.strokeRect(player.position.x - (PLAYER_SIZE * 0.5),player.position.y - (PLAYER_SIZE * 0.5), PLAYER_SIZE, PLAYER_SIZE);

  const [nearP1,nearP2] = player.fovRange(NEAR_CLIPPING_PLANE);
  const [farP1,farP2] = player.fovRange(FAR_CLIPPING_PLANE);

  const look = Vector2.angle(player.direction);
  const near = player.position.clone().add(look.scale(NEAR_CLIPPING_PLANE));
  const far  = player.position.clone().add(look.scale(FAR_CLIPPING_PLANE));

  ctx.strokeStyle="yellow";
  strokeLine(ctx,near,far);

  ctx.strokeStyle="red";
  strokeLine(ctx, player.position, farP1);
  strokeLine(ctx, player.position, farP2);
  strokeLine(ctx, farP1, farP2);

  ctx.strokeStyle="blue";
  strokeLine(ctx, player.position, nearP1);
  strokeLine(ctx, player.position, nearP2);
  strokeLine(ctx, nearP1, nearP2);

  ctx.restore();
}

function renderSkyToImageData(imageData : ImageData, player : Player, scene : Scene){

  const playerZ =  SCREEN_HEIGHT/2;
  const [p1,p2] = player.fovRange(NEAR_CLIPPING_PLANE);

  for(let y = SCREEN_HEIGHT/2 ; y < SCREEN_HEIGHT; ++y){
    const screenZ = SCREEN_HEIGHT - y -1;
    const smolPerpendicualar  = (playerZ - screenZ) ;
    const smolBase            = p1.clone().sub(player.position).length();
    const hypotenuse          = (smolBase/smolPerpendicualar) * playerZ / NEAR_CLIPPING_PLANE;
    const leftFloorLimit = player.position.clone().add(p1.clone().sub(player.position).norm().scale(hypotenuse)); 
    const rightFloorLimit= player.position.clone().add(p2.clone().sub(player.position).norm().scale(hypotenuse));

    for(let x = 0; x < SCREEN_WIDTH; ++x){
      const floorCoord = leftFloorLimit.clone().lerp(rightFloorLimit, x/SCREEN_WIDTH);
      const tile = scene.getSky(floorCoord);

      if(tile instanceof Color){
        const color = tile.brightness(1/Math.sqrt(player.position.sqrDistanceTo(floorCoord)))
        const dp= (screenZ*SCREEN_WIDTH + x) *4;// destination pixel
        imageData.data[dp + 0] = color.r * 255;
        imageData.data[dp + 1] = color.g * 255;
        imageData.data[dp + 2] = color.b * 255;
        imageData.data[dp + 3] = color.a * 255;
      }
    }
  }
}

function renderFloorToImageData(imageData : ImageData, player : Player, scene : Scene){

  const playerZ =  SCREEN_HEIGHT/2;
  const [p1,p2] = player.fovRange(NEAR_CLIPPING_PLANE);

  for(let y = 0 ; y < SCREEN_HEIGHT/2; ++y){
    const screenZ = SCREEN_HEIGHT - y -1;
    const smolPerpendicualar  = (playerZ - screenZ) ;
    const smolBase            = p1.clone().sub(player.position).length();
    const hypotenuse          = (smolBase/smolPerpendicualar) * playerZ/NEAR_CLIPPING_PLANE;
    const leftFloorLimit = player.position.clone().sub(p1.clone().sub(player.position).norm().scale(hypotenuse)); 
    const rightFloorLimit= player.position.clone().sub(p2.clone().sub(player.position).norm().scale(hypotenuse));

    for(let x = 0; x < SCREEN_WIDTH; ++x){
      const floorCoord = leftFloorLimit.clone().lerp(rightFloorLimit, x/SCREEN_WIDTH);
      const tile = scene.getFloor(floorCoord);

      if(tile instanceof Color){
        const color = tile.brightness(1/Math.sqrt(player.position.sqrDistanceTo(floorCoord)))

        const dp= (screenZ*SCREEN_WIDTH + x) *4;// destination pixel
        imageData.data[dp + 0] = color.r * 255;
        imageData.data[dp + 1] = color.g * 255;
        imageData.data[dp + 2] = color.b * 255;
        imageData.data[dp + 3] = color.a * 255;
      }
    }
  }
}

function renderWallsToImageData(imageData : ImageData, player : Player, scene : Scene){
  const [r1,r2] = player.fovRange(NEAR_CLIPPING_PLANE);
  for(let x = 0; x < SCREEN_WIDTH; ++x){
    const hitPoint = castRay(scene, player.position, r1.clone().lerp(r2, x/SCREEN_WIDTH));
    const cell     = hittingCell(player.position, hitPoint);
    const tile     = scene.getWall(cell);
    const v = hitPoint.clone().sub(player.position);
    const d = Vector2.angle(player.direction)
    const stripHeight = SCREEN_HEIGHT/v.dot(d);

    if(tile instanceof ImageData){
      let u = 0;
      const t = hitPoint.clone().sub(cell);
      if ((Math.abs(t.x) < EPS || Math.abs(t.x - 1) < EPS) && t.y > 0) {
        u = t.y;
      } else {
        u = t.x;
      }
      for (let dy = 0; dy < Math.ceil(stripHeight); ++dy) {
        const tx = Math.floor(u*tile.width);
        const ty = Math.floor(dy/Math.ceil(stripHeight)*tile.height);

        const y = Math.floor((SCREEN_HEIGHT - stripHeight)*0.5) + dy;
        const dp= (y*SCREEN_WIDTH + x) *4;// destination pixel
        imageData.data[dp + 0] = tile.data[(ty*tile.width + tx)*4 + 0]/v.dot(d);
        imageData.data[dp + 1] = tile.data[(ty*tile.width + tx)*4 + 1]/v.dot(d);
        imageData.data[dp + 2] = tile.data[(ty*tile.width + tx)*4 + 2]/v.dot(d);
        imageData.data[dp + 3] = tile.data[(ty*tile.width + tx)*4 + 3];
      }
    }else if(tile instanceof Color){

      const color = tile.brightness(1/v.dot(d))
      for(let dy = 0; dy < Math.ceil(stripHeight); ++dy){
        const y = ((SCREEN_HEIGHT - stripHeight) * 0.5) + dy;
        const dp= (y*SCREEN_WIDTH + x) *4;// destination pixel
        imageData.data[dp + 0] = color.r*255;
        imageData.data[dp + 1] = color.g*255;
        imageData.data[dp + 2] = color.b*255;
        imageData.data[dp + 3] = color.a*255;
      }
    }
  }
}


function renderGameToImageData(ctx : CanvasRenderingContext2D, backCtx : OffscreenCanvasRenderingContext2D, backImageData : ImageData, deltaTime : number,  imageData : ImageData, player : Player, scene : Scene){

  const minimapPosition = new Vector2(0,0);
  const cellSize        = ctx.canvas.width * 0.02;
  const minimapSize     = scene.size().scale((cellSize));


  imageData.data.fill(255);
  renderSkyToImageData(imageData, player, scene);
  renderFloorToImageData(imageData, player, scene);
  renderWallsToImageData(imageData, player, scene);
  ctx.drawImage(backCtx.canvas,0,0,ctx.canvas.width, ctx.canvas.height);

  backCtx.putImageData(backImageData, 0, 0);

  renderMinimap(ctx,player,minimapPosition, minimapSize, scene);

  ctx.font = "bold 48px serif"
  ctx.fillStyle = "red";
  ctx.fillText(`${Math.floor(1/deltaTime)}`,100,100);
}

//------------------------------------------------------------GAME LOOP

(async () => {

  document.body.style.backgroundColor = "#000000";

  const game  = document.getElementById("canvas") as (HTMLCanvasElement | null);
  if(game === null) throw new Error("No canvas with give id found");

  const factor= 80;
  game.width  = 16 * factor;
  game.height = 9 * factor;


  const ctx   = game.getContext("2d");
  if(ctx === null) throw new Error("2D context is not supported");
  ctx.imageSmoothingEnabled = false;


  const backImageData = new ImageData(SCREEN_WIDTH,SCREEN_HEIGHT);
  const backCanvas    = new OffscreenCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
  const backCtx       = backCanvas.getContext("2d");
  if(backCtx === null) throw new Error("2D context is not supported");


  const [wall1,wall2,wall3] = await Promise.all([
    loadImageData("assets/walls/wall1_color.png").catch(() => Color.purple()),
    loadImageData("assets/walls/wall2_color.png").catch(() => Color.purple()),
    loadImageData("assets/walls/wall3_color.png").catch(() => Color.purple())      
  ])


  const scene : Scene =  new Scene(
    [
      [wall1,  null,  wall3, wall1, null ,null,null,wall1],
      [null,  null,  null,  wall2,  null ,null,null,wall1],
      [null,  wall1, wall1, wall1,  null ,null,null,wall1],
      [null,  null,  null,  null,   null ,null,null,wall1],
      [null,  null,  null,  null,   null ,null,null,wall1],
      [null,  null,  wall3, wall2,  null ,null,null,wall1],
      [null,  null,  null,  null,   null ,null,null,wall1],
      [wall1,  null,  null,  null,  null ,null,null,wall1],
    ]);

  const player= new Player(
    scene.size().clone().mul(new Vector2(0.63,0.63)),
    Math.PI * 1.25
  );

  let movingForward = false;
  let movingBackward= false;
  let turningLeft   = false;
  let turningRight  = false;
  let togglePause   = false;

  window.addEventListener("keydown", (e) =>{
    if(!e.repeat){
      switch(e.code){
        case 'KeyW' : movingForward = true; break;
        case 'KeyA' : turningLeft   = true; break;
        case 'KeyS' : movingBackward= true; break;
        case 'KeyD' : turningRight  = true; break;
        case 'KeyP' : togglePause = !togglePause;break;
      }
    }
  })

  window.addEventListener("keyup", (e) =>{
    if(!e.repeat){
      switch(e.code){
        case 'KeyW' : movingForward = false; break;
        case 'KeyA' : turningLeft   = false; break;
        case 'KeyS' : movingBackward= false; break;
        case 'KeyD' : turningRight  = false; break;
      }
    }
  })

  let prevTimestamp = 0;
  const frame = (timestamp : number) => {

    const deltaTime = (timestamp - prevTimestamp)/1000;
    prevTimestamp = timestamp

    player.velocity.setScalar(0);
    let angle = 0.0;

    if(movingForward){
      player.velocity.add(Vector2.angle(player.direction).scale(PLAYER_SPEED));
    }
    if(movingBackward){
      player.velocity.sub(Vector2.angle(player.direction).scale(PLAYER_SPEED));
    }
    if(turningLeft){
      angle   -=  Math.PI * PLAYER_TURNING_SPEED;
    }
    if(turningRight){
      angle   +=  Math.PI * PLAYER_TURNING_SPEED;
    }

    player.direction  = player.direction + (angle * deltaTime);

    const newPositionX = player.position.x + player.velocity.x * deltaTime;
    const newPositionY = player.position.y + player.velocity.y * deltaTime;

    if(isValidPlayerPos(scene, new Vector2(newPositionX,player.position.y))){
      player.position.x = newPositionX;
    }
    if(isValidPlayerPos(scene, new Vector2(player.position.x, newPositionY))){
      player.position.y = newPositionY;
    }

    if(!togglePause){
      // renderGame(ctx, player, scene);
      renderGameToImageData(ctx,backCtx,backImageData ,deltaTime, backImageData, player , scene);
    }else{
      console.log("paused");
    }
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame((timestamp) =>{
    prevTimestamp = timestamp
    window.requestAnimationFrame(frame);
  })

})()

function fillCircle(ctx : CanvasRenderingContext2D, center : Vector2, radius : number){
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function strokeLine(ctx : CanvasRenderingContext2D, p1 : Vector2, p2 : Vector2){
  ctx.beginPath();
  ctx.moveTo(p1.x,p1.y);
  ctx.lineTo(p2.x,p2.y);
  ctx.stroke();
}
