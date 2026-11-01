// Predictable PDF pagination: crop a rendered document into A4 pages instead of
// html2pdf's DOM pagebreak padding (which can create huge gaps on iOS Safari).
export default async function renderInspectionPdf(content){
 const [{default:html2canvas},{jsPDF}]=await Promise.all([import("html2canvas"),import("jspdf")]);
 const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const scale=ios?1:1.5;
 const canvas=await html2canvas(content,{scale,backgroundColor:"#ffffff",scrollY:0,logging:false,useCORS:true,windowWidth:794});
 if(!canvas.width||!canvas.height)throw new Error("Nepodařilo se vykreslit dokument.");
 const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
 const marginX=12,marginY=12;
 const printableW=210-2*marginX,printableH=297-2*marginY;
 const pxPerMm=canvas.width/printableW;
 const maxPageHeight=printableH*pxPerMm;
 const docRect=content.getBoundingClientRect();
 const ratio=canvas.width/docRect.width;
 const breaks=[];
 // Use DOM boundaries as hints; do not split a table row or photograph if avoidable.
 const protectedElements=Array.from(content.querySelectorAll("tr,.photo-figure,h2,.sbd-header,.report-signature-image"))
  .map(el=>{const r=el.getBoundingClientRect();return {top:(r.top-docRect.top)*ratio,bottom:(r.bottom-docRect.top)*ratio}})
  .filter(r=>r.bottom>r.top+1).sort((a,b)=>a.top-b.top);
 let top=0,guard=0;
 while(top<canvas.height-1&&guard++<100){
  let end=Math.min(canvas.height,top+maxPageHeight);
  if(end<canvas.height){
   const crossing=protectedElements.filter(r=>r.top<end-2&&r.bottom>end+2&&r.top>top+maxPageHeight*.35);
   if(crossing.length)end=Math.min(...crossing.map(r=>r.top));
   // Prefer the closest row/figure boundary when it costs only a small amount of space.
   else{
    const candidates=protectedElements.map(r=>r.bottom).filter(y=>y<=end&&y>top+maxPageHeight*.86);
    if(candidates.length)end=Math.max(...candidates);
   }
  }
  if(end<=top+40)end=Math.min(canvas.height,top+maxPageHeight);
  breaks.push([Math.floor(top),Math.min(canvas.height,Math.ceil(end))]);
  top=end;
 }
 if(guard>=100)throw new Error("Dokument se nepodařilo rozdělit na stránky.");
 for(let i=0;i<breaks.length;i++){
  const [start,end]=breaks[i];
  const pageCanvas=document.createElement("canvas");
  pageCanvas.width=canvas.width;
  pageCanvas.height=Math.max(1,end-start);
  const ctx=pageCanvas.getContext("2d");
  if(!ctx)throw new Error("Nedostupné vykreslování PDF.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,pageCanvas.width,pageCanvas.height);
  ctx.drawImage(canvas,0,start,canvas.width,end-start,0,0,canvas.width,end-start);
  if(i)pdf.addPage();
  pdf.addImage(pageCanvas.toDataURL("image/jpeg",.88),"JPEG",marginX,marginY,printableW,(end-start)/pxPerMm,undefined,"FAST");
  pageCanvas.width=0;pageCanvas.height=0;
 }
 return pdf.output("blob");
}
