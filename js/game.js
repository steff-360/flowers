const $=id=>document.getElementById(id);
const screens={menu:$("menu"),game:$("gameScreen"),runner:$("runnerScreen"),victory:$("victory"),over:$("gameOver")};
const scoreEl=$("score"), livesEl=$("lives"), levelEl=$("level"), player=$("player"), items=$("items");
const finalScore=$("finalScore"), overScore=$("overScore"), banner=$("levelBanner");
const progressBar=$("progressBar"), progressLabel=$("progressLabel");
const sceneBackdrop=$("sceneBackdrop");
const soundBtn=$("soundBtn");
const runnerWorld=$("runnerScreen").querySelector(".runner-world"),runnerTrack=$("runnerTrack"),runnerPlayer=$("runnerPlayer"),runnerAvatar=$("runnerAvatar"),runnerItems=$("runnerItems"),runnerScoreEl=$("runnerScore"),runnerFinalScore=$("runnerFinalScore");

let score=0,lives=3,level=1,playerX=50,playing=false,spawnTimer=null,loop=null;
let keys={}, activeItems=new Set();
let runnerPlaying=false,runnerScore=0,runnerSpeed=6,runnerLane=1,runnerLoop=null,runnerSpawnTimer=null,runnerJumpTimer=null,selectedAvatar="pink",runnerScene="city",runnerGender="girl",soundEnabled=true;
let selectedScene="city",selectedCharacter="pink";
let runnerPointerStart=null;
let mainPointerStart=null,mainPointerActive=false;
const runnerLanes=[28,50,72];
const GOOD=["pink","blue","purple","gold"];
const BAD=["🪨","💧","🧊"];
const LEVELS=[
  {goal:500,speed:3.0,spawn:850},
  {goal:1200,speed:3.8,spawn:700},
  {goal:2200,speed:4.7,spawn:570}
];

// This is a local game: do not persist or transmit player data.
window.addEventListener("beforeunload",()=>{
  if(window.audioCtx?.state==="running")window.audioCtx.close();
});

document.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(["arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault()});
document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

$("startBtn").onclick=startGame;
$("againBtn").onclick=startGame;
$("retryBtn").onclick=startGame;
$("menuBtn").onclick=showMenu;
$("overMenuBtn").onclick=showMenu;
$("runnerBtn").onclick=showRunner;
$("runnerPlayBtn").onclick=startRunner;
$("runnerAgainBtn").onclick=startRunner;
$("runnerMenuBtn").onclick=showMenu;
$("runnerEndMenuBtn").onclick=showMenu;
$("runnerLeftBtn").onclick=()=>moveRunner(-1);
$("runnerRightBtn").onclick=()=>moveRunner(1);
$("runnerJumpBtn").onclick=jumpRunner;
$("mainLeftBtn").onclick=()=>moveMainPlayer(-1);
$("mainRightBtn").onclick=()=>moveMainPlayer(1);
document.querySelectorAll("[data-scene]").forEach(option=>option.onclick=()=>selectScene(option.dataset.scene));
document.querySelectorAll("[data-character]").forEach(option=>option.onclick=()=>selectCharacter(option.dataset.character));
document.querySelectorAll(".avatar-option").forEach(option=>option.onclick=()=>selectAvatar(option.dataset.avatar));
document.querySelectorAll("[data-runner-scene]").forEach(option=>option.onclick=()=>selectRunnerScene(option.dataset.runnerScene));
document.querySelectorAll("[data-gender]").forEach(option=>option.onclick=()=>selectGender(option.dataset.gender));
soundBtn.onclick=toggleSound;
$("howBtn").onclick=()=>{
  const howTo=$("howTo"),button=$("howBtn"),isHidden=howTo.classList.toggle("hidden");
  button.setAttribute("aria-expanded",String(!isHidden));
};

function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}

function startGame(){
  stopRunner();
  score=0;lives=3;level=1;playerX=50;playing=true;
  activeItems.forEach(x=>x.remove());activeItems.clear();
  scoreEl.textContent=score;livesEl.textContent=lives;levelEl.textContent=level;updateProgress();
  sceneBackdrop.className="scene-backdrop scene-"+selectedScene;
  player.replaceChildren();
  const playerCotton=document.createElement("span");
  playerCotton.className="cotton-icon cotton-"+selectedCharacter;playerCotton.setAttribute("aria-hidden","true");player.appendChild(playerCotton);
  showScreen("game"); setPlayer();
  playTone(523,.12); setTimeout(()=>playTone(659,.12),120);
  showLevel();
  clearInterval(spawnTimer);cancelAnimationFrame(loop);
  spawnTimer=setInterval(spawnItem,LEVELS[level-1].spawn);
  loop=requestAnimationFrame(update);
}

function showMenu(){playing=false;clearInterval(spawnTimer);cancelAnimationFrame(loop);stopRunner();showScreen("menu")}

function showRunner(){
  playing=false;clearInterval(spawnTimer);cancelAnimationFrame(loop);stopRunner();
  $("runnerStart").classList.remove("hidden");$("runnerEnd").classList.add("hidden");showScreen("runner");
}

function setPlayer(){player.style.left=playerX+"%"}

function selectScene(scene){
  selectedScene=scene;
  document.querySelectorAll("[data-scene]").forEach(option=>{
    const selected=option.dataset.scene===scene;
    option.classList.toggle("selected",selected);option.setAttribute("aria-pressed",String(selected));
  });
}

function selectCharacter(character){
  selectedCharacter=character;
  document.querySelectorAll("[data-character]").forEach(option=>{
    const selected=option.dataset.character===character;
    option.classList.toggle("selected",selected);option.setAttribute("aria-pressed",String(selected));
  });
}

function moveMainPlayer(direction){
  if(!playing)return;
  playerX=Math.max(5,Math.min(95,playerX+direction*8));setPlayer();
}

function moveMainToPointer(clientX){
  if(!playing)return;
  const bounds=$("gameScreen").getBoundingClientRect();
  playerX=Math.max(5,Math.min(95,((clientX-bounds.left)/bounds.width)*100));setPlayer();
}

function update(){
  if(!playing)return;
  if(keys["arrowleft"]||keys["a"])playerX-=0.75;
  if(keys["arrowright"]||keys["d"])playerX+=0.75;
  playerX=Math.max(5,Math.min(95,playerX));setPlayer();

  const pr=player.getBoundingClientRect();
  activeItems.forEach(el=>{
    let y=(parseFloat(el.dataset.y)||-70)+LEVELS[level-1].speed;
    el.dataset.y=y;el.style.top=y+"px";el.style.visibility=y<0?"hidden":"visible";
    const r=el.getBoundingClientRect();
    if(collide(pr,r)){
      collect(el);
    }else if(y>player.parentElement.clientHeight+40){
      el.remove();activeItems.delete(el);
    }
  });
  checkLevel();
  loop=requestAnimationFrame(update);
}

$("gameScreen").addEventListener("pointerdown",event=>{
  if(event.target.closest("button"))return;
  mainPointerActive=true;mainPointerStart={x:event.clientX,y:event.clientY};moveMainToPointer(event.clientX);
  event.currentTarget.setPointerCapture?.(event.pointerId);
});
$("gameScreen").addEventListener("pointermove",event=>{if(mainPointerActive)moveMainToPointer(event.clientX)});
$("gameScreen").addEventListener("pointerup",event=>{
  if(!mainPointerStart||!playing){mainPointerActive=false;return}
  const dx=event.clientX-mainPointerStart.x,dy=event.clientY-mainPointerStart.y;
  if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))moveMainToPointer(event.clientX);
  mainPointerStart=null;mainPointerActive=false;
});
$("gameScreen").addEventListener("pointercancel",()=>{mainPointerStart=null;mainPointerActive=false});

function collide(a,b){
  return a.left<b.right-8&&a.right>b.left+8&&a.top<b.bottom-8&&a.bottom>b.top+8;
}

function spawnItem(){
  if(!playing)return;
  const el=document.createElement("div");
  const good=Math.random()<0.82;
  el.className="item "+(good?"good":"bad");
  if(good){
    const variant=GOOD[Math.floor(Math.random()*GOOD.length)];
    el.dataset.variant=variant;
    const cotton=document.createElement("span");
    cotton.className="cotton-icon cotton-"+variant;cotton.setAttribute("aria-hidden","true");el.appendChild(cotton);
  }else el.textContent=BAD[Math.floor(Math.random()*BAD.length)];
  el.style.left=(4+Math.random()*92)+"%";el.dataset.y="-70";el.style.top="-70px";
  items.appendChild(el);activeItems.add(el);
}

function collect(el){
  const good=el.classList.contains("good");
  const points=good?(el.dataset.variant==="gold"?100:50):-80;
  score=Math.max(0,score+points);scoreEl.textContent=score;updateProgress();
  popText(el,points>0?"+"+points:"-80");
  if(good){playTone(el.dataset.variant==="gold"?880:660,.08)}
  else{lives--;livesEl.textContent=lives;playTone(150,.15);if(lives<=0)return endGame();}
  el.remove();activeItems.delete(el);
}

function popText(el,text){
  const p=document.createElement("div");p.className="pop";p.textContent=text;
  p.style.left=el.style.left;p.style.top=(parseFloat(el.dataset.y)-10)+"px";
  items.appendChild(p);setTimeout(()=>p.remove(),800);
}

function checkLevel(){
  const target=LEVELS[level-1]?.goal;
  if(target&&score>=target){
    if(level<3){level++;levelEl.textContent=level;showLevel();clearInterval(spawnTimer);spawnTimer=setInterval(spawnItem,LEVELS[level-1].spawn)}
    else if(score>=LEVELS[2].goal){victory()}
  }
}

function updateProgress(){
  const target=LEVELS[level-1]?.goal||0;
  const percentage=target?Math.min(100,(score/target)*100):0;
  progressBar.style.width=percentage+"%";
  progressLabel.textContent=score+" / "+target;
}

function showLevel(){
  banner.textContent="NIVEL "+level;banner.classList.remove("show");void banner.offsetWidth;banner.classList.add("show");
  playTone(523,.08);setTimeout(()=>playTone(784,.1),100);
}

function victory(){
  playing=false;clearInterval(spawnTimer);cancelAnimationFrame(loop);
  finalScore.textContent=score;showScreen("victory");playVictory();
}

function endGame(){
  playing=false;clearInterval(spawnTimer);cancelAnimationFrame(loop);
  overScore.textContent=score;showScreen("over");
}

function playTone(freq,duration){
  if(!soundEnabled)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!window.audioCtx)window.audioCtx=new C();
    const ctx=window.audioCtx,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.frequency.value=freq;osc.type="sine";gain.gain.setValueAtTime(.045,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);
  }catch(e){}
}
function playVictory(){[523,659,784,1046].forEach((n,i)=>setTimeout(()=>playTone(n,.18),i*130))}

function toggleSound(){
  soundEnabled=!soundEnabled;soundBtn.textContent=soundEnabled?"♫":"×";
  soundBtn.setAttribute("aria-pressed",String(soundEnabled));soundBtn.setAttribute("aria-label",soundEnabled?"Silenciar sonido":"Activar sonido");
  if(soundEnabled)playTone(660,.08);
}

function startRunner(){
  stopRunner();runnerPlaying=true;runnerScore=0;runnerSpeed=6;runnerScoreEl.textContent="0";
  runnerPlayer.classList.remove("jumping");runnerLane=1;setRunnerLane();
  runnerWorld.dataset.scene=runnerScene;runnerAvatar.dataset.gender=runnerGender;
  runnerWorld.classList.add("running");
  $("runnerStart").classList.add("hidden");$("runnerEnd").classList.add("hidden");showScreen("runner");
  runnerSpawnTimer=setInterval(spawnRunnerItem,720);runnerLoop=requestAnimationFrame(updateRunner);
}

function selectAvatar(avatar){
  selectedAvatar=avatar;runnerAvatar.dataset.avatar=avatar;
  document.querySelectorAll(".avatar-option").forEach(option=>{
    const selected=option.dataset.avatar===avatar;
    option.classList.toggle("selected",selected);option.setAttribute("aria-pressed",String(selected));
  });
}

function selectRunnerScene(scene){
  runnerScene=scene;runnerWorld.dataset.scene=scene;
  document.querySelectorAll("[data-runner-scene]").forEach(option=>{
    const selected=option.dataset.runnerScene===scene;
    option.classList.toggle("selected",selected);option.setAttribute("aria-pressed",String(selected));
  });
}

function selectGender(gender){
  runnerGender=gender;runnerAvatar.dataset.gender=gender;
  document.querySelectorAll("[data-gender]").forEach(option=>{
    const selected=option.dataset.gender===gender;
    option.classList.toggle("selected",selected);option.setAttribute("aria-pressed",String(selected));
  });
}

function setRunnerLane(){runnerPlayer.style.left=runnerLanes[runnerLane]+"%"}

function moveRunner(direction){
  if(!runnerPlaying)return;
  runnerLane=Math.max(0,Math.min(2,runnerLane+direction));setRunnerLane();playTone(260,.045);
}

function stopRunner(){
  runnerPlaying=false;clearInterval(runnerSpawnTimer);cancelAnimationFrame(runnerLoop);clearTimeout(runnerJumpTimer);
  runnerSpawnTimer=null;runnerLoop=null;runnerItems.replaceChildren();runnerPlayer.classList.remove("jumping");
  runnerWorld.classList.remove("running");
}

function updateRunner(){
  if(!runnerPlaying)return;
  const playerRect=runnerPlayer.getBoundingClientRect();
  runnerItems.querySelectorAll(".runner-item").forEach(item=>{
    const nextTop=(parseFloat(item.dataset.y)||-80)+runnerSpeed;
    item.dataset.y=nextTop;item.style.top=nextTop+"px";
    if(nextTop>runnerTrack.clientHeight+70){item.remove();return}
    const obstacle=item.querySelector(".runner-block");
    const itemRect=(obstacle||item).getBoundingClientRect();
    if(collide(playerRect,itemRect)){
      if(obstacle&&!runnerPlayer.classList.contains("jumping")){endRunner();return}
      runnerScore+=25;runnerScoreEl.textContent=runnerScore;item.remove();playTone(720,.055);
    }
  });
  runnerSpeed=Math.min(11,runnerSpeed+.002);
  runnerLoop=requestAnimationFrame(updateRunner);
}

function spawnRunnerItem(){
  if(!runnerPlaying)return;
  const item=document.createElement("div"),cotton=Math.random()<.62;
  const lane=cotton?Math.max(0,Math.min(2,runnerLane+(Math.random()<.68?0:(Math.random()<.5?-1:1)))):Math.floor(Math.random()*3);
  item.className="runner-item "+(cotton?"runner-cotton":"runner-obstacle");item.dataset.lane=lane;item.style.left=runnerLanes[lane]+"%";item.dataset.y="-80";item.style.top="-80px";
  if(cotton){
    const coin=document.createElement("span"), cottonIcon=document.createElement("span");
    coin.className="runner-coin";cottonIcon.className="cotton-icon cotton-"+["pink","blue","purple"][Math.floor(Math.random()*3)];cottonIcon.setAttribute("aria-hidden","true");coin.appendChild(cottonIcon);item.appendChild(coin);
  }else{
    const obstacle=document.createElement("span");obstacle.className="runner-block";obstacle.setAttribute("aria-label","Obstáculo");item.appendChild(obstacle);
  }
  runnerItems.appendChild(item);
}

function jumpRunner(){
  if(!runnerPlaying||runnerPlayer.classList.contains("jumping"))return;
  runnerPlayer.classList.add("jumping");playTone(440,.08);clearTimeout(runnerJumpTimer);runnerJumpTimer=setTimeout(()=>runnerPlayer.classList.remove("jumping"),520);
}

runnerTrack.addEventListener("pointerdown",event=>{runnerPointerStart={x:event.clientX,y:event.clientY}});
runnerTrack.addEventListener("pointerup",event=>{
  if(!runnerPointerStart)return;
  const dx=event.clientX-runnerPointerStart.x,dy=event.clientY-runnerPointerStart.y;
  if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy))moveRunner(dx>0?1:-1);else if(Math.abs(dy)<35)jumpRunner();
  runnerPointerStart=null;
});
runnerTrack.addEventListener("pointercancel",()=>runnerPointerStart=null);

function endRunner(){
  if(!runnerPlaying)return;
  runnerPlaying=false;clearInterval(runnerSpawnTimer);cancelAnimationFrame(runnerLoop);runnerWorld.classList.remove("running");runnerItems.replaceChildren();runnerFinalScore.textContent=runnerScore;
  $("runnerEnd").classList.remove("hidden");playTone(180,.16);
}

document.addEventListener("keydown",e=>{
  if(!runnerPlaying)return;
  if(["arrowleft","a"].includes(e.key.toLowerCase())){e.preventDefault();moveRunner(-1)}
  if(["arrowright","d"].includes(e.key.toLowerCase())){e.preventDefault();moveRunner(1)}
  if(e.key===" "){e.preventDefault();jumpRunner()}
});
