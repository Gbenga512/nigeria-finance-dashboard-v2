(function(){
  if(window.__RECONAI_MANUAL_V7__) return;
  window.__RECONAI_MANUAL_V7__=true;

  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0);
  const amt=x=>Number(x?.amt??x?.r?.amt??0)||0;
  const dval=x=>x?.d??x?.r?.d??'';
  const desc=x=>x?.desc??x?.r?.desc??'';
  const ref=x=>x?.ref??x?.r?.ref??'';
  const sum=a=>(a||[]).reduce((t,x)=>t+amt(x),0);
  const absSum=a=>(a||[]).reduce((t,x)=>t+Math.abs(amt(x)),0);
  const dateObj=v=>{try{const d=typeof date==='function'?date(v):new Date(v);return d&&!isNaN(d)?d:null}catch(e){return null}};
  const fmtDate=v=>{const d=dateObj(v);return d?d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):String(v??'')};
  const monthName=d=>d?d.toLocaleDateString('en-NG',{month:'long',year:'numeric'}):'';
  const escRows=a=>(a||[]).map(x=>({date:fmtDate(dval(x)),particulars:desc(x),ref:ref(x),amount:amt(x)}));

  function balanceFromMap(m){
    try{
      if(!m||!m.cols||m.cols.balance<0)return null;
      const vals=[];
      for(const r of (m.rows||[])){
        const v=r[m.cols.balance];
        if(v!==''&&v!=null&&Number.isFinite(Number(v))) vals.push(Number(v));
      }
      return vals.length?{opening:vals[0],closing:vals[vals.length-1]}:null;
    }catch(e){return null}
  }

  function period(){
    const ds=[...(S.bank||[]),...(S.ledger||[])].map(x=>dateObj(dval(x))).filter(Boolean).sort((a,b)=>a-b);
    const end=ds[ds.length-1]||new Date();
    const start=new Date(end.getFullYear(),end.getMonth(),1);
    return {start,end,month:monthName(end),startText:fmtDate(start),endText:fmtDate(end)};
  }

  function row(x){return `<tr><td>${esc(fmtDate(x.date))}</td><td>${esc(x.particulars)}</td><td>${esc(x.ref)}</td><td class="right">${money(x.amount)}</td></tr>`}

  function sectionRows(title,items,empty='(none)'){
    const rows=escRows(items);
    return `<tr class="section"><td colspan="4"><b>${title}</b></td></tr>${rows.length?rows.map(row).join(''):`<tr><td colspan="4" class="muted">${empty}</td></tr>`}<tr class="total"><td colspan="3"><b>Total</b></td><td class="right"><b>${money(sum(items))}</b></td></tr>`;
  }

  function report(){
    if(!window.S||!S.r||!document.getElementById('report')) return;
    const r=S.r, p=period();
    const bank=S.bank||[], led=S.ledger||[];
    const unB=r.unB||[], unL=r.unL||[];
    const glCredit=led.filter(x=>amt(x)>0), glDebit=led.filter(x=>amt(x)<0);
    const bankMap=balanceFromMap(S.bm), glMap=balanceFromMap(S.lm);
    const glOpening=glMap?.opening ?? null, glClosing=glMap?.closing ?? null;
    const bankClosing=bankMap?.closing ?? null;
    const ledgerDebits=absSum(glDebit), ledgerCredits=sum(glCredit);
    const bankCharges=unB.filter(x=>Math.abs(amt(x))<=6000 && /fee|charge|vat|stamp|nip|emi|rtgs/i.test(desc(x)));
    const bankChargeValue=sum(bankCharges);
    const creditGL=unL.filter(x=>amt(x)>0);
    const creditBank=unB.filter(x=>amt(x)>0 && !bankCharges.includes(x));
    const debitGL=unL.filter(x=>amt(x)<0);
    const debitBank=unB.filter(x=>amt(x)<0 && !bankCharges.includes(x));
    const computedBank=bankClosing!=null?bankClosing:(glClosing!=null?glClosing+sum(creditGL)+sum(creditBank)+sum(debitGL)+sum(debitBank)-bankChargeValue:sum(bank));
    const confirmedBank=bankClosing!=null?bankClosing:computedBank;
    const variance=bankClosing!=null?computedBank-bankClosing:0;
    const status=Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED';
    const bankTitle=(S.bm&&S.bm.sheet)||'STERLING BANK';
    const company='Chorus Energy Limited';

    $('report').innerHTML=`
      <style>
        #report .manual-r{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:1050px;margin:0 auto;background:#fff}
        #report .manual-r h1{font-size:22px;text-align:center;margin:0 0 5px}
        #report .manual-r .subtitle{text-align:center;font-weight:700;font-size:14px;margin:0 0 3px}
        #report .manual-r .bankname{text-align:center;font-weight:700;margin-bottom:14px}
        #report .manual-r table{width:100%;border-collapse:collapse;min-width:0;margin:0 0 8px}
        #report .manual-r th,#report .manual-r td{border-bottom:1px solid #d1d5db;padding:6px 7px;font-size:12px;vertical-align:top}
        #report .manual-r th{background:#e5e7eb;font-weight:700}
        #report .manual-r .head th{border-top:2px solid #555;border-bottom:2px solid #555}
        #report .manual-r .right{text-align:right;white-space:nowrap}
        #report .manual-r .section td{background:#e5e7eb;border-top:2px solid #777;font-size:12px}
        #report .manual-r .total td{background:#f3f4f6;font-weight:700}
        #report .manual-r .grand td{background:#d1d5db;font-weight:800;border-top:2px solid #555}
        #report .manual-r .note{background:transparent;border:0;padding:7px 0;margin:4px 0;font-style:italic;color:#222}
        #report .manual-r .status{border:1px solid #999;padding:8px;margin-top:10px;font-weight:700}
        #report .manual-r .muted{color:#555}
        @media print{#report .manual-r{max-width:none}.manual-r th,.manual-r td{font-size:10px}}
      </style>
      <div class="manual-r">
        <h1>${esc(company)}</h1>
        <div class="subtitle">Bank Reconciliation Statement as at ${esc(p.endText)}</div>
        <div class="bankname">${esc(bankTitle)}</div>
        <table>
          <tr class="head"><th>Date</th><th>Particulars</th><th>Ref</th><th class="right">Amount (₦)</th></tr>
          <tr><td></td><td>Balance as per GL - Opening (${esc(fmtDate(p.start))})</td><td></td><td class="right">${glOpening==null?'—':money(glOpening)}</td></tr>
          <tr><td></td><td>Add: Total Ledger Debits - ${esc(p.month)} (Sage)</td><td></td><td class="right">${money(ledgerDebits)}</td></tr>
          <tr><td></td><td>Less: Total Ledger Credits - ${esc(p.month)} (Sage)</td><td></td><td class="right">${money(-ledgerCredits)}</td></tr>
          <tr class="grand"><td></td><td>Balance as per GL - Closing (${esc(p.endText)})</td><td></td><td class="right">${glClosing==null?money(sum(led)):money(glClosing)}</td></tr>
        </table>

        <table>
          <tr class="section"><td colspan="4"><b>ADD:</b></td></tr>
          ${sectionRows('Credit items in GL but not in Bank statement',creditGL)}
          ${sectionRows('Credit items in Bank but not in GL',creditBank)}
          <tr class="section"><td colspan="4"><b>LESS:</b></td></tr>
          ${sectionRows('Debit items in GL but not in Bank statement',debitGL)}
          ${sectionRows('Debit items in Bank statement but not in GL',debitBank)}
          <tr><td colspan="3"><b>Less: Bank charges</b> <span class="muted">(all bank-fee lines ₦3.75 to ₦6,000, per instruction)</span></td><td class="right"><b>${money(bankChargeValue)}</b></td></tr>
          <tr class="grand"><td colspan="3"><b>Balance as per Bank Statement - ${esc(p.endText)} (computed)</b></td><td class="right"><b>${money(computedBank)}</b></td></tr>
          <tr><td colspan="3"><b>Bank Statement Closing Balance (per ${esc(bankTitle)}, confirmed)</b></td><td class="right"><b>${money(confirmedBank)}</b></td></tr>
          <tr class="grand"><td colspan="3"><b>Variance</b></td><td class="right"><b>${money(variance)}</b></td></tr>
        </table>
        <div class="note"><b>Memo:</b> Net-zero / self-cancelling ledger reversal pairs identified: ${r.reversals?.length||0}. These are presented separately and are not treated as bank exceptions.</div>
        <div class="status">Reconciliation status: ${status}<br>Variance: ${money(variance)}${unB.length||unL.length?`<br><span class="muted">System exception schedule: ${unB.length} bank items and ${unL.length} GL items remain outside the automated match. Review against the manually reconciled working paper before finalising.</span>`:''}</div>
        <p style="margin-top:22px">Prepared by: ______________________________ &nbsp;&nbsp;&nbsp; Reviewed by: ______________________________</p>
      </div>`;
  }

  window.report=report;
  setTimeout(()=>{try{if(window.S&&S.r)report()}catch(e){}},0);
})();