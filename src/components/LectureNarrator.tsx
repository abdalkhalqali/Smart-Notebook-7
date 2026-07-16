import React, { useEffect, useRef, useState, useCallback } from 'react';
import MathText from './MathText';
import { resolveApiUrl } from '../utils/apiBase';

// ────────────────────────────────────────────────────────────────
// شارح المحاضرات التفاعلي
// سبورة بيضاء واقعية + قلم يكتب بالتحريك + رسوم بيانية حية
// ────────────────────────────────────────────────────────────────

// ── Keyframe styles injected once ──────────────────────────────
const BOARD_STYLES = `
  @keyframes growUp {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  @keyframes drawPath {
    from { stroke-dashoffset: var(--len,2000); }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes fillSector {
    from { stroke-dasharray: 0 var(--circ,1000); }
    to   { stroke-dasharray: var(--dash,0) var(--circ,1000); }
  }
  @keyframes fadeRow {
    from { opacity:0; transform:translateY(5px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes penCursor {
    0%,100% { opacity:1; }
    50%     { opacity:0; }
  }
  @keyframes penMove {
    from { transform: translateX(6px); }
    to   { transform: translateX(0px); }
  }
  .pen-blink { animation: penCursor 1s ease-in-out infinite; }
  .pen-move  { animation: penMove 0.2s ease-out; }
  .chart-bar {
    transform-origin: bottom center;
    animation: growUp 0.9s cubic-bezier(0.16,1,0.3,1) both;
  }
  .chart-line {
    stroke-dashoffset: var(--len,2000);
    animation: drawPath 1.8s ease-out forwards;
  }
  .chart-sector {
    animation: fillSector 1.2s ease-out forwards;
  }
  .chart-row {
    animation: fadeRow 0.4s ease-out both;
  }
`;

// ── Types ───────────────────────────────────────────────────────
type Status = 'idle'|'preparing'|'connecting'|'narrating'|'listening'|'answering'|'paused'|'done'|'error';
type InputMode = 'paste'|'upload';
type UploadStep = 'select'|'extracting'|'ask_topic'|'generating'|'ready';

interface QAItem { id:string; role:'user'|'model'; text:string; ts:number; }
interface Dataset { name:string; values:number[]; }
interface DiagNode  { id:string; label:string; shape:'box'|'circle'|'diamond'; }
interface DiagEdge  { from:string; to:string; label:string; }
interface ChartData {
  hasChart: boolean;
  chartType: 'bar'|'line'|'pie'|'table'|'diagram'|'none';
  title?: string;
  labels?: string[];
  datasets?: Dataset[];
  tableHeaders?: string[];
  tableRows?: string[][];
  diagramNodes?: DiagNode[];
  diagramEdges?: DiagEdge[];
}

const VOICES = [
  { id:'Charon', label:'🎓 صوت رجالي هادئ (Charon)' },
  { id:'Kore',   label:'👩‍🏫 صوت نسائي واضح (Kore)' },
  { id:'Puck',   label:'⚡ صوت حيوي نشيط (Puck)' },
  { id:'Aoede',  label:'🌙 صوت نسائي دافئ (Aoede)' },
  { id:'Fenrir', label:'💪 صوت رجالي قوي (Fenrir)' },
  { id:'Zephyr', label:'🍃 صوت خفيف لطيف (Zephyr)' },
];
const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.md,.csv,.html,image/*';
const CHART_KW = /بيان|مخطط|رسم|جدول|نسب|مئو|إحصاء|مقارن|توزيع|أعمد|دائر|خط|هيكل|مرحل|خوارزم|تدفق|chart|graph|table|figure|diagram|%|٪/i;
const NUM_RE   = /\d+\.?\d*/g;

// ── Audio utils ─────────────────────────────────────────────────
function f32ToI16(inp:Float32Array):Int16Array{const o=new Int16Array(inp.length);for(let i=0;i<inp.length;i++){const s=Math.max(-1,Math.min(1,inp[i]));o[i]=s<0?s*0x8000:s*0x7fff;}return o;}
function b64ToF32(b64:string):Float32Array{const bin=atob(b64);const buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);const i16=new Int16Array(buf.buffer);const f32=new Float32Array(i16.length);for(let i=0;i<i16.length;i++)f32[i]=i16[i]/32768;return f32;}
function ab2b64(buf:ArrayBuffer):string{const b=new Uint8Array(buf);let s='';for(let i=0;i<b.byteLength;i++)s+=String.fromCharCode(b[i]);return btoa(s);}
function fileToB64(f:File):Promise<string>{return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const d=r.result as string;res(d.includes(',')?d.split(',')[1]:d);};r.onerror=rej;r.readAsDataURL(f);});}

// ── Safe substring that never cuts mid‑$...$  ──────────────────
function safeSub(text:string, idx:number):string{
  const s=text.slice(0,idx);
  const n=(s.match(/\$/g)||[]).length;
  if(n%2===0) return s;
  const last=s.lastIndexOf('$');
  return last>=0?s.slice(0,last):s;
}

// ── useTypewriter hook ──────────────────────────────────────────
function useTypewriter(text:string, charsPerTick=3, interval=16){
  const [displayed,setDisplayed]=useState('');
  const [done,setDone]=useState(true);
  const idxRef=useRef(0);
  const prevRef=useRef('');
  useEffect(()=>{
    if(text!==prevRef.current){
      prevRef.current=text;
      idxRef.current=0;
      setDisplayed('');
      setDone(false);
    }
    if(done) return;
    const t=setInterval(()=>{
      idxRef.current=Math.min(idxRef.current+charsPerTick, text.length);
      const s=safeSub(text,idxRef.current);
      setDisplayed(s);
      if(idxRef.current>=text.length){ setDone(true); setDisplayed(text); }
    },interval);
    return ()=>clearInterval(t);
  },[text,done,charsPerTick,interval]);
  return {displayed,done};
}

// ── CHART COMPONENTS ────────────────────────────────────────────
const COLORS=['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];

function BarChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const W=480,H=260,PL=50,PR=16,PT=36,PB=56;
  const cW=W-PL-PR, cH=H-PT-PB;
  const allVals=datasets.flatMap(d=>d.values).filter(v=>typeof v==='number'&&!isNaN(v));
  const maxV=allVals.length?Math.max(...allVals):1;
  const n=labels.length||1;
  const nDs=datasets.length||1;
  const grpW=cW/n;
  const bW=Math.min(32,grpW*0.8/nDs);
  const ticks=5;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={20} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1a1832" fontFamily="system-ui">{title}</text>}
      {/* grid + y‑axis ticks */}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=Math.round(maxV*i/ticks);
        const y=PT+cH-cH*i/ticks;
        return(<g key={i}>
          <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#e5e7eb" strokeWidth={1}/>
          <text x={PL-6} y={y+4} textAnchor="end" fontSize={9} fill="#6b7280">{v}</text>
        </g>);
      })}
      {/* axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#374151" strokeWidth={1.5}/>
      <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#374151" strokeWidth={1.5}/>
      {/* bars */}
      {labels.map((lbl,li)=>(
        <g key={li}>
          {datasets.map((ds,di)=>{
            const v=ds.values[li]??0;
            const bH=v/maxV*cH;
            const x=PL+li*grpW+di*(bW+2)+(grpW-nDs*(bW+2))/2;
            const y=PT+cH;
            return(
              <g key={di} style={{transformOrigin:`${x+bW/2}px ${y}px`}}>
                <rect className="chart-bar" x={x} y={y-bH} width={bW} height={bH}
                  fill={COLORS[di%COLORS.length]} rx={3}
                  style={{animationDelay:`${li*0.08+di*0.04}s`}}/>
                <text x={x+bW/2} y={y-bH-4} textAnchor="middle" fontSize={8} fill={COLORS[di%COLORS.length]} fontWeight="600">{v}</text>
              </g>
            );
          })}
          <text x={PL+li*grpW+grpW/2} y={PT+cH+14} textAnchor="middle" fontSize={9} fill="#374151">{lbl}</text>
        </g>
      ))}
      {/* legend */}
      {nDs>1&&datasets.map((ds,di)=>(
        <g key={di} transform={`translate(${PL+di*90},${H-8})`}>
          <rect x={0} y={-8} width={10} height={10} fill={COLORS[di%COLORS.length]} rx={2}/>
          <text x={14} y={0} fontSize={9} fill="#374151">{ds.name}</text>
        </g>
      ))}
    </svg>
  );
}

function LineChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const W=480,H=250,PL=50,PR=16,PT=36,PB=50;
  const cW=W-PL-PR,cH=H-PT-PB;
  const allVals=datasets.flatMap(d=>d.values).filter(v=>typeof v==='number'&&!isNaN(v));
  const maxV=allVals.length?Math.max(...allVals):1;
  const minV=Math.min(...allVals,0);
  const range=maxV-minV||1;
  const n=labels.length||1;
  const xStep=cW/(n-1||1);
  const ticks=5;
  const py=(v:number)=>PT+cH-((v-minV)/range)*cH;
  const px=(_:any,i:number)=>PL+i*xStep;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={20} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1a1832">{title}</text>}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=Math.round((minV+range*i/ticks)*10)/10;
        const y=py(v);
        return(<g key={i}>
          <line x1={PL} y1={y} x2={PL+cW} y2={y} stroke="#e5e7eb" strokeWidth={1}/>
          <text x={PL-6} y={y+4} textAnchor="end" fontSize={9} fill="#6b7280">{v}</text>
        </g>);
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#374151" strokeWidth={1.5}/>
      <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#374151" strokeWidth={1.5}/>
      {datasets.map((ds,di)=>{
        const pts=ds.values.map((v,i)=>`${px(null,i)},${py(v)}`).join(' ');
        const pathD='M '+ds.values.map((v,i)=>`${px(null,i)},${py(v)}`).join(' L ');
        return(<g key={di}>
          <polyline points={pts} fill="none" stroke={COLORS[di%COLORS.length]} strokeWidth={0} opacity={0.15}/>
          <path className="chart-line" d={pathD} fill="none" stroke={COLORS[di%COLORS.length]}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{'--len':'2000'} as any}/>
          {ds.values.map((v,i)=>(
            <circle key={i} cx={px(null,i)} cy={py(v)} r={4} fill="#fff" stroke={COLORS[di%COLORS.length]} strokeWidth={2}
              style={{animationDelay:`${1.8+i*0.05}s`}}/>
          ))}
        </g>);
      })}
      {labels.map((lbl,li)=>(
        <text key={li} x={px(null,li)} y={PT+cH+14} textAnchor="middle" fontSize={9} fill="#374151">{lbl}</text>
      ))}
      {datasets.length>1&&datasets.map((ds,di)=>(
        <g key={di} transform={`translate(${PL+di*90},${H-6})`}>
          <line x1={0} y1={-3} x2={12} y2={-3} stroke={COLORS[di%COLORS.length]} strokeWidth={2.5}/>
          <text x={16} y={0} fontSize={9} fill="#374151">{ds.name}</text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({title,labels=[],datasets=[]}:{title?:string;labels?:string[];datasets?:Dataset[]}){
  const values=datasets[0]?.values??[];
  const total=values.reduce((a,b)=>a+b,0)||1;
  const CX=140,CY=120,R=90;
  const circ=2*Math.PI*R;
  let offset=0;
  return(
    <svg width="100%" viewBox="0 0 380 240" style={{overflow:'visible'}}>
      {title&&<text x={190} y={18} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1a1832">{title}</text>}
      <circle cx={CX} cy={CY} r={R} fill="#f1f5f9"/>
      {values.map((v,i)=>{
        const pct=v/total;
        const dash=pct*circ;
        const rot=offset*360-90;
        offset+=pct;
        return(
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={COLORS[i%COLORS.length]} strokeWidth={R*2}
            className="chart-sector"
            style={{
              '--dash':dash,'--circ':circ,
              transform:`rotate(${rot}deg)`,
              transformOrigin:`${CX}px ${CY}px`,
              animationDelay:`${i*0.18}s`
            } as any}/>
        );
      })}
      {/* labels */}
      {(() => {
        let off2=0;
        return values.map((v,i)=>{
          const pct=v/total;
          const mid=(off2+pct/2)*2*Math.PI-Math.PI/2;
          off2+=pct;
          const lx=CX+Math.cos(mid)*(R+28);
          const ly=CY+Math.sin(mid)*(R+28);
          return(<text key={i} x={lx} y={ly} textAnchor="middle" fontSize={10} fill={COLORS[i%COLORS.length]} fontWeight="600">
            {labels[i]||''} {Math.round(pct*100)}%
          </text>);
        });
      })()}
      {/* legend */}
      {labels.map((lbl,i)=>(
        <g key={i} transform={`translate(295,${32+i*22})`}>
          <rect x={0} y={-10} width={12} height={12} fill={COLORS[i%COLORS.length]} rx={2}/>
          <text x={16} y={0} fontSize={10} fill="#374151">{lbl}</text>
        </g>
      ))}
    </svg>
  );
}

function TableChart({title,tableHeaders=[],tableRows=[]}:{title?:string;tableHeaders?:string[];tableRows?:string[][]}){
  return(
    <div className="w-full overflow-x-auto">
      {title&&<p className="text-center text-sm font-bold text-slate-800 mb-2">{title}</p>}
      <table className="w-full text-xs border-collapse" style={{fontFamily:'system-ui'}}>
        <thead>
          <tr>{tableHeaders.map((h,i)=>(
            <th key={i} className="border border-slate-300 bg-indigo-50 px-2 py-1.5 text-right text-slate-700 font-bold">{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {tableRows.map((row,ri)=>(
            <tr key={ri} className="chart-row even:bg-slate-50" style={{animationDelay:`${ri*0.07}s`}}>
              {row.map((cell,ci)=>(
                <td key={ci} className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagramChart({title,diagramNodes=[],diagramEdges=[]}:{title?:string;diagramNodes?:DiagNode[];diagramEdges?:DiagEdge[]}){
  const W=480,H=260;
  const n=diagramNodes.length||1;
  // Simple circular layout
  const positions:Record<string,{x:number,y:number}> = {};
  diagramNodes.forEach((node,i)=>{
    if(n===1){ positions[node.id]={x:W/2,y:H/2}; return; }
    const angle=(i/n)*2*Math.PI - Math.PI/2;
    const rx=n<=4?140:170, ry=n<=4?90:100;
    positions[node.id]={x:W/2+rx*Math.cos(angle), y:H/2+ry*Math.sin(angle)};
  });
  const shapeSize=38;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {title&&<text x={W/2} y={14} textAnchor="middle" fontSize={13} fontWeight="700" fill="#1a1832">{title}</text>}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6366f1"/>
        </marker>
      </defs>
      {/* edges */}
      {diagramEdges.map((e,i)=>{
        const s=positions[e.from],t=positions[e.to];
        if(!s||!t) return null;
        const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
        const dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
        const ox=-dy/dist*18,oy=dx/dist*18;
        const d=`M${s.x},${s.y} Q${mx+ox},${my+oy} ${t.x},${t.y}`;
        return(<g key={i}>
          <path className="chart-line" d={d} fill="none" stroke="#6366f1" strokeWidth={1.8}
            markerEnd="url(#arrow)" style={{'--len':'800'} as any}/>
          {e.label&&<text x={mx+ox*1.3} y={my+oy*1.3+4} textAnchor="middle" fontSize={8} fill="#6366f1" fontStyle="italic">{e.label}</text>}
        </g>);
      })}
      {/* nodes */}
      {diagramNodes.map((node,i)=>{
        const {x,y}=positions[node.id]||{x:W/2,y:H/2};
        const col=COLORS[i%COLORS.length];
        const words=node.label.split(/\s+/);
        const lineH=13;
        if(node.shape==='circle'){
          return(<g key={node.id}>
            <circle cx={x} cy={y} r={shapeSize} fill="#fff" stroke={col} strokeWidth={2.5}/>
            {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lineH+4} textAnchor="middle" fontSize={9} fill={col} fontWeight="600">{w}</text>)}
          </g>);
        }
        if(node.shape==='diamond'){
          const s=shapeSize;
          const pts=`${x},${y-s} ${x+s*1.2},${y} ${x},${y+s} ${x-s*1.2},${y}`;
          return(<g key={node.id}>
            <polygon points={pts} fill="#fff" stroke={col} strokeWidth={2}/>
            {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lineH+4} textAnchor="middle" fontSize={8} fill={col} fontWeight="600">{w}</text>)}
          </g>);
        }
        // box
        const bW=shapeSize*2.4,bH=shapeSize*1.4;
        return(<g key={node.id}>
          <rect x={x-bW/2} y={y-bH/2} width={bW} height={bH} rx={6} fill="#fff" stroke={col} strokeWidth={2}/>
          {words.map((w,wi)=><text key={wi} x={x} y={y+(wi-(words.length-1)/2)*lineH+4} textAnchor="middle" fontSize={9} fill={col} fontWeight="600">{w}</text>)}
        </g>);
      })}
    </svg>
  );
}

function ChartPanel({chart}:{chart:ChartData}){
  if(!chart.hasChart||chart.chartType==='none') return null;
  const wrapper='mt-4 border-t border-slate-200 pt-4';
  switch(chart.chartType){
    case 'bar':     return <div className={wrapper}><BarChart     title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'line':    return <div className={wrapper}><LineChart    title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'pie':     return <div className={wrapper}><PieChart     title={chart.title} labels={chart.labels}      datasets={chart.datasets}/></div>;
    case 'table':   return <div className={wrapper}><TableChart   title={chart.title} tableHeaders={chart.tableHeaders} tableRows={chart.tableRows}/></div>;
    case 'diagram': return <div className={wrapper}><DiagramChart title={chart.title} diagramNodes={chart.diagramNodes} diagramEdges={chart.diagramEdges}/></div>;
    default:        return null;
  }
}

// ── Whiteboard ──────────────────────────────────────────────────
function Whiteboard({text,chart,chunkIdx,totalChunks}:{text:string;chart:ChartData|null;chunkIdx:number;totalChunks:number}){
  const {displayed,done}=useTypewriter(text,4,14);
  return(
    <div className="relative mx-4 my-3 rounded-xl overflow-hidden shadow-2xl select-text"
      style={{
        background:'#fefdf8',
        border:'10px solid #7c5528',
        boxShadow:'0 8px 32px rgba(0,0,0,0.35), inset 0 0 0 2px #a0784a, 0 2px 6px rgba(0,0,0,0.2)',
        backgroundImage:'repeating-linear-gradient(transparent,transparent 31px,#dce8f3 31px,#dce8f3 32px)',
        backgroundPositionY:'8px',
        minHeight:200
      }}>
      {/* Frame highlight */}
      <div className="absolute inset-0 rounded-sm pointer-events-none"
        style={{boxShadow:'inset 0 2px 4px rgba(255,255,255,0.3),inset 0 -2px 4px rgba(0,0,0,0.15)'}}/>

      {/* Board tray at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-3 rounded-b-sm pointer-events-none"
        style={{background:'linear-gradient(to bottom,#8B5E34,#6B4420)'}}/>

      {/* Content */}
      <div className="px-6 pt-4 pb-6 min-h-[180px]" dir="rtl">
        {/* Chunk counter */}
        {totalChunks>0&&(
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {Array.from({length:totalChunks},(_,i)=>(
                <div key={i} className="h-1.5 w-5 rounded-full transition-all duration-500"
                  style={{background:i<=chunkIdx?'#4F46E5':'#d1d5db'}}/>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{chunkIdx+1}/{totalChunks}</span>
          </div>
        )}

        {/* Text area */}
        <div className="text-[15px] leading-[32px] text-slate-900" style={{fontFamily:'Georgia,"Times New Roman",serif',minHeight:64}}>
          {displayed ? (
            <span>
              <MathText text={displayed} className="text-slate-900" dir="rtl"/>
              {!done&&(
                <span className="inline-block relative" style={{width:20,height:20,verticalAlign:'middle'}}>
                  <svg className="pen-blink pen-move inline-block" width={18} height={18} viewBox="0 0 24 24" fill="none"
                    style={{transform:'scaleX(-1)',marginRight:2}}>
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="#1a1832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="m15 5 4 4" stroke="#1a1832" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
              )}
            </span>
          ):(
            <span className="text-slate-300 italic text-sm">في انتظار بدء الشرح…</span>
          )}
        </div>

        {/* Chart */}
        {chart&&chart.hasChart&&<ChartPanel chart={chart}/>}
      </div>
    </div>
  );
}

// ── AI header helper ────────────────────────────────────────────
function getAiHeaders():Record<string,string>{
  const key=(localStorage.getItem('customAiKey')||'').trim();
  const prov=localStorage.getItem('aiProvider')||'gemini';
  if(!key) return {};
  const h:Record<string,string>={'x-custom-api-key':key,'x-custom-provider':prov};
  if(prov==='custom'){const u=(localStorage.getItem('customEndpointUrl')||'').trim();if(u)h['x-custom-endpoint-url']=u;}
  return h;
}

// ── Chart confidence score — avoid API calls for plain text ─────
function chartConfidence(text:string):number{
  let score=0;
  if(CHART_KW.test(text)) score+=2;
  const nums=(text.match(NUM_RE)||[]).length;
  if(nums>=3) score+=1;
  if(nums>=6) score+=1;
  if(/%|٪/.test(text)) score+=1;
  return score;
}

// ════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════
interface Props { onClose:()=>void; initialText?:string; }

export default function LectureNarrator({onClose,initialText=''}:Props){
  // ── Session ──────────────────────────────────────────────────
  const [status,setStatus]=useState<Status>('idle');
  const [lectureText,setLectureText]=useState(initialText);
  const [voice,setVoice]=useState('Charon');
  const [errorMsg,setErrorMsg]=useState('');
  const [qa,setQa]=useState<QAItem[]>([]);
  const [totalChunks,setTotalChunks]=useState(0);
  const [chunkIndex,setChunkIndex]=useState(0);
  const [currentChunkText,setCurrentChunkText]=useState('');
  const [currentChart,setCurrentChart]=useState<ChartData|null>(null);
  const [askMode,setAskMode]=useState(false);

  // ── Upload ───────────────────────────────────────────────────
  const [inputMode,setInputMode]=useState<InputMode>('paste');
  const [uploadStep,setUploadStep]=useState<UploadStep>('select');
  const [uploadedFile,setUploadedFile]=useState<File|null>(null);
  const [extractedDoc,setExtractedDoc]=useState('');
  const [topicInput,setTopicInput]=useState('');
  const [uploadMsg,setUploadMsg]=useState('');

  // ── Refs ─────────────────────────────────────────────────────
  const wsRef=useRef<WebSocket|null>(null);
  const audioCtxRef=useRef<AudioContext|null>(null);
  const procRef=useRef<ScriptProcessorNode|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const playTimeRef=useRef(0);
  const sourcesRef=useRef<AudioBufferSourceNode[]>([]);
  const qaEndRef=useRef<HTMLDivElement>(null);
  const statusRef=useRef<Status>('idle');
  const chartCacheRef=useRef<Map<string,ChartData>>(new Map());
  statusRef.current=status;

  useEffect(()=>{ qaEndRef.current?.scrollIntoView({behavior:'smooth'}); },[qa]);

  // ── Styles injection ─────────────────────────────────────────
  useEffect(()=>{
    if(document.getElementById('board-styles')) return;
    const el=document.createElement('style');
    el.id='board-styles'; el.textContent=BOARD_STYLES;
    document.head.appendChild(el);
    return ()=>{ el.remove(); };
  },[]);

  // ── Audio ────────────────────────────────────────────────────
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

  // ── Chart detection ──────────────────────────────────────────
  const analyzeChartAsync=useCallback(async(text:string)=>{
    if(chartCacheRef.current.has(text)){
      setCurrentChart(chartCacheRef.current.get(text)!); return;
    }
    if(chartConfidence(text)<2){ setCurrentChart(null); return; }
    try{
      const r=await fetch(resolveApiUrl('/api/ai/lecture-chart-analyze'),{
        method:'POST',
        headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({text})
      });
      const d:ChartData=await r.json();
      chartCacheRef.current.set(text,d);
      setCurrentChart(d.hasChart?d:null);
    }catch{ setCurrentChart(null); }
  },[]);

  // ── Start session ────────────────────────────────────────────
  const start=useCallback(async()=>{
    if(!lectureText.trim()){setErrorMsg('يرجى تحضير نص المحاضرة أولاً.');return;}
    setErrorMsg(''); setQa([]); setChunkIndex(0); setTotalChunks(0);
    setCurrentChunkText(''); setCurrentChart(null); setAskMode(false);
    setStatus('preparing');
    chartCacheRef.current.clear();

    let prep=lectureText;
    try{
      const r=await fetch(resolveApiUrl('/api/ai/lecture-prep'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:lectureText})});
      const d=await r.json();
      if(d?.success&&d?.processedText) prep=d.processedText;
    }catch(_){}

    setStatus('connecting');
    const prov=localStorage.getItem('aiProvider')||'gemini';
    const key=prov==='gemini'?(localStorage.getItem('customAiKey')||''):'';
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
          setChunkIndex(msg.index);
          setCurrentChunkText(msg.text);
          setAskMode(false); setStatus('narrating');
          analyzeChartAsync(msg.text);
        }else if(msg.type==='audio'){
          setStatus(s=>s==='paused'?s:(s==='listening'||s==='answering'?'answering':'narrating'));
          playChunk(msg.data);
        }else if(msg.type==='transcript'){
          setQa(prev=>{
            const last=prev[prev.length-1];
            if(last&&last.role===msg.role) return[...prev.slice(0,-1),{...last,text:last.text+msg.text}];
            return[...prev,{id:Date.now()+Math.random()+'',role:msg.role,text:msg.text,ts:Date.now()}];
          });
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
  },[lectureText,voice,playChunk,hardStop,analyzeChartAsync]);

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

  // ── Upload handlers ──────────────────────────────────────────
  const handleFile=async(file:File)=>{
    setUploadedFile(file); setErrorMsg('');
    setUploadMsg(`جاري استخراج النص من "${file.name}"…`);
    setUploadStep('extracting');
    try{
      const fd=await fileToB64(file);
      const r=await fetch(resolveApiUrl('/api/ai/lecture-extract-file'),{
        method:'POST',headers:{'Content-Type':'application/json',...getAiHeaders()},
        body:JSON.stringify({fileName:file.name,fileType:file.type,fileData:fd})
      });
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'فشل الاستخراج');
      setExtractedDoc(d.text); setUploadMsg(''); setUploadStep('ask_topic');
    }catch(e:any){setErrorMsg(`فشل استخراج النص: ${e.message}`);setUploadStep('select');}
  };

  const handleGenerate=async()=>{
    if(!topicInput.trim()){setErrorMsg('يرجى إدخال الموضوع.');return;}
    setErrorMsg(''); setUploadMsg('جاري توليد الشرح المفصّل بالذكاء الاصطناعي…');
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

  // ── Derived ──────────────────────────────────────────────────
  const inSession=!['idle','error'].includes(status);
  const statusLabel:Record<Status,string>={
    idle:'جاهز للبدء',preparing:'جاري تحضير النص والرموز الرياضية…',
    connecting:'جاري الاتصال…',narrating:'📖 يشرح المحاضرة الآن…',
    listening:'🎙 يستمع لسؤالك الآن…',answering:'💬 يرد على سؤالك…',
    paused:'⏸ متوقف مؤقتاً',done:'✅ انتهى شرح المحاضرة',error:'خطأ',
  };

  // ── Render helpers ───────────────────────────────────────────
  const VoiceSelect=()=>(
    <div className="space-y-1.5">
      <label className="text-[11px] text-slate-400 font-bold block">نبرة صوت المعلم</label>
      <select value={voice} onChange={e=>setVoice(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500">
        {VOICES.map(v=><option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>)}
      </select>
    </div>
  );

  // ── Upload panel ─────────────────────────────────────────────
  const renderUpload=()=>(
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {errorMsg&&<div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300">{errorMsg}</div>}
      {uploadStep==='select'&&(
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">ارفع ملفاً بأي صيغة (PDF، Word، PPT، Excel، صورة، نص…)، يستخرج الذكاء الاصطناعي محتواه ثم تختار موضوع الشرح.</p>
          <label className="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed border-white/15 rounded-2xl cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition">
            <span className="text-3xl">📂</span>
            <span className="text-xs text-slate-400">اضغط لاختيار ملف أو اسحبه هنا</span>
            <span className="text-[10px] text-slate-600">PDF • Word • PPT • Excel • صور • نصوص</span>
            <input type="file" accept={ACCEPTED} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
          </label>
        </div>
      )}
      {(uploadStep==='extracting'||uploadStep==='generating')&&(
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
          <p className="text-xs text-slate-400 text-center">{uploadMsg}</p>
        </div>
      )}
      {uploadStep==='ask_topic'&&(
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
            <span>✅</span>
            <div>
              <p className="text-xs font-bold text-emerald-300">تم استخراج المحتوى بنجاح</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{uploadedFile?.name} — {extractedDoc.length.toLocaleString()} حرف</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300 font-bold block">ما الموضوع الذي تريد شرحه؟</label>
            <input type="text" value={topicInput} onChange={e=>setTopicInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')handleGenerate();}}
              placeholder="مثال: قانون نيوتن الثاني، الدوال التفاضلية، التمثيل الغذائي…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-500"/>
          </div>
          <button onClick={handleGenerate} disabled={!topicInput.trim()}
            className="w-full py-2.5 rounded-2xl font-black text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg transition">
            🧠 ولّد الشرح المفصّل
          </button>
          <button onClick={()=>{setUploadStep('select');setUploadedFile(null);setExtractedDoc('');setTopicInput('');}}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition">← اختر ملفاً مختلفاً</button>
        </div>
      )}
      {uploadStep==='ready'&&(
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/25 rounded-xl">
            <span>🎓</span>
            <div>
              <p className="text-xs font-bold text-violet-300">الشرح المفصّل جاهز — يمكن بدء الشرح الصوتي</p>
              <p className="text-[10px] text-slate-400 mt-0.5">موضوع: {topicInput} · {lectureText.length.toLocaleString()} حرف</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-[11px] text-slate-400 leading-relaxed">{lectureText.slice(0,500)}{lectureText.length>500?'…':''}</p>
          </div>
          <button onClick={start}
            className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg transition">
            🎓 ابدأ الشرح الصوتي
          </button>
          <button onClick={()=>setUploadStep('ask_topic')}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition">← اختر موضوعاً مختلفاً</button>
        </div>
      )}
      {(uploadStep==='select'||uploadStep==='ask_topic'||uploadStep==='ready')&&(
        <div className="border-t border-white/5 pt-3"><VoiceSelect/></div>
      )}
    </div>
  );

  // ── Paste panel ──────────────────────────────────────────────
  const renderPaste=()=>(
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {errorMsg&&<div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-300">{errorMsg}</div>}
      <div>
        <label className="text-[11px] text-slate-400 font-bold block mb-1.5">نص المحاضرة الكامل</label>
        <textarea value={lectureText} onChange={e=>setLectureText(e.target.value)}
          placeholder="ألصق هنا نص المحاضرة الكامل… (يدعم المعادلات الرياضية بصيغة LaTeX)"
          className="w-full h-48 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:ring-1 focus:ring-amber-500"/>
        <div className="text-[10px] text-slate-500 mt-1">{lectureText.length} حرف</div>
      </div>
      <VoiceSelect/>
      <button onClick={start}
        className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg transition">
        🎓 ابدأ شرح المحاضرة
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  return(
    <div className="flex flex-col h-full min-h-[560px] bg-gradient-to-b from-[#05080f] via-[#080d1a] to-[#030608] text-white" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖊️</span>
          <span className="text-xs font-black text-amber-200">شارح المحاضرات التفاعلي</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition text-sm">✕</button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {!inSession ? (
          <>
            {/* Mode toggle */}
            <div className="shrink-0 flex mx-5 mt-4 gap-1 bg-white/5 rounded-xl p-1">
              <button onClick={()=>{setInputMode('paste');setErrorMsg('');}}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${inputMode==='paste'?'bg-amber-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
                📋 لصق النص
              </button>
              <button onClick={()=>{setInputMode('upload');setErrorMsg('');}}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${inputMode==='upload'?'bg-violet-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
                📁 رفع ملف
              </button>
            </div>
            {inputMode==='paste'?renderPaste():renderUpload()}
          </>
        ) : (
          <>
            {/* Status bar */}
            <div className="shrink-0 px-5 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status==='narrating'?'bg-amber-400 animate-pulse':
                  status==='listening'?'bg-blue-400 animate-pulse':
                  status==='answering'?'bg-purple-400 animate-pulse':
                  status==='paused'?'bg-slate-400':'bg-emerald-400'}`}/>
                <span className="text-[11px] font-bold text-slate-300">{statusLabel[status]}</span>
              </div>
              {currentChart?.hasChart&&(
                <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                  <span>📊</span> رسم بياني
                </span>
              )}
            </div>

            {/* Main scroll area */}
            <div className="flex-1 overflow-y-auto py-1">
              {/* Whiteboard */}
              <Whiteboard
                text={currentChunkText}
                chart={currentChart}
                chunkIdx={chunkIndex}
                totalChunks={totalChunks}/>

              {/* Q&A */}
              {qa.length>0&&(
                <div className="px-5 pb-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-2">أسئلتك وردود المعلم</p>
                  {qa.map(item=>(
                    <div key={item.id} className={`flex ${item.role==='user'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                        item.role==='user'
                          ?'bg-blue-600/30 border border-blue-500/30 text-blue-100 rounded-tr-sm'
                          :'bg-purple-600/20 border border-purple-500/20 text-purple-100 rounded-tl-sm'}`}>
                        <MathText text={item.text} dir="rtl"/>
                      </div>
                    </div>
                  ))}
                  <div ref={qaEndRef}/>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="shrink-0 px-5 py-3 border-t border-white/5 space-y-2">
              <p className="text-[10px] text-slate-500 text-center">
                {askMode?'🎙 تحدّث الآن، هو يستمع لك حصرياً.':
                  status==='done'?'انتهى الشرح — يمكنك طرح أسئلة إضافية أو الإنهاء.':
                  'يمكنك مقاطعته بصوتك في أي وقت، أو اضغط "اسأل الآن" لقطع فوري.'}
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <button onClick={askNow} disabled={status==='listening'||status==='paused'}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    status==='listening'?'bg-blue-600/60 text-white cursor-default':
                    'bg-blue-600/25 border border-blue-500/40 text-blue-200 hover:bg-blue-600/40'} disabled:opacity-60`}>
                  🎙 اسأل الآن
                </button>
                <button onClick={togglePause} disabled={status==='listening'||status==='answering'||status==='done'}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition text-xs font-bold disabled:opacity-40">
                  {status==='paused'?'▶ استكمال':'⏸ إيقاف مؤقت'}
                </button>
                <button onClick={stop}
                  className="px-4 py-2.5 rounded-xl bg-red-600/30 border border-red-500/50 text-red-300 hover:bg-red-600/50 transition text-xs font-bold">
                  إنهاء
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
