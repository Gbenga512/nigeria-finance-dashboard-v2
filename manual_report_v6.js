(function(){
  if(window.__RECONAI_MANUAL_V6__) return;
  window.__RECONAI_MANUAL_V6__=true;

  const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const amt=x=>Number(x?.r?.amt ?? x?.amt ?? 0)||0;
  const desc=x=>x?.r?.desc ?? x?.desc ?? '';
  const ref=x=>x?.r?.ref ?? x?.ref ?? '';
  const dat=x=>x?.r?.d ?? x?.d ?? '';
  const fmtDate=v=>{try{const d=typeof date==='function'?date(v):new Date(v);return d&&!isNaN(d)?d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')}catch(e){return String(v??'')}};
  const sum=a=>(a||[]).reduce((t,x)=>t+amt(x),0);

  function render(){
    if(!window.S || !S.r || !S.bank || !S.ledger || !document.getElementById('report')) return false;
    const r=S.r;
    const unmatched=r.un||[];
    const gl=unmatched.filter(x=>x.src==='Ledger' && !/reversal|self-cancelling|net effect is zero/i.test(x.why||''));
    const bank=unmatched.filter(x=>x.src==='Bank');
    const glCredit=gl.filter(x=>amt(x)>=0), glDebit=gl.filter(x=>amt(x)<0);
    const bankCredit=bank.filter(x=>amt(x)>=0), bankDebit=bank.filter(x=>amt(x)<0);
    const charges=bank.filter(x=>/fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax/i.test(desc(x)+' '+ref(x)));
    const chargeValue=sum(charges.map(x=>({r:{amt:Math.abs(amt(x))}})));
    const totalBank=sum(S.bank), totalLedger=sum(S.ledger);
    const ledgerDebits=S.ledger.filter(x=>Number(x.amt)<0).reduce((a,x)=>a+Math.abs(Number(x.amt)||0),0);
    const ledgerCredits=S.ledger.filter(x=>Number(x.amt)>=0).reduce((a,x)=>a+Number(x.amt||0),0);
    function closing(m,fallback){try{const c=m?.cols?.balance;if(c>=0){for(let i=(m.rows||[]).length-1;i>=0;i--){const v=m.rows[i]?.[c];if(String(v??'').trim()!=='')return Number(typeof num==='function'?num(v):v)||0;}}}catch(e){}return fallback;}
    const bankClosing=closing(S.bm,totalBank), glClosing=closing(S.lm,ledgerCredits-ledgerDebits);
    const glOpening=glClosing-ledgerCredits+ledgerDebits;
    const addGL=sum(glCredit), lessGL=Math.abs(sum(glDebit));
    const addBank=sum(bankCredit.filter(x=>!charges.includes(x))), lessBank=Math.abs(sum(bankDebit.filter(x=>!charges.includes(x))));
    const computed=glClosing+addGL-lessGL+addBank-lessBank-chargeValue;
    const variance=computed-bankClosing;
    const dates=S.bank.map(x=>x.d).filter(Boolean).map(v=>typeof date==='function'?date(v):new Date(v)).filter(d=>d&&!isNaN(d)).sort((a,b)=>a-b);
    const end=dates.length?dates[dates.length-1].toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'Period end';
    const opening=dates.length?new Date(dates[0].getTime()-86400000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'Opening balance';
    const row=(d,p,rf,a)=>`<tr><td>${esc(d)}</td><td>${esc(p)}</td><td>${esc(rf)}</td><td style="text-align:right">${money(a)}</td></tr>`;
    const rows=a=>(a||[]).map(x=>row(fmtDate(dat(x)),desc(x),ref(x),amt(x))).join('')||'<tr><td colspan="4">(none)</td></tr>';
    const status=Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED';
    document.getElementById('report').innerHTML=`<div class="report-head"><h2 style="margin-bottom:4px">Chorus Energy Limited</h2><h3 style="margin:4px 0">Bank Reconciliation Statement as at ${end}</h3><div>Main STERLING BANK</div></div>
    <div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th style="text-align:right">Amount (₦)</th></tr></thead><tbody>
    ${row('',`Balance as per GL - Opening (${opening})`,'',glOpening)}${row('',`Add: Total Ledger Debits - ${end}`,'',ledgerDebits)}${row('',`Less: Total Ledger Credits - ${end}`,'',-ledgerCredits)}${row('',`Balance as per GL - Closing (${end})`,'',glClosing)}</tbody></table></div>
    <h3>ADD:</h3><h4>Credit items in GL but not in Bank statement</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th style="text-align:right">Amount (₦)</th></tr></thead><tbody>${rows(glCredit)}<tr><th colspan="3">Total</th><th style="text-align:right">${money(addGL)}</th></tr></tbody></table></div>
    <h4>Credit items in Bank but not in GL</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th style="text-align:right">Amount (₦)</th></tr></thead><tbody>${rows(bankCredit.filter(x=>!charges.includes(x)))}<tr><th colspan="3">Total</th><th style="text-align:right">${money(addBank)}</th></tr></tbody></table></div>
    <h3>LESS:</h3><h4>Debit items in GL but not in Bank statement</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th style="text-align:right">Amount (₦)</th></tr></thead><tbody>${rows(glDebit)}<tr><th colspan="3">Total</th><th style="text-align:right">${money(lessGL)}</th></tr></tbody></table></div>
    <h4>Debit items in Bank statement but not in GL</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th style="text-align:right">Amount (₦)</th></tr></thead><tbody>${rows(bankDebit.filter(x=>!charges.includes(x)))}<tr><th colspan="3">Total</th><th style="text-align:right">${money(lessBank)}</th></tr></tbody></table></div>
    <div class="tablewrap" style="margin-top:14px"><table><tbody><tr><td colspan="3"><b>Less: Bank charges</b></td><td style="text-align:right"><b>${money(chargeValue)}</b></td></tr></tbody></table></div>
    <div class="tablewrap" style="margin-top:14px"><table><tbody><tr><th>Balance as per Bank Statement - ${end} (computed)</th><th style="text-align:right">${money(computed)}</th></tr><tr><td>Bank Statement Closing Balance - Main STERLING BANK</td><td style="text-align:right">${money(bankClosing)}</td></tr><tr><td><b>Variance</b></td><td style="text-align:right"><b>${money(variance)}</b></td></tr></tbody></table></div>
    <div class="${status==='RECONCILED'?'ok':'error'}" style="margin-top:14px"><b>Reconciliation status: ${status}</b><br>Variance: <b>${money(variance)}</b></div><p class="small">Prepared by: ____________________ &nbsp;&nbsp;&nbsp; Reviewed by: ____________________</p>`;
    return true;
  }

  function force(){if(render()) return;setTimeout(force,300);}
  document.addEventListener('click',function(e){const b=e.target?.closest?.('#print');if(!b)return;e.preventDefault();e.stopImmediatePropagation();try{document.querySelector('[data-t="statement"]')?.click();}catch(_){}force();},true);
  const report=document.getElementById('report');
  if(report){new MutationObserver(()=>{if(window.S?.r)render()}).observe(report,{childList:true,subtree:true});}
  window.addEventListener('load',force);
  force();
})();
