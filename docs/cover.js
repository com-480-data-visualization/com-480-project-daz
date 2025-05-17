const cover   = document.getElementById('panel-cover');
const header  = document.querySelector('header.panels');
const trigger = document.getElementById('trigger');

let done = false;

new IntersectionObserver(([ent])=>{
  if(done || ent.isIntersecting) return;  // wait until hero bottom scrolls past
  cover.classList.add('slide-in');

  /* after panels finish growing (≈ 0.25 delay + 0.5 grow = 0.75 s) */
  setTimeout(()=>{
    header.classList.add('visible');
    done = true;
  }, 800);
},{threshold:0}).observe(trigger);
