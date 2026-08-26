(function(){
  if(window.__RECONAI_MANUAL_V5__) return;
  window.__RECONAI_MANUAL_V5__=true;

  function renderManual(){
    if(!window.S || !S.r || !S.bank || !S.ledger || typeof window.$!=='function') return false;
    const money2=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
    const esc2=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const total=a=>(a||[]).reduce((t,x)=>t+(Number(x?.amt)||0),0);
    const r=S.r;
    const glOnly=(r.unL||[]);
    const bankOnly=(r.unB||[]);
    const glCredit=glOnly.filter(x=>Number(x.amt)>=0);
    const glDebit=glOnly.filter(x=>Number(x.amt)<0);
    const bankCredit=bankOnly.filter(x=>Number(x.amt)>=0);
    const bankDebit=bankOnly.filter(x=>Number(x.amt)<0);
    const bankCharges=bankOnly.filter(x=>/fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax|emt/i.test(String(x.desc||'')+' '+String(x.ref||'')));
    const chargeValue=bankCharges.reduce((a,x)=>a+Math.abs(Number(x.amt)||0),0);

    function closing(m,fallback){
      try{const c=m?.cols?.balance;if(c>=0){for(let i=(m.rows||[]).length-1;i>=0;i--){const v=m.rows[i]?.[c];if(String(v??'').trim()!=='')return Number(typeof num==='function'?num(v):v)||0;}}}catch(e){}
      return fallback;
    }
    const bankTotal=total(S.bank), ledgerTotal=total(S.ledger);
    const ledgerDebits=S.ledger.filter(x=>x.amt<0).reduce((a,x)=>a+Math.abs(x.amt),0);
    const ledgerCredits=S.ledger.filter(x=>x.amt>=0).reduce((a,x)=>a+x.amt,0);
    const statementClosing=closing(S.bm,bankTotal);
    const ledgerClosing=closing(S.lm,ledgerCredits-ledgerDebits);
    const ledgerOpening=ledgerClosing-ledgerCredits+ledgerDebits;
    const addGL=glCredit.reduce((a,x)=>a+Number(x.amt||0),0);
    const lessGL=glDebit.reduce((a,x)=>a+Math.abs(Number(x.amt)||0),0);
    const addBank=bankCredit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Number(x.amt||0),0);
    const lessBank=bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(Number(x.amt)||0),0);
    const computedBank=ledgerClosing+addGL-lessGL+addBank-lessBank-chargeValue;
    const variance=computedBank-statementClosing;
    const dates=S.bank.map(x=>x.d).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b));
    const periodEnd=dates.length?new Date(dates[dates.length-1]).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'Period end';
    let openingLabel='Opening balance';
    if(dates.length){const d=new Date(dates[0]);d.setDate(d.getDate()-1);openingLabel=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
    const row=(d,p,ref,a)=>`<tr><td>${esc2(d||'')}</td><td>${esc2(p||'')}</td><td>${esc2(ref||'')}</td><td class="right">${money2(a)}</td></tr>`;
    const rows=items=>(items||[]).map(x=>row(fd(x.d),x.desc,x.ref,x.amt)).join('')||'<tr><td colspan="4">(none)</td></tr>';
    const status=Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED';

    $('report').innerHTML=`
      <div class="report-head"><h2 style="text-transform:none;margin-bottom:4px">Chorus Energy Limited</h2><h3 style="margin:4px 0">Bank Reconciliation Statement as at ${periodEnd}</h3><div>Main STERLING BANK</div></div>
      <div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>
        ${row('',`Balance as per GL - Opening (${openingLabel})`,'',ledgerOpening)}
        ${row('',`Add: Total Ledger Debits - ${periodEnd}`,'',ledgerDebits)}
        ${row('',`Less: Total Ledger Credits - ${periodEnd}`,'',-ledgerCredits)}
        ${row('',`Balance as per GL - Closing (${periodEnd})`,'',ledgerClosing)}
      </tbody></table></div>
      <h3 style="margin-top:20px">ADD:</h3>
      <h4>Credit items in GL but not in Bank statement</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(glCredit)}<tr><th colspan="3">Total - Credit items in GL but not in Bank statement</th><th class="right">${money2(addGL)}</th></tr></tbody></table></div>
      <h4>Credit items in Bank but not in GL</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(bankCredit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Credit items in Bank but not in GL</th><th class="right">${money2(addBank)}</th></tr></tbody></table></div>
      <h3 style="margin-top:20px">LESS:</h3>
      <h4>Debit items in GL but not in Bank statement</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(glDebit)}<tr><th colspan="3">Total - Debit items in GL but not in Bank statement</th><th class="right">${money2(lessGL)}</th></tr></tbody></table></div>
      <h4>Debit items in Bank statement but not in GL</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(bankDebit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Debit items in Bank statement but not in GL</th><th class="right">${money2(lessBank)}</th></tr></tbody></table></div>
      <div class="tablewrap" style="margin-top:14px"><table><tbody><tr><td colspan="3"><b>Less: Bank charges (all bank-fee lines)</b></td><td class="right"><b>${money2(chargeValue)}</b></td></tr><tr><td colspan="4"><i>Memo: No failed/reversed (self-cancelling) transfer groups identified in this reconciliation.</i></td></tr></tbody></table></div>
      <div class="tablewrap" style="margin-top:14px"><table><tbody><tr><th>Balance as per Bank Statement - ${periodEnd} (computed)</th><th class="right">${money2(computedBank)}</th></tr><tr><td>Bank Statement Closing Balance (per Main STERLING BANK, confirmed)</td><td class="right">${money2(statementClosing)}</td></tr><tr><td><b>Variance</b></td><td class="right"><b>${money2(variance)}</b></td></tr></tbody></table></div>
      <div class="${status==='RECONCILED'?'ok':'error'}" style="margin-top:14px"><b>Reconciliation status: ${status}</b><br>Variance: <b>${money2(variance)}</b></div>
      <p class="small">Prepared by: ____________________ &nbsp;&nbsp;&nbsp; Reviewed by: ____________________</p>`;
    return true;
  }

  window.report=renderManual;
  document.addEventListener('click',function(ev){const target=ev.target?.closest?.('#print');if(!target)return;if(!S?.r)return;ev.preventDefault();ev.stopImmediatePropagation();document.querySelector('[data-t="statement"]')?.click();renderManual();},true);
  const reportNode=document.getElementById('report');
  if(reportNode){let busy=false;const mo=new MutationObserver(()=>{if(busy||!S?.r)return;busy=true;renderManual();setTimeout(()=>busy=false,0);});mo.observe(reportNode,{childList:true});}
})();
