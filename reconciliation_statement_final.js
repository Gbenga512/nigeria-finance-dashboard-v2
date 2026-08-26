(function(){
  function money(n){return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function val(x){return Number(x?.amt)||0}
  function fmtDate(v){const d=v instanceof Date?v:new Date(v);return isNaN(d)?String(v??''):d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'})}
  function row(x){return `<tr><td>${esc(fmtDate(x.d))}</td><td>${esc(x.desc||'')}</td><td>${esc(x.ref||'')}</td><td class="r">${money(val(x))}</td></tr>`}
  function total(a){return (a||[]).reduce((s,x)=>s+val(x),0)}
  function render(){
    if(!window.S||!S.r||!document.getElementById('report'))return;
    const bank=S.bank||[], ledger=S.ledger||[], r=S.r;
    const all=[...bank,...ledger].map(x=>new Date(x.d)).filter(x=>!isNaN(x)).sort((a,b)=>a-b);
    const end=all[all.length-1]||new Date();
    const month=end.toLocaleDateString('en-NG',{month:'long',year:'numeric'});
    const gl=(S.lm&&S.lm.rows)||[]; const bm=(S.bm&&S.bm.rows)||[];
    const bal=(m)=>{const c=m?.cols?.balance;if(c==null||c<0)return null;const a=m.rows.map(x=>Number(x[c])).filter(Number.isFinite);return a.length?{opening:a[0],closing:a[a.length-1]}:null};
    const gb=bal(S.lm), bb=bal(S.bm);
    const deb=ledger.filter(x=>val(x)<0), cred=ledger.filter(x=>val(x)>0);
    const ub=r.unB||[], ul=r.unL||[];
    const fee=x=>/vat|fee|charge|stamp|nip|rtgs|processing|commission|levy|tax|sms|form a/i.test(x.desc||'');
    const bankFee=ub.filter(fee), bankOther=ub.filter(x=>!fee(x));
    const creditGL=ul.filter(x=>val(x)>0), debitGL=ul.filter(x=>val(x)<0);
    const creditBank=bankOther.filter(x=>val(x)>0), debitBank=bankOther.filter(x=>val(x)<0);
    const glClosing=gb?.closing ?? (gb?.opening!=null?gb.opening+total(deb)+total(cred):total(ledger));
    const computed=glClosing+total(creditGL)+total(creditBank)+total(debitGL)+total(debitBank)-Math.abs(total(bankFee));
    const confirmed=bb?.closing ?? total(bank);
    const variance=computed-confirmed;
    const line=(label,amount,cls='')=>`<tr class="${cls}"><td colspan="3"><b>${label}</b></td><td class="r"><b>${money(amount)}</b></td></tr>`;
    const section=(title,a)=>`<tr class="sec"><td colspan="4"><b>${title}</b></td></tr>${a.length?a.map(row).join(''):`<tr><td colspan="4">None</td></tr>`}<tr class="tot"><td colspan="3">Total</td><td class="r">${money(total(a))}</td></tr>`;
    document.getElementById('report').innerHTML=`<style>
      .paper{font-family:Arial,sans-serif;background:white;color:#111;max-width:1050px;margin:auto;padding:25px}.paper h1{text-align:center;font-size:20px;margin:0}.paper h2{text-align:center;font-size:15px;margin:4px 0}.paper .bank{text-align:center;font-weight:bold;margin-bottom:18px}.paper table{width:100%;border-collapse:collapse}.paper th,.paper td{border:1px solid #777;padding:7px;font-size:12px}.paper th{background:#ddd}.paper .r{text-align:right}.paper .sec td{background:#d9d9d9}.paper .tot td{background:#eee;font-weight:bold}.paper .grand td{background:#c9c9c9;font-weight:bold;border-top:2px solid #333}.paper .memo{margin-top:15px;font-size:11px}.paper .sign{margin-top:35px}.paper .status{margin-top:15px;padding:10px;border:1px solid #777;font-weight:bold}
    </style><div class="paper">
      <h1>CHORUS ENERGY LIMITED</h1><h2>Bank Reconciliation Statement as at ${esc(fmtDate(end))}</h2><div class="bank">MAIN STERLING BANK</div>
      <table><tr><th>Date</th><th>Particulars</th><th>Ref</th><th>Amount (₦)</th></tr>
      <tr><td></td><td>Balance as per GL - Opening (${esc(fmtDate(new Date(end.getFullYear(),end.getMonth(),0)))})</td><td></td><td class="r">${money(gb?.opening||0)}</td></tr>
      ${line(`Add: Total Ledger Debits - ${month} (Sage)`,Math.abs(total(deb)))}
      ${line(`Less: Total Ledger Credits - ${month} (Sage)`,-Math.abs(total(cred)))}
      ${line(`Balance as per GL - Closing (${esc(fmtDate(end))})`,glClosing,'grand')}
      ${section('ADD: Credit items in GL but not in Bank statement',creditGL)}
      ${section('Credit items in Bank but not in GL',creditBank)}
      ${section('LESS: Debit items in GL but not in Bank statement',debitGL)}
      ${section('Debit items in Bank statement but not in GL',debitBank)}
      ${line('Less: Bank charges',-Math.abs(total(bankFee)))}
      ${line(`Balance as per Bank Statement - ${esc(fmtDate(end))} (computed)`,computed,'grand')}
      ${line('Bank Statement Closing Balance (per Main Sterling Bank, confirmed)',confirmed)}
      ${line('Variance',variance,'grand')}
      </table>
      <div class="memo"><b>Memo:</b> ${r.reversals?.length||0} net-zero/self-cancelling ledger reversal pair(s) identified. These are presented separately from ordinary bank reconciling items.</div>
      <div class="status">Reconciliation status: ${Math.abs(variance)<0.01?'RECONCILED':'REVIEW REQUIRED'}<br>Variance: ${money(variance)}</div>
      <div class="sign">Prepared by: ______________________________ &nbsp;&nbsp;&nbsp; Reviewed by: ______________________________</div>
    </div>`;
  }
  window.addEventListener('load',()=>setTimeout(render,300));
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&/Generate reconciliation report/i.test(b.textContent||'')){setTimeout(render,50)}} ,true);
  window.ReconAI_FinalStatement=render;
})();