/* ReconAI — authoritative bank reconciliation working paper v7 */
(function(){
'use strict';
const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const amt=x=>Number(x?.amt||0)||0, desc=x=>String(x?.desc||''), ref=x=>String(x?.ref||'');
const sum=a=>(a||[]).reduce((t,x)=>t+amt(x),0), absSum=a=>(a||[]).reduce((t,x)=>t+Math.abs(amt(x)),0);
const credit=x=>amt(x)>0, debit=x=>amt(x)<0;
const fee=x=>/\b(vat|fee|fees|charge|charges|stamp|nip|rtgs|amf|processing|commission|levy|tax|emt|sms|bank charge|form a charge|comm\s*chrg)\b/i.test(desc(x));
const date=v=>{const d=v instanceof Date?v:new Date(v);return d&&!isNaN(d)?d:null};
const fd=v=>{const d=date(v);return d?d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')};
const ordinal=n=>{const m=n%100;return n+(m>=11&&m<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));};
const balances=m=>{try{const c=m?.cols?.balance;if(c==null||c<0)return{opening:null,closing:null};const v=(m.rows||[]).map(r=>Number(r[c])).filter(Number.isFinite);return{opening:v.length?v[0]:null,closing:v.length?v[v.length-1]:null};}catch(e){return{opening:null,closing:null}}};
const periodEnd=()=>{const a=[...(window.S?.bank||[]),...(window.S?.ledger||[])].map(x=>date(x.d)).filter(Boolean).sort((a,b)=>a-b);return a[a.length-1]||new Date()};
const row=x=>`<tr><td>${esc(fd(x?.d))}</td><td>${esc(desc(x))}</td><td>${esc(ref(x))}</td><td class="amt">${money(amt(x))}</td></tr>`;
const block=(title,items)=>`<tr class="bar"><td colspan="4"><b>${esc(title)}</b></td></tr>${items?.length?items.map(row).join(''):`<tr><td></td><td colspan="2">(none)</td><td class="amt">${money(0)}</td></tr>`}<tr class="subtotal"><td></td><td colspan="2"><b>Total - ${esc(title)}</b></td><td class="amt"><b>${money(absSum(items))}</b></td></tr>`;
function render(){
 const target=document.getElementById('report'); if(!target||!window.S?.r)return false;
 const S=window.S,r=S.r,bank=S.bank||[],ledger=S.ledger||[],end=periodEnd(),month=end.toLocaleDateString('en-NG',{month:'long',year:'numeric'});
 const gl=balances(S.lm),bb=balances(S.bm),glOpening=gl.opening,glClosing=gl.closing,bankClosing=bb.closing;
 const glOnly=(r.unL||[]), bankOnly=(r.unB||[]);
 const creditGL=glOnly.filter(credit),debitGL=glOnly.filter(debit);
 const creditBank=bankOnly.filter(x=>credit(x)&&!fee(x)),debitBank=bankOnly.filter(x=>debit(x)&&!fee(x)),charges=bankOnly.filter(fee);
 const computed=glClosing==null?sum(bank):(glClosing+sum(creditGL)+sum(creditBank)-absSum(debitGL)-absSum(debitBank)-absSum(charges));
 const confirmed=bankClosing==null?computed:bankClosing,variance=computed-confirmed;
 const openingDate=new Date(end.getFullYear(),end.getMonth(),0);
 const reversalMemo=r.reversals?.length?`${r.reversals.length} failed/reversed (self-cancelling) transfer group(s) identified.`:'No failed/reversed (self-cancelling) transfer groups identified.';
 target.innerHTML=`<style>
 #report .working{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;max-width:1100px;margin:auto;font-size:11px}
 #report .working h1{text-align:center;font-size:15px;margin:0 0 3px;font-weight:800}
 #report .working .title{text-align:center;font-size:12px;font-weight:700;margin:0 0 3px}
 #report .working .bank{text-align:center;font-size:12px;font-weight:700;margin:0 0 10px}
 #report .working table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 7px}
 #report .working th,#report .working td{padding:4px 6px;border-bottom:1px solid #aaa;vertical-align:top;line-height:1.15}
 #report .working th:nth-child(1),#report .working td:nth-child(1){width:18%}
 #report .working th:nth-child(2),#report .working td:nth-child(2){width:58%}
 #report .working th:nth-child(3),#report .working td:nth-child(3){width:8%}
 #report .working th:nth-child(4),#report .working td:nth-child(4){width:16%}
 #report .working .head th{background:#d9d9d9;border-top:2px solid #777;border-bottom:2px solid #777;font-weight:800}
 #report .working .bar td{background:#d3d3d3;border-top:2px solid #777;border-bottom:2px solid #777;font-weight:800}
 #report .working .subtotal td{background:#e9e9e9;font-weight:700}
 #report .working .grand td{background:#cfcfcf;border-top:2px solid #666;font-weight:800}
 #report .working .amt{text-align:right;white-space:nowrap}
 #report .working .memo{font-style:italic;margin:8px 0 12px}
 #report .working .status{padding:8px;border:1px solid #777;font-weight:800;margin-top:10px}
 @media print{#report .working{font-size:9px}#report .working th,#report .working td{padding:3px 4px}}
 </style><div class="working">
 <h1>CHORUS ENERGY LIMITED</h1>
 <div class="title">Bank Reconciliation Statement as at ${esc(ordinal(end.getDate())+' '+end.toLocaleDateString('en-NG',{month:'long',year:'numeric'}))}</div>
 <div class="bank">Main STERLING BANK</div>
 <table><tr class="head"><th>Date</th><th>Particulars</th><th>Ref</th><th class="amt">Amount (₦)</th></tr>
 <tr><td></td><td>Balance as per GL - Opening (${esc(fd(openingDate))})</td><td></td><td class="amt">${glOpening==null?'—':money(glOpening)}</td></tr>
 <tr><td></td><td>Add: Total Ledger Debits - ${esc(month)} (Sage)</td><td></td><td class="amt">${money(absSum(ledger.filter(debit)))}</td></tr>
 <tr><td></td><td>Less: Total Ledger Credits - ${esc(month)} (Sage)</td><td></td><td class="amt">${money(-absSum(ledger.filter(credit)))}</td></tr>
 <tr class="grand"><td></td><td>Balance as per GL - Closing (${esc(fd(end))})</td><td></td><td class="amt">${glClosing==null?money(sum(ledger)):money(glClosing)}</td></tr></table>
 <table><tr class="bar"><td colspan="4"><b>ADD:</b></td></tr>
 ${block('Credit items in GL but not in Bank statement',creditGL)}
 ${block('Credit items in Bank but not in GL',creditBank)}
 <tr class="bar"><td colspan="4"><b>LESS:</b></td></tr>
 ${block('Debit items in GL but not in Bank statement',debitGL)}
 ${block('Debit items in Bank statement but not in GL',debitBank)}
 <tr><td></td><td colspan="2"><b>Less: Bank charges</b> (all bank-fee lines from bank statement)</td><td class="amt"><b>${money(absSum(charges))}</b></td></tr>
 <tr class="grand"><td></td><td colspan="2"><b>Balance as per Bank Statement - ${esc(fd(end))} (computed)</b></td><td class="amt"><b>${money(computed)}</b></td></tr>
 <tr><td></td><td colspan="2"><b>Bank Statement Closing Balance (per Sterling Bank, confirmed)</b></td><td class="amt"><b>${money(confirmed)}</b></td></tr>
 <tr class="grand"><td></td><td colspan="2"><b>Variance</b></td><td class="amt"><b>${money(variance)}</b></td></tr></table>
 <div class="memo"><b>Memo:</b> ${esc(reversalMemo)}</div>
 <div class="status">Reconciliation status: ${Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED'}<br>Variance: ${money(variance)}</div>
 <p>Prepared by: ______________________________ &nbsp;&nbsp;&nbsp; Reviewed by: ______________________________</p>
 </div>`;
 return true;
}
window.manualReport=render;
function hook(){
 if(!window.S?.r)return;
 render();
 const tab=document.querySelector('[data-t="statement"]');
 if(tab&&!tab.__reconHook){tab.__reconHook=true;tab.addEventListener('click',()=>setTimeout(render,20));}
 const btn=document.getElementById('print');
 if(btn&&!btn.__reconHook){btn.__reconHook=true;btn.addEventListener('click',()=>setTimeout(render,20),true);}
}
[100,300,700,1500,3000,5000].forEach(ms=>setTimeout(hook,ms));
const mo=new MutationObserver(()=>setTimeout(hook,0));
mo.observe(document.body,{childList:true,subtree:true});
})();
