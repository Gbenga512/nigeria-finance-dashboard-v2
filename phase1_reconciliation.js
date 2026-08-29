/* ReconAI Phase 1 — controlled accounting classification update.
   Loaded after the locked application code. It changes classification only;
   existing upload, mapping, UI and report/download implementation remain in place.
*/
(function(){
  'use strict';
  const amountSame=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<0.01;
  const sameDirection=(a,b)=>amountSame(a,b)&&((Number(a)>=0&&Number(b)>=0)||(Number(a)<0&&Number(b)<0));
  const days=(a,b)=>{const x=new Date(a),y=new Date(b);return isNaN(x)||isNaN(y)?999:Math.round(Math.abs(x-y)/86400000)};
  const tokens=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(Boolean);
  const similarity=(a,b)=>{const A=new Set(tokens(a)),B=new Set(tokens(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>B.has(x)&&n++);return n/Math.max(A.size,B.size)};
  const refSame=(a,b)=>!!(a&&b&&String(a).trim().toLowerCase()===String(b).trim().toLowerCase());

  function directMatches(){
    const usedB=new Set(),usedL=new Set(),matched=[],timing=[];
    for(const b of S.bank||[]){
      const candidates=[];
      for(let i=0;i<(S.ledger||[]).length;i++){
        if(usedL.has(i))continue;
        const l=S.ledger[i];
        if(!sameDirection(b.amt,l.amt))continue;
        const g=days(b.d,l.d),ref=refSame(b.ref,l.ref),sim=similarity(b.desc,l.desc);
        let score=-1;
        if(g===0){
          // Same-day exact amount/direction is strong evidence. Narration/reference
          // supports the match but is not required when the amount is unique.
          const unique=(S.ledger||[]).filter((x,j)=>!usedL.has(j)&&sameDirection(b.amt,x.amt)&&days(b.d,x.d)===0).length===1;
          if(ref||sim>=0.10||unique)score=70+(ref?25:0)+Math.round(sim*10);
        }else if(g<=30&&(ref||sim>=0.30)){
          // Date difference + independent identity evidence = timing difference.
          score=50+(ref?35:0)+Math.round(sim*25);
        }
        if(score>=0)candidates.push({i,l,g,score,ref,sim});
      }
      candidates.sort((a,b)=>b.score-a.score);
      const best=candidates[0];
      if(!best)continue;
      if(best.g>0&&best.score<60)continue;
      usedB.add(b.id);usedL.add(best.i);
      const item={b,l:best.l,score:Math.min(99,Math.round(best.score)),g:best.g,reason:best.g===0?'Same amount/direction with supporting identity evidence':'Same amount/direction with posting-date difference and supporting identity evidence'};
      if(best.g===0)matched.push(item);else timing.push(item);
    }
    return{usedB,usedL,matched,timing};
  }

  function isExplicitReversal(a,b){
    const text=(String(a.desc||'')+' '+String(b.desc||'')).toLowerCase();
    const explicit=/\b(reversal|reversed|reverse|reversing|cancelled|canceled|cancel|chargeback|refund|refunded|returned payment|payment returned)\b/.test(text);
    const ref=refSame(a.ref,b.ref);
    const sim=similarity(a.desc,b.desc);
    const opposite=(Number(a.amt)>0&&Number(b.amt)<0)||(Number(a.amt)<0&&Number(b.amt)>0);
    return opposite&&amountSame(Math.abs(a.amt),Math.abs(b.amt))&&days(a.d,b.d)<=14&&(explicit||(ref&&sim>=0.15));
  }

  function reversals(rows){
    const used=new Set(),out=[];
    for(let i=0;i<rows.length;i++){
      if(used.has(rows[i].id))continue;
      for(let j=i+1;j<rows.length;j++){
        if(used.has(rows[j].id))continue;
        const a=rows[i],b=rows[j];
        if(isExplicitReversal(a,b)){
          used.add(a.id);used.add(b.id);out.push({a,b});break;
        }
      }
    }
    return{used,out};
  }

  function subset(items,target){
    const sign=Number(target.amt)>=0;
    const pool=items.filter(x=>Number(x.amt)>=0===sign).sort((a,b)=>days(a.d,target.d)-days(b.d,target.d)).slice(0,22);
    let best=null;
    function walk(start,chosen,total,simTotal){
      if(chosen.length>=2&&Math.abs(total-Number(target.amt))<0.01){
        const avg=simTotal/chosen.length;
        const dateScore=chosen.reduce((s,x)=>s+Math.max(0,1-days(x.d,target.d)/30),0)/chosen.length;
        const score=avg*60+dateScore*40;
        if(!best||score>best.score)best={items:chosen.slice(),score};
        return;
      }
      if(chosen.length>=6)return;
      for(let j=start;j<pool.length;j++){
        const x=pool[j],next=total+Number(x.amt);
        if(Math.abs(next)>Math.abs(Number(target.amt))+0.01)continue;
        chosen.push(x);walk(j+1,chosen,next,simTotal+similarity(x.desc,target.desc));chosen.pop();
      }
    }
    walk(0,[],0,0);return best;
  }

  function grouped(B,L){
    const usedB=new Set(),usedL=new Set(),out=[];
    for(const l of L){
      if(usedL.has(l.id))continue;
      const q=subset(B.filter(b=>!usedB.has(b.id)&&days(b.d,l.d)<=14),l);
      if(q&&q.score>=28){q.items.forEach(b=>usedB.add(b.id));usedL.add(l.id);out.push({bs:q.items,ls:[l],basis:'One-to-many aggregate; exact total and same debit/credit direction'});}
    }
    for(const b of B){
      if(usedB.has(b.id))continue;
      const q=subset(L.filter(l=>!usedL.has(l.id)&&days(b.d,l.d)<=14),b);
      if(q&&q.score>=28){q.items.forEach(l=>usedL.add(l.id));usedB.add(b.id);out.push({bs:[b],ls:q.items,basis:'Many-to-one aggregate; exact total and same debit/credit direction'});}
    }
    return{usedB,usedL,out};
  }

  function runPhase1(){
    const d=directMatches();
    const usedB=new Set(d.usedB),usedL=new Set(d.usedL);
    const rb=reversals((S.bank||[]).filter(x=>!usedB.has(x.id)));
    const rl=reversals((S.ledger||[]).filter(x=>!usedL.has(x.id)));
    rb.used.forEach(id=>usedB.add(id));rl.used.forEach(id=>usedL.add(id));
    const g=grouped((S.bank||[]).filter(x=>!usedB.has(x.id)),(S.ledger||[]).filter(x=>!usedL.has(x.id)));
    g.usedB.forEach(id=>usedB.add(id));g.usedL.forEach(id=>usedL.add(id));
    S.r={
      ma:d.matched,
      ti:d.timing,
      grouped:g.out,
      reversals:[...rb.out,...rl.out],
      // Remaining items are genuine unresolved/exceptional items and therefore
      // belong in the Bank Reconciliation Statement, classified later by sign/source.
      unB:(S.bank||[]).filter(x=>!usedB.has(x.id)),
      unL:(S.ledger||[]).filter(x=>!usedL.has(x.id))
    };
    if(typeof render==='function')render();
    setTimeout(()=>{if(typeof window.buildStatement==='function')window.buildStatement();},0);
  }

  // Replace only the reconciliation trigger. All existing UI, mappings,
  // file processing and download/print functions remain intact.
  const go=document.getElementById('go');
  if(go)go.onclick=runPhase1;
})();
