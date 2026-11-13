const state={people:[],byId:new Map(),matches:[],activeMatch:0};
const $=s=>document.querySelector(s);
function esc(v=""){return v.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function norm(v=""){return v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("hr").trim();}
function meta(p){const r=p.records[0];return r?[r.year,r.institution].filter(Boolean).join(" · "):"Mentor ili komentor · vlastiti doktorski zapis nije pronađen";}
function showResults(query){
 const panel=$("#searchResults"),needle=norm(query);
 if(needle.length<2){panel.hidden=true;state.matches=[];return;}
 state.matches=state.people.filter(p=>norm(p.name).includes(needle)).sort((a,b)=>Number(!norm(a.name).startsWith(needle))-Number(!norm(b.name).startsWith(needle))||norm(a.name).localeCompare(norm(b.name),"hr")).slice(0,14);state.activeMatch=0;
 panel.innerHTML=state.matches.length?state.matches.map((p,i)=>`<button class="result ${i===0?"active":""}" data-id="${esc(p.id)}" role="option"><span><strong>${esc(p.name)}</strong><small>${esc(meta(p))}</small></span><span class="result-tag">${p.hasDoctoralRecord?"doktorski zapis":"samo mentor"}</span></button>`).join(""):`<div class="result"><span><strong>Nema podudaranja</strong><small>Provjerite zapis imena ili pokušajte samo s prezimenom.</small></span></div>`;
 panel.hidden=false;panel.querySelectorAll("[data-id]").forEach(b=>b.addEventListener("click",()=>renderTree(b.dataset.id)));
}
function personNode(person,kind="",relation=""){
 if(!person)return `<div class="node unknown"><b>?</b><span>Mentor nije naveden</span><small>Nedostaje u izvornom zapisu</small></div>`;
 return `<button class="node ${kind}" data-person="${esc(person.id)}">${relation?`<span class="relationship">${esc(relation)}</span>`:""}<span class="node-name">${esc(person.name)}</span><small>${esc(meta(person))}</small></button>`;
}
function ancestors(person){
 const primary=person.mentors.map(id=>personNode(state.byId.get(id),"mentor","mentor"));
 const secondary=person.coMentors.map(id=>personNode(state.byId.get(id),"co","komentor"));
 return [...primary,...secondary].join("")||personNode(null);
}
function descendants(person){
 if(!person.children.length)return `<div class="node unknown"><b>—</b><span>Nema zabilježenih doktoranada</span></div>`;
 return person.children.map(id=>{const child=state.byId.get(id);if(!child)return"";const isPrimary=child.mentors.includes(person.id);const isCo=child.coMentors.includes(person.id);const label=isPrimary&&isCo?"mentor i komentor":isCo?"komentor":"mentor";return personNode(child,isCo&&!isPrimary?"co":"",label);}).join("");
}
function renderTree(id,updateHash=true){
 const p=state.byId.get(id);if(!p)return;
 $("#searchResults").hidden=true;$("#treeView").hidden=false;
 $("#treeCanvas").innerHTML=`<div class="tree-grid"><div class="generation"><div class="generation-title">Akademski prethodnici · ${p.mentors.length+p.coMentors.length}</div>${ancestors(p)}</div><div class="connector"></div><div class="generation"><div class="generation-title">Odabrana osoba</div>${personNode(p,"primary")}</div><div class="connector"></div><div class="generation"><div class="generation-title">Doktorandi · ${p.children.length}</div>${descendants(p)}</div></div>`;
 $("#treeCanvas").querySelectorAll("[data-person]").forEach(b=>b.addEventListener("click",()=>renderTree(b.dataset.person)));
 renderDetails(p);if(updateHash)history.replaceState(null,"",`#person=${encodeURIComponent(id)}`);$("#treeView").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderDetails(p){
 const records=p.records.length?p.records.map(r=>`<article class="record"><span class="record-year">${esc(r.year||"—")}</span><div><span class="record-title">${esc(r.title||"Doktorski rad")}</span><span class="record-meta">${esc(r.institution||"Institucija nije navedena")}</span></div>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">Izvor ↗</a>`:""}</article>`).join(""):`<article class="record"><span class="record-year">—</span><div><span class="record-title">Vlastiti doktorski zapis nije pronađen</span><span class="record-meta">Osoba se u zbirci pojavljuje kao mentor ili komentor.</span></div></article>`;
 $("#personDetail").innerHTML=`<div class="detail-heading"><span class="status">${p.hasDoctoralRecord?"doktorski zapis":"nepotpun profil"}</span><h3>${esc(p.name)}</h3><p>${p.mentors.length} mentor(a)<br>${p.coMentors.length} komentor(a)<br>${p.children.length} doktorand(a)</p></div><div class="records">${records}</div>`;
}
async function init(){
 try{const response=await fetch("data.json");if(!response.ok)throw new Error("Podaci nisu dostupni");const data=await response.json();state.people=data.people;state.byId=new Map(data.people.map(p=>[p.id,p]));$("#recordCount").textContent=data.meta.doctoralRecords.toLocaleString("hr-HR");$("#peopleCount").textContent=data.meta.people.toLocaleString("hr-HR");const edges=data.people.reduce((n,p)=>n+p.mentors.length+p.coMentors.length,0);$("#edgeCount").textContent=edges.toLocaleString("hr-HR");const match=location.hash.match(/^#person=(.+)$/);if(match)renderTree(decodeURIComponent(match[1]),false);}
 catch(error){$("#recordCount").textContent="!";$("#searchInput").placeholder="Otvorite stranicu preko lokalnog poslužitelja";console.error(error);}
}
$("#searchInput").addEventListener("input",e=>showResults(e.target.value));
$("#searchInput").addEventListener("keydown",e=>{if(!state.matches.length)return;if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();state.activeMatch=(state.activeMatch+(e.key==="ArrowDown"?1:-1)+state.matches.length)%state.matches.length;document.querySelectorAll(".result").forEach((el,i)=>el.classList.toggle("active",i===state.activeMatch));}if(e.key==="Enter"){e.preventDefault();renderTree(state.matches[state.activeMatch].id);}});
$("#searchButton").addEventListener("click",()=>{if(state.matches.length)renderTree(state.matches[state.activeMatch].id);else $("#searchInput").focus();});
$("#backButton").addEventListener("click",()=>{$("#treeView").hidden=true;history.replaceState(null,"","#pocetna");$("#searchInput").focus();});
document.addEventListener("click",e=>{if(!e.target.closest(".lookup-form"))$("#searchResults").hidden=true;});
init();