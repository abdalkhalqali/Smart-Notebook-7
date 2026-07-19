import React, { useEffect, useRef, useState, useCallback } from 'react';
import MathText from './MathText';
import { resolveApiUrl } from '../utils/apiBase';

// ══════════════════════════════════════════════════════════════════
// شارح المحاضرات التفاعلي — سبورة بيضاء تملأ الشاشة
// ══════════════════════════════════════════════════════════════════

// ── Global keyframe styles ────────────────────────────────────────
const STYLES = `
  @keyframes lnGrowUp {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  @keyframes lnDrawPath {
    from { stroke-dashoffset: var(--len,3000); }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes lnFillSector {
    from { stroke-dasharray: 0 var(--circ,1000); }
    to   { stroke-dasharray: var(--dash,0) var(--circ,1000); }
  }
  @keyframes lnFadeRow {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes lnPenBlink {
    0%,100% { opacity:1; }
    50%     { opacity:0; }
  }
  @keyframes lnSlideIn {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes lnChartIn {
    from { opacity:0; transform:scale(0.94); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes lnLaserGlow {
    0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.95), 0 0 8px 4px rgba(220,38,38,0.6); }
    50%     { box-shadow:0 0 0 9px rgba(220,38,38,0.0), 0 0 18px 9px rgba(220,38,38,0.35); }
  }
  @keyframes lnLaserBounce {
    0%,100% { margin-bottom:0px; }
    40%     { margin-bottom:3px; }
    70%     { margin-bottom:-2px; }
  }
  @keyframes lnLaserFadeIn {
    from { opacity:0; transform:scale(0.3); }
    to   { opacity:1; transform:scale(1); }
  }
  .ln-bar     { transform-origin:bottom center; animation:lnGrowUp 0.85s cubic-bezier(0.16,1,0.3,1) both; }
  .ln-line    { animation:lnDrawPath 2s ease-out forwards; }
  .ln-sector  { animation:lnFillSector 1.3s ease-out forwards; }
  .ln-row     { animation:lnFadeRow 0.45s ease-out both; }
  .ln-chart   { animation:lnChartIn 0.5s ease-out; }
  .ln-pen     { animation:lnPenBlink 1s ease-in-out infinite; }
  .ln-text    { animation:lnSlideIn 0.35s ease-out; }
  .ln-laser   { animation:lnLaserGlow 1s ease-in-out infinite, lnLaserBounce 1.6s ease-in-out infinite, lnLaserFadeIn 0.25s ease-out; }
`;

// ── Types ─────────────────────────────────────────────────────────
type Status = 'idle'|'preparing'|'connecting'|'narrating'|'listening'|'answering'|'paused'|'done'|'error';
type InputMode = 'paste'|'upload';
type UploadStep = 'select'|'extracting'|'ask_topic'|'generating'|'ready';

interface QAItem   { id:string; role:'user'|'model'; text:string; }
interface Dataset  { name:string; values:number[]; }
interface DiagNode { id:string; label:string; shape:'box'|'circle'|'diamond'; }
interface DiagEdge { from:string; to:string; label:string; }
interface CoordPoint { x:number; y:number; label?:string; }
interface CoordLine  { x1:number; y1:number; x2:number; y2:number; label?:string; }
interface ChartData {
  hasChart:boolean; chartType:'bar'|'line'|'pie'|'table'|'diagram'|'coordinate'|'none';
  title?:string; labels?:string[]; datasets?:Dataset[];
  tableHeaders?:string[]; tableRows?:string[][];
  diagramNodes?:DiagNode[]; diagramEdges?:DiagEdge[];
  coordPoints?:CoordPoint[]; coordLines?:CoordLine[];
}

// Detects model saying "drawing on board now" in any form — intentionally broad
const DRAW_CONFIRM = /جاري الرسم|سأرسم|رسم.*سبورة|سبورة.*رسم|Drawing on the board|drawing now|على السبورة|I'll draw|I will draw|drawing it|سأعرض.*مخطط|سأضع.*مخطط/i;

const VOICES = [
  {id:'Charon',label:'🎓 رجالي هادئ'},
  {id:'Kore',  label:'👩‍🏫 نسائي واضح'},
  {id:'Puck',  label:'⚡ حيوي نشيط'},
  {id:'Aoede', label:'🌙 نسائي دافئ'},
  {id:'Fenrir',label:'💪 رجالي قوي'},
  {id:'Zephyr',label:'🍃 خفيف لطيف'},
];
const ACCEPTED='.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.md,.csv,.html,image/*';
const CHART_KW=/بيان|مخطط|رسم|جدول|نسب|مئو|إحصاء|مقارن|توزيع|أعمد|دائر|خط|هيكل|مرحل|خوارزم|تدفق|محاور|إحداث|نظام.*إحداث|مستوى.*إحداث|coordinate|chart|graph|table|figure|diagram|%|٪/i;
// Coordinate system request — matches with OR without hamza (احداث / إحداث)
const COORD_CMD=/نظام\s*(ال)?[إا]حداث|[إا]حداث.*نظام|ارسم\s*(ال)?محاور|مستوى\s*(ال)?[إا]حداث|coordinate\s*system|x.*y.*محور|محور.*x|ارسم.*[إا]حداث/i;
const DRAW_CMD=/^(ارسم|أرسم|draw|رسم لي|ارسم لي|أرسم لي)\s+/i;
// Detects user asking AI to look at / explain the whiteboard drawing
const LOOK_DRAWING_CMD=/انظر.*(رسم|سبور)|اشرح.*(رسم|سبور)|ما.*(رسم|السبور)|(رسم|سبور).*(شرح|انظر)|look.*(draw|board)|explain.*(draw|board)|describe.*(draw|board)|what.*(draw|board)/i;

// ── Audio helpers ─────────────────────────────────────────────────
const f32ToI16=(inp:Float32Array)=>{const o=new Int16Array(inp.length);for(let i=0;i<inp.length;i++){const s=Math.max(-1,Math.min(1,inp[i]));o[i]=s<0?s*0x8000:s*0x7fff;}return o;};
const b64ToF32=(b64:string)=>{const bin=atob(b64);const buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);const i16=new Int16Array(buf.buffer);const f32=new Float32Array(i16.length);for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768;return f32;};
const ab2b64=(buf:ArrayBuffer)=>{const b=new Uint8Array(buf);let s='';for(let i=0;i<b.byteLength;i++)s+=String.fromCharCode(b[i]);return btoa(s);};
const fileToB64=(f:File):Promise<string>=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const d=r.result as string;res(d.includes(',')?d.split(',')[1]:d);};r.onerror=rej;r.readAsDataURL(f);});

// ── Safe substring: never splits inside $...$ LaTeX ───────────────
function safeSub(text:string,idx:number):string{
  const s=text.slice(0,idx);
  if((s.match(/\$/g)||[]).length%2===0) return s;
  const last=s.lastIndexOf('$');
  return last>=0?s.slice(0,last):s;
}

// ── useTypewriter ─────────────────────────────────────────────────
function useTypewriter(text:string,speed=5,ms=12){
  const [disp,setDisp]=useState('');
  const [done,setDone]=useState(true);
  const idx=useRef(0); const prev=useRef('');
  useEffect(()=>{
    if(text!==prev.current){prev.current=text;idx.current=0;setDisp('');setDone(false);}
    if(done) return;
    const t=setInterval(()=>{
      idx.current=Math.min(idx.current+speed,text.length);
      setDisp(safeSub(text,idx.current));
      if(idx.current>=text.length){setDone(true);setDisp(text);}
    },ms);
    return()=>clearInterval(t);
  },[text,done,speed,ms]);
  return{disp,done};
}

// ── Colours ───────────────────────────────────────────────────────
const C=['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];

// ══════════════════════════════════════════════════════════════════
// CHART COMPONENTS — pure animated SVG
// ══════════════════════════════════════════════════════════════════

// Bar chart — supports negative values
function BarChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const W=560,H=320,PL=60,PR=20,PT=44,PB=64;
  const cW=W-PL-PR,cH=H-PT-PB;
  const vals=datasets.flatMap(d=>d.values).filter(v=>!isNaN(v));
  const rawMax=vals.length?Math.max(...vals):1;
  const rawMin=vals.length?Math.min(...vals):0;
  const maxV=Math.max(rawMax,0.01);
  const minV=Math.min(rawMin,0);
  const rng=maxV-minV||1;
  const n=labels.length||1, nDs=datasets.length||1;
  const gW=cW/n, bW=Math.min(40,gW*0.75/nDs);
  const ticks=4;
  // y position of the zero line
  const zeroY=PT+cH-((0-minV)/rng)*cH;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={24} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=minV+rng*i/ticks;
        const y=PT+cH-((v-minV)/rng)*cH;
        return(<g key={i}>
          <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#e0e7ff" strokeWidth={Math.abs(v)<0.01?2:1}/>
          <text x={PL-8} y={y+4} textAnchor="end" fontSize={11} fill="#6b7280">{Math.round(v*10)/10}</text>
        </g>);
      })}
      {/* Zero line bold when there are negative values */}
      {minV<0&&<line x1={PL} y1={zeroY} x2={PL+cW} y2={zeroY} stroke="#1e1b4b" strokeWidth={2}/>}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#1e1b4b" strokeWidth={2}/>
      <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#1e1b4b" strokeWidth={1.5}/>
      {labels.map((lbl,li)=>(
        <g key={li}>
          {datasets.map((ds,di)=>{
            const v=ds.values[li]??0;
            const bH=Math.max(Math.abs(v/rng)*cH,2);
            const x=PL+li*gW+di*(bW+3)+(gW-nDs*(bW+3))/2;
            const barY=v>=0?zeroY-bH:zeroY;
            const col=C[di%C.length];
            return(
              <g key={di} style={{transformOrigin:`${x+bW/2}px ${zeroY}px`}}>
                <rect className="ln-bar" x={x} y={barY} width={bW} height={bH} fill={col} rx={4}
                  style={{animationDelay:`${li*0.09+di*0.04}s`}}/>
                <text x={x+bW/2} y={v>=0?barY-5:barY+bH+13} textAnchor="middle" fontSize={10} fill={col} fontWeight="700">{v}</text>
              </g>
            );
          })}
          <text x={PL+li*gW+gW/2} y={PT+cH+18} textAnchor="middle" fontSize={11} fill="#374151">{lbl}</text>
        </g>
      ))}
      {nDs>1&&datasets.map((ds,di)=>(
        <g key={di} transform={`translate(${PL+di*100},${H-12})`}>
          <rect x={0} y={-10} width={12} height={12} fill={C[di%C.length]} rx={3}/>
          <text x={16} y={0} fontSize={11} fill="#374151">{ds.name}</text>
        </g>
      ))}
    </svg>
  );
}

// Line chart
function LineChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const W=560,H=300,PL=56,PR=20,PT=44,PB=60;
  const cW=W-PL-PR,cH=H-PT-PB;
  const allV=datasets.flatMap(d=>d.values).filter(v=>!isNaN(v));
  const maxV=allV.length?Math.max(...allV):1, minV=Math.min(...allV,0), rng=maxV-minV||1;
  const n=labels.length||1;
  const px=(_:any,i:number)=>PL+i*(cW/(n-1||1));
  const py=(v:number)=>PT+cH-((v-minV)/rng)*cH;
  const ticks=4;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={24} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=Math.round((minV+rng*i/ticks)*100)/100;
        const y=py(v);
        return(<g key={i}>
          <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#e0e7ff" strokeWidth={1}/>
          <text x={PL-8} y={y+4} textAnchor="end" fontSize={11} fill="#6b7280">{v}</text>
        </g>);
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#1e1b4b" strokeWidth={2}/>
      <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#1e1b4b" strokeWidth={2}/>
      {datasets.map((ds,di)=>{
        const col=C[di%C.length];
        const pathD=ds.values.map((v,i)=>`${i===0?'M':'L'}${px(null,i)},${py(v)}`).join(' ');
        return(<g key={di}>
          <path className="ln-line" d={pathD} fill="none" stroke={col} strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round"
            style={{'--len':'3000',strokeDasharray:'3000'} as any}/>
          {ds.values.map((v,i)=>(
            <circle key={i} cx={px(null,i)} cy={py(v)} r={5} fill="#fff" stroke={col} strokeWidth={2.5}
              style={{animationDelay:`${2+i*0.06}s`}}/>
          ))}
        </g>);
      })}
      {labels.map((lbl,li)=>(
        <text key={li} x={px(null,li)} y={PT+cH+18} textAnchor="middle" fontSize={11} fill="#374151">{lbl}</text>
      ))}
      {datasets.length>1&&datasets.map((ds,di)=>(
        <g key={di} transform={`translate(${PL+di*110},${H-12})`}>
          <line x1={0} y1={-4} x2={14} y2={-4} stroke={C[di%C.length]} strokeWidth={3}/>
          <text x={18} y={0} fontSize={11} fill="#374151">{ds.name}</text>
        </g>
      ))}
    </svg>
  );
}

// Pie chart
function PieChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const vals=datasets[0]?.values??[];
  const total=vals.reduce((a,b)=>a+b,0)||1;
  const CX=155,CY=135,R=105;
  const circ=2*Math.PI*R;
  let off=0;
  return(
    <svg width="100%" viewBox="0 0 440 270" style={{overflow:'visible'}}>
      {title&&<text x={220} y={20} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      <circle cx={CX} cy={CY} r={R} fill="#f1f5f9"/>
      {vals.map((v,i)=>{
        const pct=v/total;
        const dash=pct*circ;
        const rot=off*360-90;
        off+=pct;
        return(
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={C[i%C.length]} strokeWidth={R*2}
            className="ln-sector"
            style={{'--dash':dash,'--circ':circ,transform:`rotate(${rot}deg)`,transformOrigin:`${CX}px ${CY}px`,animationDelay:`${i*0.2}s`} as any}/>
        );
      })}
      {(()=>{
        let o2=0;
        return vals.map((v,i)=>{
          const pct=v/total;
          const mid=(o2+pct/2)*2*Math.PI-Math.PI/2;
          o2+=pct;
          const lx=CX+Math.cos(mid)*(R+32);
          const ly=CY+Math.sin(mid)*(R+32);
          return(<text key={i} x={lx} y={ly} textAnchor="middle" fontSize={11} fill={C[i%C.length]} fontWeight="700">
            {labels[i]||''} {Math.round(pct*100)}%
          </text>);
        });
      })()}
      {labels.map((lbl,i)=>(
        <g key={i} transform={`translate(295,${32+i*24})`}>
          <rect x={0} y={-11} width={13} height={13} fill={C[i%C.length]} rx={3}/>
          <text x={18} y={0} fontSize={11} fill="#374151">{lbl}</text>
        </g>
      ))}
    </svg>
  );
}

// Table
function TableChart({title,tableHeaders=[],tableRows=[]}:{title?:string;tableHeaders?:string[];tableRows?:string[][]}){
  return(
    <div className="w-full px-2">
      {title&&<p className="text-center text-sm font-extrabold text-slate-800 mb-3">{title}</p>}
      <table className="w-full text-sm border-collapse" style={{fontFamily:'system-ui'}}>
        <thead>
          <tr>{tableHeaders.map((h,i)=>(
            <th key={i} className="border border-slate-300 bg-indigo-100 px-3 py-2 text-right font-extrabold text-indigo-900">{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {tableRows.map((row,ri)=>(
            <tr key={ri} className="ln-row even:bg-slate-50" style={{animationDelay:`${ri*0.08}s`}}>
              {row.map((cell,ci)=>(
                <td key={ci} className="border border-slate-200 px-3 py-2 text-right text-slate-800">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Diagram
function DiagramChart({title,diagramNodes=[],diagramEdges=[]}:{title?:string;diagramNodes?:DiagNode[];diagramEdges?:DiagEdge[]}){
  const W=560,H=320,nN=diagramNodes.length||1;
  const pos:Record<string,{x:number,y:number}>={};
  diagramNodes.forEach((n,i)=>{
    if(nN===1){pos[n.id]={x:W/2,y:H/2};return;}
    const ang=(i/nN)*2*Math.PI-Math.PI/2;
    pos[n.id]={x:W/2+Math.cos(ang)*(nN<=4?160:185),y:H/2+Math.sin(ang)*(nN<=4?105:120)};
  });
  const S=42;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={18} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      <defs>
        <marker id="lnarr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6366f1"/>
        </marker>
      </defs>
      {diagramEdges.map((e,i)=>{
        const s=pos[e.from],t=pos[e.to];
        if(!s||!t) return null;
        const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
        const dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
        const ox=-dy/dist*22,oy=dx/dist*22;
        const d=`M${s.x},${s.y} Q${mx+ox},${my+oy} ${t.x},${t.y}`;
        return(<g key={i}>
          <path className="ln-line" d={d} fill="none" stroke="#6366f1" strokeWidth={2}
            markerEnd="url(#lnarr)" style={{'--len':'800',strokeDasharray:'800'} as any}/>
          {e.label&&<text x={mx+ox*1.4} y={my+oy*1.4+4} textAnchor="middle" fontSize={9} fill="#6366f1" fontStyle="italic">{e.label}</text>}
        </g>);
      })}
      {diagramNodes.map((node,i)=>{
        const {x,y}=pos[node.id]||{x:W/2,y:H/2};
        const col=C[i%C.length];
        const words=node.label.split(/\s+/);
        const lh=14;
        if(node.shape==='circle') return(
          <g key={node.id}>
            <circle cx={x} cy={y} r={S} fill="#fff" stroke={col} strokeWidth={3}/>
            {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lh+5} textAnchor="middle" fontSize={11} fill={col} fontWeight="700">{w}</text>)}
          </g>);
        if(node.shape==='diamond'){
          const pts=`${x},${y-S} ${x+S*1.3},${y} ${x},${y+S} ${x-S*1.3},${y}`;
          return(<g key={node.id}>
            <polygon points={pts} fill="#fff" stroke={col} strokeWidth={2.5}/>
            {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lh+5} textAnchor="middle" fontSize={10} fill={col} fontWeight="700">{w}</text>)}
          </g>);}
        const bW=S*2.8,bH=S*1.6;
        return(<g key={node.id}>
          <rect x={x-bW/2} y={y-bH/2} width={bW} height={bH} rx={8} fill="#fff" stroke={col} strokeWidth={2.5}/>
          {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lh+5} textAnchor="middle" fontSize={11} fill={col} fontWeight="700">{w}</text>)}
        </g>);
      })}
    </svg>
  );
}

// Coordinate / axes chart — draws x-y plane with negative values, points, vectors
function CoordinateChart({title,coordPoints=[],coordLines=[]}:{
  title?:string; coordPoints?:CoordPoint[]; coordLines?:CoordLine[];
}){
  const W=560,H=340;
  const PAD={l:64,r:36,t:48,b:52};
  const cW=W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const allX=[...coordPoints.map(p=>p.x),...coordLines.flatMap(l=>[l.x1,l.x2]),0];
  const allY=[...coordPoints.map(p=>p.y),...coordLines.flatMap(l=>[l.y1,l.y2]),0];
  // Ensure a minimum visible range of ±5 on both axes — avoids tiny "square" when no data
  const rawXMin=Math.min(...allX), rawXMax=Math.max(...allX);
  const rawYMin=Math.min(...allY), rawYMax=Math.max(...allY);
  const xSpan=rawXMax-rawXMin, ySpan=rawYMax-rawYMin;
  const xPad=xSpan<8?(8-xSpan)/2+1:1.2, yPad=ySpan<8?(8-ySpan)/2+1:1.2;
  const xMin=Math.floor(rawXMin-xPad), xMax=Math.ceil(rawXMax+xPad);
  const yMin=Math.floor(rawYMin-yPad), yMax=Math.ceil(rawYMax+yPad);
  const xRng=xMax-xMin||1, yRng=yMax-yMin||1;
  const toSvg=(x:number,y:number)=>({
    sx:PAD.l+(x-xMin)/xRng*cW,
    sy:PAD.t+(yMax-y)/yRng*cH,
  });
  const {sx:zeroX,sy:zeroY}=toSvg(0,0);
  const xTicks=Array.from({length:xMax-xMin+1},(_,i)=>xMin+i);
  const yTicks=Array.from({length:yMax-yMin+1},(_,i)=>yMin+i);
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      <defs>
        <marker id="cnarr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1e1b4b"/>
        </marker>
        <marker id="cnarrC" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4F46E5"/>
        </marker>
      </defs>
      {title&&<text x={W/2} y={22} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      {/* Grid vertical lines */}
      {xTicks.map(v=>{const {sx}=toSvg(v,0);return(
        <line key={v} x1={sx} y1={PAD.t} x2={sx} y2={PAD.t+cH}
          stroke={v===0?'#1e1b4b':'#e5e7eb'} strokeWidth={v===0?2:1}
          strokeDasharray={v===0?'':'3,3'}/>
      );})}
      {/* Grid horizontal lines */}
      {yTicks.map(v=>{const {sy}=toSvg(0,v);return(
        <line key={v} x1={PAD.l} y1={sy} x2={PAD.l+cW} y2={sy}
          stroke={v===0?'#1e1b4b':'#e5e7eb'} strokeWidth={v===0?2:1}
          strokeDasharray={v===0?'':'3,3'}/>
      );})}
      {/* X axis arrow */}
      <line x1={PAD.l} y1={zeroY} x2={PAD.l+cW+12} y2={zeroY}
        stroke="#1e1b4b" strokeWidth={2.5} markerEnd="url(#cnarr)"/>
      {/* Y axis arrow */}
      <line x1={zeroX} y1={PAD.t+cH} x2={zeroX} y2={PAD.t-12}
        stroke="#1e1b4b" strokeWidth={2.5} markerEnd="url(#cnarr)"/>
      {/* Axis labels */}
      <text x={PAD.l+cW+18} y={zeroY+5} fontSize={14} fill="#1e1b4b" fontWeight="800">x</text>
      <text x={zeroX} y={PAD.t-16} fontSize={14} fill="#1e1b4b" fontWeight="800" textAnchor="middle">y</text>
      {/* X tick marks + labels */}
      {xTicks.filter(v=>v!==0).map(v=>{const {sx}=toSvg(v,0);return(
        <g key={v}>
          <line x1={sx} y1={zeroY-4} x2={sx} y2={zeroY+4} stroke="#1e1b4b" strokeWidth={1.5}/>
          <text x={sx} y={zeroY+17} textAnchor="middle" fontSize={11} fill="#374151">{v}</text>
        </g>
      );})}
      {/* Y tick marks + labels */}
      {yTicks.filter(v=>v!==0).map(v=>{const {sy}=toSvg(0,v);return(
        <g key={v}>
          <line x1={zeroX-4} y1={sy} x2={zeroX+4} y2={sy} stroke="#1e1b4b" strokeWidth={1.5}/>
          <text x={zeroX-10} y={sy+4} textAnchor="end" fontSize={11} fill="#374151">{v}</text>
        </g>
      );})}
      {/* Origin */}
      <text x={zeroX-10} y={zeroY+17} textAnchor="end" fontSize={11} fill="#374151">0</text>
      {/* Lines / vectors */}
      {coordLines.map((l,i)=>{
        const s=toSvg(l.x1,l.y1),t=toSvg(l.x2,l.y2);
        const mx=(s.sx+t.sx)/2,my=(s.sy+t.sy)/2;
        return(<g key={i}>
          <line className="ln-line" x1={s.sx} y1={s.sy} x2={t.sx} y2={t.sy}
            stroke={C[i%C.length]} strokeWidth={2.5} markerEnd="url(#cnarrC)"
            style={{'--len':'600',strokeDasharray:'600'} as any}/>
          {l.label&&<text x={mx+6} y={my-8} fontSize={11} fill={C[i%C.length]} fontWeight="700">{l.label}</text>}
        </g>);
      })}
      {/* Points */}
      {coordPoints.map((p,i)=>{
        const {sx,sy}=toSvg(p.x,p.y);
        const col=C[(i+Math.max(coordLines.length,0))%C.length];
        return(<g key={i} style={{animation:`lnSlideIn 0.4s ease-out ${i*0.12}s both`}}>
          <circle cx={sx} cy={sy} r={6} fill={col} stroke="#fff" strokeWidth={2.5}/>
          {p.label&&<text x={sx+10} y={sy-8} fontSize={12} fill={col} fontWeight="700">{p.label}</text>}
          <text x={sx} y={sy+22} textAnchor="middle" fontSize={10} fill="#6b7280">
            ({p.x},{p.y<0?`−${Math.abs(p.y)}`:p.y})
          </text>
        </g>);
      })}
    </svg>
  );
}

function ChartPanel({chart}:{chart:ChartData}){
  if(!chart.hasChart||chart.chartType==='none') return null;
  const w='w-full ln-chart';
  switch(chart.chartType){
    case 'bar':        return <div className={w}><BarChart        title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'line':       return <div className={w}><LineChart       title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'pie':        return <div className={w}><PieChart        title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'table':      return <div className={w}><TableChart      title={chart.title} tableHeaders={chart.tableHeaders} tableRows={chart.tableRows}/></div>;
    case 'diagram':    return <div className={w}><DiagramChart    title={chart.title} diagramNodes={chart.diagramNodes} diagramEdges={chart.diagramEdges}/></div>;
    case 'coordinate': return <div className={w}><CoordinateChart title={chart.title} coordPoints={chart.coordPoints} coordLines={chart.coordLines}/></div>;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// WHITEBOARD — realistic white board, fills all available space
// ══════════════════════════════════════════════════════════════════
function Whiteboard({text,chart,chunkIdx,totalChunks,isDrawingChart,chartErrorMsg,drawImg,isAnalyzingDraw,onClearDraw}:{
  text:string; chart:ChartData|null; chunkIdx:number; totalChunks:number; isDrawingChart:boolean; chartErrorMsg?:string;
  drawImg?:string|null; isAnalyzingDraw?:boolean; onClearDraw?:()=>void;
}){
  const {disp,done}=useTypewriter(text,5,11);
  const boardScrollRef=useRef<HTMLDivElement>(null);
  const hasContent=disp.trim().length>0||chart?.hasChart||!!drawImg;

  // Auto-scroll to bottom as text is typed so board always shows latest content
  useEffect(()=>{
    const el=boardScrollRef.current;
    if(el) el.scrollTop=el.scrollHeight;
  },[disp]);

  return(
    <div className="relative flex-1 flex flex-col min-h-0 mx-3 my-2 rounded-xl overflow-hidden"
      style={{
        // Wooden frame
        border:'12px solid #6b4220',
        boxShadow:'0 0 0 2px #a0784a, 0 12px 48px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.2)',
        background:'#fefdf8',
      }}>
      {/* Frame inner glow */}
      <div className="absolute inset-0 pointer-events-none rounded-sm"
        style={{boxShadow:'inset 0 3px 8px rgba(255,255,255,0.4),inset 0 -3px 8px rgba(0,0,0,0.12)'}}/>
      {/* Wood grain texture on frame corners */}
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-tl-lg pointer-events-none"
        style={{background:'radial-gradient(circle at 30% 30%,#c8975a,#6b4220)'}}/>
      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-tr-lg pointer-events-none"
        style={{background:'radial-gradient(circle at 70% 30%,#c8975a,#6b4220)'}}/>
      <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-bl-lg pointer-events-none"
        style={{background:'radial-gradient(circle at 30% 70%,#c8975a,#6b4220)'}}/>
      <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-br-lg pointer-events-none"
        style={{background:'radial-gradient(circle at 70% 70%,#c8975a,#6b4220)'}}/>

      {/* Chalk tray */}
      <div className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
        style={{background:'linear-gradient(to bottom,#8B5E34,#5a3010)',zIndex:2}}/>

      {/* Progress dots */}
      {totalChunks>0&&(
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex gap-1.5">
            {Array.from({length:Math.min(totalChunks,20)},(_,i)=>(
              <div key={i} className="h-1.5 rounded-full transition-all duration-500"
                style={{width:i<=chunkIdx?18:10,background:i<=chunkIdx?'#4F46E5':'#d1d5db'}}/>
            ))}
            {totalChunks>20&&<span className="text-[9px] text-slate-400">…</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-white/60 rounded px-1.5 py-0.5">
            {chunkIdx+1}/{totalChunks}
          </span>
        </div>
      )}

      {/* Drawing indicator */}
      {isDrawingChart&&(
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 bg-indigo-100 border border-indigo-300 rounded-full px-2.5 py-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
          <span className="text-[10px] font-bold text-indigo-700">جاري الرسم…</span>
        </div>
      )}
      {/* Chart error — quota or parse failure */}
      {chartErrorMsg&&!isDrawingChart&&(
        <div className="absolute top-3 left-4 right-4 z-10 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-amber-600 text-sm mt-0.5">⚠️</span>
          <span className="text-[11px] font-semibold text-amber-800 leading-snug">{chartErrorMsg.replace(/^⚠️\s*/,'')}</span>
        </div>
      )}

      {/* Board content — auto-scrolls to bottom as text grows */}
      <div ref={boardScrollRef} className="flex-1 min-h-0 overflow-y-auto px-8 pt-10 pb-8" dir="rtl">
        {!hasContent?(
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-300 italic text-xl" style={{fontFamily:'Georgia,serif'}}>
              في انتظار بدء الشرح…
            </p>
          </div>
        ):(
          <div className="space-y-6">
            {/* Written text */}
            {disp&&(
              <div className="ln-text" style={{
                fontFamily:'Georgia,"Times New Roman",serif',
                fontSize:'clamp(15px,1.8vw,20px)',
                lineHeight:'32px',
                color:'#1a1832',
                letterSpacing:'0.01em'
              }}>
                <MathText text={disp} className="text-slate-900" dir="rtl"/>
                {!done&&(
                  <span className="inline-block align-middle" style={{marginRight:6,position:'relative',display:'inline-flex',alignItems:'center',gap:4}}>
                    {/* Chalk pen icon */}
                    <svg className="ln-pen" width={20} height={20} viewBox="0 0 24 24" fill="none"
                      style={{verticalAlign:'middle',opacity:0.65,flexShrink:0}}>
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="#1a1832" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="m15 5 4 4" stroke="#1a1832" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                    {/* Laser pointer dot — glows red */}
                    <span className="ln-laser" style={{
                      width:15, height:15, borderRadius:'50%', flexShrink:0,
                      background:'radial-gradient(circle at 35% 35%, #ff9999, #dc2626 60%, #7f1d1d)',
                      display:'inline-block', verticalAlign:'middle',
                    }}/>
                  </span>
                )}
              </div>
            )}

            {/* Chart */}
            {chart?.hasChart&&(
              <div className="border-t-2 border-dashed border-slate-200 pt-5">
                <ChartPanel chart={chart}/>
              </div>
            )}

            {/* Hand-drawn image — pinned on whiteboard, persists alongside any chart */}
            {drawImg&&(
              <div className="relative mt-2 rounded-2xl overflow-hidden border-2 border-dashed border-indigo-300/70 shadow-lg">
                {/* Dismiss button */}
                {onClearDraw&&!isAnalyzingDraw&&(
                  <button onClick={onClearDraw}
                    className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white text-xs font-black transition shadow-lg"
                    title="إزالة الرسم من السبورة">✕</button>
                )}
                <img
                  src={`data:image/jpeg;base64,${drawImg}`}
                  alt="رسم يدوي"
                  className="w-full object-contain bg-white"
                  style={{maxHeight:400}}/>
                {isAnalyzingDraw&&(
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-sm font-black shadow-2xl">
                      <div className="w-5 h-5 border-[3px] border-white border-t-transparent rounded-full animate-spin"/>
                      الذكاء الاصطناعي يحلل رسمك ويحوّله…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DRAW PAD — full-whiteboard canvas overlay for manual sketching
// ══════════════════════════════════════════════════════════════════
function DrawPad({onClose,onEnhance,isEnhancing}:{
  onClose:()=>void; onEnhance:(b64:string,mime:string)=>void; isEnhancing:boolean;
}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [isDrawing,setIsDrawing]=useState(false);
  const [penColor,setPenColor]=useState('#1a1832');
  const [penSize,setPenSize]=useState(3);
  const [tool,setTool]=useState<'pen'|'eraser'>('pen');
  const lastPos=useRef<{x:number;y:number}|null>(null);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return;
    const ctx=c.getContext('2d')!;
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,c.width,c.height);
  },[]);

  const getPos=(e:React.MouseEvent|React.TouchEvent,c:HTMLCanvasElement)=>{
    const rect=c.getBoundingClientRect();
    const sx=c.width/rect.width, sy=c.height/rect.height;
    if('touches' in e){const t=e.touches[0];return{x:(t.clientX-rect.left)*sx,y:(t.clientY-rect.top)*sy};}
    return{x:((e as React.MouseEvent).clientX-rect.left)*sx,y:((e as React.MouseEvent).clientY-rect.top)*sy};
  };

  const startDraw=(e:React.MouseEvent|React.TouchEvent)=>{
    e.preventDefault(); setIsDrawing(true);
    const c=canvasRef.current; if(!c) return;
    lastPos.current=getPos(e,c);
  };
  const draw=(e:React.MouseEvent|React.TouchEvent)=>{
    if(!isDrawing) return;
    const c=canvasRef.current; if(!c) return;
    const ctx=c.getContext('2d')!;
    const pos=getPos(e,c);
    if(!lastPos.current){lastPos.current=pos;return;}
    ctx.beginPath();
    ctx.lineWidth=tool==='eraser'?penSize*6:penSize;
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle=tool==='eraser'?'#ffffff':penColor;
    ctx.moveTo(lastPos.current.x,lastPos.current.y);
    ctx.lineTo(pos.x,pos.y); ctx.stroke();
    lastPos.current=pos;
  };
  const endDraw=()=>{setIsDrawing(false);lastPos.current=null;};

  const clear=()=>{
    const c=canvasRef.current; if(!c) return;
    const ctx=c.getContext('2d')!;
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,c.width,c.height);
  };
  const submit=()=>{
    const c=canvasRef.current; if(!c) return;
    // Compress: scale down to max 900×580 and encode as JPEG (was ~3MB PNG → ~150KB)
    const maxW=900,maxH=580;
    const scale=Math.min(1,maxW/c.width,maxH/c.height);
    const tmp=document.createElement('canvas');
    tmp.width=Math.round(c.width*scale); tmp.height=Math.round(c.height*scale);
    const ctx2=tmp.getContext('2d')!;
    ctx2.fillStyle='#ffffff'; ctx2.fillRect(0,0,tmp.width,tmp.height);
    ctx2.drawImage(c,0,0,tmp.width,tmp.height);
    onEnhance(tmp.toDataURL('image/jpeg',0.82).split(',')[1],'image/jpeg');
  };

  return(
    <div className="absolute inset-0 z-30 flex flex-col" style={{borderRadius:'inherit',overflow:'hidden'}}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
        <span className="text-white text-xs font-black">✏️ ارسم هنا</span>
        <div className="w-px h-4 bg-white/20 mx-1"/>
        {/* Colors */}
        {(['#1a1832','#dc2626','#2563eb','#16a34a','#d97706','#7c3aed'] as const).map(c=>(
          <button key={c} onClick={()=>{setTool('pen');setPenColor(c);}}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110"
            style={{background:c,outline:penColor===c&&tool==='pen'?'2.5px solid #fff':'2.5px solid transparent',outlineOffset:1}}/>
        ))}
        <div className="w-px h-4 bg-white/20 mx-1"/>
        {/* Sizes */}
        {([2,4,7] as const).map(s=>(
          <button key={s} onClick={()=>setPenSize(s)}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition"
            style={{background:penSize===s&&tool==='pen'?'#4f46e5':'#374151'}}>
            <div className="rounded-full bg-white" style={{width:s+2,height:s+2}}/>
          </button>
        ))}
        <div className="w-px h-4 bg-white/20 mx-1"/>
        <button onClick={()=>setTool('eraser')}
          className="px-2 py-1 rounded-lg text-[11px] font-bold transition"
          style={{background:tool==='eraser'?'#4f46e5':'#374151',color:'white'}}>
          ممحاة
        </button>
        <button onClick={clear}
          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-800/80 hover:bg-red-700 text-white transition">
          مسح الكل
        </button>
        <div className="flex-1"/>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition text-sm w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15">✕</button>
      </div>
      {/* Canvas */}
      <canvas
        ref={canvasRef} width={1400} height={900}
        className="flex-1 w-full touch-none"
        style={{cursor:tool==='eraser'?'cell':'crosshair',background:'#fff',display:'block'}}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
      {/* Bottom bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-sm border-t border-white/10">
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
          إلغاء
        </button>
        <div className="flex-1"/>
        <p className="text-[11px] text-slate-400">ارسم رسمك ثم اضغط — سيقوم الذكاء الاصطناعي بتحسينه وعرضه على السبورة</p>
        <button onClick={submit} disabled={isEnhancing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-black transition shadow-lg">
          {isEnhancing
            ?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>جاري التحسين…</>
            :<>✨ شاهد رسمي</>}
        </button>
      </div>
    </div>
  );
}

// ── AI headers ────────────────────────────────────────────────────
function getAiHeaders():Record<string,string>{
  const key=(localStorage.getItem('customAiKey')||'').trim();
  const prov=localStorage.getItem('aiProvider')||'gemini';
  if(!key) return {};
  const h:Record<string,string>={'x-custom-api-key':key,'x-custom-provider':prov};
  if(prov==='custom'){const u=(localStorage.getItem('customEndpointUrl')||'').trim();if(u)h['x-custom-endpoint-url']=u;}
  return h;
}

function chartScore(text:string):number{
  let s=0;
  if(CHART_KW.test(text)) s+=2;
  const n=(text.match(/\d+\.?\d*/g)||[]).length;
  if(n>=3) s+=1; if(n>=6) s+=1;
  if(/%|٪/.test(text)) s+=1;
  return s;
}

// ── Local chart parser — instant, zero API ───────────────────────────
// 1) Parses explicit data:  "ارسم مخطط: أ=5 ب=8 ج=3"
// 2) Falls back to demo:    "ارسم مخطط عمودي"  → sample bar chart
function parseChartLocally(text:string):ChartData{
  const t=text.trim();

  // ── Coordinate system ─────────────────────────────────────────────
  if(COORD_CMD.test(t)){
    const pts:CoordPoint[]=[];
    const pairRe=/\(?\s*(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)\s*\)?/g;
    let m; while((m=pairRe.exec(t))!==null) pts.push({x:+m[1],y:+m[2]});
    return{hasChart:true,chartType:'coordinate',title:'نظام الإحداثيات',coordPoints:pts,coordLines:[]};
  }

  // ── Percentages with labels → pie ─────────────────────────────────
  const pctRe=/([^٠-٩\d,،:\n=\(\)]{1,20}?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*[%٪]/g;
  const pcts:{name:string;val:number}[]=[];
  let pm; while((pm=pctRe.exec(t))!==null){
    const name=pm[1].replace(/^[\s:=،,-]+|[\s:=،,-]+$/g,'').trim();
    if(name.length>0&&name.length<20) pcts.push({name,val:+pm[2]});
  }
  if(pcts.length>=2) return{hasChart:true,chartType:'pie',
    labels:pcts.map(p=>p.name),
    datasets:[{name:'النسبة',values:pcts.map(p=>p.val)}]};

  // ── key=value or key:value pairs → bar or line ────────────────────
  const kvRe=/([^\u0660-\u0669\d,،:\n=\(\)%٪]{1,18}?)\s*[=:]\s*(-?\d+(?:\.\d+)?)/g;
  const kvs:{name:string;val:number}[]=[];
  let kv; while((kv=kvRe.exec(t))!==null){
    const name=kv[1].replace(/^[\s:=،,-]+|[\s:=،,-]+$/g,'').trim();
    if(name.length>0&&name.length<18) kvs.push({name,val:+kv[2]});
  }
  if(kvs.length>=2){
    const isLine=/خط|زمن|سنة|شهر|يوم|line|year|month|trend/i.test(t);
    return{hasChart:true,chartType:isLine?'line':'bar',
      labels:kvs.map(k=>k.name),
      datasets:[{name:'البيانات',values:kvs.map(k=>k.val)}]};
  }

  // ── Bare numbers (no labels) → bar with auto labels ───────────────
  const nums=(t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number).filter(n=>!isNaN(n));
  if(nums.length>=2&&nums.length<=12){
    const isLine=/خط|زمن|سنة|شهر|يوم|line|year|month|trend/i.test(t);
    const isPie=/دائر|pie|نسب/i.test(t);
    const labels=nums.map((_,i)=>String.fromCharCode(0x0623+i)); // أ،ب،ج…
    return{hasChart:true,chartType:isPie?'pie':isLine?'line':'bar',
      labels,datasets:[{name:'البيانات',values:nums}]};
  }

  // ── FALLBACK: command with no data → demo chart ───────────────────
  // Draws an illustrative sample so the board always shows SOMETHING
  if(/دائر|pie|نسب\s*مئو/i.test(t))
    return{hasChart:true,chartType:'pie',title:'مخطط دائري — مثال',
      labels:['الفئة أ','الفئة ب','الفئة ج','الفئة د'],
      datasets:[{name:'النسبة',values:[35,28,22,15]}]};

  if(/خطي|line|منحنى|تطور|زمن/i.test(t))
    return{hasChart:true,chartType:'line',title:'مخطط خطي — مثال',
      labels:['يناير','فبراير','مارس','أبريل','مايو','يونيو'],
      datasets:[{name:'القيم',values:[30,48,42,65,58,74]}]};

  if(/جدول|table/i.test(t))
    return{hasChart:true,chartType:'table',title:'جدول — مثال',
      tableHeaders:['العنصر','القيمة','الملاحظة'],
      tableRows:[['البند ١','100','ممتاز'],['البند ٢','80','جيد جداً'],['البند ٣','65','مقبول']]};

  if(/هيكل|مراحل|دورة|خوارزم|تدفق|diagram|flowchart/i.test(t))
    return{hasChart:true,chartType:'diagram',title:'مخطط تدفق — مثال',
      diagramNodes:[
        {id:'s',label:'البداية',shape:'circle'},
        {id:'p',label:'المعالجة',shape:'box'},
        {id:'d',label:'قرار؟',shape:'diamond'},
        {id:'e',label:'النهاية',shape:'circle'}
      ],
      diagramEdges:[{from:'s',to:'p',label:''},{from:'p',to:'d',label:''},{from:'d',to:'e',label:'نعم'}]};

  // مخطط عمودي أو أي طلب رسم عام (مربعات عمودية = bar chart)
  if(/مخطط|عمودي|bar|أعمد|بيان|مقارن|رسم|ارسم|مربع|أعمدة|عمود/i.test(t))
    return{hasChart:true,chartType:'bar',title:'مخطط أعمدة — مثال',
      labels:['أ','ب','ج','د','هـ'],
      datasets:[{name:'البيانات',values:[65,42,78,55,88]}]};

  return{hasChart:false,chartType:'none'};
}

// ── callChartAnalyze — tries API first, falls back to local parser ───
// On quota error: returns local parse result + quotaExceeded flag
async function callChartAnalyze(text:string):Promise<ChartData&{quotaExceeded?:boolean}>{
  try{
    const r=await fetch(resolveApiUrl('/api/ai/lecture-chart-analyze'),{
      method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()},
      body:JSON.stringify({text})
    });
    const d=await r.json();
    if(d.quotaExceeded){
      // API quota hit — fall back to local parser silently
      const local=parseChartLocally(text);
      return{...local,quotaExceeded:true};
    }
    return d;
  }catch{
    // Network or parse error — fall back to local parser
    return parseChartLocally(text);
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
interface Props{onClose:()=>void;initialText?:string;}

export default function LectureNarrator({onClose,initialText=''}:Props){
  // Session state
  const [status,setStatus]=useState<Status>('idle');
  const [lectureText,setLectureText]=useState(initialText);
  const [voice,setVoice]=useState('Charon');
  const [errorMsg,setErrorMsg]=useState('');
  const [qa,setQa]=useState<QAItem[]>([]);
  const [totalChunks,setTotalChunks]=useState(0);
  const [chunkIndex,setChunkIndex]=useState(0);
  const [chunkText,setChunkText]=useState('');
  const [currentChart,setCurrentChart]=useState<ChartData|null>(null);
  const [isDrawingChart,setIsDrawingChart]=useState(false);
  const [chartErrorMsg,setChartErrorMsg]=useState('');
  const [askMode,setAskMode]=useState(false);

  // Upload state
  const [inputMode,setInputMode]=useState<InputMode>('paste');
  const [uploadStep,setUploadStep]=useState<UploadStep>('select');
  const [uploadedFile,setUploadedFile]=useState<File|null>(null);
  const [extractedDoc,setExtractedDoc]=useState('');
  const [topicInput,setTopicInput]=useState('');
  const [uploadMsg,setUploadMsg]=useState('');

  // QR scan state
  const [qrSessionId,setQrSessionId]=useState<string|null>(null);
  const [qrPageUrl,setQrPageUrl]=useState<string|null>(null);
  const [qrStatus,setQrStatus]=useState<'idle'|'waiting'|'processing'|'done'|'error'>('idle');
  const [qrError,setQrError]=useState('');
  const qrPollRef=useRef<ReturnType<typeof setInterval>|null>(null);

  // Direct draw command (user types "ارسم ...")
  const [directCmd,setDirectCmd]=useState('');
  const [showCmdBar,setShowCmdBar]=useState(false);

  // Draw pad (manual sketching + AI enhancement)
  const [showDrawPad,setShowDrawPad]=useState(false);
  const [isEnhancing,setIsEnhancing]=useState(false);
  const [manualDrawImg,setManualDrawImg]=useState<string|null>(null);
  // Refs to current drawing/chart so async callbacks can read latest values
  const manualDrawImgRef=useRef<string|null>(null);
  const currentChartRef=useRef<ChartData|null>(null);
  // Stores the last AI-generated explanation for the manual drawing (survives chart replacement)
  const lastDrawDescriptionRef=useRef<string>('');

  // Refs
  const wsRef=useRef<WebSocket|null>(null);
  const audioCtxRef=useRef<AudioContext|null>(null);
  const procRef=useRef<ScriptProcessorNode|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const playTimeRef=useRef(0);
  const sourcesRef=useRef<AudioBufferSourceNode[]>([]);
  const statusRef=useRef<Status>('idle');
  const chartCacheRef=useRef<Map<string,ChartData>>(new Map());
  const qaEndRef=useRef<HTMLDivElement>(null);
  // Buffer model transcript between turns so DRAW_CONFIRM analysis runs on full description
  const modelTransBuf=useRef('');
  const drawPendingRef=useRef(false);
  // Generation counter for model-initiated draws; stale async results are discarded
  const drawGenRef=useRef(0);
  // Separate counter for user-initiated draws — takes priority over model draws
  const userDrawGenRef=useRef(0);
  // Prevents lecture-chunk auto-analysis from ERASING a user-requested chart
  const userDrawLockRef=useRef(false);
  // Fallback: fires chart analysis if turn_complete is delayed or never arrives
  const drawFallbackTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  statusRef.current=status;

  useEffect(()=>{qaEndRef.current?.scrollIntoView({behavior:'smooth'});},[qa]);
  // Keep refs in sync with state for use inside stale callbacks
  useEffect(()=>{manualDrawImgRef.current=manualDrawImg;},[manualDrawImg]);
  useEffect(()=>{currentChartRef.current=currentChart;},[currentChart]);

  // Inject styles once
  useEffect(()=>{
    if(document.getElementById('ln-styles')) return;
    const el=document.createElement('style');
    el.id='ln-styles'; el.textContent=STYLES;
    document.head.appendChild(el);
    return()=>{el.remove();};
  },[]);

  // Audio
  const hardStop=useCallback(()=>{
    for(const s of sourcesRef.current){try{s.onended=null;s.stop();}catch(_){}}
    sourcesRef.current=[];
    if(audioCtxRef.current) playTimeRef.current=audioCtxRef.current.currentTime;
  },[]);

  const playChunk=useCallback((b64:string)=>{
    if(!audioCtxRef.current) return;
    const ctx=audioCtxRef.current;
    const f32=b64ToF32(b64);
    const buf=ctx.createBuffer(1,f32.length,24000);
    buf.copyToChannel(f32,0);
    const src=ctx.createBufferSource();
    src.buffer=buf; src.connect(ctx.destination);
    const at=Math.max(ctx.currentTime,playTimeRef.current);
    src.start(at); playTimeRef.current=at+buf.duration;
    sourcesRef.current.push(src);
    src.onended=()=>{sourcesRef.current=sourcesRef.current.filter(s=>s!==src);};
  },[]);

  const startMic=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{sampleRate:16000,channelCount:1,echoCancellation:true,noiseSuppression:true}});
      streamRef.current=stream;
      const ctx=audioCtxRef.current!;
      const src=ctx.createMediaStreamSource(stream);
      const proc=ctx.createScriptProcessor(256,1,1);
      procRef.current=proc; src.connect(proc); proc.connect(ctx.destination);
      proc.onaudioprocess=(e)=>{
        if(!wsRef.current||wsRef.current.readyState!==WebSocket.OPEN) return;
        if(statusRef.current==='paused') return;
        wsRef.current.send(JSON.stringify({type:'audio',data:ab2b64(f32ToI16(e.inputBuffer.getChannelData(0)).buffer)}));
      };
    }catch{setErrorMsg('لا يمكن الوصول للميكروفون — يمكنك المتابعة بدون أسئلة صوتية.');}
  };

  const stopMic=()=>{
    procRef.current?.disconnect(); procRef.current=null;
    streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null;
    audioCtxRef.current?.close().catch(()=>{}); audioCtxRef.current=null;
  };

  // ── helpers for the fallback draw timer ──────────────────────────
  const clearDrawFallback=useCallback(()=>{
    if(drawFallbackTimerRef.current){clearTimeout(drawFallbackTimerRef.current);drawFallbackTimerRef.current=null;}
  },[]);

  const triggerChartFromBuffer=useCallback(()=>{
    const fullDesc=modelTransBuf.current.trim();
    drawPendingRef.current=false; modelTransBuf.current='';
    if(!fullDesc){setIsDrawingChart(false);userDrawLockRef.current=false;return;}
    const gen=++drawGenRef.current;
    setIsDrawingChart(true);
    chartCacheRef.current.delete(fullDesc);

    // ── Try local parser first (instant, zero API cost) ─────────────
    const local=parseChartLocally(fullDesc);
    if(local.hasChart){
      if(drawGenRef.current===gen){
        chartCacheRef.current.set(fullDesc,local);
        setCurrentChart({...local});
        setIsDrawingChart(false);
        userDrawLockRef.current=false;
        // Enrich in background if API available
        callChartAnalyze(fullDesc).then(c=>{
          if(drawGenRef.current!==gen||!c.hasChart||c.quotaExceeded) return;
          chartCacheRef.current.set(fullDesc,c);
          setCurrentChart({...c});
        });
      }
      return;
    }

    // ── Fallback to API ──────────────────────────────────────────────
    callChartAnalyze(fullDesc).then(c=>{
      if(drawGenRef.current!==gen) return;
      chartCacheRef.current.set(fullDesc,c);
      setCurrentChart(c.hasChart?{...c}:null);
      setIsDrawingChart(false);
      userDrawLockRef.current=false;
    });
  },[]);

  // Chart analysis — for AUTOMATIC detection from lecture chunks.
  // Respects userDrawLockRef: never clears a user-requested chart.
  const analyzeChart=useCallback(async(text:string)=>{
    if(!text.trim()) return;
    if(userDrawLockRef.current) return;
    if(chartCacheRef.current.has(text)){
      const c=chartCacheRef.current.get(text)!;
      if(!userDrawLockRef.current) setCurrentChart(c.hasChart?{...c}:null);
      return;
    }
    if(chartScore(text)<2){
      if(!userDrawLockRef.current) setCurrentChart(null);
      return;
    }
    setIsDrawingChart(true);
    const c=await callChartAnalyze(text);
    chartCacheRef.current.set(text,c);
    if(!userDrawLockRef.current){
      setCurrentChart(c.hasChart?{...c}:null);
      setIsDrawingChart(false);
    }
  },[]);

  // ── QR Scan session ──────────────────────────────────────────────
  const stopQrPoll=useCallback(()=>{
    if(qrPollRef.current){clearInterval(qrPollRef.current);qrPollRef.current=null;}
  },[]);

  const startQrSession=useCallback(async()=>{
    setQrError(''); setQrStatus('waiting'); setQrSessionId(null); setQrPageUrl(null);
    try{
      const r=await fetch(resolveApiUrl('/api/qr-session/create'),{
        method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()}
      });
      const d=await r.json();
      if(!d.ok) throw new Error(d.error||'فشل إنشاء الجلسة');
      setQrSessionId(d.sessionId); setQrPageUrl(d.uploadPageUrl);

      // Start polling every 2 seconds
      stopQrPoll();
      qrPollRef.current=setInterval(async()=>{
        try{
          const pr=await fetch(resolveApiUrl(`/api/qr-session/${d.sessionId}/result`));
          const pd=await pr.json();
          if(pd.status==='processing') setQrStatus('processing');
          else if(pd.status==='done'&&pd.result?.success){
            stopQrPoll();
            setQrStatus('done');
            // Process extracted text exactly like a file upload
            const text=pd.result.text as string;
            setExtractedDoc(text);
            if(chartScore(text.slice(0,2000))>=2){
              const c=await callChartAnalyze(text.slice(0,2000));
              if(c.hasChart) setCurrentChart(c);
            }
            setUploadStep('ask_topic');
            setUploadMsg('');
            // Close QR modal after short delay
            setTimeout(()=>{setQrStatus('idle');setQrSessionId(null);setQrPageUrl(null);},1200);
          }else if(pd.status==='error'){
            stopQrPoll(); setQrStatus('error');
            setQrError(pd.result?.error||'فشلت معالجة الصورة');
          }else if(pd.status==='expired'){
            stopQrPoll(); setQrStatus('error'); setQrError('انتهت صلاحية الجلسة');
          }
        }catch(_){}
      },2000);
    }catch(e:any){setQrStatus('error');setQrError(e.message);}
  },[stopQrPoll]);

  // Cleanup poll on unmount
  useEffect(()=>()=>{stopQrPoll();},[stopQrPoll]);

  // Direct draw command (from text bar OR from user voice "ارسم...")
  // Uses a separate userDrawGenRef so concurrent model draws can't cancel it.
  const handleDirectDraw=useCallback(async(cmd:string)=>{
    // Preempt any pending model-initiated draw
    clearDrawFallback();
    drawPendingRef.current=false;
    modelTransBuf.current='';
    userDrawLockRef.current=true;
    setChartErrorMsg('');
    const myGen=++userDrawGenRef.current;
    const text=cmd.replace(DRAW_CMD,'').trim()||cmd;
    setIsDrawingChart(true); setChunkText(cmd); setDirectCmd('');

    // ── Step 1: Try local parser immediately (zero API cost) ───────
    const local=parseChartLocally(text);
    if(local.hasChart&&userDrawGenRef.current===myGen){
      setCurrentChart({...local});
      setIsDrawingChart(false);
      // Still hit the API in background to get a better/richer result
      callChartAnalyze(text).then(c=>{
        if(userDrawGenRef.current!==myGen) return;
        if(c.hasChart&&!c.quotaExceeded) setCurrentChart({...c});
        setIsDrawingChart(false);
      });
      return;
    }

    // ── Step 2: No local result → call API ─────────────────────────
    const c=await callChartAnalyze(text);
    if(userDrawGenRef.current!==myGen) return;

    if(c.hasChart){
      setCurrentChart({...c});
      setIsDrawingChart(false);
    } else {
      setIsDrawingChart(false);
      userDrawLockRef.current=false;
      if(c.quotaExceeded){
        setChartErrorMsg('⚠️ تجاوزت الحصة المجانية لـ API — أضف مفتاح API خاصاً من الإعدادات (⚙️). مثال للرسم المباشر: "ارسم مخطط: أ=5 ب=8 ج=3"');
      } else {
        setChartErrorMsg('لم أتمكن من تحديد نوع الرسم. جرب: "ارسم مخطط عمودي: أ=40 ب=60 ج=30"');
      }
      // Clear error after 6 seconds
      setTimeout(()=>setChartErrorMsg(''),6000);
    }
  },[clearDrawFallback]);

  // Handle user asking AI narrator to "look at the drawing on the whiteboard"
  const handleLookAtWhiteboard=useCallback(async()=>{
    const img=manualDrawImgRef.current;
    const chart=currentChartRef.current;
    const savedDesc=lastDrawDescriptionRef.current;

    // ① If we already have a saved description from when the drawing was submitted → reuse it instantly
    if(savedDesc){
      setQa(q=>[...q,{id:Date.now().toString(),role:'model',text:`🖼️ ${savedDesc}`}]);
      return;
    }

    // ② If only a structured chart is on the board (no raw drawing) → describe it textually
    if(!img&&chart?.hasChart){
      const typeMap:Record<string,string>={bar:'مخطط أعمدة',line:'مخطط خطي',pie:'مخطط دائري',
        table:'جدول',diagram:'مخطط انسيابي',coordinate:'نظام إحداثيات',none:''};
      const labels=chart.labels?.join('، ')||'';
      setQa(q=>[...q,{id:Date.now().toString(),role:'model',
        text:`📊 السبورة تعرض ${typeMap[chart.chartType]||'مخطط'}${chart.title?` بعنوان "${chart.title}"`:''}.${labels?' البيانات: '+labels:''}`}]);
      return;
    }

    // ③ No drawing at all
    if(!img){
      setQa(q=>[...q,{id:Date.now().toString(),role:'model',
        text:'📋 لا يوجد رسم على السبورة حالياً. استخدم ✏️ لرسم شيء أو قل "ارسم مخطط..."'}]);
      return;
    }

    // ④ Raw drawing exists but no saved description → call vision API
    const thinkId=Date.now().toString();
    setQa(q=>[...q,{id:thinkId,role:'model',text:'🔍 أتفحص الرسم على السبورة…'}]);
    try{
      const r=await fetch(resolveApiUrl('/api/ai/explain-drawing'),{
        method:'POST',
        headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({imageBase64:img,mimeType:'image/jpeg'})
      });
      const data=await r.json();
      const msg=data.explanation
        ||(data.error==='no_api_key'?'💡 أضف مفتاح Gemini API من إعدادات التطبيق لتفعيل تحليل الرسم.'
          :data.error==='quota'?'⚠️ نفدت حصة Gemini API اليومية — جرّب مفتاحاً آخر أو انتظر حتى الغد.'
          :data.error==='rate_limit'?'⏱️ تجاوزت الحد المسموح في الدقيقة — جرّب مرة ثانية بعد لحظة.'
          :'⚠️ تعذّر تحليل الرسم — تأكد من ضبط مفتاح Gemini API في الإعدادات.');
      if(data.explanation) lastDrawDescriptionRef.current=data.explanation; // cache for next time
      setQa(q=>q.map(item=>item.id===thinkId?{...item,text:`🖼️ ${msg}`}:item));
    }catch{
      setQa(q=>q.map(item=>item.id===thinkId?{...item,text:'⚠️ تعذّر الاتصال بالخادم.'}:item));
    }
  },[]);

  // Handle AI enhancement of a manual sketch
  const handleExplainDrawing=useCallback(async(imgB64:string, mimeType:string='image/jpeg')=>{
    // ① Show the raw drawing on the whiteboard IMMEDIATELY — no waiting for AI
    setManualDrawImg(imgB64);
    lastDrawDescriptionRef.current=''; // reset stored description for new drawing
    setShowDrawPad(false);
    setIsEnhancing(true);
    userDrawLockRef.current=true; // lock: prevent lecture chunks from clearing this drawing

    try{
      const r=await fetch(resolveApiUrl('/api/ai/explain-drawing'),{
        method:'POST',
        headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({imageBase64:imgB64,mimeType})
      });
      const data=await r.json();

      // ② If AI extracted structured chart data → render it BELOW the raw drawing
      //    (drawing stays visible; chart adds structured info alongside it)
      if(data.hasChart){
        const myGen=++userDrawGenRef.current;
        setIsDrawingChart(true);
        setTimeout(()=>{
          if(userDrawGenRef.current!==myGen) return;
          setCurrentChart({
            hasChart:data.hasChart, chartType:data.chartType,
            title:data.title, labels:data.labels, datasets:data.datasets,
            tableHeaders:data.tableHeaders, tableRows:data.tableRows,
            diagramNodes:data.diagramNodes, diagramEdges:data.diagramEdges,
            coordPoints:data.coordPoints, coordLines:data.coordLines,
          } as ChartData);
          // NOTE: drawing (manualDrawImg) stays — user can dismiss it manually via ✕
          setIsDrawingChart(false);
        },500);
      }

      // ③ Save explanation so narrator can reuse it without re-calling API
      if(data.explanation){
        lastDrawDescriptionRef.current=data.explanation;
      }

      // ④ Show AI explanation in Q&A strip
      const msg=data.explanation||(data.error==='no_api_key'
        ?'💡 أضف مفتاح Gemini API من الإعدادات لتفعيل تحليل الرسم. رسمك يظهر على السبورة كما هو.'
        :data.error==='quota'?'⚠️ نفدت حصة Gemini API اليومية — رسمك محفوظ على السبورة. جرّب مفتاحاً آخر أو انتظر حتى الغد.'
        :data.error==='rate_limit'?'⏱️ تجاوزت الحد المسموح في الدقيقة — رسمك محفوظ على السبورة. جرّب مرة ثانية بعد لحظة.'
        :data.error?`⚠️ ${data.error}. رسمك محفوظ على السبورة.`:null);
      if(msg) setQa(q=>[...q,{id:Date.now().toString(),role:'model',text:msg}]);

    }catch(e){
      console.error('explain-drawing',e);
      setQa(q=>[...q,{id:Date.now().toString(),role:'model',text:'⚠️ تعذّر الاتصال بخادم التحليل — رسمك محفوظ على السبورة.'}]);
    }finally{
      setIsEnhancing(false);
    }
  },[]);

  // Start session
  const start=useCallback(async()=>{
    if(!lectureText.trim()){setErrorMsg('يرجى تحضير نص المحاضرة أولاً.');return;}
    setErrorMsg(''); setQa([]); setChunkIndex(0); setTotalChunks(0);
    setChunkText(''); setCurrentChart(null); setAskMode(false);
    setStatus('preparing'); chartCacheRef.current.clear();

    let prep=lectureText;
    try{
      const r=await fetch(resolveApiUrl('/api/ai/lecture-prep'),{method:'POST',
        headers:{'Content-Type':'application/json',...getAiHeaders()},body:JSON.stringify({text:lectureText})});
      const d=await r.json();
      if(d?.success&&d?.processedText) prep=d.processedText;
    }catch(_){}

    setStatus('connecting');
    const key=(localStorage.getItem("customAiKey")||"") .trim();
    const provider=(localStorage.getItem("aiProvider")||"gemini").trim();
    const endpointUrl=(localStorage.getItem("customEndpointUrl")||"").trim();
    const params=new URLSearchParams({key,provider,lang:"ar",mode:"lecture",voice,...(provider==="custom"&&endpointUrl?{endpointUrl}:{})});
    audioCtxRef.current=new AudioContext({sampleRate:16000});

    playTimeRef.current=audioCtxRef.current.currentTime;

    const proto=window.location.protocol==='https:'?'wss:':'ws:';
    const ws=new WebSocket(`${proto}//${window.location.host}/ws/voice-chat?${params}`);
    wsRef.current=ws;

    ws.onmessage=(ev)=>{
      try{
        const msg=JSON.parse(ev.data as string);
        if(msg.type==='ready'){
          startMic();
          ws.send(JSON.stringify({type:'start_lecture',text:prep}));
        }else if(msg.type==='lecture_started'){
          setTotalChunks(msg.total||0); setStatus('narrating');
        }else if(msg.type==='lecture_progress'){
          setChunkIndex(msg.index); setChunkText(msg.text);
          setAskMode(false); setStatus('narrating');
          // Only release lock if no active manual drawing — prevents chart auto-analysis
          // from overwriting/hiding a drawing the user pinned on the whiteboard
          if(!manualDrawImgRef.current) userDrawLockRef.current=false;
          analyzeChart(msg.text);
        }else if(msg.type==='audio'){
          if(statusRef.current!=='paused') playChunk(msg.data);
          setStatus(s=>s==='listening'||s==='answering'?'answering':'narrating');
        }else if(msg.type==='transcript'){
          const role=msg.role as 'user'|'model';
          const txt=msg.text as string;
          setQa(prev=>{
            const last=prev[prev.length-1];
            if(last&&last.role===role) return[...prev.slice(0,-1),{...last,text:last.text+txt}];
            return[...prev,{id:Date.now()+Math.random()+'',role,text:txt}];
          });
          // Accumulate model transcript into buffer
          if(role==='model'){
            modelTransBuf.current+=txt+' ';
            // Mark draw pending if model announces drawing; arm fallback timer
            if(DRAW_CONFIRM.test(txt)){
              drawPendingRef.current=true;
              userDrawLockRef.current=true;
              clearDrawFallback();
              drawFallbackTimerRef.current=setTimeout(triggerChartFromBuffer,4000);
            }
          }
          // User says "ارسم..." → draw immediately using the utterance text
          if(role==='user'&&DRAW_CMD.test(txt)){
            handleDirectDraw(txt);
          }
          // User asks "انظر الرسم" / "اشرح السبورة" → describe what's on the whiteboard
          if(role==='user'&&LOOK_DRAWING_CMD.test(txt)){
            handleLookAtWhiteboard();
          }
        }else if(msg.type==='turn_complete'){
          // Wait 250ms so any in-flight transcript WS messages arrive before we process
          setTimeout(()=>{
            clearDrawFallback();
            if(drawPendingRef.current&&modelTransBuf.current.trim()){
              triggerChartFromBuffer();
            }else{
              drawPendingRef.current=false;
              modelTransBuf.current='';
            }
          },250);
        }else if(msg.type==='interrupted'){hardStop();setStatus('listening');}
        else if(msg.type==='lecture_complete'){setStatus('done');}
        else if(msg.type==='error'){
          setErrorMsg(msg.message==='no_api_key'?'لم يتم إدخال مفتاح Gemini API.':(msg.message||'حدث خطأ.'));
          setStatus('error');
        }
      }catch(_){}
    };
    ws.onerror=()=>{setErrorMsg('تعذّر الاتصال بالخادم.');setStatus('error');};
    ws.onclose=()=>{stopMic();};
  },[lectureText,voice,playChunk,hardStop,analyzeChart,handleDirectDraw,handleLookAtWhiteboard,clearDrawFallback,triggerChartFromBuffer]);

  const stop=useCallback(()=>{
    wsRef.current?.send(JSON.stringify({type:'stop_lecture'}));
    wsRef.current?.close(); wsRef.current=null;
    stopMic(); hardStop(); setAskMode(false); setStatus('idle');
  },[hardStop]);

  const askNow=useCallback(()=>{
    if(!wsRef.current||wsRef.current.readyState!==WebSocket.OPEN) return;
    hardStop(); setAskMode(true); setStatus('listening');
    wsRef.current.send(JSON.stringify({type:'interrupt'}));
  },[hardStop]);

  const togglePause=useCallback(()=>{
    if(!wsRef.current||wsRef.current.readyState!==WebSocket.OPEN) return;
    if(status==='paused'){wsRef.current.send(JSON.stringify({type:'resume_lecture'}));setStatus('narrating');}
    else{hardStop();wsRef.current.send(JSON.stringify({type:'pause_lecture'}));setStatus('paused');}
  },[status,hardStop]);

  useEffect(()=>()=>{wsRef.current?.close();stopMic();},[]);

  // Upload handlers
  const handleFile=async(file:File)=>{
    setUploadedFile(file); setErrorMsg('');
    setUploadMsg(`جاري استخراج المحتوى من "${file.name}"…`);
    setUploadStep('extracting');
    try{
      const fd=await fileToB64(file);
      const r=await fetch(resolveApiUrl('/api/ai/lecture-extract-file'),{
        method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({fileName:file.name,fileType:file.type,fileData:fd})
      });
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'فشل الاستخراج');
      setExtractedDoc(d.text);
      // Auto-analyze for charts if file contains visualizable data
      if(chartScore(d.text.slice(0,2000))>=2){
        const c=await callChartAnalyze(d.text.slice(0,2000));
        if(c.hasChart) setCurrentChart(c);
      }
      setUploadMsg(''); setUploadStep('ask_topic');
    }catch(e:any){setErrorMsg(`فشل استخراج النص: ${e.message}`);setUploadStep('select');}
  };

  const handleGenerate=async()=>{
    if(!topicInput.trim()){setErrorMsg('يرجى إدخال الموضوع.');return;}
    setErrorMsg(''); setUploadMsg('جاري توليد الشرح المفصّل…');
    setUploadStep('generating');
    try{
      const r=await fetch(resolveApiUrl('/api/ai/lecture-explain-topic'),{
        method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({documentText:extractedDoc,topic:topicInput.trim(),lang:'ar'})
      });
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'فشل التوليد');
      setLectureText(d.explanation); setUploadMsg(''); setUploadStep('ready');
    }catch(e:any){setErrorMsg(`فشل توليد الشرح: ${e.message}`);setUploadStep('ask_topic');}
  };

  const inSession=!['idle','error'].includes(status);

  const statusLabel:Record<Status,string>={
    idle:'جاهز للبدء',preparing:'⚙️ جاري تحضير النص…',
    connecting:'🔗 جاري الاتصال…',narrating:'📖 يشرح الآن…',
    listening:'🎙 يستمع لك…',answering:'💬 يرد على سؤالك…',
    paused:'⏸ متوقف مؤقتاً',done:'✅ انتهى الشرح',error:'❌ خطأ',
  };
  const statusColor:Record<Status,string>={
    idle:'bg-slate-400',preparing:'bg-amber-400 animate-pulse',
    connecting:'bg-amber-400 animate-pulse',narrating:'bg-green-400 animate-pulse',
    listening:'bg-blue-400 animate-pulse',answering:'bg-purple-400 animate-pulse',
    paused:'bg-slate-400',done:'bg-emerald-400',error:'bg-red-400',
  };

  // ── SETUP PANEL (shown when not in session) ───────────────────
  const renderSetupPanel=()=>(
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mode toggle */}
      <div className="shrink-0 flex gap-1 bg-white/5 rounded-xl p-1 mx-4 mt-3">
        <button onClick={()=>{setInputMode('paste');setErrorMsg('');}}
          className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition ${inputMode==='paste'?'bg-amber-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
          📋 لصق النص
        </button>
        <button onClick={()=>{setInputMode('upload');setErrorMsg('');}}
          className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition ${inputMode==='upload'?'bg-violet-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
          📁 رفع ملف / صورة
        </button>
      </div>

      {errorMsg&&<div className="mx-4 mt-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300 shrink-0">{errorMsg}</div>}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {inputMode==='paste'&&(
          <>
            <textarea value={lectureText} onChange={e=>setLectureText(e.target.value)}
              placeholder="ألصق نص المحاضرة هنا… يدعم المعادلات بصيغة LaTeX ($x^2$)"
              className="w-full h-44 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:ring-1 focus:ring-amber-500"/>
            <div className="text-[10px] text-slate-500">{lectureText.length.toLocaleString()} حرف</div>
          </>
        )}

        {inputMode==='upload'&&(
          <>
            {uploadStep==='select'&&(
              <div className="space-y-3">
                {/* Regular file upload */}
                <label className="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition">
                  <span className="text-3xl">📂</span>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-300">اضغط لاختيار ملف أو صورة</p>
                    <p className="text-[10px] text-slate-500 mt-1">PDF · Word · PPT · Excel · صور · نصوص</p>
                    <p className="text-[10px] text-indigo-400 mt-1">🎨 المخططات ستُرسم تلقائياً على السبورة</p>
                  </div>
                  <input type="file" accept={ACCEPTED} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
                </label>
                {/* QR scan button */}
                <button
                  onClick={startQrSession}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-400/60 transition text-violet-300 font-bold text-sm">
                  <span className="text-2xl">📱</span>
                  <div className="text-right">
                    <p className="text-xs font-bold">مسح بالهاتف عبر QR</p>
                    <p className="text-[10px] text-violet-400/70">للخط اليدوي · الكتب · ملاحظات الورق</p>
                  </div>
                </button>
              </div>
            )}
            {(uploadStep==='extracting'||uploadStep==='generating')&&(
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
                <p className="text-xs text-slate-400 text-center">{uploadMsg}</p>
              </div>
            )}
            {uploadStep==='ask_topic'&&(
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span>✅</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-300">تم الاستخراج — {extractedDoc.length.toLocaleString()} حرف</p>
                    <p className="text-[10px] text-slate-400">{uploadedFile?.name}</p>
                  </div>
                </div>
                {currentChart?.hasChart&&(
                  <div className="flex items-center gap-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <span>📊</span>
                    <p className="text-xs text-indigo-300">تم اكتشاف رسم بياني في الملف — سيظهر على السبورة</p>
                  </div>
                )}
                <label className="text-[11px] text-slate-300 font-bold block">ما الموضوع الذي تريد شرحه؟</label>
                <input type="text" value={topicInput} onChange={e=>setTopicInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')handleGenerate();}}
                  placeholder="مثال: قانون نيوتن الثاني، التكامل…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-500"/>
                <button onClick={handleGenerate} disabled={!topicInput.trim()}
                  className="w-full py-2.5 rounded-2xl font-black text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white transition">
                  🧠 ولّد الشرح المفصّل
                </button>
                <button onClick={()=>{setUploadStep('select');setUploadedFile(null);setExtractedDoc('');setTopicInput('');}}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 transition">← ملف مختلف</button>
              </div>
            )}
            {uploadStep==='ready'&&(
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <span>🎓</span>
                  <div>
                    <p className="text-xs font-bold text-violet-300">الشرح جاهز للعرض الصوتي</p>
                    <p className="text-[10px] text-slate-400">موضوع: {topicInput} · {lectureText.length.toLocaleString()} حرف</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-28 overflow-y-auto">
                  <p className="text-[11px] text-slate-400 leading-relaxed">{lectureText.slice(0,400)}{lectureText.length>400?'…':''}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Voice selector */}
        <div>
          <label className="text-[11px] text-slate-400 font-bold block mb-1">نبرة صوت المعلم</label>
          <div className="grid grid-cols-3 gap-1.5">
            {VOICES.map(v=>(
              <button key={v.id} onClick={()=>setVoice(v.id)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${voice===v.id?'bg-amber-600 border-amber-500 text-white':'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start button */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        {(inputMode==='paste'?lectureText.trim():uploadStep==='ready')&&(
          <button onClick={start}
            className="w-full py-3.5 rounded-2xl font-black text-base bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-xl transition">
            🎓 ابدأ شرح المحاضرة
          </button>
        )}
      </div>
    </div>
  );

  // ── SESSION VIEW ──────────────────────────────────────────────
  // Whiteboard fills the entire area; controls float as a glass bar at bottom
  const renderSession=()=>(
    <div className="relative flex flex-col h-full min-h-0">

      {/* ⭐ WHITEBOARD — fills 100% of the space ⭐ */}
      <Whiteboard
        text={chunkText}
        chart={currentChart}
        chunkIdx={chunkIndex}
        totalChunks={totalChunks}
        isDrawingChart={isDrawingChart}
        chartErrorMsg={chartErrorMsg}
        drawImg={manualDrawImg}
        isAnalyzingDraw={isEnhancing}
        onClearDraw={()=>{setManualDrawImg(null);lastDrawDescriptionRef.current='';userDrawLockRef.current=false;}}/>

      {/* DrawPad overlay — covers the whiteboard when active */}
      {showDrawPad&&(
        <DrawPad
          onClose={()=>setShowDrawPad(false)}
          onEnhance={handleExplainDrawing}
          isEnhancing={isEnhancing}/>
      )}

      {/* ── Floating overlay panel (bottom of whiteboard) ── */}
      {!showDrawPad&&(
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-none">

          {/* Q&A bubbles */}
          {qa.length>0&&(
            <div className="pointer-events-auto max-h-24 overflow-y-auto rounded-xl bg-black/70 backdrop-blur-md px-3 py-2 space-y-1.5 border border-white/10">
              {qa.slice(-3).map(item=>(
                <div key={item.id} className={`flex ${item.role==='user'?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[88%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                    item.role==='user'?'bg-blue-600/50 text-blue-100':'bg-purple-600/35 text-purple-100'}`}>
                    <MathText text={item.text} dir="rtl"/>
                  </div>
                </div>
              ))}
              <div ref={qaEndRef}/>
            </div>
          )}

          {/* Direct draw command bar */}
          {showCmdBar&&(
            <div className="pointer-events-auto flex gap-2 rounded-xl bg-black/70 backdrop-blur-md px-3 py-2 border border-white/10">
              <input value={directCmd} onChange={e=>setDirectCmd(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&directCmd.trim())handleDirectDraw(directCmd);if(e.key==='Escape')setShowCmdBar(false);}}
                placeholder="ارسم مخطط عمودي للبيانات… أو ارسم دورة حياة البكتيريا"
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"/>
              <button onClick={()=>{if(directCmd.trim())handleDirectDraw(directCmd);}}
                disabled={!directCmd.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 transition">
                ارسم
              </button>
              <button onClick={()=>{setShowCmdBar(false);setDirectCmd('');}}
                className="px-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-slate-200 text-xs transition">✕</button>
            </div>
          )}

          {/* Main control bar — glass morphism */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/75 backdrop-blur-md px-4 py-2.5 border border-white/10 shadow-xl">
            {/* Status */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-2 h-2 rounded-full ${statusColor[status]}`}/>
              <span className="text-[10px] font-bold text-slate-400">{statusLabel[status]}</span>
            </div>
            <div className="flex-1"/>
            {/* Buttons */}
            <button onClick={askNow} disabled={status==='listening'||status==='paused'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                status==='listening'?'bg-blue-600/80 text-white cursor-default'
                :'bg-blue-600/30 border border-blue-500/40 text-blue-200 hover:bg-blue-600/50'} disabled:opacity-50`}>
              🎙 اسأل
            </button>
            <button onClick={()=>setShowCmdBar(s=>!s)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                showCmdBar?'bg-indigo-600 border-indigo-500 text-white':'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/35'}`}>
              📊 ارسم نصياً
            </button>
            <button onClick={()=>setShowDrawPad(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border border-amber-500/40 bg-amber-600/20 text-amber-300 hover:bg-amber-600/35 transition">
              ✏️ ارسم يدوياً
            </button>
            {manualDrawImg&&(
              <button onClick={handleLookAtWhiteboard}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/35 transition">
                🔍 اشرح الرسم
              </button>
            )}
            <button onClick={togglePause} disabled={status==='listening'||status==='answering'||status==='done'}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-slate-200 hover:bg-white/15 text-xs font-extrabold disabled:opacity-40 transition">
              {status==='paused'?'▶ استكمال':'⏸ توقف'}
            </button>
            <button onClick={stop}
              className="px-3 py-1.5 rounded-xl bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600/50 text-xs font-extrabold transition">
              ⏹ إنهاء
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  return(
    <div className="flex flex-col h-full bg-gradient-to-b from-[#04080f] via-[#080d1a] to-[#020508] text-white overflow-hidden" dir="rtl">
      {/* The component has no own header — App.tsx provides the title bar */}
      {errorMsg&&!inSession&&(
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300 shrink-0">{errorMsg}</div>
      )}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {inSession ? renderSession() : renderSetupPanel()}
      </div>

      {/* ── QR Scan Modal ─────────────────────────────────────── */}
      {qrStatus!=='idle'&&(
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#0f0f1e] border border-white/10 rounded-3xl p-6 w-80 flex flex-col items-center gap-4 shadow-2xl">
            {/* Header */}
            <div className="text-center">
              <p className="text-base font-black text-white">📱 مسح الملاحظات بالهاتف</p>
              <p className="text-[11px] text-slate-400 mt-1">امسح الرمز بكاميرا هاتفك لفتح صفحة التقاط الصورة</p>
            </div>

            {/* QR code image */}
            {qrPageUrl&&qrStatus==='waiting'&&(
              <div className="flex flex-col items-center gap-3">
                <div className="p-2 bg-white rounded-2xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPageUrl)}&color=0d0d1a&bgcolor=ffffff&format=png&margin=2`}
                    alt="QR Code"
                    width={200} height={200}
                    className="rounded-lg"/>
                </div>
                <p className="text-[10px] text-slate-500 text-center break-all px-2">{qrPageUrl}</p>
                <div className="flex items-center gap-2 text-amber-300 text-xs animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"/>
                  في انتظار التقاط الصورة…
                </div>
              </div>
            )}

            {/* Processing state */}
            {qrStatus==='processing'&&(
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin border-[3px]"/>
                <p className="text-sm text-violet-300 font-bold">جاري قراءة الخط اليدوي بالذكاء الاصطناعي…</p>
                <p className="text-[10px] text-slate-500">يستخرج Gemini Vision النص من صورتك</p>
              </div>
            )}

            {/* Done state */}
            {qrStatus==='done'&&(
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-5xl">✅</div>
                <p className="text-sm font-bold text-emerald-300">تم استخراج النص بنجاح!</p>
                <p className="text-[11px] text-slate-400">جاري الإغلاق…</p>
              </div>
            )}

            {/* Error state */}
            {qrStatus==='error'&&(
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="text-4xl">❌</div>
                <p className="text-sm font-bold text-red-300">{qrError||'حدث خطأ'}</p>
                <button onClick={startQrSession}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Cancel button */}
            {qrStatus!=='done'&&(
              <button onClick={()=>{stopQrPoll();setQrStatus('idle');setQrSessionId(null);setQrPageUrl(null);}}
                className="text-xs text-slate-500 hover:text-slate-300 transition">
                إلغاء
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
