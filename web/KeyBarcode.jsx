const patterns={"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn","K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn","U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn","*":"nwnnwnwnn"};
import React from "react";
export default function KeyBarcode({value,height=64}){
 const code=String(value||"").toUpperCase();
 if(!code||[...code].some(ch=>!patterns[ch]))return <span>Neplatný čárový kód</span>;
 let x=12;const bars=[];
 for(const ch of "*"+code+"*"){for(let i=0;i<9;i++){const w=patterns[ch][i]==="w"?4:2;if(i%2===0)bars.push(<rect key={bars.length} x={x} y="4" width={w} height={height} fill="#000"/>);x+=w}x+=2}
 return <svg viewBox={`0 0 ${x+12} ${height+26}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={"Čárový kód "+code} style={{maxWidth:"100%",width:"100%",height:"auto",background:"#fff"}}><rect width={x+12} height={height+26} fill="#fff"/>{bars}<text x={(x+12)/2} y={height+21} fontFamily="monospace" fontSize="12" textAnchor="middle" fill="#000">{code}</text></svg>
}
