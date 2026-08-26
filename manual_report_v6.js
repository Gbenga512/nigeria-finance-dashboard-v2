(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
  const amount=x=>Number(x?.amt||0)||0;
  const text=x=>String(x?.desc||'');
  const ref=x=>String(x?.ref||'');
  const dateValue=x=>x?.d||null;
  const fmtDate=v=>{let d=v instanceof Date?v:new Date(v);return d&&!isNaN(d)?d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')};
  const sum=a=>(a||[]).reduce((t,x)=>t+amount(x),0);
  const absSum=a=>(a||[]).reduce((t,x)=>t+Math.abs(amount(x)),0);
  const isFee=x=>/\b(vat|fee|fees|charge|charges|stamp|nip|rtgs|amf|processing|commission|levy|tax|emt|sms|bank charge|form a charge)\b/i.test(text(x));
  const isCredit=x=>amount(x)>0;
  const isDebit=x=>amount(x)<0;
  const row=x=>`<tr><td>${esc(fmtDate(dateValue(x)))}</td><td>${esc(text(x))}</td><td>${esc(ref(x))}</td><td class="right">${money(amount(x))}</td></tr>`;
  const section=(title,items)=>`<tr class="section"><td colspan="4"><b>${esc(title)}</b></td></tr>${items?.length?items.map(row).join(''):`<tr><td colspan="4" class="muted">(none)</td></tr>`}<tr class="total"><td colspan="3"><b>Total</b></td><td class="right"><b>${money(sum(items))}</b></td></tr>`;
  const mapRows=(items,kind,reason)=>`<tr class="section"><td colspan="5"><b>${esc(kind)}</b></td></tr>${items?.length?items.map(x=>`<tr><td>Bank</td><td>${esc(fmtDate(dateValue(x)))}</td><td>${esc(text(x))}</td><td class="right">${money(amount(x))}</td><td>${esc(reason)}</td></tr>`).join(''):`<tr><td colspan="5" class="muted">(none)</td></tr>`}`;

  function balanceInfo(m){
    try{
      const c=m?.cols?.balance;
      if(c==null||c<0)return {opening:null,closing:null};
      const vals=(m.rows||[]).map(r=>Number(r[c])).filter(Number.isFinite);
      return {opening:vals.length?vals[0]:null,closing:vals.length?vals[vals.length-1]:null};
    }catch(e){return {opening:null,closing:null}}
  }

  function manualReport(){
    if(!window.S||!S.r||!document.getElementById('report'))return;
    const r=S.r;
    const bank=S.bank||[], ledger=S.ledger||[];
    const p=[...bank,...ledger].map(x=>x.d instanceof Date?x.d:new Date(x.d)).filter(x=>!isNaN(x)).sort((a,b)=>a-b);
    const end=p[p.length-1]||new Date();
    const month=end.toLocaleDateString('en-NG',{month:'long',year:'numeric'});
    const endText=fmtDate(end);
    const bankBal=balanceInfo(S.bm), glBal=balanceInfo(S.lm);
    const glOpening=glBal.opening, glClosing=glBal.closing;
    const bankClosing=bankBal.closing;
    const creditGL=(r.unL||[]).filter(isCredit);
    const debitGL=(r.unL||[]).filter(isDebit);
    const bankUnmatched=(r.unB||[]);
    const creditBank=bankUnmatched.filter(x=>isCredit(x)&&!isFee(x));
    const debitBank=bankUnmatched.filter(x=>isDebit(x)&&!isFee(x));
    const charges=bankUnmatched.filter(isFee);
    const bankTotal=sum(bank),ledgerTotal=sum(ledger);
    const computed=bankClosing!=null?bankClosing:bankTotal;
    const variance=bankClosing!=null?computed-bankClosing:bankTotal-ledgerTotal;
    const status=Math.abs(variance)<0.01 && (r.unB?.length||r.unL?.length)?'REVIEW REQUIRED':Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED';

    const style=`<style>
      #report .manual{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;max-width:1100px;margin:auto}
      #report .manual h1{font-size:18px;text-align:center;margin:0 0 4px;font-weight:800}
      #report .manual .subtitle{text-align:center;font-weight:700;font-size:13px;margin:0 0 3px}
      #report .manual .bank{text-align:center;font-weight:700;font-size:13px;margin-bottom:14px}
      #report .manual table{width:100%;border-collapse:collapse;margin:0 0 7px;min-width:0}
      #report .manual th,#report .manual td{padding:6px 7px;border-bottom:1px solid #aaa;font-size:11px;vertical-align:top}
      #report .manual .head th{background:#ddd;border-top:2px solid #555;border-bottom:2px solid #555}
      #report .manual .section td{background:#ddd;border-top:2px solid #777;font-size:11px}
      #report .manual .total td{background:#eee;font-weight:700}
      #report .manual .grand td{background:#d2d2d2;font-weight:800;border-top:2px solid #555}
      #report .manual .right{text-align:right;white-space:nowrap}
      #report .manual .muted{color:#555}
      #report .manual .status{border:1px solid #777;padding:8px;margin:10px 0;font-weight:700}
      #report .manual .memo{font-style:italic;margin:10px 0;font-size:11px}
      #report .manual .status.review{background:#f6dfe4}
      #report .manual .status.ok{background:#e5f3e9}
      @media print{#report .manual th,#report .manual td{font-size:9px}}
    </style>`;

    document.getElementById('report').innerHTML=style+`<div class="manual">
      <h1>CHORUS ENERGY LIMITED</h1>
      <div class="subtitle">Bank Reconciliation Statement as at ${esc(endText)}</div>
      <div class="bank">MAIN STERLING BANK</div>

      <table>
        <tr class="head"><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr>
        <tr><td></td><td>Balance as per GL - Opening (${esc(fmtDate(new Date(end.getFullYear(),end.getMonth(),0)))})</td><td></td><td class="right">${glOpening==null?'—':money(glOpening)}</td></tr>
        <tr><td></td><td>Add: Total Ledger Debits - ${esc(month)} (Sage)</td><td></td><td class="right">${money(absSum(ledger.filter(isDebit)))}</td></tr>
        <tr><td></td><td>Less: Total Ledger Credits - ${esc(month)} (Sage)</td><td></td><td class="right">${money(-sum(ledger.filter(isCredit)))}</td></tr>
        <tr class="grand"><td></td><td>Balance as per GL - Closing (${esc(endText)})</td><td></td><td class="right">${glClosing==null?money(ledgerTotal):money(glClosing)}</td></tr>
      </table>

      <table>
        <tr class="section"><td colspan="4"><b>ADD:</b></td></tr>
        ${section('Credit items in GL but not in Bank statement',creditGL)}
        ${section('Credit items in Bank but not in GL',creditBank)}
        <tr class="section"><td colspan="4"><b>LESS:</b></td></tr>
        ${section('Debit items in GL but not in Bank statement',debitGL)}
        ${section('Debit items in Bank statement but not in GL',debitBank)}
        <tr><td colspan="3"><b>Less: Bank charges</b> (all bank-fee lines identified from bank statement)</td><td class="right"><b>${money(absSum(charges))}</b></td></tr>
        <tr class="grand"><td colspan="3"><b>Balance as per Bank Statement - ${esc(endText)} (computed)</b></td><td class="right"><b>${money(computed)}</b></td></tr>
        <tr><td colspan="3"><b>Bank Statement Closing Balance (per Sterling Bank, confirmed)</b></td><td class="right"><b>${money(bankClosing==null?computed:bankClosing)}</b></td></tr>
        <tr class="grand"><td colspan="3"><b>Variance</b></td><td class="right"><b>${money(variance)}</b></td></tr>
      </table>

      <div class="memo"><b>Memo:</b> ${r.reversals?.length||0} net-zero/self-cancelling ledger reversal pair(s) identified. These are shown separately and are not treated as bank exceptions.</div>
      <div class="status ${status==='RECONCILED'?'ok':'review'}">Reconciliation status: ${status}<br>Variance: ${money(variance)}<br><span class="muted">The statement follows the manual working-paper structure. Automated exceptions remain visible for human review rather than being silently treated as reconciled.</span></div>

      <h3>Exception schedule</h3>
      <table><tr class="head"><th>Source</th><th>Date</th><th>Particulars</th><th class="right">Amount</th><th>Assessment</th></tr>
        ${mapRows(bankUnmatched,'Bank items not yet cleared','Review against the manually reconciled bank working paper.')}
        ${debitGL.length?debitGL.map(x=>`<tr><td>Ledger</td><td>${esc(fmtDate(dateValue(x)))}</td><td>${esc(text(x))}</td><td class="right">${money(amount(x))}</td><td>No corresponding bank transaction found by automated matching.</td></tr>`).join(''):''}
        ${creditGL.length?creditGL.map(x=>`<tr><td>Ledger</td><td>${esc(fmtDate(dateValue(x)))}</td><td>${esc(text(x))}</td><td class="right">${money(amount(x))}</td><td>No corresponding bank transaction found by automated matching.</td></tr>`).join(''):''}
      </table>
      <p style="margin-top:20px">Prepared by: ______________________________ &nbsp;&nbsp;&nbsp; Reviewed by: ______________________________</p>
    </div>`;
  }

  window.manualReport=manualReport;
  let busy=false;
  function refresh(){if(busy)return;if(window.S&&S.r&&document.getElementById('report'))manualReport()}
  const target=document.getElementById('report');
  if(target){
    const observer=new MutationObserver(()=>{if(!busy){busy=true;setTimeout(()=>{try{manualReport()}finally{busy=false}},0)}});
    observer.observe(target,{childList:true,subtree:true});
  }
  setTimeout(refresh,250);
})();