import React,{useEffect,useMemo,useRef,useState} from "react";
import "./FieldWizardForm.css";

/** Existing form fields stay mounted, preserving React state, handlers and validation. */
export default function FieldWizardForm({children,steps=["Údaje","Podrobnosti","Kontrola"],className="",onSubmit,disabled=false,...props}){
 const [step,setStep]=useState(0);
 const formRef=useRef(null);
 const fields=React.Children.toArray(children);
 const submitIndex=fields.findIndex(child=>React.isValidElement(child)&&((child.type==="button"&&(!child.props.type||child.props.type==="submit"))||child.props.className==="om-actions"));
 const last=submitIndex>=0?fields[submitIndex]:null;
 const entries=submitIndex>=0?fields.filter((_,i)=>i!==submitIndex):fields;
 const perStep=Math.max(1,Math.ceil(entries.length/Math.max(1,steps.length-1)));
 const groups=useMemo(()=>steps.map((_,i)=>i===steps.length-1?[]:entries.slice(i*perStep,(i+1)*perStep)),[children,steps.length]);
 const advance=()=>{
  const form=formRef.current;
  const current=form?.querySelector('.foxa-field-form-step[data-active="true"]');
  const controls=[...(current?.querySelectorAll('input,select,textarea')||[])].filter(el=>!el.disabled&&!el.closest('[hidden]'));
  for(const el of controls){if(!el.checkValidity()){el.reportValidity();el.focus();return}}
  setStep(v=>Math.min(steps.length-1,v+1));
  form?.scrollIntoView({block:"start",behavior:"smooth"});
 };
 const handleSubmit=e=>{if(window.matchMedia("(max-width:650px)").matches){if(step<steps.length-1){e.preventDefault();advance();return}const fields=[...(formRef.current?.querySelectorAll("input,select,textarea")||[])];for(const el of fields){if(!el.disabled&&!el.checkValidity()){e.preventDefault();setStep(Number(el.closest(".foxa-field-form-step")?.dataset.step||0));requestAnimationFrame(()=>{el.reportValidity();el.focus()});return}}}onSubmit?.(e)};
 useEffect(()=>{if(step>=steps.length)setStep(0)},[step,steps.length]);
 return <form {...props} noValidate ref={formRef} className={"foxa-field-form-wizard "+className} data-step={step} onSubmit={handleSubmit}>
  <div className="foxa-field-form-progress"><span>Krok {step+1} / {steps.length} · {steps[step]}</span><div><i style={{width:((step+1)*100/steps.length)+"%"}}/></div></div>
  {groups.slice(0,-1).map((group,i)=><div className="foxa-field-form-step" data-active={step===i} data-step={i} key={i}><h3>{steps[i]}</h3>{group}</div>)}
  <div className="foxa-field-form-step" data-active={step===steps.length-1}><h3>{steps[steps.length-1]}</h3><p className="foxa-field-form-review">Zkontroluj vyplněné údaje. Potvrzením se záznam odešle do FOXA.</p></div>
  <div className="foxa-field-form-actions"><button type="button" className="secondarybutton" onClick={()=>setStep(v=>Math.max(0,v-1))} disabled={step===0}>Zpět</button><button type="button" className="primary" onClick={advance} disabled={step===steps.length-1}>Pokračovat</button></div>
  {last&&<div className="foxa-field-form-submit">{last}</div>}
 </form>
}
