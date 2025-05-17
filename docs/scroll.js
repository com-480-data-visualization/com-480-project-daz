/* show header once the five-panel slide has scrolled away */
const panel  = document.getElementById('panel-slide');
const header = document.getElementById('mini-header');
new IntersectionObserver(([e])=>{
  header.classList.toggle('visible', !e.isIntersecting);
},{
  rootMargin: '-80px 0px 0px 0px',   // 80 px = header height
  threshold: 0
}).observe(panel);