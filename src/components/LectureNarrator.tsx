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
  .ln-bar     { transform-origin:bottom center; animation:lnGrowUp 0.85s cubic-bezier(0.16,1,0.3,1) both; }
  .ln-line    { animation:lnDrawPath 2s ease-out forwards; }
  .ln-sector  { animation:lnFillSector 1.3s ease-out forwards; }
  .ln-row     { animation:lnFadeRow 0.45s ease-out both; }
  .ln-chart   { animation:lnChartIn 0.5s ease-out; }
  .ln-pen     { animation:lnPenBlink 1s ease-in-out infinite; }
  .ln-text    { animation:lnSlideIn 0.35s ease-out; }
`;

// ── Types ─────────────────────────────────────────────────────────
type Status = 'idle'|'preparing'|'connecting'|'narrating'|'listening'|'answering'|'paused'|'done'|'error';
type InputMode = 'paste'|'upload';
type UploadStep = 'select'|'extracting'|'ask_topic'|'generating'|'ready';

interface QAItem   { id:string; role:'user'|'model'; text:string; }
interface Dataset  { name:string; values:number[]; }
interface DiagNode { id:string; label:string; shape:'box'|'circle'|'diamond'; }
interface DiagEdge { from:string; to:string; label:string; }
interface ChartData {
  hasChart:boolean; chartType:'bar'|'line'|'pie'|'table'|'diagram'|'none';
  title?:string; labels?:string[]; datasets?:Dataset[];
  tableHeaders?:string[]; tableRows?:string[][];
  diagramNodes?:DiagNode[]; diagramEdges?:DiagEdge[];
}

// Detects model saying "drawing on board now" in any form
const DRAW_CONFIRM = /جاري الرسم|سأرسم الآن|سأرسم لك|Drawing on the board|drawing now|على السبورة الآن/i;

const VOICES = [
  {id:'Charon',label:'🎓 رجالي هادئ'},
  {id:'Kore',  label:'👩‍🏫 نسائي واضح'},
  {id:'Puck',  label:'⚡ حيوي نشيط'},
  {id:'Aoede', label:'🌙 نسائي دافئ'},
  {id:'Fenrir',label:'💪 رجالي قوي'},
  {id:'Zephyr',label:'🍃 خفيف لطيف'},
];
const ACCEPTED='.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.md,.csv,.html,image/*';
const CHART_KW=/بيان|مخطط|رسم|جدول|نسب|مئو|إحصاء|مقارن|توزيع|أعمد|دائر|خط|هيكل|مرحل|خوارزم|تدفق|chart|graph|table|figure|diagram|%|٪/i;
const DRAW_CMD=/^(ارسم|أرسم|draw|رسم لي|ارسم لي|أرسم لي)\s+/i;

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

// Bar chart
function BarChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const W=560,H=320,PL=56,PR=20,PT=44,PB=64;
  const cW=W-PL-PR,cH=H-PT-PB;
  const vals=datasets.flatMap(d=>d.values).filter(v=>!isNaN(v));
  const maxV=vals.length?Math.max(...vals,0.01):1;
  const n=labels.length||1, nDs=datasets.length||1;
  const gW=cW/n, bW=Math.min(40,gW*0.75/nDs);
  const ticks=4;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={24} textAnchor="middle" fontSize={15} fontWeight="800" fill="#1e1b4b">{title}</text>}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=Math.round(maxV*i/ticks);
        const y=PT+cH-cH*i/ticks;
        return(<g key={i}>
          <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#e0e7ff" strokeWidth={i===0?1.5:1}/>
          <text x={PL-8} y={y+4} textAnchor="end" fontSize={11} fill="#6b7280">{v}</text>
        </g>);
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#1e1b4b" strokeWidth={2}/>
      <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#1e1b4b" strokeWidth={2}/>
      {labels.map((lbl,li)=>(
        <g key={li}>
          {datasets.map((ds,di)=>{
            const v=ds.values[li]??0;
            const bH=Math.max((v/maxV)*cH,2);
            const x=PL+li*gW+di*(bW+3)+(gW-nDs*(bW+3))/2;
            const y=PT+cH;
            const col=C[di%C.length];
            return(
              <g key={di} style={{transformOrigin:`${x+bW/2}px ${y}px`}}>
                <rect className="ln-bar" x={x} y={y-bH} width={bW} height={bH} fill={col} rx={4}
                  style={{animationDelay:`${li*0.09+di*0.04}s`}}/>
                <text x={x+bW/2} y={y-bH-5} textAnchor="middle" fontSize={10} fill={col} fontWeight="700">{v}</text>
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

function ChartPanel({chart}:{chart:ChartData}){
  if(!chart.hasChart||chart.chartType==='none') return null;
  const w='w-full ln-chart';
  switch(chart.chartType){
    case 'bar':     return <div className={w}><BarChart     title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'line':    return <div className={w}><LineChart    title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'pie':     return <div className={w}><PieChart     title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'table':   return <div className={w}><TableChart   title={chart.title} tableHeaders={chart.tableHeaders} tableRows={chart.tableRows}/></div>;
    case 'diagram': return <div className={w}><DiagramChart title={chart.title} diagramNodes={chart.diagramNodes} diagramEdges={chart.diagramEdges}/></div>;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// WHITEBOARD — realistic white board, fills all available space
// ══════════════════════════════════════════════════════════════════
function Whiteboard({text,chart,chunkIdx,totalChunks,isDrawingChart}:{
  text:string; chart:ChartData|null; chunkIdx:number; totalChunks:number; isDrawingChart:boolean;
}){
  const {disp,done}=useTypewriter(text,5,11);
  const hasContent=disp.trim().length>0||chart?.hasChart;

  return(
    <div className="relative flex-1 flex flex-col min-h-0 mx-3 my-2 rounded-xl overflow-hidden"
      style={{
        // Wooden frame
        border:'12px solid #6b4220',
        boxShadow:'0 0 0 2px #a0784a, 0 12px 48px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.2)',
        background:'#fefdf8',
        backgroundImage:'repeating-linear-gradient(transparent,transparent 31px,#c9ddf0 31px,#c9ddf0 32px)',
        backgroundPositionY:'10px',
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

      {/* Board content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-10 pb-8" dir="rtl">
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
                  <span className="inline-block" style={{marginRight:4,verticalAlign:'middle'}}>
                    <svg className="ln-pen inline-block" width={22} height={22} viewBox="0 0 24 24" fill="none"
                      style={{transform:'scaleX(-1)'}}>
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="#1a1832" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="m15 5 4 4" stroke="#1a1832" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
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
          </div>
        )}
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

async function callChartAnalyze(text:string):Promise<ChartData>{
  try{
    const r=await fetch(resolveApiUrl('/api/ai/lecture-chart-analyze'),{
      method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()},
      body:JSON.stringify({text})
    });
    return await r.json();
  }catch{return{hasChart:false,chartType:'none'};}
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
  const [askMode,setAskMode]=useState(false);

  // Upload state
  const [inputMode,setInputMode]=useState<InputMode>('paste');
  const [uploadStep,setUploadStep]=useState<UploadStep>('select');
  const [uploadedFile,setUploadedFile]=useState<File|null>(null);
  const [extractedDoc,setExtractedDoc]=useState('');
  const [topicInput,setTopicInput]=useState('');
  const [uploadMsg,setUploadMsg]=useState('');

  // Direct draw command (user types "ارسم ...")
  const [directCmd,setDirectCmd]=useState('');
  const [showCmdBar,setShowCmdBar]=useState(false);

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
  statusRef.current=status;

  useEffect(()=>{qaEndRef.current?.scrollIntoView({behavior:'smooth'});},[qa]);

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

  // Chart analysis
  const analyzeChart=useCallback(async(text:string)=>{
    if(!text.trim()) return;
    if(chartCacheRef.current.has(text)){
      const c=chartCacheRef.current.get(text)!;
      setCurrentChart(c.hasChart?c:null); return;
    }
    if(chartScore(text)<2){setCurrentChart(null);return;}
    setIsDrawingChart(true);
    const c=await callChartAnalyze(text);
    chartCacheRef.current.set(text,c);
    setCurrentChart(c.hasChart?c:null);
    setIsDrawingChart(false);
  },[]);

  // Direct draw command
  const handleDirectDraw=useCallback(async(cmd:string)=>{
    const text=cmd.replace(DRAW_CMD,'').trim()||cmd;
    setIsDrawingChart(true); setChunkText(cmd);
    const c=await callChartAnalyze(text);
    setCurrentChart(c.hasChart?c:null);
    setIsDrawingChart(false); setDirectCmd('');
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
        headers:{'Content-Type':'application/json'},body:JSON.stringify({text:lectureText})});
      const d=await r.json();
      if(d?.success&&d?.processedText) prep=d.processedText;
    }catch(_){}

    setStatus('connecting');
    const key=(localStorage.getItem('aiProvider')||'gemini')==='gemini'?(localStorage.getItem('customAiKey')||''):'';
    const params=new URLSearchParams({key,lang:'ar',mode:'lecture',voice});
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
            // Mark draw pending if model announces drawing
            if(DRAW_CONFIRM.test(txt)) drawPendingRef.current=true;
          }
          // User says "ارسم..." → draw immediately using the utterance text
          if(role==='user'&&DRAW_CMD.test(txt)){
            handleDirectDraw(txt);
          }
        }else if(msg.type==='turn_complete'){
          // After model finishes its full turn, check if drawing was announced
          if(drawPendingRef.current&&modelTransBuf.current.trim()){
            const fullDesc=modelTransBuf.current.trim();
            drawPendingRef.current=false;
            // Call chart API directly (bypass chartScore — model explicitly described data)
            setIsDrawingChart(true);
            callChartAnalyze(fullDesc).then(c=>{
              chartCacheRef.current.set(fullDesc,c);
              setCurrentChart(c.hasChart?c:null);
              setIsDrawingChart(false);
            });
          }
          modelTransBuf.current=''; // reset buffer for next turn
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
  },[lectureText,voice,playChunk,hardStop,analyzeChart,handleDirectDraw]);

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
              <label className="flex flex-col items-center justify-center gap-3 w-full h-40 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition">
                <span className="text-4xl">📂</span>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-300">اضغط لاختيار ملف أو صورة</p>
                  <p className="text-[10px] text-slate-500 mt-1">PDF · Word · PPT · Excel · صور · نصوص</p>
                  <p className="text-[10px] text-indigo-400 mt-1">🎨 صور الرسوم والمخططات ستُرسم تلقائياً على السبورة</p>
                </div>
                <input type="file" accept={ACCEPTED} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
              </label>
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
  const renderSession=()=>(
    <div className="flex flex-col h-full min-h-0">
      {/* Status strip */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor[status]}`}/>
          <span className="text-xs font-bold text-slate-300">{statusLabel[status]}</span>
        </div>
        <div className="flex items-center gap-2">
          {isDrawingChart&&<span className="text-[10px] text-indigo-300 animate-pulse">📊 رسم بياني…</span>}
          {currentChart?.hasChart&&!isDrawingChart&&(
            <span className="text-[10px] text-indigo-400 flex items-center gap-1">📊 {currentChart.title||'رسم بياني'}</span>
          )}
        </div>
      </div>

      {/* ⭐ WHITEBOARD — takes all flex space ⭐ */}
      <Whiteboard
        text={chunkText}
        chart={currentChart}
        chunkIdx={chunkIndex}
        totalChunks={totalChunks}
        isDrawingChart={isDrawingChart}/>

      {/* Q&A strip (collapsible) */}
      {qa.length>0&&(
        <div className="shrink-0 max-h-28 overflow-y-auto border-t border-white/5 px-4 py-2 space-y-1.5">
          {qa.slice(-4).map(item=>(
            <div key={item.id} className={`flex ${item.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-[88%] px-3 py-1.5 rounded-xl text-[12px] leading-relaxed ${
                item.role==='user'?'bg-blue-600/30 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                :'bg-purple-600/20 border border-purple-500/20 text-purple-100 rounded-tl-sm'}`}>
                <MathText text={item.text} dir="rtl"/>
              </div>
            </div>
          ))}
          <div ref={qaEndRef}/>
        </div>
      )}

      {/* Direct draw command bar */}
      {showCmdBar&&(
        <div className="shrink-0 flex gap-2 px-4 py-2 border-t border-white/5">
          <input value={directCmd} onChange={e=>setDirectCmd(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&directCmd.trim())handleDirectDraw(directCmd);if(e.key==='Escape')setShowCmdBar(false);}}
            placeholder="ارسم مخطط عمودي للبيانات… أو ارسم دورة حياة البكتيريا"
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"/>
          <button onClick={()=>{if(directCmd.trim())handleDirectDraw(directCmd);}}
            disabled={!directCmd.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 transition">
            ارسم
          </button>
          <button onClick={()=>{setShowCmdBar(false);setDirectCmd('');}}
            className="px-3 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-slate-200 text-xs transition">✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <button onClick={askNow} disabled={status==='listening'||status==='paused'}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
              status==='listening'?'bg-blue-600/60 text-white cursor-default'
              :'bg-blue-600/25 border border-blue-500/40 text-blue-200 hover:bg-blue-600/40'} disabled:opacity-60`}>
            🎙 اسأل
          </button>
          <button onClick={()=>setShowCmdBar(s=>!s)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold border transition ${
              showCmdBar?'bg-indigo-600 border-indigo-500 text-white':'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/35'}`}>
            📊 ارسم
          </button>
          <button onClick={togglePause} disabled={status==='listening'||status==='answering'||status==='done'}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 text-xs font-extrabold disabled:opacity-40 transition">
            {status==='paused'?'▶ استكمال':'⏸ توقف'}
          </button>
          <button onClick={stop}
            className="px-4 py-2.5 rounded-xl bg-red-600/30 border border-red-500/50 text-red-300 hover:bg-red-600/50 text-xs font-extrabold transition">
            إنهاء
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-500">
          {askMode?'🎙 تحدّث الآن — هو يستمع لك':
           status==='done'?'انتهى الشرح — يمكنك الرسم أو طرح أسئلة':
           'يمكنك المقاطعة بصوتك أو بالأمر "ارسم …"'}
        </p>
      </div>
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
    </div>
  );
}
