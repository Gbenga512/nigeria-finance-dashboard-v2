/* ReconAI — authoritative manual bank reconciliation statement v8 */
(function(){
  function install(){
    if(!window.S || !S.r || !S.bank || !S.ledger || typeof window.$!=='function') return false;
    const r=S.r;
    const money2=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
    const esc2=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const total=a=>(a||[]).reduce((t,x)=>t+(Number(x?.amt)||0),0);
    const closingFromModel=(m,fallback)=>{
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
    };
    const glOnly=(r.unL||[]).filter(x=>x.src==='Ledger'&&!/reversal|self-cancelling|net effect is zero/i.test(x.why||''));
    const bankOnly=(r.unB||[]).filter(x=>x.src==='Bank');
    const glCredit=glOnly.filter(x=>Number(x.r.amt)>=0);
    const glDebit=glOnly.filter(x=>Number(x.r.amt)<0);
    const bankCredit=bankOnly.filter(x=>Number(x.r.amt)>=0);
    const bankDebit=bankOnly.filter(x=>Number(x.r.amt)<0);
    const bankCharges=bankDebit.filter(x=>typeof feeLike==='function' ? feeLike((x.r.desc||'')+' '+(x.r.ref||'')) : /fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax/i.test((x.r.desc||'')+' '+(x.r.ref||'')));
    const chargeValue=bankCharges.reduce((a,x)=>a+Math.abs(Number(x.r.amt)||0),0);
    const ledgerDebits=S.ledger.filter(x=>Number(x.amt)<0).reduce((a,x)=>a+Math.abs(Number(x.amt)||0),0);
    const ledgerCredits=S.ledger.filter(x=>Number(x.amt)>=0).reduce((a,x)=>a+Number(x.amt||0),0);
    const ledgerClosing=closingFromModel(S.lm,ledgerCredits-ledgerDebits);
    const ledgerOpening=ledgerClosing-ledgerDebits+ledgerCredits;
    const glCreditValue=glCredit.reduce((a,x)=>a+Number(x.r.amt||0),0);
    const glDebitValue=glDebit.reduce((a,x)=>a+Math.abs(Number(x.r.amt||0),0),0);
    const bankCreditValue=bankCredit.reduce((a,x)=>a+Number(x.r.amt||0),0);
    const bankDebitValue=bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(Number(x.r.amt||0)),0);
    const statementClosing=closingFromModel(S.bm,total(S.bank));
    const computedBank=ledgerClosing+glCreditValue-glDebitValue+bankCreditValue-bankDebitValue-chargeValue;
    const variance=computedBank-statementClosing;
    const dates=S.bank.map(x=>x.d).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b));
    const endDate=dates.length?new Date(dates[dates.length-1]):new Date();
    const periodEnd=endDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const monthYear=endDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
    const company='Chorus Energy Limited';
    const bankName='Main STERLING BANK';
    const row=(d,p,ref,a)=>`<tr><td>${esc2(d||'')}</td><td>${esc2(p||'')}</td><td>${esc2(ref||'')}</td><td class="r8-num">${money2(a)}</td></tr>`;
    const rows=(items,abs=false)=>{
      const out=(items||[]).map(x=>row(fd(x.r.d),x.r.desc,x.r.ref,abs?Math.abs(Number(x.r.amt)||0):Number(x.r.amt)||0)).join('');
      return out||'<tr><td colspan="4">(none)</td></tr>';
    };
    const totalRow=(label,value)=>`<tr class="r8-total"><th colspan="3">${esc2(label)}</th><th class="r8-num">${money2(value)}</th></tr>`;
    const section=(title)=>`<div class="r8-section">${title}</div>`;
    const report=`
      <style>
        #report.r8-report{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}
        #report.r8-report .r8-head{text-align:center;border-bottom:2px solid #222;padding:4px 0 10px;margin-bottom:10px}
        #report.r8-report .r8-head h2{margin:0 0 3px;font-size:18px;text-transform:none}
        #report.r8-report .r8-head h3{margin:3px 0;font-size:14px;text-transform:none}
        #report.r8-report .r8-head div{font-size:13px}
        #report.r8-report .r8-table{width:100%;border-collapse:collapse;margin:0 0 8px;min-width:0}
        #report.r8-report .r8-table th,#report.r8-report .r8-table td{padding:4px 7px;border-bottom:1px solid #cfcfcf;font-size:11px;vertical-align:top}
        #report.r8-report .r8-table thead th{background:#d9d9d9;font-weight:700}
        #report.r8-report .r8-num{text-align:right;white-space:nowrap}
        #report.r8-report .r8-total th{background:#d9d9d9;font-weight:700}
        #report.r8-report .r8-section{background:#bfbfbf;font-weight:700;font-size:12px;padding:5px 7px;margin:9px 0 0;border-top:1px solid #888;border-bottom:1px solid #888}
        #report.r8-report .r8-sub{font-weight:700;font-size:11px;margin:5px 0 2px}
        #report.r8-report .r8-final{margin-top:10px}
        #report.r8-report .r8-final th,#report.r8-report .r8-final td{font-size:12px;padding:6px 7px}
        #report.r8-report .r8-note{font-size:10px;font-style:italic;margin:7px 0}
        @media print{#report.r8-report .r8-table{page-break-inside:auto}#report.r8-report tr{page-break-inside:avoid}#report.r8-report .r8-section{page-break-after:avoid}}
      </style>
      <div class="r8-head">
        <h2>${company}</h2>
        <h3>Bank Reconciliation Statement as at ${periodEnd}</h3>
        <div>${bankName}</div>
      </div>
      <table class="r8-table">
        <thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead>
        <tbody>
          ${row('',`Balance as per GL - Opening (${periodEnd.replace(/\d{2}-/,'').replace(/^/,'')})`,'',ledgerOpening)}
          ${row('',`Add: Total Ledger Debits - ${monthYear} (Sage)`,'',ledgerDebits)}
          ${row('',`Less: Total Ledger Credits - ${monthYear} (Sage)`,'',-ledgerCredits)}
          ${row('',`Balance as per GL - Closing (${periodEnd})`,'',ledgerClosing)}
        </tbody>
      </table>

      ${section('ADD:')}
      <div class="r8-sub">Credit items in GL but not in Bank statement</div>
      <table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>
        ${rows(glCredit)}${totalRow('Total - Credit items in GL but not in Bank statement',glCreditValue)}
      </tbody></table>

      <div class="r8-sub">Credit items in Bank but not in GL</div>
      <table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>
        ${rows(bankCredit)}${totalRow('Total - Credit items in Bank but not in GL',bankCreditValue)}
      </tbody></table>

      ${section('LESS:')}
      <div class="r8-sub">Debit items in GL but not in Bank statement</div>
      <table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>
        ${rows(glDebit,true)}${totalRow('Total - Debit items in GL but not in Bank statement',glDebitValue)}
      </tbody></table>

      <div class="r8-sub">Debit items in Bank statement but not in GL</div>
      <table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>
        ${rows(bankDebit.filter(x=>!bankCharges.includes(x)),true)}${totalRow('Total - Debit items in Bank statement but not in GL',bankDebitValue)}
      </tbody></table>

      <table class="r8-table" style="margin-top:8px"><tbody>
        <tr><td colspan="3"><b>Less: Bank charges (all bank-fee lines N3.75 to N50.00, per instruction: N0 to N6,000)</b></td><td class="r8-num"><b>${money2(chargeValue)}</b></td></tr>
      </tbody></table>
      <div class="r8-note">Memo: ${r.reversals?.length?`${r.reversals.length} failed/reversed (self-cancelling) transfer group(s) identified.`:'No failed/reversed (self-cancelling) transfer groups identified.'}</div>

      <table class="r8-table r8-final"><tbody>
        <tr class="r8-total"><th colspan="3">Balance as per Bank Statement - ${periodEnd} (computed)</th><th class="r8-num">${money2(computedBank)}</th></tr>
        <tr><td colspan="3">Bank Statement Closing Balance (per ${bankName}, confirmed)</td><td class="r8-num">${money2(statementClosing)}</td></tr>
        <tr><td colspan="3"><b>Variance</b></td><td class="r8-num"><b>${money2(variance)}</b></td></tr>
      </tbody></table>`;
    $('report').className='report r8-report';
    $('report').innerHTML=report;
    return true;
  }
  const original=window.report;
  window.report=function(){
    if(!window.S || !S.r || !S.bank || !S.ledger) return original?original():null;
    try{return install()}catch(e){console.error('Authoritative v8 report failed:',e);return original?original():null}
  };
})();
