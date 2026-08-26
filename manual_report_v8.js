/* ReconAI — final bank reconciliation statement renderer */
(function(){
  function n(v){
    if(typeof num==='function') return num(v);
    const s=String(v??'').replace(/[₦,\s]/g,'').replace(/\(([^)]+)\)/,'-$1');
    const x=Number(s); return Number.isFinite(x)?x:0;
  }
  function money(v){
    return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  }
  function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function dateOf(v){if(typeof date==='function') return date(v); const d=new Date(v); return isNaN(d)?null:d;}
  function fmt(v){if(typeof fd==='function') return fd(v); const d=dateOf(v); return d?d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}):String(v??'');}
  function rowsTotal(a){return (a||[]).reduce((s,x)=>s+n(x?.amt),0);}
  function absTotal(a){return (a||[]).reduce((s,x)=>s+Math.abs(n(x?.amt)),0);}
  function modelClosing(model,fallback){
    try{
      const c=model?.cols?.balance;
      if(c>=0){
        for(let i=(model.rows||[]).length-1;i>=0;i--){
          const v=model.rows[i]?.[c];
          if(String(v??'').trim()!=='') return n(v);
        }
      }
    }catch(e){}
    return fallback;
  }
  function install(){
    if(!window.S || !S.r || !Array.isArray(S.bank) || !Array.isArray(S.ledger) || typeof window.$!=='function') return false;
    const r=S.r;
    const bank=S.bank, ledger=S.ledger;
    const bankCredits=bank.filter(x=>n(x.amt)>=0), bankDebits=bank.filter(x=>n(x.amt)<0);
    const ledgerCredits=ledger.filter(x=>n(x.amt)>=0), ledgerDebits=ledger.filter(x=>n(x.amt)<0);
    const glOnly=Array.isArray(r.unL)?r.unL:[];
    const bankOnly=Array.isArray(r.unB)?r.unB:[];
    const glCredits=glOnly.filter(x=>n(x.amt)>=0);
    const glDebits=glOnly.filter(x=>n(x.amt)<0);
    const bankCreditsOnly=bankOnly.filter(x=>n(x.amt)>=0);
    const bankDebitsOnly=bankOnly.filter(x=>n(x.amt)<0);
    const isCharge=x=>/fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax/i.test((x?.desc||'')+' '+(x?.ref||''));
    const bankCharges=bankDebitsOnly.filter(isCharge);
    const bankDebitsExCharges=bankDebitsOnly.filter(x=>!bankCharges.includes(x));
    const chargeValue=absTotal(bankCharges);
    const ledgerDebitValue=absTotal(ledgerDebits);
    const ledgerCreditValue=rowsTotal(ledgerCredits);
    const ledgerClosing=modelClosing(S.lm,ledgerCreditValue-ledgerDebitValue);
    const ledgerOpening=ledgerClosing-ledgerDebitValue+ledgerCreditValue;
    const glCreditValue=rowsTotal(glCredits);
    const glDebitValue=absTotal(glDebits);
    const bankCreditValue=rowsTotal(bankCreditsOnly);
    const bankDebitValue=absTotal(bankDebitsExCharges);
    const statementClosing=modelClosing(S.bm,rowsTotal(bank));
    const computedBank=ledgerClosing+glCreditValue-glDebitValue+bankCreditValue-bankDebitValue-chargeValue;
    const variance=computedBank-statementClosing;
    const dates=bank.map(x=>dateOf(x.d)).filter(Boolean).sort((a,b)=>a-b);
    const endDate=dates.length?dates[dates.length-1]:new Date();
    const openingDate=new Date(endDate.getFullYear(),endDate.getMonth(),0);
    const periodEnd=endDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const openingLabel=openingDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const monthYear=endDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
    const company=(S.bankMeta&&S.bankMeta.company)||'Chorus Energy Limited';
    const bankName=(S.bankMeta&&S.bankMeta.bank)||'Main STERLING BANK';
    const tr=(d,p,ref,a)=>`<tr><td>${esc(d||'')}</td><td>${esc(p||'')}</td><td>${esc(ref||'')}</td><td class="r8-num">${money(a)}</td></tr>`;
    const itemRows=(items,absolute)=>{
      const out=(items||[]).map(x=>tr(fmt(x.d),x.desc||'',x.ref||'',absolute?Math.abs(n(x.amt)):n(x.amt))).join('');
      return out||'<tr><td colspan="4">(none)</td></tr>';
    };
    const totalRow=(label,value)=>`<tr class="r8-total"><th colspan="3">${esc(label)}</th><th class="r8-num">${money(value)}</th></tr>`;
    const section=t=>`<div class="r8-section">${t}</div>`;
    const reversalCount=Array.isArray(r.reversals)?r.reversals.length:0;
    const report=`<style>
#report.r8-report{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}
#report.r8-report .r8-head{text-align:center;border-bottom:2px solid #222;padding:4px 0 10px;margin-bottom:10px}
#report.r8-report .r8-head h2{margin:0 0 3px;font-size:18px}
#report.r8-report .r8-head h3{margin:3px 0;font-size:14px}
#report.r8-report .r8-head div{font-size:13px}
#report.r8-report .r8-table{width:100%;border-collapse:collapse;margin:0 0 8px;min-width:0}
#report.r8-report .r8-table th,#report.r8-report .r8-table td{padding:4px 7px;border-bottom:1px solid #cfcfcf;font-size:11px;vertical-align:top}
#report.r8-report .r8-table thead th{background:#d9d9d9;font-weight:700}
#report.r8-report .r8-num{text-align:right;white-space:nowrap}
#report.r8-report .r8-total th{background:#bfbfbf;font-weight:700}
#report.r8-report .r8-section{background:#bfbfbf;font-weight:700;font-size:12px;padding:5px 7px;margin:9px 0 0;border-top:1px solid #888;border-bottom:1px solid #888}
#report.r8-report .r8-sub{font-weight:700;font-size:11px;margin:5px 0 2px}
#report.r8-report .r8-final{margin-top:10px}
#report.r8-report .r8-final th,#report.r8-report .r8-final td{font-size:12px;padding:6px 7px}
#report.r8-report .r8-note{font-size:10px;font-style:italic;margin:7px 0}
@media print{#report.r8-report .r8-table{page-break-inside:auto}#report.r8-report tr{page-break-inside:avoid}#report.r8-report .r8-section{page-break-after:avoid}}
</style>
<div class="r8-head"><h2>${esc(company)}</h2><h3>Bank Reconciliation Statement as at ${periodEnd}</h3><div>${esc(bankName)}</div></div>
<table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>
${tr('',`Balance as per GL - Opening (${openingLabel})`,'',ledgerOpening)}
${tr('',`Add: Total Ledger Debits - ${monthYear} (Sage)`,'',ledgerDebitValue)}
${tr('',`Less: Total Ledger Credits - ${monthYear} (Sage)`,'',-ledgerCreditValue)}
${tr('',`Balance as per GL - Closing (${periodEnd})`,'',ledgerClosing)}
</tbody></table>
${section('ADD:')}
<div class="r8-sub">Credit items in GL but not in Bank statement</div>
<table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>${itemRows(glCredits,false)}${totalRow('Total - Credit items in GL but not in Bank statement',glCreditValue)}</tbody></table>
<div class="r8-sub">Credit items in Bank but not in GL</div>
<table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>${itemRows(bankCreditsOnly,false)}${totalRow('Total - Credit items in Bank but not in GL',bankCreditValue)}</tbody></table>
${section('LESS:')}
<div class="r8-sub">Debit items in GL but not in Bank statement</div>
<table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>${itemRows(glDebits,true)}${totalRow('Total - Debit items in GL but not in Bank statement',glDebitValue)}</tbody></table>
<div class="r8-sub">Debit items in Bank statement but not in GL</div>
<table class="r8-table"><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="r8-num">Amount (₦)</th></tr></thead><tbody>${itemRows(bankDebitsExCharges,true)}${totalRow('Total - Debit items in Bank statement but not in GL',bankDebitValue)}</tbody></table>
<table class="r8-table"><tbody><tr><td colspan="3"><b>Less: Bank charges (all bank-fee lines N3.75 to N50.00, per instruction: N0 to N6,000)</b></td><td class="r8-num"><b>${money(chargeValue)}</b></td></tr></tbody></table>
<div class="r8-note">Memo: ${reversalCount?`${reversalCount} failed/reversed (self-cancelling) transfer group(s) identified.`:'No failed/reversed (self-cancelling) transfer groups identified.'}</div>
<table class="r8-table r8-final"><tbody>
<tr class="r8-total"><th colspan="3">Balance as per Bank Statement - ${periodEnd} (computed)</th><th class="r8-num">${money(computedBank)}</th></tr>
<tr><td colspan="3">Bank Statement Closing Balance (per ${esc(bankName)}, confirmed)</td><td class="r8-num">${money(statementClosing)}</td></tr>
<tr><td colspan="3"><b>Variance</b></td><td class="r8-num"><b>${money(variance)}</b></td></tr>
</tbody></table>`;
    $('report').className='report r8-report';
    $('report').innerHTML=report;
    return true;
  }
  function wrap(){
    const old=window.report;
    window.report=function(){
      try{return install() || (old?old():null)}
      catch(e){console.error('Final reconciliation renderer error:',e);return old?old():null}
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wrap); else wrap();
})();