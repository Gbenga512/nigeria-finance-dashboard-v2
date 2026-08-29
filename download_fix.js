(function(){
'use strict';
function load(src,ready){
  var s=document.createElement('script');
  s.src=src;
  s.onload=ready;
  s.onerror=function(){alert('Unable to load the report download component. Please try again.');};
  document.head.appendChild(s);
}
function downloadExcel(){
  if(!window.XLSX){
    load('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',downloadExcel);
    return;
  }
  var report=document.getElementById('report');
  if(!report||!report.innerHTML.trim()){alert('Please generate the reconciliation statement first.');return;}
  try{
    var wb=XLSX.utils.book_new();
    var tables=report.querySelectorAll('table');
    if(!tables.length){
      var ws=XLSX.utils.aoa_to_sheet([[report.innerText]]);
      XLSX.utils.book_append_sheet(wb,ws,'Reconciliation Statement');
    }else{
      Array.prototype.forEach.call(tables,function(table,i){
        var ws=XLSX.utils.table_to_sheet(table,{raw:true});
        var name=i===0?'Reconciliation Statement':'BRS '+(i+1);
        XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));
      });
    }
    XLSX.writeFile(wb,'ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.xlsx');
  }catch(e){alert('Excel download failed: '+e.message);}
}
function downloadPDF(){
  if(!window.jspdf){
    load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',downloadPDF);
    return;
  }
  if(!window.html2canvas){
    load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',downloadPDF);
    return;
  }
  var report=document.getElementById('report');
  if(!report||!report.innerHTML.trim()){alert('Please generate the reconciliation statement first.');return;}
  html2canvas(report,{scale:2,useCORS:true,backgroundColor:'#ffffff'}).then(function(canvas){
    var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var margin=8,pageW=210-16,pageH=297-16;
    var imgW=pageW,imgH=canvas.height*imgW/canvas.width,offset=0;
    while(offset<imgH){
      if(offset>0)doc.addPage();
      var srcY=Math.round(offset*canvas.width/imgW);
      var sliceH=Math.min(Math.round(pageH*canvas.width/imgW),canvas.height-srcY);
      var slice=document.createElement('canvas');
      slice.width=canvas.width;slice.height=sliceH;
      slice.getContext('2d').drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,slice.width,slice.height);
      var drawH=sliceH*imgW/canvas.width;
      doc.addImage(slice.toDataURL('image/png'),'PNG',margin,margin,imgW,drawH);
      offset+=drawH;
    }
    doc.save('ReconAI_Bank_Reconciliation_'+new Date().toISOString().slice(0,10)+'.pdf');
  }).catch(function(e){alert('PDF download failed: '+e.message);});
}
function wire(){
  var report=document.getElementById('report');
  if(!report)return;
  var ex=report.querySelector('.export-excel'),pdf=report.querySelector('.export-pdf');
  if(ex){ex.onclick=downloadExcel;ex.setAttribute('type','button');}
  if(pdf){pdf.onclick=downloadPDF;pdf.setAttribute('type','button');}
}
wire();
new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});
})();
