const state={people:[],byId:new Map(),matches:[],active:0,current:null,parentDepth:1,childDepth:1,showSiblings:true,siblingDescendantDepth:0,siblingBranchDepths:new Map(),view:"genealogy",treeZoom:null,treeSvg:null,treeRoot:null,treeSize:null,networkRenderedFor:null,resizeTimer:null};
const $=s=>document.querySelector(s);
const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const norm=(v="")=>v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("hr").trim();
const firstRecord=p=>(p.records||[])[0]||null;
const parentIds=p=>[...new Set([...(p.mentors||[]),...(p.coMentors||[])])];
function profileMeta(p){const r=firstRecord(p);return r?[r.year,r.institution,r.title].filter(Boolean).join(" · "):(p.identityStatus==="verified"?"Mentorski profil · potvrđen identifikator":"Mentorski profil · doktorski zapis nije pronađen");}
function shortMeta(p){const r=firstRecord(p);return r?[r.year,r.institution].filter(Boolean).join(" · "):"Bez vlastitog doktorskog zapisa";}
function identityStatus(p){return p.identityStatus==="verified"?"Identitet potvrđen":p.identityStatus==="ambiguous-name"?"Ime nije dovoljno za spajanje":p.hasDoctoralRecord?"Profil vezan uz doktorski rad":"Mentorski profil prema imenu";}

function showResults(value){
 const panel=$("#searchResults"),q=norm(value);
 if(q.length<2){panel.hidden=true;state.matches=[];return}
 state.matches=state.people.filter(p=>norm(p.name).includes(q)).sort((a,b)=>Number(!norm(a.name).startsWith(q))-Number(!norm(b.name).startsWith(q))||norm(a.name).localeCompare(norm(b.name),"hr")||profileMeta(a).localeCompare(profileMeta(b),"hr")).slice(0,24);
 state.active=0;
 panel.innerHTML=state.matches.length?state.matches.map((p,i)=>'<button class="result '+(i===0?"active":"")+'" role="option" aria-selected="'+(i===0)+'" data-id="'+esc(p.id)+'"><span><strong>'+esc(p.name)+'</strong><small>'+esc(profileMeta(p))+'</small></span><em>'+(p.hasDoctoralRecord?"doktorat":"mentor")+"</em></button>").join(""):'<p class="no-result">Nema rezultata. Pokušajte samo s prezimenom.</p>';
 panel.hidden=false;panel.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>renderPerson(b.dataset.id));
}

function baseSiblingDepth(){return state.siblingDescendantDepth==="all"?Infinity:Number(state.siblingDescendantDepth)||0}
function effectiveSiblingDepth(id){return state.siblingBranchDepths.has(id)?state.siblingBranchDepths.get(id):baseSiblingDepth()}
function maxDescendantDepth(person){
 let frontier=[person],seen=new Set([person.id]),depth=0;
 while(frontier.length){const next=[];for(const p of frontier)for(const id of p.children||[]){if(seen.has(id))continue;const child=state.byId.get(id);if(child){seen.add(id);next.push(child)}}if(!next.length)break;depth++;frontier=next}
 return depth;
}
function toggleSiblingBranch(person){
 const base=baseSiblingDepth();
 if(state.siblingBranchDepths.has(person.id))state.siblingBranchDepths.delete(person.id);
 else if(base===Infinity)state.siblingBranchDepths.set(person.id,0);
 else state.siblingBranchDepths.set(person.id,base>0&&maxDescendantDepth(person)<=base?0:base+1);
 if(state.current)renderTree(state.current);
}
function collectTree(center){
 const layers=new Map([[0,new Map([[center.id,{id:center.id,person:center,level:0,kind:"focus"}]])]]),seen=new Set([center.id]);
 let frontier=[center];
 for(let depth=1;depth<=state.parentDepth;depth++){
  const row=new Map();
  for(const person of frontier)for(const id of parentIds(person)){const p=state.byId.get(id);if(p&&!seen.has(id)){const co=(person.coMentors||[]).includes(id)&&!(person.mentors||[]).includes(id);row.set(id,{id,person:p,level:-depth,kind:co?"co-ancestor":"ancestor"});seen.add(id)}}
  if(!row.size)break;layers.set(-depth,row);frontier=[...row.values()].map(x=>x.person);
 }
 frontier=[center];
 for(let depth=1;depth<=state.childDepth;depth++){
  const row=new Map();
  for(const person of frontier)for(const id of person.children||[]){const p=state.byId.get(id);if(p&&!seen.has(id)){const co=(p.coMentors||[]).includes(person.id)&&!(p.mentors||[]).includes(person.id);row.set(id,{id,person:p,level:depth,kind:co?"co-descendant":"descendant"});seen.add(id)}}
  if(!row.size)break;layers.set(depth,row);frontier=[...row.values()].map(x=>x.person);
 }
 if(state.showSiblings){
  const row=layers.get(0);
  for(const parentId of parentIds(center)){const parent=state.byId.get(parentId);for(const id of parent?.children||[]){if(id===center.id||row.has(id))continue;const p=state.byId.get(id);if(p)row.set(id,{id,person:p,level:0,kind:"sibling"})}}
  const siblings=[...row.values()].filter(n=>n.kind==="sibling");siblings.forEach(n=>seen.add(n.id));
  for(const sibling of siblings){
   const maxDepth=effectiveSiblingDepth(sibling.id);if(maxDepth<=0)continue;
   let branchFrontier=[sibling.person],branchSeen=new Set([sibling.id,center.id]),depth=0;
   while(branchFrontier.length&&depth<maxDepth){
    depth++;const next=[];
    for(const parent of branchFrontier)for(const id of parent.children||[]){
     if(branchSeen.has(id))continue;branchSeen.add(id);const child=state.byId.get(id);if(!child)continue;next.push(child);
     if(!seen.has(id)){if(!layers.has(depth))layers.set(depth,new Map());layers.get(depth).set(id,{id,person:child,level:depth,kind:"sibling-descendant",siblingRoot:sibling.id});seen.add(id)}
    }
    branchFrontier=next;
   }
  }
 }
 for(const [level,row] of layers){
  if(row.size>72){const focus=level===0?row.get(center.id):null,keep=[...row.values()].filter(x=>x.id!==center.id).sort((a,b)=>(b.person.network?.degree||0)-(a.person.network?.degree||0)||a.person.name.localeCompare(b.person.name,"hr")).slice(0,focus?71:72);layers.set(level,new Map((focus?[focus,...keep]:keep).map(x=>[x.id,x])))}
 }
 return layers;
}
function relationRole(parentId,child){return (child.coMentors||[]).includes(parentId)&&!(child.mentors||[]).includes(parentId)?"co":"mentor";}
function buildTreeLayout(center){
 const layers=collectTree(center),levels=[...layers.keys()].sort((a,b)=>a-b),nodes=[...layers.values()].flatMap(row=>[...row.values()]),nodeById=new Map(nodes.map(n=>[n.id,n])),edges=[];
 for(const child of nodes)for(const parentId of parentIds(child.person)){if(nodeById.has(parentId)){const parent=nodeById.get(parentId);edges.push({source:parent,target:child,role:relationRole(parentId,child.person)})}}
 const rows=new Map(levels.map(level=>[level,[...layers.get(level).values()].sort((a,b)=>{const pa=parentIds(a.person)[0]||"",pb=parentIds(b.person)[0]||"";return pa.localeCompare(pb)||String(firstRecord(a.person)?.year||"").localeCompare(String(firstRecord(b.person)?.year||""))||a.person.name.localeCompare(b.person.name,"hr")})]));
 function positions(level){return new Map((rows.get(level)||[]).map((n,i)=>[n.id,i]))}
 function bary(node,neighbors,pos){const found=neighbors.filter(id=>pos.has(id)).map(id=>pos.get(id));return found.length?found.reduce((a,b)=>a+b,0)/found.length:null}
 for(let sweep=0;sweep<6;sweep++){
  for(let li=1;li<levels.length;li++){const level=levels[li],prev=positions(levels[li-1]);rows.get(level).sort((a,b)=>{const av=bary(a,parentIds(a.person),prev),bv=bary(b,parentIds(b.person),prev);return (av??1e6)-(bv??1e6)||a.person.name.localeCompare(b.person.name,"hr")})}
  for(let li=levels.length-2;li>=0;li--){const level=levels[li],next=positions(levels[li+1]);rows.get(level).sort((a,b)=>{const av=bary(a,a.person.children||[],next),bv=bary(b,b.person.children||[],next);return (av??1e6)-(bv??1e6)||a.person.name.localeCompare(b.person.name,"hr")})}
 }
 function crossingsBetween(upper,lower){
  const up=positions(upper),down=positions(lower),pairEdges=edges.filter(e=>e.source.level===upper&&e.target.level===lower);let count=0;
  for(let i=0;i<pairEdges.length;i++)for(let j=i+1;j<pairEdges.length;j++){const a=pairEdges[i],b=pairEdges[j];if(a.source.id===b.source.id||a.target.id===b.target.id)continue;if((up.get(a.source.id)-up.get(b.source.id))*(down.get(a.target.id)-down.get(b.target.id))<0)count++}
  return count;
 }
 function localScore(level){const i=levels.indexOf(level);return(i>0?crossingsBetween(levels[i-1],level):0)+(i<levels.length-1?crossingsBetween(level,levels[i+1]):0)}
 for(let pass=0;pass<12;pass++){let improved=false;for(const level of levels){const row=rows.get(level);for(let i=0;i<row.length-1;i++){const before=localScore(level),left=row[i];row[i]=row[i+1];row[i+1]=left;const after=localScore(level);if(after<before)improved=true;else{const restore=row[i];row[i]=row[i+1];row[i+1]=restore}}}if(!improved)break}
 const nodeW=224,nodeH=76,gapX=34,gapY=154,maxCount=Math.max(...levels.map(l=>rows.get(l).length)),width=Math.max(960,maxCount*(nodeW+gapX)+120),height=Math.max(480,(levels.length-1)*gapY+190),minLevel=levels[0];
 for(const level of levels){const row=rows.get(level),rowW=row.length*nodeW+(row.length-1)*gapX,start=(width-rowW)/2;row.forEach((n,i)=>{n.x=start+i*(nodeW+gapX)+nodeW/2;n.y=82+(level-minLevel)*gapY;n.w=nodeW;n.h=nodeH})}
 for(const edge of edges){const outgoing=edges.filter(e=>e.source.id===edge.source.id).sort((a,b)=>a.target.x-b.target.x),incoming=edges.filter(e=>e.target.id===edge.target.id).sort((a,b)=>a.source.x-b.source.x);edge.sPort=(outgoing.indexOf(edge)-(outgoing.length-1)/2)*9;edge.tPort=(incoming.indexOf(edge)-(incoming.length-1)/2)*12}
 return{nodes,edges,rows,levels,width,height,center};
}
function edgePath(d){const x1=d.source.x+d.sPort,y1=d.source.y+d.source.h/2,x2=d.target.x+d.tPort,y2=d.target.y-d.target.h/2,mid=y1+(y2-y1)*.52;return "M"+x1+","+y1+" C"+x1+","+mid+" "+x2+","+mid+" "+x2+","+y2}
function bundledSegments(layout){
 const segments=[],handled=new Set(),groups=new Map();
 for(const child of layout.nodes){
  const incoming=layout.edges.filter(e=>e.target.id===child.id&&e.target.level-e.source.level===1).sort((a,b)=>a.source.id.localeCompare(b.source.id));
  if(!incoming.length)continue;
  const key=child.level+"|"+incoming.map(e=>e.source.id+":"+e.role).join(",");
  if(!groups.has(key))groups.set(key,{incoming,children:[]});
  groups.get(key).children.push(child);incoming.forEach(e=>handled.add(e));
 }
 for(const group of groups.values()){
  const parents=[...new Map(group.incoming.map(e=>[e.source.id,e])).values()],children=group.children;
  if(parents.length===1&&children.length===1){segments.push({kind:"relation",role:parents[0].role,path:edgePath(parents[0])});continue}
  const parentBottom=Math.max(...parents.map(e=>e.source.y+e.source.h/2)),childTop=Math.min(...children.map(n=>n.y-n.h/2)),busY=parentBottom+(childTop-parentBottom)*.5,xs=[...parents.map(e=>e.source.x),...children.map(n=>n.x)],minX=Math.min(...xs),maxX=Math.max(...xs);
  segments.push({kind:"bus",role:"bus",path:"M"+minX+","+busY+" H"+maxX});
  for(const edge of parents)segments.push({kind:"parent-leg",role:edge.role,path:"M"+edge.source.x+","+(edge.source.y+edge.source.h/2)+" V"+busY});
  for(const child of children)segments.push({kind:"child-stem",role:"bus",path:"M"+child.x+","+busY+" V"+(child.y-child.h/2)});
 }
 for(const edge of layout.edges)if(!handled.has(edge))segments.push({kind:"relation",role:edge.role,path:edgePath(edge)});
 return segments;
}
function nodeRelationLabel(n){if(n.kind==="focus")return"Odabrana osoba";if(n.kind==="sibling")return"Akademski srodnik";if(n.kind==="sibling-descendant")return"Potomak akademskog srodnika";if(n.kind.startsWith("co-"))return"Komentorska veza";return n.level<0?"Mentor":n.level>0?"Doktorand":""}
function renderTree(center){
 if(!window.d3){$("#treeNote").textContent="Vizualizacijska biblioteka nije učitana.";return}
 const layout=buildTreeLayout(center),viewport=$("#treeViewport"),svg=d3.select("#treeCanvas"),vw=Math.max(320,viewport.clientWidth),vh=Math.max(520,viewport.clientHeight);
 svg.selectAll("*").remove();svg.attr("viewBox",[0,0,vw,vh]);
 const root=svg.append("g").attr("class","tree-root"),segments=bundledSegments(layout),links=root.append("g").attr("class","tree-links").selectAll("path").data(segments).join("path").attr("class",d=>"tree-link "+d.role+" "+d.kind).attr("d",d=>d.path);
 const groups=root.append("g").attr("class","tree-nodes").selectAll("g").data(layout.nodes).join("g").attr("class",d=>"tree-node "+d.kind).attr("transform",d=>"translate("+d.x+","+d.y+")").attr("tabindex",0).attr("role","button").attr("aria-label",d=>d.person.name+", "+nodeRelationLabel(d));
 groups.append("rect").attr("class","node-hit").attr("x",d=>-d.w/2).attr("y",d=>-d.h/2).attr("width",d=>d.w).attr("height",d=>d.h);
 groups.append("line").attr("class","node-rule").attr("x1",d=>-d.w/2).attr("x2",d=>d.w/2).attr("y1",d=>-d.h/2).attr("y2",d=>-d.h/2);
 groups.append("circle").attr("class","node-mark").attr("cy",d=>-d.h/2).attr("r",d=>d.kind==="focus"?5:3.5);
 groups.append("text").attr("class","node-name").attr("text-anchor","middle").attr("y",-10).text(d=>d.person.name);
 groups.append("text").attr("class","node-meta").attr("text-anchor","middle").attr("y",10).text(d=>{const m=shortMeta(d.person);return m.length>39?m.slice(0,38)+"…":m});
 groups.append("text").attr("class","node-role").attr("text-anchor","middle").attr("y",28).text(nodeRelationLabel);
groups.append("title").text(d=>d.person.name+"\n"+shortMeta(d.person));
 const branchToggles=groups.filter(d=>d.kind==="sibling"&&(d.person.children||[]).length).append("g").attr("class",d=>"sibling-branch-toggle"+(effectiveSiblingDepth(d.id)>0?" is-open":"")).attr("transform",d=>"translate("+(d.w/2-18)+",18)").attr("tabindex",0).attr("role","button").attr("aria-expanded",d=>effectiveSiblingDepth(d.id)>0).attr("aria-label",d=>d.person.name+": "+(d.person.children||[]).length+" doktoranada; "+(effectiveSiblingDepth(d.id)>0?"zatvori ili smanji bočnu granu":"otvori bočnu granu"));
 branchToggles.append("circle").attr("r",17);branchToggles.append("text").attr("text-anchor","middle").attr("y",4).text(d=>(effectiveSiblingDepth(d.id)>0?"−":"+")+(d.person.children||[]).length);
 branchToggles.on("click",(e,d)=>{e.stopPropagation();toggleSiblingBranch(d.person)}).on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();toggleSiblingBranch(d.person)}});
 groups.on("click",(_,d)=>renderPerson(d.id)).on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();renderPerson(d.id)}});
 const zoom=d3.zoom().scaleExtent([.01,4]).filter(event=>{
  if(event.type==="wheel"||event.type.startsWith("touch"))return true;
  if(event.ctrlKey||event.button)return false;
  return !(event.type==="mousedown"&&event.target.closest?.(".tree-node"));
 }).wheelDelta(event=>-event.deltaY*(event.deltaMode===1?.05:event.deltaMode?1:.002)).on("start",()=>svg.classed("is-panning",true)).on("zoom",e=>{
  root.attr("transform",e.transform)
   .classed("zoom-overview",e.transform.k<.56)
   .classed("zoom-compact",e.transform.k>=.56&&e.transform.k<.8);
 }).on("end",()=>svg.classed("is-panning",false));
 svg.call(zoom).on("dblclick.zoom",null);
 state.treeZoom=zoom;state.treeSvg=svg;state.treeRoot=root;state.treeSize=layout;state.treeViewport={width:vw,height:vh};
 const gesture=matchMedia("(max-width:700px)").matches?"Prstima zumirajte i pomičite stablo":"Kotačićem zumirajte · povlačenjem pomičite stablo";
 $("#treeNote").textContent=layout.nodes.length+" osoba · "+layout.edges.length+" zabilježenih veza · "+gesture+(layout.nodes.length>=72?" · prikaz je ograničen na najrelevantnije čvorove po generaciji":"");
 requestAnimationFrame(()=>fitTree(false));
}
function zoomTreeBy(factor,animate=true){
 if(!state.treeSvg||!state.treeZoom)return;
 const viewport=$("#treeViewport"),point=[viewport.clientWidth/2,viewport.clientHeight/2],target=animate?state.treeSvg.transition().duration(220):state.treeSvg;
 target.call(state.treeZoom.scaleBy,factor,point);
}
function resetTreeScale(animate=true){
 if(!state.treeSvg||!state.treeZoom||!state.treeSize)return;
 const vw=$("#treeViewport").clientWidth,vh=$("#treeViewport").clientHeight||620,l=state.treeSize;
 const transform=d3.zoomIdentity.translate((vw-l.width)/2,(vh-l.height)/2).scale(1),target=animate?state.treeSvg.transition().duration(300):state.treeSvg;
 target.call(state.treeZoom.transform,transform);
}
function fitTree(animate=true){
 if(!state.treeSvg||!state.treeZoom||!state.treeSize)return;
 const vw=$("#treeViewport").clientWidth,vh=$("#treeViewport").clientHeight||620,l=state.treeSize,mobile=vw<700;
 let scale,tx,ty;
 if(mobile){scale=.88;const focus=l.nodes.find(n=>n.id===l.center.id);tx=vw/2-focus.x*scale;ty=Math.min(110,vh*.25)-focus.y*scale}
 else{scale=Math.min(1,(vw-56)/l.width,(vh-44)/l.height);tx=(vw-l.width*scale)/2;ty=(vh-l.height*scale)/2}
 const transform=d3.zoomIdentity.translate(tx,ty).scale(scale),target=animate?state.treeSvg.transition().duration(350):state.treeSvg;target.call(state.treeZoom.transform,transform);
}

function personLinkList(ids,limit=8){const people=ids.map(id=>state.byId.get(id)).filter(Boolean);return people.length?'<div class="relation-list">'+people.slice(0,limit).map(p=>'<button data-person="'+esc(p.id)+'">'+esc(p.name)+'</button>').join("")+(people.length>limit?'<span>+'+(people.length-limit)+" drugih</span>":"")+"</div>":'<p class="empty-relation">Nema zabilježenih osoba.</p>'}
function renderProfile(p){
 const entries=Object.entries(p.identifiers||{}),parents=parentIds(p);
 $("#personDetail").innerHTML='<p class="profile-kicker">Profil osobe</p><section class="profile-section"><h3>Mentori i komentori</h3>'+personLinkList(parents)+'</section><section class="profile-section"><h3>Doktorandi</h3>'+personLinkList(p.children||[])+'</section><section class="profile-section profile-identifiers"><h3>Identifikatori</h3><p>'+(entries.length?entries.map(([k,v])=>esc(k.toUpperCase())+" · "+esc(v)).join("<br>"):"ID profila · "+esc(p.id))+"</p></section>";
 bindPersonClicks($("#personDetail"));
}
function renderRecords(p){
 const records=p.records||[];
 $("#recordsView").innerHTML=records.length?records.map(r=>{const links=(r.sources||[]).map((s,i)=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">Otvori izvor'+(r.sources.length>1?" "+(i+1):"")+" ↗</a>").join("");return '<article class="work-record"><time>'+esc(r.year||"—")+'</time><div><h4>'+esc(r.title||"Doktorski rad")+'</h4><p>'+esc(r.institution||"Institucija nije navedena")+(r.date?" · "+esc(r.date):"")+'</p><small>'+(r.datasets||[]).map(esc).join(" · ")+"</small></div><div>"+links+"</div></article>"}).join(""):'<div class="records-empty"><h4>Vlastiti doktorski zapis nije pronađen</h4><p>Osoba se u zbirci pojavljuje kao mentor ili komentor.</p></div>';
}

function affinitySubset(center){
 const limit=matchMedia("(max-width:700px)").matches?68:140,community=center.network?.community,direct=new Map((center.networkPeers||[]).map(x=>[x.id,x])),candidates=new Map([[center.id,center]]);
 for(const peer of center.networkPeers||[]){const p=state.byId.get(peer.id);if(p)candidates.set(p.id,p)}
 for(const p of state.people)if(p.network?.community===community)candidates.set(p.id,p);
 for(const p of [...candidates.values()])for(const peer of(p.networkPeers||[]).slice(0,8)){const q=state.byId.get(peer.id);if(q&&q.network?.community!==community)candidates.set(q.id,q)}
 const score=p=>p.id===center.id?1e12:direct.has(p.id)?1e10+(direct.get(p.id).weight||0)*1e8:p.network?.community===community?1e7+(p.network?.weightedDegree||0)*1e4:(p.network?.betweenness||0)*1e8;
 const originals=[...candidates.values()].sort((a,b)=>score(b)-score(a)).slice(0,limit),ids=new Set(originals.map(p=>p.id)),nodes=originals.map(p=>Object.assign({},p)),links=[],seen=new Set();
 for(const p of originals)for(const peer of p.networkPeers||[]){if(!ids.has(peer.id))continue;const key=[p.id,peer.id].sort().join("|");if(seen.has(key))continue;seen.add(key);links.push({source:p.id,target:peer.id,weight:peer.weight||1,kinds:peer.kinds||[]})}
 return{nodes,links,total:center.network?.componentSize||1,limited:candidates.size>limit};
}
function stableColor(id){const palette=["#7a2135","#34605b","#3d5369","#8a5b34","#5c6042","#6b5367","#365f78"];let hash=0;for(const char of String(id))hash=(hash*31+char.charCodeAt(0))|0;return palette[Math.abs(hash)%palette.length]}
function networkNeighbors(p){const totals=new Map();for(const peer of p.networkPeers||[]){const c=state.byId.get(peer.id)?.network?.community;if(c&&c!==p.network?.community)totals.set(c,(totals.get(c)||0)+(peer.weight||1))}return[...totals].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,4)}
function renderNetwork(center){
 const box=$("#networkCanvas"),net=affinitySubset(center),n=center.network||{},near=networkNeighbors(center);state.networkRenderedFor=center.id;
 box.innerHTML='<div class="network-toolbar"><div class="network-facts"><span><b>'+esc(n.community||"—")+'</b> zajednica</span><span><b>'+(n.degree||0)+'</b> poveznica</span><span><b>'+(n.componentSize||1)+'</b> u komponenti</span></div><div><button data-action="reset">Vrati prikaz</button><button data-action="labels">Sve oznake</button><button data-action="metrics" aria-expanded="false">Metrike</button></div></div><div class="metrics-disclosure" hidden><dl><div><dt>Closeness</dt><dd>'+(n.closeness||0).toFixed(4)+'</dd></div><div><dt>Betweenness</dt><dd>'+(n.betweenness||0).toFixed(4)+'</dd></div><div><dt>Ponderirani degree</dt><dd>'+(n.weightedDegree||0).toFixed(1)+'</dd></div><div><dt>Najbliže zajednice</dt><dd>'+(near.length?near.map(x=>esc(x[0])).join(", "):"—")+'</dd></div></dl><p>Metrike opisuju položaj u zabilježenoj mreži, ne kvalitetu, ugled ni utjecaj.</p></div><div class="network-stage"><svg role="img" aria-label="Force-directed mreža strukturnih akademskih zajednica"></svg><div class="network-legend"><span><i></i> zajednički mentor</span><span><i class="co"></i> zajedničko mentorstvo</span><span><i class="bridge"></i> mrežni most</span></div></div><p class="network-note">'+(net.limited?"Prikazan je analitički odabir "+net.nodes.length+" osoba iz komponente od "+net.total+". ":"")+"Zajednice i metrike izračunate su na cijeloj komponenti.</p>";
 if(!(center.networkPeers||[]).length){box.querySelector(".network-stage").innerHTML='<p class="network-empty">Za ovu osobu nema izvedenih veza zajedničkog mentora ili zajedničkog mentorstva.</p>';return}
 if(!window.d3){box.querySelector(".network-stage").innerHTML='<p class="network-empty">Vizualizacijska biblioteka nije učitana.</p>';return}
 const stage=box.querySelector(".network-stage"),width=Math.max(760,stage.clientWidth),height=Math.max(560,stage.clientHeight),svg=d3.select(stage).select("svg").attr("viewBox",[0,0,width,height]),root=svg.append("g"),zoom=d3.zoom().scaleExtent([.32,4]).on("zoom",e=>root.attr("transform",e.transform));svg.call(zoom);
 const communities=[...new Set(net.nodes.map(p=>p.network.community))].sort(),bridgeValues=net.nodes.map(p=>p.network.betweenness||0).sort((a,b)=>b-a),threshold=Math.max(.002,bridgeValues[Math.max(0,Math.ceil(bridgeValues.length*.08)-1)]||0);
 const hull=root.append("g").attr("class","cluster-hulls"),link=root.append("g").selectAll("line").data(net.links).join("line").attr("class",d=>"affinity-link "+(d.kinds.includes("co-supervision")?"co":"shared")).attr("stroke-width",d=>Math.min(4,.7+Math.sqrt(d.weight))),node=root.append("g").selectAll("g").data(net.nodes).join("g").attr("class",d=>"atlas-node"+(d.id===center.id?" selected":"")+((d.network.betweenness||0)>=threshold?" bridge":"")).attr("tabindex",0).attr("role","button");
 node.append("circle").attr("r",d=>d.id===center.id?17:Math.min(13,4.8+Math.sqrt(d.network.degree||0)*1.1)).attr("fill",d=>stableColor(d.network.community));node.append("circle").attr("class","node-ring").attr("r",d=>d.id===center.id?24:Math.min(19,9+Math.sqrt(d.network.degree||0)*1.15));
 const label=node.append("text").attr("class","atlas-label").attr("x",d=>d.id===center.id?29:17).attr("y",4).text(d=>d.name).style("display",d=>d.id===center.id||(d.network.degree||0)>=8?null:"none");node.append("title").text(d=>d.name+"\n"+d.network.community+" · "+d.network.degree+" poveznica");
 const sim=d3.forceSimulation(net.nodes).force("link",d3.forceLink(net.links).id(d=>d.id).distance(d=>d.kinds.includes("co-supervision")?70:88).strength(d=>Math.min(.85,.25+d.weight*.08))).force("charge",d3.forceManyBody().strength(-155)).force("center",d3.forceCenter(width/2,height/2)).force("collide",d3.forceCollide().radius(d=>d.id===center.id?44:24)).force("clusterX",d3.forceX(d=>width*(.18+.64*(communities.indexOf(d.network.community)+.5)/communities.length)).strength(.07)).force("clusterY",d3.forceY(height/2).strength(.025)).on("tick",()=>{link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);node.attr("transform",d=>"translate("+d.x+","+d.y+")");const hulls=communities.map(c=>{const pts=net.nodes.filter(d=>d.network.community===c).map(d=>[d.x,d.y]);return{c,path:pts.length>2?d3.polygonHull(pts):null}}).filter(d=>d.path);hull.selectAll("path").data(hulls,d=>d.c).join("path").attr("d",d=>"M"+d.path.join("L")+"Z").attr("fill",d=>stableColor(d.c)).attr("stroke",d=>stableColor(d.c))});
 node.call(d3.drag().on("start",(e,d)=>{if(!e.active)sim.alphaTarget(.2).restart();d.fx=d.x;d.fy=d.y}).on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y}).on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null})).on("click",(_,d)=>renderPerson(d.id)).on("keydown",(e,d)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();renderPerson(d.id)}});
 box.querySelector('[data-action="reset"]').onclick=()=>svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);let labels=false;box.querySelector('[data-action="labels"]').onclick=()=>{labels=!labels;label.style("display",d=>labels||d.id===center.id||(d.network.degree||0)>=8?null:"none")};box.querySelector('[data-action="metrics"]').onclick=e=>{const panel=box.querySelector(".metrics-disclosure"),open=panel.hidden;panel.hidden=!open;e.currentTarget.setAttribute("aria-expanded",open)};
}
function bindPersonClicks(root){root.querySelectorAll("[data-person]").forEach(n=>{n.onclick=()=>renderPerson(n.dataset.person);n.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();renderPerson(n.dataset.person)}}})}
function setView(view,focus=true){
 state.view=view;document.querySelectorAll(".view-tabs [role=tab]").forEach(b=>{const active=b.dataset.view===view;b.setAttribute("aria-selected",active);b.tabIndex=active?0:-1});document.querySelectorAll(".view-panel").forEach(p=>p.hidden=p.id!=="panel"+view[0].toUpperCase()+view.slice(1));
 if(view==="network"&&state.current&&state.networkRenderedFor!==state.current.id)renderNetwork(state.current);
 if(view==="genealogy"&&state.current)requestAnimationFrame(()=>fitTree(false));
 if(focus)document.querySelector('[data-view="'+view+'"]').focus();
}
function renderPerson(id,updateHash=true){
 const p=state.byId.get(id);if(!p)return;if(state.current?.id!==id)state.siblingBranchDepths.clear();state.current=p;state.networkRenderedFor=null;$("#searchResults").hidden=true;$("#pocetna").hidden=true;$("#researchView").hidden=false;$("#headerSearchButton").hidden=false;document.body.classList.add("has-selection");
 $("#personStatus").textContent=identityStatus(p);$("#personName").textContent=p.name;$("#personContext").textContent=shortMeta(p);$("#personCounts").innerHTML='<span><b>'+parentIds(p).length+"</b> mentora</span><span><b>"+(p.children||[]).length+"</b> doktoranada</span><span><b>"+(p.records||[]).length+"</b> radova</span>";$("#workTabCount").textContent="("+(p.records||[]).length+")";
 $("#parentDepth").textContent=state.parentDepth;$("#childDepth").textContent=state.childDepth;renderTree(p);renderProfile(p);renderRecords(p);if(state.view==="network")renderNetwork(p);setView(state.view,false);
 if(updateHash)history.replaceState(null,"","#person="+encodeURIComponent(id));window.scrollTo({top:0,behavior:"smooth"});
}
function resetSearch(){state.current=null;$("#researchView").hidden=true;$("#pocetna").hidden=false;$("#headerSearchButton").hidden=true;document.body.classList.remove("has-selection");history.replaceState(null,"","#pocetna");$("#searchInput").focus()}
async function init(){try{const res=await fetch("data.json");if(!res.ok)throw new Error("Podaci nisu dostupni");const data=await res.json();state.people=data.people;state.byId=new Map(data.people.map(p=>[p.id,p]));$("#recordCount").textContent=data.meta.doctoralRecords.toLocaleString("hr-HR");$("#peopleCount").textContent=data.meta.people.toLocaleString("hr-HR");$("#edgeCount").textContent=data.meta.relationships.toLocaleString("hr-HR");const m=location.hash.match(/^#person=(.+)$/);if(m)renderPerson(decodeURIComponent(m[1]),false)}catch(e){$("#recordCount").textContent="!";$("#searchInput").placeholder="Otvorite stranicu preko web-poslužitelja";console.error(e)}}
$("#searchInput").oninput=e=>showResults(e.target.value);$("#searchInput").onkeydown=e=>{if(!state.matches.length)return;if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();state.active=(state.active+(e.key==="ArrowDown"?1:-1)+state.matches.length)%state.matches.length;document.querySelectorAll(".result").forEach((x,i)=>{x.classList.toggle("active",i===state.active);x.setAttribute("aria-selected",i===state.active)})}if(e.key==="Enter"){e.preventDefault();renderPerson(state.matches[state.active].id)}};$("#searchButton").onclick=()=>state.matches.length?renderPerson(state.matches[state.active].id):$("#searchInput").focus();$("#headerSearchButton").onclick=resetSearch;
document.querySelectorAll("[data-depth]").forEach(b=>b.onclick=()=>{const key=b.dataset.depth==="parents"?"parentDepth":"childDepth";state[key]=Math.max(1,Math.min(4,state[key]+Number(b.dataset.step)));$("#parentDepth").textContent=state.parentDepth;$("#childDepth").textContent=state.childDepth;if(state.current)renderTree(state.current)});$("#siblingsToggle").onchange=e=>{state.showSiblings=e.target.checked;if(state.current)renderTree(state.current)};$("#siblingDescendantDepth").onchange=e=>{state.siblingDescendantDepth=e.target.value;state.siblingBranchDepths.clear();if(state.current)renderTree(state.current)};$("#zoomOutButton").onclick=()=>zoomTreeBy(1/1.32);$("#zoomInButton").onclick=()=>zoomTreeBy(1.32);$("#zoomResetButton").onclick=()=>resetTreeScale(true);$("#fitTreeButton").onclick=()=>fitTree(true);
document.querySelectorAll(".view-tabs [role=tab]").forEach(b=>{b.onclick=()=>setView(b.dataset.view,false);b.onkeydown=e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll(".view-tabs [role=tab]")],i=tabs.indexOf(b),next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;setView(tabs[next].dataset.view,true)}});
document.addEventListener("click",e=>{if(!e.target.closest(".search-module"))$("#searchResults").hidden=true});window.addEventListener("resize",()=>{clearTimeout(state.resizeTimer);state.resizeTimer=setTimeout(()=>{if(state.current&&state.view==="genealogy")renderTree(state.current)},140)});init();