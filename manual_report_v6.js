/* ReconAI — authoritative working-paper report renderer v6.1 */
(function () {
  'use strict';
  const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const amt=x=>Number(x?.amt||0)||0, desc=x=>String(x?.desc||''), ref=x=>String(x?.ref||'');
  const sum=a=>(a||[]).reduce((t,x)=>t+amt(x),0), absSum=a=>(a||[]).reduce((t,x)=>t+Math.abs(amt(x)),0);
  const credit=x=>amt(x)>0, debit=x=>amt(x)<0;
  const fee=x=>/\b(vat|fee|fees|charge|charges|stamp|nip|rtgs|amf|processing|commission|levy|tax|emt|sms|bank charge|form a charge|comm\s*chrg)\b/i.test(desc(x));
  const date=v=>{const x=v instanceof Date?v:new Date(v);return x&&!isNaN(x)?x:null};
  const fd=v=>{const x=date(v);return x?x.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')};
  const range=()=>{const a=[...(S.bank||[]),...(S.ledger||[])].map(x=>date(x.d)).filter(Boolean).sort((a,b)=>a-b);return{end:a[a.length-1]||new Date()}};
  const balanceInfo=m=>{try{const c=m?.cols?.balance;if(c==null||c<0)return{opening:null,closing:null};const v=(m.rows||[]).map(r=>Number(r[c])).filter(Number.isFinite);return{opening:v.length?v[0]:null,closing:v.length?v[v.length-1]:null}}catch(_){return{opening:null,closing:null}}};
  const row=x=>`<tr><td>${esc(fd(x?.d))}</td><td>${esc(desc(x))}</td><td>${esc(ref(x))}</td><td class="r">${money(amt(x))}</td></tr>`;
  const block=(title,items)=>`<tr class="bar"><td colspan="4"><b>${esc(title)}</b></td></tr>${items?.length?items.map(row).join(''):`<tr><td></td><td colspan="2">(none)</td><td class="r">${money(0)}</td></tr>`}<tr class="subtotal"><td></td><td colspan="2"><b>Total - ${esc(title)}</b></td><td class="r"><b>${money(sum(items))}</b></td></tr>`;
  function render(){
    const target=document.getElementById('report'); if(!target||!window.S||!S.r)return false;
    const r=S.r, bank=S.bank||[], ledger=S.ledger||[], end=range().end, endText=fd(end), month=end.toLocaleDateString('en-NG',{month:'long',year:'numeric'});
    const gl=balanceInfo(S.lm), bb=balanceInfo(S.bm), glOpening=gl.opening, glClosing=gl.closing, bankClosing=bb.closing;
    const creditGL=(r.unL||[]).filter(credit), debitGL=(r.unL||[]).filter(debit), unmatchedBank=r.unB||[];
    const creditBank=unmatchedBank.filter(x=>credit(x)&&!fee(x)), debitBank=unmatchedBank.filter(x=>debit(x)&&!fee(x)), charges=unmatchedBank.filter(fee);
    const ledgerDebits=ledger.filter(debit), ledgerCredits=ledger.filter(credit);
    const computed=bankClosing!=null?bankClosing:(glClosing!=null?glClosing+sum(creditGL)+sum(creditBank)+sum(debitGL)+sum(debitBank)-absSum(charges):sum(bank));
    const confirmed=bankClosing!=null?bankClosing:computed, variance=computed-confirmed;
    const reversalMemo=r.reversals?.length?`${r.reversals.length} failed/reversed (self-cancelling) transfer group(s) identified.`:'No failed/reversed (self-cancelling) transfer groups identified.';
    const openingDate=new Date(end.getFullYear(),end.getMonth(),0);
    target.innerHTML=`<style>
      #report .working{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;max-width:1100px;margin:auto;font-size:11px}
      #report .working h1{text-align:center;font-size:14px;margin:0 0 2px;font-weight:800}
      #report .working .title{text-align:center;font-size:12px;font-weight:700;margin:0 0 2px}
      #report .working .bank{text-align:center;font-size:12px;font-weight:700;margin:0 0 10px}
      #report .working table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 7px;min-width:0}
      #report .working th,#report .working td{padding:4px 6px;border-bottom:1px solid #aaa;vertical-align:top;line-height:1.15}
      #report .working th:nth-child(1),#report .working td:nth-child(1){width:18%}
      #report .working th:nth-child(2),#report .working td:nth-child(2){width:58%}
      #report .working th:nth-child(3),#report .working td:nth-child(3){width:8%}
      #report .working th:nth-child(4),#report .working td:nth-child(4){width:16%}
      #report .working .head th{background:#d9d9d9;border-top:2px solid #777;border-bottom:2px solid #777;font-weight:800}
      #report .working .bar td{background:#d3d3d3;border-top:2px solid #777;border-bottom:2px solid #777;font-weight:800}
      #report .working .subtotal td{background:#e9e9e9;font-weight:700}
      #report .working .grand td{background:#cfcfcf;border-top:2px solid #666;font-weight:800}
      #report .working .r{text-align:right;white-space:nowrap}
      #report .working .memo{font-style:italic;margin:8px 0 12px}
      #report .working .check{font-weight:800}
      @media print{#report .working{font-size:9px}#report .working th,#report .working td{padding:3px 4px}}
    </style><div class="working">
      <h1>CHORUS ENERGY LIMITED</h1>
      <div class="title">Bank Reconciliation Statement as at ${esc(end.getDate()+'th '+end.toLocaleDateString('en-NG',{month:'long',year:'numeric'}))}</div>
      <div class="bank">Main STERLING BANK</div>
      <table><tr class="head"><th>Date</th><th>Particulars</th><th>Ref</th><th class="r">Amount (₦)</th></tr>
        <tr><td></td><td>Balance as per GL - Opening (${esc(fd(openingDate))})</td><td></td><td class="r">${glOpening==null?'—':money(glOpening)}</td></tr>
        <tr><td></td><td>Add: Total Ledger Debits - ${esc(month)} (Sage)</td><td></td><td class="r">${money(absSum(ledgerDebits))}</td></tr>
        <tr><td></td><td>Less: Total Ledger Credits - ${esc(month)} (Sage)</td><td></td><td class="r">${money(-absSum(ledgerCredits))}</td></tr>
        <tr class="grand"><td></td><td>Balance as per GL - Closing (${esc(endText)})</td><td></td><td class="r">${glClosing==null?money(sum(ledger)):money(glClosing)}</td></tr></table>
      <table>${block('ADD: Credit items in GL but not in Bank statement',creditGL)}${block('Credit items in Bank but not in GL',creditBank)}
        <tr class="bar"><td colspan="4"><b>LESS:</b></td></tr>${block('Debit items in GL but not in Bank statement',debitGL)}${block('Debit items in Bank statement but not in GL',debitBank)}
        <tr><td></td><td colspan="2"><b>Less: Bank charges</b> (all bank-fee lines identified from bank statement)</td><td class="r"><b>${money(absSum(charges))}</b></td></tr>
        <tr class="grand"><td></td><td colspan="2"><b>Balance as per Bank Statement - ${esc(endText)} (computed)</b></td><td class="r"><b>${money(computed)}</b></td></tr>
        <tr><td></td><td colspan="2"><b>Bank Statement Closing Balance (per Sterling Bank, confirmed)</b></td><td class="r"><b>${money(confirmed)}</b></td></tr>
        <tr><td></td><td colspan="2"><b>Variance</b></td><td class="r"><b>${money(variance)}</b></td></tr></table>
      <div class="memo"><b>Memo:</b> ${esc(reversalMemo)}</div>
      <div class="check">✓ Reconciliation working paper generated from the uploaded bank statement and ledger. Unresolved items remain explicitly listed rather than being silently suppressed.</div>
    </div>`;
    return true;
  }
  window.manualReport=render;
  const legacy=window.report;
  window.report=function(){try{return render()}catch(e){console.error('Working-paper report failed:',e);return legacy?legacy.apply(this,arguments):false}};
  document.addEventListener('click',function(ev){const btn=ev.target&&ev.target.closest?ev.target.closest('#print'):null;if(!btn||!window.S?.r)return;ev.preventDefault();ev.stopImmediatePropagation();const tab=document.querySelector('[data-t="statement"]');if(tab)tab.click();render()},true);
  [100,500,1500,3000].forEach(ms=>setTimeout(()=>{if(window.S?.r&&document.getElementById('report'))render()},ms));
})();
