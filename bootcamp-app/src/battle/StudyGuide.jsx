export default function StudyGuide({ stageId }) {
    return <details className="palace-study-guide">
        <summary>开战前看一眼 · 核心招式表</summary>
        {stageId === 'prepositions' ? <>
            <p>先看介词要求的格，再看名词的性和数。</p>
            <table><thead><tr><th>名词</th><th>第一格</th><th>第四格</th><th>第三格</th></tr></thead><tbody>
                <tr><th>阳性</th><td>der</td><td>den</td><td>dem</td></tr>
                <tr><th>阴性</th><td>die</td><td>die</td><td>der</td></tr>
                <tr><th>中性</th><td>das</td><td>das</td><td>dem</td></tr>
                <tr><th>复数</th><td>die</td><td>die</td><td>den + 名词常加 -n</td></tr>
            </tbody></table>
            <p><b>第三格：</b>mit、bei、nach、aus、von、zu。<br /><b>第四格：</b>für、ohne、durch、gegen、um。</p>
            <p>双向介词 in、auf、an 等描述“在哪里”用第三格，描述“到哪里”用第四格。在一个地方走动，也仍可能用第三格。</p>
        </> : stageId === 'adjectives' ? <>
            <p>按“冠词 → 性和数 → 格”的顺序判断词尾。</p>
            <table><thead><tr><th>场景</th><th>定冠词</th><th>不定冠词</th><th>无冠词</th></tr></thead><tbody>
                <tr><th>阳性主格</th><td>der gute Tee</td><td>ein guter Tee</td><td>guter Tee</td></tr>
                <tr><th>阴性宾格</th><td>die gute Suppe</td><td>eine gute Suppe</td><td>gute Suppe</td></tr>
                <tr><th>中性与格</th><td>dem guten Brot</td><td>einem guten Brot</td><td>gutem Brot</td></tr>
                <tr><th>复数主格</th><td>die guten Bücher</td><td>keine guten Bücher</td><td>gute Bücher</td></tr>
            </tbody></table>
            <p>定冠词后，主格单数和阴／中性宾格常用 -e，其余用 -en。不定冠词没显示出的性和格，需要形容词补足。</p>
        </> : <>
            <p>名词连冠词一起记：<span lang="de">die Prüfung</span>（考试）。动词连搭配一起记：<span lang="de">sich vorbereiten auf + Akk.</span>（为……准备）。</p>
            <p>中→德练回忆，德→中练识别。先自己想，再看选项；答完跟着短句读一遍。错词会重新出现，连续答对两次记为“已熟练”。</p>
        </>}
    </details>;
}
