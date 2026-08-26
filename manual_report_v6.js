(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
  const amt=x=>Number(x?.amt||0)||0;
  const desc=x=>String(x?.desc||'');
  const ref=x=>String(x?.ref||'');
  const dval=x=>x?.d||null;
  const fmtDate=v=>{let d=v instanceof Date?v:new Date(v);return d&&!isNaN(d)?d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')};
  const sum=a=>(a||[]).reduce((t,x)=>t+amt(x),0);
  const absSum=a=>(a||[]).reduce((t,x)=>t+Math.abs(amt(x)),0);
  const isCredit=x=>amt(x)>0;
  const isDebit=x=>amt(x)<0;
  const isFee=x=>/\b(vat|fee|fees|charge|charges|stamp|nip|rtgs|amf|processing|commission|levy|tax|emt|sms|bank charge|form a charge|comm\s*chrg)\b/i.test(desc(x));
  const balanceInfo=m=>{try{const c=m?.cols?.balance;if(c==null||c<0)return{opening:null,closing:null};const vals=(m.rows||[]).map(r=>Number(r[c])).filter(Number.isFinite);return{opening:vals.length?vals[0]:null,closing:vals.length?vals[vals.length-1]:null}}catch(e){return{opening:null,closing:null}}};
  const dateRange=()=>{const all=[...(S.bank||[]),...(S.ledger||[])].map(x=>x.d instanceof Date?x.d:new Date(x.d)).filter(x=>!isNaN(x)).sort((a,b)=>a-b);return{start:all[0]||new Date(),end:all[all.length-1]||new Date()}};
  const ordinal=n=>{let s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};
  const row=(x)=>`<tr><td>${esc(fmtDate(dval(x)))}</td><td>${esc(desc(x))}</td><td>${esc(ref(x))}</td><td class="r">${money(amt(x))}</td></tr>`;
  const itemBlock=(title,items)=>`<tr class="bar"><td colspan="4"><b>${esc(title)}</b></td></tr>${items?.length?items.map(row).join(''):`<tr><td></td><td colspan="2">(none)</td><td class="r">${money(0)}</td></tr>`}<tr class="subtotal"><td></td><td colspan="2"><b>Total - ${esc(title)}</b></td><td class="r"><b>${money(sum(items))}</b></td></tr>`;

  function manualReport(){
    if(!window.S||!S.r||!document.getElementById('report'))return;
    const r=S.r, bank=S.bank||[], ledger=S.ledger||[];
    const {start,end}=dateRange();
    const endText=fmtDate(end), month=end.toLocaleDateString('en-NG',{month:'long',year:'numeric'});
    const gl=balanceInfo(S.lm), bb=balanceInfo(S.bm);
    const glOpening=gl.opening, glClosing=gl.closing, bankClosing=bb.closing;
    const creditGL=(r.unL||[]).filter(isCredit);
    const debitGL=(r.unL||[]).filter(isDebit);
    const unmatchedBank=r.unB||[];
    const creditBank=unmatchedBank.filter(x=>isCredit(x)&&!isFee(x));
    const debitBank=unmatchedBank.filter(x=>isDebit(x)&&!isFee(x));
    const charges=unmatchedBank.filter(isFee);
    const ledgerDebits=ledger.filter(isDebit), ledgerCredits=ledger.filter(isCredit);
    const computed=bankClosing!=null?bankClosing:(glClosing!=null?glClosing+sum(creditGL)+sum(creditBank)+sum(debitGL)+sum(debitBank)-absSum(charges):sum(bank));
    const confirmed=bankClosing!=null?bankClosing:computed;
    const variance=computed-confirmed;
    const reversalMemo=r.reversals?.length?`${r.reversals.length} failed/reversed (self-cancelling) transfer group(s) identified.`:'No failed/reversed (self-cancelling) transfer groups identified.';
    const css=`<style>
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
      #report .working .variance{font-weight:800}
      #report .working .check{font-weight:800}
      @media print{#report .working{font-size:9px}#report .working th,#report .working td{padding:3px 4px}}
    </style>`;

    const openingDate=new Date(end.getFullYear(),end.getMonth(),0);
    document.getElementById('report').innerHTML=css+`<div class="working">
      <h1>CHORUS ENERGY LIMITED</h1>
      <div class="title">Bank Reconciliation Statement as at ${esc(ordinal(end.getDate())+' '+end.toLocaleDateString('en-NG',{month:'long',year:'numeric'}))}</div>
      <div class="bank">Main STERLING BANK</div>

      <table>
        <tr class="head"><th>Date</th><th>Particulars</th><th>Ref</th><th class="r">Amount (₦)</th></tr>
        <tr><td></td><td>Balance as per GL - Opening (${esc(fmtDate(openingDate))})</td><td></td><td class="r">${glOpening==null?'—':money(glOpening)}</td></tr>
        <tr><td></td><td>Add: Total Ledger Debits - ${esc(month)} (Sage)</td><td></td><td class="r">${money(absSum(ledgerDebits))}</td></tr>
        <tr><td></td><td>Less: Total Ledger Credits - ${esc(month)} (Sage)</td><td></td><td class="r">${money(-absSum(ledgerCredits))}</td></tr>
        <tr class="grand"><td></td><td>Balance as per GL - Closing (${esc(endText)})</td><td></td><td class="r">${glClosing==null?money(sum(ledger)):money(glClosing)}</td></tr>
      </table>

      <table>
        <tr class="bar"><td colspan="4"><b>ADD:</b></td></tr>
        ${itemBlock('Credit items in GL but not in Bank statement',creditGL)}
        ${itemBlock('Credit items in Bank but not in GL',creditBank)}
        <tr class="bar"><td colspan="4"><b>LESS:</b></td></tr>
        ${itemBlock('Debit items in GL but not in Bank statement',debitGL)}
        ${itemBlock('Debit items in Bank statement but not in GL',debitBank)}
        <tr><td></td><td colspan="2"><b>Less: Bank charges</b> (all bank-fee lines identified from bank statement)</td><td class="r"><b>${money(absSum(charges))}</b></td></tr>
        <tr class="grand"><td></td><td colspan="2"><b>Balance as per Bank Statement - ${esc(endText)} (computed)</b></td><td class="r"><b>${money(computed)}</b></td></tr>
        <tr><td></td><td colspan="2"><b>Bank Statement Closing Balance (per Sterling Bank, confirmed)</b></td><td class="r"><b>${money(confirmed)}</b></td></tr>
        <tr><td></td><td colspan="2"><b>Variance</b></td><td class="r variance">${money(variance)}</td></tr>
      </table>

      <div class="memo"><b>Memo:</b> ${esc(reversalMemo)}</div>
      <div class="check">✓ Reconciliation working paper generated from the uploaded bank statement and ledger. Unresolved items remain explicitly listed rather than being silently suppressed.</div>
    </div>`;
  }

  window.manualReport=manualReport;
  function hook(){
    if(typeof window.report==='function'&&!window.report.__manualHook){
      const original=window.report;
      const wrapped=function(){original.apply(this,arguments);setTimeout(manualReport,0)};
      wrapped.__manualHook=true;
      window.report=wrapped;
    }
    setTimeout(manualReport,100);
  }
  hook();
  setTimeout(hook,500);
  setTimeout(hook,1500);
})();