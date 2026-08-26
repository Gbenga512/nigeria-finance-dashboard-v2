(function(){
  const oldReport = window.report;
  window.report = function(){
    if(!window.S || !S.r || !S.bank || !S.ledger) return oldReport ? oldReport() : null;
    const money2=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
    const total=a=>(a||[]).reduce((t,x)=>t+(Number(x?.amt)||0),0);
    const esc2=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const r=S.r, bankTotal=total(S.bank), ledgerTotal=total(S.ledger);
    const ledgerDebits=S.ledger.filter(x=>x.amt<0).reduce((a,x)=>a+Math.abs(x.amt),0);
    const ledgerCredits=S.ledger.filter(x=>x.amt>=0).reduce((a,x)=>a+x.amt,0);
    const bankCredits=S.bank.filter(x=>x.amt>=0).reduce((a,x)=>a+x.amt,0);
    const bankDebits=S.bank.filter(x=>x.amt<0).reduce((a,x)=>a+Math.abs(x.amt),0);
    const glOnly=r.un.filter(x=>x.src==='Ledger'&&!/reversal|self-cancelling|net effect is zero/i.test(x.why||''));
    const bankOnly=r.un.filter(x=>x.src==='Bank');
    const glCredit=glOnly.filter(x=>x.r.amt>=0), glDebit=glOnly.filter(x=>x.r.amt<0);
    const bankCredit=bankOnly.filter(x=>x.r.amt>=0), bankDebit=bankOnly.filter(x=>x.r.amt<0);
    const bankCharges=bankOnly.filter(x=>/fee|charge|vat|stamp|nip|rtgs|sms|amf|remita|commission|levy|tax/i.test((x.r.desc||'')+' '+(x.r.ref||'')));
    const chargeValue=bankCharges.reduce((a,x)=>a+Math.abs(x.r.amt),0);
    function closingFromModel(m,fallback){try{const c=m?.cols?.balance;if(c>=0){for(let i=m.rows.length-1;i>=0;i--){const v=m.rows[i]?.[c];if(String(v??'').trim()!=='')return num(v);}}}catch(e){}return fallback;}
    const statementClosing=closingFromModel(S.bm,bankTotal);
    const ledgerClosing=closingFromModel(S.lm,ledgerCredits-ledgerDebits);
    const ledgerOpening=ledgerClosing-ledgerCredits+ledgerDebits;
    const computedBank=ledgerOpening-ledgerDebits+ledgerCredits+glCredit.reduce((a,x)=>a+x.r.amt,0)-glDebit.reduce((a,x)=>a+Math.abs(x.r.amt),0)+bankCredit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+x.r.amt,0)-bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(x.r.amt),0)-chargeValue;
    const variance=computedBank-statementClosing;
    const dates=S.bank.map(x=>x.d).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b));
    const periodEnd=dates.length?new Date(dates[dates.length-1]).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}):'Period end';
    const openingDate=dates.length?new Date(dates[0]);openingDate.setDate(openingDate.getDate()-1):new Date();
    const openingLabel=openingDate.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const company='Chorus Energy Limited',bankName='Main STERLING BANK';
    const row=(d,p,ref,a)=>`<tr><td>${esc2(d||'')}</td><td>${esc2(p||'')}</td><td>${esc2(ref||'')}</td><td class="right">${money2(a)}</td></tr>`;
    const rows=items=>(items||[]).map(x=>row(fd(x.r.d),x.r.desc,x.r.ref,x.r.amt)).join('')||'<tr><td colspan="4">(none)</td></tr>';
    const status=Math.abs(variance)<0.01&&glOnly.length===0&&bankOnly.filter(x=>!bankCharges.includes(x)).length===0?'RECONCILED':'REVIEW REQUIRED';
    $('report').innerHTML=`<div class="report-head"><h2>${company}</h2><h3>Bank Reconciliation Statement as at ${periodEnd}</h3><div>${bankName}</div></div>
<div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>
${row('',`Balance as per GL - Opening (${openingLabel})`,'',ledgerOpening)}
${row('',`Add: Total Ledger Debits - ${periodEnd}`,'',ledgerDebits)}
${row('',`Less: Total Ledger Credits - ${periodEnd}`,'',-ledgerCredits)}
${row('',`Balance as per GL - Closing (${periodEnd})`,'',ledgerClosing)}
</tbody></table></div>
<h3>ADD:</h3><h4>Credit items in GL but not in Bank statement</h4>
<div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(glCredit)}<tr><th colspan="3">Total - Credit items in GL but not in Bank statement</th><th class="right">${money2(glCredit.reduce((a,x)=>a+x.r.amt,0))}</th></tr></tbody></table></div>
<h4>Credit items in Bank but not in GL</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(bankCredit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Credit items in Bank but not in GL</th><th class="right">${money2(bankCredit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+x.r.amt,0))}</th></tr></tbody></table></div>
<h3>LESS:</h3><h4>Debit items in GL but not in Bank statement</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(glDebit)}<tr><th colspan="3">Total - Debit items in GL but not in Bank statement</th><th class="right">${money2(glDebit.reduce((a,x)=>a+Math.abs(x.r.amt),0))}</th></tr></tbody></table></div>
<h4>Debit items in Bank statement but not in GL</h4><div class="tablewrap"><table><thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr></thead><tbody>${rows(bankDebit.filter(x=>!bankCharges.includes(x)))}<tr><th colspan="3">Total - Debit items in Bank statement but not in GL</th><th class="right">${money2(bankDebit.filter(x=>!bankCharges.includes(x)).reduce((a,x)=>a+Math.abs(x.r.amt),0))}</th></tr></tbody></table></div>
<div class="tablewrap"><table><tbody><tr><td colspan="3"><b>Less: Bank charges (all bank-fee lines)</b></td><td class="right"><b>${money2(chargeValue)}</b></td></tr><tr><td colspan="4"><i>Memo: Net-zero/reversal entries are treated as internal GL control items and are not automatically presented as bank exceptions.</i></td></tr></tbody></table></div>
<div class="tablewrap"><table><tbody><tr><th>Balance as per Bank Statement - ${periodEnd} (computed)</th><th class="right">${money2(computedBank)}</th></tr><tr><td>Bank Statement Closing Balance (per ${bankName}, confirmed)</td><td class="right">${money2(statementClosing)}</td></tr><tr><td><b>Variance</b></td><td class="right"><b>${money2(variance)}</b></td></tr></tbody></table></div>
<div class="${status==='RECONCILED'?'ok':'error'}"><b>Reconciliation status: ${status}</b><br>Variance: <b>${money2(variance)}</b></div>
<p class="small">Prepared by: ____________________ &nbsp;&nbsp;&nbsp; Reviewed by: ____________________</p>`;
  };
})();
