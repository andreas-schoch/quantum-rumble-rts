!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.Stats=t()}(this,(function(){let e=function(){function t(e){return i.appendChild(e.dom),e}function l(e){for(let t=0;t<i.children.length;t++)i.children[t].style.display=t===e?"block":"none";n=e}var n=0,i=document.createElement("div");i.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",i.addEventListener("click",(function(e){e.preventDefault(),l(++n%i.children.length)}),!1);let o=(performance||Date).now(),a=o,f=0,d=t(new e.Panel("FPS","#0ff","#002")),r=t(new e.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var c=t(new e.Panel("MB","#f08","#201"));return l(0),{REVISION:16,dom:i,addPanel:t,showPanel:l,begin:function(){o=(performance||Date).now()},end:function(){f++;let e=(performance||Date).now();if(r.update(e-o,200),e>=a+1e3&&(d.update(1e3*f/(e-a),100),a=e,f=0,c)){let e=performance.memory;c.update(e.usedJSHeapSize/1048576,e.jsHeapSizeLimit/1048576)}return e},update:function(){o=this.end()},domElement:i,setMode:l}};return e.Panel=function(e,t,l){let n=1/0,i=0,o=Math.round,a=o(window.devicePixelRatio||1),f=80*a,d=48*a,r=3*a,c=2*a,p=3*a,u=15*a,s=74*a,m=30*a,h=document.createElement("canvas");h.width=f,h.height=d,h.style.cssText="width:80px;height:48px";let y=h.getContext("2d");return y.font="bold "+9*a+"px Helvetica,Arial,sans-serif",y.textBaseline="top",y.fillStyle=l,y.fillRect(0,0,f,d),y.fillStyle=t,y.fillText(e,r,c),y.fillRect(p,u,s,m),y.fillStyle=l,y.globalAlpha=.9,y.fillRect(p,u,s,m),{dom:h,update:function(d,x){n=Math.min(n,d),i=Math.max(i,d),y.fillStyle=l,y.globalAlpha=1,y.fillRect(0,0,f,u),y.fillStyle=t,y.fillText(o(d)+" "+e+" ("+o(n)+"-"+o(i)+")",r,c),y.drawImage(h,p+a,u,s-a,m,p,u,s-a,m),y.fillRect(p+s-a,u,a,m),y.fillStyle=l,y.globalAlpha=.9,y.fillRect(p+s-a,u,a,o((1-d/x)*m))}}},e}));