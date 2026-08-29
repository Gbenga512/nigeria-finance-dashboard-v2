(function(){
'use strict';
const MF=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
const DT=v=>{try{return v?new Date(v).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):''}catch(e){return String(v??'')}};
const SUM=a=>(a||[]).reduce((s,x)=>s+(Number(x.amt)||0),0);
const ABS=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<0.01;
const SAME=(a,b)=>ABS(a,b)&&((Number(a)>=0&&Number(b)>=0)||(Number(a)<0&&Number(b)<0));
const DG=(a,b)=>{let x=new Date(a),y=new Date(b);return isNaN(x)||isNaN(y)?999:Math.round(Math.abs(x-y)/86400000)};
const TOK=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(Boolean);
const SIM=(a,b)=>{let A=new Set(TOK(a)),B=new Set(TOK(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>B.has(x)&&n++);return n/Math.max(A.size,B.size)};
const REF=(a,b)=>!!(a&&b&&String(a).trim().toLowerCase()===String(b).trim().toLowerCase());
const DIR=x=>Number(x.amt)>=0?'Credit':'Debit';
const ESC=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function direct(){
 let ub=new Set(),ul=new Set(),ma=[],ti=[];
 for(const b of S.bank||[]){
  let candidates=[];
  for(let i=0;i<(S.ledger||[]).length;i++){
   if(ul.has(i))continue;
   const l=S.ledger[i];
   if(!SAME(b.amt,l.amt))continue;
   const g=DG(b.d,l.d),rf=REF(b.ref,l.ref),ts=SIM(b.desc,l.desc),sameDay=g===0;
   let score=-1;
   if(sameDay){
    const unique=(S.ledger||[]).filter((x,j)=>!ul.has(j)&&SAME(b.amt,x.amt)&&DG(b.d,x.d)===0).length===1;
    if(rf||ts>=0.10||unique)score=70+(rf?25:0)+Math.round(ts*10);
   }else if(g<=30&&(rf||ts>=0.30)){
    score=50+(rf?35:0)+Math.round(ts*25);
   }
   if(score>=0)candidates.push({i,l,g,score});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best)continue;
  if(best.g>0&&best.score<60)continue;
  ub.add(b.id);ul.add(best.i);
  const x={b,l:best.l,score:Math.min(99,Math.round(best.score)),g:best.g,reason:best.g===0?'Same amount/direction with supporting identity evidence':'Same amount/direction with posting-date difference and supporting identity evidence'};
  if(best.g===0)ma.push(x);else ti.push(x);
 }
 return{ub,ul,ma,ti};
}

function explicitReversal(a,b){
 const text=(String(a.desc||'')+' '+String(b.desc||'')).toLowerCase();
 const explicit=/\b(reversal|reversed|reverse|reversing|cancelled|canceled|cancel|chargeback|refund|refunded|returned payment|payment returned)\b/.test(text);
 const linked=REF(a.ref,b.ref)&&SIM(a.desc,b.desc)>=0.15;
 return ((Number(a.amt)>0&&Number(b.amt)<0)||(Number(a.amt)<0&&Number(b.amt)>0))&&ABS(Math.abs(a.amt),Math.abs(b.amt))&&DG(a.d,b.d)<=14&&(explicit||linked);
}
function reversals(rows){
 let used=new Set(),out=[];
 for(let i=0;i<rows.length;i++){
  if(used.has(rows[i].id))continue;
  for(let j=i+1;j<rows.length;j++){
   if(used.has(rows[j].id))continue;
   const a=rows[i],b=rows[j];
   if(explicitReversal(a,b)){used.add(a.id);used.add(b.id);out.push({a,b});break;}
  }
 }
 return{used,out};
}

function subset(items,target){
 const sign=Number(target.amt)>=0;
 const pool=items.filter(x=>Number(x.amt)>=0===sign).sort((a,b)=>DG(a.d,target.d)-DG(b.d,target.d)).slice(0,22);
 let best=null;
 function walk(start,chosen,total,simTotal){
  if(chosen.length>=2&&Math.abs(total-Number(target.amt))<0.01){
   const avg=simTotal/chosen.length;
   const ds=chosen.reduce((s,x)=>s+Math.max(0,1-DG(x.d,target.d)/30),0)/chosen.length;
   const score=avg*60+ds*40;
   if(!best||score>best.score)best={items:chosen.slice(),score};return;
  }
  if(chosen.length>=6)return;
  for(let j=start;j<pool.length;j++){
   const x=pool[j],next=total+Number(x.amt);
   if(Math.abs(next)>Math.abs(Number(target.amt))+0.01)continue;
   chosen.push(x);walk(j+1,chosen,next,simTotal+SIM(x.desc,target.desc));chosen.pop();
  }
 }
 walk(0,[],0,0);return best;
}
function groups(B,L){
 let ub=new Set(),ul=new Set(),out=[];
 for(const l of L){
  if(ul.has(l.id))continue;
  const q=subset(B.filter(b=>!ub.has(b.id)&&DG(b.d,l.d)<=14),l);
  if(q&&q.score>=28){q.items.forEach(b=>ub.add(b.id));ul.add(l.id);out.push({bs:q.items,ls:[l],basis:'One-to-many aggregate; exact total and same debit/credit direction'});}
 }
 for(const b of B){
  if(ub.has(b.id))continue;
  const q=subset(L.filter(l=>!ul.has(l.id)&&DG(b.d,l.d)<=14),b);
  if(q&&q.score>=28){q.items.forEach(l=>ul.add(l.id));ub.add(b.id);out.push({bs:[b],ls:q.items,basis:'Many-to-one aggregate; exact total and same debit/credit direction'});}
 }
 return{ub,ul,out};
}

function runPhase1(){
 const d=direct();let ub=new Set(d.ub),ul=new Set(d.ul);
 const rb=reversals((S.bank||[]).filter(x=>!ub.has(x.id))),rl=reversals((S.ledger||[]).filter(x=>!ul.has(x.id)));
 rb.used.forEach(x=>ub.add(x));rl.used.forEach(x=>ul.add(x));
 const g=groups((S.bank||[]).filter(x=>!ub.has(x.id)),(S.ledger||[]).filter(x=>!ul.has(x.id)));
 g.ub.forEach(x=>ub.add(x));g.ul.forEach(x=>ul.add(x));
 S.r={ma:d.ma,ti:d.ti,grouped:g.out,reversals:[...rb.out,...rl.out],unB:(S.bank||[]).filter(x=>!ub.has(x.id)),unL:(S.ledger||[]).filter(x=>!ul.has(x.id))};
 if(typeof render==='function')render();
 setTimeout(()=>{buildStatement();install();},0);
}

function data(){
 const r=S.r||{},b=S.bank||[],l=S.ledger||[];
 const gd=l.reduce((a,x)=>a+(Number(x.debit)||0),0),gc=l.reduce((a,x)=>a+(Number(x.credit)||0),0);
 const opening=l.length&&l[0].balance!==null&&l[0].balance!==undefined?Number(l[0].balance):null;
 const gl=opening!==null?opening+gd-gc:SUM(l);
 const bankCredits=(r.unB||[]).filter(x=>Number(x.amt)>0),bankDebits=(r.unB||[]).filter(x=>Number(x.amt)<0);
 const ledgerCredits=(r.unL||[]).filter(x=>Number(x.amt)>0),ledgerDebits=(r.unL||[]).filter(x=>Number(x.amt)<0);
 const fee=/\b(vat|nip|stamp|processing|charge|charges|fee|fees|sms|rtgs|remita|commission|amf|levy|tax|emtl|bank charge|banking charge)\b/i;
 const charges=bankDebits.filter(x=>fee.test(String(x.desc||''))),bankOtherDebits=bankDebits.filter(x=>!fee.test(String(x.desc||'')));
 const timing=r.ti||[];
 let reconAdjust=SUM(bankCredits)+SUM(bankOtherDebits)+SUM(charges)-SUM(ledgerCredits)-SUM(ledgerDebits);
 const closing=[...b].reverse().find(x=>x.balance!==null&&x.balance!==undefined);
 const bank=closing!==undefined?Number(closing.balance):SUM(b);
 // Timing differences are reconciling items and are displayed in the BRS. The
 // signed bank-vs-ledger difference is included once in the final bridge.
 for(const t of timing)reconAdjust+=Number(t.b.amt)-Number(t.l.amt);
 const computed=gl+reconAdjust;
 return{r,b,l,opening,gd,gc,gl,bankCredits,bankOtherDebits,charges,ledgerCredits,ledgerDebits,timing,bank,computed,var:computed-bank,reconAdjust};
}
function sec(title,rows){
 const line=x=>`${DT(x.d)} — ${ESC(x.desc||x.ref||'Unspecified transaction')}`;
 return `<table><tr><th colspan="2">${title}</th></tr>${rows.length?rows.map(x=>`<tr><td>${line(x)}</td><td class="amount">${MF(Math.abs(x.amt))}</td></tr>`).join(''):'<tr><td>(none)</td><td class="amount">0.00</td></tr>'}<tr class="total"><td>Total</td><td class="amount">${MF(Math.abs(SUM(rows)))}</td></tr></table>`;
}
function buildStatement(){
 const d=data(),tb=d.timing.map(x=>x.b),tl=d.timing.map(x=>x.l);
 const period=d.b.length?DT(Math.min(...d.b.map(x=>new Date(x.d).getTime())))+' to '+DT(Math.max(...d.b.map(x=>new Date(x.d).getTime()))):'';
 $('report').innerHTML=`<div class="working"><div class="title"><h1>BANK RECONCILIATION STATEMENT</h1><h2>Chorus Energy Limited</h2><div>Period: ${period}</div></div><div class="section">BALANCE PER GENERAL LEDGER / CASH BOOK</div><table><tr><th>Particulars</th><th class="amount">Amount (₦)</th></tr><tr><td>Balance as per GL / Cash Book</td><td class="amount">${d.opening===null?'—':MF(d.gl)}</td></tr><tr><td>Bank Statement Closing Balance</td><td class="amount">${MF(d.bank)}</td></tr></table><div class="section">RECONCILING ITEMS — ADD</div>${sec('Bank credits not recorded in Ledger',d.bankCredits)}${sec('Ledger debits not reflected in Bank',d.ledgerDebits)}<div class="section">RECONCILING ITEMS — LESS</div>${sec('Bank debits not recorded in Ledger',d.bankOtherDebits)}${sec('Ledger credits not reflected in Bank',d.ledgerCredits)}${sec('Bank Charges / Bank-originated debits',d.charges)}${d.timing.length?`<div class="section">TIMING DIFFERENCES — ALSO INCLUDED IN BRS</div>${sec('Timing differences — Bank side',tb)}${sec('Timing differences — Ledger side',tl)}`:''}<div class="section">FINAL RECONCILIATION</div><table><tr><td>Balance per GL / Cash Book</td><td class="amount">${MF(d.gl)}</td></tr><tr><td>Net reconciling adjustments</td><td class="amount">${d.reconAdjust>=0?MF(d.reconAdjust):'('+MF(Math.abs(d.reconAdjust)).replace('₦','')+')'}</td></tr><tr class="shade"><td><b>Adjusted balance</b></td><td class="amount"><b>${MF(d.computed)}</b></td></tr><tr><td>Bank Statement Closing Balance</td><td class="amount"><b>${MF(d.bank)}</b></td></tr><tr><td class="variance">Variance</td><td class="amount">${MF(d.var)}</td></tr><tr><td><b>Reconciliation status</b></td><td class="amount"><b>${Math.abs(d.var)<0.01?'RECONCILED':'REVIEW REQUIRED'}</b></td></tr></table><div class="memo">Matched items are excluded. Group matches are retained only in Grouped Matches. Reversals are retained only in Reversals. Timing differences remain in Timing Differences and are also included here. Unmatched and exceptional items are shown by Bank/Ledger and Credit/Debit direction.</div><div class="signature">Prepared by: __________________________ &nbsp;&nbsp;&nbsp; Reviewed by: __________________________</div></div>`;
}
function excel(){
 const d=data(),r=d.r,wb=XLSX.utils.book_new();
 const st=[['BANK RECONCILIATION STATEMENT'],['Balance per GL / Cash Book',d.gl],['Net reconciling adjustments',d.reconAdjust],['Adjusted balance',d.computed],['Bank Statement Closing Balance',d.bank],['Variance',d.var],['Status',Math.abs(d.var)<0.01?'RECONCILED':'REVIEW REQUIRED'],[],['ADD — Bank credits not recorded in Ledger','Amount'],...d.bankCredits.map(x=>[`${DT(x.d)} — ${x.desc||x.ref||''}`,Math.abs(x.amt)]),['ADD — Ledger debits not reflected in Bank','Amount'],...d.ledgerDebits.map(x=>[`${DT(x.d)} — ${x.desc||x.ref||''}`,Math.abs(x.amt)]),['LESS — Bank debits not recorded in Ledger','Amount'],...d.bankOtherDebits.map(x=>[`${DT(x.d)} — ${x.desc||x.ref||''}`,Math.abs(x.amt)]),['LESS — Ledger credits not reflected in Bank','Amount'],...d.ledgerCredits.map(x=>[`${DT(x.d)} — ${x.desc||x.ref||''}`,Math.abs(x.amt)]),['LESS — Bank Charges / Bank-originated debits','Amount'],...d.charges.map(x=>[`${DT(x.d)} — ${x.desc||x.ref||''}`,Math.abs(x.amt)]),['TIMING DIFFERENCES — ALSO IN BRS','Bank Amount','Ledger Amount'],...r.ti.map(x=>[`${DT(x.b.d)} / ${DT(x.l.d)} — ${x.b.desc||x.l.desc||x.b.ref||''}`,Math.abs(x.b.amt),Math.abs(x.l.amt)])];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(st),'Reconciliation Statement');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Bank Date','Ledger Date','Amount','Description','Confidence'],...r.ma.map(x=>[DT(x.b.d),DT(x.l.d),x.b.amt,x.b.desc,x.score+'%'])]),'Matched');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Bank Date','Ledger Date','Bank Amount','Ledger Amount','Direction','Reason'],...r.ti.map(x=>[DT(x.b.d),DT(x.l.d),x.b.amt,x.l.amt,DIR(x.b),x.reason])]),'Timing Differences');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Bank Items','Ledger Items','Bank Total','Ledger Total','Basis'],...r.grouped.map(x=>[x.bs.length,x.ls.length,SUM(x.bs),SUM(x.ls),x.basis])]),'Grouped Matches');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Date','Amount','Entry A','Entry B','Assessment'],...r.reversals.map(x=>[DT(x.a.d),Math.abs(x.a.amt),x.a.desc,x.b.desc,'Confirmed reversal — excluded from BRS'])]),'Reversals');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Source','Date','Amount','Description','Direction','BRS'],...r.unB.map(x=>['Bank',DT(x.d),x.amt,x.desc,DIR(x),'Yes']),...r.unL.map(x=>['Ledger',DT(x.d),x.amt,x.desc,DIR(x),'Yes'])]),'Exceptions');
 XLSX.writeFile(wb,'ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
async function pdf(){
 try{
  if(!(window.jspdf&&window.jspdf.jsPDF))await new Promise((ok,no)=>{let s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  if(!window.html2canvas)await new Promise((ok,no)=>{let s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  const canvas=await html2canvas($('report'),{scale:2,useCORS:true,backgroundColor:'#fff'}),doc=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),w=194,margin=8,srcH=Math.floor(canvas.width*(281/w));let y=margin,srcY=0;
  while(srcY<canvas.height){const h=Math.min(srcH,canvas.height-srcY),slice=document.createElement('canvas');slice.width=canvas.width;slice.height=h;slice.getContext('2d').drawImage(canvas,0,srcY,canvas.width,h,0,0,canvas.width,h);doc.addImage(slice.toDataURL('image/png'),'PNG',margin,margin,w,h*w/canvas.width);srcY+=h;if(srcY<canvas.height)doc.addPage()}
  doc.save('ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.pdf');
 }catch(e){alert('PDF download failed. Please use Print / Save as PDF. Error: '+e.message)}
}
function install(){
 const r=$('report');if(!r||!r.innerHTML)return;
 let old=document.getElementById('phase1-toolbar');if(old)old.remove();
 const b=document.createElement('div');b.id='phase1-toolbar';b.className='export-toolbar no-print';b.style.cssText='display:flex;gap:10px;margin:0 0 12px;';b.innerHTML='<button class="export-btn export-excel">Download Excel</button><button class="export-btn export-pdf">Download PDF</button>';
 r.prepend(b);b.querySelector('.export-excel').onclick=excel;b.querySelector('.export-pdf').onclick=pdf;
}
window.buildStatement=buildStatement;
const go=$('go');if(go)go.onclick=runPhase1;
const printBtn=$('print');if(printBtn)printBtn.onclick=()=>{$('statementPanel').classList.remove('hidden');buildStatement();window.print()};
new MutationObserver(()=>setTimeout(install,0)).observe($('report'),{childList:true});
})();