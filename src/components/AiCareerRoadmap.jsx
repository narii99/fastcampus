import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Terminal, Brain, Target, Sparkles, ChevronDown, Bot, User, Check, Loader2 } from 'lucide-react';

// --- 유틸리티 및 상수 ---
const COLOR_BG = '#0b0c15'; 
const COLOR_ME = '#3b82f6'; 
const COLOR_GOAL = '#ef4444'; 
const COLOR_PATH = '#eab308';
const COLOR_GAP = '#64748b'; 

const lerp = (start, end, factor) => start + (end - start) * factor;

// --- Gemini API 호출 함수 ---
const generateGeminiRoadmap = async (skills, goal) => {
  const apiKey = ""; // 런타임 환경에서 주입됨
  const prompt = `
    User Skills: ${skills.join(', ')}
    Career Goal: ${goal}
    
    Create a 3-step learning roadmap to bridge the gap. 
    Return ONLY a JSON object with this format (no markdown):
    {
      "steps": [
        {"short_title": "Step 1 Title (Max 10 chars)", "description": "1 sentence detail"},
        {"short_title": "Step 2 Title (Max 10 chars)", "description": "1 sentence detail"},
        {"short_title": "Step 3 Title (Max 10 chars)", "description": "1 sentence detail"}
      ],
      "message": "Encouraging message in Korean (Max 50 chars)"
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 폴백 데이터 (에러 발생 시)
    return {
      steps: [
        { short_title: "기초 다지기", description: "기본 문법과 핵심 개념을 복습합니다." },
        { short_title: "프레임워크", description: "관련 라이브러리와 도구를 학습합니다." },
        { short_title: "프로젝트", description: "실전 프로젝트를 통해 포트폴리오를 만듭니다." }
      ],
      message: "AI 연결에 실패했지만, 성장을 응원합니다!"
    };
  }
};

export default function AiCareerRoadmap() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activeScene, setActiveScene] = useState(0);
  const [isGsapLoaded, setIsGsapLoaded] = useState(false);
  
  // 사용자 선택 상태
  const [mySkills, setMySkills] = useState([]);
  const [targetGoal, setTargetGoal] = useState("");
  const [aiData, setAiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 선택 가능한 옵션들
  const skillOptions = ["JavaScript", "React", "Python", "Java", "HTML/CSS", "SQL"];
  const goalOptions = ["Frontend Dev", "Backend Dev", "AI Engineer", "Data Scientist"];

  // 데이터 모델 (Ref로 관리하여 애니메이션 루프 성능 최적화)
  const nodesRef = useRef([
    { id: 'me', label: 'Me', type: 'core', x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, size: 30, color: COLOR_ME, alpha: 1 },
    { id: 'goal', label: 'Goal', type: 'goal', x: 0.5, y: -0.5, targetX: 0.8, targetY: 0.2, size: 40, color: COLOR_GOAL, alpha: 0 },
  ]);

  const linksRef = useRef([
    { source: 'me', target: 'goal', style: 'analysis', color: COLOR_GAP, alpha: 0, width: 0.5 },
  ]);

  const animState = useRef({
    progress: 0,
    time: 0,
    dashOffset: 0,
    sceneIndex: 0,
  });

  // --- GSAP 동적 로드 (미리보기 환경 수정) ---
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js")
    ]).then(() => {
      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        setIsGsapLoaded(true);
      }
    }).catch(err => console.error("GSAP loading failed", err));
  }, []);

  // --- 사용자 인터랙션 핸들러 ---
  const toggleSkill = (skill) => {
    setMySkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleGoalSelect = (goal) => {
    setTargetGoal(goal);
  };

  const startAnalysis = async () => {
    if (mySkills.length === 0 || !targetGoal) return;
    
    setIsLoading(true);
    
    const result = await generateGeminiRoadmap(mySkills, targetGoal);
    setAiData(result);
    
    updateCanvasNodes(result);
    setIsLoading(false);
  };

  // AI 데이터 기반 노드 업데이트
  const updateCanvasNodes = (data) => {
    const newNodes = [...nodesRef.current];
    const newLinks = [...linksRef.current];

    const goalNode = newNodes.find(n => n.id === 'goal');
    if (goalNode) goalNode.label = targetGoal;

    data.steps.forEach((step, index) => {
      const id = `step${index + 1}`;
      if (!newNodes.find(n => n.id === id)) {
        newNodes.push({
          id,
          label: step.short_title,
          type: 'step',
          x: 0.5,
          y: 0.5,
          targetX: 0.5 + (index * 0.1),
          targetY: 0.35 - (index * 0.05),
          size: 15,
          color: COLOR_PATH,
          alpha: 0
        });

        const source = index === 0 ? 'me' : `step${index}`;
        
        newLinks.push({
          source,
          target: id,
          style: 'dashed',
          color: COLOR_GAP,
          alpha: 0,
          width: 1
        });

        if (index === data.steps.length - 1) {
          newLinks.push({
            source: id,
            target: 'goal',
            style: 'dashed',
            color: COLOR_GAP,
            alpha: 0,
            width: 1
          });
        }
      }
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  };

  // 스킬 선택 시 노드 업데이트
  useEffect(() => {
    const currentNodes = nodesRef.current.filter(n => n.type !== 'skill');
    const currentLinks = linksRef.current.filter(l => !l.source.startsWith('me') || l.target === 'goal');

    mySkills.forEach((skill, idx) => {
      const id = `skill_${idx}`;
      currentNodes.push({
        id,
        label: skill,
        type: 'skill',
        x: 0.5, y: 0.5,
        targetX: 0.35 + (Math.random() * 0.3),
        targetY: 0.35 + (Math.random() * 0.3),
        size: 15,
        color: COLOR_ME,
        alpha: 1
      });
      currentLinks.push({
        source: 'me',
        target: id,
        style: 'solid',
        color: COLOR_ME,
        alpha: 0.6
      });
    });

    nodesRef.current = currentNodes;
    linksRef.current = currentLinks;
  }, [mySkills]);


  // --- 캔버스 렌더링 (애니메이션 루프) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const p = animState.current.progress;
      
      animState.current.time += 0.01;
      animState.current.dashOffset -= 0.5;

      nodesRef.current.forEach(node => {
        const floatY = Math.sin(animState.current.time + node.id.length) * 5;
        const floatX = Math.cos(animState.current.time * 0.5 + node.id.length) * 3;

        let targetX = node.targetX * width;
        let targetY = node.targetY * height;
        let targetAlpha = node.alpha;

        if (node.type === 'goal') {
          targetAlpha = p > 0.15 ? Math.min((p - 0.15) * 5, 1) : 0;
          if(node.label === 'Goal' && targetGoal) node.label = targetGoal;
        }
        
        if (node.id === 'me' && p > 0.2) {
          targetX = 0.2 * width;
        }

        if (node.type === 'skill') {
             if (p > 0.2) {
                 targetX = (0.2 * width) + (node.targetX - 0.5) * width; 
             }
        }

        if (node.type === 'step') {
          targetAlpha = p > 0.75 ? Math.min((p - 0.75) * 8, 1) : 0;
          if (p < 0.75) {
             targetX = width * 0.2; 
             targetY = height * 0.5;
          } else {
             const idx = parseInt(node.id.replace('step', '')) - 1;
             targetX = width * 0.5 + (idx * 0.15 * width); 
             targetY = height * 0.4 + (idx % 2 === 0 ? -50 : 50);
          }
        }

        node.currentX = lerp(node.currentX || targetX, targetX, 0.05) + floatX;
        node.currentY = lerp(node.currentY || targetY, targetY, 0.05) + floatY;
        node.currentAlpha = lerp(node.currentAlpha || 0, targetAlpha, 0.1);
        
        if (node.currentAlpha > 0.01) {
          ctx.beginPath();
          ctx.arc(node.currentX, node.currentY, node.size, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.globalAlpha = node.currentAlpha;
          ctx.shadowBlur = 15;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${node.type === 'core' || node.type === 'goal' ? '14px' : '12px'} Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, node.currentX, node.currentY + node.size + 15);
          ctx.globalAlpha = 1;
        }
      });

      linksRef.current.forEach(link => {
        const sourceNode = nodesRef.current.find(n => n.id === link.source);
        const targetNode = nodesRef.current.find(n => n.id === link.target);

        if (sourceNode && targetNode && sourceNode.currentAlpha > 0 && targetNode.currentAlpha > 0) {
          let linkAlpha = link.alpha;
          let linkColor = link.color;
          let linkWidth = link.width || 1;
          let isDashed = false;

          if (link.style === 'analysis') {
            linkAlpha = (p > 0.4 && p < 0.7) ? 0.3 : 0;
            isDashed = true;
          }
          if (link.style === 'dashed') {
            if (p > 0.45) linkAlpha = Math.min((p - 0.45) * 4, 1);
            if (p > 0.8) {
              linkColor = COLOR_PATH;
              isDashed = false; 
              linkWidth = 3;
            } else {
              isDashed = true;
            }
          }

          if (linkAlpha > 0.01) {
            ctx.beginPath();
            ctx.moveTo(sourceNode.currentX, sourceNode.currentY);
            ctx.lineTo(targetNode.currentX, targetNode.currentY);
            ctx.strokeStyle = linkColor;
            ctx.lineWidth = linkWidth;
            ctx.globalAlpha = linkAlpha;
            
            if (isDashed) {
              ctx.setLineDash([5, 5]);
              ctx.lineDashOffset = animState.current.dashOffset;
            } else {
              ctx.setLineDash([]);
            }

            if (p > 0.8 && link.style === 'dashed') {
               ctx.shadowBlur = 10;
               ctx.shadowColor = COLOR_PATH;
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, [targetGoal]);

  // --- ScrollTrigger 설정 ---
  useEffect(() => {
    if (!isGsapLoaded) return;

    // window.gsap을 사용 (CDN 로드 호환)
    const tl = window.gsap.timeline({
      scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
              animState.current.progress = self.progress;
              const newScene = Math.min(Math.floor(self.progress * 4), 3);
              if (newScene !== animState.current.sceneIndex) {
                  animState.current.sceneIndex = newScene;
                  setActiveScene(newScene);
              }
          }
      }
    });
    tl.to({}, { duration: 1 });

    return () => {
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach(t => t.kill());
      }
    };
  }, [isGsapLoaded]);

  return (
    <div className="relative bg-black font-sans text-white overflow-x-hidden">
      {/* 1. 배경 Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
      />

      {/* 2. 스크롤 컨텐츠 */}
      <div ref={containerRef} className="relative z-10 w-full">
        
        {/* 섹션 1: 스킬 선택 */}
        <Section sceneIndex={0} activeScene={activeScene}>
            <div className="flex flex-col items-center gap-6 max-w-2xl w-full">
                <ChatBubble 
                  icon={<Bot size={24} className="text-blue-400" />} 
                  name="AI Coach"
                  message="안녕하세요! 현재 보유하고 계신 기술 스택을 선택해주세요."
                />
                <div className="grid grid-cols-3 gap-3 w-full animate-fade-in-up">
                    {skillOptions.map(skill => (
                        <button 
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                mySkills.includes(skill) 
                                ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            <span className="font-medium">{skill}</span>
                            {mySkills.includes(skill) && <Check size={16} className="text-blue-400" />}
                        </button>
                    ))}
                </div>
                <div className="mt-8 flex justify-center animate-bounce opacity-50"><ChevronDown /></div>
            </div>
        </Section>

        {/* 섹션 2: 목표 선택 */}
        <Section sceneIndex={1} activeScene={activeScene}>
            <div className="flex flex-col items-center gap-6 max-w-2xl w-full">
                <ChatBubble 
                    icon={<Bot size={24} className="text-blue-400" />} 
                    name="AI Coach"
                    message="멋진 스킬셋이네요! 이제 목표로 하는 커리어를 선택해주세요."
                />
                <div className="grid grid-cols-2 gap-4 w-full">
                    {goalOptions.map(goal => (
                        <button 
                            key={goal}
                            onClick={() => handleGoalSelect(goal)}
                            className={`p-6 rounded-xl border text-left transition-all ${
                                targetGoal === goal 
                                ? 'bg-red-600/30 border-red-500 text-white shadow-lg shadow-red-500/20' 
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            <div className="font-bold text-lg mb-1">{goal}</div>
                            <div className="text-xs opacity-70">미래의 나의 모습</div>
                        </button>
                    ))}
                </div>
                {targetGoal && (
                    <div className="text-center mt-4 text-emerald-400 font-bold animate-pulse">
                        스크롤을 내려 AI 분석을 시작하세요 ↓
                    </div>
                )}
            </div>
        </Section>

        {/* 섹션 3: Gemini 분석 */}
        <Section sceneIndex={2} activeScene={activeScene}>
            <div className="flex flex-col items-center gap-6">
                <ChatBubble 
                  icon={<Brain size={24} className="text-purple-400 animate-pulse" />} 
                  name="Gemini AI"
                  message={isLoading ? "Gemini가 당신의 스킬과 목표를 분석하여 최적의 커리큘럼을 생성 중입니다..." : aiData ? "분석이 완료되었습니다! 아래에서 로드맵을 확인하세요." : "분석을 시작하려면 버튼을 눌러주세요."}
                />
                
                {!aiData && !isLoading && (
                    <button 
                        onClick={startAnalysis}
                        disabled={!targetGoal || mySkills.length === 0}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        AI 로드맵 생성하기
                    </button>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center gap-2 text-purple-300">
                        <Loader2 className="animate-spin" size={40} />
                        <span className="text-sm font-mono">GENERATING CURRICULUM...</span>
                    </div>
                )}
            </div>
        </Section>

        {/* 섹션 4: 결과 */}
        <Section sceneIndex={3} activeScene={activeScene}>
             <div className="flex flex-col items-center gap-6 max-w-2xl w-full">
                <ChatBubble 
                  icon={<Sparkles size={24} className="text-yellow-400" />} 
                  name="AI Coach"
                  message={aiData?.message || "로드맵을 확인해보세요!"}
                  highlight
                />
                
                {/* 텍스트 결과 카드 */}
                {aiData && (
                    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4 border-b border-slate-700 pb-2">
                           🚀 {targetGoal} 로드맵
                        </h3>
                        <div className="space-y-4">
                            {aiData.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{step.short_title}</div>
                                        <div className="text-sm text-slate-400">{step.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="h-20"></div> {/* 하단 여백 */}
             </div>
        </Section>

        <div className="h-[50vh]"></div>
      </div>
      
      {/* 인디케이터 */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-700 text-slate-400 text-sm flex gap-4">
           {['Skills', 'Goal', 'Analyze', 'Result'].map((step, idx) => (
               <React.Fragment key={idx}>
                   <span className={activeScene >= idx ? "text-blue-400 font-bold transition-colors" : "transition-colors"}>{step}</span>
                   {idx < 3 && <span className="text-slate-600">→</span>}
               </React.Fragment>
           ))}
        </div>
      </div>
    </div>
  );
}

// 섹션 래퍼 컴포넌트
function Section({ children, sceneIndex, activeScene }) {
    return (
        <section className="h-screen flex items-center justify-center relative px-4">
          <div className={`transition-all duration-700 transform w-full flex justify-center ${activeScene === sceneIndex ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-10 blur-sm pointer-events-none'}`}>
            {children}
          </div>
        </section>
    );
}

function ChatBubble({ icon, name, message, isUser = false, highlight = false }) {
  return (
    <div className={`flex gap-4 items-start max-w-md w-full ${isUser ? 'flex-row-reverse text-right' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-emerald-900/50' : 'bg-slate-800'}`}>
        {icon}
      </div>
      <div className={`p-4 rounded-2xl border backdrop-blur-sm shadow-xl w-full ${
        highlight 
        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/50' 
        : isUser 
          ? 'bg-emerald-900/30 border-emerald-700/50' 
          : 'bg-slate-900/60 border-slate-700'
      }`}>
        <div className={`text-xs font-bold mb-1 ${isUser ? 'text-emerald-400' : 'text-slate-400'}`}>{name}</div>
        <p className="text-slate-200 leading-relaxed text-base">{message}</p>
      </div>
    </div>
  );
}