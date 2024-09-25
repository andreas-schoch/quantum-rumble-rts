(()=>{"use strict";var e,t={593:(e,t,s)=>{s.d(t,{u:()=>Y});var i=s(944);const r="energy_storage_change",n="energy_production_change",o="energy_consumption_change",a="unit_selection_change",h=16,c=1e3,l=[{elevation:3e3,depth:40,color:6641746},{elevation:6e3,depth:70,color:7760227},{elevation:9e3,depth:100,color:8878708},{elevation:12e3,depth:130,color:9997189}],d=[{elevation:1e3,depth:11,color:4227511,alpha:.2},{elevation:2e3,depth:21,color:4227511,alpha:.2},{elevation:3e3,depth:31,color:4227511,alpha:.2},{elevation:4e3,depth:41,color:4227511,alpha:.2},{elevation:5e3,depth:51,color:4227511,alpha:.2},{elevation:6e3,depth:61,color:4227511,alpha:.2},{elevation:7e3,depth:71,color:4227511,alpha:.2},{elevation:8e3,depth:81,color:4227511,alpha:.2},{elevation:9e3,depth:91,color:4227511,alpha:.2},{elevation:1e4,depth:101,color:4227511,alpha:.2},{elevation:11e3,depth:111,color:4227511,alpha:.2},{elevation:12e3,depth:121,color:4227511,alpha:.2},{elevation:13e3,depth:131,color:4227511,alpha:.2},{elevation:14e3,depth:141,color:4227511,alpha:.2},{elevation:15e3,depth:151,color:4227511,alpha:.2}],u={seed:.123,sizeX:100,sizeY:100,cityCoords:{x:50,y:27},noise:[{scale:200,offsetX:0,offsetY:0,strength:2.5},{scale:96,offsetX:0,offsetY:0,strength:2},{scale:32,offsetX:0,offsetY:0,strength:1},{scale:32,offsetX:-150,offsetY:-150,strength:2,subtract:!0}],rects:[{x:75,y:25,w:4,h:4,elevation:3e3},{x:75,y:25,w:2,h:2,elevation:0}],emitters:[{xCoord:19,yCoord:36,fluidPerSecond:131070,ticksCooldown:1,ticksDelay:0},{xCoord:10,yCoord:75,fluidPerSecond:131070,ticksCooldown:1,ticksDelay:0},{xCoord:78,yCoord:54,fluidPerSecond:131070,ticksCooldown:1,ticksDelay:0}]};class p{constructor(e,t,s){this.energyPath={found:!1,distance:1/0,path:[]},this.isEnergyRoot=!1,this.findPathAsyncInProgress=!1,this.destroyed=!1,this.built=!1,this.sprite=null,this.healthCurrent=0,this.pendingBuild=[],this.pendingHealth=[],this.scene=e,this.id=Math.random().toString(36).substring(2,10),this.x=t*h+8,this.y=s*h+8,this.coordX=t,this.coordY=s,p.structuresById.set(this.id,this),this.buildCost=this.constructor.buildCost,this.CLASS=Object.getPrototypeOf(this).constructor}tick(e){if(!this.destroyed){if(!this.energyPath.found&&!this.isEnergyRoot&&!this.findPathAsyncInProgress)return this.findPathAsync();if(this.isEnergyRoot||this.energyPath.found)return!this.built&&0!==this.buildCost&&this.pendingBuild.length<this.buildCost?this.pendingBuild.push(this.scene.network.requestEnergy("build",1,this)):this.healthCurrent<this.CLASS.healthMax&&this.pendingHealth.length<this.CLASS.healthMax-this.healthCurrent?this.pendingHealth.push(this.scene.network.requestEnergy("health",1,this)):this.built||0!==this.buildCost||this.build(1),!0}}activate(){this.scene.network.world[this.coordY][this.coordX].ref=this,this.sprite&&this.sprite.clearTint(),p.activeStructureIds.add(this.id),p.structuresInUpdatePriorityOrder.push(this),p.structuresInUpdatePriorityOrder.sort(((e,t)=>t.CLASS.updatePriority-e.CLASS.updatePriority)),this.isEnergyRoot||(this.energyPath=this.scene.network.findPathToEnergySource(this)),this.healthCurrent=this.CLASS.healthMax}deactivate(){p.activeStructureIds.delete(this.id),p.structuresInUpdatePriorityOrder=p.structuresInUpdatePriorityOrder.filter((e=>e.id!==this.id)),this.CLASS.energyCollectionRange&&this.scene.network.stopCollecting(this)}hit(e){this.healthCurrent=Math.max(this.healthCurrent-e,0),0===this.healthCurrent&&this.destroy()}receiveEnergy(e){if(this.destroyed)throw new Error("This structure is already destroyed");if(!e)throw new Error("This structure does not have a pending energy request with that id");"build"===e.type?(this.build(e.amount),this.pendingBuild=this.pendingBuild.filter((t=>t.id!==e.id))):"health"===e.type&&(this.heal(e.amount),this.pendingHealth=this.pendingHealth.filter((t=>t.id!==e.id)))}findPathAsync(){this.findPathAsyncInProgress=!0,this.scene.network.findPathToEnergySourceAsync(this).then((e=>{this.energyPath=e,this.findPathAsyncInProgress=!1}))}destroy(){this.sprite?.destroy(),this.destroyed=!0,this.deactivate(),p.structuresById.delete(this.id),p.activeStructureIds.delete(this.id),this.scene.network.world[this.coordY][this.coordX].ref=null,this.CLASS.energyStorageCapacity&&(this.scene.network.energyStorageMax-=this.CLASS.energyStorageCapacity),this.CLASS.energyProduction&&(this.scene.network.energyProducing-=this.CLASS.energyProduction),this.CLASS.speedIncrease&&(this.scene.network.speed-=this.CLASS.speedIncrease)}heal(e){if(this.destroyed)throw new Error("This structure is already destroyed");this.healthCurrent=Math.min(this.healthCurrent+e,this.CLASS.healthMax)}build(e){if(this.destroyed)throw new Error("This structure is already destroyed");if(this.built)throw new Error("This structure is already built");this.buildCost=Math.max(this.buildCost-e,0),this.buildCost<=0&&(this.CLASS.energyCollectionRange&&this.scene.network.startCollecting(this),this.healthCurrent=this.CLASS.healthMax,this.CLASS.energyProduction&&(this.scene.network.energyProducing+=this.CLASS.energyProduction),this.CLASS.energyStorageCapacity&&(this.scene.network.energyStorageMax+=this.CLASS.energyStorageCapacity),this.CLASS.speedIncrease&&(this.scene.network.speed+=this.CLASS.speedIncrease),this.sprite?.setAlpha(1),this.built=!0)}draw(){}canMoveTo(e,t){return null===this.scene.network.world[t][e].ref||this.scene.network.world[t][e].ref===this}move(e,t){if(this.scene.network.world[t][e].ref===this)return;if(!this.CLASS.movable||this.destroyed)throw new Error("This structure is not movable or already destroyed");this.coordX=e,this.coordY=t,this.x=e*h+8,this.y=t*h+8,this.sprite&&this.sprite.setPosition(this.x,this.y);const s=this.scene.network.world[this.coordY][this.coordX],i=this.scene.network.world[t][e];return s.ref=null,i.ref=this,!0}}function g(e,t,s,i,r,n){let o=Math.PI/2*3,a=t,h=s;const c=Math.PI/i;e.beginPath(),e.moveTo(t,s-r);for(let l=0;l<i;l++)a=t+Math.cos(o)*r,h=s+Math.sin(o)*r,e.lineTo(a,h),o+=c,a=t+Math.cos(o)*n,h=s+Math.sin(o)*n,e.lineTo(a,h),o+=c;e.lineTo(t,s-r),e.closePath(),e.fillPath(),e.strokePath()}p.structuresInUpdatePriorityOrder=[],p.structuresById=new Map,p.activeStructureIds=new Set,p.energyCollectionRange=0,p.energyStorageCapacity=0,p.energyProduction=0,p.connectionRange=5,p.updatePriority=1,p.speedIncrease=0,p.isRelay=!1,p.movable=!1,p.type="structure";class y extends p{constructor(e,t,s){super(e,t,s),this.isEnergyRoot=!0,this.updatePriority=10,this.sprite=this.scene.add.sprite(this.x-72,this.y-72,y.unitName).setDepth(1e3).setOrigin(0,0),this.build(0)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(11045156,1),t.lineStyle(2,0,1),g(t,72,72,8,67,57.6),t.fillStyle(14400599,1),g(t,72,72,8,40,72*.6),t.generateTexture(y.unitName,144,144),t.destroy()}}function f(){return new Worker(s.p+"pathFinder.worker.b0bc5acf32a6d8fe73c2.bundle.worker.js")}y.unitName="City",y.buildCost=0,y.connectionRange=19,y.movable=!0,y.isRelay=!0,y.energyCollectionRange=7,y.energyProduction=.6,y.energyStorageCapacity=20,y.healthMax=500;class m{constructor(){this.vertices=new Map,this.edges=new Map,this.edgesByVertex=new Map,this.heuristics={euclidian:this.heuristicEuclidian,manhattan:this.heuristicManhattan,chebyshev:this.heuristicChebyshev,octile:this.heuristicOctile}}createVertex(e,t,s,i){if(this.vertices.has(e))throw new Error(`Vertex with id ${e} already exists`);const r={id:e,data:i,x:t,y:s};return this.vertices.set(e,r),this.edgesByVertex.set(e,[]),r}removeVertex(e){if(!this.vertices.delete(e))return!1;const t=this.edgesByVertex.get(e);return this.edgesByVertex.delete(e),!t||(t.forEach((e=>this.edges.delete(e.id))),!0)}removeAllVertices(){let e=!0;return this.vertices.forEach((t=>{this.removeVertex(t.id)||(e=!1)})),e&&0===this.vertices.size&&0===this.edges.size}getNeighbourVertices(e){const t=this.edgesByVertex.get(e);if(!t)return[];const s=[];return t.forEach((t=>{const i=t.vertA===e?t.vertB:t.vertA,r=this.vertices.get(i);r&&s.push(r)})),s}createEdge(e,t,s,i){const r={id:`${e}-${t}`,vertA:e,vertB:t,weight:s,data:i};return this.edges.set(r.id,r),this.edgesByVertex.get(e)?.push(r),this.edgesByVertex.get(t)?.push(r),r}getEdgeBetween(e,t){return this.edges.get(`${e}-${t}`)||this.edges.get(`${t}-${e}`)||null}removeEdgeBetween(e,t){const s=this.getEdgeBetween(e,t);return s?(this.edges.delete(s.id),this.edgesByVertex.get(e)?.filter((e=>e.id!==s.id)),this.edgesByVertex.get(t)?.filter((e=>e.id!==s.id)),s):null}removeEdge(e){const t=this.edges.get(e);return t?(this.edges.delete(e),this.edgesByVertex.get(t.vertA)?.filter((t=>t.id!==e)),this.edgesByVertex.get(t.vertB)?.filter((t=>t.id!==e)),t):null}findPath(e,t,s="euclidian",i=null){const r=this.vertices.get(e),n=this.vertices.get(t);if(!n||!r)return{distance:1/0,path:[],found:!1};if(0===this.edgesByVertex.get(e)?.length||0===this.edgesByVertex.get(t)?.length)return{distance:1/0,path:[],found:!1};const o=[],a=new Set,h=new Map,c=new Map;c.set(r,0),o.push({value:r,fScore:this.heuristics[s](r,n)});let l=!1;for(;o.length;){const e=o.pop().value;if(i&&i.fillCircle(e.x,e.y,20),e.id===t)break;l=!1;const r=this.edgesByVertex.get(e.id)||[];for(const t of r){const i=this.vertices.get(t.vertA===e.id?t.vertB:t.vertA),r=(c.get(e)||0)+t.weight;if(r<(c.get(i)||1/0)){if(h.set(i,e),c.set(i,r),!a.has(i)){const t=.275*(n.x-e.x+n.y-e.y);o.push({value:i,fScore:r+this.heuristics[s](i,n)+t}),l=!0}a.add(i)}}l&&o.sort(((e,t)=>t.fScore-e.fScore))}const d=[];let u=n;for(;u&&u.id!==e;){if(!h.get(u))return{distance:1/0,path:[],found:!1};d.push(u),u=h.get(u)}d.push(r),d.reverse();const p=c.get(n);return p?{distance:p,path:d,found:!0}:{distance:1/0,path:[],found:!1}}heuristicEuclidian(e,t){return Math.sqrt(Math.pow(e.x-t.x,2)+Math.pow(e.y-t.y,2))}heuristicManhattan(e,t){return Math.abs(e.x-t.x)+Math.abs(e.y-t.y)}heuristicChebyshev(e,t){return Math.max(Math.abs(e.x-t.x),Math.abs(e.y-t.y))}heuristicOctile(e,t){const s=Math.abs(e.x-t.x),i=Math.abs(e.y-t.y);return Math.max(s,i)+.414*Math.min(s,i)}}var w=s(768);class S{constructor(e){this.world=[],this.graph=new m,this.textureKeysEdge=new Set,this.root=null,this.collectionMap=new Map,this.collectionSpriteSet=new Set,this.speed=150,this.energyProducing=0,this.energyCollecting=0,this.energyStorageMax=0,this.energyStorageCurrent=y.energyStorageCapacity,this.previewUnitClass=null,this.requestQueue=[],this.energyProducedPerSecond=0,this.energyConsumedPerSecond=0;for(let e=0;e<u.sizeY;e++){const t=[];for(let s=0;s<u.sizeX;s++)t.push({x:s,y:e,ref:null});this.world.push(t)}this.remoteGraph=(0,w.Ud)(new f),this.scene=e,this.previewEdgeSprite=this.scene.add.sprite(0,0,"cell_green").setDepth(499).setOrigin(0,.5),this.previewUnitSprite=this.scene.add.sprite(0,0,"cell_green").setDepth(499).setOrigin(0,.5),this.previewEdgeRenderTexture=this.scene.add.renderTexture(0,0,u.sizeX*h,u.sizeY*h).setDepth(499).setOrigin(0,0).setAlpha(.5),this.previewEdgeSprite.setVisible(!1),this.previewEdgeRenderTexture.draw(this.previewEdgeSprite)}tick(e){const t=this.energyProducing+this.energyCollecting,s=Math.min(this.energyStorageCurrent+.05*t,this.scene.network.energyStorageMax),i=this.scene.network.requestQueue.reduce(((e,t)=>e+t.amount),0);for(this.energyProducedPerSecond=t,this.energyStorageCurrent=s,this.energyDeficit=i;this.energyStorageCurrent>=1&&this.requestQueue.length;){const e=this.requestQueue.shift();this.energyStorageCurrent-=e.amount,this.energyConsumedPerSecond+=e.amount,this.sendEnergyBall(e)}this.scene.observer.emit(r,this.energyStorageCurrent,this.energyStorageMax),e%20==0&&(this.scene.observer.emit(n,this.energyProducedPerSecond),this.scene.observer.emit(o,this.energyConsumedPerSecond),this.energyConsumedPerSecond=0)}requestEnergy(e,t,s){if(s.destroyed)throw new Error("This structure is already destroyed");if(!s.energyPath.found)throw new Error("This structure is not connected to an energy source");const i={id:this.scene.network.generateId(),type:e,amount:t,requester:s};return this.requestQueue.push(i),i}generateId(){return Math.random().toString(36).substring(2,10)}getCellsInRange(e,t,s,i=!0){const r=[];for(let n=t-s;n<=t+s;n++)for(let o=e-s;o<=e+s;o++){if(o<0||n<0||o>=this.world[0].length||n>=this.world.length)continue;const a=this.world[n][o];if(i&&!a.ref)continue;const h=Math.abs(o-e)+Math.abs(n-t);h>s||r.push([a,h])}return r}sendEnergyBall(e){const t=e.requester.energyPath,s=t.path.reduce(((e,t)=>e.concat(t.x,t.y)),[]),i=this.scene.add.path(s[0],s[1]);for(let e=2;e<s.length;e+=2)i.lineTo(s[e],s[e+1]);const r="ammo"===e.type?"energy_red":"energy",n=t.distance/this.speed*1e3,o={follower:this.scene.add.follower(i,s[0],s[1],r),id:this.generateId()};o.follower.setScale(1).setDepth(501),o.follower.startFollow({duration:n,repeat:0,onComplete:()=>{o.follower.destroy(),e.requester.receiveEnergy(e)}})}startCollecting(e){const{coordX:t,coordY:s,CLASS:{energyCollectionRange:i}}=e;if(0!==i){this.scene.sfx_start_collect.play();for(let r=s-i;r<=s+i;r++)for(let o=t-i;o<=t+i;o++){if(o<0||r<0||o>=this.world[0].length||r>=this.world.length)continue;if(Math.abs(t-o)+Math.abs(s-r)>i)continue;const a=`${o}-${r}`,c=this.collectionMap.get(a)||[[],void 0];c[0].push(e),1===c[0].length&&(c[1]=this.scene.add.sprite(o*h,r*h,"cell_green").setDepth(500).setOrigin(0,0).setAlpha(.4),this.collectionSpriteSet.add(c[1])),this.collectionMap.set(a,c),this.energyCollecting=.005*this.collectionMap.size,this.scene.observer.emit(n,this.energyCollecting+this.energyProducing)}}}stopCollecting(e){if(0===e.CLASS.energyCollectionRange||!p.activeStructureIds.has(e.id))return;const{coordX:t,coordY:s,CLASS:{energyCollectionRange:i}}=e;for(let r=s-i;r<=s+i;r++)for(let o=t-i;o<=t+i;o++){if(o<0||r<0||o>=this.world[0].length||r>=this.world.length)continue;if(Math.abs(t-o)+Math.abs(s-r)>i)continue;const a=`${o}-${r}`,h=this.collectionMap.get(a)||[[],void 0],c=h[0].findIndex((t=>t.id===e.id));-1!==c&&(h[0].splice(c,1),this.collectionMap.set(a,h),this.energyCollecting=.005*this.collectionMap.size,this.scene.observer.emit(n,this.energyCollecting+this.energyProducing),0===h[0].length&&h[1]&&(h[1]?.destroy(),this.collectionSpriteSet.delete(h[1])))}}previewStructure(e,t,s){null===e||null===t||e<0||t<0||e>=u.sizeX||t>=u.sizeY||s&&(this.previewUnitSprite.setPosition(e*h-h,t*h+8),this.previewUnitClass&&this.previewUnitClass!==s&&this.previewCancel(),this.previewUnitSprite.setTexture(s.unitName).setVisible(!0),this.previewUnitClass=s,this.previewEdge(e,t,s))}previewCancel(){this.previewEdgeRenderTexture.clear(),this.previewEdgeSprite.setVisible(!1),this.previewUnitSprite.setVisible(!1)}placeUnit(e,t,s){this.world[t][e].ref||(this.graph.createVertex(s.id,s.x,s.y,s),this.remoteGraph.createVertex(s.id,s.x,s.y,{x:s.x,y:s.y}),s instanceof y&&(this.root=s),this.connect(e,t,s),s.activate(),this.scene.sfx_place_structure.play())}previewEdge(e,t,s){this.previewEdgeRenderTexture.clear();for(const[i,r]of this.getCellsInRange(e,t,s.connectionRange)){if(!i.ref)continue;if(!i.ref.CLASS.isRelay&&!s.isRelay)continue;if(r>i.ref.CLASS.connectionRange)continue;this.previewEdgeSprite.setPosition(e*h+8,t*h+8);const n=Math.sqrt(Math.pow(this.previewEdgeSprite.x-i.ref.x,2)+Math.pow(this.previewEdgeSprite.y-i.ref.y,2));0!==Math.round(n)&&(this.previewEdgeSprite.setTexture(this.getEdgeSpriteTexture(n)),this.previewEdgeSprite.setRotation(Math.atan2(i.ref.y-this.previewEdgeSprite.y,i.ref.x-this.previewEdgeSprite.x)),this.previewEdgeRenderTexture.draw(this.previewEdgeSprite))}}connect(e,t,s){for(const[i,r]of this.getCellsInRange(e,t,s.CLASS.connectionRange)){if(!i.ref)continue;if(!i.ref.CLASS.isRelay&&!s.CLASS.isRelay)continue;if(i.ref.id===s.id)continue;const e=Math.sqrt(Math.pow(s.x-i.ref.x,2)+Math.pow(s.y-i.ref.y,2));if(r>i.ref.CLASS.connectionRange||0===Math.round(e))continue;const t=Math.atan2(i.ref.y-s.y,i.ref.x-s.x),n=this.scene.add.sprite(s.x,s.y,this.getEdgeSpriteTexture(e)).setDepth(499).setOrigin(0,.5).setRotation(t);this.graph.createEdge(s.id,i.ref.id,e,n),this.remoteGraph.createEdge(s.id,i.ref.id,e,"sprite placeholder")}}getEdgeSpriteTexture(e){const t=`line-${Math.round(e)}`;if(!this.textureKeysEdge.has(t)){const s=this.scene.add.graphics();s.fillStyle(0,1),s.fillRect(0,0,e,6),s.fillStyle(16777215,1),s.fillRect(0,2,e,2),s.generateTexture(t,e,6),s.destroy(),this.textureKeysEdge.add(t)}return t}removeStructure(e){const t=this.graph.vertices.get(e);if(!t)return;this.graph.edgesByVertex.get(e)?.forEach((t=>{const s=t.vertA===e?t.vertB:t.vertA;this.graph.edgesByVertex.get(s)?.filter((e=>e.id!==t.id)),t.data.destroy(),this.graph.edges.delete(t.id),this.remoteGraph.edges.then((e=>e.delete(t.id)))}));const s=this.world[t.data.coordY][t.data.coordX].ref;s&&(s.hit(s.CLASS.healthMax),this.world[t.data.coordY][t.data.coordX].ref=null),this.graph.removeVertex(e),this.remoteGraph.removeVertex(e)}findPathToEnergySource(e){if(!this.root)throw new Error("root is null");const t=this.root.id,s=e.id,i=this.graph.findPath(t,s,"euclidian");let r=!1;for(const t of i.path)if(t.data.id!==e.id&&!t.data.built){r=!0;break}return r?{path:[],distance:1/0,found:!1}:i}async findPathToEnergySourceAsync(e){if(!this.root)throw new Error("root is null");const t=this.root.id,s=e.id,i=await this.remoteGraph.findPath(t,s,"euclidian");let r=!1;for(const t of i.path){if(t.id===e.id)continue;const s=p.structuresById.get(t.id);if(!s||!s.built){r=!0;break}}return r?{path:[],distance:1/0,found:!1}:i}}class C{constructor(){this.shapeByIndex=[],this.shapeByIndex=this.createShapeTable()}getSquareGeomData(e,t){const s=this.getShapeIndex(e,t);return this.shapeByIndex[s]}createShapeTable(){const e=[],t={x:0,y:0},s={x:h,y:0},i={x:0,y:h},r={x:h,y:h},n={x:0,y:8},o={x:h,y:8},a={x:8,y:0},c={x:8,y:h};for(let h=0;h<16;h++){const l=[],d=[];switch(h){case 0:break;case 1:l.push([n,c,i]),d.push({p1:n,p2:c,lw:2,c:16777215});break;case 2:l.push([o,r,c]),d.push({p1:c,p2:o,lw:2,c:16777215});break;case 3:l.push([n,o,r,i]),d.push({p1:n,p2:o,lw:2,c:16777215});break;case 4:l.push([a,s,o]),d.push({p1:o,p2:a,lw:4,c:0});break;case 5:l.push([a,s,o,c,i,n]),d.push({p1:n,p2:a,lw:2,c:16777215}),d.push({p1:c,p2:o,lw:4,c:0});break;case 6:l.push([a,s,r,c]),d.push({p1:c,p2:a,lw:4,c:0});break;case 7:l.push([a,s,r,i,n]),d.push({p1:a,p2:n,lw:2,c:16777215});break;case 8:l.push([t,a,n]),d.push({p1:a,p2:n,lw:4,c:0});break;case 9:l.push([t,a,c,i]),d.push({p1:a,p2:c,lw:4,c:0});break;case 10:l.push([t,a,o,r,c,n]),d.push({p1:a,p2:o,lw:2,c:16777215}),d.push({p1:c,p2:n,lw:4,c:0});break;case 11:l.push([t,a,o,r,i]),d.push({p1:a,p2:o,lw:2,c:16777215});break;case 12:l.push([t,s,o,n]),d.push({p1:o,p2:n,lw:4,c:0});break;case 13:l.push([t,s,o,c,i]),d.push({p1:o,p2:c,lw:4,c:0});break;case 14:l.push([t,s,r,c,n]),d.push({p1:c,p2:n,lw:4,c:0});break;case 15:l.push([t,s,r,i]);break;default:throw new Error("Invalid shape index")}e[h]={polygons:l,isoLines:d,index:h}}return e}getShapeIndex(e,t){const[s,i,r,n]=e;let o=0;return s>=t&&(o+=8),i>=t&&(o+=4),r>=t&&(o+=2),n>=t&&(o+=1),o}}const x=[0,0,0,0],v=[0,0,0,0];class b{constructor(e,t,s,i){this.terrainData=t,this.fluidData=s,this.collectionData=i,this.fluidToTerrainAbove={},this.scene=e,this.marchingSquares=new C,this.renderTexture=this.scene.make.renderTexture({x:0,y:0,width:u.sizeX*h,height:u.sizeY*h},!0).setDepth(1).setOrigin(0,0),this.renderTextureFluid=this.scene.make.renderTexture({x:0,y:0,width:u.sizeX*h,height:u.sizeY*h},!0).setDepth(2).setOrigin(0,0);const r=3e3;for(const e of d){const t=Math.floor(e.elevation/r)*r;this.fluidToTerrainAbove[e.elevation]=t+r}this.generateLayers(),this.renderTerrain()}tick(e){this.renderFluid()}renderTerrain(){console.time("renderTerrain");const e=this.scene.add.graphics().setDepth(1);e.fillStyle(5523265,1),e.fillRect(0,0,u.sizeX*h,u.sizeY*h),this.renderTexture.beginDraw(),this.renderTexture.batchDraw(e,0,0,1);for(const{elevation:e,color:t,depth:s}of l)for(let t=0;t<u.sizeY;t++)for(let s=0;s<u.sizeX;s++){const i=t*(u.sizeX+1)+s,r=i+u.sizeX+1,n=i+1,o=r+1;if(x[0]=this.terrainData[i],x[1]=this.terrainData[n],x[2]=this.terrainData[o],x[3]=this.terrainData[r],15===this.marchingSquares.getShapeIndex(x,e+3e3))continue;const a=this.marchingSquares.getShapeIndex(x,e);this.renderTexture.batchDrawFrame("terrain_"+e,a,s*h,t*h,1)}this.renderTexture.endDraw(),e.destroy(),console.timeEnd("renderTerrain")}renderFluid(){console.time("fluid rendering"),this.renderTextureFluid.clear(),this.renderTextureFluid.beginDraw();const e=function(e){const{x:t,y:s,width:i,height:r}=e.cameras.main.worldView,n=u.sizeX*h,o=t<0?Math.abs(t):0,a=i+t>n?i+t-n:0,c=Phaser.Math.Clamp(Math.floor((i-o-a)/h),0,u.sizeX-1)+2;if(c<=0)return null;const l=u.sizeY*h,d=s<0?Math.abs(s):0,p=r+s>l?r+s-l:0,g=Phaser.Math.Clamp(Math.floor((r-d-p)/h),0,u.sizeY-1)+2;return g<=0?null:{coordX:Phaser.Math.Clamp(Math.floor(t/h)-1,0,u.sizeX-1),coordY:Phaser.Math.Clamp(Math.floor(s/h)-1,0,u.sizeY-1),numCoordsX:c,numCoordsY:g}}(this.scene);if(!e)return;const t=Math.max(e.coordX,0),s=Math.max(e.coordY,0),i=Math.min(e.coordY+e.numCoordsY,u.sizeY),r=Math.min(e.coordX+e.numCoordsX,u.sizeX),n=this.fluidData,o=this.terrainData,a=(this.previousShapes,u.sizeX+1);for(let e=s;e<=i;e++)for(let s=t;s<=r;s++){const t=e*a+s,i=t+a,r=t+1,l=i+1,u=n[t],p=n[r],g=n[l],y=n[i];x[0]=u>=c?u+o[t]:u,x[1]=p>=c?p+o[r]:p,x[2]=g>=c?g+o[l]:g,x[3]=y>=c?y+o[i]:y,v[0]=o[t],v[1]=o[r],v[2]=o[l],v[3]=o[i];const f=s*h,m=e*h;for(const{color:e,alpha:t,elevation:s}of d){const e=this.marchingSquares.getShapeIndex(x,s);if(0===e)break;15!==this.marchingSquares.getShapeIndex(v,this.fluidToTerrainAbove[s])&&this.renderTextureFluid.batchDrawFrame("fluid_"+s,e,f,m)}}this.renderTextureFluid.endDraw(),console.timeEnd("fluid rendering")}renderAt(e,t,s,i,r,n=!0){const{polygons:o,isoLines:a,index:c}=this.marchingSquares.getSquareGeomData(s,i);if(0!==c){if(r.translateCanvas(e,t),15===c)r.fillRect(0,0,h,h);else{for(const e of o)r.fillPoints(e,!0);if(n)for(const{p1:e,p2:t,c:s,lw:i}of a)r.lineStyle(i,s).lineBetween(e.x,e.y,t.x,t.y)}r.translateCanvas(-e,-t)}}generateLayers(){for(const{elevation:e,depth:t,color:s}of l){const t="terrain_"+e;this.generateTexture(t,s,4,4)}for(const{elevation:e,depth:t,color:s,alpha:i}of d){const t="fluid_"+e;this.generateTexture(t,4227511,.4,4)}}generateTexture(e,t,s=1,i=2){const r=this.scene.add.graphics().fillStyle(t,s);for(let e=0;e<4;e++)for(let t=0;t<4;t++){const s=4*e+t,n=this.marchingSquares.shapeByIndex[s],o=t*(h+i),a=e*(h+i);if(r.translateCanvas(o,a),15===s)r.fillRect(0,0,h,h);else{for(const e of n.polygons)r.fillPoints(e,!0);for(const{p1:e,p2:t,c:s,lw:i}of n.isoLines)r.lineStyle(i,s).lineBetween(e.x,e.y,t.x,t.y)}r.translateCanvas(-o,-a)}const n=64+3*i;r.generateTexture(e,n,n),r.destroy();const o=this.scene.textures.get(e);for(let e=0;e<4;e++)for(let t=0;t<4;t++){const s=4*e+t,i=20*t,r=20*e;o.add(s,0,i,r,h,h)}}renderDebug(){if(!this.texts){this.texts=Array.from({length:(u.sizeX+1)*(u.sizeY+1)},(()=>this.scene.add.text(0,0,"",{fontSize:"12px",color:"#000"}).setDepth(1e4)));for(let e=0;e<=u.sizeY;e++)for(let t=0;t<=u.sizeX;t++){const s=e*(u.sizeX+1)+t,i=this.fluidData[s];this.texts[s].setPosition(t*h,e*h),this.texts[s].setText(i.toString())}}for(let e=0;e<=u.sizeY;e++)for(let t=0;t<=u.sizeX;t++){const s=e*(u.sizeX+1)+t,i=this.fluidData[s];this.texts[s].setText(i.toString())}}}class P{constructor(e){this.emitters=[],this.onemit=()=>{},this.defaultEmitPattern=[[0,0]],this.scene=e}addEmitter(e){const t=Math.random().toString(36).substring(2,10);return this.emitters.push({...e,id:t,active:!0,sprite:this.scene.add.sprite(e.xCoord*h+8,e.yCoord*h+8,"emitter").setOrigin(.5,.5).setDepth(1e4)}),t}removeEmitter(e){const t=this.emitters.findIndex((t=>t.id===e));return-1!==t&&this.emitters.splice(t,1),-1!==t}tick(e){for(const t of this.emitters)t.ticksDelay>e||t.ticksCooldown>1&&e%t.ticksCooldown!=1||this.onemit(t.xCoord,t.yCoord,.05*t.fluidPerSecond,this.defaultEmitPattern)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(255,1),g(t,24,24,12,21.6,24*.4),t.generateTexture("emitter",48,48),t.destroy()}}function k(){return new Worker(s.p+"simulation.worker.e2c03278792b6b8cb245.bundle.worker.js")}class M extends Phaser.Scene{constructor(){super({key:"GameScene"}),this.observer=new Phaser.Events.EventEmitter,this.pointerX=null,this.pointerY=null,this.pointerCoordX=null,this.isPaused=!1}create(){this.sfx_start_collect=this.sound.add("start_collect",{detune:600,rate:1.25,volume:.5,loop:!1}),this.sfx_place_structure=this.sound.add("place_structure",{detune:200,rate:1.25,volume:1,loop:!1}),this.scene.launch("GameUIScene",[this,()=>{this.scene.restart()}]),this.setupCameraAndInput(),this.observer.removeAllListeners(),this.network=new S(this),this.city=new y(this,Math.floor(u.cityCoords.x),Math.floor(u.cityCoords.y)),this.network.placeUnit(this.city.coordX,this.city.coordY,this.city),this.simulation=(0,w.Ud)(new k),this.simulation.getData().then((({terrainData:e,fluidData:t,collectionData:s})=>{this.terrain=new b(this,e,t,s),this.emitterManager=new P(this),u.emitters.forEach((e=>this.emitterManager.addEmitter(e))),this.emitterManager.onemit=async(e,t,s,i)=>await this.simulation.fluidChangeRequest(e,t,s,i),this.tickCounter=0,this.time.addEvent({delay:50,timeScale:1,callback:()=>{this.isPaused||(this.tickCounter++,this.simulation.tick(this.tickCounter).then((()=>{this.emitterManager.tick(this.tickCounter),this.terrain.tick(this.tickCounter),this.network.tick(this.tickCounter);for(const e of p.structuresInUpdatePriorityOrder)e.tick(this.tickCounter)})))},callbackScope:this,loop:!0}),this.observer.on(a,(e=>this.selectUnit(e,!1)))}))}update(e,t){this.controls.update(t)}setupCameraAndInput(){const e=this.cameras.main,t=this.cameras.main.width/1920;e.setZoom(1*t),e.setBackgroundColor(3355443),e.centerOnX(h*u.sizeX/2),e.centerOnY(h*u.sizeY/2);const s=this.input.keyboard;if(!s)throw new Error("cursors is null");const i=s.addKey(Phaser.Input.Keyboard.KeyCodes.W),r=s.addKey(Phaser.Input.Keyboard.KeyCodes.A),n=s.addKey(Phaser.Input.Keyboard.KeyCodes.S),o=s.addKey(Phaser.Input.Keyboard.KeyCodes.D),a=s.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),c=s.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),l=s.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),d=s.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),p=s.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),g=s.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),y=s.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),f=s.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),m=s.addKey(Phaser.Input.Keyboard.KeyCodes.NINE),w=s.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),S=s.addKey(Phaser.Input.Keyboard.KeyCodes.X),C=s.addKey(Phaser.Input.Keyboard.KeyCodes.P),x=s.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);this.controls=new Phaser.Cameras.Controls.SmoothedKeyControl({camera:e,up:i,left:r,down:n,right:o,zoomIn:s.addKey(Phaser.Input.Keyboard.KeyCodes.Q),zoomOut:s.addKey(Phaser.Input.Keyboard.KeyCodes.E),acceleration:10,drag:.1,maxSpeed:.75,maxZoom:2,minZoom:.3333333333333333,zoomSpeed:.05}),a.onDown=()=>this.selectUnit(0),c.onDown=()=>this.selectUnit(1),l.onDown=()=>this.selectUnit(2),d.onDown=()=>this.selectUnit(3),p.onDown=()=>this.selectUnit(4),g.onDown=()=>this.selectUnit(5),y.onDown=()=>this.selectUnit(6),f.onDown=()=>this.selectUnit(7),m.onDown=()=>this.selectUnit(8),w.onDown=()=>this.selectUnit(-1),S.onDown=()=>this.selectUnit(-1),C.onDown=()=>this.isPaused=!this.isPaused,x.onDown=()=>this.isPaused=!this.isPaused;const v=this.input;v.mousePointer.motionFactor=.5,v.pointer1.motionFactor=.5,v.on("pointermove",(e=>{const{worldX:t,worldY:s}=e;this.pointerX=t,this.pointerY=s;const i=Math.floor(t/h),r=Math.floor(s/h);e.isDown||!this.selectedUnitClass||this.pointerCoordX===i&&this.pointerCoordY===r||(this.network.previewStructure(i,r,this.selectedUnitClass),this.pointerCoordX=i,this.pointerCoordY=r)})),v.on("pointerdown",(e=>{if(!this.selectedUnitClass)return;this.pointerCoordX=Math.floor(e.worldX/h),this.pointerCoordY=Math.floor(e.worldY/h);const{pointerCoordX:t,pointerCoordY:s}=this;if(null!==t&&null!==s&&!(t<0||s<0||t>u.sizeX||s>u.sizeY)&&this.selectedUnitClass){const e=new this.selectedUnitClass(this,t,s);this.network.placeUnit(t,s,e)}})),v.on("wheel",((t,s,i,r)=>{const n=e.zoom-(r>0?.025:-.025),o=Phaser.Math.Clamp(n,2/3,4/3);e.zoom=o}))}selectUnit(e,t=!0){const s=Y[e]||null;this.network.previewCancel(),this.network.previewStructure(this.pointerCoordX,this.pointerCoordY,s),this.selectedUnitClass=s,t&&this.observer.emit(a,e)}}class T extends p{constructor(e,t,s){super(e,t,s),this.updatePriority=10,this.sprite=this.scene.add.sprite(this.x,this.y,T.unitName).setDepth(500).setAlpha(.3)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(1605400,1),t.lineStyle(2,0,1),t.fillCircle(24,24,16),t.strokeCircle(24,24,15),t.fillStyle(7829367,1),t.fillCircle(24,24,8),t.strokeCircle(24,24,8),t.generateTexture(T.unitName,48,48),t.destroy()}}T.unitName="Storage",T.buildCost=20,T.isRelay=!1,T.movable=!1,T.connectionRange=5,T.energyCollectionRange=0,T.energyCollectionRate=0,T.energyProduction=0,T.energyStorageCapacity=20,T.healthMax=5;class E extends p{constructor(e,t,s){super(e,t,s),this.updatePriority=2,this.sprite=this.scene.add.sprite(this.x,this.y,E.unitName).setDepth(500).setAlpha(.3)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(13882323,1),t.lineStyle(2,0,1),t.fillCircle(24,24,16),t.strokeCircle(24,24,15),t.fillStyle(16777215,1),t.fillCircle(24,24,8),t.strokeCircle(24,24,8),t.generateTexture(E.unitName,48,48),t.destroy()}}E.unitName="Collector",E.buildCost=5,E.isRelay=!0,E.movable=!1,E.connectionRange=9,E.energyCollectionRange=4,E.energyProduction=0,E.energyStorageCapacity=0,E.healthMax=1;class A extends p{constructor(e,t,s){super(e,t,s),this.updatePriority=1,this.sprite=this.scene.add.sprite(this.x,this.y,A.unitName).setDepth(5e3).setAlpha(.3)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(13882323,1),t.lineStyle(2,0,1),g(t,24,24*1.15,3,6.4*3,3.2*3),t.fillStyle(16777215,1),g(t,24,24*1.15,3,3.2*3,1.6*3),t.generateTexture(A.unitName,48,48),t.destroy()}}A.unitName="Relay",A.buildCost=20,A.isRelay=!0,A.movable=!1,A.connectionRange=19,A.energyCollectionRange=0,A.energyCollectionRate=0,A.energyProduction=0,A.energyStorageCapacity=0,A.healthMax=1;class R extends p{constructor(e,t,s){super(e,t,s),this.updatePriority=10,this.sprite=this.scene.add.sprite(this.x,this.y,R.unitName).setDepth(500).setAlpha(.3)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(3037570,1),t.lineStyle(2,0,1),g(t,24,24,4,24*.8-2,24*.35),t.generateTexture(R.unitName,48,48),t.destroy()}}R.unitName="Reactor",R.buildCost=40,R.connectionRange=5,R.energyCollectionRange=0,R.energyProduction=.3,R.energyStorageCapacity=0,R.healthMax=5;class I extends p{constructor(e,t,s){super(e,t,s),this.updatePriority=10,this.sprite=this.scene.add.sprite(this.x,this.y,I.unitName).setDepth(500).setAlpha(.3)}static generateTextures(e){const t=e.add.graphics();t.fillStyle(16711680,1),t.lineStyle(2,0,1),g(t,24,24,2,16,16),t.generateTexture(I.unitName,48,48),t.destroy()}}I.unitName="Speed",I.buildCost=35,I.isRelay=!1,I.movable=!1,I.connectionRange=5,I.energyCollectionRange=0,I.energyProduction=0,I.speedIncrease=8,I.energyStorageCapacity=0,I.healthMax=5;class D extends Phaser.Scene{constructor(){super({key:"PreloadScene"})}preload(){this.load.audio("place_structure",["assets/audio/sfx/place_structure/click.wav"]),this.load.audio("start_collect",["assets/audio/sfx/start_collect/sharp_echo.wav"]),this.load.audio("attack_turret",["assets/audio/sfx/attack_turret/footstep_concrete_001.ogg"]),this.load.audio("theme",["assets/audio/music/Kevin MacLeod/Shadowlands 4 - Breath.mp3"]),this.load.html("dom_game_ui","assets/html/game_ui.html")}create(){this.generateTextures(),this.scene.start("GameScene")}generateTextures(){y.generateTextures(this),E.generateTextures(this),A.generateTextures(this),T.generateTextures(this),R.generateTextures(this),I.generateTextures(this),P.generateTextures(this);const e=this.add.graphics();e.fillStyle(16777215,1),e.lineStyle(1,13421772,1),e.fillRect(0,0,h,h),e.strokeRect(0,0,h,h),e.generateTexture("cell_white",h,h),e.clear(),e.fillStyle(14876649,1),e.lineStyle(1,13421772,1),e.fillRect(0,0,h,h),e.strokeRect(0,0,h,h),e.generateTexture("cell_green",h,h),e.clear();const t=h;e.fillStyle(0,1),e.fillCircle(t,t,t),e.fillStyle(13882323,1),e.fillCircle(t,t,12),e.setScale(.5),e.generateTexture("energy",t,t),e.clear(),e.setScale(1),e.fillStyle(0,1),e.fillCircle(t,t,t),e.fillStyle(16711680,1),e.fillCircle(t,t,12),e.setScale(.5),e.generateTexture("energy_red",t,t),e.destroy()}}class K extends i.Scene{constructor(){super({key:"GameUIScene"})}init([e,t]){this.mainScene=e,this.observer=e.observer,this.restartGame=t,this.resolutionMod=this.game.canvas.width/1920}create(){this.initDomUi(),this.music=this.sound.add("theme",{loop:!0,volume:.4,rate:1,delay:0,detune:400}),this.music.play()}initDomUi(){const e=this.cameras.main.worldView.x+this.cameras.main.width/2,t=this.cameras.main.worldView.y+this.cameras.main.height/2,s=this.add.dom(e,t).createFromCache("dom_game_ui").setScale(this.resolutionMod);s.pointerEvents="none";const i=document.querySelector("#unit-selector"),h=document.getElementById("unit-template");Y.forEach(((e,t)=>{const s=h.content.cloneNode(!0);s.querySelector(".unit-img").src=this.textures.getBase64(e.unitName)||this.textures.getBase64(E.unitName),s.querySelector(".unit").id=e.unitName,s.querySelector(".unit-name").innerHTML=e.unitName,s.querySelector(".unit-cost").innerHTML=String(e.buildCost),s.querySelector(".unit-hotkey").innerHTML=String(t+1),i.appendChild(s),i.querySelector("#"+e.unitName).onclick=()=>this.observer.emit(a,t)}));const c=i.querySelectorAll(".unit");this.observer.on(a,(e=>{-1!==e?c.forEach(((t,s)=>s===e?t.classList.add("selected"):t.classList.remove("selected"))):c.forEach((e=>e.classList.remove("selected")))}));const l=document.querySelector("#energy-storage-text"),d=document.querySelector("#energy-storage-progress");this.observer.on(r,((e,t)=>{l.innerText=`${e.toFixed(1)}/${t}`,d.style.width=e/t*100+"%"}));const u=document.querySelector("#energy-production");this.observer.on(n,(e=>u.innerText=`+ ${e.toFixed(2)}`));const p=document.querySelector("#energy-consumption");return this.observer.on(o,(e=>p.innerText=`- ${e.toFixed(2)}`)),s}}class X extends p{constructor(e,t,s){super(e,t,s),this.ammoCost=.25,this.updatePriority=1,this.ammoMax=10,this.ammoCurrent=0,this.attackRange=5,this.attackCooldown=5,this.damagePattern=[[0,0],[1,0],[-1,0],[0,1],[0,-1]],this.pendingAmmo=[],X.attackSFX||(X.attackSFX=e.sound.add("attack_turret",{detune:-200,rate:1.25,volume:.5,loop:!1})),this.graphics=e.add.graphics(),this.draw()}tick(e){if(super.tick(e))return this.built&&this.ammoCurrent<this.ammoMax&&this.pendingAmmo.length<this.ammoMax-this.ammoCurrent&&this.pendingAmmo.push(this.scene.network.requestEnergy("ammo",1,this)),this.attack(e),!0}move(e,t){super.move(e,t)&&this.draw()}receiveEnergy(e){super.receiveEnergy(e),"ammo"===e.type&&(this.ammoCurrent=Math.min(this.ammoCurrent+e.amount,this.ammoMax),this.pendingAmmo=this.pendingAmmo.filter((t=>t.id!==e.id)))}destroy(){super.destroy(),this.graphics.destroy()}attack(e){this.ammoCurrent<this.ammoCost||e-this.lastAttack<=this.attackCooldown||Math.random()>.6666||(this.ammoCurrent-=this.ammoCost,this.lastAttack=e,this.draw(),X.attackSFX.play(),this.scene.simulation.fluidChangeRequest(this.coordX,this.coordY,-X.damage,this.damagePattern))}getNearestTarget(){let e=null,t=1/0;for(let s=this.coordY-this.attackRange;s<=this.coordY+this.attackRange;s++)for(let i=this.coordX-this.attackRange;i<=this.coordX+this.attackRange;i++){if(i<0||s<0||i>=u.sizeX||s>=u.sizeY)continue;const r=this.scene.network.world[s][i];if(!r.ref)continue;const n=Math.abs(i-this.coordX)+Math.abs(s-this.coordY);n>this.attackRange||n<t&&(e=r,t=n)}return e}draw(){this.graphics.clear(),this.graphics.setPosition(this.x,this.y),this.graphics.setRotation(Phaser.Math.DegToRad(-45)),this.graphics.lineStyle(2,0,1),this.graphics.fillStyle(13882323,1),g(this.graphics,0,0,4,48*.6,48*.3),this.graphics.fillCircle(0,0,48*.4),this.graphics.fillStyle(16711680,1);const e=this.ammoCurrent/this.ammoMax*360;this.graphics.slice(0,0,48*.4,Phaser.Math.DegToRad(-45),Phaser.Math.DegToRad(-45+e)),this.graphics.fillPath(),this.graphics.strokeCircle(0,0,48*.4),this.graphics.fillStyle(16777215,2),this.graphics.fillCircle(0,0,48*.2),this.graphics.strokeCircle(0,0,48*.2),this.graphics.setDepth(500)}}X.unitName="Weapon",X.buildCost=5,X.isRelay=!1,X.movable=!0,X.connectionRange=5,X.energyCollectionRange=0,X.energyProduction=0,X.energyStorageCapacity=0,X.healthMax=100,X.damage=8192;const z={type:i.WEBGL,backgroundColor:"0xffffff",scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:1920,height:1080},dom:{createContainer:!0},disableContextMenu:!0,parent:"game",scene:[D,M,K]};window.addEventListener("load",(()=>{new i.Game(z),function(){const e=document.createElement("script");e.type="application/javascript",e.onload=function(){const e=new Stats;document.body.appendChild(e.dom),requestAnimationFrame((function t(){e.update(),requestAnimationFrame(t)}))},e.src="./stats.js",document.head.appendChild(e)}()}));const Y=[E,A,X,X,X,X,T,I,R]}},s={};function i(e){var r=s[e];if(void 0!==r)return r.exports;var n=s[e]={exports:{}};return t[e].call(n.exports,n,n.exports,i),n.exports}i.m=t,e=[],i.O=(t,s,r,n)=>{if(!s){var o=1/0;for(l=0;l<e.length;l++){for(var[s,r,n]=e[l],a=!0,h=0;h<s.length;h++)(!1&n||o>=n)&&Object.keys(i.O).every((e=>i.O[e](s[h])))?s.splice(h--,1):(a=!1,n<o&&(o=n));if(a){e.splice(l--,1);var c=r();void 0!==c&&(t=c)}}return t}n=n||0;for(var l=e.length;l>0&&e[l-1][2]>n;l--)e[l]=e[l-1];e[l]=[s,r,n]},i.d=(e,t)=>{for(var s in t)i.o(t,s)&&!i.o(e,s)&&Object.defineProperty(e,s,{enumerable:!0,get:t[s]})},i.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e;i.g.importScripts&&(e=i.g.location+"");var t=i.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var s=t.getElementsByTagName("script");if(s.length)for(var r=s.length-1;r>-1&&!e;)e=s[r--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),i.p=e})(),(()=>{var e={179:0};i.O.j=t=>0===e[t];var t=(t,s)=>{var r,n,[o,a,h]=s,c=0;if(o.some((t=>0!==e[t]))){for(r in a)i.o(a,r)&&(i.m[r]=a[r]);if(h)var l=h(i)}for(t&&t(s);c<o.length;c++)n=o[c],i.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return i.O(l)},s=self.webpackChunkquantum_rumble_rts=self.webpackChunkquantum_rumble_rts||[];s.forEach(t.bind(null,0)),s.push=t.bind(null,s.push.bind(s))})();var r=i.O(void 0,[216],(()=>i(593)));r=i.O(r)})();