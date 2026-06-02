import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

// Load curriculum data dynamically
const modules = import.meta.glob('./data/day*.json', { eager: true });
const bootCampCurriculum = {};
for (const path in modules) {
    const dayMatch = path.match(/day(\d+)\.json/);
    if (dayMatch) {
        bootCampCurriculum[dayMatch[1]] = modules[path].default || modules[path];
    }
}

const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <div key={i} className="mb-1.5 last:mb-0 leading-relaxed">
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-bold text-opacity-100">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </div>
        );
    });
};

function App() {
    // State: Bootcamp tracking
    const [selectedDay, setSelectedDay] = useState(1);
    const [completedDays, setCompletedDays] = useState(() => {
        const saved = localStorage.getItem('de_b1_completed_days');
        return saved ? JSON.parse(saved) : [];
    });

    // Study tabs state
    const [activeTab, setActiveTab] = useState('bootcamp');

    // Interaction States
    const [isFlipped, setIsFlipped] = useState(false);

    // Pagination States for High-Intensity Mode
    const [dictationIndex, setDictationIndex] = useState(0);
    const [grammarIndex, setGrammarIndex] = useState(0);

    const [userTranscript, setUserTranscript] = useState('');
    const [listenSpeed, setListenSpeed] = useState(0.8);
    const [listeningResult, setListeningResult] = useState(null);
    const [showHint, setShowHint] = useState(false);

    // Audio states
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speechProgress, setSpeechProgress] = useState(0);
    const isDraggingRef = useRef(false);

    // Grammar States
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

    // Favorites state
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('de_b1_favorites');
        return saved ? JSON.parse(saved) : { vocab: [], dictation: [], grammar: [] };
    });

    useEffect(() => {
        localStorage.setItem('de_b1_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const isFavorite = (type, keyStr) => {
        const list = favorites[type] || [];
        return list.some(i => i.__key === keyStr);
    };

    const toggleFavorite = (type, item, keyStr) => {
        setFavorites(prev => {
            const list = prev[type] || [];
            const exists = list.some(i => i.__key === keyStr);
            if (exists) {
                return { ...prev, [type]: list.filter(i => i.__key !== keyStr) };
            } else {
                return { ...prev, [type]: [...list, { ...item, __key: keyStr }] };
            }
        });
    };

    const triggerSuccess = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch (e) { }

        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    // Audio synthesis helper
    const playAudio = (text, speed = 1.0, startIndex = 0) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            const textToSpeak = text.substring(startIndex);
            if (!textToSpeak.trim()) return;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'de-DE';
            utterance.rate = speed;

            utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); if (startIndex === 0) setSpeechProgress(0); };
            utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); setSpeechProgress(100); setTimeout(() => setSpeechProgress(0), 1000); };
            utterance.onpause = () => setIsPaused(true);
            utterance.onresume = () => setIsPaused(false);
            utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); setSpeechProgress(0); };
            utterance.onboundary = (e) => {
                if (text && text.length > 0 && !isDraggingRef.current) {
                    const absoluteIndex = startIndex + e.charIndex;
                    const progress = Math.min((absoluteIndex / text.length) * 100, 100);
                    setSpeechProgress(progress);
                }
            };

            const voices = window.speechSynthesis.getVoices();
            const deVoices = voices.filter(voice => voice.lang.startsWith('de'));
            let bestVoice = deVoices.find(voice =>
                voice.name.includes('Premium') ||
                voice.name.includes('Enhanced') ||
                voice.name.includes('Natural')
            );
            if (!bestVoice && deVoices.length > 0) {
                bestVoice = deVoices[0];
            }
            if (bestVoice) {
                utterance.voice = bestVoice;
            }

            window.speechSynthesis.speak(utterance);
        } else {
            alert("您的浏览器不支持语音功能，推荐使用 Chrome/Edge。");
        }
    };

    // Audio test
    const handleSpeechTest = () => {
        playAudio("Bereit für die dreißig Tage B1 Challenge? Los geht's!", 0.9);
    };

    const togglePauseResume = () => {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
            }
        }
    };

    // Save completed days to localStorage
    useEffect(() => {
        localStorage.setItem('de_b1_completed_days', JSON.stringify(completedDays));
    }, [completedDays]);

    // Track state reset when Day changes
    useEffect(() => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeechProgress(0);
        setIsFlipped(false);
        setUserTranscript('');
        setListeningResult(null);
        setShowHint(false);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setDictationIndex(0);
        setGrammarIndex(0);
    }, [selectedDay]);

    // Data extraction & Backward Compatibility for Days 2-30
    const dayData = bootCampCurriculum[selectedDay] || bootCampCurriculum[1];
    const dictationArray = Array.isArray(dayData.dictations) ? dayData.dictations : (dayData.dictation ? [dayData.dictation] : []);
    const grammarArray = Array.isArray(dayData.grammars) ? dayData.grammars : (dayData.grammar ? [dayData.grammar] : []);

    const currentDictation = dictationArray[dictationIndex] || {};
    const currentGrammar = grammarArray[grammarIndex] || {};
    const currentReading = dayData.reading || null;

    // Mark a Day complete
    const toggleDayComplete = (day) => {
        if (completedDays.includes(day)) {
            setCompletedDays(completedDays.filter(d => d !== day));
        } else {
            setCompletedDays([...completedDays, day]);
        }
    };

    // Listening verify logic
    const verifyDictation = () => {
        if (!currentDictation.text) return;
        const target = currentDictation.text
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
            .toLowerCase()
            .trim();
        const user = userTranscript
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
            .toLowerCase()
            .trim();

        if (target === user) {
            setListeningResult('correct');
            triggerSuccess();
        } else {
            const targetWords = target.split(/\s+/);
            const userWords = user.split(/\s+/);
            const matches = userWords.filter(word => targetWords.includes(word));
            if (matches.length > targetWords.length * 0.5) {
                setListeningResult('partial');
            } else {
                setListeningResult('incorrect');
            }
        }
    };

    // Navigation helpers
    const handlePrevDay = () => {
        if (selectedDay > 1) setSelectedDay(selectedDay - 1);
    };

    const handleNextDay = () => {
        if (selectedDay < 30) setSelectedDay(selectedDay + 1);
    };

    // High-Intensity Pagination Handlers
    const handleNextDictation = () => {
        if (dictationIndex < dictationArray.length - 1) {
            setDictationIndex(prev => prev + 1);
            setUserTranscript('');
            setListeningResult(null);
            setShowHint(false);
        }
    };
    const handlePrevDictation = () => {
        if (dictationIndex > 0) {
            setDictationIndex(prev => prev - 1);
            setUserTranscript('');
            setListeningResult(null);
            setShowHint(false);
        }
    };

    const handleNextGrammar = () => {
        if (grammarIndex < grammarArray.length - 1) {
            setGrammarIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswerSubmitted(false);
        }
    };
    const handlePrevGrammar = () => {
        if (grammarIndex > 0) {
            setGrammarIndex(prev => prev - 1);
            setSelectedAnswer(null);
            setIsAnswerSubmitted(false);
        }
    };

    // Helper to get week category
    const getWeekLabel = (day) => {
        if (day <= 7) return "第一阶段：A2-B1 词汇时态跨越";
        if (day <= 15) return "第二阶段：B1 五大逻辑从句";
        if (day <= 22) return "第三阶段：B1 进阶关系句与形容词变化";
        return "第四阶段：B1 终结虚拟式、被动语态与实战模版";
    };

    // Calculate metrics
    const completionPercentage = Math.round((completedDays.length / 30) * 100);

    return (
        <div className="min-h-screen flex flex-col bg-slate-550">
            {/* Header Banner */}
            <header className="bg-gradient-to-r from-red-600 via-amber-500 to-black text-white py-6 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <span className="text-4xl">🦅</span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                Deutsch B1 30-Day Boot Camp
                            </h1>
                            <p className="text-xs text-amber-100 font-medium">
                                专为 A1.2 - A2 基础学习者设计的高强度冲刺复习画布
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleSpeechTest}
                            className="bg-white/20 hover:bg-white/30 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1.5"
                        >
                            <span className="inline-block w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
                            测试系统真人女音 (DE)
                        </button>
                        <span className="bg-black/40 text-amber-300 font-bold px-3 py-1 rounded-full text-xs">
                            冲刺进度：{completionPercentage}%
                        </span>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-6 py-3.5" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('bootcamp')}
                            className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-lg transition ${activeTab === 'bootcamp' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            📅 30天冲刺特训大纲
                        </button>
                        <button
                            onClick={() => setActiveTab('dayReview')}
                            className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-lg transition ${activeTab === 'dayReview' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            📖 Day {selectedDay} 核心精练营
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-lg transition ${activeTab === 'stats' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            📊 我的特训分析
                        </button>
                        <button
                            onClick={() => setActiveTab('favorites')}
                            className={`flex items-center gap-2 px-3 py-2 font-semibold text-sm rounded-lg transition ${activeTab === 'favorites' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            ⭐ 生词错题本
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                { }
                {activeTab === 'bootcamp' && (
                    <div className="space-y-8">
                        {/* Introduction Banner */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>🎯</span> 30天高强度备考路线
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                                    点击下方对应天数，可以直接加载当天的专属词汇、听力实验室与核心语法挑战。建议每天专攻一格，并在掌握后勾选“标记完成”。
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center w-full md:w-auto">
                                <span className="text-2xl font-black text-amber-500 block">{completedDays.length} / 30</span>
                                <span className="text-xs text-gray-400 font-medium">已攻克天数</span>
                            </div>
                        </div>

                        {/* Interactive Grid of 30 Days */}
                        <div className="space-y-6">
                            {/* Week 1 */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-4">
                                    第 1 - 7 天：A2-B1 词汇时态跨越桥梁 (Perfekt, Präteritum, 介词)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                    {Array.from({ length: 7 }, (_, i) => i + 1).map(day => (
                                        <div
                                            key={day}
                                            onClick={() => { setSelectedDay(day); setActiveTab('dayReview'); }}
                                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${selectedDay === day ? 'border-amber-500 bg-amber-50' :
                                                completedDays.includes(day) ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-xs text-gray-400 block font-bold">DAY</span>
                                            <span className="text-2xl font-black text-slate-800">{day}</span>
                                            <span className="text-[10px] text-gray-500 truncate block mt-1" title={bootCampCurriculum[day].title}>
                                                {bootCampCurriculum[day].title.split(" ")[0]}
                                            </span>
                                            {completedDays.includes(day) && (
                                                <span className="text-xs block text-green-600 mt-1">✓ 已通关</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Week 2 */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-4">
                                    第 8 - 15 天：B1 绝杀主从句 (weil, obwohl, damit, dass, als, ob)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                                    {Array.from({ length: 8 }, (_, i) => i + 8).map(day => (
                                        <div
                                            key={day}
                                            onClick={() => { setSelectedDay(day); setActiveTab('dayReview'); }}
                                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${selectedDay === day ? 'border-amber-500 bg-amber-50' :
                                                completedDays.includes(day) ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-xs text-gray-400 block font-bold">DAY</span>
                                            <span className="text-2xl font-black text-slate-800">{day}</span>
                                            <span className="text-[10px] text-gray-500 truncate block mt-1" title={bootCampCurriculum[day].title}>
                                                {bootCampCurriculum[day].title.split(" ")[0]}
                                            </span>
                                            {completedDays.includes(day) && (
                                                <span className="text-xs block text-green-600 mt-1">✓ 已通关</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Week 3 */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-4">
                                    第 16 - 22 天：B1 进阶语法 (关系代词、形容词尾变化、被动语态)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                    {Array.from({ length: 7 }, (_, i) => i + 16).map(day => (
                                        <div
                                            key={day}
                                            onClick={() => { setSelectedDay(day); setActiveTab('dayReview'); }}
                                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${selectedDay === day ? 'border-amber-500 bg-amber-50' :
                                                completedDays.includes(day) ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-xs text-gray-400 block font-bold">DAY</span>
                                            <span className="text-2xl font-black text-slate-800">{day}</span>
                                            <span className="text-[10px] text-gray-500 truncate block mt-1" title={bootCampCurriculum[day].title}>
                                                {bootCampCurriculum[day].title.split(" ")[0]}
                                            </span>
                                            {completedDays.includes(day) && (
                                                <span className="text-xs block text-green-600 mt-1">✓ 已通关</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Week 4 */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-600 mb-4">
                                    第 23 - 30 天：B1 终结者 (虚拟二式、第二格、口语写作实战模拟)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                                    {Array.from({ length: 8 }, (_, i) => i + 23).map(day => (
                                        <div
                                            key={day}
                                            onClick={() => { setSelectedDay(day); setActiveTab('dayReview'); }}
                                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${selectedDay === day ? 'border-amber-500 bg-amber-50' :
                                                completedDays.includes(day) ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-xs text-gray-400 block font-bold">DAY</span>
                                            <span className="text-2xl font-black text-slate-800">{day}</span>
                                            <span className="text-[10px] text-gray-500 truncate block mt-1" title={bootCampCurriculum[day].title}>
                                                {bootCampCurriculum[day].title.split(" ")[0]}
                                            </span>
                                            {completedDays.includes(day) && (
                                                <span className="text-xs block text-green-600 mt-1">✓ 已通关</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'dayReview' && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Daily Header Navigation */}
                        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                                    {getWeekLabel(selectedDay)}
                                </span>
                                <h2 className="text-2xl font-black flex items-center gap-2 mt-1">
                                    <span>⚡</span> Day {selectedDay}: {bootCampCurriculum[selectedDay].title}
                                </h2>
                                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-xl">
                                    <strong>今日学习重点：</strong> {bootCampCurriculum[selectedDay].focus}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                                <div className="flex gap-2 justify-between">
                                    <button
                                        onClick={handlePrevDay}
                                        disabled={selectedDay === 1}
                                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold px-3 py-2 rounded-lg text-xs flex-grow sm:flex-grow-0 transition"
                                    >
                                        ◀ 前一天
                                    </button>
                                    <button
                                        onClick={handleNextDay}
                                        disabled={selectedDay === 30}
                                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold px-3 py-2 rounded-lg text-xs flex-grow sm:flex-grow-0 transition"
                                    >
                                        后一天 ▶
                                    </button>
                                </div>
                                <button
                                    onClick={() => toggleDayComplete(selectedDay)}
                                    className={`px-4 py-2 rounded-lg font-bold text-xs transition ${completedDays.includes(selectedDay)
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-amber-500 hover:bg-amber-600 text-black'
                                        }`}
                                >
                                    {completedDays.includes(selectedDay) ? '✓ 已标记完成' : '⛳ 标记今日已掌握'}
                                </button>
                            </div>
                        </div>

                        {/* Tri-Fold Workout Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* SECTION A: VOCABULARY CARD */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div className="flex-grow flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                            <span>📓</span> 模块 1：高频考点词汇
                                        </h3>
                                        <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">共 {dayData.vocab.length} 词</span>
                                    </div>

                                    {/* Flashcards Box - Scrollable for massive amounts */}
                                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar flex-grow">
                                        {dayData.vocab.map((v, index) => (
                                            <div
                                                key={index}
                                                className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition duration-200"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${v.gender === 'der' ? 'bg-blue-100 text-blue-800' :
                                                            v.gender === 'die' ? 'bg-red-100 text-red-800' :
                                                                v.gender === 'das' ? 'bg-green-100 text-green-800' :
                                                                    v.gender.startsWith('verb') ? 'bg-indigo-100 text-indigo-800' :
                                                                        'bg-slate-200 text-slate-800'
                                                            }`}>
                                                            {v.gender}
                                                        </span>
                                                        <span className="text-xs text-slate-400 italic">({v.category})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => playAudio(v.word, 0.95)}
                                                        className="text-xs text-amber-600 hover:text-amber-700 font-bold flex-shrink-0"
                                                        title="发音"
                                                    >
                                                        🔊 发音
                                                    </button>
                                                    <button
                                                        onClick={() => toggleFavorite('vocab', v, v.word)}
                                                        className="text-lg flex-shrink-0 ml-2"
                                                        title="收藏"
                                                    >
                                                        {isFavorite('vocab', v.word) ? '⭐️' : '☆'}
                                                    </button>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-800 mt-2">{v.word}</h4>
                                                {v.plural && <p className="text-xs text-slate-400 mt-0.5">变化/复数：{v.plural}</p>}
                                                <p className="text-sm font-semibold text-amber-900 mt-1.5 border-t border-slate-200/50 pt-1.5">【义】{v.translation}</p>
                                                <div className="flex justify-between items-start mt-1">
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <p className="text-xs text-slate-600 italic leading-relaxed">
                                                            例："{v.example}"
                                                        </p>
                                                        {v.example_zh && (
                                                            <p className="text-[11px] text-slate-400 pl-3 border-l-2 border-slate-200">
                                                                中译：{v.example_zh}
                                                            </p>
                                                        )}
                                                        {v.grammar_hint && (
                                                            <p className="text-[10px] text-amber-600 font-medium bg-amber-50/50 p-1.5 rounded inline-block mt-0.5">
                                                                💡 语法：{v.grammar_hint}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => playAudio(v.example, 0.9)}
                                                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex-shrink-0 ml-2 mt-1"
                                                        title="例句发音"
                                                    >
                                                        🔊
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center flex-shrink-0">
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        💡 <strong>30天高效背诵诀窍</strong>：记忆德语名词必须连带<strong>词性(der/die/das)</strong>和<strong>复数</strong>。
                                    </p>
                                </div>
                            </div>

                            {/* SECTION B: LISTENING DICTATION */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                            <span>🎧</span> 模块 2：智能听写实验室
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">第 {dictationIndex + 1} / {dictationArray.length} 句</span>
                                            {currentDictation.text && (
                                                <button
                                                    onClick={() => toggleFavorite('dictation', currentDictation, currentDictation.text)}
                                                    className="text-lg"
                                                    title="收藏听写"
                                                >
                                                    {isFavorite('dictation', currentDictation.text) ? '⭐️' : '☆'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {dictationArray.length > 0 ? (
                                        <>
                                            {/* Audio Panel */}
                                            <div className="bg-slate-50 p-5 rounded-xl flex flex-col items-center justify-center space-y-4 border border-slate-100">
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => playAudio(currentDictation.text, listenSpeed)}
                                                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-full p-5 shadow-md transition-transform hover:scale-105 flex items-center justify-center w-16 h-16"
                                                        title="从头播放"
                                                    >
                                                        <span className="text-2xl">🔊</span>
                                                    </button>
                                                    <button
                                                        onClick={togglePauseResume}
                                                        disabled={!isSpeaking}
                                                        className={`rounded-full p-5 shadow-md transition-transform flex items-center justify-center w-16 h-16 ${!isSpeaking ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-amber-400 hover:bg-amber-500 text-white hover:scale-105'}`}
                                                        title={isPaused ? "继续" : "暂停"}
                                                    >
                                                        <span className="text-2xl">{isPaused ? "▶️" : "⏸️"}</span>
                                                    </button>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full max-w-xs pt-1 pb-1">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={isSpeaking || speechProgress === 100 ? speechProgress : 0}
                                                        onMouseDown={() => { isDraggingRef.current = true; }}
                                                        onTouchStart={() => { isDraggingRef.current = true; }}
                                                        onChange={(e) => {
                                                            setSpeechProgress(parseFloat(e.target.value));
                                                        }}
                                                        onMouseUp={(e) => {
                                                            isDraggingRef.current = false;
                                                            const percentage = parseFloat(e.target.value);
                                                            const text = currentDictation.text;
                                                            if (!text) return;
                                                            let startIndex = Math.floor(text.length * (percentage / 100));
                                                            while (startIndex > 0 && text[startIndex - 1] !== ' ') {
                                                                startIndex--;
                                                            }
                                                            playAudio(text, listenSpeed, startIndex);
                                                        }}
                                                        onTouchEnd={(e) => {
                                                            isDraggingRef.current = false;
                                                            const percentage = parseFloat(e.target.value);
                                                            const text = currentDictation.text;
                                                            if (!text) return;
                                                            let startIndex = Math.floor(text.length * (percentage / 100));
                                                            while (startIndex > 0 && text[startIndex - 1] !== ' ') {
                                                                startIndex--;
                                                            }
                                                            playAudio(text, listenSpeed, startIndex);
                                                        }}
                                                        className="w-full h-1.5 accent-amber-500 bg-slate-200 rounded-full cursor-pointer"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4 w-full max-w-xs">
                                                    <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">听写语速: {listenSpeed}x</label>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="1.2"
                                                        step="0.1"
                                                        value={listenSpeed}
                                                        onChange={(e) => setListenSpeed(parseFloat(e.target.value))}
                                                        className="w-full accent-amber-500 h-1"
                                                    />
                                                </div>
                                            </div>

                                            {/* Input Area */}
                                            <div className="space-y-3 mt-4">
                                                <label className="block text-xs font-bold text-slate-600">请听写出你听到的整句德语：</label>
                                                <textarea
                                                    rows="3"
                                                    value={userTranscript}
                                                    onChange={(e) => setUserTranscript(e.target.value)}
                                                    placeholder="在这里写下德语句子 (注意名词首字母大写和动词变位...)"
                                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                                                ></textarea>
                                            </div>

                                            {/* Verification Results */}
                                            {listeningResult && (
                                                <div className={`p-4 mt-3 rounded-xl text-xs leading-relaxed ${listeningResult === 'correct' ? 'bg-green-50 text-green-800 border border-green-200' :
                                                    listeningResult === 'partial' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                                        'bg-red-50 text-red-800 border border-red-200'
                                                    }`}>
                                                    <p className="font-bold text-sm mb-1">
                                                        {listeningResult === 'correct' ? '✅ 一字不差，完美!' :
                                                            listeningResult === 'partial' ? '⚠️ 拼写基本吻合，注意语法尾缀/字母拼写' : '❌ 再努力细听一次哦'}
                                                    </p>
                                                    <p className="mt-1 font-mono break-all font-semibold bg-white/70 p-2 rounded">
                                                        {currentDictation.text}
                                                    </p>
                                                    <p className="mt-1.5 text-[11px] text-gray-500">
                                                        <strong>中文翻译：</strong> {currentDictation.translation}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xs text-gray-500 text-center mt-10">今日暂无听力任务。</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-4 flex-shrink-0">
                                    <div className="flex justify-between items-center w-full">
                                        <button
                                            onClick={() => setShowHint(!showHint)}
                                            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 underline"
                                        >
                                            {showHint ? "隐藏核心语法提示" : "显示核心语法提示"}
                                        </button>
                                        <button
                                            onClick={verifyDictation}
                                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs transition"
                                        >
                                            验证句子拼写
                                        </button>
                                    </div>

                                    {/* Pagination Controls */}
                                    {dictationArray.length > 1 && (
                                        <div className="flex justify-between items-center mt-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                            <button onClick={handlePrevDictation} disabled={dictationIndex === 0} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30">◀ 上一句</button>
                                            <button onClick={handleNextDictation} disabled={dictationIndex === dictationArray.length - 1} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30">下一句 ▶</button>
                                        </div>
                                    )}

                                    {showHint && currentDictation.hint && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-900">
                                            {currentDictation.hint}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION C: GRAMMAR DRILL */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                            <span>🧩</span> 模块 3：高频考点突破
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">第 {grammarIndex + 1} / {grammarArray.length} 题</span>
                                            {currentGrammar.question && (
                                                <button
                                                    onClick={() => toggleFavorite('grammar', currentGrammar, currentGrammar.question)}
                                                    className="text-lg"
                                                    title="收藏语法题"
                                                >
                                                    {isFavorite('grammar', currentGrammar.question) ? '⭐️' : '☆'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {grammarArray.length > 0 ? (
                                        <>
                                            {/* Question Statement */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex justify-between items-center">
                                                    <span>今日语法挑战</span>
                                                    {isAnswerSubmitted && (
                                                        <button
                                                            onClick={() => playAudio(currentGrammar.question.replace('___', currentGrammar.correct), 0.9)}
                                                            className="text-[10px] text-amber-600 hover:text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded"
                                                            title="朗读完整原句"
                                                        >
                                                            🔊 朗读原句
                                                        </button>
                                                    )}
                                                </h4>
                                                <div className="text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {currentGrammar.question}
                                                </div>

                                                {/* Options */}
                                                <div className="grid grid-cols-1 gap-2 pt-2">
                                                    {currentGrammar.options.map((option, idx) => {
                                                        let btnStyle = "border-gray-200 hover:bg-slate-50 text-gray-700";
                                                        if (selectedAnswer === option) {
                                                            btnStyle = "border-amber-500 bg-amber-50 text-amber-900 font-bold";
                                                        }
                                                        if (isAnswerSubmitted) {
                                                            if (option === currentGrammar.correct) {
                                                                btnStyle = "border-green-500 bg-green-50 text-green-900 font-extrabold";
                                                            } else if (selectedAnswer === option) {
                                                                btnStyle = "border-red-400 bg-red-50 text-red-900";
                                                            } else {
                                                                btnStyle = "border-gray-100 text-gray-400";
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => { if (!isAnswerSubmitted) setSelectedAnswer(option); }}
                                                                disabled={isAnswerSubmitted}
                                                                className={`w-full text-left p-3 rounded-xl border-2 transition text-xs ${btnStyle}`}
                                                            >
                                                                {option}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Explanations */}
                                            {isAnswerSubmitted && (
                                                <div className="p-3 mt-4 rounded-xl bg-blue-50 text-blue-900 border border-blue-100 text-xs">
                                                    <p className="font-bold flex items-center gap-1">
                                                        <span>💡</span> 语法解析说：
                                                    </p>
                                                    <p className="mt-1 leading-relaxed text-[11px] text-blue-800 font-medium">
                                                        {currentGrammar.explanation}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xs text-gray-500 text-center mt-10">今日暂无语法考题。</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-6 flex-shrink-0">
                                    <div className="flex justify-end w-full">
                                        {!isAnswerSubmitted ? (
                                            <button
                                                onClick={() => {
                                                    setIsAnswerSubmitted(true);
                                                    if (selectedAnswer === currentGrammar.correct) {
                                                        triggerSuccess();
                                                    }
                                                }}
                                                disabled={selectedAnswer === null}
                                                className="bg-amber-500 disabled:opacity-50 hover:bg-amber-600 text-black font-bold py-1.5 px-4 rounded-lg text-xs transition"
                                            >
                                                提交答案
                                            </button>
                                        ) : (
                                            <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                                ✓ 已解析本题
                                            </span>
                                        )}
                                    </div>

                                    {/* Pagination Controls */}
                                    {grammarArray.length > 1 && (
                                        <div className="flex justify-between items-center mt-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                            <button onClick={handlePrevGrammar} disabled={grammarIndex === 0} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30">◀ 上一题</button>
                                            <button onClick={handleNextGrammar} disabled={grammarIndex === grammarArray.length - 1} className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30">下一题 ▶</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* SECTION D: READING COMPREHENSION */}
                        {currentReading && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                            <span>📖</span> 模块 4：阅读理解演练
                                        </h3>
                                    </div>
                                    <div className="space-y-4 text-sm text-slate-800">
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative group">
                                            <button
                                                onClick={() => playAudio(currentReading.text, 0.9)}
                                                className="absolute top-3 right-3 text-xs text-amber-600 hover:text-amber-700 font-bold bg-amber-50 px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                🔊 朗读
                                            </button>
                                            <p className="leading-relaxed text-[13px]">{currentReading.text}</p>
                                        </div>
                                        
                                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                                            <h4 className="font-bold text-amber-900 text-xs mb-2 flex items-center gap-1.5">
                                                <span>🇨🇳</span> 中文翻译
                                            </h4>
                                            <div className="text-amber-800/80 text-[11px]">
                                                {renderFormattedText(currentReading.translation)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                                <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-1.5">
                                                    <span>💡</span> 重点语法
                                                </h4>
                                                <div className="text-blue-800/90 text-[11px]">
                                                    {renderFormattedText(currentReading.grammar)}
                                                </div>
                                            </div>
                                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                                                <h4 className="font-bold text-emerald-900 text-xs mb-2 flex items-center gap-1.5">
                                                    <span>📓</span> 重点词汇
                                                </h4>
                                                <div className="text-emerald-800/90 text-[11px]">
                                                    {renderFormattedText(currentReading.vocab)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">⭐ 我的生词错题本</h3>
                                <p className="text-xs text-gray-500">
                                    你收藏的单词、听力难句和语法错题都会永久保存在这里。
                                </p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center w-full md:w-auto">
                                <span className="text-xl font-black text-amber-600 block">{(favorites.vocab?.length || 0) + (favorites.dictation?.length || 0) + (favorites.grammar?.length || 0)}</span>
                                <span className="text-[10px] text-amber-800 font-medium">总收藏数</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Saved Vocab */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                                    <span>📓 收藏词汇</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{favorites.vocab?.length || 0}</span>
                                </h4>
                                <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {favorites.vocab?.map((v, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative hover:border-amber-200 transition">
                                            <button onClick={() => toggleFavorite('vocab', v, v.__key)} className="absolute top-2 right-2 text-xs text-slate-400 hover:text-red-500" title="取消收藏">❌</button>
                                            <h5 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                                {v.word}
                                                <button onClick={() => playAudio(v.word, 0.95)} className="text-[12px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🔊</button>
                                            </h5>
                                            <p className="text-xs text-amber-900 font-bold mt-1.5">{v.translation}</p>
                                            <div className="bg-white p-2 rounded mt-1.5 space-y-1">
                                                <p className="text-[11px] text-slate-600 italic leading-relaxed">{v.example}</p>
                                                {v.example_zh && <p className="text-[10px] text-slate-400">中译：{v.example_zh}</p>}
                                                {v.grammar_hint && <p className="text-[9px] text-amber-600 bg-amber-50/50 p-1 rounded inline-block">💡 语法：{v.grammar_hint}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!favorites.vocab || favorites.vocab.length === 0) && <p className="text-xs text-slate-400 text-center mt-10">暂无收藏</p>}
                                </div>
                            </div>

                            {/* Saved Dictations */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                                    <span>🎧 听写难句</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{favorites.dictation?.length || 0}</span>
                                </h4>
                                <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {favorites.dictation?.map((d, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative hover:border-amber-200 transition">
                                            <button onClick={() => toggleFavorite('dictation', d, d.__key)} className="absolute top-2 right-2 text-xs text-slate-400 hover:text-red-500" title="取消收藏">❌</button>
                                            <p className="font-bold text-sm text-slate-800 pr-4 leading-relaxed">{d.text}</p>
                                            <button onClick={() => playAudio(d.text, 0.8)} className="mt-2 text-[11px] font-bold bg-amber-500 text-white px-2 py-1 rounded">🔊 慢速朗读</button>
                                            <p className="text-xs text-amber-900 font-semibold mt-2 pt-2 border-t border-slate-200">{d.translation}</p>
                                        </div>
                                    ))}
                                    {(!favorites.dictation || favorites.dictation.length === 0) && <p className="text-xs text-slate-400 text-center mt-10">暂无收藏</p>}
                                </div>
                            </div>

                            {/* Saved Grammar */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                                    <span>🧩 语法错题</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{favorites.grammar?.length || 0}</span>
                                </h4>
                                <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {favorites.grammar?.map((g, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative hover:border-amber-200 transition">
                                            <button onClick={() => toggleFavorite('grammar', g, g.__key)} className="absolute top-2 right-2 text-xs text-slate-400 hover:text-red-500" title="取消收藏">❌</button>
                                            <p className="font-bold text-xs text-slate-800 pr-4 leading-relaxed">{g.question}</p>
                                            <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded-lg flex justify-between items-center">
                                                <span className="font-bold text-green-800 text-xs">✓ {g.correct}</span>
                                                <button onClick={() => playAudio(g.question.replace('___', g.correct), 0.9)} className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded">🔊 朗读原句</button>
                                            </div>
                                            <p className="text-[10px] text-blue-800 mt-2 leading-relaxed bg-blue-50 p-2 rounded-lg">{g.explanation}</p>
                                        </div>
                                    ))}
                                    {(!favorites.grammar || favorites.grammar.length === 0) && <p className="text-xs text-slate-400 text-center mt-10">暂无收藏</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">📈 我的高强度 30 天备战分析</h3>
                            <p className="text-xs text-gray-500">
                                基于本地的学习进度跟踪，为你规划德语 B1 模块攻占画像。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Overall Completion Progress card */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-amber-900 text-base">🏅 整体通关达成率</h4>
                                    <p className="text-xs text-amber-700 leading-relaxed mt-2">
                                        只有将当天内容完全弄懂、写下无错听力、做对选择题后，才建议标记为通关状态。
                                    </p>
                                </div>
                                <div className="mt-6">
                                    <div className="flex justify-between text-xs text-amber-800 font-bold mb-1">
                                        <span>30天完结度</span>
                                        <span>{completionPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-amber-200 rounded-full h-3">
                                        <div className="bg-amber-600 h-3 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Stages Details and stats */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                                <h4 className="font-bold text-slate-800 text-sm mb-4">🔬 四大周期分段完成情况</h4>
                                <div className="space-y-4 text-xs">
                                    {/* Period 1 */}
                                    <div>
                                        <div className="flex justify-between mb-1 text-slate-600 font-semibold">
                                            <span>第一周期 (A2-B1 架桥期 / Day 1-7)</span>
                                            <span>
                                                {completedDays.filter(d => d >= 1 && d <= 7).length} / 7 天
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(completedDays.filter(d => d >= 1 && d <= 7).length / 7) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Period 2 */}
                                    <div>
                                        <div className="flex justify-between mb-1 text-slate-600 font-semibold">
                                            <span>第二周期 (B1 五大从句核心突破 / Day 8-15)</span>
                                            <span>
                                                {completedDays.filter(d => d >= 8 && d <= 15).length} / 8 天
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(completedDays.filter(d => d >= 8 && d <= 15).length / 8) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Period 3 */}
                                    <div>
                                        <div className="flex justify-between mb-1 text-slate-600 font-semibold">
                                            <span>第三周期 (B1 高阶语法进阶 / Day 16-22)</span>
                                            <span>
                                                {completedDays.filter(d => d >= 16 && d <= 22).length} / 7 天
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(completedDays.filter(d => d >= 16 && d <= 22).length / 7) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Period 4 */}
                                    <div>
                                        <div className="flex justify-between mb-1 text-slate-600 font-semibold">
                                            <span>第四周期 (B1 实战突击与模版 / Day 23-30)</span>
                                            <span>
                                                {completedDays.filter(d => d >= 23 && d <= 30).length} / 8 天
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${(completedDays.filter(d => d >= 23 && d <= 30).length / 8) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-6 mt-12 border-t border-slate-800 text-center text-xs">
                <div className="max-w-7xl mx-auto px-4">
                    <p>© 2026 Deutsch B1 30-Day Boot Camp. 开启高强度德语自我蜕变之战！</p>
                    <p className="mt-2 text-[10px] text-slate-500">
                        建议将每天的学习成果在真实的真题模拟（如 Goethe 官网模拟卷）中进行实战反馈，祝你备战胜利！
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;