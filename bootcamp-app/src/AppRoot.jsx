import { Suspense, lazy, useEffect, useState } from 'react';
import BattleApp from './battle/BattleApp.jsx';

const Course = lazy(() => import('./App.jsx'));

export default function AppRoot() {
    const [mode, setMode] = useState(() => window.location.hash === '#course' ? 'course' : 'battle');
    useEffect(() => {
        const syncRoute = () => setMode(window.location.hash === '#course' ? 'course' : 'battle');
        window.addEventListener('hashchange', syncRoute);
        return () => window.removeEventListener('hashchange', syncRoute);
    }, []);

    const navigate = next => {
        window.location.hash = next;
        setMode(next);
    };

    return mode === 'battle'
        ? <BattleApp onExit={() => navigate('course')} />
        : <>
            <Suspense fallback={<p style={{ padding: 30 }}>正在准备原课程…</p>}><Course /></Suspense>
            <button onClick={() => navigate('battle')} className="palace-return-button">⚔ 回到宫廷对决</button>
        </>;
}
