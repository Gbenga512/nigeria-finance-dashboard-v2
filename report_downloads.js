(function(){
  'use strict';
  function addStyle(){
    if(document.getElementById('recon-export-style')) return;
    const s=document.createElement('style');s.id='recon-export-style';
    s.textContent='.export-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}.export-btn{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.export-excel{background:#dff7ee;color:#087f5b}.export-pdf{background:#fee2e2;color:#991b1b}.export-btn:disabled{opacity:.6;cursor:not-allowed}@media print{.export-toolbar{display:none!important}}';
    document.head.appendChild(s);
  }
  function loadPdfLibraries(){
    return new Promise((resolve,reject)=>{
      if(window.jspdf&&window.jspdf.jsPDF&&(window.jspdfAutoTable||window.autoTable))return resolve();
      let need=0;
      function done(){need--;if(need<=0){if(window.jspdf&&window.jspdf.jsPDF&&(window.jspdfAutoTable||window.autoTable))resolve();else reject(new Error('PDF library could not be loaded. Please check your internet connection and try again.'));}}
      if(!(window.jspdf&&window.jspdf.jsPDF)){need++;const a=document.createElement('script');a.src='https://unpkg.com/jspdf@4.0.0/dist/jspdf.umd.min.js';a.onload=done;a.onerror=()=>reject(new Error('Unable to load the PDF engine.'));document.head.appendChild(a)}
      if(!(window.jspdfAutoTable||window.autoTable)){need++;const b=document.createElement('script');b.src='https://unpkg.com/jspdf-autotable@5.0.8/dist/jspdf.plugin.autotable.min.js';b.onload=()=>{window.jspdfAutoTable=window.jspdfAutoTable||window.autoTable||null;done()};b.onerror=()=>reject(new Error('Unable to load the PDF table engine.'));document.head.appendChild(b)}
    });
  }
  function dateText(v){try{return v?new Date(v).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}):''}catch(e){return String(v??'')}}
  function amount(n){return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(n)||0)}
  function hasReport(){return typeof S!=='undefined'&&S&&S.r}
  function downloadExcel(){
    if(!hasReport()){alert('Please complete a reconciliation before downloading the Excel report.');return}
    if(!window.XLSX){alert('Excel export library is not available.');return}
    const r=S.r,wb=XLSX.utils.book_new();
    const bankTotal=(S.bank||[]).reduce((a,x)=>a+(Number(x.amt)||0),0),ledgerTotal=(S.ledger||[]).reduce((a,x)=>a+(Number(x.amt)||0),0),variance=bankTotal-ledgerTotal;
    const summary=[['RECONAI — BANK RECONCILIATION REPORT'],[],['Generated',new Date().toLocaleString('en-NG')],['Status',r.unB.length===0&&r.unL.length===0?'RECONCILED':'REVIEW REQUIRED'],[],['Summary','Value (NGN)'],['Total bank transaction value',bankTotal],['Total ledger transaction value',ledgerTotal],['Difference / variance',variance],[],['Reconciling items','Count','Value (NGN)'],['Direct matches',r.ma.length,r.ma.reduce((a,x)=>a+(Number(x.b.amt)||0),0)],['Grouped / aggregated matches',r.grouped.length,r.grouped.reduce((a,x)=>a+(x.bs||[]).reduce((q,b)=>q+(Number(b.amt)||0),0),0)],['Timing differences',r.ti.length,r.ti.reduce((a,x)=>a+(Number(x.b.amt)||0),0)],['Net-zero GL reversal pairs',r.reversals.length,0],['Bank items genuinely not in GL',r.unB.length,r.unB.reduce((a,x)=>a+(Number(x.amt)||0),0)],['GL items genuinely not in Bank',r.unL.length,r.unL.reduce((a,x)=>a+(Number(x.amt)||0),0)]];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summary');
    const matched=[['Bank Date','Ledger Date','Amount (NGN)','Description','Confidence']];(r.ma||[]).forEach(x=>matched.push([dateText(x.b.d),dateText(x.l.d),Number(x.b.amt)||0,x.b.desc||'',(x.score||0)+'%']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(matched),'Matched');
    const timing=[['Bank Date','Ledger Date','Amount (NGN)','Description','Reason']];(r.ti||[]).forEach(x=>timing.push([dateText(x.b.d),dateText(x.l.d),Number(x.b.amt)||0,x.b.desc||'',`Exact amount • ${x.g} day gap`]));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(timing),'Timing Differences');
    const grouped=[['Bank Items','Ledger Items','Bank Total (NGN)','Ledger Total (NGN)','Basis']];(r.grouped||[]).forEach(x=>grouped.push([(x.bs||[]).length,(x.ls||[]).length,(x.bs||[]).reduce((a,b)=>a+(Number(b.amt)||0),0),(x.ls||[]).reduce((a,b)=>a+(Number(b.amt)||0),0),x.basis||'']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grouped),'Grouped Matches');
    const rev=[['Date','Amount (NGN)','Ledger Entry A','Ledger Entry B','Assessment']];(r.reversals||[]).forEach(x=>rev.push([dateText(x.a.d),Math.abs(Number(x.a.amt)||0),x.a.desc||'',x.b.desc||'','Net-zero GL reversal']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rev),'Reversals');
    const exceptions=[['Source','Date','Amount (NGN)','Description','Reference','Assessment']];(r.unB||[]).forEach(x=>exceptions.push(['Bank',dateText(x.d),Number(x.amt)||0,x.desc||'',x.ref||'','No corresponding GL transaction after direct and aggregate matching.']));(r.unL||[]).forEach(x=>exceptions.push(['Ledger',dateText(x.d),Number(x.amt)||0,x.desc||'',x.ref||'','No corresponding bank transaction after direct and aggregate matching.']));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(exceptions),'Exceptions');
    XLSX.writeFile(wb,'ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.xlsx');
  }
  async function downloadPdf(){
    if(!hasReport()){alert('Please complete a reconciliation before downloading the PDF report.');return}
    const btn=document.getElementById('download-pdf');if(btn){btn.disabled=true;btn.textContent='Preparing PDF…'}
    try{
      await loadPdfLibraries();const jsPDF=window.jspdf.jsPDF;const autoTable=window.jspdfAutoTable||window.autoTable||(window.jspdfAutoTable&&window.jspdfAutoTable.autoTable);if(typeof autoTable!=='function')throw new Error('PDF table engine is not available.');
      const r=S.r,doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),bankTotal=(S.bank||[]).reduce((a,x)=>a+(Number(x.amt)||0),0),ledgerTotal=(S.ledger||[]).reduce((a,x)=>a+(Number(x.amt)||0),0),variance=bankTotal-ledgerTotal,status=r.unB.length===0&&r.unL.length===0?'RECONCILED':'REVIEW REQUIRED';
      doc.setFontSize(16);doc.setFont(undefined,'bold');doc.text('RECONAI',105,14,{align:'center'});doc.setFontSize(12);doc.text('BANK RECONCILIATION STATEMENT',105,21,{align:'center'});doc.setFontSize(8);doc.setFont(undefined,'normal');doc.text('Generated '+new Date().toLocaleString('en-NG'),105,27,{align:'center'});
      autoTable(doc,{startY:34,head:[['Description','Amount (NGN)']],body:[['Total bank transaction value',bankTotal],['Total ledger transaction value',ledgerTotal],['Difference / variance',variance]],styles:{fontSize:8},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'right'}}});
      let y=doc.lastAutoTable.finalY+8;doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('Reconciling items',14,y);doc.setFont(undefined,'normal');
      autoTable(doc,{startY:y+3,head:[['Category','Count','Value (NGN)']],body:[['Direct matches',r.ma.length,r.ma.reduce((a,x)=>a+(Number(x.b.amt)||0),0)],['Grouped / aggregated matches',r.grouped.length,r.grouped.reduce((a,x)=>a+(x.bs||[]).reduce((q,b)=>q+(Number(b.amt)||0),0),0)],['Timing differences',r.ti.length,r.ti.reduce((a,x)=>a+(Number(x.b.amt)||0),0)],['Net-zero GL reversal pairs',r.reversals.length,0],['Bank items genuinely not in GL',r.unB.length,r.unB.reduce((a,x)=>a+(Number(x.amt)||0),0)],['GL items genuinely not in Bank',r.unL.length,r.unL.reduce((a,x)=>a+(Number(x.amt)||0),0)]],styles:{fontSize:8},headStyles:{fontStyle:'bold'},columnStyles:{1:{halign:'center'},2:{halign:'right'}}});
      y=doc.lastAutoTable.finalY+8;doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('Reconciliation status: '+status,14,y);doc.setFont(undefined,'normal');doc.setFontSize(8);doc.text('Variance: '+amount(variance),14,y+5);y+=12;doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('Exception schedule',14,y);doc.setFont(undefined,'normal');
      const exceptions=[...(r.unB||[]).map(x=>['Bank',dateText(x.d),x.desc||'',Number(x.amt)||0,'No corresponding GL transaction']),...(r.unL||[]).map(x=>['Ledger',dateText(x.d),x.desc||'',Number(x.amt)||0,'No corresponding bank transaction'])];
      autoTable(doc,{startY:y+3,head:[['Source','Date','Particulars','Amount (NGN)','Assessment']],body:exceptions.length?exceptions:[['—','—','No genuine exceptions.',0,'—']],styles:{fontSize:7},headStyles:{fontStyle:'bold'},columnStyles:{3:{halign:'right'}}});
      doc.save('ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.pdf');
    }catch(e){alert(e.message||'Unable to generate PDF report.')}finally{if(btn){btn.disabled=false;btn.textContent='Download PDF'}}
  }
  function installButtons(){const report=document.getElementById('report');if(!report||!report.innerHTML||document.getElementById('recon-export-toolbar'))return;addStyle();const bar=document.createElement('div');bar.id='recon-export-toolbar';bar.className='export-toolbar';bar.innerHTML='<button type="button" id="download-excel" class="export-btn export-excel">Download Excel</button><button type="button" id="download-pdf" class="export-btn export-pdf">Download PDF</button>';report.prepend(bar);document.getElementById('download-excel').onclick=downloadExcel;document.getElementById('download-pdf').onclick=downloadPdf}
  function observe(){const report=document.getElementById('report');if(!report)return setTimeout(observe,300);new MutationObserver(()=>setTimeout(installButtons,0)).observe(report,{childList:true,subtree:false});installButtons()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe);else observe();
})();