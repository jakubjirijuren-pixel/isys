export function printKeyReceipt(loans,buildings){
 if(!loans?.length)return false;
 const popup=window.open("","_blank","width=420,height=720");if(!popup)return false;
 const doc=popup.document;doc.title="FOXA – Stvrzenka výpůjčky klíčů";
 const style=doc.createElement("style");style.textContent="@page{size:58mm auto;margin:0}body{width:48mm;margin:4mm 5mm;font:10px/1.4 Arial,sans-serif;color:#000;background:#fff;overflow-wrap:anywhere}h1{text-align:center;font-size:15px}h2{font-size:11px}.item{border-top:1px dashed #777;padding:7px 0}strong{display:block}.sign{margin-top:28px;border-top:1px solid #000;text-align:center;padding-top:4px}@media print{button{display:none}}";doc.head.appendChild(style);
 const root=doc.createElement("main");doc.body.appendChild(root);
 const add=(tag,value,cls,parent=root)=>{const el=doc.createElement(tag);el.textContent=String(value??"");if(cls)el.className=cls;parent.appendChild(el);return el};
 const first=loans[0];add("h1","FOXA");add("h2","STVRZENKA O VÝPŮJČCE KLÍČŮ");add("p","SBD Praha 8 · Centrální registr klíčů");
 add("strong","Vypůjčitel");add("p",first.borrower_name);
 add("strong","Datum výpůjčky");add("p",first.loaned_at?new Date(first.loaned_at).toLocaleString("cs-CZ"):"—");
 add("h2","Převzaté klíče ("+loans.length+" objektů)");
 loans.forEach((loan,i)=>{const b=buildings.find(x=>String(x.id)===String(loan.building_id));const section=add("section","","item");add("strong",(i+1)+". "+[b?.object_number,b?.street||b?.name||b?.address].filter(Boolean).join(" – "),null,section);add("div",loan.key_description||"Klíče dle evidence",null,section)});
 add("strong","Kancelář pro vrácení");add("p",first.return_office||"Dle pokynů vydávajícího");add("p","Klíče je nutné vrátit po dokončení prací.");add("div","Podpis přebírajícího","sign");
 const button=doc.createElement("button");button.textContent="Vytisknout stvrzenku";button.addEventListener("click",()=>popup.print());doc.body.insertBefore(button,root);popup.focus();return true;
}
