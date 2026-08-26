(function(){
  'use strict';
  function addStyle(){
    if(document.getElementById('recon-export-style')) return;
    const s=document.createElement('style');s.id='recon-export-style';
    s.textContent='.export-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}.export-btn{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.export-excel{background:#dff7ee;color:#087f5b}.export-pdf{background:#fee2e2;color:#991b1b}.export-btn:disabled{opacity:.6;cursor:not-allowed}@media print{.export-toolbar{display:none!important}}';
    document.head.appendChild(s);
  }
  function hasReconciliation(){return typeof S!=='undefined'&&S&&S.r}
  function loadPdfLibraries(){
    return new Promise((resolve,reject)=>{
      if(window.jspdf&&window.jspdf.jsPDF&&(window.jspdfAutoTable||window.autoTable))return resolve();
      let need=0;
      function done(){need--;if(need<=0){if(window.jspdf&&window.jspdf.jsPDF&&(window.jspdfAutoTable||window.autoTable))resolve();else reject(new Error('PDF library could not be loaded. Please check your internet connection and try again.'))}}
      if(!(window.jspdf&&window.jspdf.jsPDF)){need++;const a=document.createElement('script');a.src='https://unpkg.com/jspdf@4.0.0/dist/jspdf.umd.min.js';a.onload=done;a.onerror=()=>reject(new Error('Unable to load the PDF engine.'));document.head.appendChild(a)}
      if(!window.jspdfAutoTable&&!window.autoTable){need++;const b=document.createElement('script');b.src='https://unpkg.com/jspdf-autotable@5.0.8/dist/jspdf.plugin.autotable.min.js';b.onload=()=>{window.jspdfAutoTable=window.jspdfAutoTable||window.autoTable;done()};b.onerror=()=>reject(new Error('Unable to load the PDF table engine.'));document.head.appendChild(b)}
    });
  }
  function dateText(v){try{return v?new Date(v).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):''}catch(e){return String(v??'')}}
  function amount(n){return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0)}
  function nsum(a){return (a||[]).reduce((s,x)=>s+(Number(x.amt)||0),0)}
  function statementData(){
    const r=S.r,b=S.bank||[],l=S.ledger||[];
    const opening=l.length&&l[0].balance!==null&&l[0].balance!==undefined?l[0].balance:null;
    const ledgerDebits=l.reduce((a,x)=>a+(Number(x.debit)||0),0),ledgerCredits=l.reduce((a,x)=>a+(Number(x.credit)||0),0);
    const glClosing=opening!==null?opening+ledgerCredits-ledgerDebits:nsum(l);
    const creditGL=(r.unL||[]).filter(x=>x.amt>0),creditBank=(r.unB||[]).filter(x=>x.amt>0),debitGL=(r.unL||[]).filter(x=>x.amt<0),debitBank=(r.unB||[]).filter(x=>x.amt<0&&!/\b(vat|nip|stamp|processing|process(?:ing)? fee|charge|charges|fee|fees|sms notification|rtgs|remita|commission|amf|levy|tax|emtl|emt|inbranch transfer|form nxp)\b/i.test(String(x.desc||'')));
    const charges=(r.unB||[]).filter(x=>x.amt<0&&/\b(vat|nip|stamp|processing|process(?:ing)? fee|charge|charges|fee|fees|sms notification|rtgs|remita|commission|amf|levy|tax|emtl|emt|inbranch transfer|form nxp)\b/i.test(String(x.desc||''))).reduce((a,x)=>a+Math.abs(x.amt),0);
    const totalCreditGL=nsum(creditGL),totalCreditBank=nsum(creditBank),totalDebitGL=nsum(debitGL),totalDebitBank=nsum(debitBank);
    const computed=glClosing+totalCreditGL+totalCreditBank-totalDebitGL-totalDebitBank-charges;
    const bankClosing=[...b].reverse().find(x=>x.balance!==null&&x.balance!==undefined&&x.balance!==0)?.balance;
    const confirmed=bankClosing!==null&&bankClosing!==undefined?bankClosing:nsum(b);
    const variance=computed-confirmed;
    return {r,b,l,opening,ledgerDebits,ledgerCredits,glClosing,creditGL,creditBank,debitGL,debitBank,totalCreditGL,totalCreditBank,totalDebitGL,totalDebitBank,charges,computed,confirmed,variance,status:Math.abs(variance)<.01?'RECONCILED':'REVIEW REQUIRED'};
  }
  function statementRows(){
    const d=statementData(),rows=[
      ['BANK RECONCILIATION STATEMENT'],['Company','Chorus Energy Limited'],['Period',((S.bank||[]).length?dateText(Math.min(...S.bank.map(x=>new Date(x.d).getTime()))):'')+' to '+((S.bank||[]).length?dateText(Math.max(...S.bank.map(x=>new Date(x.d).getTime()))):'')],[],
      ['BANK / GENERAL LEDGER RECONCILIATION','Amount (NGN)'],['Balance as per GL - Opening',d.opening===null?'':d.opening],['Add: Total Ledger Credits',d.ledgerCredits],['Less: Total Ledger Debits',-d.ledgerDebits],['Balance as per GL - Closing',d.glClosing],[],
      ['ADD: Credit items in GL but not in Bank statement','Amount (NGN)']
    ];
    d.creditGL.forEach(x=>rows.push([dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]));rows.push(['Total - Credit items in GL but not in Bank statement',Math.abs(d.totalCreditGL)]);
    rows.push([],['Credit items in Bank but not in GL','Amount (NGN)']);d.creditBank.forEach(x=>rows.push([dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]));rows.push(['Total - Credit items in Bank but not in GL',Math.abs(d.totalCreditBank)]);
    rows.push([],['LESS: Debit items in GL but not in Bank statement','Amount (NGN)']);d.debitGL.forEach(x=>rows.push([dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]));rows.push(['Total - Debit items in GL but not in Bank statement',Math.abs(d.totalDebitGL)]);
    rows.push([],['Debit items in Bank statement but not in GL','Amount (NGN)']);d.debitBank.forEach(x=>rows.push([dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]));rows.push(['Total - Debit items in Bank statement but not in GL',Math.abs(d.totalDebitBank)]);
    rows.push([],['Less: Bank charges',d.charges],['Balance as per Bank Statement - computed',d.computed],['Bank Statement Closing Balance (per bank, confirmed)',d.confirmed],['Variance',d.variance],['Reconciliation status',d.status]);
    return rows;
  }
  function downloadExcel(){
    if(!hasReconciliation()){alert('Please complete a reconciliation before downloading the Excel report.');return}
    if(!window.XLSX){alert('Excel export library is not available.');return}
    const r=S.r,wb=XLSX.utils.book_new(),bankTotal=nsum(S.bank),ledgerTotal=nsum(S.ledger),variance=bankTotal-ledgerTotal;
    const summary=[['RECONAI — BANK RECONCILIATION REPORT'],[],['Generated',new Date().toLocaleString('en-NG')],['Status',r.unB.length===0&&r.unL.length===0?'RECONCILED':'REVIEW REQUIRED'],[],['Summary','Value (NGN)'],['Total bank transaction value',bankTotal],['Total ledger transaction value',ledgerTotal],['Difference / variance',variance],[],['Reconciling items','Count','Value (NGN)'],['Direct matches',r.ma.length,nsum(r.ma.map(x=>x.b))],['Grouped / aggregated matches',r.grouped.length,nsum(r.grouped.flatMap(x=>x.bs||[]))],['Timing differences',r.ti.length,nsum(r.ti.map(x=>x.b))],['Net-zero GL reversal pairs',r.reversals.length,0],['Bank items genuinely not in GL',r.unB.length,nsum(r.unB)],['GL items genuinely not in Bank',r.unL.length,nsum(r.unL)]];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summary');
    const st=XLSX.utils.aoa_to_sheet(statementRows());st['!cols']=[{wch:70},{wch:22}];XLSX.utils.book_append_sheet(wb,st,'Reconciliation Statement');
    const matched=[['Bank Date','Ledger Date','Amount (NGN)','Description','Confidence']];(r.ma||[]).forEach(x=>matched.push([dateText(x.b.d),dateText(x.l.d),Number(x.b.amt)||0,x.b.desc||'',(x.score||0)+'%']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(matched),'Matched');
    const timing=[['Bank Date','Ledger Date','Amount (NGN)','Description','Reason']];(r.ti||[]).forEach(x=>timing.push([dateText(x.b.d),dateText(x.l.d),Number(x.b.amt)||0,x.b.desc||'',`Exact amount • ${x.g} day gap`]));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(timing),'Timing Differences');
    const grouped=[['Bank Items','Ledger Items','Bank Total (NGN)','Ledger Total (NGN)','Basis']];(r.grouped||[]).forEach(x=>grouped.push([(x.bs||[]).length,(x.ls||[]).length,nsum(x.bs||[]),nsum(x.ls||[]),x.basis||'']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grouped),'Grouped Matches');
    const rev=[['Date','Amount (NGN)','Ledger Entry A','Ledger Entry B','Assessment']];(r.reversals||[]).forEach(x=>rev.push([dateText(x.a.d),Math.abs(Number(x.a.amt)||0),x.a.desc||'',x.b.desc||'','Net-zero GL reversal']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rev),'Reversals');
    const exceptions=[['Source','Date','Amount (NGN)','Description','Reference','Assessment']];(r.unB||[]).forEach(x=>exceptions.push(['Bank',dateText(x.d),Number(x.amt)||0,x.desc||'',x.ref||'','No corresponding GL transaction after direct and aggregate matching.']));(r.unL||[]).forEach(x=>exceptions.push(['Ledger',dateText(x.d),Number(x.amt)||0,x.desc||'',x.ref||'','No corresponding bank transaction after direct and aggregate matching.']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(exceptions),'Exceptions');
    XLSX.writeFile(wb,'ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.xlsx');
  }
  async function downloadPdf(){
    if(!hasReconciliation()){alert('Please complete a reconciliation before downloading the PDF report.');return}
    const btn=document.getElementById('download-pdf');if(btn){btn.disabled=true;btn.textContent='Preparing PDF…'}
    try{
      await loadPdfLibraries();const jsPDF=window.jspdf.jsPDF,autoTable=window.jspdfAutoTable||window.autoTable,d=statementData(),doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      doc.setFontSize(16);doc.setFont(undefined,'bold');doc.text('BANK RECONCILIATION STATEMENT',105,14,{align:'center'});doc.setFontSize(10);doc.text('Chorus Energy Limited',105,20,{align:'center'});doc.setFont(undefined,'normal');doc.text('Generated '+new Date().toLocaleString('en-NG'),105,26,{align:'center'});
      let y=33;doc.setFontSize(9);doc.setFont(undefined,'bold');doc.text('BANK / GENERAL LEDGER RECONCILIATION',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+3,head:[['Particulars','Amount (NGN)']],body:[['Balance as per GL - Opening',d.opening===null?'':d.opening],['Add: Total Ledger Credits',d.ledgerCredits],['Less: Total Ledger Debits',-d.ledgerDebits],['Balance as per GL - Closing',d.glClosing]],styles:{fontSize:8},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+6;doc.setFont(undefined,'bold');doc.text('ADD: Credit items in GL but not in Bank statement',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+2,head:[['Date / Particulars','Amount (NGN)']],body:(d.creditGL.length?d.creditGL.map(x=>[dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]):[['(none)',0]]).concat([['Total - Credit items in GL but not in Bank statement',Math.abs(d.totalCreditGL)]]),styles:{fontSize:7},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+6;doc.setFont(undefined,'bold');doc.text('Credit items in Bank but not in GL',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+2,head:[['Date / Particulars','Amount (NGN)']],body:(d.creditBank.length?d.creditBank.map(x=>[dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]):[['(none)',0]]).concat([['Total - Credit items in Bank but not in GL',Math.abs(d.totalCreditBank)]]),styles:{fontSize:7},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+6;doc.setFont(undefined,'bold');doc.text('LESS: Debit items in GL but not in Bank statement',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+2,head:[['Date / Particulars','Amount (NGN)']],body:(d.debitGL.length?d.debitGL.map(x=>[dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]):[['(none)',0]]).concat([['Total - Debit items in GL but not in Bank statement',Math.abs(d.totalDebitGL)]]),styles:{fontSize:7},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+6;doc.setFont(undefined,'bold');doc.text('Debit items in Bank statement but not in GL',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+2,head:[['Date / Particulars','Amount (NGN)']],body:(d.debitBank.length?d.debitBank.map(x=>[dateText(x.d)+'  '+(x.desc||x.ref||''),Math.abs(x.amt)]):[['(none)',0]]).concat([['Total - Debit items in Bank statement but not in GL',Math.abs(d.totalDebitBank)]]),styles:{fontSize:7},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+6;doc.setFont(undefined,'normal');autoTable(doc,{startY:y,head:[['Final reconciliation','Amount (NGN)']],body:[['Less: Bank charges',d.charges],['Balance as per Bank Statement - computed',d.computed],['Bank Statement Closing Balance (per bank, confirmed)',d.confirmed],['Variance',d.variance],['Reconciliation status',d.status]],styles:{fontSize:8},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      doc.save('ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.pdf');
    }catch(e){alert(e.message||'Unable to generate PDF report.')}finally{if(btn){btn.disabled=false;btn.textContent='Download PDF'}}
  }
  function installButtons(){const report=document.getElementById('report');if(!report||!report.innerHTML||document.getElementById('recon-export-toolbar'))return;addStyle();const bar=document.createElement('div');bar.id='recon-export-toolbar';bar.className='export-toolbar';bar.innerHTML='<button type="button" id="download-excel" class="export-btn export-excel">Download Excel</button><button type="button" id="download-pdf" class="export-btn export-pdf">Download PDF</button>';report.prepend(bar);document.getElementById('download-excel').onclick=downloadExcel;document.getElementById('download-pdf').onclick=downloadPdf}
  function observe(){const report=document.getElementById('report');if(!report)return setTimeout(observe,300);new MutationObserver(()=>setTimeout(installButtons,0)).observe(report,{childList:true,subtree:false});installButtons()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe);else observe();
})();