(function(){
  function install(){
    if(!window.S || !S.r || !S.bank || !S.ledger || typeof window.$!=='function') return false;
    const money2=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
    const total=a=>(a||[]).reduce((t,x)=>t+(Number(x?.amt)||0),0);
    const esc2=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const r=S.r;
    const bankTotal=total(S.bank), ledgerTotal=total(S.ledger);
    const ledgerDebits=S.ledger.filter(x=>x.amt<0).reduce((a,x)=>a+Math.abs(x.amt),0);
    const ledgerCredits=S.ledger.filter(x=>x.amt>=0).reduce((a,x)=>a+x.amt,0);
    const glOnly=(r.un||[]).filter(x=>x.src==='Ledger'&&!/reversal|self-cancelling|net effect is zero/i.test(x.why||''));
    const bankOnly=(r.un||[]).filter(x=>x.src==='Bank');
    const glCredit=glOnly.filter(x=>Number(x.r.amt)>=0);
    const glDebit=glOnly.filter(x=>Number(x.r.amt)<0);
    const bankCredit=bankOnly.filter(x=>Number(x.r.amt)>=0);
    const bankDebit=bankOnly.filter(x=>Number(x.r.amt)<0);
    const bankCharges=bankOnly.filter(x=>/fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax/i.test((x.r.desc||'')+' '+(x.r.ref||'')));
    const chargeValue=bankCharges.reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0);

    function closingFromModel(m,fallback){
      try{
        const c=m?.cols?.balance;
        if(c>=0){
          for(let i=(m.rows||[]).length-1;i>=0;i--){
            const v=m.rows[i]?.[c];
            if(String(v??'').trim()!=='') return Number(typeof num==='function'?num(v):v)||0;
          }
        }
      }catch(e){}
      return fallback;
    }

    const statementClosing=closingFromModel(S.bm,bankTotal);
    const ledgerClosing=closingFromModel(S.lm,ledgerCredits-ledgerDebits);
    const ledgerOpening=ledgerClosing-ledgerCredits+ledgerDebits;
    const computedBank=ledgerClosing
      +glCredit.reduce((a,x)=>a+Number(x.r.amt||0),0)
      -glDebit.reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0)
      +bankCredit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Number(x.r.amt||0),0)
      -bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0)
      -chargeValue;
    const variance=computedBank-statementClosing;

    const dates=S.bank.map(x=>x.d).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b));
    const periodEnd=dates.length?new Date(dates[dates.length-1]).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'Period end';
    let openingLabel='Opening balance';
    if(dates.length){
      const openingDate=new Date(dates[0]);
      openingDate.setDate(openingDate.getDate()-1);
      openingLabel=openingDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    }

    const company='Chorus Energy Limited';
    const bankName='Main STERLING BANK';
    const row=(d,p,ref,a)=>`<tr><td>${esc2(d||'')}</td><td>${esc2(p||'')}</td><td>${esc2(ref||'')}</td><td class="right">${money2(a)}</td></tr>`;
    const rows=items=>(items||[]).map(x=>row(fd(x.r.d),x.r.desc,x.r.ref,x.r.amt)).join('')||'<tr><td colspan="4">(none)</td></tr>';
    const status=Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED';

    $('report').innerHTML=`
      <div class="report-head">
        <h2 style="text-transform:none;margin-bottom:4px">${company}</h2>
        <h3 style="margin:4px 0">Bank Reconciliation Statement as at ${periodEnd}</h3>
        <div>${bankName}</div>
      </div>

      <div class="tablewrap" style="margin-top:14px"><table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead>
        <tbody>
          ${row('',`Balance as per GL - Opening (${openingLabel})`,'',ledgerOpening)}
          ${row('',`Add: Total Ledger Debits - ${periodEnd}`,'',ledgerDebits)}
          ${row('',`Less: Total Ledger Credits - ${periodEnd}`,'',-ledgerCredits)}
          ${row('',`Balance as per GL - Closing (${periodEnd})`,'',ledgerClosing)}
        </tbody>
      </table></div>

      <h3 style="margin-top:20px">ADD:</h3>
      <h4>Credit items in GL but not in Bank statement</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead>
      <tbody>${rows(glCredit)}<tr><th colspan="3">Total - Credit items in GL but not in Bank statement</th><th class="right">${money2(glCredit.reduce((a,x)=>a+Number(x.r.amt||0),0))}</th></tr></tbody></table></div>

      <h4>Credit items in Bank but not in GL</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead>
      <tbody>${rows(bankCredit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Credit items in Bank but not in GL</th><th class="right">${money2(bankCredit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Number(x.r.amt||0),0))}</th></tr></tbody></table></div>

      <h3 style="margin-top:20px">LESS:</h3>
      <h4>Debit items in GL but not in Bank statement</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead>
      <tbody>${rows(glDebit)}<tr><th colspan="3">Total - Debit items in GL but not in Bank statement</th><th class="right">${money2(glDebit.reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0))}</th></tr></tbody></table></div>

      <h4>Debit items in Bank statement but not in GL</h4>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead>
      <tbody>${rows(bankDebit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Debit items in Bank statement but not in GL</th><th class="right">${money2(bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0))}</th></tr></tbody></table></div>

      <div class="tablewrap" style="margin-top:14px"><table><tbody>
        <tr><td colspan="3"><b>Less: Bank charges (all bank-fee lines)</b></td><td class="right"><b>${money2(chargeValue)}</b></td></tr>
        <tr><td colspan="4"><i>Memo: No failed/reversed (self-cancelling) transfer groups identified in this reconciliation.</i></td></tr>
      </tbody></table></div>

      <div class="tablewrap" style="margin-top:14px"><table><tbody>
        <tr><th>Balance as per Bank Statement - ${periodEnd} (computed)</th><th class="right">${money2(computedBank)}</th></tr>
        <tr><td>Bank Statement Closing Balance (per ${bankName}, confirmed)</td><td class="right">${money2(statementClosing)}</td></tr>
        <tr><td><b>Variance</b></td><td class="right"><b>${money2(variance)}</b></td></tr>
      </tbody></table></div>

      <div class="${status==='RECONCILED'?'ok':'error'}" style="margin-top:14px"><b>Reconciliation status: ${status}</b><br>Variance: <b>${money2(variance)}</b></div>
      <p class="small">Prepared by: ____________________ &nbsp;&nbsp;&nbsp; Reviewed by: ____________________</p>`;
    return true;
  }

  const originalReport=window.report;
  window.report=function(){
    if(!window.S || !S.r || !S.bank || !S.ledger) return originalReport ? originalReport() : null;
    try{ return install(); }catch(e){ console.error('Manual reconciliation report failed:',e); if(originalReport) originalReport(); }
  };

  // The original page attaches a normal click handler to the report button.
  // Capture this click first so the manual statement is always rendered.
  document.addEventListener('click',function(ev){
    const target=ev.target && ev.target.closest ? ev.target.closest('#print') : null;
    if(!target) return;
    if(!window.S || !S.r || !S.bank || !S.ledger) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try{
      const tab=document.querySelector('[data-t="statement"]');
      if(tab) tab.click();
      install();
    }catch(e){console.error('Manual report button failed:',e);}
  },true);
})();
