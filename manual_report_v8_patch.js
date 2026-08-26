/* ReconAI — v8 template precision patch */
(function(){
  const previous=window.report;
  window.report=function(){
    const result=previous?previous():null;
    try{
      if(window.S && S.bank && S.bank.length && typeof fd==='function'){
        const dates=S.bank.map(x=>x.d).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b));
        if(dates.length){
          const d=new Date(dates[0]);
          d.setDate(d.getDate()-1);
          const opening=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
          document.querySelectorAll('#report td').forEach(td=>{
            if(/^Balance as per GL - Opening \(/.test(td.textContent||'')){
              td.textContent=`Balance as per GL - Opening (${opening})`;
            }
          });
        }
      }
    }catch(e){console.error('v8 precision patch failed:',e)}
    return result;
  };
})();
