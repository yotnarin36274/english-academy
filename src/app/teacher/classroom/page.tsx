'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/supabase';
import type { Student } from '@/lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

const WHEEL_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#FFA07A','#98D8C8',
  '#DDA0DD','#F7DC6F','#87CEEB','#F0B27A','#82E0AA',
  '#BB8FCE','#85C1E9','#FFDAB9','#B0E0E6','#FFB6C1',
];

const TEAM_COLORS = [
  { name:'ทีมแดง',    light:'#FEE2E2', dark:'#EF4444', text:'#991B1B' },
  { name:'ทีมน้ำเงิน', light:'#DBEAFE', dark:'#3B82F6', text:'#1E40AF' },
  { name:'ทีมเขียว',  light:'#DCFCE7', dark:'#22C55E', text:'#166534' },
  { name:'ทีมม่วง',   light:'#F3E8FF', dark:'#A855F7', text:'#6B21A8' },
  { name:'ทีมส้ม',    light:'#FFEDD5', dark:'#F97316', text:'#9A3412' },
  { name:'ทีมฟ้า',    light:'#CFFAFE', dark:'#06B6D4', text:'#164E63' },
];

const DICE_DOTS: Record<number,[number,number][]> = {
  1:[[50,50]],
  2:[[28,28],[72,72]],
  3:[[28,28],[50,50],[72,72]],
  4:[[28,28],[72,28],[28,72],[72,72]],
  5:[[28,28],[72,28],[50,50],[28,72],[72,72]],
  6:[[28,28],[72,28],[28,50],[72,50],[28,72],[72,72]],
};

type Tool = 'wheel'|'groups'|'timer'|'scoreboard'|'dice';
const TOOLS:{id:Tool;icon:string;label:string}[] = [
  {id:'wheel',      icon:'🎡',label:'วงล้อสุ่ม'},
  {id:'groups',     icon:'👥',label:'แบ่งกลุ่ม'},
  {id:'timer',      icon:'⏱', label:'จับเวลา'},
  {id:'scoreboard', icon:'🏆',label:'คะแนนทีม'},
  {id:'dice',       icon:'🎲',label:'ลูกเต๋า'},
];

const GROUP_LABELS:Record<string,string> = {p46:'ป.4–ป.6',m13:'ม.1–ม.3',m46:'ม.4–ม.6'};

// ── Helpers ───────────────────────────────────────────────────────────────────

function polarToCart(cx:number,cy:number,r:number,angleDeg:number){
  const rad=(angleDeg-90)*Math.PI/180;
  return {x:cx+r*Math.cos(rad), y:cy+r*Math.sin(rad)};
}

// ── Spin Wheel ────────────────────────────────────────────────────────────────

function SpinWheel({students}:{students:Student[]}){
  const [rotation,setRotation]=useState(0);
  const [spinning,setSpinning]=useState(false);
  const [winner,setWinner]=useState<Student|null>(null);
  const [removed,setRemoved]=useState<Set<string>>(new Set());

  const active=students.filter(s=>!removed.has(s.id));
  const N=active.length;

  function spin(){
    if(spinning||N<1) return;
    setWinner(null);
    setSpinning(true);
    if(N===1){setTimeout(()=>{setWinner(active[0]);setSpinning(false);},600);return;}
    const sa=360/N;
    const wi=Math.floor(Math.random()*N);
    const off=sa*0.15+Math.random()*sa*0.7;
    const target=wi*sa+off;
    const cur=rotation%360;
    const extra=((target-cur)+360)%360;
    const newRot=rotation+extra+5*360;
    setRotation(newRot);
    setTimeout(()=>{setWinner(active[wi]);setSpinning(false);},4200);
  }

  if(N===0) return(
    <div className="text-center py-12 text-gray-400">
      <div className="text-4xl mb-2">😅</div>
      <p>ไม่มีนักเรียนแล้ว</p>
      <button onClick={()=>setRemoved(new Set())} className="mt-3 text-sm text-blue-500 underline">รีเซ็ตรายชื่อ</button>
    </div>
  );

  const CX=140,CY=140,R=128;
  const sa=360/N;

  return(
    <div className="flex flex-col items-center gap-5">
      <div className="relative select-none">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 z-10
          w-0 h-0 border-l-[10px] border-r-[10px] border-b-[26px]
          border-l-transparent border-r-transparent border-b-gray-900 drop-shadow"/>

        {/* Wheel */}
        <div style={{width:280,height:280,transform:`rotate(${rotation}deg)`,
          transition:spinning?'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)':'none',
          filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',cursor:spinning?'default':'pointer'}}
          onClick={spin}>
          <svg width={280} height={280} viewBox="0 0 280 280">
            {N===1?(
              <circle cx={CX} cy={CY} r={R} fill={WHEEL_COLORS[0]}/>
            ):active.map((_,i)=>{
              const a1=i*sa, a2=(i+1)*sa;
              const p1=polarToCart(CX,CY,R,a1);
              const p2=polarToCart(CX,CY,R,a2);
              const la=sa>180?1:0;
              return(
                <path key={i}
                  d={`M${CX} ${CY} L${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A${R} ${R} 0 ${la} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}Z`}
                  fill={WHEEL_COLORS[i%WHEEL_COLORS.length]} stroke="white" strokeWidth={2}/>
              );
            })}

            {/* Labels */}
            {active.map((s,i)=>{
              const mid=(i+0.5)*sa;
              const tp=polarToCart(CX,CY,R*0.62,mid);
              const fs=N>10?9:N>6?10:N>3?12:14;
              const label=s.nickname.length>8?s.nickname.slice(0,7)+'…':s.nickname;
              return(
                <text key={s.id} x={tp.x} y={tp.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fontWeight={700} fill="white"
                  style={{filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}}
                  transform={`rotate(${mid},${tp.x},${tp.y})`}>
                  {label}
                </text>
              );
            })}

            {/* Center */}
            <circle cx={CX} cy={CY} r={30} fill="white"
              style={{filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.15))'}}/>
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={20}>🎡</text>
          </svg>
        </div>
      </div>

      <button onClick={spin} disabled={spinning}
        className="px-10 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95">
        {spinning?'⏳ กำลังหมุน…':'🎡 หมุนวงล้อ!'}
      </button>

      {winner&&(
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-8 py-4 text-center animate-bounce">
          <p className="text-xs text-yellow-600 font-medium mb-1">🎉 ได้รับเลือก!</p>
          <p className="text-3xl font-black text-yellow-800">{winner.nickname}</p>
          {winner.full_name&&<p className="text-sm text-yellow-600 mt-0.5">{winner.full_name}</p>}
          <button onClick={()=>{setRemoved(p=>new Set([...p,winner.id]));setWinner(null);}}
            className="mt-2 text-xs text-red-400 hover:text-red-600 underline">
            ✕ ไม่เลือกซ้ำ (เอาออกจากวงล้อ)
          </button>
        </div>
      )}

      {removed.size>0&&(
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400">เอาออกแล้ว ({removed.size} คน)</p>
            <button onClick={()=>setRemoved(new Set())} className="text-xs text-blue-500 hover:underline">รีเซ็ต</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {students.filter(s=>removed.has(s.id)).map(s=>(
              <span key={s.id} className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full line-through">{s.nickname}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Maker ───────────────────────────────────────────────────────────────

function GroupMaker({students}:{students:Student[]}){
  const [numGroups,setNumGroups]=useState(2);
  const [groups,setGroups]=useState<Student[][]>([]);

  function generate(){
    const shuffled=[...students].sort(()=>Math.random()-0.5);
    const result:Student[][]=Array.from({length:numGroups},()=>[]);
    shuffled.forEach((s,i)=>result[i%numGroups].push(s));
    setGroups(result);
  }

  const maxGroups=Math.max(2,Math.floor(students.length/2));

  return(
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">จำนวนกลุ่ม</label>
          <button onClick={()=>setNumGroups(g=>Math.max(2,g-1))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold transition-colors">−</button>
          <span className="w-8 text-center font-bold text-lg">{numGroups}</span>
          <button onClick={()=>setNumGroups(g=>Math.min(maxGroups,g+1))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold transition-colors">+</button>
        </div>
        <p className="text-sm text-gray-400">
          ({students.length} คน → กลุ่มละ ~{Math.ceil(students.length/numGroups)} คน)
        </p>
        <button onClick={generate}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow transition-all active:scale-95 ml-auto">
          🔀 สุ่มแบ่งกลุ่ม!
        </button>
      </div>

      {groups.length>0?(
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {groups.map((group,gi)=>{
            const c=TEAM_COLORS[gi%TEAM_COLORS.length];
            return(
              <div key={gi} style={{background:c.light,borderColor:c.dark}} className="border-2 rounded-2xl p-4">
                <p style={{color:c.text}} className="font-bold text-sm mb-2">
                  กลุ่ม {gi+1} <span className="font-normal opacity-60">({group.length} คน)</span>
                </p>
                <div className="space-y-1.5">
                  {group.map(s=>(
                    <div key={s.id} className="flex items-center gap-2">
                      <div style={{background:c.dark}}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {s.nickname[0]}
                      </div>
                      <span style={{color:c.text}} className="text-sm font-medium">{s.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ):(
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-sm">กด "สุ่มแบ่งกลุ่ม!" เพื่อแบ่งกลุ่มแบบสุ่ม</p>
        </div>
      )}
    </div>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function TimerPanel(){
  const [mode,setMode]=useState<'countdown'|'stopwatch'>('countdown');
  const [mins,setMins]=useState(5);
  const [secs,setSecs]=useState(0);
  const [timeLeft,setTimeLeft]=useState<number|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const intRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const totalRef=useRef(0);

  const clearInt=useCallback(()=>{if(intRef.current)clearInterval(intRef.current);},[]);
  useEffect(()=>()=>clearInt(),[clearInt]);

  function startCountdown(from?:number){
    const total=from??mins*60+secs;
    if(!total) return;
    totalRef.current=total;
    setTimeLeft(total); setDone(false); setRunning(true);
    clearInt();
    intRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t===null||t<=1){clearInt();setRunning(false);setDone(true);return 0;}
        return t-1;
      });
    },1000);
  }

  function startStopwatch(){
    setElapsed(0); setRunning(true);
    clearInt();
    intRef.current=setInterval(()=>setElapsed(e=>e+1),1000);
  }

  function pause(){clearInt();setRunning(false);}

  function resume(){
    setRunning(true); clearInt();
    if(mode==='countdown'){
      intRef.current=setInterval(()=>{
        setTimeLeft(t=>{
          if(t===null||t<=1){clearInt();setRunning(false);setDone(true);return 0;}
          return t-1;
        });
      },1000);
    } else {
      intRef.current=setInterval(()=>setElapsed(e=>e+1),1000);
    }
  }

  function reset(){clearInt();setRunning(false);setTimeLeft(null);setElapsed(0);setDone(false);}

  function fmt(s:number){
    const m=Math.floor(s/60).toString().padStart(2,'0');
    const sc=(s%60).toString().padStart(2,'0');
    return `${m}:${sc}`;
  }

  const started=timeLeft!==null||elapsed>0;
  const display=mode==='countdown'?fmt(timeLeft??mins*60+secs):fmt(elapsed);
  const progress=mode==='countdown'&&timeLeft!==null&&totalRef.current>0?timeLeft/totalRef.current:1;
  const C=2*Math.PI*110;
  const timerColor=done?'#EF4444':progress>0.5?'#22C55E':progress>0.2?'#F59E0B':'#EF4444';

  return(
    <div className="flex flex-col items-center gap-5">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-full p-1">
        {(['countdown','stopwatch'] as const).map(m=>(
          <button key={m} onClick={()=>{reset();setMode(m);}}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${mode===m?'bg-white shadow text-gray-800':'text-gray-500'}`}>
            {m==='countdown'?'⏱ ถอยหลัง':'⏲ นับขึ้น'}
          </button>
        ))}
      </div>

      {/* Display */}
      {mode==='countdown'&&started?(
        <svg width={260} height={260} viewBox="0 0 260 260">
          <circle cx={130} cy={130} r={110} fill="none" stroke="#E5E7EB" strokeWidth={12}/>
          <circle cx={130} cy={130} r={110} fill="none" stroke={timerColor} strokeWidth={12}
            strokeDasharray={C} strokeDashoffset={C*(1-progress)}
            strokeLinecap="round" transform="rotate(-90 130 130)"
            style={{transition:'stroke-dashoffset 1s linear,stroke 0.5s ease'}}/>
          <text x={130} y={done?120:130} textAnchor="middle" dominantBaseline="middle"
            fontSize={52} fontWeight={900} fill={done?'#EF4444':'#1F2937'} fontFamily="monospace">
            {display}
          </text>
          {done&&<text x={130} y={172} textAnchor="middle" fontSize={20} fill="#EF4444" fontWeight={700}>หมดเวลา!</text>}
        </svg>
      ):(
        <div className={`w-64 h-64 rounded-full flex items-center justify-center border-8 transition-colors ${running?'border-teal-400':'border-gray-200'}`}>
          <span className="text-5xl font-black text-gray-800" style={{fontFamily:'monospace'}}>{display}</span>
        </div>
      )}

      {/* Input (countdown only, before start) */}
      {mode==='countdown'&&!started&&(
        <>
          <div className="flex items-end gap-3 text-3xl font-black">
            <div className="flex flex-col items-center gap-1">
              <button onClick={()=>setMins(m=>Math.min(99,m+1))} className="text-gray-300 hover:text-gray-500 text-xl leading-none">▲</button>
              <input type="number" min={0} max={99} value={mins}
                onChange={e=>setMins(Math.max(0,Math.min(99,parseInt(e.target.value)||0)))}
                className="w-16 text-center border-b-2 border-gray-300 focus:border-teal-500 outline-none bg-transparent"/>
              <button onClick={()=>setMins(m=>Math.max(0,m-1))} className="text-gray-300 hover:text-gray-500 text-xl leading-none">▼</button>
              <span className="text-xs text-gray-400 font-normal mt-0.5">นาที</span>
            </div>
            <span className="text-gray-300 mb-7">:</span>
            <div className="flex flex-col items-center gap-1">
              <button onClick={()=>setSecs(s=>Math.min(59,s+1))} className="text-gray-300 hover:text-gray-500 text-xl leading-none">▲</button>
              <input type="number" min={0} max={59} value={secs}
                onChange={e=>setSecs(Math.max(0,Math.min(59,parseInt(e.target.value)||0)))}
                className="w-16 text-center border-b-2 border-gray-300 focus:border-teal-500 outline-none bg-transparent"/>
              <button onClick={()=>setSecs(s=>Math.max(0,s-1))} className="text-gray-300 hover:text-gray-500 text-xl leading-none">▼</button>
              <span className="text-xs text-gray-400 font-normal mt-0.5">วินาที</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {[1,2,3,5,10,15].map(m=>(
              <button key={m} onClick={()=>{setMins(m);setSecs(0);}}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors">
                {m} นาที
              </button>
            ))}
          </div>
        </>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!running&&!started&&(
          <button onClick={()=>mode==='countdown'?startCountdown():startStopwatch()}
            className="px-10 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg rounded-2xl shadow transition-all active:scale-95">
            ▶ เริ่ม
          </button>
        )}
        {running&&(
          <button onClick={pause}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow transition-all active:scale-95">
            ⏸ หยุด
          </button>
        )}
        {!running&&started&&!done&&(
          <button onClick={resume}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow transition-all active:scale-95">
            ▶ ต่อ
          </button>
        )}
        {started&&(
          <button onClick={reset}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all active:scale-95">
            🔄 รีเซ็ต
          </button>
        )}
      </div>
    </div>
  );
}

// ── Scoreboard ────────────────────────────────────────────────────────────────

interface Team{name:string;score:number;colorIdx:number;}

function ScoreboardPanel(){
  const [numTeams,setNumTeams]=useState(2);
  const [teams,setTeams]=useState<Team[]>([]);
  const [started,setStarted]=useState(false);
  const [flash,setFlash]=useState<number|null>(null);

  function startGame(){
    setTeams(Array.from({length:numTeams},(_,i)=>({name:TEAM_COLORS[i].name,score:0,colorIdx:i})));
    setStarted(true);
  }

  function addScore(i:number,delta:number){
    setTeams(prev=>prev.map((t,idx)=>idx===i?{...t,score:Math.max(0,t.score+delta)}:t));
    if(delta>0){setFlash(i);setTimeout(()=>setFlash(null),500);}
  }

  const maxScore=Math.max(...teams.map(t=>t.score),1);
  const sorted=[...teams].sort((a,b)=>b.score-a.score);

  if(!started) return(
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">จำนวนทีม</label>
        <button onClick={()=>setNumTeams(n=>Math.max(2,n-1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold transition-colors">−</button>
        <span className="w-8 text-center font-bold text-lg">{numTeams}</span>
        <button onClick={()=>setNumTeams(n=>Math.min(6,n+1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold transition-colors">+</button>
      </div>
      <button onClick={startGame}
        className="px-10 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg rounded-2xl shadow transition-all active:scale-95">
        🏆 เริ่มให้คะแนน
      </button>
    </div>
  );

  return(
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {teams.map((team,i)=>{
          const c=TEAM_COLORS[team.colorIdx%TEAM_COLORS.length];
          return(
            <div key={i} style={{background:flash===i?c.dark:c.light,borderColor:c.dark}}
              className="border-2 rounded-2xl p-4 transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 mb-2">
                <input value={team.name} onChange={e=>setTeams(prev=>prev.map((t,idx)=>idx===i?{...t,name:e.target.value}:t))}
                  style={{color:flash===i?'white':c.text}}
                  className="font-bold text-base bg-transparent border-none outline-none flex-1 transition-colors"/>
                <span style={{color:flash===i?'white':c.text}} className="text-4xl font-black transition-colors">{team.score}</span>
              </div>
              <div className="w-full h-2.5 bg-white/60 rounded-full mb-3">
                <div style={{width:`${(team.score/maxScore)*100}%`,background:c.dark}}
                  className="h-full rounded-full transition-all duration-500"/>
              </div>
              <div className="flex gap-2">
                {[1,5].map(d=>(
                  <button key={d} onClick={()=>addScore(i,d)} style={{background:c.dark}}
                    className="flex-1 text-white font-bold py-2 rounded-xl text-sm active:scale-95 transition-transform">
                    +{d}
                  </button>
                ))}
                <button onClick={()=>addScore(i,-1)} style={{borderColor:c.dark,color:c.text}}
                  className="flex-1 bg-white border-2 font-bold py-2 rounded-xl text-sm active:scale-95 transition-transform">
                  −1
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      {teams.some(t=>t.score>0)&&(
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-500 mb-2 tracking-widest">LEADERBOARD</p>
          {sorted.map((t,rank)=>{
            const c=TEAM_COLORS[t.colorIdx%TEAM_COLORS.length];
            return(
              <div key={t.name} className="flex items-center gap-3 py-1.5">
                <span className="text-sm font-bold text-gray-400 w-5">{rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':rank+1}</span>
                <div style={{background:c.dark}} className="w-3 h-3 rounded-full"/>
                <span className="flex-1 text-sm font-medium text-gray-700">{t.name}</span>
                <span className="font-black text-gray-800">{t.score}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={()=>setTeams(prev=>prev.map(t=>({...t,score:0})))}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm transition-colors">
          🔄 รีเซ็ตคะแนน
        </button>
        <button onClick={()=>{setStarted(false);setTeams([]);}}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm transition-colors">
          ← เริ่มใหม่
        </button>
      </div>
    </div>
  );
}

// ── Dice ──────────────────────────────────────────────────────────────────────

function Die({value,rolling}:{value:number;rolling:boolean}){
  const dots=DICE_DOTS[value]??[];
  return(
    <div style={{width:100,height:100,borderRadius:18,background:'white',
      boxShadow:'0 4px 20px rgba(0,0,0,0.15)',border:'2px solid #E5E7EB',
      position:'relative',transform:rolling?'scale(0.95)':'scale(1)',transition:'transform 0.08s'}}>
      {dots.map(([x,y],i)=>(
        <div key={i} style={{position:'absolute',left:`${x}%`,top:`${y}%`,
          transform:'translate(-50%,-50%)',width:18,height:18,
          borderRadius:'50%',background:'#1F2937'}}/>
      ))}
    </div>
  );
}

function DicePanel(){
  const [numDice,setNumDice]=useState(1);
  const [values,setValues]=useState([1,1,1,1]);
  const [rolling,setRolling]=useState(false);

  function roll(){
    if(rolling) return;
    setRolling(true);
    let tick=0;
    const max=14;
    const id=setInterval(()=>{
      setValues(Array.from({length:4},()=>Math.ceil(Math.random()*6)));
      tick++;
      if(tick>=max){
        clearInterval(id);
        setValues(Array.from({length:4},()=>Math.ceil(Math.random()*6)));
        setRolling(false);
      }
    },70);
  }

  const total=values.slice(0,numDice).reduce((a,b)=>a+b,0);

  return(
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">จำนวนลูกเต๋า</label>
        {[1,2,3,4].map(n=>(
          <button key={n} onClick={()=>setNumDice(n)}
            className={`w-9 h-9 rounded-full font-bold text-sm transition-colors ${numDice===n?'bg-teal-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {n}
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        {Array.from({length:numDice},(_,i)=>(
          <Die key={i} value={values[i]} rolling={rolling}/>
        ))}
      </div>

      {numDice>1&&!rolling&&(
        <p className="text-base font-semibold text-gray-500">
          รวม: <span className="text-4xl font-black text-teal-600">{total}</span>
        </p>
      )}

      <button onClick={roll} disabled={rolling}
        className="px-10 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95">
        {rolling?'🎲 กำลังทอย…':'🎲 ทอยลูกเต๋า!'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClassroomToolsPage(){
  const [students,setStudents]=useState<Student[]>([]);
  const [loading,setLoading]=useState(true);
  const [activeTool,setActiveTool]=useState<Tool>('wheel');
  const [selectedGroups,setSelectedGroups]=useState<string[]>([]);

  useEffect(()=>{
    db().from('students').select('*').eq('is_active',true).order('nickname')
      .then(({data})=>{setStudents((data??[]) as Student[]);setLoading(false);});
  },[]);

  const groupKeys=[...new Set(students.map(s=>s.group_key))].filter(Boolean).sort();
  const filtered=selectedGroups.length>0?students.filter(s=>selectedGroups.includes(s.group_key)):students;

  if(loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด…</div>;

  return(
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600 text-lg">←</a>
            <h1 className="text-lg font-bold text-gray-800">🎮 เครื่องมือสอน</h1>
            <span className="text-xs text-gray-400 ml-1">({filtered.length} คน)</span>
          </div>

          {groupKeys.length>1&&(
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs text-gray-400">กลุ่ม:</span>
              {groupKeys.map(g=>(
                <button key={g} onClick={()=>setSelectedGroups(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev,g])}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedGroups.includes(g)?'bg-teal-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {GROUP_LABELS[g]??g}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TOOLS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTool(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${activeTool===t.id?'bg-teal-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-sm p-6 min-h-[400px]">
          {activeTool==='wheel'      &&<SpinWheel students={filtered}/>}
          {activeTool==='groups'     &&<GroupMaker students={filtered}/>}
          {activeTool==='timer'      &&<TimerPanel/>}
          {activeTool==='scoreboard' &&<ScoreboardPanel/>}
          {activeTool==='dice'       &&<DicePanel/>}
        </div>
      </div>
    </main>
  );
}
